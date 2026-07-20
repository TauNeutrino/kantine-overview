# Sprach-Splitting (DE/EN)

Das Bessa-Menü liefert jeden Menüpunkt als **eine einzige Zeichenkette**, die deutsche und englische Varianten mischen kann. Beispiel:

```
Süßkartoffel- Tomatensuppe / Sweet potato- tomato soup
Indisch: Mix Sabji (Gemüse in Kokossauce) Kichererbsencurry /
Indian: Mix Sabji ( Vegetables in coconut sauce) chickpea curry
Vanillepudding / Vanilla pudding(F)
```

Ziel des Splitters ist es, diese Beschreibung in **Gänge** (Suppe, Hauptgericht, Dessert) zu zerlegen und jeden Gang in eine deutsche und eine englische Seite zu trennen. Allergenkennungen sollen erhalten bleiben.

- **Dateien:** `src/lang/*.js`
- **Einstieg:** `src/lang/splitter.js` → `splitLanguage(text)`
- **Tests:** `tests/test_splitter.js`, `tests/test_segment.js`, `tests/test_align_trailing.js`, `tests/test_boundary.js`, `tests/test_no_info_lost.js`

---

## Pipeline

```
roher Text
    │
    ▼
normalize()        ── Parkt Hinweise, repariert Allergen-/Slash-Schreibfehler
    │
    ▼
matchTemplate()    ── Schneller Pfad für Muster wie "Suppe / Soup Salat / Salad Dessert"
    │
    ▼
segment()          ── Zerlegt in gängige Blöcke, an gültigen Allergen-Klammern verankert
    │
    ▼
alignTrailingEnglish() ── Korrigiert hintereinander liegende oder eingeschobene Englisch-Blöcke
    │
    ▼
repairMergedCourses() ── Wenn ein Kurs intern noch mehrere Gänge enthält, per splitDishes aufteilen
    │
    ▼
peelGluedTailFromUnanchored() ── Englisch an den Rand eines unverankerten Kurses ablösen
    │
    ▼
peelTrailingMonoCourse() ── Letztes Wort in ein eigenes, einsprachiges Gericht abschälen
    │
    ▼
scoreSplit()       ── Konfidenz, Sub-Scores und Label berechnen
    │
    ▼
{ de, en, confidence, label }
```

---

## 1. Normalisierung (`normalize.js`)

`normalize(text)` bereinigt den Rohtext, bevor die logische Analyse beginnt.

| Funktion | Zweck |
|----------|-------|
| `isValidAllergen(content)` | Prüft, ob ein Klammern-Inhalt nur aus Großbuchstaben und Kommata besteht, z. B. `(ACGLM)` |
| `normalize()` | 1. Repariert Allergen-Interne Schrägstriche `(A/F/N)` → `(AFN)`<br>2. Repariert Slash-vor-Allergen `/ACLM)` → `(ACLM)`<br>3. Extrahiert Achtung-/Änderungs-Hinweise<br>4. Klappt Whitespace zusammen |

Wichtige Invariante: **nach der Normalisierung ist jeder Schrägstrich außerhalb von Klammern ein potenzieller Sprachtrenner.**

---

## 2. Template-Matching (`templates.js`)

Bestimmte Menüformate sind bekannt und können ohne Sprachmodell verarbeitet werden.

| Funktion | Zweck |
|----------|-------|
| `matchTemplate(text)` | Erkennt z. B. `Suppe / Soup Salat / Salad Dessert` und erzeugt direkt drei Gänge mit `label: 'template'` |

Vorteil: schnell, robust und unabhängig von Tippfehlern.

---

## 3. Segmentierung (`segment.js`)

`segment(normalizedText)` zerlegt den Text in **Kurse** entlang gültiger Allergenklammern.

| Funktion | Zweck |
|----------|-------|
| `segment()` | Läuft von links nach rechts. Sobald eine Klammer `(ACGLM)` gefunden wird, endet dort ein Kurs. Rest-Text bildet einen unverankerten Kurs. |
| `processSegment()` | Entfernt die Allergenklammer, spaltet am **ersten** Slash außerhalb von Klammern in `de` und `en`. Ohne Slash: `mono = true`. |

