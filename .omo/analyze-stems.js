const fs = require('fs');
const vm = require('vm');
const path = require('path');

// Load test data
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tests', 'test_kantine_menuCache.json'), 'utf8'));

// Load utils.js source
const utilsCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'utils.js'), 'utf8');

// Build sandbox with arrays exposed via var
const code = utilsCode
    .replace(/export /g, '')
    .replace(/import .*? from .*?;/g, '')
    // Expose stem arrays as var so they leak to sandbox
    .replace('const DE_STEMS =', 'var DE_STEMS =')
    .replace('const EN_STEMS =', 'var EN_STEMS =')
    .replace('const BOTH_SET =', 'var BOTH_SET =')
    .replace('const DE_SET =', 'var DE_SET =')
    .replace('const EN_SET =', 'var EN_SET =');

const sandbox = {
    console: console,
    langMode: 'de',
    document: { createElement: (tag) => ({ tag, textContent: '' }) },
    Date: Date,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
};
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

// Now sandbox.DE_STEMS etc. are accessible
const DE_STEMS = sandbox.DE_STEMS || [];
const EN_STEMS = sandbox.EN_STEMS || [];
const BOTH_SET = sandbox.BOTH_SET || [];
const DE_SET = sandbox.DE_SET || new Set();
const EN_SET = sandbox.EN_SET || new Set();

console.log(`DE_STEMS: ${DE_STEMS.length} entries`);
console.log(`EN_STEMS: ${EN_STEMS.length} entries`);
console.log(`BOTH_SET: ${BOTH_SET.size} entries`);
console.log('');

// Collect all unique words from descriptions
const wordCounts = {};
const allItems = [];
data.forEach(week => {
    week.days.forEach(day => {
        day.items.forEach(item => {
            if (item.description) allItems.push(item);
        });
    });
});

allItems.forEach(item => {
    // Extract words: lowercase, 3+ chars, alpha (including umlauts)
    const words = item.description.toLowerCase().match(/\b[a-zäöüß]{3,}\b/g) || [];
    const unique = new Set(words);
    unique.forEach(w => {
        if (!wordCounts[w]) wordCounts[w] = 0;
        wordCounts[w]++;
    });
});

// Check each word against stem sets
// For DE_SET/EN_SET we need to check using the same logic as splitLanguage
function isInDESet(word) {
    if (DE_SET.has(word)) return true;
    // Check via regex
    for (const stem of DE_STEMS) {
        if (word.includes(stem) && stem.length >= 3) return true;
    }
    return false;
}

function isInENSet(word) {
    if (EN_SET.has(word)) return true;
    for (const stem of EN_STEMS) {
        if (word.includes(stem) && stem.length >= 3) return true;
    }
    return false;
}

const missing = [];
Object.entries(wordCounts).forEach(([word, count]) => {
    const inDE = isInDESet(word);
    const inEN = isInENSet(word);
    const inBoth = BOTH_SET.has(word);
    if (!inDE && !inEN) {
        missing.push({ word, count });
    }
});

// Sort by frequency
missing.sort((a, b) => b.count - a.count);

// Manual classification aids
function likelyDeWord(word) {
    return /[äöüß]/.test(word) || 
           /(chen|lein|ung|keit|heit|schaft|tum|nis|ling|sal|sel|ling)$/.test(word) ||
           /(lich|ig|bar|sam|haft|los)$/.test(word) ||
           /^(be|ge|ver|zer|ent|er|miss)[a-z]/.test(word);
}

function likelyEnWord(word) {
    return /(ing|ed|tion|sion|ness|ment|ity|ful|less|ly|ize|ify|able|ible)$/.test(word) ||
           /^(a|be|co|de|dis|en|ex|im|in|mis|non|out|over|pre|re|sub|un|under)/.test(word);
}

const deCandidates = [];
const enCandidates = [];
const unclear = [];

missing.forEach(({ word, count }) => {
    // Skip allergen codes, single letters, and obviously irrelevant words
    if (word.length <= 2) return;
    if (/^[a-z]+$/.test(word) && !/[äöüß]/.test(word)) {
        // All ASCII - likely English
        enCandidates.push({ word, count });
    } else if (/[äöüß]/.test(word)) {
        // Has umlauts - likely German
        deCandidates.push({ word, count });
    } else {
        unclear.push({ word, count });
    }
});

console.log(`=== Words NOT in any stem list (sorted by frequency) ===\n`);

console.log(`--- German-looking (${deCandidates.length}) ---`);
deCandidates.slice(0, 30).forEach(c => console.log(`  ${c.word} (${c.count}x)`));

console.log(`\n--- English-looking (${enCandidates.length}) ---`);
enCandidates.slice(0, 50).forEach(c => console.log(`  ${c.word} (${c.count}x)`));

console.log(`\n--- Unclear (${unclear.length}) ---`);
unclear.slice(0, 20).forEach(c => console.log(`  ${c.word} (${c.count}x)`));

console.log(`\n=== Top-20 Most Important DE_STEMS Additions ===`);
console.log('(words NOT in DE_SET that contain umlauts or Austrian/German suffix)');
deCandidates.slice(0, 20).forEach(c => {
    // Check if already covered by a partial stem match
    const covered = DE_STEMS.some(s => s.length >= 3 && c.word.includes(s));
    console.log(`  ${c.word} (${c.count}x) ${covered ? '⚠️ partial' : 'new'}`);
});

console.log(`\n=== Top-30 Most Important EN_STEMS Additions ===`);
console.log('(high-frequency words NOT in EN_SET)');
enCandidates.slice(0, 30).forEach(c => {
    const covered = EN_STEMS.some(s => s.length >= 3 && c.word.includes(s));
    console.log(`  ${c.word} (${c.count}x) ${covered ? '⚠️ partial' : 'new'}`);
});

// Also print total stats
console.log(`\n=== Stats ===`);
console.log(`Unique words in descriptions: ${Object.keys(wordCounts).length}`);
console.log(`Words in DE_STEMS: ${DE_STEMS.length}`);
console.log(`Words in EN_STEMS: ${EN_STEMS.length}`);
console.log(`Words in BOTH_SET: ${BOTH_SET.size}`);
console.log(`Words not in any list: ${missing.length}`);
