# 🍽️ Kantine Wrapper Bookmarklet

Ein hochmoderner Wrapper für die [Bessa Knapp-Kantine](https://web.bessa.app/knapp-kantine). Dieses Projekt transformiert Standard-API-Daten in eine effiziente Wochenansicht mit Fokus auf Usability und Performance.

---

## 🏗️ System-Architektur

Das Projekt nutzt eine modulare **ES6-Architektur**, die per Webpack gebündelt und als Bookmarklet injiziert wird.

### 🧩 Modul-Verantwortlichkeiten
- **[index.js](file:///config/kantine-wrapper/src/index.js)**: Entry Point. Steuert die Initialisierung und das Polling.
- **[state.js](file:///config/kantine-wrapper/src/state.js)**: Zentrales State-Management (Singleton).
- **[actions.js](file:///config/kantine-wrapper/src/actions.js)**: Business Logic (API-Calls, Cache-Management, Flagging-Logik).
- **[ui.js](file:///config/kantine-wrapper/src/ui.js)** & **[ui_helpers.js](file:///config/kantine-wrapper/src/ui_helpers.js)**: Rendering-Logik und dynamische Komponenten (Tageskarten, Toasts).
- **[events.js](file:///config/kantine-wrapper/src/events.js)**: Zentrales Event-Handling für alle Interaktionen.
- **[i18n.js](file:///config/kantine-wrapper/src/i18n.js)**: Lokalisierung (DE/EN).
- **[api.js](file:///config/kantine-wrapper/src/api.js)**, **[constants.js](file:///config/kantine-wrapper/src/constants.js)** & **[utils.js](file:///config/kantine-wrapper/src/utils.js)**: Infrastruktur, Konstanten und Hilfsfunktionen.

### 🔄 Datenfluss & Cache
```mermaid
graph TD
    A[Bessa API] -->|Fetch| B[actions.js]
    B -->|Update| C[state.js]
    C -->|Trigger| D[ui_helpers.js]
    D -->|Render| E[Browser DOM]
    B -->|Persist| F[LocalStorage]
    F -->|Rehydrate| C
```
**Instant UI Strategy**: Daten werden beim Start sofort aus dem `localStorage` gerendert, während im Hintergrund ein Silent-Refresh die Aktualität sicherstellt.

---

## ⚙️ Build & Distribution Pipeline

1.  **Bundling**: Webpack fasst alle Module in `kantine.bundle.js` zusammen.
2.  **Veredelung**: `build-bookmarklet.sh` injiziert Versionen/Favicons und minimiert den Code via **Terser**.
3.  **Deployment**: Erzeugung der `javascript:` Bookmarklet-URL und der `install.html`.

---

## 🧠 Kern-Features & Entscheidungen

- **Warum ein Bookmarklet?** Keine Installation erforderlich; nutzt die bestehende Browser-Session des Nutzers.
- **Smart Highlights**: Substring-Matching markiert Favoriten (z.B. "Schnitzel") automatisch.
- **Order History**: Nutzt **Delta-Caching**, um nur neue Bestellungen nachzuladen und die API-Last zu minimieren.
- **Flagging System**: Erlaubt die Überwachung ausverkaufter Menüs mit automatischer In-App Benachrichtigung bei Verfügbarkeit.

---

## 🛡️ Sicherheit & Datenschutz

- **Authentifizierung**: Der Wrapper versucht primär, bestehende Sitzungen („Session Harvesting“) der Bessa-Seite (`AkitaStores`) zu erkennen.
- **Login-Fallback**: Falls keine aktive Sitzung gefunden wird, bietet der Wrapper einen Login-Dialog ([FR-001](file:///config/kantine-wrapper/REQUIREMENTS.md#FR-001)).
- **Passwort-Handling**: **Passwörter werden niemals gespeichert.** Sie werden verschlüsselt an die offizielle Bessa-API übertragen. Nur der resultierende `authToken` wird für die Dauer der Sitzung im `localStorage` persistiert.
- **Transparenz**: Alle Aktionen, die Kosten verursachen (Bestellungen), erfordern eine bewusste Nutzerinteraktion.

---

## 🧪 Entwicklung & Verifizierung

- **Standalone Mode**: `dist/kantine-standalone.html` nutzt `mock-data.js` für UI-Tests ohne API.
- **Automatisierte Tests**: 
  - `node test_logic.js` (Logik)
  - `node tests/test_dom.js` (UI-Interaktionen via JSDOM)
  - `pytest` (Build-Integrität)

---

*Powered by Kaufis-Kitchen & AI Support.*
