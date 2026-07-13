const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function cleanSrc(src) {
  return src.replace(/export /g,'').replace(/import .*? from .*?;/g,'').replace(/^(const|let) /gm,'var ');
}

eval(
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/langModel.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/langModelSeed.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/loanwords.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/alignTrailing.js'),'utf8'))
);

function assertEquals(a, e, msg) {
  if (JSON.stringify(a) !== JSON.stringify(e)) {
    console.error('❌', msg, '\n  Expected:', JSON.stringify(e), '\n  Actual:  ', JSON.stringify(a));
    process.exit(1);
  }
}

const lm = createLangModel(LANG_MODEL_SEED);

// U1: 3 German courses + 3 English phrases aligned
const u1 = alignTrailingEnglish([
  { de: 'Selleriecremesuppe (GLM)', en: 'Selleriecremesuppe (GLM)', allergen: 'GLM', mono: true, anchored: true },
  { de: 'Rindschnitzel (AGLMO)', en: 'Rindschnitzel (AGLMO)', allergen: 'AGLMO', mono: true, anchored: true },
  { de: 'Holunder Zitronencreme (G)', en: 'Holunder Zitronencreme (G)', allergen: 'G', mono: true, anchored: true },
  { de: 'celery cream soup, beef schnitzel, elderflower lemon cream', en: 'celery cream soup, beef schnitzel, elderflower lemon cream', allergen: '', mono: true, anchored: false },
], lm);
assertEquals(u1.length, 3, 'U1 length');
assertEquals(u1[0].en, 'celery cream soup (GLM)', 'U1 en0 inherits allergen');
assertEquals(u1[1].en, 'beef schnitzel (AGLMO)', 'U1 en1 inherits allergen');
assertEquals(u1[2].en, 'elderflower lemon cream (G)', 'U1 en2 inherits allergen');
assertEquals(u1.every(c => !c.mono), true, 'U1 all bilingual');

// U2: slash-separated English block
const u2 = alignTrailingEnglish([
  { de: 'Leg. Grießsuppe (LMCAG)', en: 'Leg. Grießsuppe (LMCAG)', allergen: 'LMCAG', mono: true, anchored: true },
  { de: 'Salatteller mit Prosciutto (ACG)', en: 'Salatteller mit Prosciutto (ACG)', allergen: 'ACG', mono: true, anchored: true },
  { de: 'semolina soup / salad with prosciutto', en: 'semolina soup / salad with prosciutto', allergen: '', mono: true, anchored: false },
], lm);
assertEquals(u2.length, 2, 'U2 length');
assertEquals(u2[0].en, 'semolina soup (LMCAG)', 'U2 en0');
assertEquals(u2[1].en, 'salad with prosciutto (ACG)', 'U2 en1');

// U3: count mismatch -> unchanged
const u3 = alignTrailingEnglish([
  { de: 'A (A)', en: 'A (A)', allergen: 'A', mono: true, anchored: true },
  { de: 'english one, english two', en: 'english one, english two', allergen: '', mono: true, anchored: false },
], lm);
assertEquals(u3.length, 2, 'U3 count mismatch unchanged');
assertEquals(u3[1].mono, true, 'U3 tail still mono');

// U4: German markers in tail -> unchanged
const u4 = alignTrailingEnglish([
  { de: 'A (A)', en: 'A (A)', allergen: 'A', mono: true, anchored: true },
  { de: 'mit Reis, und Salat', en: 'mit Reis, und Salat', allergen: '', mono: true, anchored: false },
], lm);
assertEquals(u4[1].mono, true, 'U4 German markers unchanged');

// U5: too few courses -> unchanged
const u5 = alignTrailingEnglish([
  { de: 'soup, salad', en: 'soup, salad', allergen: '', mono: true, anchored: false },
], lm);
assertEquals(u5.length, 1, 'U5 too few courses unchanged');

const u6 = alignTrailingEnglish([
  { de: 'A (A)', en: 'A (A)', allergen: 'A', mono: true, anchored: true },
  { de: 'B (B)', en: 'B (B)', allergen: 'B', mono: true, anchored: true },
  { de: 'soup (A,G), salad', en: 'soup (A,G), salad', allergen: '', mono: true, anchored: false },
], lm);
assertEquals(u6[0].en, 'soup (A)', 'U6 existing paren replaced by inherited allergen');
assertEquals(u6[1].en, 'salad (B)', 'U6 second phrase');

console.log('✅ All alignTrailing tests passed!');
