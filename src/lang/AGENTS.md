# Language Detection Subsystem

## OVERVIEW

`src/lang/` splits mixed German/English menu descriptions into `{ de, en }` parts. The only public API is `splitDishName()` exported by `splitter.js`.

## PIPELINE

`splitter.js` orchestrates the flow:

- `normalize.js` — cleans punctuation, repairs allergen parentheses, expands abbreviations.
- `templates.js` — matches known DE/EN recipe templates and allergens; returns early on hit.
- `langModel.js` — trigram classifier built from seed data.
- `langModelSeed.js` — generated lookup tables (`trigramsDe`, `trigramsEn`, `funcDe`, `funcEn`).
- `segment.js` — splits text into candidate DE/EN courses.
- `alignTrailing.js` — moves trailing English tokens to the English side.
- `dishes.js` — splits slash-separated combined dishes.
- `boundary.js` — finds the language boundary inside a mixed chunk.
- `score.js` — rates the final split and assigns a confidence label.
- `loanwords.js` — dictionary of terms that behave like the opposite language.
- `types.js` — shared constants.

## WHERE TO LOOK

- Public entry point → `splitter.js` (`splitLanguage`, `splitDishName`).
- Model internals → `langModel.js`.
- Seed data → `langModelSeed.js` (generated, read-only).
- Text cleanup → `normalize.js`.
- Split quality → `score.js`.
- Boundary logic → `boundary.js`.
- Slash dish splitting → `dishes.js`.
- Template matching → `templates.js`.

## TRAINING/TESTING

- Regenerate seed: `node tools/train-langmodel.js` writes `src/lang/langModelSeed.js`.
- Evaluate accuracy: `node tools/eval-splitter.js`.
- ESM export helpers: `tools/export-seed.mjs`, `tools/export-test-vectors.mjs`.
- Tests use `tests/_langLoader.js`, a CommonJS VM sandbox that strips ES6 import/export so lang modules run under Node.
- Lang tests: `test_splitter.js`, `test_segment.js`, `test_boundary.js`, `test_normalize.js`, `test_templates.js`, `test_score.js`, `test_langmodel.js`, `test_align_trailing.js`, `test_heatmap.js`.
- Only `test_heatmap.js` runs with `npm test`; run the rest manually.

## CONVENTIONS

- Only `splitter.js` is imported from outside `src/lang/`.
- `langModelSeed.js` must never be hand-edited; regenerate it with `tools/train-langmodel.js`.
- All lang modules are ES6; Node tests load them via `tests/_langLoader.js`.
- Keep language-specific heuristics in the matching stage, not in the orchestrator.
