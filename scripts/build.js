#!/usr/bin/env node
/**
 * build.js — Platform-independent Kantine Bookmarklet Builder
 * Replaces: build-bookmarklet.sh + build.js (root) + test_build.py
 *
 * Pipeline:
 *   1. npm install (skip if node_modules exists)
 *   2. npx webpack
 *   3. Favicon resize (sharp optional — fallback to existing favicon.png)
 *   4. Read sources (CSS, JS bundle, mock data)
 *   5. Inject {{VERSION}}/{{FAVICON_DATA_URI}}
 *   6. Build kantine-standalone.html
 *   7. Build bookmarklet-payload.js + bookmarklet.txt (Terser minified)
 *   8. Build install.html (with changelog)
 *   9. Run JS tests (test_utils, test_logic, test_dom)
 *  10. Smoke check (baked model presence) + size guard
 *  11. Verify build artifacts (inline test_build.py logic)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Paths ──────────────────────────────────────────────────────────────────
const ROOT  = path.resolve(__dirname, '..');
const DIST  = path.join(ROOT, 'dist');
const CSS_FILE     = path.join(ROOT, 'style.css');
const VERSION_FILE = path.join(ROOT, 'version.txt');
const FAVICON_FILE = path.join(ROOT, 'favicon.png');
const FAVICON_BASE = path.join(ROOT, 'favicon_base.png');
const MOCK_JS_FILE = path.join(ROOT, 'mock-data.js');
const JS_BUNDLE    = path.join(DIST, 'kantine.bundle.js');
const CHANGELOG_MD = path.join(ROOT, 'changelog.md');

// ── State ──────────────────────────────────────────────────────────────────
let EXIT_CODE = 0;
const log   = (...a) => console.log(...a);
const warn  = (...a) => console.warn('⚠️ ', ...a);
const fail  = (...a) => { console.error('❌', ...a); EXIT_CODE = 1; };
const ok    = (...a) => console.log('✅', ...a);

function abortIfFailed() {
  if (EXIT_CODE !== 0) {
    console.error('\nBuild failed — aborting.');
    process.exit(EXIT_CODE);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function read(path_) {
  return fs.readFileSync(path_, 'utf8');
}

function exists(path_) {
  return fs.existsSync(path_);
}

function rmIfExists(path_) {
  try { fs.unlinkSync(path_); } catch (_) { /* ignore */ }
}

/** Run a shell command with 30s timeout. Throws on nonzero exit. */
function exec(cmd, opts = {}) {
  return execSync(cmd, {
    cwd: ROOT,
    timeout: 60_000,
    stdio: 'pipe',
    encoding: 'utf8',
    ...opts,
  });
}

/** Run a test file via Node. Returns true on success. */
function runNodeTest(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  if (!exists(absPath)) { warn(`Test not found: ${relPath} — skipped`); return true; }
  try {
    exec(`node "${absPath}"`);
    ok(`Test passed: ${relPath}`);
    return true;
  } catch (e) {
    fail(`Test FAILED: ${relPath}\n${e.stderr || e.message}`);
    return false;
  }
}

// ── 1. npm install (skip if node_modules exists) ──────────────────────────
function stepNpmInstall() {
  if (exists(path.join(ROOT, 'node_modules'))) {
    log('◻ node_modules exists — skipping npm install');
    return;
  }
  log('■ npm install...');
  exec('npm install --silent');
  ok('npm install done');
}

// ── 2. Webpack ────────────────────────────────────────────────────────────
function stepWebpack() {
  log('■ npx webpack...');
  exec('npx webpack');
  if (!exists(JS_BUNDLE)) {
    fail(`Webpack did not produce ${JS_BUNDLE}`);
    return;
  }
  ok(`Webpack bundle: ${(fs.statSync(JS_BUNDLE).size / 1024).toFixed(0)} KB`);
}

