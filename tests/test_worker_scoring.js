const fs = require('fs');
const vm = require('vm');
const path = require('path');

console.log("=== Running Worker Scoring Unit Tests: relevance ===");

// Load cloudflare-worker/worker.js into a vm sandbox so the scoring helpers
// can be unit-tested without deploying. Pattern: strip `export default`
// (bare `default` would be a syntax error), promote top-level const/let to
// var so declarations leak onto the sandbox object (tests/_langLoader.js trick).
class SandboxResponse {
    constructor(body, init) {
        this._body = body;
        this.status = (init && init.status) || 200;
    }
    async text() { return this._body; }
    async json() { return JSON.parse(this._body); }
}

const sandbox = {
    console: {
        log: (...args) => console.log(...args),
        warn: (...args) => console.warn(...args),
        error: (...args) => console.error(...args)
    },
    fetch: () => Promise.reject(new Error('fetch not mocked for this test')),
    Response: SandboxResponse,
    URL: URL,
    AbortSignal: AbortSignal
};

const workerPath = path.join(__dirname, '..', 'cloudflare-worker', 'worker.js');
const workerSource = fs.readFileSync(workerPath, 'utf8')
    .replace('export default', 'const __workerModule =')
    .replace(/^(const|let) /gm, 'var ');

vm.createContext(sandbox);
try {
    vm.runInContext(workerSource, sandbox);
} catch (e) {
    console.error("Error loading worker.js in sandbox:", e);
    process.exit(1);
}

const { relevanceScore, slugTokensFromUrl, titleFromSlug, searchCandidates, candidateTokens } = sandbox;

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        console.error(`❌ Assertion Failed: ${message}`);
        console.error(`   Expected: ${JSON.stringify(expected)}`);
        console.error(`   Actual:   ${JSON.stringify(actual)}`);
        process.exit(1);
    }
}

function ok(message) {
    console.log(`OK: ${message}`);
}

// === relevanceScore: 2×weighted-exact + 2×weighted-pairs − 0.5×extra + first-token + contiguous ===
// Side tokens (from the first side indicator like "mit" on) weigh 1/4.

// Case 1: main-dish tokens keep full weight, side tokens are quartered
assertEquals(
    relevanceScore(['kartoffelgulasch', 'mit', 'fisolen'], ['kartoffelgulasch', 'mit', 'braunschweiger']),
    3.5,
    "exact kg(1)+mit(0.25)=1.25 -> 2.5; pair (kg,mit) min(1,0.25)*2=0.5; extra 1 -> -0.5; first-token 1; no contiguous = 3.5"
);
ok("relevanceScore: side tokens quartered (3.5)");

// Case 2: same words in wrong order lose the pair bonus
assertEquals(
    relevanceScore(['fisolen', 'mit', 'kartoffelgulasch'], ['kartoffelgulasch', 'mit', 'braunschweiger']),
    2,
    "exact 1.25 -> 2.5; pairs none; extra 1 -> -0.5; no first-token; no contiguous = 2"
);
ok("relevanceScore: unordered matches lose pair bonus and first-token (2)");

// Case 3: no overlap scores negative (conciseness penalty on junk)
assertEquals(
    relevanceScore(['pizza', 'margherita'], ['kartoffelgulasch', 'mit']),
    -1,
    "0 exact + 0 pairs − 2 extra slug tokens (1) = -1"
);
ok("relevanceScore: no overlap scores -1");

// Case 4: single-word match also collects contiguous bonus
assertEquals(
    relevanceScore(['gulasch'], ['gulasch']),
    7,
    "2 exact + 0 pairs + first-token (1) + contiguous full match (4) = 7"
);
ok("relevanceScore: single-word match scores 7");

// Case 5: case-insensitive matching; indicator words weigh 1/4
assertEquals(
    relevanceScore(['Mit'], ['mit']),
    4.75,
    "exact 0.25 -> 0.5; 0 pairs; first-token 0.25; contiguous (4) = 4.75"
);
ok("relevanceScore: indicator token quartered (4.75)");

// Case 6: prefix-only is NOT a match anymore (exact semantics)
assertEquals(
    relevanceScore(['kartoffel'], ['kartoffelgulasch']),
    1,
    "substring containment both ways at half weight: 0.5 exact -> 1"
);
ok("relevanceScore: partial substring match scores 1 (half weight)");

// Case 6e: glued compound from real menu data — 'gemüselasagnemit' matches 'lasagne'
assertEquals(
    relevanceScore(['lasagne', 'mit', 'tomatensauce'], ['gemüselasagnemit', 'tomatensauce']),
    2.5,
    "exact 'tomatensauce'(1) + partial 'gemüselasagnemit'~'lasagne'(0.5) -> 1.5*2 = 3; pairs none; extra 3-2=1 -> -0.5; no first-token; no contiguous = 2.5"
);
ok("relevanceScore: glued compound partially matches its ingredient (2.5)");

// Case 6b: full query as-is with a prefix — the strongest signal
assertEquals(
    relevanceScore(['geroestete', 'knoedel', 'mit', 'ei'], ['knödel', 'mit', 'ei']),
    8,
    "exact 1+0.25+0.25 -> 3; pairs 3x0.25 -> 1.5; extra 1 -> -0.5; first-token 0; contiguous (4) = 8"
);
ok("relevanceScore: full query as substring with prefix scores 8 (top signal)");

