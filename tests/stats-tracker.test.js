const fs = require('fs');
const vm = require('vm');
const path = require('path');

console.log("=== Running Stats Tracker Unit Tests ===");

// Mock localStorage
const localStorageData = {};
const mockLocalStorage = {
    getItem: function(key) { return localStorageData[key] || null; },
    setItem: function(key, val) { localStorageData[key] = String(val); },
    removeItem: function(key) { delete localStorageData[key]; }
};

// Mock crypto with deterministic digest
const mockCrypto = {
    subtle: {
        digest: async function(algorithm, data) {
            const text = new TextDecoder().decode(data);
            let hash = 0;
            for (let i = 0; i < text.length; i++) {
                const char = text.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & 0xFFFFFFFF;
            }
            const arr = new Uint8Array(32);
            for (let i = 0; i < 32; i++) {
                arr[i] = (Math.abs(hash) + i * 17) % 256;
            }
            return arr.buffer;
        }
    },
    randomUUID: function() {
        return 'mock-uuid-' + Math.random().toString(36).substring(2);
    }
};

const sandbox = {
    console: console,
    localStorage: mockLocalStorage,
    crypto: mockCrypto,
    Date: Date,
    JSON: JSON,
    parseInt: parseInt,
    isNaN: isNaN,
    Math: Math,
    Array: Array,
    Uint8Array: Uint8Array,
    TextEncoder: TextEncoder,
    TextDecoder: TextDecoder
};

// Load source code
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
        console.error(`❌ Assertion Failed: ${message}`);
        console.error(`   Expected: ${JSON.stringify(expected)}`);
        console.error(`   Actual:   ${JSON.stringify(actual)}`);
        process.exit(1);
    }
}

function assertDeepEquals(actual, expected, message) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
        console.error(`❌ Assertion Failed: ${message}`);
        console.error(`   Expected: ${expectedStr}`);
        console.error(`   Actual:   ${actualStr}`);
        process.exit(1);
    }
}

function assertNotNull(value, message) {
    if (value === null || value === undefined) {
        console.error(`❌ Assertion Failed: ${message}`);
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

// --- Test computeUserHash consistency ---
console.log("Testing computeUserHash consistency...");
(async () => {
    const hash1 = await sandbox.computeUserHash('token', 'user1', 'salt');
    const hash2 = await sandbox.computeUserHash('token', 'user1', 'salt');
    assertEquals(hash1, hash2, "Same inputs should produce same user hash");

    const hash3 = await sandbox.computeUserHash(null, null, 'salt');
    assertNotNull(hash3, "User hash should be generated for anonymous user");

    console.log("✅ All Stats Tracker Unit Tests Passed!");
})().catch(e => {
    console.error("❌ Async test failed:", e.message);
    process.exit(1);
});
