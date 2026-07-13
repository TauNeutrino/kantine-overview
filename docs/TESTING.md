# Test-Anleitung

Diese Anleitung beschreibt, wie Tests für beide Projekte ausgeführt und geschrieben werden.

---

## Web Bookmarklet Tests

### Test-Suite ausführen

```bash
npm test
```

Dies führt folgende Tests aus (konfiguriert in `package.json`):
- `tests/test_utils.js` – Utility-Funktionen
- `tests/test_actions.js` – Business Logic
- `tests/test_logic.js` – Kernlogik

### Einzelne Tests ausführen

```bash
node tests/test_utils.js
node tests/test_actions.js
node tests/test_logic.js
node tests/test_api.js
node tests/test_dom.js
node tests/test_security.js
```

### Verfügbare Testdateien

Das Verzeichnis `tests/` enthält 19 Testdateien:

| Datei | Beschreibung |
|-------|-------------|
| `test_utils.js` | Hilfsfunktionen |
| `test_actions.js` | Business Logic (Aktionen) |
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

### Manuelles UI-Testing

Öffne `dist/kantine-standalone.html` im Browser – dieses nutzt Mock-Daten und benötigt keine API.

---

## Android App Tests

### Unit Tests

```bash
cd android && ./gradlew test
```

**Test-Location:** `android/app/src/test/java/at/kaufi/kantine/`

**Bibliotheken:**
- **JUnit 4.13.2** – Test-Runner
- **MockK 1.13.12** – Mocking in Kotlin
- **kotlinx-coroutines-test 1.9.0** – Coroutine-Testing
- **Turbine 1.1.0** – Flow-Testing
- **MockWebServer 4.12.0** – API-Mocking

### Instrumentierte Tests (UI)

```bash
cd android && ./gradlew connectedCheck
```

**Test-Location:** `android/app/src/androidTest/java/at/kaufi/kantine/`

**Bibliotheken:**
- **Compose UI Test** – Compose-Interaktionen
- **Hilt Android Testing** – DI in Tests
- **Screengrab 2.1.1** – Screenshots für Play Store

### Manuelles Testen

```bash
cd android && ./gradlew assembleDebug
# Installiere die APK auf einem Gerät oder Emulator (API 31+)
```

Alternativ: Play Store Internal Testing Track (siehe [play-store-release.md](play-store-release.md)).

---

## Test-Philosophie

### Fokus

- **Business Logic testen** – ViewModels, Repositories, Use Cases
- **Externe Dependencies mocken** – API, Datenbank
- **UI-State-Transitionen testen** – nicht pixelgenaues Rendering

### Regression

- Schreibe einen Regression-Test **bevor** du einen Bug fixst
- Der Test reproduziert den Bug → Fix → Test wird grün

### Web Tests (JavaScript)

```javascript
// Beispiel: Test für actions.js
const assert = require('assert');
// Mock-Abhängigkeiten, rufe Funktion auf, prüfe Ergebnis
```

### Android Tests (Kotlin)

```kotlin
// Beispiel: Test für ViewModel
@Test
fun `fetch menu updates state correctly`() = runTest {
    val repo = mockk<MenuRepository>()
    val vm = MenuViewModel(repo)
    // when/then/verify
}
```

---

## CI (GitHub Actions)

Das Projekt verwendet **GitHub Actions** für Continuous Integration. Zwei Workflows sind konfiguriert:

### Web: `Build & Deploy` (`.github/workflows/build-and-deploy.yml`)

- **Trigger:** Push/PR auf `main`, manueller Dispatch
- **Schritte:**
  - `npm ci` + `npm run build` (Webpack + Bookmarklet)
  - Erzeugt Git-Tag aus `version.txt`
  - Deployed `dist/` auf GitHub Pages
- **Secrets:** `GIST_PAT`, `GIST_ID`, `GIST_SALT`, `GIT_PAT`

### Android: `Android CI` (`.github/workflows/android-ci.yml`)

- **Trigger:** Push/PR auf `main` (nur bei Änderungen an `android/**`)
- **Schritte:**
  - Debug APK: `./gradlew assembleDebug`
  - Lint: `./gradlew lint`
  - Unit Tests: `./gradlew test`
  - Release AAB: `./gradlew bundleRelease` (nur bei Push, nicht PR)
- **Secrets:** `SIGNING_KEY_BASE64` (Base64-kodiertes Keystore für Release-Builds)

### Hinweis

Release-Builds (Web-Tagging, Android AAB mit Signing) sind auf GitHub Actions angewiesen, da die benötigten Secrets nur dort hinterlegt sind. Lokal können nur Debug-Builds und Tests ausgeführt werden.
