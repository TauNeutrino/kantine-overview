# Entwicklungsumgebung einrichten

Diese Anleitung beschreibt, wie du die Entwicklungsumgebung für beide Projekte (Web Bookmarklet und Android App) einrichtest.

---

## Voraussetzungen

| Tool | Version | Zweck |
|------|---------|-------|
| Node.js | 18+ | Web Bookmarklet |
| JDK | 17 | Android Build |
| Android Studio | Hedgehog+ | Android Entwicklung |
| Android SDK | API 31–35 | Android Build |
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

## Android App

### Setup in Android Studio

1. Öffne Android Studio
2. **File → Open** → wähle `android/` im Projekt-Root
3. Warte auf den Gradle-Sync (lädt Dependencies automatisch)

### Ohne Android Studio

```bash
# Debug APK bauen
cd android && ./gradlew assembleDebug

# Unit Tests ausführen
./gradlew test

# Release AAB bauen (benötigt Keystore)
./gradlew bundleRelease
```

### Keystore für Release-Builds

Für Release-Builds wird ein signierter Keystore benötigt:

1. Lege `android/keystore.properties` an (siehe [docs/android-signing.md](android-signing.md))
2. Platziere `release.jks` in `android/keystore/`
3. Führe `./gradlew bundleRelease` aus

> **Warnung:** Der Keystore ist unersetzlich. Ohne ihn kann die App nicht unter `at.kaufi.kantine` aktualisiert werden. Sichere ihn an einem verschlüsselten Ort.

---

## Common Tasks

| Aufgabe | Befehl |
|---------|--------|
| Web: Dependencies installieren | `npm install` |
| Web: Build | `npm run build` |
| Web: Tests | `npm test` |
| Web: Release | `npm run release` |
| Android: Debug APK | `cd android && ./gradlew assembleDebug` |
| Android: Unit Tests | `cd android && ./gradlew test` |
| Android: Instrumentierte Tests | `cd android && ./gradlew connectedCheck` |
| Android: Release AAB | `cd android && ./gradlew bundleRelease` |
| Android: Clean Build | `cd android && ./gradlew clean` |

---

## Weiterführende Dokumentation

- [Architektur](ARCHITECTURE.md) – Systemarchitektur beider Projekte
- [Testing](TESTING.md) – Test-Anleitung und Test-Philosophie
- [Android Signing](android-signing.md) – Keystore-Setup
- [Play Store Setup](play-store-setup.md) – Google Play Console Einrichtung
- [Play Store Release](play-store-release.md) – Release-Workflow
