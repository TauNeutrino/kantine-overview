const fs = require('fs');
const path = require('path');
const assert = require('assert');

const srcPath = path.join(__dirname, '../src/lang/langModel.js');
let code = fs.readFileSync(srcPath, 'utf8');
code = code.replace(/export function/g, 'function');

eval(code);

const TINY_MODEL = {
  version: 'test',
  trigramsDe: { 'mit': 5, 'und': 4, 'sch': 6, 'pfe': 3, 'ung': 7, 'kar': 4, 'eit': 3 },
  trigramsEn: { 'wit': 5, 'and': 4, 'the': 6, 'ing': 7, 'car': 4, 'ota': 3 },
  funcDe: ['mit', 'und'],
  funcEn: ['with', 'and']
};

const m = createLangModel(TINY_MODEL);

const result1 = m.scoreCharAffinities('Faschierter Braten');
assert(Array.isArray(result1), 'scoreCharAffinities returns array');
assert(result1.length === 'Faschierter Braten'.length, 'result length matches input length');
assert(result1[0].char === 'F', 'first char is F');
assert(typeof result1[0].affinity === 'number', 'affinity is a number');
assert(result1[0].affinity >= -1 && result1[0].affinity <= 1, 'affinity in [-1, +1]');

const result2 = m.scoreCharAffinities('');
assert(Array.isArray(result2) && result2.length === 0, 'empty string returns empty array');

const result3 = m.scoreCharAffinities('mit und');
const mitAffinity = result3[1].affinity;
const undAffinity = result3[5].affinity;
assert(mitAffinity > 0, 'mit trigram has positive (DE) affinity');
assert(undAffinity > 0, 'und trigram has positive (DE) affinity');

const result4 = m.scoreCharAffinities('with and');
const withAffinity = result4[1].affinity;
const andAffinity = result4[5].affinity;
assert(withAffinity < 0, 'wit trigram has negative (EN) affinity');
assert(andAffinity < 0, 'and trigram has negative (EN) affinity');

const result5 = m.scoreCharAffinities('123 !@#');
assert(result5.every(r => r.affinity === 0), 'non-alpha chars have zero affinity');

const result6 = m.scoreCharAffinities('sch pfe');
const schAffinity = result6[1].affinity;
const pfeAffinity = result6[5].affinity;
assert(schAffinity > 0, 'sch trigram has positive (DE) affinity');
assert(pfeAffinity > 0, 'pfe trigram has positive (DE) affinity');

console.log('✅ test_heatmap.js passed');
