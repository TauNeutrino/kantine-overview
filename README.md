# Kantine

[![Web Build & Deploy](https://github.com/TauNeutrino/kantine-overview/actions/workflows/build-and-deploy.yml/badge.svg)](https://github.com/TauNeutrino/kantine-overview/actions/workflows/build-and-deploy.yml)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![version](https://img.shields.io/github/v/tag/TauNeutrino/kantine-overview?label=version&color=blue)](changelog.md)
[![Web](https://img.shields.io/badge/Web-ES6-yellow)](src/)

Ein moderner Wrapper für die [Bessa Knapp-Kantine](https://web.bessa.app/knapp-kantine) als **Web-Lesezeichen (Bookmarklet)**. Das Projekt bietet eine effiziente Wochenansicht der Kantine-Speisepläne mit Fokus auf Usability und DE/EN-Spracherkennung.

> Die native **Android-App** wurde in ein eigenes Repository ausgelagert: [github.com/TauNeutrino/kantine-app](https://github.com/TauNeutrino/kantine-app)

---

## Inhaltsverzeichnis

- [Projektübersicht](#projektübersicht)
- [Web Lesezeichen (Bookmarklet)](#web-lesezeichen-bookmarklet)
- [Repository Struktur](#repository-struktur)
- [Getting Started](#getting-started)
- [Design System](#design-system)
- [Mitwirken](#mitwirken)
- [Lizenz](#lizenz)

---

## Projektübersicht

Das Bookmarklet injiziert eine vollständige UI als Overlay in die Bessa-Webseite. Es verwendet eine modulare **ES6-Architektur**, die per **Webpack 5** gebündelt und mit **Terser** minifiziert wird.

| Projekt | Sprache | Framework | Build | Ziel |
|---------|---------|-----------|-------|------|
| **Web Lesezeichen** | JavaScript (ES6) | Eigenentwicklung | Webpack + Terser | Browser-Overlay via Bookmarklet |

Details zur automatischen DE/EN-Spracherkennung: [`docs/LANGUAGE_SPLITTING.md`](docs/LANGUAGE_SPLITTING.md).

---

## Web Lesezeichen (Bookmarklet)

### Architektur

- **`src/index.js`** – Entry Point, Initialisierung
- **`src/state.js`** – Zentrales State-Management (Singleton)
- **`src/actions.js`** – Business Logic (API-Calls, Cache-Management)
- **`src/ui.js`** / **`src/ui_helpers.js`** – Rendering und Komponenten
- **`src/events.js`** – Event-Handling
- **`src/api.js`** – API-Transport
- **`src/i18n.js`** – Lokalisierung DE/EN
- **`src/constants.js`** / **`src/utils.js`** – Infrastruktur

**Datenfluss:** Bessa API → `actions.js` → `state.js` → DOM Rendering

**Caching:** Daten werden beim Start aus `localStorage` gerendert, während ein Silent-Refresh im Hintergrund die Aktualität sicherstellt.

### Build & Test

```bash
npm install
npm run build    # Webpack + Terser + Bookmarklet + Standalone HTML
npm test         # Test Suite
```

Die Build-Artefakte liegen in `dist/`:
- `kantine.bundle.js` – Gebündeltes JS
- `bookmarklet.txt` – Bookmarklet-Code zum Einfügen
- `install.html` – Installer mit Changelog
- `kantine-standalone.html` – Standalone UI-Test mit Mock-Daten
- `kantine-auto-update-bundle.js` – CDN-Bundle für Auto-Updates
- `version.json` – Versions-Manifest für Auto-Updates

### CI/CD (GitHub Actions)

Der Web-Build wird automatisch über den [`Build & Deploy`](.github/workflows/build-and-deploy.yml) Workflow auf GitHub Actions ausgeführt:
- **Trigger:** Push/PR auf `main` sowie manueller Dispatch
- Erzeugt automatisch Git-Tags aus `version.txt` und deployed `dist/` auf GitHub Pages
- Secrets (`GIST_PAT`, `GIST_ID`, `GIST_SALT`, `GIT_PAT`) sind als Repository Secrets hinterlegt

### Auto-Update

Das Bookmarklet ist ein minimaler Bootloader. Beim Start prüft es gegen `version.json` auf GitHub Pages, ob auf jsDelivr eine neuere Version des Haupt-Bundles liegt, und lädt diese im Hintergrund nach. Details zum Deployment-Flow stehen in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#deployment--auto-update).

### Features

- Wochenansicht mit Navigation
- DE/EN-Spracherkennung (automatisch)
- Session Harvesting für bestehende Bessa-Sitzungen
- Smart Highlights (Substring-Matching für Favoriten)
- Delta-Caching für Bestellverlauf
- Lokalisierung (DE/EN) via `i18n.js`

---

## Repository Struktur

```
├── src/                  # Web Bookmarklet Quellen (ES6)
├── stats/                # Chart.js Nutzungsstatistik-Dashboard
├── dist/                 # Build-Artefakte (Web)
├── tests/                # Web Test Suite
├── docs/                 # Dokumentation
│   ├── ARCHITECTURE.md
│   ├── LANGUAGE_SPLITTING.md
│   ├── SETUP.md
│   ├── TESTING.md
│   └── design-system.md
├── scripts/              # Build Scripts (Web)
├── tools/                # Entwickler-Tools
├── version.txt           # Aktuelle Version
└── package.json          # Web-Projekt-Dependencies
```

---

## Getting Started

1. **Repository klonen**
   ```bash
   git clone <repo-url>
   cd kantine-overview
   ```

2. **Web Bookmarklet**
   ```bash
   npm install
   npm run build
   # Öffne dist/install.html im Browser
   ```

Ausführliche Setup-Anleitung: [docs/SETUP.md](docs/SETUP.md)

---

## Design System

Das visuelle Design ist in [docs/design-system.md](docs/design-system.md) dokumentiert – Design Tokens, UI-Komponenten, Farben.

---

## Mitwirken

Beiträge sind willkommen! Bitte unsere Richtlinien beachten:

- [CONTRIBUTING.md](CONTRIBUTING.md) – Contribution Guide
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) – Verhaltenskodex
- [SECURITY.md](SECURITY.md) – Sicherheitsrichtlinie
- [TESTING.md](docs/TESTING.md) – Tests ausführen und schreiben

---

## Lizenz

MIT License – siehe [LICENSE](LICENSE).

Copyright (c) 2024–2026 Kantine Contributors
