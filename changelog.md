## v1.6.25 (2026-03-12)
- ⚡ **Performance**: Debounced Resize-Listener hinzugefügt. Die Höhen-Synchronisierung der Menü-Karten wird nun auch bei Viewport-Änderungen (z.B. Fenster-Skalierung oder Orientierungswechsel) automatisch und effizient ausgeführt.
- 🧹 **Tech**: `debounce` Utility-Funktion in `utils.js` ergänzt.

## v1.6.24 (2026-03-12)
- ⚡ **Performance**: Layout Thrashing in `syncMenuItemHeights` behoben. Durch Batch-Verarbeitung von DOM-Lese- und Schreibvorgängen wurde die Rendering-Effizienz beim Wochenwechsel verbessert.

## v1.6.23 (2026-03-12)
- 🎨 **UI**: Umfassende UI-Verbesserungen umgesetzt:
  - **Glassmorphism**: Header-Hintergrundtransparenz auf 72% reduziert (war 90%) – der Blur-Effekt ist nun beim Scrollen sichtbar.
  - **Dark-Mode Kontrast**: `--bg-card` abgedunkelt (`#283548`), `--border-color` leicht aufgehellt (`#526377`) – bessere Trennung zwischen Body und Card.
  - **Accent-Color**: Im Light-Mode von Slate-900 (fast schwarz) auf Blue-600 (`#2563eb`) geändert – klarer sichtbarer Akzent.
  - **Typography**: `.item-desc` `line-height` auf 1.5 (body-konsistent), `.day-date` kleiner und dezenter (0.8rem, opacity 0.75), `.item-name` leicht reduziert (0.95rem).
  - **Item-Separator**: Subtile Trennlinie zwischen Menü-Items in der Tageskarte.
  - **Badge-Konsistenz**: Alle Badges (`badge`, `tag-badge-small`) auf `border-radius: 6px` vereinheitlicht.
  - **A11y – Reduced Motion**: `@media (prefers-reduced-motion: reduce)` deaktiviert alle dekorativen Puls-/Glow-Animationen für Motion-sensitive Nutzer.
  - **A11y – Focus-Visible**: Globaler `:focus-visible` Outline-Ring (2px, accent-color) für Tastaturnavigation.
  - **Active-States**: `:active` Feedback (`scale(0.97)`) für Bestell-, Storno- und Flag-Buttons.
  - **Mobile Breakpoint**: Von 600px auf 768px erweitert (deckt Tablets ab); Grid-Deklaration explizit gesetzt um Browser-Override-Bug zu vermeiden.

## v1.6.22 (2026-03-12)
- 🧹 **UX Cleanup**: Text-Label am Sprachumschalter entfernt. Der Button zeigt nun nur noch das `translate`-Icon an, was die Controls-Bar ruhiger macht.

## v1.6.21 (2026-03-12)
- ✨ **Feature**: Sprachumschaltung Redesign – Die Sprachwahl (DE/EN/ALL) wurde von der Header-Mitte in den rechten Controls-Bereich verschoben. Sie ist nun als Icon-Dropdown mit aktueller Status-Anzeige (z.B. "DE") verfügbar. Für die deutsche Sprache wird die 🇦🇹 Flagge verwendet.

## v1.6.20 (2026-03-12)
- 🧹 **Cleanup**: Wochenkosten-Anzeige entfernt (Weekly Cost Display) – Auf User-Wunsch wurde die Anzeige der wöchentlichen Gesamtkosten im Header entfernt, um die UI zu entschlacken. FR-040 als obsolet markiert.

## v1.6.19 (2026-03-11)
- 🎨 **UX**: Grid-Layout & Glow Overlap Fix – Die Karten-Inhalte wurden auf ein sauberes Grid-Gap-Modell umgestellt (`row-gap: 1.5rem`). Dies verhindert technische Überlappungen von Menü-Items und stellt sicher, dass Glow-Effekte (Bestellt, Highlight) alle Inhalte korrekt umschließen. Manuelle Abstände wurden bereinigt.

- 🎨 **UX**: Glow-Styling angepasst – Die farblichen Hervorhebungen (Bestellt, Highlight, Flagged) wurden so korrigiert, dass sie nicht mehr bis an den Kartenrand reichen, sondern innerhalb des Karten-Bodys mit entsprechendem Seitenabstand angezeigt werden.

