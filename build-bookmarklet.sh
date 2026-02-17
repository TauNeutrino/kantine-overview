#!/bin/bash
# Build script for Kantine Bookmarklet
# Creates a self-contained bookmarklet URL and standalone HTML file
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"
CSS_FILE="$SCRIPT_DIR/style.css"
JS_FILE="$SCRIPT_DIR/kantine.js"

# === VERSION ===
if [ -f "$SCRIPT_DIR/version.txt" ]; then
    VERSION=$(cat "$SCRIPT_DIR/version.txt" | tr -d '\n')
else
    echo "ERROR: version.txt not found"
    exit 1
fi

mkdir -p "$DIST_DIR"

echo "=== Kantine Bookmarklet Builder ($VERSION) ==="

# Check files exist
if [ ! -f "$CSS_FILE" ]; then echo "ERROR: $CSS_FILE not found"; exit 1; fi
if [ ! -f "$JS_FILE" ]; then echo "ERROR: $JS_FILE not found"; exit 1; fi

CSS_CONTENT=$(cat "$CSS_FILE")

# Inject version into JS
JS_CONTENT=$(cat "$JS_FILE" | sed "s|{{VERSION}}|$VERSION|g")

# === 1. Build standalone HTML (for local testing/dev) ===
cat > "$DIST_DIR/kantine-standalone.html" << HTMLEOF
<!DOCTYPE html>
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
HTMLEOF

# Inject CSS
cat "$CSS_FILE" >> "$DIST_DIR/kantine-standalone.html"

cat >> "$DIST_DIR/kantine-standalone.html" << HTMLEOF
    </style>
</head>
<body>
    <script>
HTMLEOF

# Inject mock data for standalone testing (loaded BEFORE kantine.js)
cat "$SCRIPT_DIR/mock-data.js" >> "$DIST_DIR/kantine-standalone.html"
echo "" >> "$DIST_DIR/kantine-standalone.html"

# Inject JS
echo "$JS_CONTENT" >> "$DIST_DIR/kantine-standalone.html"

cat >> "$DIST_DIR/kantine-standalone.html" << HTMLEOF
    </script>
</body>
</html>
HTMLEOF

echo "✅ Standalone HTML: $DIST_DIR/kantine-standalone.html"

# === 2. Build bookmarklet (JavaScript URL) ===
# The bookmarklet injects CSS + JS into the current page

# Escape CSS for embedding in JS string
CSS_ESCAPED=$(echo "$CSS_CONTENT" | sed "s/'/\\\\'/g" | tr '\n' ' ' | sed 's/  */ /g')

