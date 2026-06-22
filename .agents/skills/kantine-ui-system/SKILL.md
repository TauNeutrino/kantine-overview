<skill>
  <name>kantine-ui-system</name>
  <description>Verwende diesen Skill IMMER, wenn du UI-Komponenten, Ansichten, Formulare oder HTML/CSS für den Kantinen-Wrapper baust, erweiterst oder anpasst. Er zwingt den Agenten, das offizielle Design System anzuwenden.</description>
</skill>

# Kantine Design System (UI-Entwickler)

Du bist als UI-Entwickler für den Kantinen-Wrapper tätig. Halte dich bei jeder UI-Anpassung STRIKT an das etablierte Design System. Erfinde keine eigenen Designs, wenn bereits etablierte Patterns existieren.

## 📚 Pflicht-Referenzen (Zuerst lesen!)
Bevor du neuen UI-Code schreibst, **MUSST** du dir folgende Dateien im Projekt ansehen:
1. `docs/design-system.md` (Die konzeptionellen Regeln und CSS-Variablen)
2. `docs/kantine-ui-kit.html` (Die interaktive Referenz aller UI-Komponenten und des Layouts)

## 🎨 Design-Regeln für Agenten

### 1. Farben & Themes (Light/Dark Mode)
- Schreibe **niemals** harte Hex-Werte (`#ffffff`) oder RGB-Werte in neue CSS-Regeln.
- Nutze **ausschließlich** die semantischen CSS-Variablen (z. B. `var(--bg-color)`, `var(--surface-color)`, `var(--text-color)`, `var(--accent-color)`).
- Das System unterstützt nativ Light- und Dark-Mode. Durch die Nutzung der Variablen stellst du sicher, dass neue UI-Elemente in beiden Themes sofort funktionieren.

### 2. Bestellstatus (Wochentage)
Tageskarten verändern sich basierend auf dem Bestellstatus. Nutze für den Header der Karten (Klasse `.day-header`) die entsprechenden Modifier-Klassen:
- `.header-violet` = "Bestellt"
- `.header-green` = "Offen"
- `.header-red` = "Dringend/Fehler"

### 3. Animationen & Performance (GSAP-Regel)
- **VERBOTEN:** Nutze **niemals** `transition: all`.
- **ERLAUBT:** Optimiere auf GPU-beschleunigte Eigenschaften (`transform`, `opacity`).
- Nutze die standardisierten Timing-Variablen: `var(--transition-smooth)` für Hover/Fokus-States und `var(--transition-bounce)` für markante Interaktionen.
- Respektiere Barrierefreiheit: Bei `prefers-reduced-motion: reduce` müssen Animationen deaktiviert oder minimiert werden.

### 4. Icons & Logo
- Die App nutzt **Material Icons Round**.
- Buttons, die primär aus einem Icon bestehen, müssen die Klasse `.icon-btn` verwenden.
- Für Update/Refresh-Aktionen nutze die Klasse `.update-icon`.
- Das offizielle Logo besteht aus den Symbolen Teller, Gabel, Pfeil und dem Firmendreieck und liegt als `favicon_base.png` vor. Integriere es über `img.logo-img`.

### 5. Barrierefreiheit (A11y)
- Jedes interaktive Element (`<button>`, `<a>`, `<input>`) MUSS per Tastatur erreichbar sein und visuell auf `*:focus-visible` (mit `outline: 2px solid var(--accent-color)`) reagieren.
- Nutze semantisches HTML (`<article>`, `<section>`, `<header>`, `<dialog>`).
- Setze dekorative Icons auf `aria-hidden="true"`.

### 6. Zustände (Empty & Loading States)
- Zeigst du Daten an, die geladen werden müssen? Nutze Skeleton-Screens (`.skeleton`-Klassenstruktur).
- Sind keine Daten vorhanden? Zeige einen aufgeräumten Empty State ("Keine Bestellungen") an, anstatt einer weißen, leeren Seite.

## 🛠 Dein Workflow bei UI-Aufgaben:
1. Analysiere das Ziel.
2. Identifiziere, welche existierenden Bausteine aus dem UI-Kit passen (Cards, Buttons, Modals, Badges).
3. Setze das HTML nach dem Baukastenprinzip zusammen.
4. Prüfe, ob du versehentlich neue Farben erfunden oder `transition: all` genutzt hast (dann korrigieren!).
5. Überprüfe die Responsivität (Bricht es bei < 768px sauber um?).