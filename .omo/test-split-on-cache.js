const fs = require('fs');
const vm = require('vm');
const path = require('path');

// 1. Load test data
const cachePath = path.join(__dirname, '..', 'tests', 'test_kantine_menuCache.json');
const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

// 2. Load utils.js
const utilsPath = path.join(__dirname, '..', 'src', 'utils.js');
const utilsCode = fs.readFileSync(utilsPath, 'utf8');

const sandbox = {
    console: console,
    langMode: 'de',
    document: { createElement: (tag) => ({ tag, textContent: '' }) },
    Date: Date,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
};
const cleanedUtilsCode = utilsCode.replace(/export /g, '').replace(/import .*? from .*?;/g, '');
vm.createContext(sandbox);
vm.runInContext(cleanedUtilsCode, sandbox);

// Extract the stem sets from the sandbox
const DE_STEMS = sandbox.DE_STEMS || [];
const EN_STEMS = sandbox.EN_STEMS || [];
const BOTH_SET = sandbox.BOTH_SET || [];
const MIN_SPLIT_CONFIDENCE = sandbox.MIN_SPLIT_CONFIDENCE || 1.5;

// 3. Collect all unique descriptions
const descriptions = new Set();
const itemNames = new Set();

data.forEach(week => {
    week.days.forEach(day => {
        day.items.forEach(item => {
            if (item.description) descriptions.add(item.description);
            if (item.name) itemNames.add(item.name);
        });
    });
});

console.log(`Loaded ${data.length} weeks, ${descriptions.size} unique descriptions, ${itemNames.size} unique names`);
console.log(`DE_STEMS: ${DE_STEMS.length} entries, EN_STEMS: ${EN_STEMS.length} entries, BOTH_SET: ${BOTH_SET.length} entries`);
console.log(`MIN_SPLIT_CONFIDENCE: ${MIN_SPLIT_CONFIDENCE}`);
console.log('');

// 4. Run splitLanguage on every description
let errors = 0;
let warnings = 0;
const splitResults = {};
const allWords = {};
const deWords = {};
const enWords = {};

// Helper: extract unique words (lowercased, >= 3 chars, alpha only)
function extractWords(text) {
    const words = text.toLowerCase().match(/\b[a-zäöüß]{3,}\b/g) || [];
    return new Set(words);
}

// Helper: check if description has slashes (already pre-split)
function hasSlashes(text) {
    return text.includes(' / ');
}

// Track which stem lists each word is in
const wordInStem = {};

function checkWordLists(word) {
    const inDE = DE_STEMS.includes(word);
    const inEN = EN_STEMS.includes(word);
    const inBoth = BOTH_SET.includes(word);
    return { inDE, inEN, inBoth };
}

console.log('=== Split Results ===');
console.log('');

const allItems = [];
data.forEach(week => {
    week.days.forEach(day => {
        day.items.forEach(item => {
            allItems.push({ name: item.name, description: item.description });
        });
    });
});

// Track words that appear in descriptions across all items
const wordCounts = {};

allItems.forEach(item => {
    if (!item.description) return;
    const result = sandbox.splitLanguage(item.description);
    const baseKey = item.description.substring(0, 80) + (item.description.length > 80 ? '...' : '');
    
    if (!splitResults[item.description]) {
        splitResults[item.description] = { result, count: 0, names: new Set() };
    }
    splitResults[item.description].count++;
    splitResults[item.description].names.add(item.name);
    
    // Collect words from raw description
    const rawWords = extractWords(item.description);
    rawWords.forEach(w => {
        if (!wordCounts[w]) wordCounts[w] = { total: 0, inDE: 0, inEN: 0, inBoth: 0 };
        wordCounts[w].total++;
        const { inDE, inEN, inBoth } = checkWordLists(w);
        if (inDE) wordCounts[w].inDE++;
        if (inEN) wordCounts[w].inEN++;
        if (inBoth) wordCounts[w].inBoth++;
    });
});

// Now analyze results
let perfectSlashSplits = 0;
let heuristicSplits = 0;
let potentialIssues = 0;

