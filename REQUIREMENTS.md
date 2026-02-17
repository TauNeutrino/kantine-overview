# System Requirements Specification (SRS)

## 1. Einleitung
### 1.1 Zweck des Systems
Das System dient als Erweiterung für das Bessa Web-Shop-Portal der Knapp-Kantine (https://web.bessa.app/knapp-kantine). Es verbessert die Benutzererfahrung durch eine übersichtliche Wochenansicht, vereinfachte Bestellvorgänge, Kostentransparenz und proaktive Benachrichtigungen.

### 1.2 High-Level-Scope
Das System umfasst die Darstellung von Menüplänen in einer Wochenübersicht, die Verwaltung von Bestellungen und Stornierungen, ein Benachrichtigungssystem für Verfügbarkeitsänderungen, personalisierte Menü-Highlights sowie ein automatisches Update-Management.

## 2. Funktionale Anforderungen

| ID | Anforderung (Satzschablone nach Chris Rupp) | Priorität | Status |
|:---|:---|:---|:---|
| **Authentifizierung** | | | |
| FR-001 | Das System muss dem Benutzer die Möglichkeit bieten, sich mit Mitarbeiternummer und Passwort anzumelden. | Hoch | ✅ |
| FR-002 | Das System muss eine bestehende Bessa-Session erkennen und automatisch wiederverwenden, um eine erneute Anmeldung zu vermeiden. | Hoch | ✅ |
| FR-003 | Das System darf keine Zugangsdaten dauerhaft speichern. Die Authentifizierung muss sitzungsbasiert sein. | Hoch | ✅ |
| FR-004 | Dem Benutzer muss angezeigt werden, ob und als wer er angemeldet ist (Name oder ID). | Mittel | ✅ |
| **Menüanzeige** | | | |
| FR-010 | Das System muss dem Benutzer alle verfügbaren Tagesmenüs einer Woche gleichzeitig in einer Übersicht darstellen. | Hoch | ✅ |
| FR-011 | Das System muss dem Benutzer die Navigation zwischen der aktuellen und der kommenden Woche ermöglichen. | Mittel | ✅ |
| FR-012 | Für jedes Gericht müssen Name, Beschreibung, Preis und Verfügbarkeitsstatus angezeigt werden. | Hoch | ✅ |
| FR-013 | Bereits bestellte Menüs müssen visuell von nicht bestellten unterscheidbar sein (farbliche Markierung, Badge). | Mittel | ✅ |
| FR-014 | Die Tageskarten-Header müssen den Bestellstatus des Tages farblich signalisieren (bestellt / bestellbar / nicht bestellbar). | Niedrig | ✅ |
| FR-015 | Wenn neue Menüdaten geladen werden, muss der Fortschritt dem Benutzer in Echtzeit angezeigt werden. | Niedrig | ✅ |
| FR-016 | Das System muss bereits geladene Menüdaten zwischenspeichern (Caching), um bei erneutem Aufruf sofort eine Übersicht anzeigen zu können. | Mittel | ✅ |
| **Bestellfunktion** | | | |
| FR-020 | Authentifizierte Benutzer müssen ein verfügbares Menü direkt aus der Übersicht bestellen können. | Hoch | ✅ |
| FR-021 | Authentifizierte Benutzer müssen eine bestehende Bestellung direkt aus der Übersicht stornieren können. | Hoch | ✅ |
| FR-022 | Nach Bestellschluss (Cutoff-Zeit) dürfen keine neuen Bestellungen oder Stornierungen für diesen Tag möglich sein. | Hoch | ✅ |
| FR-023 | Es muss möglich sein, dasselbe Menü mehrfach zu bestellen. | Niedrig | ✅ |
| **Kostentransparenz** | | | |
| FR-030 | Das System muss die Gesamtkosten aller Bestellungen einer Woche automatisch berechnen und anzeigen. | Mittel | ✅ |
| **Bestell-Countdown** | | | |
| FR-040 | Das System muss eine Stunde vor Bestellschluss einen visuellen Countdown anzeigen. | Mittel | ✅ |
| **Menü-Flagging & Benachrichtigungen** | | | |
| FR-050 | Authentifizierte Benutzer müssen ausverkaufte Menüs zur Beobachtung markieren können ("flaggen"). | Mittel | ✅ |
| FR-051 | Das System muss geflaggte Menüs periodisch auf Verfügbarkeitsänderungen prüfen. | Mittel | ✅ |
| FR-052 | Bei Statusänderung eines geflaggten Menüs auf „verfügbar" muss der Benutzer benachrichtigt werden (In-App Toast + Systembenachrichtigung). | Mittel | ✅ |
| FR-053 | Geflaggte Menüs müssen im UI visuell hervorgehoben werden (gelber Glow bei ausverkauft, grüner Glow bei verfügbar). | Mittel | ✅ |
| FR-054 | Wenn die Bestell-Cutoff-Zeit erreicht ist, muss das System ein Flag automatisch entfernen. | Mittel | ✅ |
| **Personalisierung: Smart Highlights** | | | |
| FR-060 | Benutzer müssen Schlagwörter (Tags) definieren können, nach denen Menüs automatisch visuell hervorgehoben werden. | Mittel | ✅ |
| FR-061 | Die Hervorhebung muss anhand von Menüname und Beschreibung erfolgen (Substring-Matching, case-insensitive). | Niedrig | ✅ |
| FR-062 | Hervorgehobene Menüs müssen ein Tag-Badge mit dem matchenden Schlagwort anzeigen. | Niedrig | ✅ |
| FR-063 | Die nächste-Woche-Navigation muss die Anzahl der dort gefundenen Highlights als Badge anzeigen. | Niedrig | ✅ |
| **Darstellung & Theming** | | | |
| FR-070 | Das System muss einen hellen und einen dunklen Darstellungsmodus (Light/Dark Theme) unterstützen. | Niedrig | ✅ |
| FR-071 | Die Theme-Präferenz des Benutzers muss persistent gespeichert werden. | Niedrig | ✅ |
| FR-072 | Das System muss beim erstmaligen Laden die System-Präferenz (`prefers-color-scheme`) berücksichtigen. | Niedrig | ✅ |
| **Update-Management** | | | |
| FR-080 | Das System muss periodisch prüfen, ob eine neuere Version verfügbar ist. | Niedrig | ✅ |
| FR-081 | Bei Verfügbarkeit einer neueren Version muss ein diskreter Indikator im Header angezeigt werden. | Niedrig | ✅ |
| FR-082 | Benutzer müssen eine Versionsliste mit Installationslinks einsehen können (Versionsmenü). | Niedrig | ✅ |
| FR-083 | Es muss möglich sein, zu einer älteren Version zurückzukehren (Downgrade). | Niedrig | ✅ |
| FR-084 | Ein Dev-Mode muss es ermöglichen, zwischen stabilen Releases und Entwicklungs-Tags umzuschalten. | Niedrig | ✅ |

## 3. Nicht-funktionale Anforderungen

| Kategorie (ISO 25010) | ID | Anforderung | Zielwert/Metrik |
|:---|:---|:---|:---|
| **Performance** | NFR-001 | Die Darstellung bereits gecachter Daten muss ohne spürbare Verzögerung erfolgen. | < 200 ms (UI-Rendering) |
| **Performance** | NFR-002 | Das Polling für geflaggte Menüs darf die reguläre Nutzung nicht beeinträchtigen. | Intervall ≥ 5 Minuten |
| **Sicherheit** | NFR-003 | Es dürfen keine Zugangsdaten dauerhaft gespeichert werden. | 0 (keine persistente Speicherung von Passwörtern) |
| **Sicherheit** | NFR-004 | Auth-Tokens müssen sitzungsbasiert gespeichert werden und bei Schließen des Browsers verfallen. | sessionStorage |
| **Benutzbarkeit** | NFR-005 | Die Oberfläche muss auf mobilen Geräten fehlerfrei nutzbar sein. | Viewports ab 320px Breite |
| **Benutzbarkeit** | NFR-006 | Alle interaktiven Elemente müssen Tooltips oder Hilfetexte bieten. | 100% Coverage |
| **Benutzbarkeit** | NFR-007 | Die Benutzeroberfläche muss vollständig in deutscher Sprache sein. | Vollständige Lokalisierung |
| **Wartbarkeit** | NFR-008 | Die Build-Artefakte müssen durch automatisierte Tests validiert werden. | Build-Tests vorhanden |

## 4. Technische Randbedingungen
*   **Deployment**: Das System wird als Bookmarklet ausgeliefert, das auf der Bessa-Webseite ausgeführt wird.
*   **Datenquelle**: Direkte Integration mit der Bessa REST-API (`api.bessa.app/v1`).
*   **Datenhaltung**: Clientseitig via `localStorage` (Menü-Cache, Flags, Highlights, Theme) und `sessionStorage` (Auth-Token).
*   **Build**: Bash-basiertes Build-Script, das Bookmarklet-URL, Standalone-HTML und Installer-Seite generiert.
*   **Versionierung**: SemVer, verwaltet über GitHub Releases/Tags.
*   **Tests**: Python-basierte Build-Tests + Node.js-basierte Logik-Tests.
