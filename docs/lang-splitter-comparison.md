# Splitter Vergleich: Alte vs Neue Logik

Verglichen auf `tests/test_kantine_menuCache.json` (aktualisiert vom Benutzer, 627 Einträge).

## Ergebnisse

- **Gesamt Einträge:** 627
- **Alt (v2.0.3 Basis, ohne Verbesserungen):** 34 Fallback-Fälle (label=fallback, confidence=0.00)
- **Neu (mit Loanword-Erweiterungen, 2500 Trigrammen, Rebalance, Loanword-aware Score):** 34 Fallback-Fälle — identisch, keine Regression
- **Regressiert (alt ok, neu fallback):** 0
- **Verbessert (alt fallback, neu ok):** 0 (die 34 Fallbacks sind von neuen Daten-Einträgen April–Juli 2026, nicht vom alten Datenbestand)

## Schema abgeleitet aus `tests/test_kantine_menuCache.json` (Freitage)

- Freitag-Menüs sind fast ausschließlich **Single-Course** (`items` = 1, Preis = 4 oder 5.5 bei Pizza-Varianten).
- Beispiele: `Bowl mit Djuvecreis`, `Falafel Bowl`, `Kürbislasagne`, `Marokkanische Kichererbsen Bowl`, `Mini- Strudel-Variation`, `Gebratene Hühnerkeule`.
- Der einzige Multi-Course-Fall auf Freitag ist die Pizza mit `items=2` (normale + veggie Pizza).
- **Zutaten-/Fleisch-Anmerkungen** (z. B. `(ACGLMF)(Beef, Pork)`) treten als nicht-allergen-basierte Parenthesen NACH dem Allergen auf — das war der Fehler, der mit `mergeTrailingAnnotations()` behoben wurde.
- **Italian Loanwords** (`Lasagne`, `Bolognese`, `Spätzle`, `Strudel`, `Pizza`, `Zucchini`, `Minestrone`, `Backerbsen`) treten in beiden Sprachen (DE/EN) gleich häufig auf und müssen als neutrale Loanwords behandelt werden, damit `findDishBoundary()` die richtige Split-Grenze findet.

## Verbesserungen in `src/lang/`

1. **Loanword-Erweiterung** (`loanwords.js`): `schnitzel`, `schöberl`, `pizza`, `backerbsen`, `zucchini`, `minestrone`, `strudel`, `spätzle`/`spaetzle`, `cheddar`, `tofu`, `croutons`, `quinoa`, `harissa`, `prosciutto`, `steak`, `burger`, `bolognese`
2. **Algorithmus-Fix** (`splitter.js`): `mergeTrailingAnnotations()` — fasst nicht-allergen-basierte Parenthesen (z. B. `(Beef, Pork)`) mit dem vorherigen Gang zusammen, vermeidet falsche 3-Kurs-Splits bei Freitagsmenüs.
3. **Modell-Verbesserung** (`langModel.js`): `scorePhrase()` behandelt Loanword-Token als neutral (filtert sie aus Trigram-, Funktionswort-, Suffix- und Digraph-Bewertung), verhindert falsche DE-Bias durch `sch`+`tz` bei `schnitzel`.
4. **Training-Anpassung** (`train-langmodel.js`): 500 → 2500 Trigramme pro Sprache; Rebalancing (`totalDe == totalEn`) beseitigt die strukturelle EN-Bias bei unbekannten Trigrammen; `funcEn` ohne `an` (Kollision mit deutscher Präposition `an`).
