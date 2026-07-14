# Test-Anleitung

Diese Anleitung beschreibt, wie Tests für das Web-Bookmarklet ausgeführt und geschrieben werden.

---

## Test-Suite ausführen

```bash
npm test
```

Dies führt folgende Tests aus (konfiguriert in `package.json`):
- `tests/test_utils.js` – Utility-Funktionen
- `tests/test_actions.js` – Business Logic
- `tests/test_logic.js` – Kernlogik

## Einzelne Tests ausführen

```bash
node tests/test_utils.js
node tests/test_actions.js
node tests/test_logic.js
node tests/test_api.js
node tests/test_dom.js
node tests/test_security.js
```

## Verfügbare Testdateien

Das Verzeichnis `tests/` enthält 19 Testdateien:

| Datei | Beschreibung |
|-------|-------------|
| `test_utils.js` | Hilfsfunktionen |
| `tests/test_actions.js` | Business Logic (Aktionen) |
| `test_logic.js` | Kernlogik |
| `test_api.js` | API-Integration |
| `test_dom.js` | UI-DOM Tests (JSDOM) |
| `test_security.js` | Sicherheitsrelevante Tests |
| `test_langmodel.js` | Spracherkennungsmodell |
| `test_langmodel_learning.js` | Learning-Verhalten |
| `test_splitter.js` | Text-Splitter |
| `test_segment.js` | Segmentierung |
| `test_normalize.js` | Normalisierung |
| `test_score.js` | Scoring |
| `test_boundary.js` | Grenzfälle |
| `test_no_info_lost.js` | Informationsverlust |
| `test_templates.js` | Templates |
| `auto-update-bootloader.test.js` | Auto-Update Bootloader (Version-Check, Cache, CDN-Pfade) |
| `stats-tracker.test.js` | Stats-Tracking & Gist-Flush |
| `stats-integration.test.js` | Stats-Integration |
| `benchmark_tags.js` | Performance-Benchmarks |

## Manuelles UI-Testing

Öffne `dist/kantine-standalone.html` im Browser – dieses nutzt Mock-Daten und benötigt keine API.

---

## Test-Philosophie

### Fokus

- **Business Logic testen** – Aktionen, State-Transitionen, Utilities
- **Externe Dependencies mocken** – API, Storage
- **UI-State-Transitionen testen** – nicht pixelgenaues Rendering

### Regression

- Schreibe einen Regression-Test **bevor** du einen Bug fixst
- Der Test reproduziert den Bug → Fix → Test wird grün

### Beispiel

```javascript
// Beispiel: Test für actions.js
const assert = require('assert');
// Mock-Abhängigkeiten, rufe Funktion auf, prüfe Ergebnis
```

---

## CI (GitHub Actions)

Das Projekt verwendet **GitHub Actions** für Continuous Integration.

### `Build & Deploy` (`.github/workflows/build-and-deploy.yml`)

- **Trigger:** Push/PR auf `main`, manueller Dispatch
- **Schritte:**
  - `npm ci` + `npm run build` (Webpack + Bookmarklet)
  - Erzeugt Git-Tag aus `version.txt`
  - Deployed `dist/` auf GitHub Pages
- **Secrets:** `GIST_PAT`, `GIST_ID`, `GIST_SALT`, `GIT_PAT`

### Hinweis

Release-Builds (Git-Tagging, GitHub Pages Deploy) sind auf GitHub Actions angewiesen, da die benötigten Secrets nur dort hinterlegt sind.