// Case 6c: USER CASE — side-heavy slide must not outrank the pure main dish
assertEquals(
    relevanceScore(['gulasch'], ['gulasch', 'mit', 'wedges']),
    3,
    "pure main dish: exact 1 -> 2; pairs none; first-token 1; no contiguous (slug shorter than query) = 3"
);
assertEquals(
    relevanceScore(['x', 'mit', 'wedges'], ['gulasch', 'mit', 'wedges']),
    1,
    "side-heavy slide: exact 0.25+0.25 -> 1; pair (mit,wedges) min*2 = 0.5; extra 1 -> -0.5; no first-token; no contiguous = 1"
);
ok("relevanceScore: pure main dish (3) beats side-heavy slide (1)");

// Case 6d: "an" is also a side indicator ("Topfenknödel an Fruchtmuse")
assertEquals(
    relevanceScore(['topfenknoedel'], ['topfenknoedel', 'an', 'fruchtmuse']),
    3,
    "pure main dish: exact 1 -> 2; pairs none; first-token 1; no contiguous = 3"
);
assertEquals(
    relevanceScore(['x', 'an', 'fruchtmuse'], ['topfenknoedel', 'an', 'fruchtmuse']),
    1,
    "side-heavy slide: exact 0.25+0.25 -> 1; pair (an,fruchtmuse) 0.5; extra 1 -> -0.5; no first-token; no contiguous = 1"
);
ok("relevanceScore: 'an' downgrades side suffixes like 'mit'");

// === slugTokensFromUrl ===

// Case 7: tokens extracted from a chefkoch CDN url
assertEquals(
    JSON.stringify(slugTokensFromUrl('https://img.chefkoch-cdn.de/rezepte/3461961515755830/bilder/1138569/fit-960x720/kartoffelgulasch-mit-fisolen.jpg')),
    JSON.stringify(['kartoffelgulasch', 'mit', 'fisolen']),
    "slug tokens must come from the recipe filename"
);
ok("slugTokensFromUrl: recipe filename splits into tokens");

// === titleFromSlug ===

// Case 8: human-readable title from slug tokens
assertEquals(
    titleFromSlug(['kartoffelgulasch', 'mit', 'fisolen']),
    'Kartoffelgulasch Mit Fisolen',
    "title must capitalize each token"
);
ok("titleFromSlug: tokens become a readable title");

// === searchCandidates: progressive shortening ===

// Case 10: multi-word query yields full, first-two, first-word candidates
assertEquals(
    JSON.stringify(searchCandidates('Penne mit Gemüsesugo')),
    JSON.stringify(['Penne mit Gemüsesugo', 'Penne mit', 'Penne']),
    "multi-word query should produce full, first-two and first-word candidates"
);
ok("searchCandidates: 3-word query shortens progressively");

// Case 11: single-word query yields exactly one candidate
assertEquals(
    JSON.stringify(searchCandidates('Gulasch')),
    JSON.stringify(['Gulasch']),
    "single-word query should produce a single candidate"
);
ok("searchCandidates: single-word query stays single");

// Case 12: short queries are filtered out
assertEquals(
    JSON.stringify(searchCandidates('ab')),
    JSON.stringify([]),
    "too-short query should produce no candidates"
);
ok("searchCandidates: too-short query filtered");

// === candidateTokens: whitespace + hyphen splitting, short words kept ===

// Case 13: hyphens split like whitespace, 2-letter words kept
assertEquals(
    JSON.stringify(candidateTokens('Linsen-Curry mit Ei')),
    JSON.stringify(['linsen', 'curry', 'mit', 'ei']),
    "hyphens must split like whitespace and short words must survive"
);
ok("candidateTokens: hyphen splitting keeps short words (Ei)");

// === handler smoke test (mocked fetch) ===

// Case 14: full handler path with a chefkoch hit — catches wiring bugs like
// undefined variables in the request handler (ReferenceError -> HTTP 500 live)
async function runHandlerTests() {
    sandbox.fetch = (url) => {
        const u = String(url);
        if (u.includes('chefkoch.de')) {
            return Promise.resolve({ ok: true, text: () => Promise.resolve('<img src="https://img.chefkoch-cdn.de/rezepte/1/bilder/2/fit-960x720/gulasch.jpg">') });
        }
        return Promise.resolve({ ok: true, text: () => Promise.resolve('<html>empty</html>') });
    };
    const response = await sandbox.__workerModule.fetch({ url: 'https://x/?q=Gulasch&hl=de', method: 'GET' });
    assertEquals(response.status, 200, "handler must answer 200");
    const data = await response.json();
    assertEquals(data.engine, 'chefkoch+kochbar+eatsmarter', "engine tag must list all sources");
    assertEquals(data.count, 1, "exactly one image expected");
    assertEquals(data.images[0].source, 'chefkoch', "hit must carry the chefkoch source");
    ok("handler: chefkoch hit end-to-end (mocked fetch), no ReferenceError");
}

runHandlerTests().then(() => {
// === austrian synonyms (AT menu names vs standard recipe spellings) ===

// Case 15: rindsbraten matches rinderbraten (either direction)
assertEquals(
    relevanceScore(['rinderbraten'], ['rindsbraten']),
    7,
    "canonicalized single-word match: 2 exact + 0 pairs + first-token 1 + contiguous 4 = 7"
);
assertEquals(
    relevanceScore(['hendl'], ['haehnchen']),
    7,
    "hendl normalizes to haehnchen"
);
ok("relevanceScore: austrian synonyms resolve both directions");

// Case 16: multi-word synonym sentence
assertEquals(
    relevanceScore(['quark', 'taschen'], ['topfen', 'taschen']),
    11,
    "2 exact (4) + 1 ordered pair (2) + first-token (1) + contiguous (4) = 11"
);
ok("relevanceScore: topfen/quark sentence scores 11");

console.log("✅ Worker Scoring Unit Tests Passed!");
process.exit(0);
}).catch((err) => {
    console.error("❌ Handler smoke test failed:", err && err.message ? err.message : err);
    process.exit(1);
});
