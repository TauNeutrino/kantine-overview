# System Requirements Specification (SRS)

## 1. Einleitung
### 1.1 Zweck des Systems
Das System dient als Erweiterung für das Bessa Web-Shop-Portal der Knapp-Kantine (https://web.bessa.app/knapp-kantine). Es verbessert die Benutzererfahrung durch eine übersichtliche Wochenansicht, vereinfachte Bestellvorgänge, Kostentransparenz und proaktive Benachrichtigungen.

### 1.2 High-Level-Scope
Das System umfasst die Darstellung von Menüplänen in einer Wochenübersicht, die Verwaltung von Bestellungen und Stornierungen, ein Benachrichtigungssystem für Verfügbarkeitsänderungen, personalisierte Menü-Highlights sowie ein automatisches Update-Management.

## 2. Funktionale Anforderungen

| ID | Anforderung (Satzschablone nach Chris Rupp) | Priorität | Seit |
|:---|:---|:---|:---|
| **Authentifizierung & Zugang** | | | |
| FR-001 | Das System muss dem Benutzer die Möglichkeit bieten, sich mit Mitarbeiternummer und Passwort anzumelden. | Hoch | v1.0.1 |
| FR-002 | Das System muss eine bestehende Bessa-Session erkennen und automatisch wiederverwenden, um eine erneute Anmeldung zu vermeiden. | Hoch | v1.0.1 |
| FR-003 | Das System darf keine Zugangsdaten dauerhaft speichern. Die Authentifizierung muss sitzungsbasiert sein. | Hoch | v1.0.1 |
| FR-004 | Dem Benutzer muss angezeigt werden, ob und als wer er angemeldet ist (Vorname, Name oder ID). | Mittel | v1.0.1 |
| FR-005 | Nicht authentifizierte Benutzer müssen die Menüdaten einsehen können (eingeschränkter Lesezugriff). | Mittel | v1.0.1 |
| FR-006 | Das System muss eine explizite Logout-Funktion bereitstellen, die alle sitzungsbezogenen Daten entfernt. | Mittel | v1.0.1 |
| **Menüanzeige** | | | |
| FR-010 | Das System muss dem Benutzer alle verfügbaren Tagesmenüs einer Woche gleichzeitig in einer Übersicht darstellen. | Hoch | v1.0.1 |
| FR-011 | Das System muss dem Benutzer die Navigation zwischen der aktuellen und der kommenden Woche ermöglichen. | Mittel | v1.0.1 |
| FR-012 | Für jedes Gericht müssen Name, Beschreibung, Preis und Verfügbarkeitsstatus angezeigt werden. | Hoch | v1.0.1 |
| FR-013 | Bereits bestellte Menüs müssen visuell von nicht bestellten unterscheidbar sein (farbliche Markierung, Badge). | Mittel | v1.0.1 |
| FR-014 | Die Tageskarten-Header müssen den Bestellstatus des Tages farblich signalisieren (bestellt / bestellbar / nicht bestellbar). | Niedrig | v1.0.1 |
| FR-015 | Bestellte Menü-Codes (z.B. M1, M2) müssen als Badges im Tageskarten-Header angezeigt werden. | Niedrig | v1.0.1 |
| FR-016 | Am heutigen Tag müssen bestellte Menüs an erster Stelle sortiert werden. | Niedrig | v1.0.1 |
| FR-017 | Wenn keine Menüdaten für eine Woche vorliegen, muss ein aussagekräftiger Leertext angezeigt werden. | Niedrig | v1.0.1 |
| **Daten-Aktualisierung** | | | |
| FR-020 | Wenn Menüdaten geladen werden, muss der Fortschritt dem Benutzer in Echtzeit angezeigt werden (Fortschrittsbalken, Statustext). | Niedrig | v1.0.1 |
| FR-021 | Das System muss bereits geladene Menüdaten zwischenspeichern, um bei erneutem Aufruf sofort eine Übersicht anzeigen zu können. | Mittel | v1.0.1 |
| FR-022 | Das System muss dem Benutzer die Möglichkeit bieten, die Menüdaten manuell neu zu laden. | Niedrig | v1.0.1 |
| FR-023 | Der Zeitpunkt der letzten Aktualisierung muss für den Benutzer sichtbar sein. | Niedrig | v1.0.1 |
| FR-024 | Das System darf beim Start keinen automatischen API-Refresh durchführen, wenn der Cache frisch (< 1 Stunde) und vollständig ist (nächste 5 Arbeitstage abgedeckt). | Mittel | v1.3.1 |
| **Bestellfunktion** | | | |
| FR-030 | Authentifizierte Benutzer müssen ein verfügbares Menü direkt aus der Übersicht bestellen können. | Hoch | v1.0.1 |
| FR-031 | Authentifizierte Benutzer müssen eine bestehende Bestellung direkt aus der Übersicht stornieren können. | Hoch | v1.0.1 |
| FR-032 | Nach Bestellschluss (Cutoff-Zeit) dürfen keine neuen Bestellungen oder Stornierungen für diesen Tag möglich sein. | Hoch | v1.0.1 |
| FR-033 | Es muss möglich sein, dasselbe Menü mehrfach zu bestellen. Bei Mehrfachbestellungen muss die Anzahl angezeigt werden. | Niedrig | v1.0.1 |
| **Kostentransparenz** | | | |
| FR-040 | Das System muss die Gesamtkosten aller Bestellungen einer Woche automatisch berechnen und anzeigen. | Mittel | v1.1.0 |
| **Bestell-Countdown** | | | |
| FR-050 | Das System muss vor Bestellschluss einen visuell hervorgehobenen Countdown anzeigen. | Mittel | v1.1.0 |
| **Menü-Flagging & Benachrichtigungen** | | | |
| FR-060 | Authentifizierte Benutzer müssen ausverkaufte Menüs zur Beobachtung markieren können ("flaggen"). | Mittel | v1.0.1 |
| FR-061 | Das System muss geflaggte Menüs periodisch auf Verfügbarkeitsänderungen prüfen. | Mittel | v1.0.1 |
| FR-062 | Bei Statusänderung eines geflaggten Menüs auf „verfügbar" muss der Benutzer benachrichtigt werden (In-App + Systembenachrichtigung). | Mittel | v1.0.1 |
| FR-063 | Geflaggte Menüs müssen im UI visuell hervorgehoben werden (gelber Glow bei ausverkauft, grüner Glow bei verfügbar). | Mittel | v1.0.1 |
| FR-064 | Wenn die Bestell-Cutoff-Zeit erreicht ist, muss das System ein Flag automatisch entfernen. | Mittel | v1.0.1 |
| **Personalisierung: Smart Highlights** | | | |
| FR-070 | Benutzer müssen Schlagwörter (Tags) definieren können, nach denen Menüs automatisch visuell hervorgehoben werden. | Mittel | v1.1.0 |
| FR-071 | Die Hervorhebung muss anhand von Menüname und Beschreibung erfolgen (Substring-Matching, case-insensitive). | Niedrig | v1.1.0 |
| FR-072 | Hervorgehobene Menüs müssen ein Tag-Badge mit dem matchenden Schlagwort anzeigen. | Niedrig | v1.2.4 |
| FR-073 | Die Nächste-Woche-Navigation muss die Anzahl der dort gefundenen Highlights als Badge anzeigen. | Niedrig | v1.2.5 |
| **Darstellung & Theming** | | | |
| FR-080 | Das System muss einen hellen und einen dunklen Darstellungsmodus (Light/Dark Theme) unterstützen. | Niedrig | v1.0.1 |
| FR-081 | Die Theme-Präferenz des Benutzers muss persistent gespeichert werden. | Niedrig | v1.0.1 |
| FR-082 | Das System muss beim erstmaligen Laden die Betriebssystem-Präferenz für das Farbschema berücksichtigen. | Niedrig | v1.0.1 |
| **Benutzer-Feedback** | | | |
| FR-090 | Alle benutzerrelevanten Aktionen (Bestellung, Stornierung, Fehler) müssen durch nicht-blockierende Benachrichtigungen (Toasts) bestätigt werden. | Mittel | v1.0.1 |
| FR-091 | Bei einem Verbindungsfehler muss ein Fehlerdialog mit Fallback-Link zur Originalseite angezeigt werden. | Mittel | v1.0.1 |
| **Nächste-Woche-Badge** | | | |
| FR-100 | Die Navigation zur nächsten Woche muss ein Badge anzeigen, das den Überblick über den Bestellstatus der kommenden Woche visualisiert (bestellt / bestellbar / gesamt). | Niedrig | v1.0.1 |
| **Update-Management** | | | |
| FR-110 | Das System muss periodisch prüfen, ob eine neuere Version verfügbar ist. | Niedrig | v1.0.3 |
| FR-111 | Bei Verfügbarkeit einer neueren Version muss ein diskreter Indikator im Header angezeigt werden. | Niedrig | v1.0.3 |
| FR-112 | Benutzer müssen eine Versionsliste mit Installationslinks einsehen können (Versionsmenü). | Niedrig | v1.3.0 |
| FR-113 | Es muss möglich sein, zu einer älteren Version zurückzukehren (Downgrade). | Niedrig | v1.3.0 |
| FR-114 | Ein Dev-Mode muss es ermöglichen, zwischen stabilen Releases und Entwicklungs-Tags umzuschalten. | Niedrig | v1.3.0 |

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
| **Wartbarkeit** | NFR-008 | Die Build-Artefakte müssen durch automatisierte Tests validiert werden. | Build-Tests + Logik-Tests |

## 4. Technische Randbedingungen
*   **Deployment**: Das System wird als Bookmarklet ausgeliefert, das auf der Bessa-Webseite ausgeführt wird.
*   **Datenquelle**: Direkte Integration mit der Bessa REST-API (`api.bessa.app/v1`).
*   **Datenhaltung**: Clientseitig via `localStorage` (Menü-Cache, Flags, Highlights, Theme) und `sessionStorage` (Auth-Token).
*   **Build**: Bash-basiertes Build-Script, das Bookmarklet-URL, Standalone-HTML und Installer-Seite generiert.
*   **Versionierung**: SemVer, verwaltet über GitHub Releases/Tags.
*   **Tests**: Python-basierte Build-Tests + Node.js-basierte Logik-Tests.
