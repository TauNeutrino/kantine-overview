const fs = require('fs');
const path = require('path');

function cleanSrc(src) {
  return src
    .replace(/export /g, '')
    .replace(/import .*? from .*?;/g, '')
    .replace(/^(const|let) /gm, 'var ');
}

const ROOT = path.join(__dirname, '..');
eval(
  cleanSrc(fs.readFileSync(path.join(ROOT, 'src/lang/langModel.js'), 'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT, 'src/lang/langModelSeed.js'), 'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT, 'src/lang/score.js'), 'utf8'))
);

var model = createLangModel(LANG_MODEL_SEED);

function assert(condition, message) {
  if (!condition) { console.error('❌ FAIL:', message); process.exit(1); }
}

var cleanCourses = [
  { de: 'Gemüsebouillon mit Backerbsen', en: 'Vegetable broth with baked peas', allergen: 'ACLM', mono: false, anchored: true },
  { de: 'Faschierter Braten mit Püree und Karotten', en: 'Minced meat roast with mashed potatoes and carrots', allergen: 'ACGLM', mono: false, anchored: true },
  { de: 'Milchreis', en: 'Rice pudding', allergen: 'G', mono: false, anchored: true }
];
var raw1 = 'Gemüsebouillon mit Backerbsen / Vegetable broth with baked peas(ACLM) Faschierter Braten mit Püree und Karotten / Minced meat roast with mashed potatoes and carrots(ACGLM) Milchreis / Rice pudding(G)';
var r1 = scoreSplit({ courses: cleanCourses, notes: [], raw: raw1, langModel: model });
assert(r1.label === 'high', 'Clean anchored 3-course: label=high, got ' + r1.label);
assert(r1.subScores.anchor === 1, 'All anchored: anchor=1');
assert(r1.subScores.coverage > 0.8, 'Good coverage: ' + r1.subScores.coverage);
console.log('Test 1 PASS: confidence=' + r1.confidence.toFixed(3), 'label=' + r1.label);

var badCourses = [
  { de: '', en: 'Soup', allergen: 'A', mono: false, anchored: true },
  { de: 'Hauptgericht', en: 'Main', allergen: 'B', mono: false, anchored: true }
];
var r2 = scoreSplit({ courses: badCourses, notes: [], raw: 'Soup Hauptgericht / Main', langModel: model });
assert(r2.subScores.course < 1, 'Empty DE penalizes course score: ' + r2.subScores.course);
console.log('Test 2 PASS: course=' + r2.subScores.course.toFixed(3));

var thinCourses = [
  { de: 'Suppe', en: 'Soup', allergen: '', mono: false, anchored: false }
];
var r3 = scoreSplit({ courses: thinCourses, notes: [], raw: 'Suppe / Soup Hauptgericht mit Sauce / Main dish with sauce', langModel: model });
assert(r3.subScores.coverage < 1, 'Missing tokens: coverage < 1, got ' + r3.subScores.coverage);
console.log('Test 3 PASS: coverage=' + r3.subScores.coverage.toFixed(3));

var monoCourses = [
  { de: 'Balisto', en: 'Balisto', allergen: 'ACGH', mono: true, anchored: true }
];
var r4 = scoreSplit({ courses: monoCourses, notes: [], raw: 'Balisto(ACGH)', langModel: model });
assert(r4.confidence >= 0 && r4.confidence <= 1, 'Mono: confidence in [0,1]: ' + r4.confidence);
console.log('Test 4 PASS: mono confidence=' + r4.confidence.toFixed(3));
console.log('✅ All score tests passed!');
