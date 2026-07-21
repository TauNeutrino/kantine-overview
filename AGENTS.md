# PROJECT KNOWLEDGE BASE

**Generated:** 2026-07-20T08:50:28Z  
**Commit:** cdcc081  
**Branch:** main

## OVERVIEW

Web bookmarklet wrapper for the Bessa Knapp-Kantine (`https://web.bessa.app/knapp-kantine`). Injects a weekly-menu overlay as an ES6-module app bundled by Webpack 5 and minified by Terser. No frontend framework — plain DOM manipulation with a singleton state module.

This is a **live production system** with real financial impact. See `.agent/rules/rules.md` for mandatory operational protocols (approval for orders/credentials, testing policy, requirements consistency).

## STRUCTURE

```
.
├── src/                  # ES6 source modules
│   └── lang/             # DE/EN language detection subsystem
├── stats/                # Chart.js usage dashboard (deployed to dist/stats/)
├── dist/                 # Build artifacts (committed, GitHub Pages)
├── tests/                # Standalone Node tests (no framework)
├── scripts/              # Build & release automation
├── tools/                # Lang-model training / evaluation helpers
├── docs/                 # Architecture, design system, setup guides
├── .agent/rules/         # Always-on agent rules
└── .agents/skills/       # UI design system skill
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add a feature / fix business logic | `src/actions.js` | 23 exports: API, cache, orders, flags |
| Change rendering / UI components | `src/ui_helpers.js`, `src/ui.js` | See `.agents/skills/kantine-ui-system/SKILL.md` |
| Add event handlers | `src/events.js` | Login, nav, refresh, highlights |
| Modify state shape | `src/state.js` | Singleton module-level vars + setters |
| Add API endpoints / headers | `src/api.js`, `src/constants.js` | Constants registry in `constants.js` |
| Change build outputs | `scripts/build.js`, `webpack.config.js` | Build is 10 steps, includes tests |
| Update tests | `tests/`, `test_logic.js` | VM-sandboxed tests; see `tests/AGENTS.md` |
| Change stats dashboard / usage charts | `stats/index.html` | Chart.js dashboard; CI copies `stats/` to `dist/stats/` |
| Train language model | `tools/train-langmodel.js` | Writes `src/lang/langModelSeed.js` |

## CODE MAP

Highest-centrality symbols (ranked by cross-file references):

| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| `renderVisibleWeeks` | function | `src/ui_helpers.js:106` | 10 | Main DOM re-render funnel |
| `loadMenuDataFromAPI` | function | `src/actions.js:903` | 5 | Primary API → state loader |
| `t` | function | `src/i18n.js` | 20+ | All UI text localization |
| `showToast` | function | `src/actions.js:1130` | 9 | User feedback |
| `updateNextWeekBadge` | function | `src/ui_helpers.js:17` | 6 | Next-week button state |
| `updateAlarmBell` | function | `src/ui_helpers.js:857` | 5 | Flag-availability bell icon |
| `allWeeks` | variable | `src/state.js:4` | 8+ | Central menu data structure |
| `authToken` | variable | `src/state.js:8` | 8+ | Auth gate for API calls |
| `state.js` | module | `src/state.js` | 8 | Imported by most modules |
| `constants.js` | module | `src/constants.js` | 8 | Constants + LS key registry |
| `renderDashboard` | function | `stats/index.html:209` | 1 | Renders all Chart.js usage-dashboard charts |
| `fetchGistData` | function | `stats/index.html:196` | 1 | Loads aggregated stats from the public Gist |

## CONVENTIONS

- **Modules**: ES6 `import`/`export` only; named exports; no `require` in `src/`.
- **Style**: No semicolons, camelCase, single quotes. See `CONTRIBUTING.md`.
- **State**: Singleton module pattern — `export let` variables plus `setX()` mutators.
- **Strings**: All UI text routed through `t()` in `src/i18n.js`.
- **Storage**: Always use `LS.*` constants from `src/constants.js`; never raw localStorage keys.
- **DOM IDs**: `kebab-case` with `btn-`/`btn-` prefixes. CSS classes: `kebab-case`.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).
- **Versioning**: Bump `version.txt` for every feature/bugfix; update `changelog.md`.

## ANTI-PATTERNS (THIS PROJECT)

- **Never** use raw localStorage key strings — use `constants.js` `LS` registry.
- **Never** set `overflow` on `html` — breaks `position: sticky`.
- **Never** apply opacity/filter directly to `.menu-card` — breaks sticky header; target children.
- **Never** persist passwords; tokens in localStorage only (`REQUIREMENTS.md` NFR-003).
- **Never** let `{{PLACEHOLDER}}` strings survive the build — `scripts/build.js` fails fatally.
- **Never** allow a raw GitHub PAT in the bundle — build has a secret-scanning guard.

## COMMANDS

```bash
npm run build          # Webpack → Terser → inject placeholders → tests → size guard
npm test               # Run the 5 standalone Node tests (needs built dist/ first)
npm run release        # Tag and push from version.txt (requires clean working tree)
npm run train-langmodel # Regenerate src/lang/langModelSeed.js from fixture data
```

## NOTES

- **Build requires env vars**: `GIST_PAT`, `GIST_ID`, `GIST_SALT` or `scripts/build.js` exits with FATAL.
- **dist/ is committed**: CI copies `stats/` into `dist/` and deploys to GitHub Pages.
- **No test framework**: Tests are plain Node scripts using `vm.runInNewContext` or `jsdom`.
- **Circular dependency**: `actions.js` ↔ `ui_helpers.js` — both import each other; ES module semantics resolve this at runtime.
- **Auto-update**: Bootloader in `dist/bookmarklet.txt` loads the bundle from jsDelivr or local cache; bootloader itself never updates.
