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
let fetchRoutes = [];

const WIKI_MATCH = 'de.wikipedia.org';
const COMMONS_MATCH = 'commons.wikimedia.org';
const OPENVERSE_MATCH = 'api.openverse.org';

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
        fetchLog.push({ url, opts });
        const route = fetchRoutes.find(r => url.includes(r.match));
        if (!route || route.steps.length === 0) {
            return Promise.reject(new Error('unexpected fetch call: ' + url.slice(0, 90)));
        }
        const step = route.steps.shift();
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

function planFetch(routes) {
    fetchLog = [];
    // Clone steps (shift() would otherwise mutate the shared helper objects
    // across cases) and merge duplicate matches into one route (a second
    // route with the same match would be unreachable — find() takes the first).
    fetchRoutes = routes.reduce((acc, route) => {
        const steps = route.steps.map(step => ({ ...step }));
        const existing = acc.find(r => r.match === route.match);
        if (existing) existing.steps.push(...steps);
        else acc.push({ match: route.match, steps });
        return acc;
    }, []);
}

const wikiMiss = { match: WIKI_MATCH, steps: [{ ok: false, status: 404 }, { ok: false, status: 404 }, { ok: false, status: 404 }] };
const commonsEmpty = { match: COMMONS_MATCH, steps: [{ ok: true, json: { query: { pages: {} } } }, { ok: true, json: { query: { pages: {} } } }, { ok: true, json: { query: { pages: {} } } }] };
const wikiHit = (title, thumb) => ({ match: WIKI_MATCH, steps: [{ ok: true, json: { title, thumbnail: { source: thumb } } }] });
const fetchCallsFor = (match) => fetchLog.filter(call => call.url.includes(match)).length;

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

const { getMainCourseLine, sanitizeDishQuery, buildGoogleImageUrl, fetchDishImages } = sandbox;

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
assertEquals(main && main.text, 'Menü 2', "label 'medium' qualifies for the link target (second course line)");
assertEquals(main && main.lang, 'de', "medium split should keep the langMode");
ok("getMainCourseLine: label 'medium' qualifies (second course line)");

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

// Case 9b: lowercase allergen codes and leading bullets are stripped (real menu data)
assertEquals(sanitizeDishQuery('• kartoffelgulasch mit braunschweiger (lm)'), 'kartoffelgulasch mit braunschweiger', "leading bullet and lowercase allergen '(lm)' must be removed");
ok("sanitizeDishQuery: '• kartoffelgulasch mit braunschweiger (lm)' -> 'kartoffelgulasch mit braunschweiger'");

// Case 9c: compact allergen groups without commas are stripped too
assertEquals(sanitizeDishQuery('Schweinsbraten (AFO)'), 'Schweinsbraten', "compact allergen group '(AFO)' must be removed");
ok("sanitizeDishQuery: 'Schweinsbraten (AFO)' -> 'Schweinsbraten'");

// Case 9d: word-like parentheses are preserved (over-stripping guard)
assertEquals(sanitizeDishQuery('Chili sin Carne (vegan)'), 'Chili sin Carne (vegan)', "word-like parentheses must survive the sanitizer");
ok("sanitizeDishQuery: 'Chili sin Carne (vegan)' survives");

// === Part 1: buildGoogleImageUrl ===

// Case 10: encodeURIComponent + udm=2, no other parameters
const url = buildGoogleImageUrl('Wiener Schnitzel');
assertEquals(url.startsWith('https://www.google.com/search?q='), true, "URL should start with the Google search prefix");
assertEquals(url.includes('Wiener%20Schnitzel'), true, "query should be encodeURIComponent-ed (space -> %20)");
assertEquals(url.endsWith('&udm=2'), true, "URL should end with &udm=2");
assertEquals(url, 'https://www.google.com/search?q=Wiener%20Schnitzel&udm=2', "URL should contain no parameters besides q and udm=2");
ok("buildGoogleImageUrl: 'Wiener Schnitzel' -> encoded URL ending in &udm=2");

