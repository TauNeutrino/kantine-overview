# Architekturübersicht

## Übersicht

Dieses Monorepo enthält zwei unabhängige Client-Implementierungen für die Knapp-Kantine, die beide die gleiche **Bessa API** (`https://web.bessa.app/knapp-kantine`) verwenden. Beide Projekte nutzen HTTP Basic Auth zur Authentifizierung und arbeiten mit token-basierten Sitzungen.

---

## Web Lesezeichen (Bookmarklet)

### Architektur

Das Bookmarklet wird als JavaScript-Overlay in die bestehende Bessa-Webseite injiziert. Es verwendet eine modulare ES6-Architektur, die per **Webpack 5** gebündelt und mit **Terser** minifiziert wird.

### Modulstruktur

```
index.js (Entry Point)
  ├── state.js        – Zentraler State (Singleton)
  ├── actions.js      – Business Logic: API, Cache, Flagging
  ├── api.js          – Fetch-Wrapper für Bessa API
  ├── ui.js           – DOM-Rendering
  ├── ui_helpers.js   – UI-Komponenten (Tageskarten, Toasts)
  ├── events.js       – Event-Delegation
  ├── i18n.js         – DE/EN Lokalisierung
  ├── constants.js    – Konstanten
  └── utils.js        – Hilfsfunktionen
```

### Datenfluss

```
Bessa API ──HTTPS──> api.js ──> actions.js ──> state.js ──> ui_helpers.js ──> DOM
                           │                                    ↑
                           └──> localStorage (Cache) ────────────┘
```

**Caching-Strategie:** Beim Laden wird der UI-Zustand sofort aus `localStorage` rehydriert (Instant UI). Parallel läuft ein **Silent Refresh**, der die Daten im Hintergrund aktualisiert und beim nächsten Rendering durchreicht.

### Build-Pipeline

```
src/*.js ──> Webpack (Bundle) ──> Terser (Minify) ──> bookmarklet-payload.js
                                                    ──> bookmarklet.txt
                                                    ──> install.html
                                                    ──> kantine-standalone.html
```

---

## Android App

### Architektur

Die Android App folgt der **MVVM-Architektur** mit **Repository-Pattern**. Die Schichtung ist strikt getrennt: UI kommuniziert nur mit ViewModels, ViewModels nutzen Repositories, Repositories orchestrieren lokale und entfernte Datenquellen.

### Schichten

```
┌──────────────────────────────────────────────────┐
│  UI Layer (Compose Screens)                      │
│  ┌──────────┐  ┌────────────┐  ┌──────────────┐ │
│  │  Screens  │  │ ViewModels │  │  Navigation  │ │
│  │  (Compose)│  │ (StateFlow)│  │ (Nav Compose)│ │
│  └──────────┘  └─────┬──────┘  └──────────────┘ │
├──────────────────────┼───────────────────────────┤
│  Domain Layer        │                           │
│  ┌───────────────────┼───────────────────┐       │
│  │  i18n / Splitter  │                   │       │
│  └───────────────────┼───────────────────┘       │
├──────────────────────┼───────────────────────────┤
│  Data Layer          ▼                           │
│  ┌──────────────────────────────────────────┐    │
│  │  Repository                              │    │
│  │  ┌──────────────┐  ┌──────────────────┐  │    │
│  │  │  Room DB      │  │  API Service     │  │    │
│  │  │  (Cache)      │  │  (Retrofit)      │  │    │
│  │  └──────────────┘  └────────┬─────────┘  │    │
│  └──────────────────────────────┼────────────┘    │
└─────────────────────────────────┼──────────────────┘
                                  │
                           Bessa API (HTTPS)
```

### Netzwerkschicht

```
BessaApi (Retrofit Interface)
  └── BessaInterceptor (fügt Auth-Token in Header ein)
       └── TokenProvider (liefert Token aus EncryptedSharedPreferences)
            └── DTOs (Moshi @JsonClass)
                 └── Data Mappers
                      └── Domain Model
                           └── UI State
```

### Dependency Injection (Hilt)

- **NetworkModule** – Retrofit, OkHttpClient, Moshi
- **DatabaseModule** – Room Database, DAOs
- **AuthModule** – EncryptedSharedPreferences, TokenProvider

### State-Management

ViewModels exponieren `StateFlow`-Objekte, die in Compose als State collected werden. Jeder Screen hat ein eigenes ViewModel, das über Hilt injected wird.

### Datenhaltung

| Daten | Speicherort | Zweck |
|-------|-------------|-------|
| Auth-Token | EncryptedSharedPreferences | Sitzungspersistenz |
| Menü-Cache | Room Database | Offline-Zugriff |
| UI-State | ViewModel StateFlow | Aktuelle Ansicht |

### Build-Pipeline

```
Kotlin-Quellen ──> KSP (Moshi, Room, Hilt) ──> Compile ──> R8/ProGuard ──> AAB
```

---

## Vergleich: Web vs. Android

| Aspekt | Web (Bookmarklet) | Android (Native) |
|--------|-------------------|-------------------|
| **Sprache** | JavaScript (ES6) | Kotlin 2.0.21 |
| **UI** | DOM (Browser) | Jetpack Compose + Material 3 |
| **State** | Singleton (state.js) | ViewModel + StateFlow |
| **Cache** | localStorage | Room + EncryptedSharedPreferences |
| **Auth** | Session Harvesting / Login-Form | Retrofit Interceptor mit Token |
| **Build** | Webpack + Terser | Gradle (AGP 8.7.0) |
| **Min. API** | – (Browser) | Android 12 (API 31) |
| **DE/EN** | i18n.js (Browser-Language) | domain/i18n/ |
| **API** | fetch() | Retrofit + OkHttp |
| **DI** | Keine (manuelle Module) | Hilt 2.52 |

---

## Sicherheit

- **Kommunikation:** HTTPS mit TLS 1.3 für alle API-Aufrufe
- **Auth-Token:** Web → localStorage, Android → EncryptedSharedPreferences
- **Passwörter:** Werden niemals lokal gespeichert, nur zur Authentifizierung an Bessa API gesendet
- **Tracking:** Keine Analytics, kein Crash Reporting, kein Tracking
