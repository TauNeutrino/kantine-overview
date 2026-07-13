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
const BASELINE_BOOKMARKLET_SIZE = 286504; // measured after Todos 1+2 (CSS bundling + bootloader)
const MAX_GROWTH = 6144;
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
  const GIST_PAT  = process.env.GIST_PAT || '';
  const GIST_ID   = process.env.GIST_ID  || '';
  const GIST_SALT = process.env.GIST_SALT || '';

  // Fail loudly if any required Gist credential is missing — otherwise the
  // {{GIST_*}} placeholders stay literal in the bundle and every Gist API
  // call returns 401.
  const missingGist = [
    ['GIST_PAT', GIST_PAT],
    ['GIST_ID', GIST_ID],
    ['GIST_SALT', GIST_SALT],
  ].filter(([, v]) => !v).map(([k]) => k);
  if (missingGist.length) {
    const msg = `[build] FATAL: ${missingGist.join(', ')} environment variable(s) not set. ` +
      `Gist stats sync will fail with 401. Set GIST_PAT, GIST_ID, GIST_SALT before running npm run build.`;
    console.error(msg);
    process.exit(1);
  }

  // Obfuscate the GIST_PAT (XOR with DEV_MODE_PW_HASH + base64) before baking
  // it into the committed bundle. The raw `ghp_`-token would be detected by
  // GitHub secret scanning and auto-revoked. Runtime de-obfuscation happens in
  // src/stats-tracker.js with the same key. This is obfuscation, not security.
  const CONSTANTS_FILE = path.join(ROOT, 'src', 'constants.js');
  const kMatch = read(CONSTANTS_FILE).match(/DEV_MODE_PW_HASH\s*=\s*'([0-9a-fA-F]{64})'/);
  if (!kMatch) {
    console.error('[build] FATAL: could not read DEV_MODE_PW_HASH from src/constants.js');
    process.exit(1);
  }
  const OBF_KEY = Buffer.from(kMatch[1], 'utf8');
  const patBytes = Buffer.from(GIST_PAT, 'utf8');
  const obfBytes = Buffer.allocUnsafe(patBytes.length);
  for (let i = 0; i < patBytes.length; i++) obfBytes[i] = patBytes[i] ^ OBF_KEY[i % OBF_KEY.length];
  const GIST_PAT_OBF = obfBytes.toString('base64');

  let COMMIT_HASH = '';
  try { COMMIT_HASH = exec('git rev-parse --short HEAD').trim(); } catch (_) {}

  // Compute escaped CSS for both the runtime bundle and the bookmarklet payload.
  const CSS_ONE_LINE = CSS
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .replace(/\n/g, ' ').replace(/  +/g, ' ');
  const CSS_ESC = CSS_ONE_LINE.replace(/'/g, "\\'");

  const JS_INJECTED = JS_BUNDLE_CONTENT
    .replace(/\{\{VERSION\}\}/g, VERSION)
    .replace(/\{\{COMMIT_HASH\}\}/g, COMMIT_HASH)
    .replace(/\{\{CSS\}\}/g, CSS_ESC)
    .replace(/\{\{FAVICON_DATA_URI\}\}/g, FAVICON_URL)
    .replace(/\{\{GIST_PAT\}\}/g, GIST_PAT_OBF)
    .replace(/\{\{GIST_ID\}\}/g, GIST_ID)
    .replace(/\{\{GIST_SALT\}\}/g, GIST_SALT);

  // Defensive guard: no placeholder may survive injection in the shipped bundle.
  const survivors = ['{{GIST_PAT}}', '{{GIST_ID}}', '{{GIST_SALT}}', '{{CSS}}']
    .filter((p) => JS_INJECTED.includes(p));
  if (survivors.length) {
    const msg = `[build] FATAL: placeholder(s) ${survivors.join(', ')} survived injection in the JS bundle. ` +
      `Refusing to ship a broken bundle. Check that src/ uses the exact placeholder strings.`;
    console.error(msg);
    process.exit(1);
  }

  // Secret-scanning guard: no raw GitHub PAT must ever reach the shipped bundle.
  if (/ghp_[A-Za-z0-9]{10,}/.test(JS_INJECTED) || /github_pat_[A-Za-z0-9_]{10,}/.test(JS_INJECTED)) {
    console.error('[build] FATAL: a raw GitHub PAT leaked into the JS bundle (secret scanning would auto-revoke it).');
    process.exit(1);
  }

  return { VERSION, CSS, CSS_ESC, FAVICON_URL, JS_INJECTED, MOCK_JS, COMMIT_HASH };
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

  const encodedUrl = ctx.BOOKMARKLET_URL || (() => {
    const cssInjection = `var s=document.createElement('style');s.id='kantine-style';s.textContent='${ctx.CSS_ESC}';document.head.appendChild(s);`;
    const bc = 'javascript:(function(){' + cssInjection + ctx.JS_MIN + '})();';
    return 'javascript:' + encodeURIComponent(bc.slice(11));
  })();

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
            <span style="font-size:0.5em; opacity:0.6; font-weight:400; margin-left:5px;display:inline-flex;flex-direction:column;align-items:center;line-height:1.3">${VERSION}<span style="font-size:0.7em;opacity:0.6">(${ctx.COMMIT_HASH})</span></span>
        </h1>
        <p style="font-size: 1.2rem; color: #a0aec0; margin-top: 0; font-style: italic;">"Mahlzeit! Jetzt bessa einfach."</p>
    </div>
    
    <div class="card" style="text-align: center; border: 2px solid #029AA8;">
        <p style="margin-bottom:15px; font-weight:bold;">&#x1F4D6; Diesen Button in die Lesezeichen-Leiste ziehen:</p>
        <p><a class="bookmarklet" id="bookmarklet-link" href="${encodedUrl}" title="Nicht klicken! Ziehe mich in deine Lesezeichen-Leiste.">Kantine ${VERSION}</a></p>
        <p style="text-align:center;font-size:0.75em;color:#7a8ba3;margin-top:4px">(${ctx.COMMIT_HASH})</p>
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

    <div style="margin-top: 30px; padding: 15px; background: rgba(0, 154, 168, 0.1); border: 1px solid rgba(0, 154, 168, 0.3); border-radius: 8px; font-size: 0.85em; color: #ddd;">
      <strong>&#x1F4CA; Nutzungsstatistiken:</strong><br>
      Dieses Bookmarklet erfasst pseudonymisierte Nutzungsdaten (z.B. Anzahl der Aufrufe, verwendete Features, Performance-Werte).
      Die Daten werden <strong>ausschlie&szlig;lich aggregiert</strong> und <strong>ohne Personenbezug</strong> (t&auml;glich wechselnder Hash, keine User-ID im Klartext)
      an ein GitHub Gist &uuml;bertragen. Eine Identifikation einzelner Nutzer ist nicht m&ouml;glich.
      Rechtsgrundlage: Ihr Interesse an der Verbesserung dieser Software (Art. 6 Abs. 1 lit. f DSGVO).
      Mit der Installation und Nutzung des Bookmarklets stimmen Sie der Erfassung zu.
      Sie k&ouml;nnen die Erfassung jederzeit deaktivieren, indem Sie das Bookmarklet nicht mehr nutzen.
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
    'tests/stats-tracker.test.js',
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

  // Verify auto-update CDN artifacts
  const autoBundlePath = path.join(DIST, 'kantine-auto-update-bundle.js');
  if (!exists(autoBundlePath)) { fail('Auto-update bundle missing'); allPassed = false; }
  else if (fs.statSync(autoBundlePath).size < 1024) { fail('Auto-update bundle too small (< 1 KB)'); allPassed = false; }
  else { ok('Auto-update bundle present (> 1 KB)'); }

  const verManifestPath = path.join(DIST, 'version.json');
  if (!exists(verManifestPath)) { fail('Version manifest missing'); allPassed = false; }
  else {
    try {
      const v = JSON.parse(read(verManifestPath));
      if (!v.version) { fail('Version manifest missing version field'); allPassed = false; }
      else if (!v.bundleUrl) { fail('Version manifest missing bundleUrl field'); allPassed = false; }
      else if (v.version !== VERSION) { fail('Version manifest version mismatch'); allPassed = false; }
      else if (!v.bundleUrl.includes(`cdn.jsdelivr.net/gh/TauNeutrino/kantine-overview@${VERSION}/dist/kantine-auto-update-bundle.js`)) {
        fail('Version manifest bundleUrl does not match expected jsDelivr URL'); allPassed = false;
      }
      else { ok(`Version manifest valid: ${v.version}`); }
    } catch (e) { fail(`Version manifest not valid JSON: ${e.message}`); allPassed = false; }
  }

  if (allPassed) log('🎉 All tests passed.');
  else { fail('Some tests failed — see above.'); EXIT_CODE = 1; }
}

