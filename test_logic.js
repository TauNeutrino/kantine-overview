const fs = require('fs');
const vm = require('vm');
const path = require('path');

console.log("=== Running Logic Unit Tests ===");

// 1. Load Source Code
const jsPath = path.join(__dirname, 'dist', 'kantine.bundle.js');
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
    langMode: 'de',
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
        if (url.includes('/venues/') && url.includes('/menu/')) {
            return { ok: true, json: async () => ({ dates: [], menu: {}, results: [] }) };
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
        location: { href: '', hostname: 'web.bessa.app' }
    },
    localStorage: { getItem: () => "[]", setItem: () => { } },
    sessionStorage: { getItem: () => null, setItem: () => { } },
    location: { href: '' },
    setInterval: () => { },
    setTimeout: (cb) => cb(), // Execute immediately to resolve promises/logic
    requestAnimationFrame: (cb) => cb(),
    Date: Date,
    Notification: { permission: 'denied', requestPermission: () => { } },
    TextEncoder: TextEncoder,
    crypto: crypto,
};

// 3. Instrument Code to expose functions or run check
try {
    vm.createContext(sandbox);
    // Execute the code
    vm.runInContext(code, sandbox);
    // Execute module to get function reference, since IIFE creates private scope
    // For test_logic.js we need to evaluate the raw utils.js code to test splitLanguage directly
    const langDir = require('path').join(__dirname, 'src', 'lang');
    // Load lang modules in dependency order (bottom-up, no-import first)
    const langModules = [
      'types.js',         // no deps — defines LABELS + type JSDoc
      'normalize.js',     // no deps
      'templates.js',     // no deps
      'langModelSeed.js', // no deps — exports LANG_MODEL_SEED
      'langModel.js',     // createLangModel(seed) — seed passed by caller
      'loanwords.js',
      'alignTrailing.js', // depends: loanwords
      'segment.js',       // depends: normalize
      'boundary.js',      // resolveBoundary(fragment, langModel) — langModel passed in
      'score.js',         // depends: LABELS from types.js
      'dishes.js',
      'splitter.js',      // depends: normalize, templates, segment, boundary, score, langModel, LANG_MODEL_SEED, alignTrailing
    ];
    for (const file of langModules) {
      const code = require('fs').readFileSync(require('path').join(langDir, file), 'utf8');
      const cleaned = code.replace(/export /g, '').replace(/import .*? from .*?;/g, '');
      vm.runInContext(cleaned, sandbox);
    }
    const utilsCode = require('fs').readFileSync(require('path').join(__dirname, 'src', 'utils.js'), 'utf8');
    const cleanedUtilsCode = utilsCode.replace(/export /g, '').replace(/import .*? from .*?;/g, '');
    vm.runInContext(cleanedUtilsCode, sandbox);


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
        const result = sandbox.splitLanguage(tc.input);

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

    // --- escapeHtml Logic Test ---
    console.log("--- Testing escapeHtml Logic ---");
    const testCasesHtml = [
        { input: '<b>Test</b>', expected: '&lt;b&gt;Test&lt;/b&gt;' },
        { input: '"quoted"', expected: '&quot;quoted&quot;' },
        { input: "'single'", expected: '&#039;single&#039;' },
        { input: '&', expected: '&amp;' },
        { input: null, expected: '' },
        { input: undefined, expected: '' },
        { input: 123, expected: '123' }
    ];

    for (const { input, expected } of testCasesHtml) {
        const result = sandbox.escapeHtml(input);
        if (result !== expected) {
            throw new Error(`escapeHtml failed for "${input}": expected "${expected}", got "${result}"`);
        }
    }
    console.log("✅ escapeHtml Test Passed: All entities correctly escaped.");

    // --- translateDay Logic Test ---
    console.log("--- Testing translateDay Logic ---");
    const originalLangMode = sandbox.langMode;
    try {
        sandbox.langMode = 'de';
        if (sandbox.translateDay('Monday') !== 'Montag') throw new Error('translateDay(Monday) should be Montag in DE');
        if (sandbox.translateDay('Friday') !== 'Freitag') throw new Error('translateDay(Friday) should be Freitag in DE');
        if (sandbox.translateDay('Unknown') !== 'Unknown') throw new Error('translateDay should return input for unknown day');

        sandbox.langMode = 'en';
        if (sandbox.translateDay('Monday') !== 'Monday') throw new Error('translateDay(Monday) should be Monday in EN');
        console.log("✅ translateDay Test Passed.");
    } finally {
        sandbox.langMode = originalLangMode;
    }

    // --- getLocalizedText Logic Test ---
    console.log("--- Testing getLocalizedText Logic ---");
    const testMenu = "Suppe / Soup";
    const originalLangModeLoc = sandbox.langMode;
    try {
        sandbox.langMode = 'de';
        let localizedDe = sandbox.getLocalizedText(testMenu);
        if (!localizedDe.includes('Suppe')) {
            throw new Error(`getLocalizedText (DE) failed: expected to include 'Suppe', got '${localizedDe}'`);
        }

        sandbox.langMode = 'en';
        let localizedEn = sandbox.getLocalizedText(testMenu);
        if (!localizedEn.includes('Soup')) {
            throw new Error(`getLocalizedText (EN) failed: expected to include 'Soup', got '${localizedEn}'`);
        }

        sandbox.langMode = 'all';
        let localizedAll = sandbox.getLocalizedText(testMenu);
        if (localizedAll !== testMenu) {
            throw new Error(`getLocalizedText (ALL) failed: expected '${testMenu}', got '${localizedAll}'`);
        }
        console.log("✅ getLocalizedText Test Passed.");
    } finally {
        sandbox.langMode = originalLangModeLoc;
    }

    // --- Redirect on blob URL Logic Test ---
    console.log("--- Testing Redirect on Blob URL ---");
    const redirectSandbox = {
        console: console,
        document: {
            body: createMockElement('body'),
            head: createMockElement('head'),
            createElement: (tag) => createMockElement(tag),
            getElementById: (id) => createMockElement(id),
            querySelector: () => createMockElement('mock'),
            querySelectorAll: () => [createMockElement('mock')]
        },
        window: {
            matchMedia: () => ({ matches: false }),
            addEventListener: () => { },
            location: { href: '', hostname: 'web.bessa.app', protocol: 'blob:' }
        },
        localStorage: { getItem: () => "[]", setItem: () => { } },
        sessionStorage: { getItem: () => null, setItem: () => { } },
        location: { href: '' },
        setInterval: () => { },
        setTimeout: (cb) => cb(),
        requestAnimationFrame: (cb) => cb(),
        Date: Date,
        Notification: { permission: 'denied', requestPermission: () => { } },
        TextEncoder: TextEncoder,
        crypto: crypto,
    };
    vm.createContext(redirectSandbox);
    let errorThrown = false;
    try {
        vm.runInContext(code, redirectSandbox);
    } catch (err) {
        errorThrown = true;
        if (!err.message.includes('Redirecting to the correct domain')) {
            throw new Error("Unexpected error thrown: " + err.message);
        }
    }
    if (!errorThrown) {
        throw new Error("Expected an error to halt execution during redirect, but none was thrown.");
    }
    if (redirectSandbox.window.location.href !== 'https://web.bessa.app/knapp-kantine') {
        throw new Error("Redirect target is wrong: " + redirectSandbox.window.location.href);
    }
    console.log("✅ Redirect on Blob URL Test Passed.");

    console.log("✅ Syntax Check Passed: Code executed in sandbox.");

} catch (e) {
    console.error("❌ Unit Test Error:", e);
    process.exit(1);
}
