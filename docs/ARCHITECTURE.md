# Architekturübersicht

## Übersicht

Dieses Repository enthält den Web-Client für die Knapp-Kantine. Er verwendet die **Bessa API** (`https://web.bessa.app/knapp-kantine`), authentifiziert sich per HTTP Basic Auth und arbeitet mit token-basierten Sitzungen.

> Die native Android-App ist in ein eigenes Repository ausgelagert: [github.com/TauNeutrino/kantine-app](https://github.com/TauNeutrino/kantine-app)

## Architektur

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
                                                     ──> kantine-auto-update-bundle.js
                                                     ──> version.json
```

### Deployment & Auto-Update

Das Bookmarklet ist bewusst ein **minimaler Bootloader**. Es enthält einen kleinen Auto-Update-Mechanismus, einen Splash-Screen für den Ladevorgang, Reinit-Logik für wiederholte Klicks sowie ein eingebettetes Fallback-Bundle. Die eigentliche Anwendung wird zur Laufzeit entweder vom CDN geladen oder – bei Netzwerkproblemen – aus dem eingebetteten Fallback verwendet.

#### Komponenten

| Artefakt | Ort | Zweck |
|----------|-----|-------|
| `bookmarklet.txt` | Im Browser-Lesezeichen des Nutzers | Bootloader + Fallback-Bundle |
| `version.json` | GitHub Pages (`https://tauneutrino.github.io/kantine-overview/version.json`) | Aktuelle Version + URL zum CDN-Bundle |
| `kantine-auto-update-bundle.js` | jsDelivr CDN (`https://cdn.jsdelivr.net/gh/...`) | Aktuelle Haupt-Anwendung |
| `_k_au_cache` | `localStorage` des Nutzers | Gecachtes Bundle für Offline-Nutzung (1h Gültigkeit) |

#### Ablauf beim Start

```
Bookmarklet wird geklickt
        │
        ▼
Bootloader startet (Splash: "Initialisiere...")
        │
        ├──> Liest lokalen Cache (_k_au_cache, max. 1h alt)
        │
        ├──> Fragt version.json auf GitHub Pages ab
        │
        └──> Entscheidung:
                 │
                 ├── CDN-Version ist neuer ──> Splash: "Update wird geladen..."
                 │                            Bundle von jsDelivr laden,
                 │                            in localStorage cachen,
                 │                            ausführen.
                 │
                 ├── Cache ist neuer ────────> Gecachtes Bundle ausführen
                 │                            (kein Netzwerk nötig).
                 │
                 └── Kein Update verfügbar ──> Eingebettetes Fallback-Bundle
                                                ausführen.
```

#### Reinit bei wiederholtem Klick

Wird das Lesezeichen geklickt, während Kantine bereits läuft, führt der Bootloader einen **Reinit** durch:
- Es erscheint kein Browser-Alert mehr.
- Der Bootloader prüft erneut auf Updates.
- Ist die aktuelle Version bereits installiert, wird die bestehende UI beibehalten.
- Gibt es ein Update, wird die alte UI ersetzt und das neue Bundle ausgeführt.

#### Wichtige Einschränkung

Der **Bootloader selbst** kann sich nicht auto-updaten. Er entscheidet zwar, welches Bundle geladen wird, aber sein eigener Code ist fest im Browser-Lesezeichen gespeichert. Das bedeutet:

- Änderungen an der **Haupt-App** (alles unter `src/` außer dem Bootloader-Wrapper in `scripts/build.js`) kommen automatisch über das CDN.
- Änderungen am **Bootloader** (z.B. Splash-Screen, Reinit-Verhalten, Logging, Cache-Logik) erfordern, dass Nutzer das Lesezeichen neu installieren.

Für eine zukünftige Benachrichtigung („Bitte Lesezeichen neu installieren“) kann die Haupt-App eine entsprechende Meldung anzeigen. Das ist aber keine Bootloader-Funktion und muss in der Haupt-App implementiert werden.

## Sicherheit

- **Kommunikation:** HTTPS mit TLS 1.3 für alle API-Aufrufe
- **Auth-Token:** Wird im Browser-`localStorage` gehalten
- **Passwörter:** Werden niemals lokal gespeichert, nur zur Authentifizierung an Bessa API gesendet
- **Tracking:** Keine Analytics, kein Crash Reporting, kein Tracking
