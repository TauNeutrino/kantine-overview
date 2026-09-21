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
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/blockFormat.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/dishes.js'),'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT,'src/lang/splitter.js'),'utf8'))
);

function assert(c, msg) {
  if (!c) { console.error('❌', msg); process.exit(1); }
}
function countBullets(s) { return s.split('•').filter(x => x.trim()).length; }
function hasEnglishWord(s) {
  return /\b(with|and|the|of|from|soup|salad|cream|cake|style|small|portion|noodles|rice)\b/i.test(s.replace(/\([^)]*\)/g, ''));
}
function hasGermanWord(s) {
  return /\b(mit|und|auf|von|für|im|am|der|die|das|Portion|Gebäck|Gemüse|Kartoffel)\b/.test(s.replace(/\([^)]*\)/g, ''));
}

// --- New block format (Bessa layout since 2026-04) ---

// Comma-separated English block; head noun "Fusilli" must not leak into the soup.
const commaBlock = splitLanguage('Rindsuppe m. Kaspressknödel (LMCGA) Putengeschnetzeltes in Kokos Currysauce m. Basmatireis (LMCFO) Obstgarten (G) Beef soup with cheese dumplings, Turkey strips in coconut curry sauce with basmati rice, curd cream');
assert(countBullets(commaBlock.de) === 3, 'comma-block de 3 courses');
assert(countBullets(commaBlock.en) === 3, 'comma-block en 3 courses');
assert(!hasEnglishWord(commaBlock.de), 'comma-block de has no english text');
assert(commaBlock.en.includes('Beef soup with cheese dumplings (LMCGA)'), 'comma-block en soup keeps its allergen');
assert(commaBlock.en.includes('Turkey strips in coconut curry sauce with basmati rice (LMCFO)'), 'comma-block en main');
assert(['high','medium'].includes(commaBlock.label), 'comma-block label high/medium');

// English block with mirrored allergen codes covering every boundary.
const mirroredBlock = splitLanguage('Rindsuppe m. Kaspressknödel (LMCGA) Zanderfilet in Olivenkruste mit pikanten Tomaten Bulgur (DAG) Obstgarten (G) Beef soup with cheese dumplings (LMCGA) Pike-perch fillet in olive crust with spicy tomatoes Bulgur (DAG) curd cream');
assert(countBullets(mirroredBlock.de) === 3, 'mirrored-block de 3 courses');
assert(countBullets(mirroredBlock.en) === 3, 'mirrored-block en 3 courses');
assert(!hasEnglishWord(mirroredBlock.de), 'mirrored-block de has no english text');
assert(mirroredBlock.en.includes('Pike-perch fillet'), 'mirrored-block en main');
assert(mirroredBlock.en.includes('curd cream (G)'), 'mirrored-block en dessert');
assert(['high','medium'].includes(mirroredBlock.label), 'mirrored-block label high/medium');

// English block without any separator except "small portion".
const portionBlock = splitLanguage('Rindsuppe m. Kaspressknödel (LMCGA) kleine Portion: Putengeschnetzeltes in Kokos Currysauce mit Basmatireis (LMCFO) Beef soup with cheese dumplings   small portion of turkey strips in coconut curry sauce with basmati rice');
assert(countBullets(portionBlock.de) === 2, 'portion-block de 2 courses');
assert(countBullets(portionBlock.en) === 2, 'portion-block en 2 courses');
assert(portionBlock.en.includes('small portion of turkey strips'), 'portion-block cue split');

// Addendum fragments merge into the previous course.
const addendumBlock = splitLanguage('Rindsuppe m. Kaspressknöde(LMCGA) überbackene Schinkenfleckerl(LMCGA) m. Schnittlauchdip(G) Obstgarten (G) Beef broth with cheese dumplings (LMCGA)  gratin ham dumplings  with chive dip, curd cream');
assert(countBullets(addendumBlock.de) === 3, 'addendum-block de 3 courses');
assert(addendumBlock.de.includes('m. Schnittlauchdip'), 'addendum-block keeps dip text');
assert(!/\n• m\. Schnittlauchdip/.test(addendumBlock.de), 'addendum-block dip is not its own course');

// Undistributable English block: German column stays clean, English stays complete.
const gracefulBlock = splitLanguage('Gemüsebouillon mit Grießnockerl (ACGLM) Saures Rindfleisch (LM) Schokopudding (G) Vegetable soup with semolina dumplings (ACGLM) Sour beef chocolate pudding');
assert(countBullets(gracefulBlock.de) === 3, 'graceful-block de 3 courses');
assert(!hasEnglishWord(gracefulBlock.de), 'graceful-block de stays german');
assert(gracefulBlock.en.includes('Vegetable soup with semolina dumplings'), 'graceful-block en keeps full block');
assert(gracefulBlock.en.includes('chocolate pudding'), 'graceful-block en block is complete');
assert(gracefulBlock.label === 'medium', 'graceful-block label medium');

// Truncated source field must not leave an open parenthesis in the output.
const truncated = splitLanguage('Ofenkarotten mit warmen Bohnenmus grüner Salsa und Joghurt (NG) Oven carrots with warm bean puree, green salsa and yoghurt (');
const balanced = s => (s.match(/\(/g) || []).length === (s.match(/\)/g) || []).length;
assert(balanced(truncated.de), 'truncated de has balanced parens');
assert(balanced(truncated.en), 'truncated en has balanced parens');

// --- Guard: slash format must keep going through the regular pipeline ---
const slashFormat = splitLanguage('Suppe / Soup (A) Gulasch / Goulash (B)');
assert(countBullets(slashFormat.de) === 2, 'slash-format de 2 courses');
assert(countBullets(slashFormat.en) === 2, 'slash-format en 2 courses');
assert(slashFormat.en.includes('Soup'), 'slash-format en soup');
assert(slashFormat.en.includes('Goulash'), 'slash-format en main');

// --- Guard: trailing English behind a slash is not treated as block format ---
const trail = splitLanguage('Brokklolicremesuppe (GLM) Quinoa Auflauf mit Rotkraut Cole slaw (CG) broccoli cream soup / quinoa casserole with red cabbage cole slaw');
assert(countBullets(trail.de) === 2, 'trailing-en de 2 courses');
assert(countBullets(trail.en) === 2, 'trailing-en en 2 courses');
assert(trail.en.includes('quinoa casserole'), 'trailing-en en main');

// --- Guard: mixed comma format keeps working ---
const mixedComma = splitLanguage('Rindsuppe (A) Schnitzel (B) beef soup, pork schnitzel');
assert(countBullets(mixedComma.de) === 2, 'mixed-comma de 2 courses');
assert(countBullets(mixedComma.en) === 2, 'mixed-comma en 2 courses');
assert(mixedComma.en.includes('beef soup (A)'), 'mixed-comma en soup');
assert(mixedComma.en.includes('pork schnitzel (B)'), 'mixed-comma en main');

console.log('✅ All block format tests passed!');