// ── 3. Favicon resize ─────────────────────────────────────────────────────
function stepFavicon() {
  if (exists(FAVICON_FILE) && fs.statSync(FAVICON_FILE).size < 100 * 1024) {
    log('◻ Existing favicon.png found — keeping as-is');
    return;
  }

  if (!exists(FAVICON_BASE)) {
    if (!exists(FAVICON_FILE)) fail(`No favicon.png found and no favicon_base.png to generate from`);
    else log('◻ Using existing favicon.png');
    return;
  }

  // Try sharp (prebuilt binaries for all platforms)
  let sharp;
  try { sharp = require('sharp'); } catch (_) { /* not installed */ }

  if (sharp) {
    try {
      sharp(FAVICON_BASE).resize(40, 40).toFile(FAVICON_FILE);
      const size = fs.statSync(FAVICON_FILE).size;
      if (size < 100 * 1024) { ok(`Favicon 40x40 generated (${(size / 1024).toFixed(0)} KB)`); return; }
      warn(`Resized favicon too large (${size} bytes) — using original`);
    } catch (e) {
      warn(`sharp resize failed: ${e.message}`);
    }
  } else {
    warn('sharp not available — install with: npm i -D sharp');
  }

  if (exists(FAVICON_FILE)) {
    const size = fs.statSync(FAVICON_FILE).size;
    if (size < 100 * 1024) { log(`◻ Using existing favicon (${(size / 1024).toFixed(0)} KB)`); return; }
    warn(`Existing favicon is ${(size / 1024).toFixed(0)} KB — too large for inline data URI`);
  }
  fail('No suitable favicon — create a small (<100 KB) favicon.png or install sharp');
}

// ── 4-5. Read sources + inject ───────────────────────────────────────────
function stepReadAndInject() {
  const VERSION   = read(VERSION_FILE).trim();
  const CSS       = read(CSS_FILE);
  const FAVICON_B64 = fs.readFileSync(FAVICON_FILE).toString('base64');
  const FAVICON_URL = `data:image/png;base64,${FAVICON_B64}`;
  const JS_BUNDLE_CONTENT = read(JS_BUNDLE);
  const MOCK_JS   = exists(MOCK_JS_FILE) ? read(MOCK_JS_FILE) : '';

  const JS_INJECTED = JS_BUNDLE_CONTENT
    .replace(/\{\{VERSION\}\}/g, VERSION)
    .replace(/\{\{FAVICON_DATA_URI\}\}/g, FAVICON_URL);

  return { VERSION, CSS, FAVICON_URL, JS_INJECTED, MOCK_JS };
}

