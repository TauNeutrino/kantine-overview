const fs = require('fs');
const vm = require('vm');
const path = require('path');

console.log("=== Running Stats Tracker Unit Tests ===");

const localStorageData = {};
const mockLocalStorage = {
    getItem: function(key) { return localStorageData[key] || null; },
    setItem: function(key, val) { localStorageData[key] = String(val); },
    removeItem: function(key) { delete localStorageData[key] }
};

// Deterministic crypto.subtle mock — same input always = same output
const mockCrypto = {
    subtle: {
        digest: async function(algo, buffer) {
            const text = new TextDecoder().decode(buffer);
            let hash = 5381;
            for (let i = 0; i < text.length; i++) {
                hash = ((hash << 5) + hash) + text.charCodeAt(i);
                hash = hash & hash;
            }
            const out = new Uint8Array(32);
            for (let i = 0; i < 32; i++) out[i] = (hash + i * 17) & 0xFF;
            return out.buffer;
        }
    }
};

const sandbox = {
    console: console,
    localStorage: mockLocalStorage,
    crypto: mockCrypto,
    Array: Array,
    Array: { from: Array.from },
    Uint8Array: Uint8Array,
    TextEncoder: TextEncoder,
    TextDecoder: TextDecoder,
    LS: { CURRENT_USER: 'kantine_currentUser' },
    Date: Date,
    JSON: JSON,
    parseInt: parseInt,
    isNaN: isNaN,
    Math: Math
};

const statsHashPath = path.join(__dirname, '..', 'src', 'stats-hash.js');
const statsTrackerPath = path.join(__dirname, '..', 'src', 'stats-tracker.js');

const statsHashCode = fs.readFileSync(statsHashPath, 'utf8');
const statsTrackerCode = fs.readFileSync(statsTrackerPath, 'utf8');

function cleanSrc(src) {
    return src
        .replace(/export\s+{[^}]*};?/g, '')
        .replace(/export\s+/g, '')
        .replace(/import\s+.*?from\s+['"][^'"]+['"];?/g, '')
        .replace(/^(const|let) /gm, 'var ');
}

const cleanedHashCode = cleanSrc(statsHashCode);
const cleanedTrackerCode = cleanSrc(statsTrackerCode);

vm.createContext(sandbox);
try {
    vm.runInContext(cleanedHashCode, sandbox);
    vm.runInContext(cleanedTrackerCode, sandbox);
} catch (e) {
    console.error("Error loading source code in sandbox:", e);
    process.exit(1);
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        console.error(`\u274c Assertion Failed: ${message}`);
        console.error(`   Expected: ${JSON.stringify(expected)}`);
        console.error(`   Actual:   ${JSON.stringify(actual)}`);
        process.exit(1);
    }
}

function assertDeepEquals(actual, expected, message) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
        console.error(`\u274c Assertion Failed: ${message}`);
        console.error(`   Expected: ${expectedStr}`);
        console.error(`   Actual:   ${actualStr}`);
        process.exit(1);
    }
}

function assertNull(value, message) {
    if (value !== null && value !== undefined) {
        console.error(`\u274c Assertion Failed: ${message} (got ${JSON.stringify(value)})`);
        process.exit(1);
    }
}

function clearStorage() {
    for (const key in localStorageData) {
        delete localStorageData[key];
    }
}

// --- Test increment ---
console.log("Testing increment...");
clearStorage();
sandbox.tracker.increment('starts');
sandbox.tracker.increment('starts');
sandbox.tracker.increment('clicks');
assertEquals(sandbox.tracker.getLocalStats().starts, 2, "starts should be 2 after two increments");
assertEquals(sandbox.tracker.getLocalStats().clicks, 1, "clicks should be 1 after one increment");

// --- Test set ---
console.log("Testing set...");
clearStorage();
sandbox.tracker.set('version', '1.9.4');
assertEquals(sandbox.tracker.getLocalStats().version, '1.9.4', "version should be '1.9.4' after set");
sandbox.tracker.set('version', '2.0.0');
assertEquals(sandbox.tracker.getLocalStats().version, '2.0.0', "version should be '2.0.0' after update");

// --- Test incrementCategory ---
console.log("Testing incrementCategory...");
clearStorage();
sandbox.tracker.incrementCategory('version', '1.9.4');
sandbox.tracker.incrementCategory('version', '1.9.4');
sandbox.tracker.incrementCategory('version', '2.0.0');
assertEquals(sandbox.tracker.getLocalStats().version_1_9_4, 1, "version_1_9_4 should be 1 (duplicate same-day call deduplicated)");
assertEquals(sandbox.tracker.getLocalStats().version_2_0_0, 1, "version_2_0_0 should be 1 after one incrementCategory call");
sandbox.tracker.incrementCategory('mobile', true);
sandbox.tracker.incrementCategory('mobile', false);
sandbox.tracker.incrementCategory('mobile', true);
assertEquals(sandbox.tracker.getLocalStats().mobile_true, 1, "mobile_true should be 1 (duplicate deduplicated)");
assertEquals(sandbox.tracker.getLocalStats().mobile_false, 1, "mobile_false should be 1");

