const fs = require('fs');
const vm = require('vm');
const path = require('path');

// CLI flag: run only the simulated all-403 failure scenario (QA fail evidence).
const onlyFailScenario = process.argv.includes('--fail-scenario');

console.log("=== Running Image Search Unit Tests: query derivation + fetch client ===");

// 1. Setup Mock Environment
// Part 1 (query derivation) is pure. Part 2 (fetch client) needs localStorage,
// fetch, Date and AbortSignal in the sandbox. Date is mocked with a fixed,
// advanceable epoch (no wall-clock dependence); AbortSignal.timeout is stubbed
// with a sentinel object so tests can assert the timeout wiring without
// creating real timers; the mock fetch ignores the signal option.
const BASE_NOW = 1700000000000;
let mockNow = BASE_NOW;

let fetchLog = [];
let fetchPlan = [];

const sandbox = {
    console: {
        log: (...args) => console.log(...args),
        warn: (...args) => console.warn(...args),
        error: (...args) => console.error(...args)
    },
    localStorage: {
        _data: {},
        getItem: function (key) { return this._data[key] || null; },
        setItem: function (key, val) { this._data[key] = String(val); },
        clear: function () { this._data = {}; }
    },
    // Avoid mutating the global Date object (same pattern as tests/test_actions.js)
    Date: class extends Date {
        constructor(...args) {
            if (args.length === 0) return new Date(mockNow);
            return new Date(...args);
        }
        static now() {
            return mockNow;
        }
    },
    AbortSignal: { timeout: (ms) => ({ timeoutMs: ms }) },
    fetch: function (url, opts) {
        const step = fetchPlan[fetchLog.length];
        fetchLog.push({ url, opts });
        if (!step) {
            return Promise.reject(new Error('unexpected fetch call #' + fetchLog.length + ': ' + url));
        }
        if (step.reject) {
            return Promise.reject(new Error(step.reject));
        }
        return Promise.resolve({
            ok: step.ok !== false,
            status: step.status || 200,
            text: function () { return Promise.resolve(step.text || ''); },
            json: function () { return Promise.resolve(step.json); }
        });
    }
};

function planFetch(steps) {
    fetchLog = [];
    fetchPlan = steps;
}

function resetSandboxState() {
    sandbox.localStorage.clear();
    mockNow = BASE_NOW;
}

// 2. Load Source Code
// constants.js is loaded into the same sandbox so LS and the DISH_IMAGE_*
// constants carry their real values. const/let at the top level are promoted
// to var so they leak onto the sandbox object (same trick as tests/_langLoader.js).
function cleanSource(sourceCode) {
    return sourceCode
        .replace(/^import\s+[\s\S]*?from\s+['"].*?['"];?/gm, '')
        .replace(/\bexport\s+/g, '')
        .replace(/^(const|let) /gm, 'var ');
}

vm.createContext(sandbox);
try {
    for (const file of ['constants.js', 'image_search.js']) {
        const raw = fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8');
        vm.runInContext(cleanSource(raw), sandbox, { filename: file });
    }
} catch (e) {
    console.error("Error loading source in sandbox:", e);
    process.exit(1);
}

const { getMainCourseLine, sanitizeDishQuery, buildGoogleImageUrl, extractImageThumbs, fetchDishImages } = sandbox;

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        console.error(`❌ Assertion Failed: ${message}`);
        console.error(`   Expected: ${JSON.stringify(expected)}`);
        console.error(`   Actual:   ${JSON.stringify(actual)}`);
        process.exit(1);
    }
}

function assertDeepEqual(actual, expected, message) {
    const actualJson = JSON.stringify(actual);
    const expectedJson = JSON.stringify(expected);
    if (actualJson !== expectedJson) {
        console.error(`❌ Assertion Failed: ${message}`);
        console.error(`   Expected: ${expectedJson}`);
        console.error(`   Actual:   ${actualJson}`);
        process.exit(1);
    }
}

function ok(message) {
    console.log(`OK: ${message}`);
}

// === Part 1: getMainCourseLine ===

// Case 1: high + de with 2 lines -> returns line 2 (index 1)
const twoLineSplit = {
    label: 'high',
    de: 'Tagessuppe\nSchweinsbraten mit Knödel',
    en: 'soup of the day\nroast pork with dumplings'
};
let main = getMainCourseLine(twoLineSplit, 'de');
assertEquals(main && main.text, 'Schweinsbraten mit Knödel', "high + de with 2 lines should return the 2nd line");
assertEquals(main && main.lang, 'de', "lang should mirror the langMode that produced the text");
ok("getMainCourseLine: high + de with 2 lines returns line 2 (index 1)");

