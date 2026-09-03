const fs = require('fs');
const vm = require('vm');
const path = require('path');

console.log("=== Running Worker Scoring Unit Tests: relevance ===");

// Load cloudflare-worker/worker.js into a vm sandbox so the scoring helpers
// can be unit-tested without deploying. Pattern: strip `export default`
// (bare `default` would be a syntax error), promote top-level const/let to
// var so declarations leak onto the sandbox object (tests/_langLoader.js trick).
const sandbox = {
    console: {
        log: (...args) => console.log(...args),
        warn: (...args) => console.warn(...args),
        error: (...args) => console.error(...args)
    }
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

const { relevanceScore, slugTokensFromUrl, titleFromSlug } = sandbox;

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

// === relevanceScore: exact-word matches ===

// Case 1: exact matches count, ordered adjacent pair doubles the signal
assertEquals(
    relevanceScore(['kartoffelgulasch', 'mit', 'fisolen'], ['kartoffelgulasch', 'mit', 'braunschweiger']),
    4,
    "2 exact matches + 1 ordered adjacent pair (kartoffelgulasch->mit) should score 2 + 2*1 = 4"
);
ok("relevanceScore: exact matches + ordered pair bonus (4)");

// Case 2: same words in wrong order lose the pair bonus
assertEquals(
    relevanceScore(['fisolen', 'mit', 'kartoffelgulasch'], ['kartoffelgulasch', 'mit', 'braunschweiger']),
    2,
    "2 exact matches in wrong order should score 2 + 2*0 = 2"
);
ok("relevanceScore: unordered matches lose the pair bonus (2)");

// Case 3: no overlap scores zero
assertEquals(
    relevanceScore(['pizza', 'margherita'], ['kartoffelgulasch', 'mit']),
    0,
    "no shared words should score 0"
);
ok("relevanceScore: no overlap scores 0");

// Case 4: single-word match has no pair to form
assertEquals(
    relevanceScore(['gulasch'], ['gulasch']),
    1,
    "single-word exact match should score 1"
);
ok("relevanceScore: single-word match scores 1");

// Case 5: case-insensitive matching
assertEquals(
    relevanceScore(['Mit'], ['mit']),
    1,
    "matching must be case-insensitive"
);
ok("relevanceScore: case-insensitive exact match");

// Case 6: prefix-only is NOT a match anymore (exact semantics)
assertEquals(
    relevanceScore(['kartoffel'], ['kartoffelgulasch']),
    0,
    "prefix-only similarity must not score under exact semantics"
);
ok("relevanceScore: prefix similarity scores 0 (exact-only)");

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

console.log("✅ Worker Scoring Unit Tests Passed!");
process.exit(0);
