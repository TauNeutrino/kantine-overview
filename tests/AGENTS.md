# Test Guide

## OVERVIEW

The kantine-overview test suite is a collection of plain Node scripts. There is no Jest, Vitest, or Mocha here.

## HARNESS

- Each test is a standalone script that exits with code `1` on failure and `0` on success.
- Most unit tests load source code into a Node `vm` sandbox and supply mocked `document`, `window`, `localStorage`, `fetch`, `Date`, and timers.
- `tests/_langLoader.js` provides a `load(filePaths, extraSandbox)` helper for `src/lang/*.js` ES6 modules. It strips `import`/`export` statements, promotes top-level `const`/`let` to `var` so they leak into the sandbox object, concatenates the files in the order given, and runs them with `vm.runInContext`.
- `test_logic.js` reads `dist/kantine.bundle.js` and executes it via `vm.runInNewContext`, then loads `src/lang/*.js` and `src/utils.js` into the same sandbox to exercise `splitLanguage`, `escapeHtml`, `translateDay`, and `getLocalizedText`.
- `tests/stats-integration.test.js` inspects `dist/kantine.bundle.js` for `StatsTracker` APIs and the expected placeholder tokens.

## WHAT RUNS IN CI

`npm test` runs exactly five scripts in sequence, as defined in `package.json`:

1. `node tests/test_utils.js`
2. `node tests/test_actions.js`
3. `node test_logic.js`
4. `node tests/stats-integration.test.js`
5. `node tests/test_heatmap.js`

Run `npm run build` before `npm test`; `test_logic.js` and `stats-integration.test.js` need `dist/kantine.bundle.js`.

The GitHub Actions workflow `.github/workflows/build-and-deploy.yml` calls `npm run build` (which runs its own internal test step) but does not invoke `npm test` separately.

## HOW TO ADD A TEST

1. Create a new file under `tests/`, or at the root if it needs the built bundle.
2. Exit with `process.exit(1)` on failure and log success before exiting.
3. For `src/lang` modules, use `tests/_langLoader.js` and call `load(['src/lang/<module>.js'], extraSandbox)`.
4. For bundle-level checks, read `dist/kantine.bundle.js` and run it in a `vm` context with the mocks the code expects.
5. To include the test in `npm test`, append `&& node tests/<file>` to the `test` script in `package.json`.

## CONVENTIONS

- Mock `Date` and timers; do not let tests depend on the current wall-clock time.
- Do not `require` files from `src/` directly unless you first strip their ES6 `import`/`export` syntax.
- Keep assertion helpers inside the test file; do not add a shared assertion library.
- Name unit tests `test_<topic>.js` and integration/smoke tests `<topic>.test.js`.
- The following tests must be run manually with `node tests/<file>`:
  - DOM tests: `tests/test_dom.js`
  - `StatsTracker` unit tests: `tests/stats-tracker.test.js`
  - Lang module tests: `test_splitter.js`, `test_segment.js`, `test_boundary.js`, `test_normalize.js`, `test_templates.js`, `test_score.js`, `test_langmodel.js`, `test_align_trailing.js`, etc.
  - Security/repro scripts: `tests/test_security.js`, `tests/repro_vulnerability.js`
