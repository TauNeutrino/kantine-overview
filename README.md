# Kantine

[![build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![version](https://img.shields.io/badge/version-1.10.0-blue)](changelog.md)
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
npm run release  # Build + Commit + Tag + Push
```

Die Build-Artefakte liegen in `dist/`:
- `kantine.bundle.js` – Gebündeltes JS
- `bookmarklet.txt` – Bookmarklet-Code zum Einfügen
- `install.html` – Installer mit Changelog
- `kantine-standalone.html` – Standalone UI-Test mit Mock-Daten

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

```bash
# Debug APK
cd android && ./gradlew assembleDebug

# Unit Tests
./gradlew test

# Release AAB (benötigt Keystore)
./gradlew bundleRelease
```

Voraussetzungen: JDK 17, Android SDK (API 31–35), Android Studio empfohlen.

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
