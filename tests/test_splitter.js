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
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/loanwords.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/alignTrailing.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/segment.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/boundary.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/score.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/dishes.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/splitter.js'),'utf8'))
);

function assertEquals(a, e, msg) { 
    if(a!==e){
        console.error('❌',msg,'\n  Expected:',JSON.stringify(e),'\n  Actual:  ',JSON.stringify(a)); 
        process.exit(1);
    } 
}
function assert(c, msg) { 
    if(!c){
        console.error('❌',msg); 
        process.exit(1);
    } 
}

assertEquals(splitLanguage('').de, '', 'empty de');
assertEquals(splitLanguage('').en, '', 'empty en');

assertEquals(splitLanguage('Schnitzel').de, '• Schnitzel', 'german only de');
assertEquals(splitLanguage('Schnitzel').en, '• Schnitzel', 'german only en');

assertEquals(splitLanguage('Suppe / Soup').de, '• Suppe', 'slash de');
assertEquals(splitLanguage('Suppe / Soup').en, '• Soup', 'slash en');

assertEquals(splitLanguage('Schnitzel mit Pommes').de, '• Schnitzel mit Pommes', 'pure german de');
assertEquals(splitLanguage('Schnitzel mit Pommes').en, '• Schnitzel mit Pommes', 'pure german en');

assertEquals(splitLanguage('Chicken Curry with Rice').de, '• Chicken Curry with Rice', 'pure english de');
assertEquals(splitLanguage('Chicken Curry with Rice').en, '• Chicken Curry with Rice', 'pure english en');

const mc = splitLanguage('Suppe / Soup (A) Gulasch / Goulash (B)');
const countBullets = s => s.split('•').filter(x=>x.trim()).length;
assert(countBullets(mc.de) === 2, 'multi-course de count');
assert(countBullets(mc.en) === 2, 'multi-course en count');

const mixedComma = splitLanguage('Rindsuppe (A) Schnitzel (B) beef soup, pork schnitzel');
assert(countBullets(mixedComma.de) === 2, 'mixed-format comma de count');
assert(countBullets(mixedComma.en) === 2, 'mixed-format comma en count');
assert(mixedComma.en.includes('beef soup (A)'), 'mixed-format comma en0');
assert(mixedComma.en.includes('pork schnitzel (B)'), 'mixed-format comma en1');
assert(['high','medium'].includes(mixedComma.label), 'mixed-format comma label high/medium');

const m6 = splitLanguage('Suppe / Soup Salat / Salad Dessert');
assert(countBullets(m6.de) === 3, 'M6 de 3 courses');
assert(countBullets(m6.en) === 3, 'M6 en 3 courses');
assert(m6.label === 'template', 'M6 label=template');

const m6Slash = splitLanguage('Suppe / Soup Salat / Salad / Dessert');
assert(countBullets(m6Slash.de) === 3, 'M6 slash de 3 courses');
assert(m6Slash.label === 'template', 'M6 slash label=template');

const m6Typo = splitLanguage('Suppr / Soup Salat / Salad Dessert');
assert(countBullets(m6Typo.de) === 3, 'M6 typo de 3 courses');
assert(m6Typo.label === 'template', 'M6 typo label=template');

const scored = splitLanguage('Kräutercremesuppe / Herbal cream soup(GLM) Puten Cordon bleu mit Petersilienkartoffeln / Turkey cordon bleu with parsley potatoes(ACG) Kuchen / Cake(ACGHO)');
assert(typeof scored.confidence === 'number', 'confidence is number');
assert(scored.confidence >= 0 && scored.confidence <= 1, 'confidence in [0,1]');
assert(['high','medium','low','fallback','template'].includes(scored.label), 'valid label');

// Regression: english words with capitals ("Indian: Mix Sabji", "Vegetables")
// must not be treated as German dish starts in the boundary detector.
const sabji = splitLanguage('Süßkartoffel- Tomatensuppe / Sweet potato- tomato soup Indisch: Mix Sabji (Gemüse in Kokossauce) Kichererbsencurry / Indian: Mix Sabji ( Vegetables in coconut sauce) chickpea curry Vanillepudding / Vanilla pudding(F)');
assert(countBullets(sabji.de) === 3, 'sabji de 3 courses');
assert(countBullets(sabji.en) === 3, 'sabji en 3 courses');
assert(sabji.de.includes('Indisch: Mix Sabji (Gemüse in Kokossauce) Kichererbsencurry'), 'sabji de main course');
assert(sabji.en.includes('Indian: Mix Sabji ( Vegetables in coconut sauce) chickpea curry'), 'sabji en main course');
assert(sabji.de.includes('Vanillepudding (F)'), 'sabji de dessert');
assert(sabji.en.includes('Vanilla pudding (F)'), 'sabji en dessert');
assert(!sabji.de.includes('chickpea'), 'sabji de has no english text');
assert(!sabji.de.includes('Vanilla'), 'sabji de has no vanilla');

// Regression: trailing block "DE1 (A) DE2 (B) EN1 / EN2" distributes EN dishes
// onto the anchored German courses instead of leaking EN text into the de column.
const trailEn = splitLanguage('Brokklolicremesuppe (GLM) Quinoa Auflauf mit Rotkraut Cole slaw (CG) broccoli cream soup / quinoa casserole with red cabbage cole slaw');
assert(countBullets(trailEn.de) === 2, 'trailing EN de 2 courses');
assert(countBullets(trailEn.en) === 2, 'trailing EN en 2 courses');
assert(trailEn.de.includes('Brokklolicremesuppe (GLM)'), 'trailing EN de soup');
assert(trailEn.de.includes('Quinoa Auflauf mit Rotkraut Cole slaw (CG)'), 'trailing EN de main');
assert(trailEn.en.includes('broccoli cream soup (GLM)'), 'trailing EN en soup');
assert(trailEn.en.includes('quinoa casserole with red cabbage cole slaw (CG)'), 'trailing EN en main');
assert(!trailEn.de.includes('broccoli'), 'trailing EN de has no english text');

// Regression: trailing non-allergen parenthetical ingredient/meat annotation
// after an allergen must not become extra courses (Friday single-course menus).
const fridayMeat = splitLanguage('Faschierter Braten mit Paprikagemüse und Bratkartoffeln / Mince meat roast with bell pepper vegetables and fried potatoes (ACGLMF)(Beef, Pork)');
assert(countBullets(fridayMeat.de) === 1, 'friday meat annotation de 1 course');
assert(countBullets(fridayMeat.en) === 1, 'friday meat annotation en 1 course');
assert(fridayMeat.de.includes('Faschierter Braten'), 'friday meat annotation de dish');
assert(fridayMeat.de.includes('(Beef, Pork)'), 'friday meat annotation de keeps note');
assert(fridayMeat.en.includes('Mince meat roast'), 'friday meat annotation en dish');
assert(fridayMeat.en.includes('(Beef, Pork)'), 'friday meat annotation en keeps note');
assert(fridayMeat.label === 'high', 'friday meat annotation label high');

console.log('✅ All splitter tests passed!');
