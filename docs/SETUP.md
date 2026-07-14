# Entwicklungsumgebung einrichten

Diese Anleitung beschreibt, wie du die Entwicklungsumgebung für das Web-Bookmarklet einrichtest.

---

## Voraussetzungen

| Tool | Version | Zweck |
|------|---------|-------|
| Node.js | 18+ | Web Bookmarklet |
| Git | – | Versionsverwaltung |

---

## Web Bookmarklet

### Setup

```bash
# Repository klonen
git clone <repo-url>
cd kantine-overview

# Dependencies installieren
npm install

# Build ausführen
npm run build
```

Der Build erzeugt folgende Artefakte in `dist/`:
- `kantine.bundle.js` – Gebündeltes JavaScript
- `bookmarklet.txt` – Bookmarklet-Code
- `install.html` – Installer-Seite mit Changelog
- `kantine-standalone.html` – Standalone UI-Test mit Mock-Daten

### Tests ausführen

```bash
npm test
```

Führt die Test-Suite aus: `test_utils.js`, `test_actions.js` und `test_logic.js`.

### Manuelles Testen

1. Öffne `dist/install.html` im Browser
2. Ziehe den Bookmarklet-Link in die Lesezeichenleiste
3. Öffne https://web.bessa.app/knapp-kantine und klicke das Lesezeichen

Alternativ: Öffne `dist/kantine-standalone.html` für UI-Tests mit Mock-Daten.

---

## Common Tasks

| Aufgabe | Befehl |
|---------|--------|
| Dependencies installieren | `npm install` |
| Build | `npm run build` |
| Tests | `npm test` |
| Release | `npm run release` |
| Clean Build | `rm -rf dist/` |

---

## Weiterführende Dokumentation

- [Architektur](ARCHITECTURE.md) – Systemarchitektur
- [Testing](TESTING.md) – Test-Anleitung und Test-Philosophie