# Build bookmarklet payload
cat > "$DIST_DIR/bookmarklet-payload.js" << PAYLOADEOF
(function(){
if(window.__KANTINE_LOADED){alert('Kantine Wrapper already loaded!');return;}
var s=document.createElement('style');
s.textContent='${CSS_ESCAPED}';
document.head.appendChild(s);
var sc=document.createElement('script');
sc.textContent=$(echo "$JS_CONTENT" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" 2>/dev/null || echo "$JS_CONTENT" | sed 's/\\/\\\\/g' | sed "s/'/\\\\'/g" | sed 's/"/\\\\"/g' | tr '\n' ' ' | sed 's/^/"/' | sed 's/$/"/');
document.head.appendChild(sc);
})();
PAYLOADEOF

# URL-encode for bookmark
BOOKMARKLET_RAW=$(cat "$DIST_DIR/bookmarklet-payload.js" | tr '\n' ' ' | sed 's/  */ /g')
echo "javascript:${BOOKMARKLET_RAW}" > "$DIST_DIR/bookmarklet.txt"

echo "✅ Bookmarklet URL: $DIST_DIR/bookmarklet.txt"

# === 3. Create an easy-to-use HTML installer page ===
cat > "$DIST_DIR/install.html" << INSTALLEOF
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Kantine Wrapper Installer ($VERSION)</title>
    <style>
        body { font-family: 'Inter', sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; background: #1a1a2e; color: #eee; }
        h1 { color: #029AA8; } /* Knapp Teal */
        .instructions { background: #16213e; padding: 20px; border-radius: 12px; margin: 20px 0; }
        .instructions ol li { margin: 10px 0; }
        a.bookmarklet { display: inline-block; background: #029AA8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 18px; cursor: grab; }
        a.bookmarklet:hover { background: #006269; }
        code { background: #0f3460; padding: 2px 6px; border-radius: 4px; }
        
        /* Collapsible Changelog */
        details.styled-details { background: rgba(0,0,0,0.2); border-radius: 8px; overflow: hidden; }
        summary.styled-summary { padding: 15px; cursor: pointer; font-weight: bold; list-style: none; display: flex; justify-content: space-between; align-items: center; user-select: none; }
        summary.styled-summary:hover { background: rgba(255,255,255,0.05); }
        summary.styled-summary::-webkit-details-marker { display: none; }
        summary.styled-summary::after { content: '▼'; font-size: 0.8em; transition: transform 0.2s; }
        details.styled-details[open] summary.styled-summary::after { transform: rotate(180deg); transition: transform 0.2s; }
        .changelog-container { padding: 0 15px 15px 15px; border-top: 1px solid rgba(255,255,255,0.05); }
    </style>
</head>
<body>
    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="margin-bottom: 5px;">🍽️ Kantine Wrapper <span style="font-size:0.5em; opacity:0.6; font-weight:400; vertical-align:middle; margin-left:10px;">$VERSION</span></h1>
        <p style="font-size: 1.2rem; color: #a0aec0; margin-top: 0; font-style: italic;">"Mahlzeit! Jetzt bessa einfach."</p>
    </div>
    
    <!-- 1. BUTTON (Top Priority) -->
    <div class="card" style="text-align: center; border: 2px solid #029AA8;">
        <p style="margin-bottom:15px; font-weight:bold;">👇 Diesen Button in die Lesezeichen-Leiste ziehen:</p>
        <p><a class="bookmarklet" id="bookmarklet-link" href="#" onclick="event.preventDefault(); return false;" title="Nicht klicken! Ziehe mich in deine Lesezeichen-Leiste.">⏳ Wird generiert...</a></p>
    </div>

    <!-- 2. INSTRUCTIONS -->
    <div class="card">
         <h2>So funktioniert's</h2>
    <ol>
        <li>Ziehe den Button oben in deine <strong>Lesezeichen-Leiste</strong> (Drag & Drop)</li>
        <li>Navigiere zu <a href="https://web.bessa.app/knapp-kantine" style="color:#029AA8">web.bessa.app/knapp-kantine</a></li>
        <li>Klicke auf das Lesezeichen <code>Kantine $VERSION</code></li>
    </ol>
    </div>

    <!-- 3. FEATURES -->
    <div class="card">
    <h2>✨ Features</h2>
    <ul>
        <li>📅 <strong>Wochenübersicht:</strong> Die ganze Woche auf einen Blick.</li>
        <li>⏳ <strong>Order Countdown:</strong> Roter Alarm 1h vor Bestellschluss.</li>
        <li>🌟 <strong>Smart Highlights:</strong> Markiere deine Favoriten (z.B. "Schnitzel").</li>
        <li>💰 <strong>Kostenkontrolle:</strong> Automatische Berechnung der Wochensumme.</li>
        <li>🔑 <strong>Auto-Login:</strong> Nutzt deine bestehende Session.</li>
        <li>🏷️ <strong>Badges & Status:</strong> Menü-Codes (M1, M2) und Bestellstatus direkt sichtbar.</li>
    </ul>

    <div style="margin-top: 30px; padding: 15px; background: rgba(233, 69, 96, 0.1); border: 1px solid rgba(233, 69, 96, 0.3); border-radius: 8px; font-size: 0.85em; color: #ddd;">
             <strong>⚠️ Haftungsausschluss:</strong><br>
             Die Verwendung dieses Bookmarklets erfolgt auf eigene Verantwortung. Der Entwickler übernimmt keine Haftung für Schäden, Datenverlust oder ungewollte Bestellungen, die durch die Nutzung dieser Software entstehen.
    </div>
    </div>

    <!-- 4. CHANGELOG (Bottom) -->
    <div class="card">
        <details class="styled-details">
            <summary class="styled-summary">Changelog & Version History</summary>
            <div class="changelog-container">
                <!-- CHANGELOG_PLACEHOLDER -->
            </div>
        </details>
    </div>

    <div style="text-align: center; margin-top: 40px; color: #5c6b7f; font-size: 0.8rem;">
        <p>Powered by <strong>Kaufi-Kitchen</strong> 👨‍🍳</p>
    </div>


    <script>
INSTALLEOF

# Generate Changlog HTML from Markdown
CHANGELOG_HTML=""
if [ -f "$SCRIPT_DIR/changelog.md" ]; then
    CHANGELOG_HTML=$(cat "$SCRIPT_DIR/changelog.md" | python3 -c "
import sys, re
md = sys.stdin.read()
# Convert headers to h3/h4
html = re.sub(r'^## (.*)', r'<h3>\1</h3>', md, flags=re.MULTILINE)
# Convert bullets to list items
html = re.sub(r'^- (.*)', r'<li>\1</li>', html, flags=re.MULTILINE)
# Wrap lists (simple heuristic)
html = html.replace('</h3>\n<li>', '</h3>\n<ul>\n<li>').replace('</li>\n<h', '</li>\n</ul>\n<h').replace('</li>\n\n', '</li>\n</ul>\n')
if '<li>' in html and '<ul>' not in html: html = '<ul>' + html + '</ul>'
print(html)
")
fi

# Embed the bookmarklet URL inline
echo "document.getElementById('bookmarklet-link').href = " >> "$DIST_DIR/install.html"
echo "$JS_CONTENT" | python3 -c "
import sys, json, urllib.parse

# 1. Read JS and Replace VERSION
js_template = sys.stdin.read()
js = js_template.replace('{{VERSION}}', '$VERSION')

# 2. Prepare CSS for injection via createElement('style')
css = open('$CSS_FILE').read().replace('\n', ' ').replace('  ', ' ')
escaped_css = css.replace('\\\\', '\\\\\\\\').replace(\"'\", \"\\\\'\").replace('\"', '\\\\\"')

# 3. Update URL
update_url = 'https://htmlpreview.github.io/?https://github.com/TauNeutrino/kantine-overview/blob/main/dist/install.html'
js = js.replace('https://github.com/TauNeutrino/kantine-overview/raw/main/dist/install.html', update_url)

# 4. Create Bookmarklet Code with CSS injection
# Inject CSS via style element (same pattern as bookmarklet-payload.js)
css_injection = \"var s=document.createElement('style');s.textContent='\" + escaped_css + \"';document.head.appendChild(s);\"
bookmarklet_code = 'javascript:(function(){' + css_injection + js + '})();'

# 5. URL Encode
encoded_code = urllib.parse.quote(bookmarklet_code, safe=':/()!;=+,')

# Output as JSON string for the HTML script to assign to href
print(json.dumps(encoded_code) + ';')
" >> "$DIST_DIR/install.html"

# Inject Changelog into Installer HTML (Safe Python replace)
python3 -c "
import sys
html = open('$DIST_DIR/install.html').read()
changelog = sys.stdin.read()
html = html.replace('<!-- CHANGELOG_PLACEHOLDER -->', changelog)
open('$DIST_DIR/install.html', 'w').write(html)
" << EOF
$CHANGELOG_HTML
EOF

cat >> "$DIST_DIR/install.html" << INSTALLEOF
        document.getElementById('bookmarklet-link').textContent = 'Kantine $VERSION';
    </script>
</body>
</html>
INSTALLEOF

echo "✅ Installer page: $DIST_DIR/install.html"
echo ""
echo "=== Build Complete ==="
echo "Files in $DIST_DIR:"
ls -la "$DIST_DIR/"

# === 4. Run build-time tests ===
echo ""
echo "=== Running Logic Tests ==="
node "$SCRIPT_DIR/test_logic.js"
LOGIC_EXIT=$?
if [ $LOGIC_EXIT -ne 0 ]; then
    echo "❌ Logic tests FAILED! See above for details."
    exit 1
fi

echo "=== Running Build Tests ==="
python3 "$SCRIPT_DIR/test_build.py"
TEST_EXIT=$?
if [ $TEST_EXIT -ne 0 ]; then
    echo "❌ Build tests FAILED! See above for details."
    exit 1
fi
echo "✅ All build tests passed."

# === 5. Auto-tag version ===
echo ""
echo "=== Tagging $VERSION ==="
if git rev-parse "$VERSION" >/dev/null 2>&1; then
    git tag -f "$VERSION"
    echo "🔄 Tag $VERSION moved to current commit."
else
    git tag "$VERSION"
    echo "✅ Created tag: $VERSION"
fi
