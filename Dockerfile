# BASIS: Wir nutzen das Webtop Image (Ubuntu + XFCE Desktop)
FROM lscr.io/linuxserver/webtop:ubuntu-xfce

# METADATEN
LABEL maintainer="DeinName"
LABEL description="Google Antigravity IDE (Official Repo)"

# VORBEREITUNG: Notwendige Tools installieren (curl, gpg für den Schlüssel)
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# INSTALLATION: Google Repository hinzufügen
# 1. Keyring Verzeichnis erstellen
# 2. GPG Key herunterladen und speichern
# 3. Repository zur sources.list hinzufügen
RUN mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://us-central1-apt.pkg.dev/doc/repo-signing-key.gpg | gpg --dearmor -o /etc/apt/keyrings/antigravity-repo-key.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/antigravity-repo-key.gpg] https://us-central1-apt.pkg.dev/projects/antigravity-auto-updater-dev/ antigravity-debian main" | tee /etc/apt/sources.list.d/antigravity.list

# INSTALLATION: Antigravity installieren
RUN apt-get update && \
    apt-get install -y antigravity && \
    rm -rf /var/lib/apt/lists/*

# INSTALLATION: Node.js und npm für Scraper-Entwicklung
# NodeSource Repository für aktuelle Node.js Version
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# UMGEBUNGSVARIABLEN für Chromium und Playwright
# Diese helfen, Browser-Probleme in Docker zu vermeiden
# HINWEIS: Kein --headless damit Browser sichtbar für Monitoring/manuelle Eingriffe
ENV CHROME_BIN=/usr/bin/chromium-browser \
    CHROMIUM_FLAGS="--disable-gpu --remote-debugging-port=9222 --no-sandbox --disable-dev-shm-usage" \
    PLAYWRIGHT_BROWSERS_PATH=/usr/bin \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# MODIFIZIERUNG DER .desktop-Datei
# Die Original-Datei befindet sich typischerweise unter /usr/share/applications/antigravity.desktop
# Wir suchen die Zeile, die mit 'Exec=' beginnt, und fügen die benötigten Flags hinzu.
RUN DESKTOP_FILE="/usr/share/applications/antigravity.desktop" && \
    if [ -f "$DESKTOP_FILE" ]; then \
    # Suchen und Ersetzen der 'Exec' Zeile mit den Flags --no-sandbox und --disable-gpu
    sed -i 's|Exec=/usr/share/antigravity/antigravity %F|Exec=/usr/share/antigravity/antigravity --no-sandbox --disable-gpu %F|g' "$DESKTOP_FILE" && \
    echo "INFO: antigravity.desktop wurde erfolgreich gepatcht." || \
    echo "FEHLER: sed-Befehl konnte die Datei $DESKTOP_FILE nicht patchen." ; \
    else \
    echo "WARNUNG: $DESKTOP_FILE nicht gefunden. Überspringe Patch." ; \
    fi

# OPTIONAL: Autostart einrichten
# Wir versuchen, die .desktop Datei in den Autostart-Ordner zu kopieren.
# Der Name ist meistens antigravity.desktop, zur Sicherheit prüfen wir beide Varianten.
#RUN mkdir -p /defaults/autostart 2> /dev/null && \
#     cp /usr/share/applications/antigravity.desktop ~/.config/autostart/ 2>/dev/null

# VOLUME für Persistenz
VOLUME /config