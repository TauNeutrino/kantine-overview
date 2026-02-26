# Kantine Wrapper Bookmarklet 

Ein intelligentes Bookmarklet für die Mitarbeiter-Kantine der Bessa App. Dieses Skript erweitert die Standardansicht um eine **Wochenübersicht**, Kostenkontrolle und verbesserte Usability.

## 🚀 Features

*   **Wochenübersicht:** Zeigt alle Tage der aktuellen Woche auf einen Blick.
*   **Bestell-Countdown:** ⏳ Roter Alarm 1h vor Bestellschluss.
*   **Smart Highlights:** 🌟 Markiere deine Favoriten (z.B. "Schnitzel", "Vegetarisch").
*   **Bestellstatus:** Farbige Indikatoren für bestellte Menüs.
*   **Kostenkontrolle:** 💰 Summiert automatisch den Gesamtpreis der Woche.
*   **Bestellhistorie:** 📜 Gruppiert nach Monat & KW mit inkrementellem Delta-Cache.
*   **Session Reuse:** 🔑 Nutzt automatisch eine bestehende Login-Session.
*   **Menu Badges:** 🏷️ Zeigt Menü-Codes (M1, M2+) direkt im Header.
*   **Menü-Flagging:** 🔔 Ausverkaufte Menüs beobachten und bei Verfügbarkeit benachrichtigt werden.
*   **Version-Menü:** 📦 Versionsliste mit Installer-Links, Dev-Mode Toggle und Downgrade-Support.
*   **Cache leeren:** 🗑️ Lokalen Cache mit einem Klick bereinigen (im Version-Menü).
*   **Favicon:** 🍽️ Eigenes Icon für die Lesezeichenleiste.
*   **Changelog:** Übersicht über neue Funktionen direkt im Installer.

## 📦 Installation

1.  Öffne die Datei `dist/install.html` in deinem Browser.
2.  Ziehe den blauen Button **"Kantine Wrapper"** in deine Lesezeichen-Leiste.
3.  Fertig!

## 🍽️ Nutzung

1.  Navigiere zu [https://web.bessa.app/knapp-kantine](https://web.bessa.app/knapp-kantine).
2.  Klicke auf das **"Kantine Wrapper"** Lesezeichen.
3.  Die Seite wird neu geladen und zeigt das erweiterte Menü. (Bei vorhandenem Login entfällt die Anmeldung).

## 🛠️ Entwicklung

### Voraussetzungen
*   Node.js (für Build- und Test-Scripts)
*   Python 3 (für Build-Tests)
*   Bash (für `build-bookmarklet.sh`)

### Projektstruktur

#### Quelldateien
| Datei | Beschreibung |
|-------|-------------|
| `kantine.js` | Haupt-Quellcode des Bookmarklets (UI, API-Logik, Rendering). |
| `style.css` | Komplettes Design (CSS mit Light/Dark Mode). |
| `favicon.svg` | Favicon für die Installer-Seite (Dreieck + Gabel & Messer). |
| `mock-data.js` | Mock-Fetch-Interceptor mit realistischen Dummy-Menüdaten für Standalone-Tests. |
| `build-bookmarklet.sh` | Build-Skript – erzeugt alle `dist/`-Artefakte und führt alle Tests aus. |
| `release.sh` | Release-Skript – Commit, Tag, Push zu allen Remotes. |
| `version.txt` | Aktuelle Versionsnummer (SemVer). |
| `changelog.md` | Änderungshistorie aller Versionen. |
| `REQUIREMENTS.md` | System Requirements Specification (SRS). |

#### Tests
| Datei | Beschreibung |
|-------|-------------|
| `test_logic.js` | Logik-Unit-Tests (statische Analyse, Syntax-Check, Sandbox-Ausführung). |
| `tests/test_dom.js` | DOM-Interaktionstests via JSDOM (prüft Event-Listener-Bindung aller UI-Komponenten). |
| `test_build.py` | Build-Artefakt-Validierung (Existenz, Inhalt). |

#### `dist/` – Build-Artefakte
| Datei | Beschreibung |
|-------|-------------|
| `bookmarklet.txt` | Die rohe Bookmarklet-URL (`javascript:...`). Enthält CSS + JS als selbstextrahierendes IIFE. Kann direkt als Lesezeichen-URL eingefügt werden. |
| `bookmarklet-payload.js` | Der entpackte Bookmarklet-Payload (JS). Erstellt `<style>` + `<script>` Elemente und injiziert sie in die Seite. Nützlich zum Debuggen. |
| `install.html` | Installer-Seite mit Drag & Drop Button, Favicon, Anleitung, Feature-Liste und Changelog. Kann lokal oder gehostet geöffnet werden. |
| `kantine-standalone.html` | Eigenständige HTML-Datei mit eingebettetem CSS + JS + **Mock-Daten**. Lädt automatisch Dummy-Menüs für UI-Tests ohne API-Zugriff. |

### Build
Um Änderungen an `kantine.js` oder `style.css` wirksam zu machen, führe den Build aus:

```bash
./build-bookmarklet.sh
```

### Release
Erstellt einen Git-Tag, committet Build-Artefakte und pusht zu allen Remotes:

```bash
./release.sh
```

## ⚠️ Hinweis
Dieses Projekt enthält zum überwiegenden Teil **KI-generierten Code**. Der Code wurde mithilfe von KI-Assistenten erstellt, überprüft und iterativ verfeinert.

## 📝 Lizenz
Internes Tool.