- 🎨 **UX**: Fix Card Content Overflow – In der 5-Tage-Ansicht (Landscape) auf schmalen Bildschirmen umbrechen die Status-Badges und Buttons jetzt korrekt in eine neue Zeile, statt über den Kartenrand hinauszuragen. Das Karten-Padding wurde für Desktop-Ansichten optimiert.

- 🧹 **Wartbarkeit**: Alle verbliebenen hardcodierten deutschen UI-Strings in `actions.js` via `t()` übersetzt (Progress-Texte, Fehler-Labels, 'Angemeldet', 'Hintergrund-Synchronisation').
- 🔑 **Wartbarkeit**: Alle `localStorage`-Schlüssel in einheitliches `LS`-Objekt in `constants.js` zentralisiert. Alle Quelldateien verwenden jetzt `LS.*` statt Rohstrings.
- 🛡️ **Robustheit**: `setLangMode()` und `setDisplayMode()` in `state.js` prüfen jetzt Eingabewerte – ungültige Werte werden verworfen und protokolliert.
- 📝 **Kodierung**: JSDoc für `ui.js` und `injectUI()` ergänzt.

- 🐛 **Bugfix**: Geprüfte Menüs (`refreshFlaggedItems`) aktualisieren jetzt nur noch die tatsächlich geflaggten Artikel – nicht mehr alle Menüs des betroffenen Tages ([Bug 1]).
- 🐛 **Bugfix**: Beim Öffnen des Highlights-Modals werden bestehende Tags sofort angezeigt, auch ohne vorherige Neueingabe ([Bug 2]).
- 🎨 **UX**: Die Zahlen-Badges im „Nächste Woche"-Button wurden entfernt. Die Bestellübersicht (bestellt / bestellbar / gesamt + Highlights) ist jetzt als Tooltip abrufbar ([FR-100 Update]).
- 🌍 **Feature**: Bei Auswahl von EN wird die gesamte Benutzeroberfläche auf Englisch umgestellt (Buttons, Tooltips, Modals, Status-Badges, Wochentage, Bestellhistorie). DE und ALL behalten Deutsch bei ([FR-122]).
- ✨ **Feature**: Das Glühen des „Nächste Woche"-Buttons wird jetzt nur noch ausgelöst, wenn für Montag–Donnerstag bestellbare Menüs ohne bestehende Bestellung vorhanden sind. Freitag ist von dieser Prüfung ausgenommen ([FR-092 Update]).
- 🧹 **Wartbarkeit**: Code-Qualitätsprüfung aller Quelldateien – JSDoc-Kommentare ergänzt, Erklärungen für komplexe Logikblöcke hinzugefügt.
- 📦 **Neu**: `src/i18n.js` – Zentrales Übersetzungsmodul für alle statischen UI-Labels (DE/EN).

## v1.6.14 (2026-03-10)
- 🐛 **Bugfix**: Die globale "Aktualisiert am"-Zeit im Header wird bei einer manuellen Prüfung der geflaggten Menüs nicht mehr zurückgesetzt.

