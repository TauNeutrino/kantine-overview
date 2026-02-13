#!/bin/bash
# Build script for Kantine Bookmarklet
# Creates a self-contained bookmarklet URL and standalone HTML file
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"
CSS_FILE="$SCRIPT_DIR/style.css"
JS_FILE="$SCRIPT_DIR/kantine.js"

mkdir -p "$DIST_DIR"

echo "=== Kantine Bookmarklet Builder ==="

# Check files exist
if [ ! -f "$CSS_FILE" ]; then echo "ERROR: $CSS_FILE not found"; exit 1; fi
if [ ! -f "$JS_FILE" ]; then echo "ERROR: $JS_FILE not found"; exit 1; fi

CSS_CONTENT=$(cat "$CSS_FILE")
JS_CONTENT=$(cat "$JS_FILE")

# === 1. Build standalone HTML (for local testing/dev) ===
cat > "$DIST_DIR/kantine-standalone.html" << 'HTMLEOF'
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

cat >> "$DIST_DIR/kantine-standalone.html" << 'HTMLEOF'
    </style>
</head>
<body>
    <script>
HTMLEOF

# Inject JS
cat "$JS_FILE" >> "$DIST_DIR/kantine-standalone.html"

cat >> "$DIST_DIR/kantine-standalone.html" << 'HTMLEOF'
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
sc.textContent=$(cat "$JS_FILE" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" 2>/dev/null || cat "$JS_FILE" | sed 's/\\/\\\\/g' | sed "s/'/\\\\'/g" | sed 's/"/\\\\"/g' | tr '\n' ' ' | sed 's/^/"/' | sed 's/$/"/');
document.head.appendChild(sc);
})();
PAYLOADEOF

# URL-encode for bookmark
BOOKMARKLET_RAW=$(cat "$DIST_DIR/bookmarklet-payload.js" | tr '\n' ' ' | sed 's/  */ /g')
echo "javascript:${BOOKMARKLET_RAW}" > "$DIST_DIR/bookmarklet.txt"

echo "✅ Bookmarklet URL: $DIST_DIR/bookmarklet.txt"

# === 3. Create an easy-to-use HTML installer page ===
cat > "$DIST_DIR/install.html" << 'INSTALLEOF'
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Kantine Wrapper Installer</title>
    <style>
        body { font-family: 'Inter', sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; background: #1a1a2e; color: #eee; }
        h1 { color: #e94560; }
        .instructions { background: #16213e; padding: 20px; border-radius: 12px; margin: 20px 0; }
        .instructions ol li { margin: 10px 0; }
        a.bookmarklet { display: inline-block; background: #e94560; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 18px; cursor: grab; }
        a.bookmarklet:hover { background: #c73652; }
        code { background: #0f3460; padding: 2px 6px; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>🍽️ Kantine Wrapper</h1>
    <div class="instructions">
        <h2>Installation</h2>
        <ol>
            <li>Ziehe den Button unten in deine <strong>Lesezeichen-Leiste</strong> (Drag & Drop)</li>
            <li>Navigiere zu <a href="https://web.bessa.app/knapp-kantine" style="color:#e94560">web.bessa.app/knapp-kantine</a></li>
            <li>Klicke auf das Lesezeichen <code>Kantine Wrapper</code></li>
        </ol>

        <h2>✨ Features</h2>
        <ul>
            <li>📅 <strong>Wochenübersicht:</strong> Die ganze Woche auf einen Blick.</li>
            <li>💰 <strong>Kostenkontrolle:</strong> Automatische Berechnung der Wochensumme.</li>
            <li>🔑 <strong>Auto-Login:</strong> Nutzt deine bestehende Session.</li>
            <li>🏷️ <strong>Badges & Status:</strong> Menü-Codes (M1, M2) und Bestellstatus direkt sichtbar.</li>
            <li>🛡️ <strong>Offline-Support:</strong> Speichert Menüdaten lokal.</li>
        </ul>

        <div style="margin-top: 30px; padding: 15px; background: rgba(233, 69, 96, 0.1); border: 1px solid rgba(233, 69, 96, 0.3); border-radius: 8px; font-size: 0.85em; color: #ddd;">
             <strong>⚠️ Haftungsausschluss:</strong><br>
             Die Verwendung dieses Bookmarklets erfolgt auf eigene Verantwortung. Der Entwickler übernimmt keine Haftung für Schäden, Datenverlust oder ungewollte Bestellungen, die durch die Nutzung dieser Software entstehen.
        </div>
    </div>
    <p>👇 Diesen Button in die Lesezeichen-Leiste ziehen:</p>
    <p><a class="bookmarklet" id="bookmarklet-link" href="#">⏳ Wird generiert...</a></p>
    <script>
INSTALLEOF

# Embed the bookmarklet URL inline
echo "document.getElementById('bookmarklet-link').href = " >> "$DIST_DIR/install.html"
cat "$JS_FILE" | python3 -c "
import sys, json
js = sys.stdin.read()
css = open('$CSS_FILE').read().replace('\\n', ' ').replace('  ', ' ')
bmk = '''javascript:(function(){if(window.__KANTINE_LOADED){alert(\"Already loaded\");return;}var s=document.createElement(\"style\");s.textContent=''' + json.dumps(css) + ''';document.head.appendChild(s);var sc=document.createElement(\"script\");sc.textContent=''' + json.dumps(js) + ''';document.head.appendChild(sc);})();'''
print(json.dumps(bmk) + ';')
" 2>/dev/null >> "$DIST_DIR/install.html" || echo "'javascript:alert(\"Build error\")'" >> "$DIST_DIR/install.html"

cat >> "$DIST_DIR/install.html" << 'INSTALLEOF'
        document.getElementById('bookmarklet-link').textContent = '🍽️ Kantine Wrapper';
    </script>
</body>
</html>
INSTALLEOF

echo "✅ Installer page: $DIST_DIR/install.html"
echo ""
echo "=== Build Complete ==="
echo "Files in $DIST_DIR:"
ls -la "$DIST_DIR/"