// Case 2: high + de with 1 line -> returns that line (single-course default)
const oneLineSplit = { label: 'high', de: 'Gulasch mit Knödel', en: 'goulash with dumplings' };
main = getMainCourseLine(oneLineSplit, 'de');
assertEquals(main && main.text, 'Gulasch mit Knödel', "high + de with 1 line should return that line");
assertEquals(main && main.lang, 'de', "lang should mirror the langMode that produced the text");
ok("getMainCourseLine: high + de with 1 line returns that line");

// Case 3: high + en -> returns split.en line 2
main = getMainCourseLine(twoLineSplit, 'en');
assertEquals(main && main.text, 'roast pork with dumplings', "high + en should return the 2nd line of split.en");
assertEquals(main && main.lang, 'en', "lang should mirror the langMode that produced the text");
ok("getMainCourseLine: high + en returns split.en line 2");

// Case 4: confidence gate - labels below 'high' must all return null
main = getMainCourseLine({ label: 'template', de: 'Menü 1\nMenü 2', en: 'menu 1\nmenu 2' }, 'de');
assertEquals(main, null, "label 'template' must not produce a link target");
ok("getMainCourseLine: label 'template' returns null");

main = getMainCourseLine({ label: 'medium', de: 'Menü 1\nMenü 2', en: 'menu 1\nmenu 2' }, 'de');
assertEquals(main, null, "label 'medium' must not produce a link target");
ok("getMainCourseLine: label 'medium' returns null");

main = getMainCourseLine({ label: 'low', de: 'Menü 1\nMenü 2', en: 'menu 1\nmenu 2' }, 'de');
assertEquals(main, null, "label 'low' must not produce a link target");
ok("getMainCourseLine: label 'low' returns null");

main = getMainCourseLine({ label: 'fallback', de: 'Menü 1\nMenü 2', en: 'menu 1\nmenu 2' }, 'de');
assertEquals(main, null, "label 'fallback' must not produce a link target");
ok("getMainCourseLine: label 'fallback' returns null");

// Case 5: langMode 'all' -> null (two-language mode never links)
assertEquals(getMainCourseLine(twoLineSplit, 'all'), null, "langMode 'all' must not produce a link target");
ok("getMainCourseLine: langMode 'all' returns null");

// Case 6: missing/empty split text -> null
assertEquals(getMainCourseLine(null, 'de'), null, "missing split must return null");
assertEquals(getMainCourseLine({ label: 'high', de: '', en: '' }, 'de'), null, "empty split text must return null");
assertEquals(getMainCourseLine({ label: 'high' }, 'de'), null, "missing de property must return null");
assertEquals(getMainCourseLine({ label: 'high', de: '  \n  ', en: '  \n  ' }, 'de'), null, "whitespace-only split text must return null");
ok("getMainCourseLine: missing/empty split text returns null");

// === Part 1: sanitizeDishQuery ===

// Case 7: allergen brackets removed
assertEquals(sanitizeDishQuery('Schweinsbraten mit Knödel (A, C)'), 'Schweinsbraten mit Knödel', "allergen brackets '(A, C)' should be removed");
ok("sanitizeDishQuery: 'Schweinsbraten mit Knödel (A, C)' -> 'Schweinsbraten mit Knödel'");

// Case 8: prices removed
assertEquals(sanitizeDishQuery('Tagessuppe 4,50 €'), 'Tagessuppe', "price '4,50 €' should be removed");
ok("sanitizeDishQuery: 'Tagessuppe 4,50 €' -> 'Tagessuppe'");

// Case 9: result shorter than 3 chars -> null
assertEquals(sanitizeDishQuery('ab'), null, "query shorter than 3 chars must return null");
ok("sanitizeDishQuery: 'ab' -> null");

// === Part 1: buildGoogleImageUrl ===

// Case 10: encodeURIComponent + udm=2, no other parameters
const url = buildGoogleImageUrl('Wiener Schnitzel');
assertEquals(url.startsWith('https://www.google.com/search?q='), true, "URL should start with the Google search prefix");
assertEquals(url.includes('Wiener%20Schnitzel'), true, "query should be encodeURIComponent-ed (space -> %20)");
assertEquals(url.endsWith('&udm=2'), true, "URL should end with &udm=2");
assertEquals(url, 'https://www.google.com/search?q=Wiener%20Schnitzel&udm=2', "URL should contain no parameters besides q and udm=2");
ok("buildGoogleImageUrl: 'Wiener Schnitzel' -> encoded URL ending in &udm=2");