Gefahr: nur das **letzte** Gericht hat oft ein Allergen. Dann fängt `segment()` die ganze Zeile als einen einzigen Kurs ein und `processSegment()` teilt nur am ersten Slash. Der Rest des englischen Textes bleibt im `en`-Teil hängen → `repairMergedCourses()` bzw. `splitDishes()` muss später nacharbeiten.

---

## 4. Trailing-English-Korrektur (`alignTrailing.js`)

Oft werden die englischen Übersetzungen **erst am Ende** aufgeführt, statt als `DE / EN` pro Gericht. Diese Module gleichen sie wieder den deutschen Gängen zu.

| Funktion | Zweck |
|----------|-------|
| `repairInterleavedEnglish()` | Erkennt ein Mono-Gericht, dessen Nachfolger mit Englisch beginnt und dann wieder Deutsch enthält, z. B. `Salat / Gemüsepfanne ...` |
| `repairMonoTail()` | Format `DE1 (A) DE2 (B) EN1, EN2` – der letzte Kurs ist nur Englisch und wird auf die vorherigen deutschen Gänge verteilt. |
| `repairSlashTail()` | Format `DE1 (A) DE2 (B) EN1 / EN2` – der letzte Kurs enthält zwei (oder mehr) englische Gänge, getrennt durch ` / ` |

### Neu: Fallback für `EN1 / EN2` hinter einem einzigen Slash

Wenn der Text
```
DE1 (A) DE2 (B) EN1 / EN2
```
vorliegt, teilt `segment()` den **Endblock** am ersten Slash:

- `course.de = "EN1"`
- `course.en = "EN2"`

`repairSlashTail()` prüft nun, ob die DE-Seite des Endblocks selbst stark englisch ist. Falls ja, wird der **gesamte** Endblock (`EN1 / EN2`) nochmals auf Gänge-Ebene gesplittet und auf die vorherigen deutschen Gänge verteilt. So landet kein englischer Text in der deutschen Spalte.

---

## 5. Gerichte splitten (`dishes.js`)

Wenn ein Kurs nach der Segmentierung noch mehrere `DE / EN`-Gänge enthält, zerlegt `splitDishes()` ihn rekursiv.

| Funktion | Zweck |
|----------|-------|
| `splitDishes(text, langModel)` | Bei 0 Schrägstrichen: mono. Bei 1 Schrägstrich: ein zweisprachiges Gericht. Bei ≥ 2 Schrägstrichen: erstes Gericht ablösen, Rest rekursiv. |
| `findDishBoundary()` | Findet innerhalb der Token zwischen zwei Schrägstrichen die Grenze `EN_i | DE_{i+1}`. |

### Grenzendektor

`findDishBoundary` bewertet jeden möglichen Schnitt `k`:

```
penalty(k) = Σ German-Evidenz links von k  +  Σ English-Evidenz rechts von k
```

- Sprachmodell-Score: positiv = deutsch, negativ = englisch, 0 = neutral.
- Lehnwörter (z. B. `curry`) sind neutral, damit sie nicht auf die falsche Seite ziehen.
- Großschreibung ist **nur noch Tiebreak**, nicht mehr harte Evidenz. Die alte Regel „Großbuchstabe ⇒ Deutsch" hat englische Wörter wie `Mix`, `Sabji`, `Vegetables` fälschlich als Deutsch klassifiziert und die Grenze verschoben.

---

## 6. Grenzen auflösen (`boundary.js`)

`resolveBoundary(fragment, langModel)` wird in `peelGluedTailFromUnanchored()` verwendet.

| Funktion | Zweck |
|----------|-------|
| `resolveBoundary()` | Sucht in einem englischen Textfragment den Punkt, an dem wieder deutscher Text beginnt, und schneidet diesen Teil als eigenen Mono-Kurs ab. |

