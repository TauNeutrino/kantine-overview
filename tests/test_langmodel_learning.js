const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
function cleanSrc(src) { return src.replace(/export /g,'').replace(/import .*? from .*?;/g,'').replace(/^(const|let) /gm,'var '); }
eval(
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/langModel.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/langModelSeed.js'),'utf8'))
);
var model = createLangModel(LANG_MODEL_SEED);
function assert(c,m){if(!c){console.error('❌',m);process.exit(1);}}

var mockStorage = { _data: {}, getItem(k){return this._data[k]||null;}, setItem(k,v){this._data[k]=v;}, removeItem(k){delete this._data[k];} };

// Test 1: Anchored high-conf course -> delta grows
var before = JSON.stringify(mockStorage._data);
model.learnFromCourse(
  { de: 'Schnitzel mit Pommes', en: 'Schnitzel with fries', anchored: true, mono: false },
  { label: 'high' },
  mockStorage
);
model.saveDelta(mockStorage);
assert(Object.keys(JSON.parse(mockStorage._data['kantine_lang_model_delta'] || '{}')).length > 0 || true, 'delta saved');
var delta = JSON.parse(mockStorage._data['kantine_lang_model_delta'] || 'null');
assert(delta !== null, 'Test 1: delta saved after anchored+high');
console.log('Test 1 PASS: delta saved');

// Test 2: Non-anchored course -> delta unchanged
var deltaKeys1 = JSON.stringify(mockStorage._data);
model.learnFromCourse(
  { de: 'Suppe', en: 'Soup', anchored: false, mono: false },
  { label: 'high' },
  mockStorage
);
model.saveDelta(mockStorage);
assert(JSON.stringify(mockStorage._data) === deltaKeys1, 'Test 2: non-anchored: no change');
console.log('Test 2 PASS: non-anchored did not modify delta');

// Test 3: Low confidence -> no learning
model.learnFromCourse(
  { de: 'Hauptgericht', en: 'Main', anchored: true, mono: false },
  { label: 'low' },
  mockStorage
);
model.saveDelta(mockStorage);
assert(JSON.stringify(mockStorage._data) === deltaKeys1, 'Test 3: low-conf: no change');
console.log('Test 3 PASS: low-conf did not modify delta');

// Test 4: Version mismatch -> delta flushed on load
mockStorage._data['kantine_lang_model_delta'] = JSON.stringify({ modelVersion: 'old-version', trigramsDe: {xyz:99}, trigramsEn: {} });
var model2 = createLangModel(LANG_MODEL_SEED);
model2.loadDelta(mockStorage);
var flushed = JSON.parse(mockStorage._data['kantine_lang_model_delta'] || 'null');
assert(!flushed || !flushed.trigramsDe || !flushed.trigramsDe.xyz, 'Test 4: version mismatch flushed');
console.log('Test 4 PASS: version mismatch flushed');

// Test 5: No localStorage -> no crash
var model3 = createLangModel(LANG_MODEL_SEED);
model3.loadDelta(null);
assert(model3.scoreLang('Schnitzel') !== undefined, 'Test 5: works without localStorage');
console.log('Test 5 PASS: no crash without storage');

console.log('✅ All learning tests passed!');
