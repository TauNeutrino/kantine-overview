const fs = require('fs');
const vm = require('vm');
const path = require('path');

console.log("=== Running Actions Unit Tests: isCacheFresh ===");

// 1. Setup Mock Environment
let mockNowValue = Date.now();

const sandbox = {
    console: console,
    localStorage: {
        _data: {},
        getItem: function (key) { return this._data[key] || null; },
        setItem: function (key, val) { this._data[key] = String(val); },
        clear: function () { this._data = {}; }
    },
    // Avoid mutating the global Date object
    Date: class extends Date {
        constructor(...args) {
            if (args.length === 0) return new Date(mockNowValue);
            return new Date(...args);
        }
        static now() {
            return mockNowValue;
        }
    },
    getISOWeek: () => 1,
    getWeekYear: () => 2024,
    allWeeks: [],
    // Constants from src/constants.js
    LS: {
        MENU_CACHE_TS: 'kantine_menuCacheTs'
    },
    // Mocks for dependencies
    document: {
        getElementById: () => ({
            classList: { add: () => { }, remove: () => { } },
            style: {},
            textContent: ''
        }),
        createElement: () => ({
            classList: { add: () => { } },
            appendChild: () => { }
        }),
        body: { appendChild: () => { } }
    },
    setInterval: () => { },
    clearInterval: () => { },
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
    Notification: { permission: 'denied', requestPermission: () => { } },
    t: (key) => key,
    showToast: () => { },
    renderVisibleWeeks: () => { },
    updateNextWeekBadge: () => { },
    updateAlarmBell: () => { },
    apiHeaders: () => ({}),
    escapeHtml: (t) => t,
    getRelativeTime: () => '',
    isNewer: () => false,
    authToken: 'mock-token',
    setAllWeeks: (w) => { sandbox.allWeeks = w; },
    setCurrentWeekNumber: () => { },
    setCurrentYear: () => { }
};

// 2. Load Source Code
const actionsPath = path.join(__dirname, '..', 'src', 'actions.js');
let actionsCode = fs.readFileSync(actionsPath, 'utf8');

// Use more robust regex to strip imports and exports
// This handles multi-line imports and ensures 'export' is only matched at start of lines or after whitespace
const cleanedActionsCode = actionsCode
    .replace(/^import\s+[\s\S]*?from\s+['"].*?['"];?/gm, '')
    .replace(/\bexport\s+/g, '')
    .replace(/import\(.*?\)\.then\(.*?\);/g, '');

vm.createContext(sandbox);
try {
    vm.runInContext(cleanedActionsCode, sandbox);
} catch (e) {
    console.error("Error loading actions.js in sandbox:", e);
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

console.log("Testing isCacheFresh...");

// Use the constant from the sandbox LS mock
const CACHE_TS_KEY = sandbox.LS.MENU_CACHE_TS;

// Case 1: No cached timestamp exists -> returns false
sandbox.localStorage.clear();
assertEquals(sandbox.isCacheFresh(), false, "Should return false when no timestamp in localStorage");

// Case 2: Cached timestamp is too old (> 1 hour) -> returns false
const oneHourAndOneMinute = (60 * 60 * 1000) + (60 * 1000);
mockNowValue = Date.now();
sandbox.localStorage.setItem(CACHE_TS_KEY, new Date(mockNowValue - oneHourAndOneMinute).toISOString());
assertEquals(sandbox.isCacheFresh(), false, "Should return false when cache is older than 1 hour");

// Case 3: Cached timestamp is fresh, but allWeeks is empty -> returns false
sandbox.localStorage.setItem(CACHE_TS_KEY, new Date(mockNowValue - 1000).toISOString());
sandbox.allWeeks = [];
assertEquals(sandbox.isCacheFresh(), false, "Should return false when allWeeks is empty");

// Case 4: Cached timestamp is fresh, allWeeks has wrong week/year -> returns false
sandbox.getISOWeek = () => 10;
sandbox.getWeekYear = () => 2024;
sandbox.allWeeks = [{ weekNumber: 9, year: 2024, days: [{ date: '2024-03-01' }] }];
assertEquals(sandbox.isCacheFresh(), false, "Should return false when current week is not in allWeeks");

// Case 5: Cached timestamp is fresh, current week exists in allWeeks but has no days -> returns false
sandbox.allWeeks = [{ weekNumber: 10, year: 2024, days: [] }];
assertEquals(sandbox.isCacheFresh(), false, "Should return false when current week has no days");

// Case 6: Cached timestamp is fresh, current week exists in allWeeks and has days -> returns true
sandbox.allWeeks = [{ weekNumber: 10, year: 2024, days: [{ date: '2024-03-05' }] }];
assertEquals(sandbox.isCacheFresh(), true, "Should return true when cache is fresh and current week has data");

console.log("✅ isCacheFresh Unit Tests Passed!");
