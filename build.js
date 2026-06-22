const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIST = path.join(__dirname, 'dist');
const VERSION = fs.readFileSync(path.join(__dirname, 'version.txt'), 'utf8').trim();
const CSS = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
const CSS_ONE_LINE = CSS.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, ' ').replace(/  +/g, ' ');
const JS_BUNDLE = fs.readFileSync(path.join(DIST, 'kantine.bundle.js'), 'utf8');
const FAVICON_B64 = fs.readFileSync(path.join(__dirname, 'favicon.png')).toString('base64');
const FAVICON_URL = `data:image/png;base64,${FAVICON_B64}`;
const MOCK_JS = fs.readFileSync(path.join(__dirname, 'mock-data.js'), 'utf8');

// Inject version + favicon into JS
const JS_INJECTED = JS_BUNDLE
  .replace('{{VERSION}}', VERSION)
  .replace('{{FAVICON_DATA_URI}}', FAVICON_URL);

// --- 1. Standalone HTML ---
function buildStandalone() {
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
${CSS}
    </style>
</head>
<body>
    <script>
${MOCK_JS}
${JS_INJECTED}
    </script>
</body>
</html>`;
  fs.writeFileSync(path.join(DIST, 'kantine-standalone.html'), html);
  console.log(`✓ Standalone HTML: ${(html.length / 1024).toFixed(0)} KB`);
}

// --- 2. Bookmarklet payload + URL ---
async function buildBookmarklet() {
  const terser = require('terser');
  const minified = await terser.minify(JS_INJECTED, { compress: true, mangle: true });
  if (minified.error) throw minified.error;
  const JS_MIN = minified.code;

  // Escape CSS for JS string injection
  const CSS_ESC = CSS_ONE_LINE.replace(/'/g, "\\'");

  const payload = `javascript:(function(){
if(window.__KANTINE_LOADED){alert('Kantine Wrapper already loaded!');return;}
var s=document.createElement('style');s.textContent='${CSS_ESC}';document.head.appendChild(s);
var sc=document.createElement('script');
sc.textContent=${JSON.stringify(JS_MIN)};
document.head.appendChild(sc);
})();`;

  // Write payload (unencoded, readable)
  fs.writeFileSync(path.join(DIST, 'bookmarklet-payload.js'), payload);
  console.log(`✓ Bookmarklet payload: ${(payload.length / 1024).toFixed(0)} KB`);

  // URL-encode for bookmarklet.txt
  const encoded = 'javascript:' + encodeURIComponent(payload.substring(11)); // strip "javascript:" for encoding
  fs.writeFileSync(path.join(DIST, 'bookmarklet.txt'), encoded);
  console.log(`✓ Bookmarklet URL: ${(encoded.length / 1024).toFixed(0)} KB`);
  return { JS_MIN, CSS_ESC };
}

// --- 3. Installer HTML ---
function buildInstaller(JS_MIN, CSS_ESC) {
  // Convert changelog.md to simple HTML
  let changelogHtml = '';
  const changelogPath = path.join(__dirname, 'changelog.md');
  if (fs.existsSync(changelogPath)) {
    const md = fs.readFileSync(changelogPath, 'utf8');
    changelogHtml = md
      .replace(/^## (.*)/gm, '<h3>$1</h3>')
      .replace(/^- (.*)/gm, '<li>$1</li>');
    // Wrap consecutive <li> in <ul>
    changelogHtml = changelogHtml.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
    // Fix stray </h3>\n<ul> pattern
    changelogHtml = changelogHtml.replace(/<\/h3>\n?<ul>/g, '</h3><ul>');
  }

  // Build bookmarklet URL for install page (Python-style URL encoding)
  const cssInjection = `var s=document.createElement('style');s.textContent='${CSS_ESC}';document.head.appendChild(s);`;
  const bookmarkletCode = 'javascript:(function(){' + cssInjection + JS_MIN + '})();';
  const encodedUrl = 'javascript:' + encodeURIComponent(bookmarkletCode.substring(11));

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Kantine Wrapper Installer (${VERSION})</title>
    <link rel="icon" type="image/png" href="${FAVICON_URL}">
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
        summary.styled-summary::after { content: '▾'; font-size: 0.8em; transition: transform 0.2s; }
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
            <img src="${FAVICON_URL}" alt="Logo" style="width: 40px; height: 40px;"> 
            Kantine Wrapper 
            <span style="font-size:0.5em; opacity:0.6; font-weight:400; margin-left:5px;">${VERSION}</span>
        </h1>
        <p style="font-size: 1.2rem; color: #a0aec0; margin-top: 0; font-style: italic;">"Mahlzeit! Jetzt bessa einfach."</p>
    </div>
    
    <div class="card" style="text-align: center; border: 2px solid #029AA8;">
        <p style="margin-bottom:15px; font-weight:bold;">🔖 Diesen Button in die Lesezeichen-Leiste ziehen:</p>
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
    <h2>✨ Features</h2>
    <ul>
        <li>📅 <strong>Wochenübersicht:</strong> Die ganze Woche auf einen Blick.</li>
        <li>⏰ <strong>Order Countdown:</strong> Roter Alarm 1h vor Bestellschluss.</li>
        <li>⭐ <strong>Smart Highlights:</strong> Markiere deine Favoriten (z.B. "Schnitzel").</li>
        <li>💰 <strong>Kostenkontrolle:</strong> Automatische Berechnung der Wochensumme.</li>
        <li>🔑 <strong>Auto-Login:</strong> Nutzt deine bestehende Session.</li>
        <li>🏷️ <strong>Badges & Status:</strong> Menü-Codes (M1, M2) und Bestellstatus direkt sichtbar.</li>
    </ul>

    <div style="margin-top: 30px; padding: 15px; background: rgba(233, 69, 96, 0.1); border: 1px solid rgba(233, 69, 96, 0.3); border-radius: 8px; font-size: 0.85em; color: #ddd;">
             <strong>⚠️ Haftungsausschluss:</strong><br>
             Die Verwendung dieses Bookmarklets erfolgt auf eigene Verantwortung. Der Entwickler übernimmt keine Haftung für Schäden, Datenverlust oder ungewollte Bestellungen, die durch die Nutzung dieser Software entstehen.
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
        <p>Powered by <strong>Kaufis-Kitchen</strong> 🍳🔧</p>
    </div>

    <script>
        setTimeout(function() {
            document.querySelectorAll('link[rel*="icon"]').forEach(function(el) { el.remove(); });
            var fi = document.createElement('link');
            fi.rel = 'icon';
            fi.type = 'image/png';
            fi.href = '${FAVICON_URL}';
            document.head.appendChild(fi);
        }, 0);
    </script>
</body>
</html>`;

  fs.writeFileSync(path.join(DIST, 'install.html'), html);
  console.log(`✓ Installer page: ${(html.length / 1024).toFixed(0)} KB`);
}

// --- Main ---
async function main() {
  console.log(`=== Kantine Bookmarklet Builder (${VERSION}) ===`);
  
  buildStandalone();
  const { JS_MIN, CSS_ESC } = await buildBookmarklet();
  buildInstaller(JS_MIN, CSS_ESC);
  
  console.log('=== Build Complete ===');
  fs.readdirSync(DIST).forEach(f => {
    const s = fs.statSync(path.join(DIST, f));
    if (s.isFile()) console.log(`  ${f}: ${(s.size / 1024).toFixed(0)} KB`);
  });
}

main().catch(err => { console.error('Build failed:', err); process.exit(1); });