// ── 6. Standalone HTML ────────────────────────────────────────────────────
function stepStandalone(ctx) {
  const html = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kantine Weekly Menu (Standalone)</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
    <style>
${ctx.CSS}
    </style>
</head>
<body>
    <script>
${ctx.MOCK_JS}
${ctx.JS_INJECTED}
    </script>
</body>
</html>`;

  fs.writeFileSync(path.join(DIST, 'kantine-standalone.html'), html);
  ok(`Standalone HTML: ${(html.length / 1024).toFixed(0)} KB`);
}

// ── 8. Installer HTML ─────────────────────────────────────────────────────
function stepInstaller(ctx) {
  const VERSION = read(VERSION_FILE).trim();

  // Changelog markdown → simple HTML
  let changelogHtml = '';
  if (exists(CHANGELOG_MD)) {
    changelogHtml = read(CHANGELOG_MD)
      .replace(/^## (.*)/gm, '<h3>$1</h3>')
      .replace(/^- (.*)/gm, '<li>$1</li>');
    // Wrap consecutive <li> in <ul>
    changelogHtml = changelogHtml.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
    changelogHtml = changelogHtml.replace(/<\/h3>\n?<ul>/g, '</h3><ul>');
  }

  // Build bookmarklet URL for install page
  const cssInjection =
    `var s=document.createElement('style');s.textContent='${ctx.CSS_ESC}';document.head.appendChild(s);`;
  const bookmarkletCode = 'javascript:(function(){' + cssInjection + ctx.JS_MIN + '})();';
  const encodedUrl = 'javascript:' + encodeURIComponent(bookmarkletCode.slice(11));

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Kantine Wrapper Installer (${VERSION})</title>
    <link rel="icon" type="image/png" href="${ctx.FAVICON_URL}">
    <style>
        body { font-family: 'Inter', sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; background: #1a1a2e; color: #eee; }
        h1 { color: #029AA8; }
        .instructions { background: #16213e; padding: 20px; border-radius: 12px; margin: 20px 0; }
        .instructions ol li { margin: 10px 0; }
        a.bookmarklet { display: inline-block; background: #029AA8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 18px; cursor: grab; }
        a.bookmarklet:hover { background: #006269; }
        code { background: #0f3460; padding: 2px 6px; border-radius: 4px; }
        details.styled-details { background: rgba(0,0,0,0.2); border-radius: 8px; overflow: hidden; }
        summary.styled-summary { padding: 15px; cursor: pointer; font-weight: bold; list-style: none; display: flex; justify-content: space-between; align-items: center; user-select: none; }
        summary.styled-summary:hover { background: rgba(255,255,255,0.05); }
        summary.styled-summary::-webkit-details-marker { display: none; }
        summary.styled-summary::after { content: '\\25BE'; font-size: 0.8em; transition: transform 0.2s; }
        details.styled-details[open] summary.styled-summary::after { transform: rotate(180deg); }
        .changelog-container { padding: 0 15px 15px 15px; border-top: 1px solid rgba(255,255,255,0.05); }
    </style>
</head>
<body>
    <div id="banner-video-wrap" style="width: 100%; max-width: 600px; margin: 0 auto 20px auto; border-radius: 12px; overflow: hidden; pointer-events: none; user-select: none; max-height: 400px; opacity: 1; transition: max-height 0.8s ease-in-out, opacity 0.6s ease-in-out, margin 0.8s ease-in-out;">
        <video id="banner-video" autoplay muted playsinline disablepictureinpicture style="width: 100%; display: block;" src="https://github.com/TauNeutrino/kantine-overview/raw/main/dist/Arrow_and_fork_fly_away_bd43310bea.mp4"></video>
    </div>
    <script>
        document.getElementById('banner-video').addEventListener('ended', function() {
            var w = document.getElementById('banner-video-wrap');
            w.style.maxHeight = '0';
            w.style.opacity = '0';
            w.style.marginBottom = '0';
        });
    </script>

    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="margin-bottom: 5px; display: flex; align-items: center; justify-content: center; gap: 10px;">
            <img src="${ctx.FAVICON_URL}" alt="Logo" style="width: 40px; height: 40px;"> 
            Kantine Wrapper 
            <span style="font-size:0.5em; opacity:0.6; font-weight:400; margin-left:5px;">${VERSION}</span>
        </h1>
        <p style="font-size: 1.2rem; color: #a0aec0; margin-top: 0; font-style: italic;">"Mahlzeit! Jetzt bessa einfach."</p>
    </div>
    
    <div class="card" style="text-align: center; border: 2px solid #029AA8;">
        <p style="margin-bottom:15px; font-weight:bold;">&#x1F4D6; Diesen Button in die Lesezeichen-Leiste ziehen:</p>
        <p><a class="bookmarklet" id="bookmarklet-link" href="${encodedUrl}" title="Nicht klicken! Ziehe mich in deine Lesezeichen-Leiste.">Kantine ${VERSION}</a></p>
    </div>

    <div class="card">
         <h2>So funktioniert's</h2>
    <ol>
        <li>Ziehe den Button oben in deine <strong>Lesezeichen-Leiste</strong> (Drag & Drop)</li>
        <li>Navigiere zu <a href="https://web.bessa.app/knapp-kantine" style="color:#029AA8">web.bessa.app/knapp-kantine</a></li>
        <li>Klicke auf das Lesezeichen <code>Kantine ${VERSION}</code></li>
    </ol>
    </div>

    <div class="card">
    <h2>&#x2728; Features</h2>
    <ul>
        <li>&#x1F4C5; <strong>Wochen&#x00FC;bersicht:</strong> Die ganze Woche auf einen Blick.</li>
        <li>&#x23F0; <strong>Order Countdown:</strong> Roter Alarm 1h vor Bestellschluss.</li>
        <li>&#x2B50; <strong>Smart Highlights:</strong> Markiere deine Favoriten (z.B. "Schnitzel").</li>
        <li>&#x1F4B0; <strong>Kostenkontrolle:</strong> Automatische Berechnung der Wochensumme.</li>
        <li>&#x1F511; <strong>Auto-Login:</strong> Nutzt deine bestehende Session.</li>
        <li>&#x1F3F7;&#xFE0F; <strong>Badges & Status:</strong> Men&#x00FC;-Codes (M1, M2) und Bestellstatus direkt sichtbar.</li>
    </ul>

    <div style="margin-top: 30px; padding: 15px; background: rgba(233, 69, 96, 0.1); border: 1px solid rgba(233, 69, 96, 0.3); border-radius: 8px; font-size: 0.85em; color: #ddd;">
             <strong>&#x26A0;&#xFE0F; Haftungsausschluss:</strong><br>
             Die Verwendung dieses Bookmarklets erfolgt auf eigene Verantwortung. Der Entwickler &#x00FC;bernimmt keine Haftung f&#x00FC;r Sch&#x00E4;den, Datenverlust oder ungewollte Bestellungen, die durch die Nutzung dieser Software entstehen.
    </div>
    </div>

    <div class="card">
        <details class="styled-details">
            <summary class="styled-summary">Changelog & Version History</summary>
            <div class="changelog-container">
                ${changelogHtml}
            </div>
        </details>
    </div>

    <div style="text-align: center; margin-top: 40px; color: #5c6b7f; font-size: 0.8rem;">
        <p>Powered by <strong>Kaufis-Kitchen</strong> &#x1F373;&#x1F527;</p>
    </div>

    <script>
        setTimeout(function() {
            document.querySelectorAll('link[rel*="icon"]').forEach(function(el) { el.remove(); });
            var fi = document.createElement('link');
            fi.rel = 'icon';
            fi.type = 'image/png';
            fi.href = '${ctx.FAVICON_URL}';
            document.head.appendChild(fi);
        }, 0);
    </script>
</body>
</html>`;

  fs.writeFileSync(path.join(DIST, 'install.html'), html);
  ok(`Installer page: ${(html.length / 1024).toFixed(0)} KB`);
}

