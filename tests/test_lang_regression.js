// Regression gate for the DE/EN language splitter.
//
// It runs every menu text we have — the menu cache fixture (627 descriptions)
// and the live weeks captured from the canteen (80 descriptions) — through
// splitLanguage() and compares the result against a committed snapshot.
// Any change in label, confidence, course count or produced text fails the
// test, so accidental regressions become visible immediately.
//
// Regenerate the snapshot after an intended change:
//   UPDATE_LANG_SNAPSHOT=1 node tests/test_lang_regression.js

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const SNAPSHOT_PATH = path.join(__dirname, 'lang_regression_snapshot.json');

function cleanSrc(src) {
  return src
    .replace(/export /g, '')
    .replace(/import .*? from .*?;/g, '')
    .replace(/^(const|let) /gm, 'var ');
}

const LANG_MODULES = [
  'types.js',
  'normalize.js',
  'templates.js',
  'langModel.js',
  'langModelSeed.js',
  'loanwords.js',
  'alignTrailing.js',
  'blockFormat.js',
  'segment.js',
  'boundary.js',
  'score.js',
  'dishes.js',
  'splitter.js',
];

eval(
  LANG_MODULES
    .map((file) => cleanSrc(fs.readFileSync(path.join(ROOT, 'src/lang', file), 'utf8')))
    .join('\n')
);

const UPDATE = process.env.UPDATE_LANG_SNAPSHOT === '1';
const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));

function signature(de, en) {
  return crypto.createHash('sha256').update(de + '\u0000' + en).digest('hex').slice(0, 8);
}

function bulletCount(text) {
  return (text || '').split('\n').filter(Boolean).length;
}

function tokens(text) {
  return (text || '').toLowerCase().match(/[a-zäöüß0-9]{2,}/g) || [];
}

// Every word of the source description has to show up on either side.
function missingTokens(source, de, en) {
  const haystack = (de + ' ' + en).toLowerCase();
  const missing = new Set();
  for (const token of tokens(source)) {
    if (!haystack.includes(token)) missing.add(token);
  }
  return [...missing];
}

function menuCacheItems(source) {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, source), 'utf8'));
  const items = [];
  data.forEach((week) =>
    week.days.forEach((day) =>
      day.items.forEach((item) => {
        if (item.description) {
          items.push({
            id: `${week.year}-W${week.weekNumber} ${day.date} ${item.name}`,
            text: item.description,
          });
        }
      })
    )
  );
  return items;
}

function liveWeekItems(source) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, source), 'utf8'));
}

const failures = [];
const updated = [];
let checked = 0;

for (const dataset of snapshot.datasets) {
  const items = dataset.source === 'tests/test_kantine_menuCache.json'
    ? menuCacheItems(dataset.source)
    : liveWeekItems(dataset.source);

  if (items.length !== dataset.count) {
    failures.push(
      `[${dataset.name}] dataset size changed: expected ${dataset.count}, found ${items.length}`
    );
  }

  const rows = [];
  const infoLoss = [];

  items.forEach((item, index) => {
    const result = splitLanguage(item.text);
    const de = result.de || '';
    const en = result.en || '';

    if (!de.trim() || !en.trim()) {
      failures.push(`[${dataset.name}] ${item.id}: empty split`);
    }

    const row = {
      id: item.id,
      label: result.label,
      conf: Number((result.confidence || 0).toFixed(2)),
      de: bulletCount(de),
      en: bulletCount(en),
      sig: signature(de, en),
    };
    rows.push(row);
    checked++;

    const lost = missingTokens(item.text, de, en);
    if (lost.length) infoLoss.push({ id: item.id, tokens: lost });

    const expected = dataset.expect[index];
    if (!expected) {
      failures.push(`[${dataset.name}] ${item.id}: no snapshot entry`);
      return;
    }
    const changed = Object.keys(row).filter((key) => row[key] !== expected[key]);
    if (changed.length) {
      failures.push(
        `[${dataset.name}] ${item.id}\n` +
          `    changed: ${changed.join(', ')}\n` +
          `    expected: ${changed.map((k) => `${k}=${expected[k]}`).join(' ')}\n` +
          `    actual:   ${changed.map((k) => `${k}=${row[k]}`).join(' ')}\n` +
          `    de: ${de.replace(/\n/g, ' | ').slice(0, 220)}\n` +
          `    en: ${en.replace(/\n/g, ' | ').slice(0, 220)}`
      );
    }
  });

  const expectedLoss = dataset.infoLoss || [];
  const actualLoss = infoLoss.map((entry) => entry.id);
  const lost = actualLoss.filter((id) => !expectedLoss.includes(id));
  const restored = expectedLoss.filter((id) => !actualLoss.includes(id));
  if (lost.length || restored.length) {
    failures.push(
      `[${dataset.name}] info-loss set changed\n` +
        `    new: ${lost.join(', ') || 'none'}\n` +
        `    fixed: ${restored.join(', ') || 'none'}`
    );
  }

  updated.push({
    name: dataset.name,
    source: dataset.source,
    count: items.length,
    infoLoss: actualLoss,
    expect: rows,
  });
}

if (UPDATE) {
  const next = {
    generated: new Date().toISOString().slice(0, 10),
    datasets: updated,
  };
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(next, null, 1) + '\n');
  console.log(
    `📸 Snapshot updated: ${checked} menu texts across ${snapshot.datasets.length} datasets`
  );
  process.exit(0);
}

if (failures.length) {
  console.error(`❌ ${failures.length} regression(s) in ${checked} menu texts:`);
  failures.slice(0, 12).forEach((failure) => console.error(failure));
  if (failures.length > 12) console.error(`   ... and ${failures.length - 12} more`);
  process.exit(1);
}

console.log(
  `✅ Language regression snapshot matches (${checked} menu texts, ${snapshot.datasets.length} datasets)`
);