---

## 7. Bewertung (`score.js`)

`scoreSplit()` gibt jedem Ergebnis ein **Confidence** und ein **Label**.

| Aspekt | Bedeutung |
|--------|-----------|
| `anchor` | Gibt es verankerte (allergen-basierte) Kurse? |
| `purity` | Sind `de`- und `en`-Seiten sprachlich sauber? |
| `course` | Passt die Gangzahl (typisch 2–3)? |
| `coverage` | Wurde der Großteil des Textes sinnvoll zugeordnet? |
| `label` | `high`, `medium`, `low`, `fallback`, `template` |

`label: 'fallback'` bedeutet, dass der Splitter keine saubere Aufteilung gefunden hat und den Originaltext mit Allergenkennungen als Rohliste ausgibt. Keine Information geht verloren, aber die Übersetzung ist nicht getrennt.

---

## 8. Sprachmodell (`langModel.js`)

Das Modell ist ein einfacher, statistischer Klassifikator ohne externe Abhängigkeiten.

| Komponente | Bedeutung |
|------------|-----------|
| `trigramsDe` / `trigramsEn` | Häufigkeit von Drei-Buchstaben-Folgen im Deutschen und Englischen |
| `funcDe` / `funcEn` | Funktionswörter (z. B. `mit`, `und`, `with`, `and`) |
| `scorePhrase(text)` | Summiert Log-Likelihoods, Funktionswörter, Umlaute, typische deutsche Digraphen (`sch`, `pf`, `tz`, `ck`) und Endungen (`-ung`, `-ing`, `-ed`) |
| `scoreLang(text)` | `deScore - enScore` |
| `learnFromCourse()` | Bei hochvertrauensvollen, verankerten Splits werden die Trigramme aus dem Ergebnis in den lokalen Delta-Cache (`localStorage`) übernommen |

---

## Beispiel-Durchlauf

Eingabe:

```
Süßkartoffel- Tomatensuppe / Sweet potato- tomato soup
Indisch: Mix Sabji (Gemüse in Kokossauce) Kichererbsencurry /
Indian: Mix Sabji ( Vegetables in coconut sauce) chickpea curry
Vanillepudding / Vanilla pudding(F)
```

1. `normalize()` → Text bleibt gleich, nur `(F)` ist normiert.
2. `segment()` → nur `(F)` ist gültiges Allergen, daher **ein** großer Kurs:
   - `de = "Süßkartoffel- Tomatensuppe"`
   - `en = "Sweet potato- tomato soup Indisch: Mix Sabji ... Vanilla pudding(F)"`
3. `alignTrailingEnglish()` → kein passendes Muster, weil der Block nicht als reiner Englisch-Block erkannt wird.
4. `repairMergedCourses()` → `en` enthält noch Schrägstriche. `splitDishes()` wird aufgerufen.
5. `findDishBoundary()` → findet nacheinander die korrekten Grenzen `Sweet potato- tomato soup | Indisch: ...` und `chickpea curry | Vanillepudding`.
6. Ergebnis:

```
DE:
• Süßkartoffel- Tomatensuppe
• Indisch: Mix Sabji (Gemüse in Kokossauce) Kichererbsencurry
• Vanillepudding (F)

EN:
• Sweet potato- tomato soup
• Indian: Mix Sabji ( Vegetables in coconut sauce) chickpea curry
• Vanilla pudding (F)
```

---

## Bekannte Grenzen

- **Komma-Formate**: `DE1 (A) DE2 (B) EN1, EN2, EN3` werden nur verteilt, wenn die Phrasenzahl exakt zu den deutschen Gängen passt. Bei mehrdeutigen oder unvollständigen englischen Seiten fällt der Splitter zurück auf Rohausgabe.
- **Lehnwörter**: Gerichte wie `Vanillepudding` oder `Spaghetti Carbonara` können vom Modell leicht als englisch gewertet werden. Die Strafsumme in `findDishBoundary` kompensiert das, solange die Gesamtstruktur stimmt.
