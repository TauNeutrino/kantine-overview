# Architecture Decision Record: Native Android App

**Status**: Accepted (2026-06-24)
**Context**: Portierung des Kantine-Wrapper-Bookmarklets (v1.9.4) auf Android

---

## 1. Zielplattform

**Entscheidung**: Native Android App mit Kotlin + Jetpack Compose

Begründung:
- **Zuverlässiges Background-Polling**: WorkManager + ForegroundService sind der einzige Weg,
  5-Minuten-Intervalle auf Android 12+ zu realisieren. PWA/WebView scheitern hier.
- **Push-Notifications**: NotificationCompat + NotificationChannel für Flags ohne FCM-Server.
- **Play Store Distribution**: Automatische Updates, kein GitHub-Release-Management nötig.
- **Keine Plattform-Kompromisse**: Room (Cache), EncryptedSharedPreferences (Token),
  BiometricPrompt (optionaler Schutz) – alles nativ verfügbar.

---

## 2. Code-Sharing zwischen Web (Bookmarklet) und Android

**Entscheidung**: Kein erzwungener Code-Sharing. Getrennte Implementierungen,
nur API-Vertrag (`bessa-openapi.yaml`) als Single Source of Truth.

### Verworfen

| Ansatz | Grund der Ablehnung |
|---|---|
| **Kotlin Multiplatform (KMP)** | KMP-JS-Output ist zu schwer (>400 KB) für das Bookmarklet (205 KB Budget). Der Build-Prozess (Gradle statt Webpack/Terser) ist inkompatibel mit dem bestehenden Bookmarklet-Build (CSS-Injection, Favicon-Embedding, Installer-Generierung). |
| **TypeScript Monorepo + JS-Bridge** | JS-Bridge auf Android ist ein Debug-Albtraum. Der Language-Splitter müsste für jedes Menü-Item die Bridge passieren – Latenz-Problem. Verlust von Kotlin-Typensicherheit für Kernlogik. |
| **OpenAPI-Generator** | Nur API-Client-Sharing möglich – der Großteil der Logik (Language Splitter, Flag-System, Polling) bliebe doppelt. Der geringe Nutzen rechtfertigt den Build-Pipeline-Aufwand nicht. |

### Konsequenz

Beide Plattformen teilen sich:
- Die REST-API-Spezifikation (`bessa-openapi.yaml`)
- Geschäftslogik (wird plattformspezifisch implementiert, aber nach identischer Spezifikation)
- Konstanten (API-Base-URL, Venue ID, Menu ID)

Jede Plattform optimiert für ihr Ökosystem:
- **Web**: ES6-Module → Webpack → Terser → Bookmarklet (wie bisher)
- **Android**: Kotlin → Jetpack Compose → Gradle → APK/AAB

---

## 3. Wegfallende Features durch Play Store

Das Bookmarklet benötigt ein eigenes Update-System (GitHub-API + Installer-HTML).
Die Android-App nutzt den Play Store:

| Bookmarklet-Feature | Android-Ersatz |
|---|---|
| `scripts/build.js` (Build-Pipeline) | Gradle assembleRelease |
| `release.sh` (Taggen + Pushen) | Play Console Upload |
| `version.txt` | `versionCode` / `versionName` in build.gradle.kts |
| `changelog.md` | Play Store Release Notes |
| Versions-Modal + Update-Check + ETag-Caching | **Entfällt komplett** |
| Dev-Mode (Tags statt Releases) | Play Store Internal Testing Track |
| Installer-HTML + Bookmarklet-Payload | **Entfällt** – App wird installiert |
| Favicon-Embedding | **Entfällt** – natives App-Icon |

---

## 4. Empfohlene Technologien (Android)

| Layer | Technologie | Zweck |
|---|---|---|
| **UI** | Jetpack Compose + Material 3 | Deklarative Wochenansicht, Tageskarten |
| **Navigation** | Compose Navigation | This-Week / Next-Week / History / Settings |
| **API-Client** | Retrofit + OkHttp + Kotlinx Serialization | REST-Kommunikation mit Token-Auth |
| **Lokaler Cache** | Room Database | Offline-Cache für Menüs + Bestellhistorie |
| **Preferences** | DataStore (Preferences) | Flags, Highlight-Tags, Theme, Sprache |
| **Token-Speicher** | EncryptedSharedPreferences | Auth-Token (Android Keystore) |
| **Background** | WorkManager (15min) + ForegroundService (5min Polling) | Geflaggte Menüs überwachen |
| **Notifications** | NotificationCompat + Channel | In-App + System-Benachrichtigungen |
| **DI** | Hilt / Koin | Dependency Injection |
| **Language Splitter** | Kotlin-Port des bestehenden Trigram-Modells | DE/EN-Erkennung in Menübeschreibungen |

---

## 5. Aufwandsabschätzung

| Phase | Tage |
|---|---|
| Projektsetup (Gradle, Dependencies, CI) | 1 |
| API-Client + Auth (Retrofit, EncryptedPrefs, Login) | 2 |
| Room-Datenbank + Repository | 2 |
| WeekView + Dashboard (Compose-Grid, Tageskarten) | 3 |
| Order-Flow (Bestellen + Stornieren) | 2 |
| Order History (gruppiert nach Monat/Woche) | 2 |
| Language-Splitter-Portierung (JS → Kotlin) | 2 |
| Flagging + Background-Polling (WorkManager + ForegroundService) | 4 |
| Notifications (Lokal für Flags + Countdown) | 1 |
| Smart Highlights + Settings | 1 |
| Testing + Play Store Release | 3 |
| **Gesamt** | **~20 Tage** |

---

## 6. Repository-Struktur (Vorschlag)

Das neue Repository sollte parallel zum bestehenden Web-Repo existieren:

```
github.com/TauNeutrino/kantine-android/    ← NEU
├── app/
│   ├── src/main/
│   │   ├── kotlin/at/kaufi/kantine/
│   │   │   ├── MainActivity.kt
│   │   │   ├── KantineApp.kt
│   │   │   ├── ui/          ← Jetpack Compose
│   │   │   ├── data/        ← Room + Repository
│   │   │   ├── network/     ← Retrofit + DTOs
│   │   │   ├── domain/      ← LanguageSplitter, FlagLogic
│   │   │   ├── worker/      ← WorkManager + ForegroundService
│   │   │   └── di/          ← Hilt Module
│   │   └── res/
│   ├── build.gradle.kts
│   └── proguard-rules.pro
├── api/
│   └── bessa-openapi.yaml   ← Referenz (Kopie aus Web-Repo)
├── build.gradle.kts
└── settings.gradle.kts
```

Monorepo-Ansatz (beide Plattformen unter einem Dach) ist möglich, aber nicht zwingend.
Der API-Vertrag (`bessa-openapi.yaml`) ist der einzige Shared State – das lässt sich
auch per Git Submodule oder einfacher Kopie synchronisieren.
