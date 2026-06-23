const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function cleanSrc(src) {
  return src.replace(/export /g,'').replace(/import .*? from .*?;/g,'').replace(/^(const|let) /gm,'var ');
}

eval(
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/types.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/normalize.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/templates.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/langModel.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/langModelSeed.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/segment.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/boundary.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/score.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/splitter.js'),'utf8'))
);

const data = JSON.parse(fs.readFileSync(path.join(ROOT,'tests/test_kantine_menuCache.json'),'utf8'));
const items = [];
data.forEach(w => w.days.forEach(d => d.items.forEach(i => { if(i.description) items.push(i); })));

const anchored = [];
const hard = [];
const lexicalOnly = [];
const mono = [];

items.forEach(item => {
  const text = item.description;
  const slashes = (text.match(/\s\/\s|\s\/\S|\S\/\s/g)||[]).length;
  const allergens = (text.match(/\(([A-Z](?:[A-Z,\s]*[A-Z])?)\)/g)||[]).length;
  
  if (slashes <= allergens && slashes > 0) {
    anchored.push(item);
  } else if (slashes > allergens && allergens > 0) {
    hard.push(item);
  } else if (allergens === 0 && slashes > 0) {
    lexicalOnly.push(item);
  } else {
    mono.push(item);
  }
});

const THRESHOLDS = {
  anchored_precision: 0.90,
  anchored_recall: 0.82,
  hard_precision: 0.78,
  lexical_false_split_rate: 0.05,
};

const lm = createLangModel(LANG_MODEL_SEED);

function evalCategory(itemsList) {
  let totalPairs = 0;
  let correct = 0;
  let predictions = 0;

  itemsList.forEach(item => {
    // Ground truth definition: the (DE-text, EN-text) pair per course derived from the real slash positions.
    const norm = normalize(item.description).text;
    const courses = segment(norm);
    courses.forEach(c => {
      if (!c.mono && c.de && c.en) {
        let deText = c.de.replace(/\s*\([A-Z,]+\)$/, '').trim();
        let enText = c.en.replace(/\s*\([A-Z,]+\)$/, '').trim();
        totalPairs++;
        
        let glued = enText + ' ' + deText;
        let { enPart, deCut } = resolveBoundary(glued, lm);
        
        if (deCut !== '') {
            predictions++;
            let trueEnWords = enText.trim() === '' ? [] : enText.trim().split(/\s+/);
            let predEnWords = enPart.trim() === '' ? [] : enPart.trim().split(/\s+/);
            if (Math.abs(trueEnWords.length - predEnWords.length) <= 1) {
                correct++;
            }
        }
      }
    });
  });

  return {
    precision: predictions > 0 ? correct / predictions : 0,
    recall: totalPairs > 0 ? correct / totalPairs : 0
  };
}

const anchoredMetrics = evalCategory(anchored);
const hardMetrics = evalCategory(hard);

let lexicalFalseSplits = 0;
lexicalOnly.forEach(item => {
  const result = splitLanguage(item.description);
  const isTemplate = result.label === 'template';
  const deCourses = result.de.split('\n').length;
  const enCourses = result.en.split('\n').length;
  
  if (!isTemplate && (deCourses > 3 || enCourses > 3)) {
    lexicalFalseSplits++;
  }
});
const lexicalFalseSplitRate = lexicalOnly.length > 0 ? lexicalFalseSplits / lexicalOnly.length : 0;

const labels = { high: 0, medium: 0, low: 0, fallback: 0, template: 0 };
const lowItems = [];

items.forEach(item => {
  const res = splitLanguage(item.description);
  if (labels[res.label] !== undefined) labels[res.label]++;
  if (res.label === 'low' || res.label === 'fallback') {
    lowItems.push({ text: item.description, score: res.confidence });
  }
});

lowItems.sort((a, b) => a.score - b.score);

console.log('=== DE/EN Splitter Evaluation ===');
console.log(`Items analyzed: ${items.length}\n`);

console.log('Category breakdown:');
console.log(`  anchored:    ${anchored.length} (${(anchored.length/items.length*100).toFixed(1)}%)`);
console.log(`  hard:         ${hard.length} (${(hard.length/items.length*100).toFixed(1)}%)`);
console.log(`  lexicalOnly:  ${lexicalOnly.length} (${(lexicalOnly.length/items.length*100).toFixed(1)}%)`);
console.log(`  mono:         ${mono.length} (${(mono.length/items.length*100).toFixed(1)}%)\n`);

const aPass = anchoredMetrics.precision >= THRESHOLDS.anchored_precision && anchoredMetrics.recall >= THRESHOLDS.anchored_recall;
const hPass = hardMetrics.precision >= THRESHOLDS.hard_precision;
const lPass = lexicalFalseSplitRate <= THRESHOLDS.lexical_false_split_rate;

console.log('Hold-out Boundary Detection:');
console.log(`  Anchored: precision=${anchoredMetrics.precision.toFixed(2)} recall=${anchoredMetrics.recall.toFixed(2)} (threshold: P>=${THRESHOLDS.anchored_precision} R>=${THRESHOLDS.anchored_recall}) [${aPass ? 'PASS' : 'FAIL'}]`);
console.log(`  Hard:     precision=${hardMetrics.precision.toFixed(2)} (threshold: P>=${THRESHOLDS.hard_precision}) [${hPass ? 'PASS' : 'FAIL'}]`);
console.log(`  Lexical:  false-split rate=${lexicalFalseSplitRate.toFixed(2)} (threshold: <${(THRESHOLDS.lexical_false_split_rate * 100).toFixed(0)}%) [${lPass ? 'PASS' : 'FAIL'}]\n`);

console.log('Confidence Distribution:');
for (const k in labels) {
  console.log(`  ${k.padEnd(8)}: ${labels[k].toString().padStart(3)} (${(labels[k]/items.length*100).toFixed(0)}%)`);
}

console.log('\nLow-confidence items (bottom 10):');
lowItems.slice(0, 10).forEach(i => {
  let short = i.text.length > 80 ? i.text.substring(0, 77) + '...' : i.text;
  console.log(`  [${i.score.toFixed(2)}] ${short}`);
});

console.log(`\nOverall: ${aPass && hPass && lPass ? 'ALL THRESHOLDS MET' : 'SOME THRESHOLDS MISSED'}`);

process.exit((aPass && hPass && lPass) ? 0 : 1);
