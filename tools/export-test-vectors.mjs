import { splitLanguage } from '../src/lang/splitter.js';

const TEST_INPUTS = [
  // DE-only (mono)
  'Vanillapudding',
  'Grießbrei',
  'Bauernomelett',
  'Käsespätzle',

  // EN-only (mono)
  'Chicken Nuggets',
  'Fish and Chips',
  'Pasta Salad',

  // Mixed DE/EN with slash
  'Rindsroulade / Beef rolls',
  'Kartoffelsuppe / Potato soup',
  'Schnitzel mit Pommes / Schnitzel with fries',
  'Spaghetti Bolognese / Spaghetti Bolognese',
  'Gemüsecurry mit Reis (A) / Vegetable curry with rice (A)',
  'Hähnchenbrust mit Reis und Gemüse (1,2,3) / Chicken breast with rice and vegetables (1,2,3)',

  // Multiple courses (separate lines with allergens)
  'Rindssuppe mit Frittaten / Beef broth with pancakes (A,C)\nSchnitzel mit Reis / Schnitzel with rice (A)\nGemischter Salat / Mixed salad',

  // With allergens in various forms
  'Rindfleischsuppe (A)',
  'Käsespätzle (A,C,G)',
  'Pizza Salami (A,D) / Pizza Salami (A,D)',
  'Burger mit Pommes (A) / Burger with fries (A)',

  // Slash-separator
  'Suppe / Soup Salat / Salad Dessert',
  'Pasta / Pasta Salat / Salad',

  // Template match
  'Suppe / Soup Salat / Salad Dessert',

  // With allergen-internal slashes
  'Schnitzel (A/F/N) / Schnitzel (A/F/N)',

  // Edge: empty string
  '',
  // Edge: only whitespace
  '   ',
  // Edge: umlauts
  'Müsli mit Joghurt (A) / Muesli with yoghurt (A)',
  'Süßkartoffelsuppe / Sweet potato soup',
  'Käse-Lauch-Suppe / Cheese-leek soup',

  // Special chars
  'Döner / Doner',
  'Bauerntopf mit Rind (A, C) / Farmer pot with beef (A, C)',

  // Loanword-heavy
  'Risotto mit Pilzen / Risotto with mushrooms',
  'Pasta mit Pesto / Pasta with pesto',
  'Tiramisu (A,G) / Tiramisu (A,G)',

  // Mono with allergen
  'Vanillepudding mit Schokolade (A,G)',

  // Complex mixed scenarios
  'Rahmschnitzel (A) / Cream schnitzel (A)\nButtergemüse (A) / Buttered vegetables (A)\nPommes frites / French fries',
  'Asia Nudeln (A) / Asian noodles (A)\nFrühlingsrolle / Spring roll',
  'Cordon Bleu (A) / Cordon Bleu (A)\nBratkartoffeln / Fried potatoes',
  'Hühnerfrikassee / Chicken fricassee',
  'Wurstsalat mit Pommes / Sausage salad with fries',
];

const results = [];
for (const input of TEST_INPUTS) {
  const result = splitLanguage(input);
  results.push({
    input,
    expected: {
      de: result.de,
      en: result.en,
      confidence: result.confidence,
      label: result.label,
    },
  });
}

import { writeFileSync } from 'fs';
const outPath = new URL('../.omo/evidence/task-9-android-app/test-vectors.json', import.meta.url);
writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
console.log(`Wrote ${results.length} test vectors to ${outPath.pathname}`);