## v1.6.13 (2026-03-10)
- ✨ **Feature**: Manueller Refresh der geflaggten Menüs durch Klick auf das Alarm-Icon im Header ([FR-093](REQUIREMENTS.md#FR-093)).
- 🔄 **UI**: Visuelle Rückmeldung während der Prüfung durch Rotation des Icons.
- 🔔 **Notification**: Toast-Benachrichtigung zeigt die Anzahl der geprüften Menüs an.

## v1.6.12 (2026-03-10)
- 🔄 **Refactor**: Modularisierung von `kantine.js` in ES6-Module (`api.js`, `state.js`, `utils.js`, `ui.js`, etc.).
- 📦 **Build**: Integration von Webpack in den Build-Prozess zur Unterstützung der modularen Struktur.
- 🛡️ **Security**: XSS-Schutz durch Escaping dynamischer Inhalte in `innerHTML`.
- ⚡ **Performance**:
    - Optimierte Tag-Badge-Generierung und UI-Render-Loops (Verwendung von `reduce`).
    - Nutzung von `insertAdjacentHTML` statt `innerHTML` für effizienteres Rendering.
    - Batch-Fetching von `availableDates` zur Reduzierung der API-Calls.
    - Performance-Fixes in `ui_helpers.js`.
- 🧪 **Testing**: Unit-Tests für GitHub API-Header Generierung hinzugefügt.
- 🧹 **Cleanup**: Entfernung verwaister `console.log` Statements.
- 🐛 **Bugfix**: Korrektur des Tooltips beim Alarm-Icon (Polling-Zeit vs. globale Aktualisierungszeit).

## v1.6.11 (2026-03-09)
- 🔄 **Refactor**: Trennung der Zeitstempel für die Hauptaktualisierung (Header) und die Benachrichtigungsprüfung (Bell-Icon). Das Polling aktualisiert nun nicht mehr fälschlicherweise die "Aktualisiert am"-Zeit im Header.
- 🏷️ **Metadata**: Version auf v1.6.11 angehoben.

## v1.6.10 (2026-03-09)
- **Feature**: Robuste Kurs-Erkennung in zweisprachigen Menüs ([FR-121](REQUIREMENTS.md#FR-121)).
- **Fix**: Verhindert das Verschieben von Gängen bei fehlenden englischen Übersetzungen.
- **Improved**: Heuristik-Split erkennt nun zuverlässiger den Übergang von Englisch zurück zu Deutsch (z.B. bei "Achtung"-Hinweisen)

## v1.6.9 (2026-03-09)
- 🐛 **Bugfix**: Fehlerhafte Zeitangabe beim Bell-Icon ("vor 291h") behoben. Der Tooltip wird nun minütlich aktualisiert und nach jeder Menü-Prüfung korrekt neu gesetzt.
- 🔄 **Refactor**: Zeitstempel-Management für die letzte Aktualisierung vereinheitlicht und im `localStorage` persistiert.

## v1.6.8 (2026-03-06)
- ⚡ **Performance**: Das JavaScript für das Kantinen-Bookmarklet wird nun beim Build-Prozess (via Terser) minimiert, was die Länge der injizierten URL spürbar reduziert.

## v1.6.7 (2026-03-06)
- 🎨 **Style**: Das neue Header-Logo (`favicon_base.png`) wird nun konsequent auf 40x40px generiert und gerendert.

## v1.6.6 (2026-03-06)
- 🎨 **Style**: Den Schatten und den hervorstehenden Karten-Effekt für bestellte Menüs an vergangenen Tagen komplett entfernt - verbleiben nun visuell flach und unaufdringlich wie nicht-bestellte Menüs.

## v1.6.5 (2026-03-06)
- ✨ **Feature**: Das `restaurant_menu` Icon im Header wurde durch das neue `favicon_base.png` Logo ersetzt, passend zur Textgröße skaliert.
- 🎨 **Style**: Violette Umrahmung (Bestellt-Markierung) an vergangenen Tagen entfernt, um den Fokus auf aktuelle und zukünftige Bestellungen zu lenken.
- 🎨 **Style**: Der Glow-Effekt für am heutigen Tag bestellte Menüs wurde intensiviert.

## v1.6.4 (2026-03-05)
- ✨ **Feature**: Sprach-Lexikon (DE/EN) massiv erweitert um österreichische Begriffe (Nockerl, Fleckerl, Topfen, Mohn, Most etc.) und gängige Tippfehler aus dem Bessa-System (trukey, coffe, oveb etc.).
- 🧹 **Cleanup**: Sprach-Lexikon dedupliziert und alphabetisch sortiert für bessere Performance und Wartbarkeit.
- 🐛 **Bugfix**: Trennung von zweisprachigen Menüs (`splitLanguage`) verbessert: Erfasst nun auch Schrägstriche ohne Leerzeichen (z.B. `Suppe/Soup`).
- 🐛 **Bugfix**: Fehlerhafte Badge-Anzeige korrigiert (Variable `count` vs `orderCount`).

## v1.6.3 (2026-03-05)
- ✨ **Chore**: Slogan im Footer aktualisiert ("Jetzt Bessa Einfach! • Knapp-Kantine Wrapper • 2026 by Kaufis-Kitchen") und Footer-Höhe für mehr Platzierung optimiert.

## v1.6.2 (2026-03-05)
- ✨ **Feature**: Wochentags-Header (Montag, Dienstag etc.) scrollen nun als "Sticky Header" mit und bleiben am oberen Bildschirmrand haften.
  - Das Layout clippt scrollende Speisen ordentlich darunter weg.
  - Vollständiges Viewport-Scrolling: Das Layout nutzt nun die ganze Höhe aus (`100dvh`), wodurch Scrollbalken sauber am Rand positioniert sind.
- 🐛 **Bugfix**: Probleme mit Bessa's default `overflow` Verhalten behoben, das `position: sticky` auf iOS/WebKit-Browsern blockierte.

## v1.6.0 (2026-03-04)
- ✨ **Feature**: Sprachfilter für zweisprachige Menübeschreibungen. Neuer DE/EN/ALL Toggle im Header ermöglicht das Umschalten zwischen Deutsch, Englisch und dem vollen Originaltext. Allergen-Codes werden in allen Modi angezeigt. Einstellung wird persistent gespeichert.

## v1.5.1 (2026-03-04)
- 🐛 **Bugfix**: Freitagsbestellungen schlugen fehl ("Onlinebestellung sind nicht verfügbar"). Ursache: Der Order-Payload verwendete `preorder: false` und eine falsche Uhrzeit (`T10:00:00.000Z` statt `T10:30:00Z`). Beides wurde anhand der originalen Bessa-API korrigiert.

## v1.5.0 (2026-02-26)
Das große "Quality of Life"-Update! Zusammenfassung aller Features und Fixes seit v1.4.0:

- ✨ **Bestellhistorie**: Übersichtliche Historie direkt in der App – gruppiert nach Jahr/Monat, inklusive Summen, Stati (Offen/Abgeschlossen/Storniert) und Delta-Cache für rasantes Laden.
- ⚡ **Smart Cache & Performance**: Massive Reduzierung von API-Calls und Ladezeiten durch intelligenten lokalen Cache. Das Bookmarklet startet nun praktisch verzögerungsfrei.
- 🔄 **GitHub Release Management**: In-App Versions-Menü mit Auto-Update Check (`🆕` Icon). Umschalten zwischen "Stable" und "Dev" Versionen sowie Downgrade-Möglichkeit direkt über die GitHub API.
- 🌟 **Smart Highlights & UX**: Speisen-Favoriten leuchten nun im Design-Violett und erhalten Feature-Badges. Der Bestell-Badge für nächste Woche filtert nun intelligent personalisierte Highlights voraus.
- 🔔 **Bestell-Warnung & Notifications**: Der System-Alarm berücksichtigt nun Sessions korrekt, zeigt dynamische Farbwechsel (gelb/grün/rot) und warnt verlässlich vor dem Bestellschluss (10:00 Uhr). Altlasten von Vortagen werden automatisch geputzt.
- 🎨 **Eigenes Favicon**: Das Bookmarklet und der Installer haben nun ein eigenes Icon (Dreieck mit Besteck), das beim Hineinziehen in die Lesezeichenleiste übernommen wird (dynamisch generiert als lokales PNG).
- 🧹 **Lokaler Cache-Clear**: Ein in das Versions-Menü eingebauter "Papierkorb", der ausschließlich fehlerhafte Kantinen-Caches putzt, ohne dabei versehentlich die aktive Bessa-Host-Session zu zerstören.
- 🔒 **Sitzungs-Persistenz**: Die Login-Session überdauert jetzt neue Tabs, Fenster und Version-Upgrades reibungslos durch den Wechsel auf `localStorage`.
- 🛡️ **Testing & Stabilität**: Vollautomatische DOM- und Logik-Testing-Suites in der Release-Pipeline integriert. Fehlerhafte UI-Buttons gehören der Vergangenheit an.


## v1.4.0 (2026-02-22)
- **Feature**: Bestellhistorie per Knopfdruck abrufbar. Übersichtliche Darstellung, gruppiert nach Monaten und Kalenderwochen, inklusive Stornos. 📜✨

## v1.3.2 (2026-02-19)
- **Fix**: Falsche Anzahl an Highlight-Menüs im "Nächste Woche"-Badge korrigiert (zählte alle Menüs statt nur Highlights). 🐛

## v1.3.1 (2026-02-17)
- **Feature**: Smart Cache – API-Refresh beim Start wird übersprungen wenn Daten für die aktuelle KW vorhanden und Cache < 1h alt ist. ⚡

## v1.3.0 (2026-02-16)
- **Feature**: GitHub Release Management 📦
  - Version-Menü: Klick auf Versionsnummer zeigt alle verfügbaren Versionen
  - Dev-Mode Toggle: Zwischen Releases (stabil) und Tags (dev) wechseln
  - Downgrade-Support: Jede Version hat einen eigenen Installer-Link
  - Update-Check nutzt jetzt die GitHub API statt `version.txt`
  - GitHub PAT für höheres API-Rate-Limit (5000/h)
  - SemVer-Check: Update-Icon nur bei wirklich neuerer Version

## v1.2.9 (2026-02-16)

## v1.2.8 (2026-02-16)
- **Debug**: Weiteres Logging (Fetch-Status, Start-Log) zur Fehlersuche. 🔎

## v1.2.7 (2026-02-16)
- **Debug**: Verbose Logging für Update-Check eingebaut. 🐞

## v1.2.6 (2026-02-16)
- **Test**: Version Bump zum Testen der Live-Update-Erkennung. 🧪

## v1.2.5 (2026-02-16)
- **Refactor**: Update-Erkennung komplett überarbeitet (stündlicher Check, diskretes 🆕 Icon im Header, kein Banner mehr). 🔄
- **Cleanup**: Ungenutzter CSS-Code und Netzwerk-Traffic reduziert. 🧹
- **Fix**: Highlight-Logik stabilisiert (keine falschen Matches bei leeren Tags). 🏷️

## v1.2.4 (2026-02-16)
- **Feature**: Gefundene Highlights werden jetzt direkt im Menü als Badge angezeigt. 🏷️

## v1.2.3 (2026-02-16)
- **Fix**: Update-Icon ist jetzt klickbar und führt direkt zum Installer. 🔗
- **Dev**: Unit-Tests für Update-Logik im Build integriert. 🛡️

## v1.2.2 (2026-02-16)
- **UX**: Installer-Changelog jetzt einklappbar für mehr Übersicht. 📂

## v1.2.1 (2026-02-16)
- **Fix**: Smart Highlights werden jetzt korrekt auf Menü-Items angewendet (`checkHighlight` in `createDayCard`). 🌟
- **Feature**: Mock-Daten (`mock-data.js`) für Standalone-Tests eingebaut. 🧪
- **Style**: Highlight-Glow mit blauer Puls-Animation (`blue-pulse`) überarbeitet. 💎
- **Style**: Tag-Badges konsistent mit Badge-System gestaltet. 🏷️
- **Style**: "Hinzufügen"-Button (`#btn-add-tag`) als Primary-Button gestylt. 🎨
- **Style**: Modal-Body Padding und Input-Font korrigiert. 🔧
- **Docs**: README Projektstruktur mit Tabelle für `dist/`-Artefakte ergänzt. 📖

## v1.2.0 (2026-02-16)
- **Feature**: Bessere UX im Installer (Button oben, Log unten, Features aktualisiert). 💅
- **Tech**: Build-Tests hinzugefügt. 🧪
- **Fix**: Encoding-Probleme final behoben (dank Python Buildlogic). 🐍

## v1.1.2 (2026-02-16)
- **Fix**: Encoding-Problem beim Bookmarklet behoben (URL Malformed Error). 🔗

## v1.1.1 (2026-02-16)
- **Fix**: Kritischer Fehler behoben, der das Laden des Wrappers verhinderte. 🐛

## v1.1.0 (2026-02-16)
- **Feature: Bestell-Countdown**: Zeigt 1 Stunde vor Bestellschluss einen roten Countdown an. ⏳
- **Feature: Smart Highlights**: Markiere deine Lieblingsspeisen (z.B. "Schnitzel", "Vegetarisch"), damit sie leuchten. 🌟
- **Feature: Changelog**: Diese Übersicht der Änderungen. 📜
- **Verbesserung**: Live-Check der Version beim Update.

## v1.0.3 (2026-02-13)
- **Fix**: Update-Link öffnet nun den Installer direkt als Webseite (via htmlpreview).

## v1.0.2 (2026-02-13)
- **Sync**: Version mit GitHub synchronisiert.

## v1.0.1 (2026-02-12)
- **UI**: Besseres Design für "Nächste Woche" (Badges).
- **Core**: Grundlegende Funktionen (Bestellen, Guthaben, Token-Store).
