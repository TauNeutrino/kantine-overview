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
