# Architecture Decision Record: Native Android App

**Status**: Accepted (2026-06-24), Aktualisiert (2026-06-29)
**Context**: Portierung des Kantine-Wrapper-Bookmarklets (v1.9.4) auf Android

---

## Aktueller Stand

Dieses ADR wurde am 2026-06-29 aktualisiert, um den tatsächlichen MVP-Stand widerzuspiegeln. Die ursprüngliche Planung sah ein umfangreicheres Feature-Set vor (Order-Flow, Flagging, Push-Notifications). Im Zuge der MVP-Entwicklung wurde der Scope reduziert, die Tech-Stack-Entscheidungen wurden konkretisiert und das Repository als Monorepo-Modul unter `android/` realisiert.

---

## 1. Zielplattform

**Entscheidung**: Native Android App mit Kotlin + Jetpack Compose

Begründung:
- **Play Store Distribution**: Automatische Updates, kein GitHub-Release-Management nötig.
- **Keine Plattform-Kompromisse**: Room (Cache), EncryptedSharedPreferences (Token),
  BiometricPrompt (optionaler Schutz) – alles nativ verfügbar.
- **Background-Polling** und **Push-Notifications** waren ursprünglich geplant,
  wurden aber aus dem MVP-Scope gestrichen (siehe Abschnitt 5).

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

## 4. Technologien (Android)

| Layer | Technologie | Zweck |
|---|---|---|
| **UI** | Jetpack Compose (BOM 2024.10.00) + Material 3 | Deklarative Wochenansicht, Tageskarten, dynamische Farben |
| **Navigation** | Navigation Compose 2.8.3 | Screen-Navigation mit Hilt-Integration |
| **API-Client** | Retrofit 2.11.0 + OkHttp 4.12.0 + Moshi 1.15.1 (KSP) | REST-Kommunikation mit Token-Auth, JSON-Parsing |
| **Lokaler Cache** | Room 2.6.1 (KSP) | Offline-Cache für Menüs |
| **Token-Speicher** | EncryptedSharedPreferences 1.1.0-alpha06 | Auth-Token (Android Keystore) |
| **DI** | Hilt 2.52 + hilt-navigation-compose 1.2.0 | Dependency Injection |
| **Async** | Kotlinx Coroutines | Asynchrone Operationen, Flows |
| **State** | Lifecycle ViewModel Compose 2.8.6 | UI-State-Management |
| **Language Splitter** | Kotlin-Port des bestehenden Trigram-Modells | DE/EN-Erkennung in Menübeschreibungen |
| **Build** | Kotlin 2.0.21, AGP 8.7.0, KSP, ProGuard/R8 | Kompilierung, Code-Generierung, Minifizierung |

### Aus dem MVP gestrichen (Future)

| Technologie | Ursprünglicher Zweck | Status |
|---|---|---|
| WorkManager + ForegroundService | 5-Minuten-Polling für geflagte Menüs | Deferred |
| NotificationCompat + Channel | In-App + System-Benachrichtigungen | Deferred |
| DataStore | Flags, Highlight-Tags, Theme, Sprache | Nicht verwendet (Room + EncryptedPrefs stattdessen) |

---

## 5. Aufwandsabschätzung (MVP)

| Phase | Tage | Status |
|---|---|---|
| Projektsetup (Gradle, Dependencies, CI) | 1 | Done |
| API-Client + Auth (Retrofit, EncryptedPrefs, Login) | 2 | Done |
| Room-Datenbank + Repository | 2 | Done |
| WeekView + Dashboard (Compose-Grid, Tageskarten) | 3 | Done |
| Language-Splitter-Portierung (JS → Kotlin) | 2 | Done |
| Material 3 Theming + Dynamic Colors | 1 | Done |
| Testing + Play Store Release | 3 | Done |
| **Gesamt MVP** | **~14 Tage** | **Done** |

### MVP-Features (tatsächlich implementiert)

- Login (Bessa API Auth)
- Wochenansicht (Menü pro Tag)
- Wochen-Navigation (Pfeile / Swipe)
- DE/EN Language Detection (Trigram-Port)
- Material 3 Theming mit dynamischen Farben

### Aus dem MVP gestrichen (Future)

| Feature | Ursprüngliche Schätzung | Status |
|---|---|---|
| Order-Flow (Bestellen + Stornieren) | 2 Tage | Future |
| Order History (gruppiert nach Monat/Woche) | 2 Tage | Future |
| Flagging + Background-Polling | 4 Tage | Future |
| Push Notifications | 1 Tage | Future |
| Smart Highlights + Settings | 1 Tage | Future |

---

## 6. Repository-Struktur (Monorepo)

```
github.com/TauNeutrino/kantine-overview/
├── android/                          ← Android-Modul (rootProject.name = "kantine")
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/at/kaufi/kantine/
│   │   │   │   ├── MainActivity.kt
│   │   │   │   ├── KantineApp.kt
│   │   │   │   ├── ui/              ← Jetpack Compose
│   │   │   │   ├── data/            ← Room + Repository
│   │   │   │   ├── network/         ← Retrofit + DTOs
│   │   │   │   ├── domain/          ← LanguageSplitter, I18n
│   │   │   │   └── di/              ← Hilt Module
│   │   │   └── res/
│   │   ├── build.gradle.kts
│   │   └── proguard-rules.pro
│   ├── build.gradle.kts
│   └── settings.gradle.kts
├── docs/
├── src wished/                        ← Web-Bookmarklet
└── ...
```

Monorepo-Ansatz: Android als Modul `android/` mit `rootProject.name = "kantine"`
und `include(":app")`. Namespace: `at.kaufi.kantine`.
API-Vertrag (`bessa-openapi.yaml`) als Shared State zwischen Web und Android.