// === Part 2: fetchDishImages (async fetch client, source chain) ===

const THUMB_B = 'https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcRdef456_Y';
const THUMB_C = 'https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcZzz999_B';

async function runClientTests() {
    if (onlyFailScenario) {
        await simulateAllProxies403();
        return;
    }

    // Case 13c: Wikipedia lead image wins before the rest of the chain even starts
    resetSandboxState();
    planFetch([
        wikiHit('Käsespätzle', THUMB_C),
        commonsEmpty,
        { match: OPENVERSE_MATCH, steps: [{ reject: 'openverse must not be reached' }] }
    ]);
    const resultWiki = await fetchDishImages('Käsespätzle');
    assertEquals(resultWiki.source, 'wikipedia', "Wikipedia hit should short-circuit the chain");
    assertDeepEqual(resultWiki.images, [{ url: THUMB_C, license: '', creator: 'Käsespätzle' }], "Wikipedia thumbnail with article title as creator");
    assertEquals(fetchLog.length, 1, "Wikipedia hit must skip commons and openverse");
    ok("fetchDishImages: Wikipedia article image short-circuits the chain (1 fetch, no further source traffic)");

    // Case 13d: progressive query shortening — full dish name 404s, the
    // leading dish word hits the Wikipedia article
    resetSandboxState();
    planFetch([
        { match: WIKI_MATCH, steps: [
            { ok: false, status: 404 },
            { ok: false, status: 404 },
            { ok: true, json: { title: 'Kartoffelgulasch', thumbnail: { source: THUMB_C } } }
        ] },
        commonsEmpty,
        { match: OPENVERSE_MATCH, steps: [{ reject: 'openverse must not be reached' }] }
    ]);
    const resultProgressive = await fetchDishImages('Kartoffelgulasch mit Braunschweiger');
    assertEquals(resultProgressive.source, 'wikipedia', "the shortened query should hit the Wikipedia article");
    assertDeepEqual(resultProgressive.images, [{ url: THUMB_C, license: '', creator: 'Kartoffelgulasch' }], "Wikipedia thumbnail with the shortened article title as creator");
    assertEquals(fetchCallsFor(WIKI_MATCH), 3, "three candidates tried (full name 404, two words 404, first word hit)");
    assertEquals(fetchLog.length, 3, "wikipedia hit must short-circuit before commons and proxies (3 progressive candidates)");
    ok("fetchDishImages: progressive shortening — 'Kartoffelgulasch mit Braunschweiger' 404s, 'Kartoffelgulasch' hits");

    // Case 13e: configured worker (chefkoch scrape server-side) delivers as stage 0
    resetSandboxState();
    sandbox.DISH_IMAGE_WORKER_URL = 'https://kantine-dish-images.test.workers.dev';
    planFetch([
        { match: 'workers.dev', steps: [{ ok: true, json: { query: 'Wiener Schnitzel', engine: 'chefkoch', count: 1, images: [{ url: THUMB_C, license: 'Chefkoch', creator: 'chefkoch.de', title: 'Wiener Schnitzel Original', score: 3 }] } }] },
        { match: WIKI_MATCH, steps: [{ reject: 'wikipedia must not be reached' }] }
    ]);
    const resultWorker = await fetchDishImages('Wiener Schnitzel');
    assertEquals(resultWorker.source, 'chefkoch', "worker images should report chefkoch source");
    assertDeepEqual(resultWorker.images, [{ url: THUMB_C, license: 'Chefkoch', creator: 'chefkoch.de', title: 'Wiener Schnitzel Original', score: 3 }], "worker images pass through with title and relevance score");
    assertEquals(fetchCallsFor('workers.dev'), 1, "worker stage fires first");
    assertEquals(fetchCallsFor(WIKI_MATCH), 0, "worker hit must short-circuit wikipedia and everything after");
    sandbox.DISH_IMAGE_WORKER_URL = '{{DISH_IMAGE_WORKER_URL}}';
    ok("fetchDishImages: configured worker delivers chefkoch recipe photos as stage 0 (chain short-circuits)");

    // Case 13e2: German dish name propagates as qde (german recipe sites search german)
    resetSandboxState();
    sandbox.DISH_IMAGE_WORKER_URL = 'https://kantine-dish-images.test.workers.dev';
    planFetch([
        { match: 'workers.dev', steps: [{ ok: true, json: { query: 'roast pork', searchQuery: 'Schweinebraten', engine: 'chefkoch', count: 0, images: [] } }] },
        { match: WIKI_MATCH, steps: [{ ok: true, json: { title: 'Roast pork', thumbnail: { source: THUMB_C } } }] }
    ]);
    await fetchDishImages('roast pork with dumplings', 'en', null, 'Schweinebraten');
    const workerCall = fetchLog.find(call => call.url.includes('workers.dev'));
    assertEquals(decodeURIComponent(workerCall.url).includes('qde=Schweinebraten'), true, "the german dish name must be passed as qde parameter");
    assertEquals(decodeURIComponent(workerCall.url).includes('q=roast pork with dumplings'), true, "the display query stays in q");
    sandbox.DISH_IMAGE_WORKER_URL = '{{DISH_IMAGE_WORKER_URL}}';
    ok("fetchDishImages: german dish name propagates to the worker via qde (display query stays in q)");

    // Case 13f: worker failure falls through to wikipedia
    resetSandboxState();
    sandbox.DISH_IMAGE_WORKER_URL = 'https://kantine-dish-images.test.workers.dev';
    planFetch([
        { match: 'workers.dev', steps: [{ reject: 'worker down' }] },
        wikiHit('Käsespätzle', THUMB_C)
    ]);
    const resultWorkerFail = await fetchDishImages('Käsespätzle');
    assertEquals(resultWorkerFail.source, 'wikipedia', "worker failure should fall through to wikipedia");
    assertEquals(fetchCallsFor('workers.dev'), 1, "worker attempted exactly once");
    sandbox.DISH_IMAGE_WORKER_URL = '{{DISH_IMAGE_WORKER_URL}}';
    ok("fetchDishImages: worker failure falls through to wikipedia");

    // Case 13g: unreplaced worker placeholder (local builds) -> stage disabled,
    // chain proceeds wikipedia -> commons -> openverse
    resetSandboxState();
    sandbox.DISH_IMAGE_WORKER_URL = '{{DISH_IMAGE_WORKER_URL}}';
    planFetch([
        wikiMiss,
        commonsEmpty,
        { match: OPENVERSE_MATCH, steps: [{ ok: true, json: { results: [{ thumbnail: THUMB_C, license: '', creator: '' }] } }] }
    ]);
    const resultNoWorker = await fetchDishImages('Topfenknödel');
    assertEquals(resultNoWorker.source, 'openverse', "placeholder worker URL must disable the stage, chain proceeds to openverse");
    assertEquals(resultNoWorker.images.length, 1, "openverse fallback should deliver the thumbnail");
    assertEquals(fetchCallsFor('workers.dev'), 0, "placeholder worker URL must trigger zero worker fetches");
    ok("fetchDishImages: unreplaced worker placeholder disables stage 0, openverse serves the fallback image");

    // Case 15 (b): wikipedia/commons without hits for the 3-word query -> Openverse fallback with 5 thumbnails
    resetSandboxState();
    planFetch([
        wikiMiss,
        commonsEmpty,
        { match: OPENVERSE_MATCH, steps: [{ ok: true, json: { results: [
            { thumbnail: 'https://api.openverse.org/v1/thumbs/a1', license: 'CC BY 4.0', creator: 'Jane Doe' },
            { thumbnail: 'https://api.openverse.org/v1/thumbs/a2', license: 'CC0', creator: 'Max Muster' },
            { thumbnail: 'https://api.openverse.org/v1/thumbs/a3' },
            { thumbnail: 'https://api.openverse.org/v1/thumbs/a4', license: 'PDM', creator: 'Ana' },
            { thumbnail: 'https://api.openverse.org/v1/thumbs/a5', license: '', creator: '' }
        ] } }] }
    ]);
    const resultB = await fetchDishImages('Gulasch mit Knödel');
    assertEquals(resultB.source, 'openverse', "all earlier sources empty should fall back to Openverse");
    assertEquals(resultB.images.length, 5, "5 Openverse results should yield 5 images");
    assertDeepEqual(resultB.images, [
        { url: 'https://api.openverse.org/v1/thumbs/a1', license: 'CC BY 4.0', creator: 'Jane Doe' },
        { url: 'https://api.openverse.org/v1/thumbs/a2', license: 'CC0', creator: 'Max Muster' },
        { url: 'https://api.openverse.org/v1/thumbs/a3', license: '', creator: '' },
        { url: 'https://api.openverse.org/v1/thumbs/a4', license: 'PDM', creator: 'Ana' },
        { url: 'https://api.openverse.org/v1/thumbs/a5', license: '', creator: '' }
    ], "license/creator pass through unchanged, missing fields default to ''");
    assertEquals(fetchLog.length, 7, "wikipedia 3x + commons 3x (3-word query) + 1 Openverse = 7 fetch calls");
    assertEquals(fetchLog[6].url, 'https://api.openverse.org/v1/images/?q=Gulasch%20mit%20Kn%C3%B6del&page_size=5', "Openverse URL should carry the encoded query");
    ok("fetchDishImages: empty wiki/commons for the 3-word query -> Openverse fallback with 5 thumbnail results, license/creator passthrough");

    // Case 16 (b2): Openverse mapping uses thumbnail||url and filters to https strings
    resetSandboxState();
    planFetch([
        wikiMiss,
        commonsEmpty,
        { match: OPENVERSE_MATCH, steps: [{ ok: true, json: { results: [
            { url: 'https://api.openverse.org/v1/images/direct1', license: 'CC BY', creator: 'Only Url' },
            { thumbnail: 'http://insecure.example/thumb', license: '', creator: '' },
            { thumbnail: null, url: 'https://api.openverse.org/v1/images/direct2' },
            { thumbnail: 42, license: '', creator: '' }
        ] } }] }
    ]);
    const resultB2 = await fetchDishImages('Gemüsecurry mit Reis');
    assertEquals(resultB2.source, 'openverse', "mixed Openverse results should still report openverse source");
    assertDeepEqual(resultB2.images, [
        { url: 'https://api.openverse.org/v1/images/direct1', license: 'CC BY', creator: 'Only Url' },
        { url: 'https://api.openverse.org/v1/images/direct2', license: '', creator: '' }
    ], "thumbnail||url fallback applies; non-https and non-string urls are filtered");
    ok("fetchDishImages: Openverse mapping uses thumbnail||url and filters to https strings");

    // Case 17 (c): everything fails -> graceful empty result, no cache write
    resetSandboxState();
    planFetch([
        { match: WIKI_MATCH, steps: [{ reject: 'wikipedia down' }] },
        { match: COMMONS_MATCH, steps: [{ reject: 'commons down' }] },
        { match: OPENVERSE_MATCH, steps: [{ reject: 'openverse down' }] }
    ]);
    const resultC = await fetchDishImages('Total Failure Dish');
    assertDeepEqual(resultC, { images: [], source: null }, "total failure should resolve to { images: [], source: null }");
    assertEquals(fetchLog.length, 3, "wikipedia 1x (thrown error breaks the candidate loop) + commons 1x + 1 Openverse = 3 fetch calls");
    assertEquals(sandbox.localStorage.getItem(sandbox.LS.DISH_IMAGE_CACHE), null, "no cache write on total failure");
    ok("fetchDishImages: everything fails -> { images: [], source: null }, 3 calls, no throw, no cache write");

    // Case 18 (c2): every source answers 403 -> 3 calls, empty result (anti-bot scenario)
    resetSandboxState();
    planFetch([
        { match: WIKI_MATCH, steps: [{ ok: false, status: 403 }] },
        { match: COMMONS_MATCH, steps: [{ ok: false, status: 403 }] },
        { match: OPENVERSE_MATCH, steps: [{ ok: false, status: 403 }] }
    ]);
    const resultC2 = await fetchDishImages('Käsespätzle');
    assertDeepEqual(resultC2, { images: [], source: null }, "403 everywhere should degrade to the empty result");
    assertEquals(fetchLog.length, 3, "403 variant: all 3 sources attempted");
    assertEquals(sandbox.localStorage.getItem(sandbox.LS.DISH_IMAGE_CACHE), null, "403 variant must not write a cache entry");
    ok("fetchDishImages: all sources 403 -> 3 fetch calls, empty result, graceful degradation");

    // Case 18b: pre-aborted cancelSignal -> instant empty result, zero fetch calls
    resetSandboxState();
    planFetch([]);
    const abortController = new AbortController();
    abortController.abort();
    const resultAborted = await fetchDishImages('Aborted Dish', 'de', abortController.signal);
    assertDeepEqual(resultAborted, { images: [], source: null }, "pre-aborted search should resolve to the empty result");
    assertEquals(fetchLog.length, 0, "pre-aborted search must not issue any fetch call");
    ok("fetchDishImages: pre-aborted cancelSignal -> no fetch traffic at all");

    // Case 18b2: expired entries are pruned on READ — even without a cache write
    // (cache hit isolates the session sweep: no write happens in this scenario)
    resetSandboxState();
    const TTL_PRUNE = sandbox.DISH_IMAGE_CACHE_TTL_MS;
    sandbox.localStorage.setItem(sandbox.LS.DISH_IMAGE_CACHE, JSON.stringify({ queries: {
        'frische suppe': { ts: BASE_NOW - 1000, source: 'chefkoch', images: [{ url: THUMB_C, license: '', creator: '' }] },
        'alte suppe': { ts: BASE_NOW - TTL_PRUNE - 1000, source: 'openverse', images: [{ url: 'https://example.com/alt.jpg', license: '', creator: '' }] }
    } }));
    planFetch([]);
    const resultPrune = await fetchDishImages('Frische Suppe');
    assertEquals(resultPrune.cached, true, "the surviving fresh entry should still be served from cache");
    const afterPrune = JSON.parse(sandbox.localStorage.getItem(sandbox.LS.DISH_IMAGE_CACHE));
    assertEquals(afterPrune.queries['alte suppe'], undefined, "the expired entry must be pruned on read — even without a cache write");
    assertEquals(afterPrune.queries['frische suppe'] !== undefined, true, "the fresh entry must survive the prune");
    assertEquals(fetchLog.length, 0, "cache hit: no fetch calls");
    ok("fetchDishImages: expired cache entries pruned on read (session sweep), even without a cache write");

    // Case 19 (d): cache hit serves 0 fetches; TTL expiry after 8 days refetches    resetSandboxState();
    planFetch([
        wikiHit('Käsespätzle', THUMB_C),
        wikiHit('Käsespätzle 2', THUMB_B)
    ]);
    const first = await fetchDishImages('Käsespätzle');
    assertEquals(first.source, 'wikipedia', "first call should fetch from wikipedia");
    assertEquals(first.cached, undefined, "first call must not be marked cached");
    assertEquals(fetchLog.length, 1, "first call should make exactly 1 fetch (wikipedia hit short-circuits)");
    const second = await fetchDishImages('  KÄSESPÄTZLE  ');
    assertEquals(second.cached, true, "second call (any casing/whitespace) should be served from cache");
    assertEquals(second.source, 'wikipedia', "cached source should pass through");
    assertDeepEqual(second.images, first.images, "cached images should be shape-identical to fresh ones");
    assertEquals(fetchLog.length, 1, "cache hit should trigger 0 additional fetch calls");
    mockNow = BASE_NOW + 8 * 24 * 60 * 60 * 1000;
    const third = await fetchDishImages('Käsespätzle');
    assertEquals(third.cached, undefined, "expired entry should refetch instead of serving stale cache");
    assertEquals(third.source, 'wikipedia', "refetch should succeed");
    assertEquals(fetchLog.length, 2, "refetch after TTL expiry should make a second fetch call");
    assertDeepEqual(third.images, [{ url: THUMB_B, license: '', creator: 'Käsespätzle 2' }], "refetch should return the new fixture images");
    ok("fetchDishImages: cache hit serves 0 fetches; 8 days later the expired entry refetches");

    // Case 20 (e): pruning — 50 seeded entries + 1 new -> stays 50, oldest evicted
    resetSandboxState();
    const seeded = { queries: {} };
    for (let i = 0; i < 50; i++) {
        seeded.queries['seed' + i] = { ts: BASE_NOW - (50 - i) * 1000, source: 'google', images: [{ url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:seed' + i, license: '', creator: '' }] };
    }
    sandbox.localStorage.setItem(sandbox.LS.DISH_IMAGE_CACHE, JSON.stringify(seeded));
    planFetch([wikiHit('Brandnew Dish', THUMB_C)]);
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
    planFetch([wikiHit('Fresh Query', THUMB_C)]);
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
    planFetch([wikiHit('Corrupt Cache Dish', THUMB_C)]);
    const resultG = await fetchDishImages('Corrupt Cache Dish');
    assertEquals(resultG.source, 'wikipedia', "corrupt cache JSON should be treated as empty — fetch proceeds");
    assertEquals(fetchLog.length, 1, "corrupt cache must not block the fetch");
    const afterG = JSON.parse(sandbox.localStorage.getItem(sandbox.LS.DISH_IMAGE_CACHE));
    assertEquals(afterG.queries['corrupt cache dish'] !== undefined, true, "the corrupt payload should be replaced by a valid cache");
    ok("fetchDishImages: corrupt cache JSON treated as empty and replaced by a valid cache on write");
}

// Plan QA failure scenario: every source fails (HTTP failures and rejects).
// Expected graceful behavior: 3 fetch calls (wikipedia + commons + openverse),
// empty result, no outward throw, no cache write.
async function simulateAllProxies403() {
    console.log("--- FAIL SCENARIO SIMULATION: every image source fails (HTTP 403 / rejects) ---");
    resetSandboxState();
    planFetch([
        { match: WIKI_MATCH, steps: [{ ok: false, status: 403 }] },
        { match: COMMONS_MATCH, steps: [{ ok: false, status: 403 }] },
        { match: OPENVERSE_MATCH, steps: [{ ok: false, status: 403 }] }
    ]);
    const result = await fetchDishImages('Käsespätzle');
    for (let i = 0; i < fetchLog.length; i++) {
        console.log(`  call ${i + 1}: ${fetchLog[i].url.slice(0, 76)}...`);
        console.log('         -> HTTP 403, response.ok=false -> no extraction, next stage');
    }
    console.log(`  result: ${JSON.stringify(result)}`);
    assertEquals(fetchLog.length, 3, "fail scenario: wikipedia + commons + openverse = 3 fetch calls");
    assertDeepEqual(result, { images: [], source: null }, "fail scenario: graceful empty result with source null");
    assertEquals(sandbox.localStorage.getItem(sandbox.LS.DISH_IMAGE_CACHE), null, "fail scenario: no cache write");
    ok("fail scenario (all fail): fetch call count = 3, result empty, no outward throw");
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
