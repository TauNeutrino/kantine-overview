# Bessa Knapp-Kantine Menu Scraper

Automatischer Menü-Scraper für die Knapp-Kantine basierend auf https://web.bessa.app/knapp-kantine.

## Setup

1. **Dependencies installieren**:
   ```bash
   npm install
   ```

2. **Credentials konfigurieren**:
   ```bash
   cp .env.example .env
   # Dann .env bearbeiten und echte Zugangsdaten eintragen
   ```

3. **TypeScript kompilieren**:
   ```bash
   npm run build
   ```

## Usage

### Menüs scrapen

```bash
# Development mode (mit TypeScript direkt)
npm run dev

# Production mode (kompiliertes JavaScript)
npm run build
npm run scrape
```

### Scraper-Ablauf

1. Öffnet Browser (Puppeteer)
2. Akzeptiert Cookies
3. Klickt "Pre-order menu"  
4. Loggt sich ein (mit Credentials aus `.env`)
5. Navigiert durch Kalenderwochenansicht
6. Extrahiert Menüdaten für jeden Tag
7. Speichert alles in `data/menus.json`

## Output

Die gescrapten Daten werden in `data/menus.json` gespeichert:

```json
{
  "lastUpdated": "2026-02-02T10:00:00.000Z",
  "weeks": [
    {
      "year": 2026,
      "weekNumber": 6,
      "days": [
        {
          "date": "2026-02-03",
          "weekday": "Monday",
          "items": [
            {
              "id": "2026-02-03_M1_Herzhaftes",
              "name": "M1 Herzhaftes",
              "description": "Rindsuppe mit Backerbsen / Puten Tikka Masala...",
              "price": 5.5,
              "available": true
            }
          ]
        }
      ]
    }
  ]
}
```

## Development

- `npm run dev` - Run scraper in development mode with tsx
- `npm run build` - Compile TypeScript to JavaScript
- `npm run type-check` - Check TypeScript types without building

## Debugging

Setze `PUPPETEER_HEADLESS=false` in `.env` um den Browser sichtbar zu machen.

## Sicherheit

⚠️ **WICHTIG**: Die `.env`-Datei enthält Zugangsdaten und darf niemals ins Git committed werden!