// === Part 2: extractImageThumbs + fetchDishImages (async fetch client) ===

const THUMB_A_ENCODED = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQabc_123-X&amp;w=200&amp;h=150';
const THUMB_A_DECODED = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQabc_123-X&w=200&h=150';
const THUMB_B = 'https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcRdef456_Y';
const THUMB_C = 'https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcZzz999_B';
// THUMB_A appears twice (duplicate) and carries &amp; entities, THUMB_B once.
const googleFixtureHtml = `<div>${THUMB_A_ENCODED}</div><div>${THUMB_B}</div><div>${THUMB_A_ENCODED}</div>`;
const antiBotHtml = '<html><body>unusual traffic from your network</body></html>';

async function runClientTests() {
    if (onlyFailScenario) {
        await simulateAllProxies403();
        return;
    }

    // Case 11 (a0): extractImageThumbs caps at DISH_IMAGE_MAX_RESULTS
    const sevenThumbs = [];
    for (let i = 0; i < 7; i++) {
        sevenThumbs.push(`<img src="https://encrypted-tbn${i}.gstatic.com/images?q=tbn:ANd9GcCap${i}X">`);
    }
    const capped = extractImageThumbs(sevenThumbs.join(' '));
    assertEquals(capped.length, sandbox.DISH_IMAGE_MAX_RESULTS, "extractImageThumbs should cap at DISH_IMAGE_MAX_RESULTS");
    assertEquals(capped[4].url, 'https://encrypted-tbn4.gstatic.com/images?q=tbn:ANd9GcCap4X', "the first five matches should be kept in order");
    ok("extractImageThumbs: caps results at DISH_IMAGE_MAX_RESULTS (5 of 7 distinct URLs)");

    // Case 12 (a): proxy 1 throws -> proxy 2 returns HTML with &amp; entities + 1 duplicate
    resetSandboxState();
    planFetch([
        { reject: 'allorigins-raw network error' },
        { ok: true, text: googleFixtureHtml }
    ]);
    const resultA = await fetchDishImages('Wiener Schnitzel');
    assertEquals(resultA.source, 'google', "proxy 2 success should report source 'google'");
    assertEquals(resultA.cached, undefined, "a fresh fetch must not carry the cached flag");
    assertDeepEqual(resultA.images, [
        { url: THUMB_A_DECODED, license: '', creator: '' },
        { url: THUMB_B, license: '', creator: '' }
    ], "deduped, entity-decoded gstatic URLs in HTML order");
    assertEquals(fetchLog.length, 2, "failed proxy 1 + successful proxy 2 = exactly 2 fetch calls");
    assertEquals(fetchLog[0].url.startsWith('https://api.allorigins.win/raw?url='), true, "proxy chain must start with allorigins-raw");
    assertEquals(fetchLog[1].url, 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent('https://www.google.com/search?q=Wiener%20Schnitzel&tbm=isch&hl=de&gl=at&ijn=0'), "proxy 2 URL wraps the encoded Google scrape URL (hl=de default)");
    assertEquals(fetchLog[1].opts && fetchLog[1].opts.signal && fetchLog[1].opts.signal.timeoutMs, sandbox.DISH_IMAGE_FETCH_TIMEOUT_MS, "each proxy fetch carries AbortSignal.timeout(DISH_IMAGE_FETCH_TIMEOUT_MS)");
    ok("fetchDishImages: proxy 1 throws -> proxy 2 HTML -> google source with deduped, &amp;-decoded URLs in order");

    // Case 13 (a2): allorigins-get JSON body is unwrapped via .contents before extraction
    resetSandboxState();
    planFetch([
        { ok: true, text: antiBotHtml },
        { reject: 'codetabs down' },
        { ok: true, text: JSON.stringify({ contents: `<div>${THUMB_C}</div>` }) }
    ]);
    const resultA2 = await fetchDishImages('Kaiserschmarrn');
    assertEquals(resultA2.source, 'google', "allorigins-get JSON contents should be extracted as google source");
    assertDeepEqual(resultA2.images, [{ url: THUMB_C, license: '', creator: '' }], "images should come from the JSON .contents payload");
    assertEquals(fetchLog.length, 3, "empty proxy 1, failed proxy 2, JSON proxy 3 = 3 fetch calls");
    assertEquals(fetchLog[2].url.startsWith('https://api.allorigins.win/get?url='), true, "third chain entry must be the allorigins-get JSON proxy");
    ok("fetchDishImages: allorigins-get JSON body unwrapped via .contents; 200-but-empty proxy advances the chain");

    // Case 14 (a3): lang 'en' propagates to the Google hl parameter
    resetSandboxState();
    planFetch([{ ok: true, text: `<div>${THUMB_C}</div>` }]);
    await fetchDishImages('roast pork with dumplings', 'en');
    assertEquals(decodeURIComponent(fetchLog[0].url).includes('hl=en'), true, "lang='en' should set hl=en in the scrape URL");
    ok("fetchDishImages: lang 'en' propagates to the Google hl parameter (default is 'de')");

    // Case 15 (b): all 3 proxies return 200 anti-bot HTML -> Openverse fallback with 5 thumbnails
    resetSandboxState();
    planFetch([
        { ok: true, text: antiBotHtml },
        { ok: true, text: antiBotHtml },
        { ok: true, text: antiBotHtml },
        { ok: true, json: { results: [
            { thumbnail: 'https://api.openverse.org/v1/thumbs/a1', license: 'CC BY 4.0', creator: 'Jane Doe' },
            { thumbnail: 'https://api.openverse.org/v1/thumbs/a2', license: 'CC0', creator: 'Max Muster' },
            { thumbnail: 'https://api.openverse.org/v1/thumbs/a3' },
            { thumbnail: 'https://api.openverse.org/v1/thumbs/a4', license: 'PDM', creator: 'Ana' },
            { thumbnail: 'https://api.openverse.org/v1/thumbs/a5', license: '', creator: '' }
        ] } }
    ]);
    const resultB = await fetchDishImages('Gulasch mit Knödel');
    assertEquals(resultB.source, 'openverse', "all proxies empty should fall back to Openverse");
    assertEquals(resultB.images.length, 5, "5 Openverse results should yield 5 images");
    assertDeepEqual(resultB.images, [
        { url: 'https://api.openverse.org/v1/thumbs/a1', license: 'CC BY 4.0', creator: 'Jane Doe' },
        { url: 'https://api.openverse.org/v1/thumbs/a2', license: 'CC0', creator: 'Max Muster' },
        { url: 'https://api.openverse.org/v1/thumbs/a3', license: '', creator: '' },
        { url: 'https://api.openverse.org/v1/thumbs/a4', license: 'PDM', creator: 'Ana' },
        { url: 'https://api.openverse.org/v1/thumbs/a5', license: '', creator: '' }
    ], "license/creator pass through unchanged, missing fields default to ''");
    assertEquals(fetchLog.length, 4, "3 proxies + 1 Openverse = 4 fetch calls");
    assertEquals(fetchLog[3].url, 'https://api.openverse.org/v1/images/?q=Gulasch%20mit%20Kn%C3%B6del&page_size=5', "Openverse URL should carry the encoded query");
    ok("fetchDishImages: 3 anti-bot proxies -> Openverse fallback with 5 thumbnail results, license/creator passthrough");

    // Case 16 (b2): Openverse mapping uses thumbnail||url and filters to https strings
    resetSandboxState();
    planFetch([
        { ok: true, text: antiBotHtml },
        { ok: true, text: antiBotHtml },
        { ok: true, text: antiBotHtml },
        { ok: true, json: { results: [
            { url: 'https://api.openverse.org/v1/images/direct1', license: 'CC BY', creator: 'Only Url' },
            { thumbnail: 'http://insecure.example/thumb', license: '', creator: '' },
            { thumbnail: null, url: 'https://api.openverse.org/v1/images/direct2' },
            { thumbnail: 42, license: '', creator: '' }
        ] } }
    ]);
    const resultB2 = await fetchDishImages('Gemüsecurry mit Reis');
    assertEquals(resultB2.source, 'openverse', "mixed Openverse results should still report openverse source");
    assertDeepEqual(resultB2.images, [
        { url: 'https://api.openverse.org/v1/images/direct1', license: 'CC BY', creator: 'Only Url' },
        { url: 'https://api.openverse.org/v1/images/direct2', license: '', creator: '' }
    ], "thumbnail||url fallback applies; non-https and non-string urls are filtered");
    ok("fetchDishImages: Openverse mapping uses thumbnail||url and filters to https strings");

    // Case 17 (c): everything fails (proxies throw/!ok, Openverse throws) -> graceful empty result
    resetSandboxState();
    planFetch([
        { reject: 'allorigins-raw down' },
        { ok: false, status: 500 },
        { reject: 'allorigins-get down' },
        { reject: 'openverse down' }
    ]);
    const resultC = await fetchDishImages('Total Failure Dish');
    assertDeepEqual(resultC, { images: [], source: null }, "total failure should resolve to { images: [], source: null }");
    assertEquals(fetchLog.length, 4, "3 proxies + Openverse should all be attempted");
    assertEquals(sandbox.localStorage.getItem(sandbox.LS.DISH_IMAGE_CACHE), null, "no cache write on total failure");
    ok("fetchDishImages: everything fails -> { images: [], source: null }, 4 calls, no throw, no cache write");

    // Case 18 (c2): all proxies answer 403 -> 4 calls, empty result (anti-bot scenario)
    resetSandboxState();
    planFetch([
        { ok: false, status: 403 },
        { ok: false, status: 403 },
        { ok: false, status: 403 },
        { ok: false, status: 403 }
    ]);
    const resultC2 = await fetchDishImages('Käsespätzle');
    assertDeepEqual(resultC2, { images: [], source: null }, "403 everywhere should degrade to the empty result");
    assertEquals(fetchLog.length, 4, "403 variant: 3 proxies + Openverse = 4 fetch calls");
    assertEquals(sandbox.localStorage.getItem(sandbox.LS.DISH_IMAGE_CACHE), null, "403 variant must not write a cache entry");
    ok("fetchDishImages: all proxies 403 -> 4 fetch calls, empty result, graceful degradation");

    // Case 19 (d): cache hit serves 0 fetches; TTL expiry after 8 days refetches
    resetSandboxState();
    planFetch([
        { ok: true, text: googleFixtureHtml },
        { ok: true, text: `<div>${THUMB_C}</div>` }
    ]);
    const first = await fetchDishImages('Käsespätzle');
    assertEquals(first.source, 'google', "first call should fetch from google");
    assertEquals(first.cached, undefined, "first call must not be marked cached");
    assertEquals(fetchLog.length, 1, "first call should make exactly 1 fetch");
    const second = await fetchDishImages('  KÄSESPÄTZLE  ');
    assertEquals(second.cached, true, "second call (any casing/whitespace) should be served from cache");
    assertEquals(second.source, 'google', "cached source should pass through");
    assertDeepEqual(second.images, first.images, "cached images should be shape-identical to fresh ones");
    assertEquals(fetchLog.length, 1, "cache hit should trigger 0 additional fetch calls");
    mockNow = BASE_NOW + 8 * 24 * 60 * 60 * 1000;
    const third = await fetchDishImages('Käsespätzle');
    assertEquals(third.cached, undefined, "expired entry should refetch instead of serving stale cache");
    assertEquals(third.source, 'google', "refetch should succeed");
    assertEquals(fetchLog.length, 2, "refetch after TTL expiry should make a second fetch call");
    assertDeepEqual(third.images, [{ url: THUMB_C, license: '', creator: '' }], "refetch should return the new fixture images");
    ok("fetchDishImages: cache hit serves 0 fetches; 8 days later the expired entry refetches");

    // Case 20 (e): pruning — 50 seeded entries + 1 new -> stays 50, oldest evicted
    resetSandboxState();
    const seeded = { queries: {} };
    for (let i = 0; i < 50; i++) {
        seeded.queries['seed' + i] = { ts: BASE_NOW - (50 - i) * 1000, source: 'google', images: [{ url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:seed' + i, license: '', creator: '' }] };
    }
    sandbox.localStorage.setItem(sandbox.LS.DISH_IMAGE_CACHE, JSON.stringify(seeded));
    planFetch([{ ok: true, text: `<div>${THUMB_C}</div>` }]);
    await fetchDishImages('Brandnew Dish');
    const pruned = JSON.parse(sandbox.localStorage.getItem(sandbox.LS.DISH_IMAGE_CACHE));
    assertEquals(Object.keys(pruned.queries).length, 50, "cache should stay at exactly 50 entries after the write");
    assertEquals(pruned.queries['seed0'], undefined, "the oldest seeded entry should be evicted");
    assertEquals(pruned.queries['seed49'] !== undefined, true, "the newest seeded entry should be kept");
    assertEquals(pruned.queries['brandnew dish'] !== undefined, true, "the new query should be written to the cache");
    ok("writeDishImageCache: 50 seeded + 1 new entry -> stays 50, oldest evicted");

    // Case 21 (f): expired entries are removed on write; fresh + new remain
    resetSandboxState();
    const TTL = sandbox.DISH_IMAGE_CACHE_TTL_MS;
    sandbox.localStorage.setItem(sandbox.LS.DISH_IMAGE_CACHE, JSON.stringify({ queries: {
        freshEntry: { ts: BASE_NOW - 1000, source: 'google', images: [] },
        staleEntry: { ts: BASE_NOW - TTL - 1000, source: 'google', images: [] }
    } }));
    planFetch([{ ok: true, text: `<div>${THUMB_C}</div>` }]);
    await fetchDishImages('Fresh Query');
    const afterF = JSON.parse(sandbox.localStorage.getItem(sandbox.LS.DISH_IMAGE_CACHE));
    assertEquals(afterF.queries['staleEntry'], undefined, "the expired entry should be removed on write");
    assertEquals(afterF.queries['freshEntry'] !== undefined, true, "the fresh entry should be kept");
    assertEquals(afterF.queries['fresh query'] !== undefined, true, "the new entry should be written");
    assertEquals(Object.keys(afterF.queries).length, 2, "fresh + new should remain (expired gone)");
    ok("writeDishImageCache: expired entries pruned on write, fresh + new remain");

    // Case 22 (g): corrupt cache JSON is treated as empty and replaced on write
    resetSandboxState();
    sandbox.localStorage.setItem(sandbox.LS.DISH_IMAGE_CACHE, '{corrupt json');
    planFetch([{ ok: true, text: `<div>${THUMB_C}</div>` }]);
    const resultG = await fetchDishImages('Corrupt Cache Dish');
    assertEquals(resultG.source, 'google', "corrupt cache JSON should be treated as empty — fetch proceeds");
    assertEquals(fetchLog.length, 1, "corrupt cache must not block the fetch");
    const afterG = JSON.parse(sandbox.localStorage.getItem(sandbox.LS.DISH_IMAGE_CACHE));
    assertEquals(afterG.queries['corrupt cache dish'] !== undefined, true, "the corrupt payload should be replaced by a valid cache");
    ok("fetchDishImages: corrupt cache JSON treated as empty and replaced by a valid cache on write");
}

// Plan QA failure scenario: every Google proxy answers HTTP 403 (anti-bot).
// Expected graceful behavior: 4 fetch calls (3 proxies + Openverse), empty
// result, no outward throw, no cache write.
async function simulateAllProxies403() {
    console.log("--- FAIL SCENARIO SIMULATION: all Google proxies answer HTTP 403 (anti-bot) ---");
    resetSandboxState();
    planFetch([
        { ok: false, status: 403 },
        { ok: false, status: 403 },
        { ok: false, status: 403 },
        { ok: false, status: 403 }
    ]);
    const result = await fetchDishImages('Käsespätzle');
    for (let i = 0; i < fetchLog.length; i++) {
        console.log(`  call ${i + 1}: ${fetchLog[i].url.slice(0, 76)}...`);
        console.log('         -> HTTP 403, response.ok=false -> no extraction, next stage');
    }
    console.log(`  result: ${JSON.stringify(result)}`);
    assertEquals(fetchLog.length, 4, "fail scenario: 3 proxies + Openverse = 4 fetch calls");
    assertDeepEqual(result, { images: [], source: null }, "fail scenario: graceful empty result with source null");
    assertEquals(sandbox.localStorage.getItem(sandbox.LS.DISH_IMAGE_CACHE), null, "fail scenario: no cache write");
    ok("fail scenario (all 403): fetch call count = 4, result empty, no outward throw");
}

runClientTests().then(
    () => {
        if (onlyFailScenario) {
            console.log("✅ Fail scenario simulation passed (403 anti-bot): graceful degradation verified");
        } else {
            console.log("✅ Image Search Unit Tests Passed!");
        }
        process.exit(0);
    },
    (err) => {
        console.error("❌ Image Search Unit Tests Failed:", err && err.stack || err);
        process.exit(1);
    }
);
