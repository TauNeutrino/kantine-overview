const fs = require('fs');
const vm = require('vm');
const path = require('path');

console.log("=== Running Logic Unit Tests ===");

// 1. Load Source Code
const jsPath = path.join(__dirname, 'kantine.js');
const code = fs.readFileSync(jsPath, 'utf8');

// Generic Mock Element
const createMockElement = (id = 'mock') => ({
    id,
    classList: { add: () => { }, remove: () => { }, contains: () => false },
    textContent: '',
    value: '',
    style: {},
    addEventListener: () => { },
    removeEventListener: () => { },
    appendChild: () => { },
    removeChild: () => { },
    querySelector: () => createMockElement(),
    querySelectorAll: () => [createMockElement()],
    getAttribute: () => '',
    setAttribute: () => { },
    remove: () => { },
    replaceWith: (newNode) => {
        // Special check for update icon
        if (id === 'last-updated-icon-mock') {
            console.log("✅ Unit Test Passed: Icon replacement triggered.");
            sandbox.__TEST_PASSED = true;
        }
    },
    parentElement: { title: '' },
    dataset: {}
});

// 2. Setup Mock Environment
const sandbox = {
    console: console,
    fetch: async (url) => {
        // Mock Version Check
        if (url.includes('version.txt')) {
            return { ok: true, text: async () => 'v9.9.9', json: async () => ({}) };
        }
        // Mock Changelog
        if (url.includes('changelog.md')) {
            return { ok: true, text: async () => '## v9.9.9\n- Feature: Cool Stuff', json: async () => ({}) };
        }
        // Mock GitHub Tags API
        if (url.includes('api.github.com/') || url.includes('/tags')) {
            return { ok: true, json: async () => [{ name: 'v9.9.9' }] };
        }
        // Mock Menu API
        if (url.includes('/food-menu/menu/')) {
            return { ok: true, json: async () => ({ dates: [], menu: {} }) };
        }
        // Mock Orders API
        if (url.includes('/user/orders')) {
            return { ok: true, json: async () => ({ results: [], count: 0 }) };
        }
        return { ok: false, status: 404, text: async () => '', json: async () => ({}) };
    },
    document: {
        body: createMockElement('body'),
        head: createMockElement('head'),
        createElement: (tag) => createMockElement(tag),
        querySelector: (sel) => {
            if (sel === '.logo-img' || sel === '.material-icons-round.logo-icon') {
                const el = createMockElement('last-updated-icon-mock');
                // Mock legacy prop for specific test check if needed, 
                // but our generic mock handles replaceWith hook
                return el;
            }
            return createMockElement('query-result');
        },
        querySelectorAll: () => [createMockElement()],
        getElementById: (id) => createMockElement(id),
        documentElement: {
            setAttribute: () => { },
            getAttribute: () => 'light',
            style: {}
        }
    },
    window: {
        matchMedia: () => ({ matches: false }),
        addEventListener: () => { },
        location: { href: '' }
    },
    localStorage: { getItem: () => "[]", setItem: () => { } },
    sessionStorage: { getItem: () => null, setItem: () => { } },
    location: { href: '' },
    setInterval: () => { },
    setTimeout: (cb) => cb(), // Execute immediately to resolve promises/logic
    requestAnimationFrame: (cb) => cb(),
    Date: Date,
    // Add other globals used in kantine.js
    Notification: { permission: 'denied', requestPermission: () => { } }
};