// ── 9. Run JS tests ───────────────────────────────────────────────────────
function stepTests(ctx) {
  const VERSION = ctx.VERSION;
  log('\n■ Running tests...');
  // Build-integrated tests from old build-bookmarklet.sh
  const tests = [
    'tests/test_utils.js',
    'test_logic.js',
    'tests/test_dom.js',
  ];
  let allPassed = true;
  for (const t of tests) {
    if (!runNodeTest(t)) allPassed = false;
  }

  // test_build.py equivalent — inline artifact verification
  log('   Verifying build artifacts...');
  const artifacts = [
    { path: path.join(DIST, 'install.html'),         name: 'Installer HTML' },
    { path: path.join(DIST, 'bookmarklet.txt'),      name: 'Bookmarklet Text' },
    { path: path.join(DIST, 'kantine-standalone.html'), name: 'Standalone HTML' },
  ];
  let artOk = true;
  for (const a of artifacts) {
    if (!exists(a.path))      { fail(`Artifact MISSING: ${a.name}`); artOk = false; }
    else if (fs.statSync(a.path).size === 0) { fail(`Artifact EMPTY: ${a.name}`); artOk = false; }
    else                      { ok(`Artifact: ${a.name}`); }
  }
  if (!artOk) allPassed = false;

  const bmPath = path.join(DIST, 'bookmarklet.txt');
  let bmOk = true;
  if (exists(bmPath)) {
    const bmContent = read(bmPath).trim();
    if (!bmContent.startsWith('javascript:')) {
      fail('bookmarklet.txt does not start with "javascript:"'); bmOk = false;
    }
    const decoded = decodeURIComponent(bmContent);
    if (!decoded.includes("document.createElement('style'")) {
      fail('CSS injection logic missing in bookmarklet'); bmOk = false;
    }
    if (decoded.includes('{{VERSION}}')) {
      fail('Unreplaced {{VERSION}} placeholder in bookmarklet'); bmOk = false;
    }
    if (bmOk) ok('Bookmarklet content verified');
    else allPassed = false;
  }

  // Verify installer HTML content
  const instPath = path.join(DIST, 'install.html');
  if (exists(instPath)) {
    const inst = read(instPath);
    const checks = [
      ['Version present',          () => inst.includes(VERSION)],
      ['Has "So funktioniert\'s"',  () => inst.includes("So funktioniert")],
      ['Has changelog-container',   () => inst.includes('changelog-container')],
    ];
    for (const [label, check] of checks) {
      if (!check()) { fail(`Installer ${label}`); allPassed = false; }
      else { ok(`Installer ${label}`); }
    }
  }

  if (allPassed) log('🎉 All tests passed.');
  else { fail('Some tests failed — see above.'); EXIT_CODE = 1; }
}

