import { segment } from '../src/lang/segment.js';
import assert from 'assert';

function runTests() {
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (e) {
      console.error(`❌ ${name}`);
      console.error(e);
    }
  }

  test('Test 1: Standard anchored 3-course', () => {
    const input = "Gemüsebouillon mit Backerbsen / Vegetable broth with baked peas(ACLM) Faschierter Braten mit Püree und Karotten / Minced meat roast with mashed potatoes and carrots(ACGLM) Milchreis / Rice pudding(G)";
    const courses = segment(input);
    assert.strictEqual(courses.length, 3);
    
    assert.ok(courses[0].de.includes("Gemüsebouillon mit Backerbsen"));
    assert.ok(courses[0].en.includes("Vegetable broth with baked peas"));
    assert.strictEqual(courses[0].allergen, "ACLM");
    assert.strictEqual(courses[0].mono, false);
    assert.strictEqual(courses[0].anchored, true);

    assert.ok(courses[1].de.includes("Faschierter Braten"));
    assert.ok(courses[1].en.includes("Minced meat roast"));
    assert.strictEqual(courses[1].allergen, "ACGLM");
    assert.strictEqual(courses[1].anchored, true);

    assert.ok(courses[2].de.includes("Milchreis"));
    assert.ok(courses[2].en.includes("Rice pudding"));
    assert.strictEqual(courses[2].allergen, "G");
    assert.strictEqual(courses[2].anchored, true);
  });

  test('Test 2: Mono brand dessert', () => {
    const input = "Rindsuppe mit Frittaten / Beef soup with pancakes stripes(ACGLM) Milki Mum(G)";
    const courses = segment(input);
    assert.strictEqual(courses.length, 2);
    
    assert.strictEqual(courses[1].de, "Milki Mum (G)");
    assert.strictEqual(courses[1].en, "Milki Mum (G)");
    assert.strictEqual(courses[1].mono, true);
    assert.strictEqual(courses[1].anchored, true);
  });

  test('Test 3: Non-allergen paren preserved', () => {
    const input = "Boeuf Stroganoff(Beef) mit Spätzle / Beef stroganoff with spaetzle(ACGLM)";
    const courses = segment(input);
    assert.strictEqual(courses.length, 1);
    
    assert.ok(courses[0].de.includes("(Beef)"));
    assert.strictEqual(courses[0].allergen, "ACGLM");
  });

  test('Test 4: No-space slash variant', () => {
    const input = "Suppe /Soup(A)";
    const courses = segment(input);
    assert.strictEqual(courses.length, 1);
    
    assert.ok(courses[0].de.includes("Suppe"));
    assert.ok(courses[0].en.includes("Soup"));
    assert.strictEqual(courses[0].mono, false);
  });

  test('Test 5: Hard case — first course has no allergen', () => {
    const input = "Karfiolcremesuppe / Cauliflower cream soup Erdnuss-Curry mit Tofu und Reis / Peanut curry with tofu and rice(AFE) Kirschjoghurt / Cherry yogurt(F)";
    const courses = segment(input);
    
    // As per specification: "2 courses (the allergen-free first glued with second, then third) OR 1 course for the glued pair + 1 for the last"
    // Also: "mark anchored: false is NOT correct here — it IS anchored by AFE"
    assert.strictEqual(courses.length, 2);
    
    assert.ok(courses[0].de.includes("Karfiolcremesuppe"));
    assert.strictEqual(courses[0].anchored, true);
    assert.strictEqual(courses[0].allergen, "AFE");
    assert.strictEqual(courses[0].mono, false);

    assert.ok(courses[1].de.includes("Kirschjoghurt"));
    assert.strictEqual(courses[1].allergen, "F");
    assert.strictEqual(courses[1].anchored, true);
  });

  if (passed === total) {
    console.log(`\nAll ${total} tests passed!`);
    process.exit(0);
  } else {
    console.error(`\n${total - passed} of ${total} tests failed.`);
    process.exit(1);
  }
}

runTests();