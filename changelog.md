## v1.4.5 (2026-02-24)
- **Fix**: Doppelten Scrollbalken in der Versionen-Liste entfernt.

## v1.4.4 (2026-02-24)
- **Feature**: Das Versionsmenü enthält nun direkte Links zu GitHub, um Fehler zu melden oder neue Features vorzuschlagen.

## v1.4.3 (2026-02-24)
- **Fix**: Der Rahmen des "Heute Bestellt" Menüs ist nun konsequent violett (passend zum Glow-Effekt).

## v1.4.2 (2026-02-23)
- **Fix**: Das "Heute Bestellt" Menü leuchtet nun stimmig im Design-Violett statt Blau.
- **Fix**: Abfangen des GitHub API Rate Limit (403) im Versionsdialog mit einer freundlicheren Fehlermeldung, da der User-Agent im Browser nicht manuell gesetzt werden darf.

## v1.4.1 (2026-02-22)
- **UX Verbesserungen**: Bestellhistorie gruppiert nach Jahren und Monaten mittels einklappbarem Akkordeon. Monatssummen integriert und Stati farblich abgehoben (Offen, Abgeschlossen, Storniert).

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