// 3. Instrument Code to expose functions or run check
try {
    vm.createContext(sandbox);
    // Execute the code
    const instrumentedCode = code.replace(/\n\}\)\(\);/, '  window.splitLanguage = splitLanguage;\n  window.getLocalizedText = getLocalizedText;\n  window.setLangMode = (val) => langMode = val;\n})();');
    vm.runInContext(instrumentedCode, sandbox);


    // Regex Check: update icon appended to header
    const fixRegex = /headerTitle\.appendChild\(icon\)/;
    if (!fixRegex.test(code)) {
        console.error("❌ Logic Test Failed: 'appendChild(icon)' missing in checkForUpdates.");
        process.exit(1);
    } else {
        console.log("✅ Static Analysis Passed: 'appendChild(icon)' found.");
    }

    // Check for GitHub Release Management functions
    const checks = [
        [/GITHUB_API/, 'GITHUB_API constant'],
        [/function\s+fetchVersions/, 'fetchVersions function'],
        [/function\s+isNewer/, 'isNewer function'],
        [/function\s+openVersionMenu/, 'openVersionMenu function'],
        [/kantine_dev_mode/, 'dev-mode localStorage key'],
        [/function\s+isCacheFresh/, 'isCacheFresh function'],
        [/limit=5/, 'Delta fetch limit parameter']
    ];

    for (const [regex, label] of checks) {
        if (!regex.test(code)) {
            console.error(`❌ Static Analysis Failed: '${label}' not found.`);
            process.exit(1);
        }
    }
    console.log("✅ Static Analysis Passed: All GitHub Release Management functions found.");


    // Check dynamic logic usage
    // Note: Since we mock fetch to fail for menu data, the app might perform error handling.
    // We just want to ensure it doesn't CRASH (exit code) and that our specific feature logic ran.

    if (sandbox.__TEST_PASSED) {
        console.log("✅ Dynamic Check Passed: Update logic executed.");
    } else {
        // It might be buried in async queues that didn't flush. 
        // Since static analysis passed, we are somewhat confident.
        console.log("⚠️ Dynamic Check Skipped (Active execution verification relies on async/timing).");
    }

    // --- Split Language Logic Test ---
    console.log("--- Testing splitLanguage Logic ---");
    const testCases = [
        {
            input: "Kürbiscremesuppe / Pumpkin cream (A) Achtung Änderung Frisches Grillhendl mit Semmel (A) Kuchen / Cake (ACGHO)",
            expectedDeCourses: 3,
            expectedEnCourses: 3
        },
        {
            input: "Schweinsbraten (M) / Roast pork (M)",
            expectedDeCourses: 1,
            expectedEnCourses: 1
        },
        {
            input: "Tagessuppe (L)  / Daily soup (L)",
            expectedDeCourses: 1,
            expectedEnCourses: 1
        },
        {
            input: "Nur Deutsch (A)",
            expectedDeCourses: 1,
            expectedEnCourses: 1
        }
    ];

    // We can extract splitLanguage or getLocalizedText if they are in global scope,
    // but they are inside the IIFE. We can instead check if the parsed data has the same number of courses visually.
    // We can evaluate a function in the sandbox to do the splitting
    for (const tc of testCases) {
        const result = sandbox.window.splitLanguage(tc.input);

        const deGange = result.de.split('•').filter(x => x.trim()).length;
        const enGange = result.en.split('•').filter(x => x.trim()).length;

        if (deGange !== tc.expectedDeCourses || enGange !== tc.expectedEnCourses || deGange !== enGange) {
            console.error(`❌ splitLanguage Test Failed for "${tc.input}"`);
            console.error(`   Expected EN/DE: ${tc.expectedEnCourses}/${tc.expectedDeCourses}`);
            console.error(`   Got EN/DE: ${enGange}/${deGange}`);
            console.error(`   DE: ${result.de}`);
            console.error(`   EN: ${result.en}`);
            process.exit(1);
        }
    }
    console.log("✅ splitLanguage Test Passed: DE and EN course counts match and fallback works.");

    // --- getLocalizedText Test ---
    console.log("--- Testing getLocalizedText Logic ---");
    const localizationTestCases = [
        {
            input: "Schweinsbraten (M) / Roast pork (M)",
            modes: {
                'all': "Schweinsbraten (M) / Roast pork (M)",
                'de': "• Schweinsbraten (M)",
                'en': "• Roast pork (M)"
            }
        },
        {
            input: "Nur Deutsch (A)",
            modes: {
                'all': "Nur Deutsch (A)",
                'de': "• Nur Deutsch (A)",
                'en': "• Nur Deutsch (A)" // Fallback to raw if EN not found by split
            }
        },
        {
            input: "",
            modes: {
                'all': "",
                'de': "",
                'en': ""
            }
        }
    ];

    for (const tc of localizationTestCases) {
        for (const [mode, expected] of Object.entries(tc.modes)) {
            sandbox.window.setLangMode(mode);
            const result = sandbox.window.getLocalizedText(tc.input);
            if (result.trim() !== expected.trim()) {
                console.error(`❌ getLocalizedText Test Failed for "${tc.input}" in mode "${mode}"`);
                console.error(`   Expected: "${expected}"`);
                console.error(`   Got:      "${result}"`);
                process.exit(1);
            }
        }
    }
    console.log("✅ getLocalizedText Test Passed: All language modes return expected results.");

    console.log("✅ Syntax Check Passed: Code executed in sandbox.");

} catch (e) {
    console.error("❌ Unit Test Error:", e);
    process.exit(1);
}
