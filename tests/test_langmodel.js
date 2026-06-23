const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Read the code and strip the export
const srcPath = path.join(__dirname, '../src/lang/langModel.js');
let code = fs.readFileSync(srcPath, 'utf8');
code = code.replace(/export function/g, 'function');

// Eval the code in this context
eval(code);

const TINY_MODEL = {
  version: 'test',
  trigramsDe: { 'mit': 5, 'und': 4, 'sch': 6, 'pfe': 3, 'ung': 7, 'kar': 4 },
  trigramsEn: { 'wit': 5, 'and': 4, 'the': 6, 'wit': 3, 'ing': 7, 'car': 4 },
  funcDe: ['mit', 'und', 'auf', 'von', 'vom', 'nach', 'in', 'an', 'zu', 'aus'],
  funcEn: ['with', 'and', 'on', 'from', 'the']
};

const m = createLangModel(TINY_MODEL);

// German phrase scores higher DE
const s1 = m.scorePhrase("Faschierter Braten mit Püree und Karotten");
assert(s1.de > s1.en, "German phrase: DE > EN");

// English phrase scores higher EN
const s2 = m.scorePhrase("Minced meat roast with mashed potatoes and carrots");
assert(s2.en > s2.de, "English phrase: EN > DE");

// scoreLang sign test
assert(m.scoreLang("Faschierter Braten mit Püree") > 0, "German phrase scoreLang > 0");
assert(m.scoreLang("Minced meat roast with potatoes") < 0, "English phrase scoreLang < 0");

// Function word flip: adding 'mit' pushes DE; adding 'with' pushes EN
const neutral = "Schnitzel Risotto Pizza";
const withMit = m.scoreLang("Schnitzel mit Risotto");
const withWith = m.scoreLang("Schnitzel with Risotto");
assert(withMit > withWith, "'mit' raises DE score vs 'with'");

// Orthography test: umlaut pushes DE
assert(m.scoreLang("Gemüse Kräuter Füße") > 0, "Umlaut text scores German");

// mergeDelta stub: returns model, doesn't throw
const m2 = m.mergeDelta({ 'xyz': 1 });
assert(m2 !== null && m2 !== undefined, "mergeDelta stub returns model");

// getModel returns the seed
const got = m.getModel();
assert(got.version === 'test', "getModel returns seed version");

console.log("✅ test_langmodel.js passed");