Object.entries(splitResults).forEach(([desc, info]) => {
    const { de, en, raw } = info.result;
    const hasSlash = hasSlashes(desc);
    const deCourses = de.split('•').filter(c => c.trim()).length;
    const enCourses = en.split('•').filter(c => c.trim()).length;
    
    if (hasSlash) {
        perfectSlashSplits++;
        // Even with slashes, check that DE/EN aren't identical when they shouldn't be
        if (de === en && de !== '') {
            // This might be OK if both are the same (e.g., "Pizza / Pizza")
        }
    } else {
        heuristicSplits++;
    }
    
    // Check for potential issues
    if (deCourses !== enCourses && desc.length > 10) {
        potentialIssues++;
        console.log(`⚠️  Course count mismatch: DE=${deCourses} EN=${enCourses}`);
        console.log(`   Name(s): ${[...info.names].join(', ')}`);
        console.log(`   Raw: ${desc.substring(0, 120)}`);
        console.log(`   DE: ${de.substring(0, 80)}`);
        console.log(`   EN: ${en.substring(0, 80)}`);
        console.log('');
    }
    
    // Check for EN words leaking into DE result (for non-slash splits)
    if (!hasSlash && de !== en) {
        const deResultWords = extractWords(de);
        const enResultWords = extractWords(en);
        // Look for words that are in EN_STEMS but appear in DE result
        deResultWords.forEach(w => {
            if (EN_STEMS.includes(w) && !DE_STEMS.includes(w) && !BOTH_SET.includes(w)) {
                // Might be fine if the word is common in German too
            }
        });
    }
});

console.log(`\n=== Summary ===`);
console.log(`Total descriptions analyzed: ${Object.keys(splitResults).length}`);
console.log(`Slash-split descriptions: ${perfectSlashSplits}`);
console.log(`Heuristic-split descriptions: ${heuristicSplits}`);
console.log(`Potential issues (course count mismatch): ${potentialIssues}`);

// 5. Find stem library candidates
console.log(`\n=== Stem Library Candidates ===`);
console.log(`\nWords appearing in descriptions NOT in any stem list (sorted by frequency):`);

const candidates = Object.entries(wordCounts)
    .filter(([word, cnt]) => cnt.inDE === 0 && cnt.inEN === 0 && cnt.inBoth === 0)
    .sort((a, b) => b[1].total - a[1].total)
    .filter(([word]) => word.length >= 3);

// Categorize by likely language
function likelyGerman(word) {
    return /[äöüß]$/.test(word) || /(ung|keit|heit|chen|lein|schaft|tum|nis|ling|sal|sel|tion|sion|ität)$/.test(word);
}

function likelyEnglish(word) {
    return /(ing|ed|tion|sion|able|ible|ful|less|ness|ment|ity|ize|ise|ify|ly|er|est)$/.test(word) && !likelyGerman(word);
}

const deCandidates = [];
const enCandidates = [];
const bothCandidates = [];

candidates.forEach(([word, cnt]) => {
    if (likelyGerman(word)) {
        deCandidates.push({ word, count: cnt.total });
    } else if (likelyEnglish(word)) {
        enCandidates.push({ word, count: cnt.total });
    } else {
        bothCandidates.push({ word, count: cnt.total });
    }
});

console.log(`\n--- Likely DE_STEMS candidates (${deCandidates.length}) ---`);
deCandidates.slice(0, 30).forEach(c => console.log(`  ${c.word} (${c.count}x)`));

console.log(`\n--- Likely EN_STEMS candidates (${enCandidates.length}) ---`);
enCandidates.slice(0, 30).forEach(c => console.log(`  ${c.word} (${c.count}x)`));

console.log(`\n--- Ambiguous / BOTH_SET candidates (${bothCandidates.length}) ---`);
bothCandidates.slice(0, 30).forEach(c => console.log(`  ${c.word} (${c.count}x)`));

// 6. Also check words that ARE in a stem list but might need reclassification
console.log(`\n=== Words in DE_STEMS that look English ===`);
DE_STEMS.forEach(w => {
    if (likelyEnglish(w) && !BOTH_SET.includes(w)) {
        console.log(`  ${w} - might belong in BOTH_SET or EN_STEMS`);
    }
});

console.log(`\n=== Words in EN_STEMS that look German ===`);
EN_STEMS.forEach(w => {
    if (likelyGerman(w) && !BOTH_SET.includes(w)) {
        console.log(`  ${w} - might belong in BOTH_SET or DE_STEMS`);
    }
});

console.log('\n=== Detailed Results for All Items ===\n');

allItems.forEach((item, idx) => {
    if (!item.description) return;
    const result = sandbox.splitLanguage(item.description);
    console.log(`[${idx + 1}] ${item.name}`);
    console.log(`    RAW: ${item.description.substring(0, 120)}`);
    console.log(`    DE → ${result.de.substring(0, 120)}`);
    console.log(`    EN → ${result.en.substring(0, 120)}`);
    console.log('');
});
