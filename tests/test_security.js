const fs = require('fs');
const vm = require('vm');
const path = require('path');

console.log("=== Running Security Enhancement Verification Tests ===");

// Helper to check for XSS patterns in strings
function containsXSS(str) {
    const malicious = [
        '<img',
        'onerror',
        'alert(1)',
        '<script',
        'javascript:'
    ];
    return malicious.some(m => String(str).toLowerCase().includes(m));
}

// Mock DOM
const createMockElement = (id = 'mock') => {
    const el = {
        id,
        classList: { 
            add: () => { }, 
            remove: () => { }, 
            contains: () => false,
            toggle: () => { }
        },
        _innerHTML: '',
        get innerHTML() { return this._innerHTML; },
        set innerHTML(val) {
            this._innerHTML = val;
            if (containsXSS(val)) {
                console.error(`❌ SECURITY VULNERABILITY: XSS payload detected in innerHTML of element "${id}"!`);
                console.error(`Payload: ${val}`);
                process.exit(1);
            }
        },
        _textContent: '',
        get textContent() { return this._textContent; },
        set textContent(val) { 
            this._textContent = val;
            // textContent is safe, so we don't crash here even if it contains payload
            if (containsXSS(val)) {
                console.log(`✅ Safe textContent usage detected in element "${id}" (Payload neutralized)`);
            }
        },
        value: '',
        style: { cssText: '', display: '' },
        addEventListener: () => { },
        removeEventListener: () => { },
        appendChild: function(child) { 
            if (this.id === 'tags-list' || this.id === 'toast-container') {
                // Check children for XSS
                if (child._innerHTML && containsXSS(child._innerHTML)) {
                   console.error(`❌ SECURITY VULNERABILITY: Malicious child appended to "${this.id}"!`);
                   process.exit(1);
                }
            }
        },
        removeChild: () => { },
        querySelector: (sel) => createMockElement(sel),
        querySelectorAll: () => [createMockElement()],
        getAttribute: () => '',
        setAttribute: () => { },
        remove: () => { },
        dataset: {},
        forEach: (cb) => [].forEach(cb) // for querySelectorAll
    };
    return el;
};

const sandbox = {
    console: console,
    document: {
        body: createMockElement('body'),
        createElement: (tag) => createMockElement(tag),
        getElementById: (id) => createMockElement(id),
        querySelector: (sel) => createMockElement(sel),
    },
    localStorage: {
        _data: {},
        getItem: function(key) { return this._data[key] || null; },
        setItem: function(key, val) { this._data[key] = String(val); },
        removeItem: function(key) { delete this._data[key]; }
    },
    fetch: () => Promise.reject(new Error('Network error')),
    setTimeout: (cb) => cb(),
    setInterval: () => { },
    requestAnimationFrame: (cb) => cb(),
    Date: Date,
    Notification: { permission: 'denied', requestPermission: () => { } },
    window: { 
        location: { href: '' },
        open: () => {},
        crypto: { randomUUID: () => '1234' }
    },
    crypto: { randomUUID: () => '1234' }
};

// Load source files
const files = [
    '../src/utils.js',
    '../src/constants.js',
    '../src/api.js',
    '../src/ui_helpers.js',
    '../src/actions.js'
];

vm.createContext(sandbox);

// Helper to load and wrap ESM-like files into CJS for VM
function loadFile(relPath) {
    let code = fs.readFileSync(path.join(__dirname, relPath), 'utf8');
    // Simple regex replacements for imports/exports
    code = code.replace(/export /g, '');
    code = code.replace(/import .*? from .*?;/g, (match) => {
        // We handle dependencies manually in this narrow test context
        return `// ${match}`;
    });
    return code;
}

// Initial state mock
vm.runInContext(`
    var authToken = null;
    var currentUser = null;
    var orderMap = new Map();
    var userFlags = new Set();
    var highlightTags = [];
    var allWeeks = [];
    var currentWeekNumber = 1;
    var currentYear = 2024;
    var displayMode = 'this-week';
    var langMode = 'de';
    
    // State setters
    function setAuthToken(v) { authToken = v; }
    function setCurrentUser(v) { currentUser = v; }
    function setHighlightTags(v) { highlightTags = v; }
    function setAllWeeks(v) { allWeeks = v; }
    function setCurrentWeekNumber(v) { currentWeekNumber = v; }
    function setCurrentYear(v) { currentYear = v; }
`, sandbox);

files.forEach(f => vm.runInContext(loadFile(f), sandbox));

// i18n mock
vm.runInContext(`
    function t(key) { return key; }
`, sandbox);

async function runTests() {
    console.log("--- Test 1: GUEST_TOKEN Removal ---");
    const headers = sandbox.apiHeaders(null);
    if (headers['Authorization']) {
        console.error("❌ FAIL: Authorization header present for null token!");
        process.exit(1);
    } else {
        console.log("✅ PASS: No Authorization header for unauthenticated calls.");
    }

    console.log("--- Test 2: XSS in renderTagsList ---");
    sandbox.highlightTags = ['<img src=x onerror=alert(1)>'];
    // This should NOT crash the test because it uses textContent now
    sandbox.renderTagsList();
    console.log("✅ PASS: renderTagsList handled malicious tag safely.");

    console.log("--- Test 3: showErrorModal Security ---");
    // New signature: title, message, details, btnText, url
    sandbox.showErrorModal(
        '<img src=x onerror=alert(1)>', 
        '<img src=x onerror=alert(1)>', 
        '<img src=x onerror=alert(1)>', 
        'Safe Btn', 
        'javascript:alert(1)'
    );
    console.log("✅ PASS: showErrorModal handled malicious payloads safely.");

    console.log("--- Test 4: addHighlightTag Validation ---");
    const invalidInputs = [
        '<script>alert(1)</script>',
        'a', // too short (min 2)
        'verylongtagnameover20characterslong', // too long (max 20)
        'invalid;char' // invalid chars
    ];
    
    invalidInputs.forEach(input => {
        const result = sandbox.addHighlightTag(input);
        if (result === true) {
            console.error(`❌ FAIL: Invalid input "${input}" was accepted!`);
            process.exit(1);
        }
    });

    const validInputs = ['short', 'Bio', 'Vegg-I', 'Menü 1'];
    validInputs.forEach(input => {
        const result = sandbox.addHighlightTag(input);
        if (result === false && !sandbox.highlightTags.includes(input)) {
             console.error(`❌ FAIL: Valid input "${input}" was rejected!`);
             process.exit(1);
        }
    });
    console.log("✅ PASS: addHighlightTag correctly rejected malicious/invalid inputs.");

    console.log("--- Test 5: Auth Guards in Actions ---");
    let fetchCalled = false;
    sandbox.fetch = () => {
        fetchCalled = true;
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) });
    };

    sandbox.authToken = null;
    await sandbox.loadMenuDataFromAPI();
    if (fetchCalled) {
        console.error("❌ FAIL: loadMenuDataFromAPI attempted fetch without token!");
        process.exit(1);
    }
    
    fetchCalled = false;
    await sandbox.refreshFlaggedItems();
    if (fetchCalled) {
        console.error("❌ FAIL: refreshFlaggedItems attempted fetch without token!");
        process.exit(1);
    }
    console.log("✅ PASS: Auth guards prevented unauthenticated API calls.");

    console.log("\n✨ ALL SECURITY TESTS PASSED! ✨");
}

runTests().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
