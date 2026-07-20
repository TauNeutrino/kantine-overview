# Source Module Guide

## OVERVIEW

`src/` is the ES6 module tree for the bookmarklet app: boot, API glue, singleton state, actions, DOM rendering, and events. Language detection lives in `src/lang/` and has its own AGENTS.md.

## STRUCTURE

- `index.js` Webpack entry; boot sequence.
- `state.js` Singleton module-level state and setters.
- `actions.js` Business logic, API calls, orders, cache, flags, polling.
- `ui.js` Initial DOM skeleton injection.
- `ui_helpers.js` Render functions: day cards, toasts, version modal, alarm bell.
- `events.js` Event handlers: login, navigation, refresh.
- `api.js` Header factories.
- `constants.js` API_BASE, VENUE_ID, MENU_ID, localStorage keys, placeholders.
- `utils.js` Helpers: getISOWeek, escapeHtml, splitLanguage re-export.
- `i18n.js` `t()` localization.
- `stats-tracker.js`, `stats-hash.js` Pseudonymous stats.
- `lang/` Separate AGENTS.md.

## WHERE TO LOOK

- Boot sequence / entry point → `index.js`
- Feature or business logic → `actions.js`
- DOM skeleton / layout → `ui.js`
- Re-render components / cards / toasts → `ui_helpers.js`
- Event wiring / login / nav / refresh → `events.js`
- State shape / data mutation → `state.js`
- Headers / auth signatures → `api.js`
- Endpoints / IDs / storage keys / placeholders → `constants.js`
- Translations → `i18n.js`
- Date/week / HTML escaping / language detection entry → `utils.js`
- Pseudonymous stats → `stats-tracker.js`, `stats-hash.js`
- Language detection internals → `src/lang/AGENTS.md`

## DATA FLOW

Bessa API → `api.js` headers → `actions.js` → `state.js` → `ui_helpers.js` → DOM.

`loadMenuDataFromAPI` fetches menu and user data, populates `allWeeks` and `authToken`. `renderVisibleWeeks` reads `allWeeks` and redraws visible day cards. `showToast` and `updateAlarmBell` provide feedback. Event handlers in `events.js` call actions, which mutate state and trigger re-renders.

`actions.js` imports `renderVisibleWeeks`, `updateNextWeekBadge`, and `updateAlarmBell` from `ui_helpers.js`. `ui_helpers.js` imports `placeOrder`, `cancelOrder`, `toggleFlag`, `showToast`, and `checkHighlight` from `actions.js`. The circular dependency is resolved by ES module runtime semantics.

## CONVENTIONS

- ES6 `import`/`export` only; named exports.
- No semicolons; camelCase; single quotes.
- All UI text routed through `t()` in `src/i18n.js`.
- State is a singleton: module-level `export let` variables plus `setX()` mutators in `src/state.js`.
- Storage keys always from `constants.js` `LS` registry; never raw localStorage strings.
- DOM IDs are `kebab-case` with `btn-` / `btn-` prefixes; CSS classes are `kebab-case`.

## ANTI-PATTERNS

- Do not import `src/lang/` internals directly; go through `src/utils.js`.
- Do not introduce new two-way imports between `actions.js` and `ui_helpers.js`; the existing circular dependency is intentional and resolved by ES modules.
