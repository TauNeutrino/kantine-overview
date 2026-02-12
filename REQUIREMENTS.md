# System Requirements Specification (SRS)

## 1. Einleitung
### 1.1 Zweck des Systems
Das System dient als Wrapper und Erweiterung für das Bessa Web-Shop-Portal der Knapp-Kantine (https://web.bessa.app/knapp-kantine). Es ermöglicht den Benutzern, Menüpläne einzusehen, Buchungen automatisiert vorzunehmen und Menüdaten persistent für den öffentlichen Zugriff bereitzustellen, ohne dass jeder Betrachter eigene Zugangsdaten benötigt.

### 1.2 High-Level-Scope
Das System umfasst einen automatisierten Scraper, eine API zur Datenbereitstellung, einen persistenten Dateispeicher für erfasste Menüs und ein Frontend-Dashboard zur Visualisierung der Kantinen-Wochenpläne.

## 2. Funktionale Anforderungen

| ID | Anforderung (Satzschablone nach Chris Rupp) | Priorität |
|:---|:---|:---|
| **Auth & Sessions** | | |
| FR-001 | Das System muss dem Benutzer die Möglichkeit bieten, sich mit Mitarbeiternummer und Passwort am Bessa-Backend anzumelden. | Hoch |
| FR-002 | Sobald ein Benutzer erfolgreich angemeldet ist, muss das System eine Session-ID erzeugen und die resultierenden Cookies verschlüsselt für 2 Stunden vorhalten. | Hoch |
| FR-003 | Das System muss die Zugangsdaten (Mitarbeiternummer/Passwort) unmittelbar nach der Verwendung durch den Scraper verwerfen und darf diese nicht dauerhaft speichern. | Hoch |
| **Scraper & Datenextraktion** | | |
| FR-004 | Das System muss in der Lage sein, den wöchentlichen Menüplan (Montag bis Freitag) automatisiert von der Bessa-Webseite zu extrahieren. | Hoch |
| FR-005 | Wenn ein Tag bereits eine Buchung enthält, muss das System den Navigationspfad so anpassen, dass dennoch alle verfügbaren Menüoptionen (M1F, M2F, etc.) extrahiert werden können. | Mittel |
| FR-006 | Das System muss für jedes extrahierte Gericht den Namen, die Beschreibung, den Preis und den Status (verfügbar/nicht verfügbar/ bestellt) erfassen. | Hoch |
| **Datenhaltung & Zugriff** | | |
| FR-007 | Das System muss erfolgreich gescrapte Menüpläne in einer persistenten JSON-Datei (`data/menus.json`) speichern. | Hoch |
| FR-008 | Das System muss unauthentifizierten Benutzern den Zugriff auf bereits im Speicher befindliche Menüdaten ermöglichen (Public Access). | Mittel |
| FR-009 | Falls keine Daten im persistenten Speicher vorhanden sind, muss das System einen nicht authentifizierten Benutzer die Möglichkeit bieten sich anzumelden, um den Speicher zu initialisieren. | Hoch |
| **Dashboard & UI** | | |
| FR-010 | Das System muss dem Benutzer eine intuitive Wochenansicht des Menüplans im Browser darstellen. | Mittel |
| FR-011 | Wenn ein Scraper-Vorgang aktiv ist, muss das System den Status (Fortschritt, aktuelle Aktion) in Echtzeit visualisieren. | Niedrig |
| **Buchungsfunktion** | | |
| FR-012 | Wenn der Benutzer authentifiziert ist, soll das System eine Bestellung für ein  Menü ermöglichen. | Mittel |
| FR-013 | Wenn der Benutzer authentifiziert ist, soll das System ein bereits bestelltes Menü zu stornieren. | Mittel |
| **Menu Flagging & Notifications** | | |
| FR-014 | Das System muss authentifizierten Benutzern ermöglichen, nicht bestellbare Menüs (deren Cutoff noch nicht erreicht ist) zu markieren ("flaggen"). | Mittel |
| FR-015 | Das System soll die Statusprüfung für geflaggte Menüs auf verbundene Clients verteilen (Distributed Polling), um die Last zu minimieren. Der Server orchestriert, welcher Client wann welche Menüs prüft. | Mittel |
| FR-016 | Bei Statusänderung auf "verfügbar" muss das System den Benutzer benachrichtigen (Systembenachrichtigung). | Mittel |
| FR-017 | Geflaggte und ausverkaufte Menüs müssen im UI mit einem gelben Glow hervorgehoben werden. | Mittel |
| FR-018 | Geflaggte und verfügbare Menüs müssen im UI mit einem grünen Glow hervorgehoben werden. | Mittel |
| FR-019 | Wenn die Bestell-Cutoff-Zeit erreicht ist, muss das System das Flag automatisch entfernen. | Mittel |
## 3. Nicht-funktionale Anforderungen

| Kategorie (ISO 25010) | ID | Anforderung | Zielwert/Metrik |
|:---|:---|:---|:---|
| **Performance** | NFR-001 | Antwortzeit der API für gecachte Daten | < 200 ms (95. Perzentil) |
| **Performance** | NFR-007 | Polling-Effizienz & Token-Nutzung | Kein System-Token verfügbar. Polling muss über authentifizierte User-Clients erfolgen. Der Server muss die Anfragen so verteilen, dass redundante Abfragen vermieden werden. |
| **Performance** | NFR-002 | Dauer eines vollständigen Scrape-Vorgangs (exkl. Navigation) | < 30 Sekunden pro Woche |
| **Sicherheit** | NFR-003 | Speicherung von Zugangsdaten | 0 (keine dauerhafte Speicherung von Passwörtern) |
| **Sicherheit** | NFR-004 | Session-Sicherheit | HttpOnly Cookies für die Kommunikation zwischen Frontend und Backend |
| **Wartbarkeit** | NFR-005 | Testabdeckung der Scraper-Logik | Alle Kern-Selektoren müssen durch Debug-HTML-Dumps verifizierbar sein |
| **Benutzbarkeit** | NFR-006 | Mobile Responsiveness | Dashboard muss auf Viewports ab 320px Breite fehlerfrei nutzbar sein |

## 4. Technische Randbedingungen
*   **Architektur**: Node.js Backend mit Express (API + Static Serving) und Vanilla JS Frontend.
*   **Engine**: Direkte API-Integration (Reverse Engineering der Bessa API) für maximale Performance und Zuverlässigkeit.
*   **Datenspeicher**: Dateibasierter JSON-Store für persistente Daten + In-Memory Caching.
*   **Schnittstellen**: REST API (`/api/bookings`, `/api/status`, `/api/order`).
*   **Runtime**: Node.js Umgebung, Docker-ready.