// ── 10. Smoke check + size guard ──────────────────────────────────────────
function stepSmokeAndSize(ctx) {
  log('\n■ Smoke check + size guard...');

  // Smoke: baked language model in bundle
  const bundleContent = read(JS_BUNDLE);
  if (!bundleContent.includes('trigramsDe')) {
    fail('Smoke check: baked model (trigramsDe) not found in bundle');
  } else {
    ok('Smoke check: baked model present in bundle');
  }

  // Size guard: bookmarklet must not grow beyond baseline + 3 KB
  const BASELINE_BOOKMARKLET_SIZE = 205000;
  const MAX_GROWTH = 5120;
  const size = ctx.BOOKMARKLET_SIZE || 0;
  if (size > BASELINE_BOOKMARKLET_SIZE + MAX_GROWTH) {
    fail(`Size guard: bookmarklet.txt ${size} bytes, growth ${size - BASELINE_BOOKMARKLET_SIZE} > ${MAX_GROWTH}`);
  } else {
    ok(`Size guard: ${size} bytes (growth ${size - BASELINE_BOOKMARKLET_SIZE}/${MAX_GROWTH})`);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const version = read(VERSION_FILE).trim();
  console.log(`=== Kantine Bookmarklet Builder (${version}) ===`);
  console.log(`Platform: ${process.platform} | Node: ${process.version}\n`);

  // 1. npm install
  stepNpmInstall();
  abortIfFailed();

  // 2. Webpack
  stepWebpack();
  abortIfFailed();

  // 3. Favicon
  stepFavicon();
  abortIfFailed();

  // 4-5. Read + inject
  const ctx = stepReadAndInject();

  // 6. Standalone
  stepStandalone(ctx);

  // 7. Bookmarklet (async inside — use promise)
  const terser = require('terser');
  const CSS = read(CSS_FILE);
  const CSS_ONE_LINE = CSS
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .replace(/\n/g, ' ').replace(/  +/g, ' ');

  const minifyResult = await terser.minify(ctx.JS_INJECTED, { compress: true, mangle: true });
  if (minifyResult.error) { fail(`Terser: ${minifyResult.error}`); process.exit(1); }

  const JS_MIN = minifyResult.code;
  const CSS_ESC = CSS_ONE_LINE.replace(/'/g, "\\'");

  const payload = `javascript:(function(){
if(window.__KANTINE_LOADED){alert('Kantine Wrapper already loaded!');return;}
var s=document.createElement('style');s.textContent='${CSS_ESC}';document.head.appendChild(s);
var sc=document.createElement('script');
sc.textContent=${JSON.stringify(JS_MIN)};
document.head.appendChild(sc);
})();`;

  fs.writeFileSync(path.join(DIST, 'bookmarklet-payload.js'), payload);
  ok(`Bookmarklet payload: ${(payload.length / 1024).toFixed(0)} KB`);

  const encoded = 'javascript:' + encodeURIComponent(payload.slice(11));
  fs.writeFileSync(path.join(DIST, 'bookmarklet.txt'), encoded);
  ok(`Bookmarklet URL: ${(encoded.length / 1024).toFixed(0)} KB`);

  ctx.CSS_ESC = CSS_ESC;
  ctx.JS_MIN  = JS_MIN;
  ctx.BOOKMARKLET_SIZE = encoded.length;
  abortIfFailed();

  // 8. Installer
  stepInstaller(ctx);
  abortIfFailed();

  // 9. Tests
  stepTests(ctx);

  // 10. Smoke + size
  stepSmokeAndSize(ctx);

  // ── Summary ────────────────────────────────────────────────────────────
  console.log('\n=== Build Complete ===');
  if (exists(DIST)) {
    fs.readdirSync(DIST).forEach(f => {
      const p = path.join(DIST, f);
      if (fs.statSync(p).isFile()) {
        console.log(`  ${f}: ${(fs.statSync(p).size / 1024).toFixed(0)} KB`);
      }
    });
  }

  if (EXIT_CODE !== 0) {
    console.error(`\nBuild finished with errors (exit code ${EXIT_CODE}).`);
    process.exit(EXIT_CODE);
  }
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
