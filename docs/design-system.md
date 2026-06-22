# Kantine Design System

Dieses Dokument fasst die UI- und UX-Richtlinien des Kantinen-Wrappers zusammen. Das Design System wurde aus der bestehenden Codebase extrahiert und definiert die visuellen Standards für künftige Anpassungen.

Ein interaktives, ausführliches UI Kit (inkl. interaktiven Komponenten und Dark Mode Toggle) befindet sich in der Datei [kantine-ui-kit.html](kantine-ui-kit.html) im selben Ordner.

## 1. Design-Philosophie & Ästhetik
- **Slate/Gray-Blue:** Eine moderne, kühle, aber zugängliche Farbpalette, die den professionellen Wrapper-Charakter unterstreicht.
- **Glassmorphism:** Leichte Transparenzen gepaart mit Weichzeichnern (`backdrop-filter: blur`) bei fixierten Elementen wie Headern, Modals und Navigationsleisten.
- **Klare Zustandssignale:** Eindeutige semantische Farben für Erfolg (Grün), Fehler/Dringend (Rot) und hervorgehobene Aktionen (Violett/Blau).

## 2. Design Tokens (Farben)

Die Anwendung verfügt über einen vollständigen Light- und Dark-Mode. Die Farben werden über CSS Custom Properties (Variables) gesteuert.

### Light Mode (Default)
- **Background Body:** `#f1f5f9` (Hellgrau)
- **Background Card:** `#ffffff` (Weiß)
- **Text Primary:** `#334155` (Slate dunkel)
- **Text Secondary:** `#64748b` (Slate hell)
- **Accent Color:** `#2563eb` (Blau, primäre Aktionen)
- **Border:** `#cbd5e1`
- **Success:** `#059669` (Grün)
- **Error:** `#dc2626` (Rot)

### Dark Mode (Über `[data-theme="dark"]`)
- **Background Body:** `#1e293b`
- **Background Card:** `#283548`
- **Text Primary:** `#f8fafc`
- **Text Secondary:** `#cbd5e1`
- **Accent Color:** `#60a5fa`
- **Border:** `#526377`

## 3. Typografie
- **Schriftfamilie:** `Inter`, mit Fallback auf `system-ui, -apple-system, sans-serif`.
- **Hierarchie:**
  - **H1 (Titles):** `font-weight: 700`, `letter-spacing: -0.025em`
  - **H2 & H3:** `font-weight: 700 / 600`
  - **Body Text:** `16px (1rem)` bei `line-height: 1.5`
  - **Metadaten (Small):** `14px (0.875rem)`

## 4. Logo & Iconografie
- **Logo:** Verwendet wird das originale `favicon_base.png`. Es enthält vier Kernelemente:
  - **Teller:** Die drapierte Basis (Bereitschaft)
  - **Gabel:** Das Symbol für Essen
  - **Pfeil:** Schnelligkeit und Effizienz
  - **Dreieck:** Das Firmenlogo als Absender
- **Icons:** Es werden die **Material Icons Round** verwendet. 
- **Icon-Buttons:** Spezifische Klassen (`.icon-btn` und `.update-icon`) sorgen für saubere Hover-Status und performante GSAP/CSS-Rotationen beim Aktualisieren.

## 5. Kernkomponenten
- **Buttons:** Leicht abgerundet (`border-radius: 8px/6px`), mit deutlichem Hover-Zustand (Brightness-Filter und leichtes Heben `translateY(-1px)`). Wichtige Buttons wie `.btn-order` und `.btn-cancel` verwenden semantische Farben.
- **Badges:** Kleine Status-Labels mit `font-weight: 600`, `text-transform: uppercase` und `letter-spacing: 0.06em`. Status: `Verfügbar` (Grün), `Ausverkauft` (Rot), `Bestellt` (Violett).
- **Menükarten (Cards):** Jede Tageskarte hat einen Header und Listen-Einträge. 
  - **Status-Header:** Der Header ändert Farbe und Bottom-Border je nach Tagesstatus (`.header-violet` für Bestellt, `.header-green` für Offen, `.header-red` für Fehler/Dringend).
  - **Bestelltes Item:** Erhält die Klasse `.today-ordered` mit violettem Border und Glow (`box-shadow`), um sofort aufzufallen.

## 6. Layout & Zustände (States)
- **Skeleton Loading:** Ein performance-optimierter (GPU) Shimmer-Effekt für das Laden von Menüs, der `transform` anstelle von Hintergrundpositionen animiert.
- **Empty State:** Klar strukturierte "Keine Bestellungen"-Ansicht mit Icon, Titel und Beschreibungstext.
- **Modals:** Zentrierte Dialoge (`role="dialog"`) mit abgedunkeltem Blur-Hintergrund, klarem Titel und eindeutigen Call-to-Action-Buttons unten rechts.

## 7. Performance & Barrierefreiheit (A11y)
- **Animationen:** Verwendung von `cubic-bezier(0.2, 0, 0, 1)` Easing. Niemals `transition: all` verwenden, um Layout-Thrashing zu vermeiden.
- **Reduced Motion:** Vollständige Unterstützung von `@media (prefers-reduced-motion: reduce)`, um Animationen auf fast 0ms zu reduzieren.
- **Fokus:** Alle interaktiven Elemente besitzen klare Outline-Fokus-Zustände (`*:focus-visible`) mit der Akzentfarbe.
- **Formulare:** Labels sind explizit mit Input-Feldern (`id` / `for`) verknüpft, Hilfetexte über `aria-describedby`.

---
*Für Code-Beispiele, interaktive Demos und Farbskalen, öffne bitte die Datei `kantine-ui-kit.html` in deinem Browser.*