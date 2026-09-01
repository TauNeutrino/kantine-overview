const fs = require('fs');
const vm = require('vm');
const path = require('path');

console.log("=== Running Image Search Unit Tests: query derivation ===");

// 1. Setup Mock Environment
// image_search.js (Part 1) is pure: no DOM, no network, no storage needed.
// Console is mocked (forwards to the real one) per the vm-sandbox harness rules.
const sandbox = {
    console: {
        log: (...args) => console.log(...args),
        warn: (...args) => console.warn(...args),
        error: (...args) => console.error(...args)
    }
};

// 2. Load Source Code
const sourcePath = path.join(__dirname, '..', 'src', 'image_search.js');
let sourceCode = fs.readFileSync(sourcePath, 'utf8');

// Strip ES6 imports/exports (same cleaning as tests/test_actions.js)
const cleanedSourceCode = sourceCode
    .replace(/^import\s+[\s\S]*?from\s+['"].*?['"];?/gm, '')
    .replace(/\bexport\s+/g, '');

vm.createContext(sandbox);
try {
    vm.runInContext(cleanedSourceCode, sandbox);
} catch (e) {
    console.error("Error loading image_search.js in sandbox:", e);
    process.exit(1);
}

const { getMainCourseLine, sanitizeDishQuery, buildGoogleImageUrl } = sandbox;

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

// === getMainCourseLine ===

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
assertEquals(main, null, "label 'medium' must not produce a link target");
ok("getMainCourseLine: label 'medium' returns null");

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

// === sanitizeDishQuery ===

// Case 7: allergen brackets removed
assertEquals(sanitizeDishQuery('Schweinsbraten mit Knödel (A, C)'), 'Schweinsbraten mit Knödel', "allergen brackets '(A, C)' should be removed");
ok("sanitizeDishQuery: 'Schweinsbraten mit Knödel (A, C)' -> 'Schweinsbraten mit Knödel'");

// Case 8: prices removed
assertEquals(sanitizeDishQuery('Tagessuppe 4,50 €'), 'Tagessuppe', "price '4,50 €' should be removed");
ok("sanitizeDishQuery: 'Tagessuppe 4,50 €' -> 'Tagessuppe'");

// Case 9: result shorter than 3 chars -> null
assertEquals(sanitizeDishQuery('ab'), null, "query shorter than 3 chars must return null");
ok("sanitizeDishQuery: 'ab' -> null");

// === buildGoogleImageUrl ===

// Case 10: encodeURIComponent + udm=2, no other parameters
const url = buildGoogleImageUrl('Wiener Schnitzel');
assertEquals(url.startsWith('https://www.google.com/search?q='), true, "URL should start with the Google search prefix");
assertEquals(url.includes('Wiener%20Schnitzel'), true, "query should be encodeURIComponent-ed (space -> %20)");
assertEquals(url.endsWith('&udm=2'), true, "URL should end with &udm=2");
assertEquals(url, 'https://www.google.com/search?q=Wiener%20Schnitzel&udm=2', "URL should contain no parameters besides q and udm=2");
ok("buildGoogleImageUrl: 'Wiener Schnitzel' -> encoded URL ending in &udm=2");

console.log("✅ Image Search Query Derivation Unit Tests Passed!");
process.exit(0);
