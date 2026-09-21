const fs = require('fs');
const vm = require('vm');
const path = require('path');

console.log('=== Running Template Unit Tests ===');

const sandbox = { console };
vm.createContext(sandbox);

const templatesPath = path.join(__dirname, '..', 'src', 'lang', 'templates.js');
const templatesCode = fs.readFileSync(templatesPath, 'utf8');
const cleanedTemplatesCode = templatesCode.replace(/export /g, '');
vm.runInContext(cleanedTemplatesCode, sandbox);

function assert(condition, message) {
  if (!condition) {
    console.error('❌ Assertion Failed: ' + message);
    process.exit(1);
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    console.error(`❌ Assertion Failed: ${message}`);
    console.error(`   Expected: ${JSON.stringify(expected)}`);
    console.error(`   Actual:   ${JSON.stringify(actual)}`);
    process.exit(1);
  }
}

const matchTemplate = sandbox.matchTemplate;

console.log('Testing template matches...');

const r1 = matchTemplate('Suppe / Soup Salat / Salad Dessert');
assert(r1 !== null && r1.label === 'template' && r1.confidence === 1.0, 'standard form matches');
assertEquals(r1.de, '• Suppe\n• Salat\n• Dessert', 'standard DE output');
assertEquals(r1.en, '• Soup\n• Salad\n• Dessert', 'standard EN output');

const r2 = matchTemplate('Suppe /Soup Salat / Salad Dessert');
assert(r2 !== null && r2.label === 'template', 'no-space variant matches');

const r3 = matchTemplate('Gemüsebouillon mit Backerbsen / Vegetable broth with baked peas(ACLM)');
assert(r3 === null, 'non-template returns null');

const m6 = matchTemplate('Suppe, kleiner Salat + Dessert / soup small salad and dessert');
assert(m6 !== null && m6.label === 'template' && m6.confidence === 1.0, 'M6 single-course template matches');
assertEquals(m6.de, '• Suppe, kleiner Salat + Dessert', 'M6 DE output');
assertEquals(m6.en, '• soup small salad and dessert', 'M6 EN output');

const m6Comma = matchTemplate('Suppe, kleiner Salat + Dessert, soup, small salad and dessert');
assert(m6Comma !== null && m6Comma.label === 'template', 'M6 comma variant matches');

const m6Space = matchTemplate('Suppe, kleiner Salat + Dessert  / soup small salad and dessert');
assert(m6Space !== null && m6Space.label === 'template', 'M6 double-space variant matches');

assert(matchTemplate('') === null, 'empty returns null');
assert(matchTemplate(null) === null, 'null returns null');

console.log('✅ All Template Unit Tests Passed!');
