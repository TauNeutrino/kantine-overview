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

// === relevanceScore: 2×exact + 2×ordered-pairs − 0.5×extra + first-token + contiguous ===

// Case 1: exact matches count, ordered pair doubles part of the signal
assertEquals(
    relevanceScore(['kartoffelgulasch', 'mit', 'fisolen'], ['kartoffelgulasch', 'mit', 'braunschweiger']),
    6.5,
    "2 exact (4) + 1 ordered pair (2) + first-token (1) − 1 extra slug token (0.5) = 6.5"
);
ok("relevanceScore: exact matches + ordered pair bonus (6.5)");

// Case 2: same words in wrong order lose the pair bonus
assertEquals(
    relevanceScore(['fisolen', 'mit', 'kartoffelgulasch'], ['kartoffelgulasch', 'mit', 'braunschweiger']),
    3.5,
    "2 exact (4) + 0 ordered pairs + no first-token − 1 extra slug token (0.5) = 3.5"
);
ok("relevanceScore: unordered matches lose pair bonus and first-token (3.5)");

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

// Case 5: case-insensitive matching
assertEquals(
    relevanceScore(['Mit'], ['mit']),
    7,
    "matching must be case-insensitive: 2 + 0 + 1 + 4 = 7"
);
ok("relevanceScore: case-insensitive exact match");

// Case 6: prefix-only is NOT a match anymore (exact semantics)
assertEquals(
    relevanceScore(['kartoffel'], ['kartoffelgulasch']),
    -0.5,
    "0 exact + 0 pairs − 1 extra slug token (0.5), no contiguous substring = -0.5"
);
ok("relevanceScore: prefix similarity scores -0.5 (exact-only)");

// Case 6b: full query as-is with a prefix — the strongest signal
assertEquals(
    relevanceScore(['geroestete', 'knoedel', 'mit', 'ei'], ['knödel', 'mit', 'ei']),
    15.5,
    "3 exact (6) + 3 ordered pairs (6) − 1 extra slug token (0.5) + 0 first-token + contiguous full match (4) = 15.5"
);
ok("relevanceScore: full query as substring with prefix scores 15.5 (top signal)");

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