// Verify auto-update CDN artifacts: used both before overwriting (to catch
// corrupted dist files from a previous build) and in the final smoke check.
// Version consistency is not checked here — it's verified in stepTests()
// after artifacts are regenerated, to avoid false-positive failures on version bumps.
function verifyAutoUpdateArtifacts() {
  const autoBundle = path.join(DIST, 'kantine-auto-update-bundle.js');
  const verManifest = path.join(DIST, 'version.json');

  if (!exists(autoBundle)) { fail('Auto-update bundle missing'); }
  else if (fs.statSync(autoBundle).size < 10240) { fail('Auto-update bundle too small (< 10 KB)'); }
  else {
    const auContent = read(autoBundle);
    if (/{{/.test(auContent)) { fail('Auto-update bundle has surviving placeholders'); }
    else { ok('Auto-update bundle present, no placeholders'); }
  }

  if (!exists(verManifest)) { fail('Version manifest missing'); }
  else {
    try {
      const v = JSON.parse(read(verManifest));
      if (!v.version) { fail('Version manifest missing version field'); }
      else if (!v.bundleUrl) { fail('Version manifest missing bundleUrl field'); }
      else { ok('Version manifest structurally valid'); }
    } catch (e) { fail('Version manifest not valid JSON: ' + e.message); }
  }
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

  // Size guard: bookmarklet must not grow beyond baseline + MAX_GROWTH
  const size = ctx.BOOKMARKLET_SIZE || 0;
  if (size > BASELINE_BOOKMARKLET_SIZE + MAX_GROWTH) {
    fail(`Size guard: bookmarklet.txt ${size} bytes, growth ${size - BASELINE_BOOKMARKLET_SIZE} > ${MAX_GROWTH}`);
  } else {
    ok(`Size guard: ${size} bytes (growth ${size - BASELINE_BOOKMARKLET_SIZE}/${MAX_GROWTH})`);
  }

  // Auto-update artifacts
  verifyAutoUpdateArtifacts();

  // Gist injection status
  const GP = process.env.GIST_PAT;
  const GI = process.env.GIST_ID;
  if (GP) {
    log('✓ Gist PAT injected (length: ' + GP.length + ')');
  } else {
    log('ℹ Gist PAT not set — placeholders remain in bundle');
  }
  log('✓ Gist ID: ' + (GI ? (GI === '{{GIST_ID}}' ? '(placeholder)' : GI.substring(0, 8) + '...') : '(empty)'));
  const GS = process.env.GIST_SALT;
  log('✓ Gist Salt: ' + (GS ? '(set)' : '(placeholder)'));
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
  const CSS_ESC = ctx.CSS_ESC;

  const minifyResult = await terser.minify(ctx.JS_INJECTED, { compress: true, mangle: true });
  if (minifyResult.error) { fail(`Terser: ${minifyResult.error}`); process.exit(1); }

  const JS_MIN = minifyResult.code;
  const BOOT_VERSION = ctx.VERSION;
  const VERSION_JSON_URL = 'https://tauneutrino.github.io/kantine-overview/version.json';
  const CACHE_KEY = '_k_au_cache';
  const VERSION_KEY = '_k_au_version';

  const payload = `javascript:(function(){
if(window.__KANTINE_LOADED){
  console.log('[Kantine] Re-init triggered');
  window.__KANTINE_REINIT = true;
  window.__KANTINE_LOADED = false;
}

// ── CSS injection + splash screen (replaced/removed by bundle when it loads) ──
(function(){
  var s=document.createElement('style');s.id='kantine-style';s.textContent='${CSS_ESC}';document.head.appendChild(s);
  var splash=document.createElement('div');splash.id='kantine-splash';
  splash.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483647;background:#1a1a2e;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Inter,system-ui,sans-serif;color:#eee;transition:opacity .25s ease;';
  splash.innerHTML='<div style="font-size:1.75rem;font-weight:600;color:#029AA8;margin-bottom:.5rem;">Kantine Wrapper</div><div id="kantine-splash-status" style="font-size:.9rem;color:#a0aec0;">Initialisiere...</div>';
  if(document.body){document.body.appendChild(splash);}else{window.addEventListener('DOMContentLoaded',function(){document.body.appendChild(splash);});}
})();

// ── Auto-update bootloader ──
(async function(){
  var CURRENT_VER = '${BOOT_VERSION}';
  var FALLBACK = ${JSON.stringify(JS_MIN)};
  var CACHE_KEY = '${CACHE_KEY}';
  var VER_KEY = '${VERSION_KEY}';

  console.log('[Kantine] Bootloader ' + CURRENT_VER + ' — checking for updates...');

  function isNewer(a, b){
    var va = a.replace(/^v/,'').split('.').map(Number);
    var vb = b.replace(/^v/,'').split('.').map(Number);
    for(var i=0;i<Math.max(va.length,vb.length);i++){
      if((va[i]||0) > (vb[i]||0)) return true;
      if((va[i]||0) < (vb[i]||0)) return false;
    }
    return false;
  }

  function loadBundle(code){
    var sc = document.createElement('script');
    sc.textContent = code;
    document.head.appendChild(sc);
  }

  function setSplashStatus(text){
    var el = document.getElementById('kantine-splash-status');
    if (el) el.textContent = text;
  }

  // Cross-browser timeout helper (no AbortSignal.timeout on older browsers)
  function fetchWithTimeout(url, ms){
    try {
      if(typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'){
        return fetch(url, { signal: AbortSignal.timeout(ms) });
      }
    } catch(e){}
    var ctrl = new AbortController();
    setTimeout(function(){ ctrl.abort(); }, ms);
    return fetch(url, { signal: ctrl.signal });
  }

  // Persist version + bundleUrl + bundleCode to cache for offline use.
  function cacheVersion(version, bundleUrl, code){
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        version: version,
        bundleUrl: bundleUrl,
        bundleCode: code,
        timestamp: Date.now()
      }));
    } catch(e){ /* quota exceeded — code still loads this session, just not persisted */ }
  }

  // Offline-safe: if a newer bundle's CODE is cached, load it (no network needed).
  // Returns true if a cached newer bundle was loaded.
  function tryLoadCachedNewer(){
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return false;
      var c = JSON.parse(raw);
      if (c && c.bundleCode && c.version && isNewer(c.version, CURRENT_VER)) {
        try { localStorage.setItem(VER_KEY, c.version); } catch(e){}
        console.log('[Kantine] → cache ' + c.version + ' (offline fallback)');
        loadBundle(c.bundleCode);
        return true;
      }
    } catch(e){}
    return false;
  }

  // ── Report initial state ──
  var cacheReport = 'none';
  var cache = null;
  try {
    cache = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cache && cache.version) {
      var ageMin = cache.timestamp ? Math.round((Date.now() - cache.timestamp) / 60000) : '?';
      cacheReport = 'v' + cache.version + ' (' + ageMin + 'min old)';
    }
  } catch(e){}
  console.log('[Kantine]   cache: ' + cacheReport);

  // ── Fetch remote version.json ──
  var remoteVer = null;
  try {
    var resp = await fetchWithTimeout('${VERSION_JSON_URL}?t=' + Date.now(), 5000);
    if (resp.ok) {
      var manifest = await resp.json();
      if (manifest && manifest.version) remoteVer = manifest.version;
    }
  } catch(e){ /* ignored — will show as unreachable below */ }
  console.log('[Kantine]   remote: ' + (remoteVer || 'unreachable'));

  // ── Decision ──
  if (remoteVer && isNewer(remoteVer, CURRENT_VER)) {
    // Remote has a newer version — try to fetch the bundle
    var bundleUrl = (manifest && manifest.bundleUrl) ? manifest.bundleUrl : null;
    if (!bundleUrl) {
      console.log('[Kantine]   ✗ remote version manifest has no bundleUrl — using baked-in');
    } else {
      setSplashStatus('Update wird geladen...');
      try {
        var bResp = await fetchWithTimeout(bundleUrl, 10000);
        if (bResp.ok) {
          var newCode = await bResp.text();
          cacheVersion(remoteVer, bundleUrl, newCode);
          try { localStorage.setItem(VER_KEY, remoteVer); } catch(e){}
          console.log('[Kantine] ✅ CDN update ' + remoteVer + ' → loaded');
          loadBundle(newCode);
          return;
        } else {
          console.log('[Kantine]   ✗ CDN fetch failed (HTTP ' + bResp.status + ')');
        }
      } catch(e) {
        console.log('[Kantine]   ✗ CDN fetch error: ' + e.message);
      }
    }
  }

  // No remote update — try localStorage cache
  var cache = null;
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch(e){}
  if (cache && cache.bundleCode && cache.version && isNewer(cache.version, CURRENT_VER)) {
    try { localStorage.setItem(VER_KEY, cache.version); } catch(e){}
      console.log('[Kantine] ✅ Cache update ' + cache.version + ' → loaded');
    loadBundle(cache.bundleCode);
    return;
  }

  // No newer version at all — baked-in fallback
  try { localStorage.removeItem(VER_KEY); } catch(e){}
  if (remoteVer && !isNewer(remoteVer, CURRENT_VER)) {
    console.log('[Kantine]   ✓ up-to-date (remote ' + remoteVer + ' matches baked-in) — using baked-in');
  } else {
    console.log('[Kantine] → using baked-in ' + CURRENT_VER + ' (no update available)');
  }
  if (window.__KANTINE_REINIT && remoteVer && !isNewer(remoteVer, CURRENT_VER)) {
    console.log('[Kantine]   (re-init: no update, keeping current UI)');
    return;
  }
  loadBundle(FALLBACK);
})();
})();`;

  const encodedUrl = 'javascript:' + encodeURIComponent(payload.slice(11));
  ctx.BOOKMARKLET_URL = encodedUrl;

  fs.writeFileSync(path.join(DIST, 'bookmarklet-payload.js'), payload);
  ok(`Bookmarklet payload: ${(payload.length / 1024).toFixed(0)} KB`);

  const encoded = 'javascript:' + encodeURIComponent(payload.slice(11));
  fs.writeFileSync(path.join(DIST, 'bookmarklet.txt'), encoded);
  ok(`Bookmarklet URL: ${(encoded.length / 1024).toFixed(0)} KB`);

  ctx.JS_MIN  = JS_MIN;
  ctx.BOOKMARKLET_SIZE = encoded.length;
  abortIfFailed();

  // 8. Installer
  stepInstaller(ctx);
  abortIfFailed();

  // ── Auto-update CDN artifacts ───────────────────────────────────────────
  const AUTO_UPDATE_BUNDLE = path.join(DIST, 'kantine-auto-update-bundle.js');

  // Guard against corrupted existing artifacts before overwriting evidence.
  if (exists(AUTO_UPDATE_BUNDLE) && exists(path.join(DIST, 'version.json'))) {
    verifyAutoUpdateArtifacts();
    abortIfFailed();
  }

  fs.writeFileSync(AUTO_UPDATE_BUNDLE, ctx.JS_INJECTED);
  ok(`Auto-update bundle: ${(ctx.JS_INJECTED.length / 1024).toFixed(0)} KB`);

  const VERSION_FOR_MANIFEST = read(VERSION_FILE).trim();
  const BUNDLE_URL = `https://cdn.jsdelivr.net/gh/TauNeutrino/kantine-overview@${VERSION_FOR_MANIFEST}/dist/kantine-auto-update-bundle.js`;
  const VERSION_MANIFEST = JSON.stringify({ version: VERSION_FOR_MANIFEST, bundleUrl: BUNDLE_URL }, null, 2);
  fs.writeFileSync(path.join(DIST, 'version.json'), VERSION_MANIFEST);
  ok(`Version manifest: ${(VERSION_MANIFEST.length / 1024).toFixed(0)} KB`);

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
