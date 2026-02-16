# Kantine Wrapper Bookmarklet (v1.2.0)

Ein intelligentes Bookmarklet für die Mitarbeiter-Kantine der Bessa App. Dieses Skript erweitert die Standardansicht um eine **Wochenübersicht**, Kostenkontrolle und verbesserte Usability.

## 🚀 Features

*   **Wochenübersicht:** Zeigt alle Tage der aktuellen Woche auf einen Blick.
*   **Bestell-Countdown:** ⏳ Roter Alarm 1h vor Bestellschluss.
*   **Smart Highlights:** 🌟 Markiere deine Favoriten (z.B. "Schnitzel", "Vegetarisch").
*   **Bestellstatus:** Farbige Indikatoren für bestellte Menüs.
*   **Kostenkontrolle:** Summiert automatisch den Gesamtpreis der Woche.
*   **Session Reuse:** Nutzt automatisch eine bestehende Login-Session (Loggt dich automatisch ein).
*   **Menu Badges:** Zeigt Menü-Codes (M1, M2+) direkt im Header.
*   **Changelog:** Übersicht über neue Funktionen direkt im Installer.

## 📦 Installation

1.  Öffne die Datei `dist/install.html` in deinem Browser.
2.  Ziehe den blauen Button **"Kantine Wrapper"** in deine Lesezeichen-Leiste.
3.  Fertig!

##  usage

1.  Navigiere zu [https://web.bessa.app/knapp-kantine](https://web.bessa.app/knapp-kantine).
2.  Klicke auf das **"Kantine Wrapper"** Lesezeichen.
3.  Die Seite wird neu geladen und zeigt das erweiterte Menü. (Bei vorhandenem Login entfällt die Anmeldung).

## 🛠️ Entwicklung

### Voraussetzungen
*   Node.js (optional, nur für Build-Scripts)
*   Bash (für `build-bookmarklet.sh`)

### Projektstruktur
*   `kantine.js`: Der Haupt-Quellcode des Bookmarklets.
*   `public/style.css`: Das Design (CSS).
*   `build-bookmarklet.sh`: Skript zum Erstellen der `dist/` Dateien.
*   `dist/`: Enthält die kompilierten Dateien (`bookmarklet.txt`, `install.html`).

### Build
Um Änderungen an `kantine.js` oder `style.css` wirksam zu machen, führe den Build aus:

```bash
./build-bookmarklet.sh
```

## 📝 Lizenz
Internes Tool.
