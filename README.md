# Kantine

[![Web Build & Deploy](https://github.com/TauNeutrino/kantine-overview/actions/workflows/build-and-deploy.yml/badge.svg)](https://github.com/TauNeutrino/kantine-overview/actions/workflows/build-and-deploy.yml)
[![Android CI](https://github.com/TauNeutrino/kantine-overview/actions/workflows/android-ci.yml/badge.svg)](https://github.com/TauNeutrino/kantine-overview/actions/workflows/android-ci.yml)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![version](https://img.shields.io/github/v/tag/TauNeutrino/kantine-overview?label=version&color=blue)](changelog.md)
[![Android](https://img.shields.io/badge/Android-Kotlin-green)](android/)
[![Web](https://img.shields.io/badge/Web-ES6-yellow)](src/)

Hochmoderne Clients für die [Bessa Knapp-Kantine](https://web.bessa.app/knapp-kantine) – als **Web Lesezeichen (Bookmarklet)** und **Android Native App**. Beide Projekte nutzen die gleiche Bessa API und teilen die Kernidee: eine effiziente Wochenansicht der Kantine-Speisepläne mit Fokus auf Usability und DE/EN-Spracherkennung.

---

## Inhaltsverzeichnis

- [Projektübersicht](#projektübersicht)
- [Web Lesezeichen (Bookmarklet)](#web-lesezeichen-bookmarklet)
- [Android App](#android-app)
- [Repository Struktur](#repository-struktur)
- [Getting Started](#getting-started)
- [Design System](#design-system)
- [Mitwirken](#mitwirken)
- [Lizenz](#lizenz)

---

## Projektübersicht

Dieses Monorepo enthält zwei unabhängige Client-Implementierungen für die Knapp-Kantine:

| Projekt | Sprache | Framework | Build | Ziel |
|---------|---------|-----------|-------|------|
| **Web Lesezeichen** | JavaScript (ES6) | Eigenentwicklung | Webpack + Terser | Browser-Overlay via Bookmarklet |
| **Android App** | Kotlin | Jetpack Compose + Material 3 | Gradle (AGP 8.7.0) | Native Android App (API 31+) |

**Gemeinsamkeiten:** Beide Projekte authentifizieren sich gegen die Bessa API (`https://web.bessa.app/knapp-kantine`), unterstützen DE/EN-Spracherkennung und bieten eine Wochenübersicht der Speisepläne.

---

## Web Lesezeichen (Bookmarklet)

Ein moderner Wrapper der Bessa-Kantine als Bookmarklet – keine Installation nötig.

### Architektur

Das Bookmarklet injiziert eine vollständige UI-Overlay in die Bessa-Webseite. Die modulare **ES6-Architektur** wird per Webpack gebündelt:

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
npm test         # Test Suite (test_utils, test_actions, test_logic)
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
- Ein Release erfolgt durch einfaches Pushen auf `main` – `npm run release` ist **nicht mehr nötig**

### Auto-Update

Das Bookmarklet ist ein minimaler Bootloader. Beim Start prüft es gegen `version.json` auf GitHub Pages, ob auf jsDelivr eine neuere Version des Haupt-Bundles liegt, und lädt diese im Hintergrund nach. Bei Fehlern fällt es automatisch auf das eingebettete Fallback-Bundle zurück. Details zum Deployment-Flow und dazu, wann ein Nutzer das Lesezeichen neu installieren muss, stehen in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#deployment--auto-update).

### Features

- Wochenansicht mit Navigation
- DE/EN-Spracherkennung (automatisch)
- Session Harvesting für bestehende Bessa-Sitzungen
- Smart Highlights (Substring-Matching für Favoriten)
- Delta-Caching für Bestellverlauf
- Lokalisierung (DE/EN) via `i18n.js`

---

## Android App

Native Android App für die Knapp-Kantine, geschrieben in **Kotlin** mit **Jetpack Compose** und **Material 3**.

### Architektur

Die App folgt der **MVVM-Architektur** mit Repository-Pattern:

- **UI Layer:** Compose Screens + ViewModels (StateFlow)
- **Domain Layer:** i18n, Splitter
- **Data Layer:** Repository → Room DB / API Service
- **DI:** Hilt Module (Network, Database, Auth)
- **Navigation:** Navigation Compose

**Tech Stack:**

| Bereich | Technologie |
|---------|-------------|
| UI | Jetpack Compose + Material 3 (BOM 2024.10.00) |
| DI | Hilt 2.52 |
| Networking | Retrofit 2.11.0 + OkHttp 4.12.0 |
| JSON | Moshi 1.15.1 + KSP |
| Lokale DB | Room 2.6.1 + KSP |
| Auth Storage | EncryptedSharedPreferences 1.1.0-alpha06 |
| Navigation | Navigation Compose 2.8.3 |
| ViewModel | Lifecycle ViewModel Compose 2.8.6 |

### Build & Test

**Lokal (Debug only):**
```bash
# Debug APK
cd android && ./gradlew assembleDebug

# Unit Tests
./gradlew test

# Lint
./gradlew lint
```

Voraussetzungen: JDK 21, Android SDK (API 31–35), Android Studio empfohlen.

**Release AAB (via GitHub Actions):**
Der Release-Build wird über den [`Android CI`](.github/workflows/android-ci.yml) Workflow ausgeführt. Das Signing-Keystore liegt als Base64-Secret (`SIGNING_KEY_BASE64`) auf GitHub – ein lokaler `./gradlew bundleRelease` schlägt ohne die Secrets fehl.

**MVP Features:**
- Login mit Bessa API Authentifizierung
- Wochenübersicht der Speisepläne
- Navigation zwischen Wochen
- DE/EN-Spracherkennung
- Material 3 Dynamic Colors

> Detaillierte Architektur: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
> Setup-Anleitung: [docs/SETUP.md](docs/SETUP.md)
> Play Store Deployment: [docs/play-store-setup.md](docs/play-store-setup.md)

---

## Repository Struktur

```
├── android/              # Android App (Gradle, Kotlin)
│   ├── app/src/          # App-Modul (Kotlin + Compose)
│   └── keystore/         # Keystore (gitignored)
├── src/                  # Web Bookmarklet Quellen (ES6)
├── dist/                 # Build-Artefakte (Web)
├── tests/                # Web Test Suite
├── docs/                 # Dokumentation
│   ├── ARCHITECTURE.md
│   ├── SETUP.md
│   ├── TESTING.md
│   ├── android-architecture-decision.md
│   ├── android-signing.md
│   ├── data-safety.md
│   ├── design-system.md
│   ├── play-store-setup.md
│   ├── play-store-release.md
│   └── store-description-guidelines.md
├── fastlane/             # Play Store Metadata
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

3. **Android App**
   ```bash
   # Öffne android/ in Android Studio
   # Sync Gradle → Run
   ```

Ausführliche Setup-Anleitung: [docs/SETUP.md](docs/SETUP.md)

---

## Design System

Das visuelle Design des Projekts ist in zwei getrennten Systemen dokumentiert:

- **Web Bookmarklet:** [docs/design-system.md](docs/design-system.md) – Design Tokens, UI-Komponenten, Farben
- **Android App:** Material 3 Theme mit Dynamic Colors (siehe `android/app/src/main/java/at/kaufi/kantine/ui/theme/`)

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
