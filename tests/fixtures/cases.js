// @ts-check
'use strict';
/**
 * cases.js — Curated, labeled test fixtures from tests/test_kantine_menuCache.json.
 * Pure data, no assertions. All strings are verbatim from the real cache.
 * Each entry: { desc: string, sourceRef: string }
 */

/** Standard 3-course menus fully anchored by allergen codes. */
const anchored = [
  {
    desc: 'Gemüsebouillon mit Backerbsen / Vegetable broth with baked peas(ACLM) Faschierter Braten mit Püree und Karotten / Minced meat roast with mashed potatoes and carrots(ACGLM) Milchreis / Rice pudding(G)',
    sourceRef: 'test_kantine_menuCache.json:15',
  },
  {
    desc: 'Pastinakencremesuppe / Parsnip cream soup(GLM) Gefüllte Hühnerbrust mit Ratatouille / Stuffed chicken breast with ratatouille(ACGLM) Punschwürfel / Punch cubes(ACGO)',
    sourceRef: 'test_kantine_menuCache.json:92',
  },
  {
    desc: 'Kräutercremesuppe / Herbal cream soup(GLM) Puten Cordon bleu mit Petersilienkartoffeln / Turkey cordon bleu with parsley potatoes(ACG) Kuchen / Cake(ACGHO)',
    sourceRef: 'test_kantine_menuCache.json:252',
  },
];

/** Slash exists but allergen anchor missing on at least one course boundary — Layer 3 needed. */
const hard = [
  {
    desc: 'Karfiolcremesuppe / Cauliflower cream soup Erdnuss-Curry mit Tofu und Reis / Peanut curry with tofu and rice(AFE) Kirschjoghurt / Cherry yogurt(F)',
    sourceRef: 'test_kantine_menuCache.json:205',
  },
  {
    desc: 'Hühnersuppe mit Reis / Chicken soup with rice Gratiniertes Schweine-Steak mit Polenta / Pork steak gratinated with polenta(ACGLM) Mini Plunder / Mini danishes(ACGHO)',
    sourceRef: 'test_kantine_menuCache.json:406',
  },
  {
    desc: 'Maissuppe / Corn soup Buchweizenlaibchen mit Gemüse / Buckwheat patties with vegetables(AFO) Walnuss-Cranberry Kuchen / Ealnut cranberry cake(AFH)',
    sourceRef: 'test_kantine_menuCache.json:282',
  },
];

/** M6 standard menu — zero allergen anchors, handled by template fast-path. */
const lexicalOnly = [
  {
    desc: 'Suppe / Soup Salat / Salad Dessert',
    sourceRef: 'test_kantine_menuCache.json:65',
  },
  {
    desc: 'Suppe / Soup Salat / Salad Dessert',
    sourceRef: 'test_kantine_menuCache.json:142',
  },
  {
    // no-space variant: "Suppe /Soup"
    desc: 'Suppe /Soup Salat / Salad Dessert',
    sourceRef: 'test_kantine_menuCache.json:379',
  },
];

/** Mono brand desserts: allergen present but NO slash — mirrored as mono courses. */
const mono = [
  {
    desc: 'Rindsuppe mit Grießnockerl / Beef Soup with semolina dumplings(ACGLM) Knacker mit Püree / Knacker sausage (pork) with puree(GLM) Balisto(ACGH)',
    sourceRef: 'test_kantine_menuCache.json:516',
  },
  {
    desc: 'Rindsuppe mit Frittaten / Beef soup with pancakes stripes(ACGLM) Gnocchi mit Schafskäse und Hühnerfleisch / Gnocchi with sheep chese and chicken(ACGLM) Milki Mum(G)',
    sourceRef: 'test_kantine_menuCache.json:175',
  },
  {
    // Cake is a mono brand dessert
    desc: 'Kräutercremesuppe / Herbal cream soup(GLM) Tagliatelle in Rahmsauce mit Spinat und Lachs / Tagliatelle in cream sauce with spinach and salomon(ACDGFLM) Kuchen / Cake(ACGHO)',
    sourceRef: 'test_kantine_menuCache.json:262',
  },
];

