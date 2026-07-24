// tests/auto-update-bootloader.test.js
// Structural + behavioral tests for the auto-update bootloader.
// Run: node tests/auto-update-bootloader.test.js

const { readFileSync } = require('fs');

// Extract bootloader code from bookmarklet
const raw = readFileSync('dist/bookmarklet.txt', 'utf8').trim();
const code = decodeURIComponent(raw.slice(11)); // strip 'javascript:' prefix

let failed = false;
const check = (name, pass) => {
  console.log(pass ? '✓' : '✗', name);
  if (!pass) failed = true;
};

// Test 1: bootloader structure keywords
check('CSS injection present', code.includes("createElement('style'"));
check('CSS has kantine-style id', code.includes("kantine-style"));
check('isNewer function present', code.includes('function isNewer'));
check('Version JSON fetch present', code.includes('version.json'));
check('fetchWithTimeout helper present', code.includes('fetchWithTimeout'));
check('Fallback present', code.includes('FALLBACK'));
check('window.__KANTINE_LOADED guard present', code.includes('__KANTINE_LOADED'));
check('No premature __KANTINE_LOADED = true', !code.includes('__KANTINE_LOADED = true'));
check('AbortController fallback present', code.includes('AbortController'));
check('Bundle code caching present (bundleCode)', code.includes('bundleCode'));
check('tryLoadCachedNewer offline-safe path present', code.includes('tryLoadCachedNewer'));
check('cacheVersion persists code', code.includes("bundleCode: code"));
check('try/catch around JSON.parse(localStorage)', code.includes('JSON.parse(localStorage') && code.includes('catch(e){}'));
check('Dev mode channel selection present', code.includes('kantine_dev_mode'));
check('Stable URL (rel-version.json) present', code.includes('rel-version.json'));
check('Dev URL (version.json on Pages) present', code.includes('tauneutrino.github.io/kantine-overview/version.json'));
check('Channel log present', code.includes('channel:'));

// Test 1c: Domain guard — must be present and run BEFORE any version.json fetch
check('Domain guard redirect present', code.includes("window.location.href = 'https://web.bessa.app/knapp-kantine'"));
check('Domain guard protocol/blob check present', code.includes("window.location.protocol === 'blob:'"));
check('Domain guard hostname check present', code.includes("window.location.hostname !== 'web.bessa.app'"));
var domainGuardIdx = code.indexOf("window.location.href = 'https://web.bessa.app/knapp-kantine'");
var versionFetchIdx = code.indexOf('version.json');
check('Domain guard appears before version.json fetch', domainGuardIdx !== -1 && versionFetchIdx !== -1 && domainGuardIdx < versionFetchIdx);
check('Domain guard appears before CSS injection', domainGuardIdx !== -1 && code.indexOf("createElement('style'") > domainGuardIdx);

// Test 1b: CSS bundling in CDN bundle
const bundleCode = readFileSync('dist/kantine-auto-update-bundle.js', 'utf8');
check('BUNDLED_CSS in CDN bundle', bundleCode.includes('BUNDLED_CSS'));
check('No {{CSS}} survivor in CDN bundle', !bundleCode.includes('{{CSS}}'));

// Test 2: version comparison (extracted from bootloader)
// Use greedy match to capture the ENTIRE function (up to the LAST return false + closing brace).
const isNewerSrc = code.match(/function isNewer[\s\S]*return false;\s*\}/);
if (isNewerSrc) {
  eval(isNewerSrc[0]);
  const vtests = [
    [isNewer('v1.10.6', 'v1.10.5'), true,  'v1.10.6 > v1.10.5'],
    [isNewer('v1.10.5', 'v1.10.6'), false, 'v1.10.5 < v1.10.6'],
    [isNewer('v1.10.5', 'v1.10.5'), false, 'equal'],
    [isNewer('v1.11.0', 'v1.10.99'), true, 'minor bump v1.11.0 > v1.10.99'],
    [isNewer('v2.0.0', 'v1.99.99'), true,  'major bump v2.0.0 > v1.99.99'],
    [isNewer('v1.10.5', 'v1.9.99'),  true,  'patch bump v1.10.5 > v1.9.99'],
  ];
  for (const [result, expected, label] of vtests) {
    check('isNewer: ' + label, result === expected);
  }
} else {
  check('isNewer function extractable', false);
}

process.exit(failed ? 1 : 0);
