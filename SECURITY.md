# Sicherheitsrichtlinie

Diese Richtlinie gilt für das Kantine-Projekt (`at.kaufi.kantine`).

## Unterstützte Versionen

Die folgenden Versionen erhalten aktuell Sicherheitsupdates:

| Version | Unterstützt |
|---|---|
| 1.x (Web) | ✅ |
| < 1.0 | ❌ |

## Sicherheitslücken melden

Bitte melde Sicherheitslücken vertraulich an:

**E-Mail:** [security@kantine-project.example.com](mailto:security@kantine-project.example.com)

### Was wir erwarten

- Eine klare Beschreibung des Problems
- Schritte zur Reproduktion
- Mögliche Auswirkungen
- Vorschläge zur Behebung (optional)

### Reaktionszeiten

- Bestätigung innerhalb von 5 Werktagen
- Erste Einschätzung innerhalb von 10 Werktagen
- Regelmäßige Updates bis zur Behebung

### Offenlegungspolitik

Wir folgen einer koordinierten Offenlegung. Sicherheitslücken werden öffentlich gemacht, nachdem ein Fix verfügbar ist. Die Zeit zwischen Meldung und Offenlegung beträgt in der Regel 90 Tage.

## Sicherheitspraktiken

- Alle API-Kommunikationen laufen über HTTPS mit TLS 1.3
- Authentifizierungstoken werden verschlüsselt gespeichert
- Kein Tracking oder Analytics
- Keine personenbezogenen Daten werden über das Authentifizierungstoken hinaus gespeichert
## Hinweis

Es wurde bisher kein formales Sicherheitsaudit durchgeführt.
