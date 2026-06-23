const fs = require('fs');

// Load normalize.js, stripping exports for Node testing
const code = fs.readFileSync('./src/lang/normalize.js', 'utf8')
    .replace(/export function /g, 'function ');

// Evaluate the code
eval(code);

function assert(condition, message) {
    if (!condition) {
        console.error('❌ AssertionError:', message);
        process.exit(1);
    }
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        console.error(`❌ AssertionError: ${message}`);
        console.error(`   Expected: ${expected}`);
        console.error(`   Actual:   ${actual}`);
        process.exit(1);
    }
}

console.log('Running tests for normalize.js...');

// Broken allergen repairs:
assertEquals(
    normalize("Beef soup with egg pancakes/ACLM) next course").text,
    "Beef soup with egg pancakes(ACLM) next course",
    "Should repair /ACLM)"
);

assertEquals(
    normalize("Carrot cream soup/GLM) main dish(AFO)").text,
    "Carrot cream soup(GLM) main dish(AFO)",
    "Should repair /GLM)"
);

assertEquals(
    normalize("bread roll/A) next").text,
    "bread roll(A) next",
    "Should repair /A)"
);

assertEquals(
    normalize("Mango- curry with rice(A/F/N)").text,
    "Mango- curry with rice(AFN)",
    "Should repair (A/F/N)"
);

// Non-allergen paren PRESERVED (not split):
assertEquals(
    normalize("Boeuf Stroganoff(Beef) mit Spätzle").text,
    "Boeuf Stroganoff(Beef) mit Spätzle",
    "Should preserve non-allergen paren"
);

assertEquals(
    normalize("Riz Casimir (turkey curry, pineapple)").text,
    "Riz Casimir (turkey curry, pineapple)",
    "Should preserve non-allergen paren with text"
);

// Note parking:
const r1 = normalize("Kürbiscremesuppe / Pumpkin cream Achtung Änderung Frisches Grillhendl mit Semmel (A)");
assert(r1.notes.length > 0 && !r1.text.includes("Achtung Änderung"), "Should extract 'Achtung Änderung'");

const r2 = normalize("KNAPP Pizza mit Schinken (AGM)                        !!!ACHTUNG!!!  DIE ABHOLUNG IST IM OG.");
assert(r2.notes.length > 0 && !r2.text.includes("ABHOLUNG"), "Should extract 'ABHOLUNG' note");

// isValidAllergen:
assert(isValidAllergen('ACLM') === true, "ACLM is valid allergen");
assert(isValidAllergen('GLM') === true, "GLM is valid allergen");
assert(isValidAllergen('Beef') === false, "Beef is not valid allergen");
assert(isValidAllergen('HLOF Koriander') === false, "HLOF Koriander is not valid allergen");

console.log('✅ All tests passed!');
process.exit(0);