// --- Test incrementCategory deduplication resets on day rollover ---
console.log("Testing incrementCategory dedup resets on day rollover...");
clearStorage();
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
localStorageData._kstats_state = JSON.stringify({
    date: yesterday,
    daily: {},
    _catCounted: { version_1_9_4: true },
    session: { start_ms: Date.now() },
    has_flushed: false,
    pendingFlush: null
});
sandbox.tracker.incrementCategory('version', '1.9.4');
assertEquals(sandbox.tracker.getLocalStats().version_1_9_4, 1, "version_1_9_4 should be 1 (new day, dedup reset)");
assertEquals(sandbox.tracker.getPendingFlush().daily.version_1_9_4, undefined, "Old day's _catCounted should not be in pendingFlush (it's local-only)");

// --- Test load with old date (pendingFlush) ---
console.log("Testing load with old date (pendingFlush)...");
clearStorage();
localStorageData._kstats_state = JSON.stringify({
    date: '2024-01-01',
    daily: { views: 5, clicks: 3 },
    session: { start_ms: 1234567890 },
    has_flushed: true,
    pendingFlush: null
});
const freshStats = sandbox.tracker.getLocalStats();
assertEquals(Object.keys(freshStats).length, 0, "Daily should be empty on date rollover");
const pending = sandbox.tracker.getPendingFlush();
assertDeepEquals(pending, { date: '2024-01-01', daily: { views: 5, clicks: 3 }, user_hash: null },
    "Old daily should become pendingFlush on date rollover");

// --- Test load with same date (continue) ---
console.log("Testing load with same date (continue)...");
clearStorage();
const today = new Date().toISOString().split('T')[0];
localStorageData._kstats_state = JSON.stringify({
    date: today,
    daily: { views: 10 },
    session: { start_ms: 1234567890 },
    has_flushed: false,
    pendingFlush: null
});
assertEquals(sandbox.tracker.getLocalStats().views, 10, "Should continue with same date stats");

// --- Test session.start_ms exists after load ---
console.log("Testing session.start_ms after load...");
clearStorage();
sandbox.tracker.increment('pageview');
const storedState = JSON.parse(localStorageData._kstats_state);
assertEquals(typeof storedState.session.start_ms, 'number', "session.start_ms should be a number after load()");

// --- Test markFlushed ---
console.log("Testing markFlushed...");
clearStorage();
localStorageData._kstats_state = JSON.stringify({
    date: today,
    daily: { starts: 5 },
    user_hash: 'abc123',
    session: { start_ms: 1234567890 },
    has_flushed: false,
    pendingFlush: { date: '2024-01-01', daily: { starts: 3 }, user_hash: 'def456' }
});
sandbox.tracker.markFlushed();
const flushedState = JSON.parse(localStorageData._kstats_state);
assertEquals(flushedState.has_flushed, true, "has_flushed should be true after markFlushed");
assertEquals(flushedState.pendingFlush, null, "pendingFlush should be null after markFlushed");

// --- Test computeUserHash semantics ---
console.log("Testing computeUserHash semantics...");
(async () => {
    clearStorage();

    // No currentUser → null
    const hashLoggedOut = await sandbox.computeUserHash();
    assertNull(hashLoggedOut, "User hash should be null when no kantine_currentUser is set");

    // With currentUser → stable SHA-256 hex string (64 chars)
    localStorageData.kantine_currentUser = '42';
    const hash1 = await sandbox.computeUserHash();
    const hash2 = await sandbox.computeUserHash();
    assertEquals(typeof hash1, 'string', "hash should be a string when user is logged in");
    assertEquals(hash1.length, 64, "SHA-256 output should be 64 hex chars");
    assertEquals(hash1, hash2, "Same user should produce same hash");

    // Different user → different hash
    localStorageData.kantine_currentUser = '99';
    const hash3 = await sandbox.computeUserHash();
    if (hash1 === hash3) {
        console.error(`\u274c Assertion Failed: Different users must produce different hashes (both: ${hash1})`);
        process.exit(1);
    }
    console.log("   hash(42) =", hash1);
    console.log("   hash(99) =", hash3);

    // Logged out again → null
    delete localStorageData.kantine_currentUser;
    const hashLoggedOutAgain = await sandbox.computeUserHash();
    assertNull(hashLoggedOutAgain, "User hash should return to null after logout");

    // --- Test tracker.persist preserves hash ---
    console.log("Testing tracker.persist preserves hash...");
    clearStorage();
    localStorageData.kantine_currentUser = 'employee-7';
    const s = sandbox.tracker.load();
    s.user_hash = await sandbox.computeUserHash();
    sandbox.tracker.persist();
    const persisted = JSON.parse(localStorageData._kstats_state);
    assertEquals(persisted.user_hash, s.user_hash, "Persisted state should include user_hash");

    console.log("\u2705 All Stats Tracker Unit Tests Passed!");
})().catch(e => {
    console.error("\u274c Async test failed:", e.message);
    process.exit(1);
});
