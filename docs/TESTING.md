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

## CI

Aktuell ist kein CI-System konfiguriert. Tests werden lokal ausgeführt. Für zukünftige CI-Integrationen müssen die Build-Skripte (`npm test`, `./gradlew test`) als Pipeline-Schritte definiert werden.
