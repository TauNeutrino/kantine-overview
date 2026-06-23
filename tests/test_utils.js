const fs = require('fs');
const vm = require('vm');
const path = require('path');

console.log("=== Running Utility Unit Tests ===");

// 1. Setup Mock Environment
const sandbox = {
    console: console,
    langMode: 'de',
    document: {
        createElement: (tag) => ({
            tag,
            textContent: '',
            get innerHTML() {
                // Basic mock of textContent to innerHTML escaping
                return this.textContent
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
            }
        })
    },
    Date: Date,
    setTimeout: (cb, ms) => {
        return 1; // Return a dummy timeout ID
    },
    clearTimeout: () => {}
};

// 2. Load Source Code
const utilsPath = path.join(__dirname, '..', 'src', 'utils.js');
const utilsCode = fs.readFileSync(utilsPath, 'utf8');

// Load lang modules
function cleanSrc(src) {
  return src.replace(/export {.*?}.*?;/g, '')
            .replace(/export /g,'')
            .replace(/import .*? from .*?;/g,'')
            .replace(/^(const|let) /gm,'var ');
}

const langCode = 
  cleanSrc(fs.readFileSync(path.join(__dirname, '..', 'src/lang/types.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(__dirname, '..', 'src/lang/normalize.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(__dirname, '..', 'src/lang/templates.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(__dirname, '..', 'src/lang/langModel.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(__dirname, '..', 'src/lang/langModelSeed.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(__dirname, '..', 'src/lang/segment.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(__dirname, '..', 'src/lang/boundary.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(__dirname, '..', 'src/lang/score.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(__dirname, '..', 'src/lang/splitter.js'),'utf8'));

// Strip exports and imports for vm
const cleanedUtilsCode = langCode + '\n' + utilsCode
    .replace(/export {.*?}.*?;/g, '')
    .replace(/export /g, '')
    .replace(/import .*? from .*?;/g, '');

vm.createContext(sandbox);
vm.runInContext(cleanedUtilsCode, sandbox);

function assert(condition, message) {
    if (!condition) {
        console.error("❌ Assertion Failed: " + message);
        process.exit(1);
    }
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        console.error(`❌ Assertion Failed: ${message}`);
        console.error(`   Expected: ${JSON.stringify(expected)}`);
        console.error(`   Actual:   ${JSON.stringify(actual)}`);
        process.exit(1);
    }
}

// --- Test getISOWeek ---
console.log("Testing getISOWeek...");
assertEquals(sandbox.getISOWeek(new Date('2023-01-01')), 52, "2023-01-01 should be week 52 of 2022 (ISO)");
assertEquals(sandbox.getISOWeek(new Date('2023-01-02')), 1, "2023-01-02 should be week 1 of 2023");

// --- Test getWeekYear ---
console.log("Testing getWeekYear...");
assertEquals(sandbox.getWeekYear(new Date('2023-01-01')), 2022, "2023-01-01 should be year 2022 (ISO)");

// --- Test translateDay ---
console.log("Testing translateDay...");
sandbox.langMode = 'de';
assertEquals(sandbox.translateDay('Monday'), 'Montag', "Monday -> Montag (DE)");
sandbox.langMode = 'en';
assertEquals(sandbox.translateDay('Monday'), 'Monday', "Monday -> Monday (EN)");

// --- Test escapeHtml ---
console.log("Testing escapeHtml...");
assertEquals(sandbox.escapeHtml('<b>Hi</b> & "bye"'), '&lt;b&gt;Hi&lt;/b&gt; &amp; &quot;bye&quot;', "HTML escaping");

// --- Test isNewer ---
console.log("Testing isNewer...");
assert(sandbox.isNewer('v1.2.0', 'v1.1.9'), "v1.2.0 > v1.1.9");
assert(!sandbox.isNewer('v1.1.9', 'v1.2.0'), "v1.1.9 < v1.2.0");
assert(!sandbox.isNewer('1.1.0', '1.1.0'), "Same version");
assert(sandbox.isNewer('v2.0.0', 'v1.9.9'), "v2 > v1");

// --- Test getRelativeTime ---
console.log("Testing getRelativeTime...");
const now = Date.now();
assertEquals(sandbox.getRelativeTime(new Date(now - 30000)), 'gerade eben', "Recent");
assertEquals(sandbox.getRelativeTime(new Date(now - 65000)), 'vor 1 min.', "1 min ago");
assertEquals(sandbox.getRelativeTime(new Date(now - 3600000)), 'vor 1 Std.', "1 hour ago");

// --- Test splitLanguage ---
console.log("Testing splitLanguage...");

// Helper to count bullets
const countCourses = (str) => str.split('•').filter(x => x.trim()).length;

const testCases = [
    {
        name: "Empty input",
        input: "",
        expected: { de: '', en: '', raw: '' }
    },
    {
        name: "German only",
        input: "Schnitzel",
        expected: { de: '• Schnitzel', en: '• Schnitzel' }
    },
    {
        name: "Standard slash split",
        input: "Suppe / Soup",
        expected: { de: '• Suppe', en: '• Soup' }
    },
    {
        name: "Slash split with allergens",
        input: "Suppe (A,C) / Soup (A,C)",
        expected: { de: '• Suppe (A,C)', en: '• Soup (A,C)' }
    },
    {
        name: "Heuristic split (English first)",
        input: "Soup Suppe",
        expected: { de: '• Suppe', en: '• Soup' }
    },
    {
        name: "Multi-course with slashes",
        input: "Suppe / Soup (A) Gulasch / Goulash (B)",
        expectedDeCourses: 2,
        expectedEnCourses: 2
    },
    {
        name: "Complex case from real data",
        input: "Kürbiscremesuppe / Pumpkin cream (A) Achtung Änderung Frisches Grillhendl mit Semmel (A) Kuchen / Cake (ACGHO)",
        expectedDeCourses: 3,
        expectedEnCourses: 3
    },
    {
        name: "Unpaired last segment (M6: Suppe/Soup Salat/Salad + Dessert)",
        input: "Suppe / Soup Salat / Salad Dessert",
        expectedDeCourses: 3,
        expectedEnCourses: 3
    }
];

testCases.forEach(tc => {
    const res = sandbox.splitLanguage(tc.input);
    if (tc.expected) {
        if (tc.expected.de !== undefined) assertEquals(res.de, tc.expected.de, `${tc.name} (DE)`);
        if (tc.expected.en !== undefined) assertEquals(res.en, tc.expected.en, `${tc.name} (EN)`);
    }
    if (tc.expectedDeCourses !== undefined) assertEquals(countCourses(res.de), tc.expectedDeCourses, `${tc.name} (DE count)`);
    if (tc.expectedEnCourses !== undefined) assertEquals(countCourses(res.en), tc.expectedEnCourses, `${tc.name} (EN count)`);
});

// --- Edge case: false-split regression tests ---
console.log("Testing false-split prevention...");

// Pure German should stay together, not get split by heuristic
const pureGerman = sandbox.splitLanguage("Schnitzel mit Pommes");
assertEquals(pureGerman.de, '• Schnitzel mit Pommes', "Pure German stays together (DE)");
assertEquals(pureGerman.en, '• Schnitzel mit Pommes', "Pure German stays together (EN)");

// Pure English should NOT trigger a German split
const pureEnglish = sandbox.splitLanguage("Chicken Curry with Rice");
assertEquals(pureEnglish.de, '• Chicken Curry with Rice', "Pure English stays together (DE)");
assertEquals(pureEnglish.en, '• Chicken Curry with Rice', "Pure English stays together (EN)");

// International loan words should not cause false splits
const mixedLoan = sandbox.splitLanguage("Currywurst mit Pommes");
assertEquals(mixedLoan.de, '• Currywurst mit Pommes', "International loan words kept together (DE)");
assertEquals(mixedLoan.en, '• Currywurst mit Pommes', "International loan words kept together (EN)");

// English word that looks capitalized but is clearly English
const englishOnly = sandbox.splitLanguage("Grilled Chicken Salad");
assertEquals(englishOnly.de, '• Grilled Chicken Salad', "English only not split (DE)");
assertEquals(englishOnly.en, '• Grilled Chicken Salad', "English only not split (EN)");

// Multi-course pure German (regression test)
const multiGerman = sandbox.splitLanguage("Schnitzel (A) Pommes (B) Salat (C)");
assertEquals(multiGerman.de, '• Schnitzel (A)\n• Pommes (B)\n• Salat (C)', "Multi-course pure German (DE)");
assertEquals(multiGerman.en, '• Schnitzel (A)\n• Pommes (B)\n• Salat (C)', "Multi-course pure German (EN)");

// NEW: Broken allergen repair preserved through pipeline
const brokenAllergen = sandbox.splitLanguage("Beef soup with egg pancakes/ACLM) Main dish(G)");
assert(brokenAllergen.de.includes('(ACLM)'), "Broken allergen repaired in de output");
assert(!brokenAllergen.de.includes('/ACLM)'), "Broken slash-allergen gone from de output");

// NEW: Non-allergen paren preserved
const stroganoff = sandbox.splitLanguage("Boeuf Stroganoff(Beef) mit Spätzle / Beef stroganoff with spaetzle(ACGLM)");
assert(stroganoff.de.includes('(Beef)'), "Non-allergen paren preserved in de");

// NEW: Note parking — note not in course text
const withNote = sandbox.splitLanguage("Kürbiscremesuppe / Pumpkin cream Achtung Änderung Grillhendl (A)");
assert(!withNote.de.includes('Achtung Änderung') || withNote.notes.length > 0, "Note parked or absent from de");

// --- Test getLocalizedText ---
console.log("Testing getLocalizedText...");
const menu = "Pizza / Pizza";
sandbox.langMode = 'de';
assertEquals(sandbox.getLocalizedText(menu), '• Pizza', "Localized DE");
sandbox.langMode = 'en';
assertEquals(sandbox.getLocalizedText(menu), '• Pizza', "Localized EN");
sandbox.langMode = 'all';
assertEquals(sandbox.getLocalizedText(menu), menu, "Localized ALL (raw)");

// --- Test debounce ---
console.log("Testing debounce...");
let callCount = 0;
let timeoutCallback = null;
sandbox.setTimeout = (cb, ms) => {
    timeoutCallback = cb;
    return 1;
};
const debounced = sandbox.debounce(() => { callCount++; }, 10);
debounced();
debounced();
if (timeoutCallback) timeoutCallback();
assertEquals(callCount, 1, "Debounce should only call the function once after multiple calls");

console.log("✅ All Utility Unit Tests Passed!");
