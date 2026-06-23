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
  cleanSrc(fs.readFileSync(path.join(ROOT, 'src/lang/boundary.js'), 'utf8'))
);

var model = createLangModel(LANG_MODEL_SEED);

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`✅ ${message}`);
}

try {
    // Happy path: glued EN/DE seam correctly split
    const r1 = resolveBoundary("Chicken soup with rice Gratiniertes Schweine-Steak mit Polenta", model);
    assert(r1.deCut.length > 0, "Glued course: deCut found");
    assert(r1.enPart.toLowerCase().includes('chicken') || r1.enPart.toLowerCase().includes('soup'), "enPart contains EN words");
    assert(r1.deCut.toLowerCase().includes('gratiniertes') || r1.deCut.toLowerCase().includes('schweine') || r1.deCut.toLowerCase().includes('steak'), "deCut contains DE words");

    // Happy path: another glued case
    const r2 = resolveBoundary("Cauliflower cream soup Erdnuss-Curry mit Tofu und Reis", model);
    assert(r2.deCut.length > 0, "Second glued case: deCut found");

    // Negative: pure German fragment — no split
    const r3 = resolveBoundary("Schnitzel mit Pommes und Salat", model);
    assert(r3.deCut === '', "Pure German: no split (deCut empty)");
    assert(r3.enPart === "Schnitzel mit Pommes und Salat", "Pure German: enPart is full fragment");

    // Negative: pure English fragment — no split
    const r4 = resolveBoundary("Grilled Chicken Salad with croutons", model);
    assert(r4.deCut === '', "Pure English: no split");

    // Edge: single word — no split
    const r5 = resolveBoundary("Dessert", model);
    assert(r5.deCut === '', "Single word: no split");

    // Edge: empty string
    const r6 = resolveBoundary("", model);
    assert(r6.deCut === '' && r6.enPart === '', "Empty: no split");

    console.log("All boundary tests passed! ✅");
    process.exit(0);
} catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
}