/** Known broken allergen patterns — must be repaired by normalize() before splitting. */
const brokenAllergen = [
  {
    // slash-before-allergen: /ACLM)
    desc: 'Rindsuppe mit Eierschöberl / Beef soup with egg pancakes/ACLM) Reisfleisch von der Pute / Turkey rice meat(LM) Obst / Fruit',
    sourceRef: 'test_kantine_menuCache.json:837',
  },
  {
    // slash-before-allergen: /ACLM) (second occurrence)
    desc: 'Rindsuppe mit Eierschöberl / Beef soup with egg pancakes/ACLM) Tortelloni Carne al Arabiatta mit Käse / Tortelloni with meat filling a la arabiatta with cheese(ACGLM) Obst / Fruit',
    sourceRef: 'test_kantine_menuCache.json:847',
  },
  {
    // slash-before-allergen: /GLM)
    desc: 'Karottencremesuppe / Carrot cream soup/GLM) Kräuterrahmschnitzel mit Serviettenknödel / Herb cream schnitzel (Pork) with bread dumplings',
    sourceRef: 'test_kantine_menuCache.json:broken-soup-allergen',
  },
  {
    // slash-before-allergen: /A)
    desc: 'Grillhendl mit Semmel / Grilled chicken with bread roll/A) gebackener Apfelring / Baked apple slice',
    sourceRef: 'test_kantine_menuCache.json:bread-roll',
  },
  {
    // allergen-internal slashes: (A/F/N)
    desc: 'Mango- Kokoscurry mit Reis / Mango- curry with rice(A/F/N) Vanillepudding / Vanilla pudding(F)',
    sourceRef: 'test_kantine_menuCache.json:internal-slash-allergen',
  },
];

/** Non-allergen parens (contain lowercase) — must NOT be treated as allergen codes. */
const nonAllergenParen = [
  {
    desc: 'Rindsuppe mit Frittaten / Beef soup with pancakes stripes(ACGLM) Boeuf Stroganoff(Beef) mit Spätzle / Beef stroganoff with spaetzle(ACGLM) Milki Mum(G)',
    sourceRef: 'test_kantine_menuCache.json:175',
  },
  {
    desc: 'Rindsuppe mit Kaspressknödel / Beef soup with cheese dumpling(ACGLM) Riz Casimir (Putencurry, Ananas) mit Mandel- Rosinenreis / Riz Casimir (turkey curry, pineapple) with almond- raisin rice(GLMHO) Kuchen / Cake(ACGHO)',
    sourceRef: 'test_kantine_menuCache.json:1245',
  },
  {
    desc: 'Weiße Zwiebelsuppe / White onion soup(GLM) Rotes Thaicurry(Rind) mit Reis / Red thai curry(beef) with Rice(GLNFM) Donut(ACGHO)',
    sourceRef: 'test_kantine_menuCache.json:583',
  },
];

/** Items with embedded operational notes — must be parked by normalize(). */
const notes = [
  {
    desc: 'Kürbiscremesuppe / Pumpkin cream Achtung Änderung Frisches Grillhendl mit Semmel (A) Kuchen / Cake (ACGHO)',
    sourceRef: 'test_kantine_menuCache.json:737',
  },
  {
    desc: 'KNAPP Pizza mit Schinken, Chorizo, Mozzarella, Paprika, Zwiebel... (AGM)                        !!!ACHTUNG!!!  DIE ABHOLUNG IST IM OG. DES WERKSRESTAURANTS',
    sourceRef: 'test_kantine_menuCache.json:1476',
  },
];

/** Allergen after the EN half tags the whole DE/EN pair (end-of-pair allergen). */
const endOfPairAllergen = [
  {
    desc: 'Gemüsebouillon mit Backerbsen / Vegetable broth with baked peas(ACLM) Faschierter Braten mit Püree und Karotten / Minced meat roast with mashed potatoes and carrots(ACGLM) Milchreis / Rice pudding(G)',
    sourceRef: 'test_kantine_menuCache.json:15',
  },
  {
    desc: 'Pastinakencremesuppe / Parsnip cream soup(GLM) Gefüllte Hühnerbrust mit Ratatouille / Stuffed chicken breast with ratatouille(ACGLM) Punschwürfel / Punch cubes(ACGO)',
    sourceRef: 'test_kantine_menuCache.json:92',
  },
];

module.exports = {
  anchored,
  hard,
  lexicalOnly,
  mono,
  brokenAllergen,
  nonAllergenParen,
  notes,
  endOfPairAllergen,
};
