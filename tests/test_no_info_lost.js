const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function cleanSrc(src) {
  return src
    .replace(/export /g, '')
    .replace(/import .*? from .*?;/g, '')
    .replace(/^(const|let) /gm, 'var ');
}

eval(
  cleanSrc(fs.readFileSync(path.join(ROOT, 'src/lang/types.js'), 'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT, 'src/lang/normalize.js'), 'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT, 'src/lang/templates.js'), 'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT, 'src/lang/langModel.js'), 'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT, 'src/lang/langModelSeed.js'), 'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT, 'src/lang/segment.js'), 'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT, 'src/lang/boundary.js'), 'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT, 'src/lang/score.js'), 'utf8')) + '\n' +
  cleanSrc(fs.readFileSync(path.join(ROOT, 'src/lang/splitter.js'), 'utf8'))
);

function tokenize(text) {
  return (text || '').toLowerCase().replace(/\//g, ' ').match(/[a-zäöüß]{2,}/g) || [];
}

var data = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/test_kantine_menuCache.json'), 'utf8'));
var items = [];
data.forEach(function(w) {
  w.days.forEach(function(d) {
    d.items.forEach(function(i) {
      if (i.description) items.push(i);
    });
  });
});

var failures = 0;
var failDetails = [];

items.forEach(function(item, idx) {
  var result = splitLanguage(item.description);
  var rawTokens = new Set(tokenize(item.description));
  var splitText = (result.de || '') + ' ' + (result.en || '') + ' ' + (result.notes || []).join(' ');
  var splitTokens = new Set(tokenize(splitText));

  var missing = Array.from(rawTokens).filter(function(t) { return !splitTokens.has(t); });
  if (missing.length > 0) {
    failures++;
    failDetails.push({
      idx: idx + 1,
      name: item.name,
      missing: missing,
      desc: item.description.slice(0, 80)
    });
  }
});

if (failures > 0) {
  console.error('❌ ' + failures + ' failures:');
  failDetails.slice(0, 10).forEach(function(f) {
    console.error('  Item ' + f.idx + ' (' + f.name + '): missing tokens: ' + f.missing.join(', '));
    console.error('    Desc: ' + f.desc);
  });
  process.exit(1);
} else {
  console.log('✅ 0 failures / ' + items.length + ' items — no information lost');
  process.exit(0);
}
