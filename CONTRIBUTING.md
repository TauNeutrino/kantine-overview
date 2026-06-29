# Mitwirkungsrichtlinien

Danke für dein Interesse an diesem Projekt. Diese Richtlinien gelten für das gesamte Monorepo mit den beiden Sub-Projekten Web (Bookmarklet) und Android (App).

## Wie du mitwirken kannst

- **Fehler melden**: Erstelle ein Issue mit einer klaren Beschreibung, Schritten zur Reproduktion und erwartetem Verhalten.
- **Features vorschlagen**: Erstelle ein Issue und beschreibe das Problem, das du lösen möchtest, und deinen Lösungsvorschlag.
- **Pull Request**: Forke das Repository, erstelle einen Branch, committe deine Änderungen und öffne einen PR.

## Entwicklungs-Setup

Für detaillierte Setup-Anweisungen siehe `SETUP.md`.

- **Web**: `npm install` und `npm run build`
- **Android**: Android Studio mit JDK 17, `./gradlew bundleRelease`

## Code-Stil

### Web (Bookmarklet)

- ES6-Module mit `import`/`export`
- Keine Semikolons
- Einheitliche camelCase-Namen
- Funktionen klein und fokussiert halten
- Single-Quotes für Strings

### Android (App)

- Kotlin-Coding-Conventions befolgen
- Jetpack Compose: Stateless Composables bevorzugen, ViewModels für Logik
- Hilt: Module in `di/`-Paketen, `@InstallIn(SingletonComponent::class)`
- Moshi: `@JsonClass(generateAdapter = true)` für DTOs
- Room: `@Entity` mit expliziten `tableName` und `primaryKeys`

## Commit-Nachrichten

Wir verwenden Conventional Commits:

- `feat:` Neue Funktion
- `fix:` Fehlerbehebung
- `chore:` Wartung, Build, Dependencies
- `docs:` Dokumentation
- `refactor:` Code-Refactoring ohne Verhaltensänderung

## Branch-Namen

- `feature/beschreibung` — Neue Funktion
- `fix/beschreibung` — Fehlerbehebung
- `chore/beschreibung` — Wartung oder Build

## Pull-Request-Prozess

1. Forke das Repository und erstelle einen Branch nach der Namenskonvention.
2. Committe mit Conventional Commits.
3. Stelle sicher, dass alle Tests bestanden sind.
4. Öffne einen PR mit einer klaren Beschreibung der Änderungen.
5. Warte auf ein Code Review und bearbeite das Feedback.

## Test-Anforderungen

Alle Tests müssen bestanden sein, bevor ein PR gemerged wird:

- **Web**: `npm test`
- **Android**: `./gradlew test`

## Verhaltenskodex und Lizenz

Dieses Projekt unterliegt dem [Verhaltenskodex](CODE_OF_CONDUCT.md) und der [MIT-Lizenz](LICENSE).
