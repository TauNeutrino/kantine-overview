# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.1] - 2026-07-20

### Fixed

- **DE/EN-Splitter**: Englische Wörter mit Großbuchstaben (z. B. `Indian:`, `Mix`, `Sabji`, `Vegetables`) werden nicht mehr als Deutsch klassifiziert. Der Boundary-Detektor in `src/lang/dishes.js` verwendet jetzt kontinuierliche Sprachmodell-Scores und Großschreibung nur noch als Tiebreak.
- **Trailing-English-Block**: `src/lang/alignTrailing.js` erkennt jetzt `DE1 (A) DE2 (B) EN1 / EN2` und verteilt EN1/EN2 korrekt auf die vorherigen deutschen Gänge.

### Added

- **Dokumentation**: `docs/LANGUAGE_SPLITTING.md` beschreibt die logische Pipeline der automatischen Sprach-Split-Funktionen (Module, Verantwortlichkeiten, Grenzen).
- **Tests**: `tests/test_splitter.js` um zwei Regressionstests erweitert (Sabji-Beispiel und Trailing-English-Block).
- **Test-Harness**: `tests/test_no_info_lost.js` um fehlendes `alignTrailing.js` im Modul-Eval ergänzt.

## [2.0.0] - 2026-07-13

### Added

- **Auto-Update**: Bookmarklet ist jetzt ein Bootloader mit automatischen CDN-Updates.
  - `scripts/build.js` erzeugt neben den bisherigen Artefakten ein CDN-Bundle (`kantine-auto-update-bundle.js`) und ein Versions-Manifest (`version.json`).
  - Beim Start prüft der Bootloader `version.json` auf GitHub Pages, lädt das aktuelle Bundle von jsDelivr und cached es in `localStorage` (1h Gültigkeit).
  - Bei Netzwerkfehlern fällt er automatisch auf ein eingebettetes Fallback-Bundle zurück.
  - Splash-Screen (`#kantine-splash`) zeigt den Ladevorgang an ("Initialisiere...", "Update wird geladen...").
  - Console-Reporting: Loggt gebackene Version, Cache-Version, CDN-Version und Entscheidung (update/cache/baked-in).
  - Reinit bei wiederholtem Klick: Statt eines `alert()` wird die App sauber neu initialisiert, bei Bedarf mit Update.
- **Bookmarklet-Tests**: `auto-update-bootloader.test.js` mit strukturellen Bootloader-Tests und E2E-Verifikation.
- **Stats-Tracking**: `stats-tracker.test.js` und `stats-integration.test.js` für das Gist-basierte Nutzungs-Tracking.

### Changed

- **CI auf Node 24 migriert**: GitHub Actions auf `checkout@v7`, `setup-node@v6`, `upload-pages-artifact@v5`, `deploy-pages@v5`, `setup-java@v5`, `cache@v6`, `setup-android@v4` aktualisiert. `package.json` deklariert `"node": ">=24"`.
- CI erzeugt Git-Tags automatisch aus `version.txt` und pusht sie — `npm run release` ist obsolet.
- **DE/EN Splitter verbessert** – erkennt jetzt interleaved und trailing English Formate.
- Dev-Mode: Trigramm-Heatmap pro Zeichen für Low-Confidence-Splits (Farbintensität nach Affinitätsstärke).
- **Dokumentation**:
  - `docs/ARCHITECTURE.md`: Neuer Abschnitt "Deployment & Auto-Update" mit Komponententabelle, ASCII-Ablaufdiagramm und Einschränkungshinweis.
  - `README.md`: CI/CD-Sektion, Auto-Update-Beschreibung, dynamischer Version-Badge.
  - `docs/TESTING.md`: Um neue Testdateien ergänzt.

### Fixed

- **Build-Guard**: Version-Check aus `verifyAutoUpdateArtifacts()` entfernt (strukturelle Prüfung reicht vor dem Build), Versionsvergleich bleibt in `stepTests()` post-build.
- **Doppel-`v` in Logs**: Sowohl im Cache-Report als auch in Bootloader-Logs beseitigt.
- **Splash beim Reinit**: Splash wird jetzt auch dann entfernt, wenn kein Update verfügbar ist (kein Hängenbleiben).
- **PayPal SDK Duplicate Listener**: DOM-Ersetzung auf `#kantine-wrapper` beschränkt (statt `body.innerHTML`); PayPal-Render in `try/catch` gewrappt.
- **Lang-Splitter**: Nested-Paren-Allergen-Schlucken behoben; Slash-Separator-Recovery wenn orphaned `(` ihn verdeckt.

## [1.10.6] - 2026-07-13

### Fixed
- Category counters (`version`, `mobile`, `lang`, `logged_in`) now track per-session counts instead of overwriting on each `set()`. Enables proper version-adoption and device/language distribution charts.
- GitHub Pages dashboard: versions-over-time stacked area, unique-users-over-time line, and hourly-usage horizontal bar charts added.
- CI no longer pushes `dist/` commits to `main` — tags point to a detached dist commit, eliminating the need to rebase before each push.
- Android CI scoped to `android/` path changes only, skipping unnecessary builds on web-only pushes.

## [1.10.5] - 2026-07-08

### Added
- Dev-Mode now requires a password (SHA-256 gate) before it can be enabled.
- System notification (browser `Notification`) when next-week menus become orderable, mirroring the flagged-menu behaviour.

### Changed
- Low-stock indicator: menus with stock below 10 now show "Wenig verfügbar" in a green-yellow badge (normal mode); dev mode keeps showing the number.
- Translations with low confidence (`low`/`fallback`) now fall back to the raw source text instead of a guessed split.

### Fixed
- Build now fails loudly if `GIST_PAT`/`GIST_ID`/`GIST_SALT` are missing, preventing the Gist-sync `401` caused by un-injected placeholders.

## [1.9.4] - 2026-06-24

### Fixed
- `renderVisibleWeeks()` restores scroll position of the `.days-grid` container after DOM re-render. The page no longer jumps to top on refreshes (e.g. after ordering, cancellation, or flag changes).

## [1.9.3] - 2026-06-24

### Added
- On failed order (API or network error), available quantities of the menu are automatically reloaded and updated in the UI.

## [1.9.2] - 2026-06-24

### Changed
- GitHub API rate-limit protection for the version menu. `checkForUpdates()` now checks local cache (1h TTL) first, saving the API call during hourly polling. `fetchVersions()` sends stored ETag headers for conditional requests — GitHub responses with `304 Not Modified` do not count against the rate limit. DevMode switch also clears the ETag cache.

## [1.9.1] - 2026-06-24

### Fixed
- Language splitter no longer incorrectly interprets slashes inside parentheses as DE/EN separators. Menus with meat indications like `(Schwein/Rind)` or `(pork/beef)` are now correctly split bilingual (`high` confidence instead of `fallback`).

## [1.9.0] - 2026-06-23

### Added
- Hover tooltip on menu descriptions with doubtful split (medium/low confidence) shows the original text for verification.
- Language switch as a 3-state toggle (DE/EN/ALL) — one click, no dropdown.
- Version overview: "Install" and "→ Github" buttons are now visible for the currently installed version too.

### Changed
- Language splitter completely overhauled: hand-maintained word lists replaced by a self-learning trigram language model. Detects DE/EN boundaries based on slash structure and German capitalization — even for rare words the model does not know. Mono-desserts/brand words (Donut, Balisto, Vanillapudding) are recognized as their own course. Merged courses due to missing allergens are correctly separated. 2-course results are flagged as suspicious.
- DEV badge: confidence badge sits inline in the menu description, smaller and more discreet.

### Fixed
- Various bugfixes (v1.8.7–v1.8.9): host CSS overrides, blob URL redirect, menu name localization on language switch, live quantity update after ordering.

### Changed
- Build: platform-independent Node.js scripts (`npm run build`, `npm run release`) replace bash scripts.

## [1.8.11] - 2026-06-23

### Fixed
- Merged courses are now correctly separated. When a dish in the weekly menu had no allergen, two dishes were previously incorrectly merged (e.g. "Curryhuhn" and "Erdbeer-Rhabarber-Tiramisu"). The splitter now recognizes dish boundaries based on slash structure and German capitalization — even for rare words the language model does not know.
- A 2-course result is flagged as suspicious (normal are 3 courses or 1 on Friday) and downgraded in confidence.

### Added
- Individually written mono-desserts/brand words (e.g. Donut, Balisto, Vanillapudding) are recognized as their own third course, instead of sticking to the previous dish.
- For doubtful splits (confidence "medium" or lower), hovering over the menu description shows the original raw text as a tooltip for verification.

### Changed
- UI: The confidence badge (`kantine_dev_mode`) now floats bottom-right in the menu description instead of next to the availability badge.

## [1.8.10] - 2026-06-23

### Changed
- Language recognition (`splitLanguage`) completely rewritten. Hand-maintained word stem lists (DE_STEMS, EN_STEMS) were replaced by a self-learning trigram language model that automatically adapts to new menus and provides a confidence rating.
- Build scripts (`build-bookmarklet.sh` and `release.sh`) ported to platform-independent Node.js scripts (`scripts/build.js`, `scripts/release.js`). Build now runs via `npm run build`.

### Added
- DEV confidence badge in `kantine_dev_mode` — shows confidence score and sub-scores (Anchor/Purity/Course/Coverage) as tooltip.
- Comprehensive test suite for the new language model (9 module tests + 451-item "No Info Lost" check + hold-out evaluation harness).

### Fixed
- `test_logic.js` VM sandbox now loads ES6 modules in correct dependency order, so the splitter test no longer fails on undefined imports.
- Redirect test in `test_logic.js` now receives `document.querySelector`/`querySelectorAll` mock to avoid errors from top-level DOM accesses of imported modules.

## [1.8.9] - 2026-06-22

### Added
- After successful order of a watched menu, its "Notify" status (bell icon) is now automatically removed.
- After an order (or cancellation), the displayed remaining quantity of the menu is automatically updated via live API call.

### Fixed
- When switching languages, menu names on the cards were not immediately re-rendered. This was fixed by also localizing the menu title in real time.

## [1.8.8] - 2026-06-18

### Fixed
- Redirect check for blob URLs corrected. When the bookmarklet is executed on a `blob:` URL (e.g. on the installer page), the protocol is now correctly recognized and reliably redirects the user to `https://web.bessa.app/knapp-kantine`.

## [1.8.7] - 2026-06-18

### Fixed
- Background color and font specificity corrected. The host page's body background (class `.bg`) had previously overwritten our body background, causing the overview and semi-transparent title bar to turn gray. This is now fixed with more specific selectors (`body, body.bg`) and `!important`. The `Inter` font was also restored and `#kantine-wrapper` received an explicit background color.

## [1.8.6] - 2026-05-11

### Fixed
- PayPal button scaled via CSS (0.9) to prevent clipping at the bottom edge without changing the footer height.

## [1.8.5] - 2026-05-11

### Fixed
- Right footer padding increased to prevent donation buttons from being overlapped by the scrollbar.

## [1.8.4] - 2026-05-11

### Changed
- Layout: donation buttons (Ko-fi & PayPal) moved to the right side of the footer.
- UX: Ko-fi button further reduced (20px) for even more discreet integration.

## [1.8.3] - 2026-05-11

### Changed
- Donation buttons (Ko-fi & PayPal) reduced to 24px height.
- Footer layout optimized and padding reduced for more compact display.

## [1.8.2] - 2026-05-11

### Added
- Donation buttons (Ko-fi & PayPal) added to the footer.

### Changed
- Footer layout switched to Flexbox for better desktop and mobile display.

## [1.8.1] - 2026-05-11

### Fixed
- `htmlpreview.github.io` links were being blocked by firewalls. Installer pages are now loaded directly from GitHub raw content (`raw.githubusercontent.com`) via fetch and opened as a blob URL in the browser — no external proxy needed.
- The `🆕` update icon in the header now also links via blob fetch instead of `htmlpreview`.

### Added
- UX: In the version dialog, a two-button layout replaces the old single link:
  - **Install** — Loads `install.html` via blob from GitHub raw content and opens it rendered in a new tab.
  - **→ Github** — Opens the file directly in the GitHub file browser (new tab).

## [1.8.0] - 2026-05-10

### Fixed
- Critical error in order submission fixed.
  - The date format (`date`) in the `placeOrder` payload was changed from `T10:30:00Z` to `T09:00:00.000Z`. The canteen terminal strictly requires this format including milliseconds to display the order for lunch.
  - The `preorder` flag is now passed as `false` by default (instead of `true`), since pre-orders were otherwise filtered in the kitchen system even though the web backend accepted them.

### Changed
- Docs: OpenAPI specification (`bessa-openapi.yaml`) extended with new findings regarding the kitchen terminal.

## [1.7.3] - 2026-03-17

### Fixed
- Build error in DOM tests fixed (JSDOM domain check).

### Changed
- Metadata: version bumped to v1.7.3.

## [1.7.2] - 2026-03-12

### Security
- Logout logic completed (FR-006). When logging out, all app-related data (including order history, cache, and settings) is now deleted from `localStorage`.

### Changed
- Cleanup: obsolete `GUEST_TOKEN` residues in `events.js` and `ui_helpers.js` removed.
- Testing: security test suite extended with verification of logout data deletion.

## [1.7.1] - 2026-03-12

### Security
- XSS protection: `innerHTML` replaced by `textContent` in `renderTagsList` (Actions) and `showErrorModal` (UI-Helpers).
- XSS protection: dynamic card elements in `createDayCard` validated.
- Input validation: new keywords are now checked for length (2-20 characters) and allowed characters (alphanumeric + food special characters).
- `GUEST_TOKEN`: the hardcoded guest token was completely removed from the code. Non-logged-in users no longer have API access (security regulation).
- Auth guards: API functions (`loadMenuDataFromAPI`, `refreshFlaggedItems`) now explicitly check for existing authentication before fetching.
- Security test suite `tests/test_security.js` implemented.

## [1.6.25] - 2026-03-12

### Added
- Debounced resize listener. Height synchronization of menu cards is now also executed automatically and efficiently on viewport changes (e.g. window scaling or orientation change).
- `debounce` utility function added to `utils.js`.

## [1.6.24] - 2026-03-12

### Changed
- Performance: layout thrashing in `syncMenuItemHeights` fixed. Batch processing of DOM read and write operations improved rendering efficiency when switching weeks.

## [1.6.23] - 2026-03-12

### Added
- Glassmorphism: header background transparency reduced to 72% (was 90%) — the blur effect is now visible when scrolling.
- Dark mode contrast: `--bg-card` darkened (`#283548`), `--border-color` slightly lightened (`#526377`) — better separation between body and card.
- Accent color: in light mode changed from Slate-900 (almost black) to Blue-600 (`#2563eb`) — clearer visible accent.
- Typography: `.item-desc` `line-height` to 1.5 (body-consistent), `.day-date` smaller and more discreet (0.8rem, opacity 0.75), `.item-name` slightly reduced (0.95rem).
- Item separator: subtle dividing line between menu items in the day card.
- Badge consistency: all badges (`badge`, `tag-badge-small`) unified to `border-radius: 6px`.
- A11y — reduced motion: `@media (prefers-reduced-motion: reduce)` disables all decorative pulse/glow animations for motion-sensitive users.
- A11y — focus-visible: global `:focus-visible` outline ring (2px, accent-color) for keyboard navigation.
- Active states: `:active` feedback (`scale(0.97)`) for order, cancel, and flag buttons.
- Mobile breakpoint: extended from 600px to 768px (covers tablets); grid declaration explicitly set to avoid browser override bug.

## [1.6.22] - 2026-03-12

### Changed
- UX cleanup: text label at language switch removed. The button now only shows the `translate` icon, making the controls bar calmer.

## [1.6.21] - 2026-03-12

### Added
- Language switch redesign — the language selection (DE/EN/ALL) was moved from the header center to the right controls area. It is now available as an icon dropdown with current status display (e.g. "DE"). The 🇦🇹 flag is used for German.

## [1.6.20] - 2026-03-12

### Removed
- Weekly cost display removed — at user request, the display of weekly total costs in the header was removed to declutter the UI. FR-040 marked as obsolete.

## [1.6.19] - 2026-03-11

### Added
- Grid layout & glow overlap fix — card contents switched to a clean grid-gap model (`row-gap: 1.5rem`). This prevents technical overlaps of menu items and ensures glow effects (ordered, highlight) correctly wrap all contents. Manual spacing cleaned up.
- Glow styling adjusted — color highlights (ordered, highlight, flagged) were corrected so they no longer reach the card edge, but are displayed within the card body with appropriate side spacing.
- Fix card content overflow — in the 5-day view (landscape) on narrow screens, status badges and buttons now correctly wrap to a new line instead of protruding beyond the card edge. Card padding optimized for desktop views.
- Feature: when EN is selected, the entire user interface switches to English (buttons, tooltips, modals, status badges, weekdays, order history). DE and ALL retain German.
- Feature: the glow of the "Next Week" button is now only triggered when orderable menus without existing orders are available for Monday–Thursday. Friday is excluded from this check.
- `src/i18n.js` — central translation module for all static UI labels (DE/EN).

### Changed
- Maintainability: all remaining hardcoded German UI strings in `actions.js` translated via `t()` (progress texts, error labels, 'Logged in', 'Background synchronization').
- Maintainability: all `localStorage` keys centralized into a unified `LS` object in `constants.js`. All source files now use `LS.*` instead of raw strings.
- Robustness: `setLangMode()` and `setDisplayMode()` in `state.js` now validate input values — invalid values are discarded and logged.
- Documentation: JSDoc for `ui.js` and `injectUI()` added.
- Code quality check of all source files — JSDoc comments added, explanations for complex logic blocks added.

### Fixed
- Checked menus (`refreshFlaggedItems`) now only update the actually flagged items — no longer all menus of the affected day.
- When opening the highlights modal, existing tags are displayed immediately, even without prior new input.
- The number badges in the "Next Week" button were removed. The order overview (ordered / orderable / total + highlights) is now available as a tooltip.

## [1.6.14] - 2026-03-10

### Fixed
- The global "Updated at" time in the header is no longer reset on a manual check of flagged menus.

## [1.6.13] - 2026-03-10

### Added
- Manual refresh of flagged menus by clicking the alarm icon in the header ([FR-093](REQUIREMENTS.md#FR-093)).
- Visual feedback during the check via rotation of the icon.
- Notification: toast notification shows the number of checked menus.

## [1.6.12] - 2026-03-10

### Added
- Modularization of `kantine.js` into ES6 modules (`api.js`, `state.js`, `utils.js`, `ui.js`, etc.).
- Webpack integration into the build process to support the modular structure.
- Security: XSS protection through escaping of dynamic content in `innerHTML`.
- Performance optimizations:
  - Optimized tag badge generation and UI render loops (use of `reduce`).
  - Use of `insertAdjacentHTML` instead of `innerHTML` for more efficient rendering.
  - Batch fetching of `availableDates` to reduce API calls.
  - Performance fixes in `ui_helpers.js`.
- Testing: unit tests for GitHub API header generation added.
- Cleanup: removal of orphaned `console.log` statements.

### Fixed
- Correction of the tooltip at the alarm icon (polling time vs. global update time).

## [1.6.11] - 2026-03-09

### Changed
- Refactor: separation of timestamps for the main update (header) and the notification check (bell icon). Polling no longer incorrectly updates the "Updated at" time in the header.
- Metadata: version bumped to v1.6.11.

## [1.6.10] - 2026-03-09

### Added
- Robust course recognition in bilingual menus ([FR-121](REQUIREMENTS.md#FR-121)).
- Improved: heuristic split now more reliably recognizes the transition from English back to German (e.g. with "Achtung" notices).

### Fixed
- Prevents shifting of courses when English translations are missing.

## [1.6.9] - 2026-03-09

### Fixed
- Incorrect time display at the bell icon ("291h ago") fixed. The tooltip is now updated every minute and correctly reset after each menu check.

### Changed
- Timestamp management for the last update unified and persisted in `localStorage`.

## [1.6.8] - 2026-03-06

### Changed
- Performance: the JavaScript for the canteen bookmarklet is now minimized during the build process (via Terser), which noticeably reduces the length of the injected URL.

## [1.6.7] - 2026-03-06

### Changed
- Style: the new header logo (`favicon_base.png`) is now consistently generated and rendered at 40x40px.

## [1.6.6] - 2026-03-06

### Changed
- Style: shadow and protruding card effect for ordered menus on past days completely removed — they now remain visually flat and unobtrusive like non-ordered menus.

## [1.6.5] - 2026-03-06

### Added
- The `restaurant_menu` icon in the header was replaced by the new `favicon_base.png` logo, scaled to match the text size.

### Changed
- Style: purple border (ordered marking) on past days removed to focus attention on current and future orders.
- Style: the glow effect for menus ordered on the current day was intensified.

## [1.6.4] - 2026-03-05

### Added
- Language lexicon (DE/EN) massively expanded with Austrian terms (Nockerl, Fleckerl, Topfen, Mohn, Most etc.) and common typos from the Bessa system (trukey, coffe, oveb etc.).

### Changed
- Cleanup: language lexicon deduplicated and alphabetically sorted for better performance and maintainability.

### Fixed
- Separation of bilingual menus (`splitLanguage`) improved: now also catches slashes without spaces (e.g. `Suppe/Soup`).
- Incorrect badge display corrected (variable `count` vs `orderCount`).

## [1.6.3] - 2026-03-05

### Changed
- Slogan in the footer updated ("Jetzt Bessa Einfach! • Knapp-Kantine Wrapper • 2026 by Kaufis-Kitchen") and footer height optimized for more placement space.

## [1.6.2] - 2026-03-05

### Added
- Weekday headers (Monday, Tuesday etc.) now scroll as "sticky headers" and stick to the top of the screen.
  - The layout clips scrolling dishes neatly underneath.
  - Full viewport scrolling: the layout now uses the full height (`100dvh`), so scrollbars are cleanly positioned at the edge.

### Fixed
- Problems with Bessa's default `overflow` behavior fixed, which blocked `position: sticky` on iOS/WebKit browsers.

## [1.6.0] - 2026-03-04

### Added
- Language filter for bilingual menu descriptions. New DE/EN/ALL toggle in the header enables switching between German, English, and the full original text. Allergen codes are displayed in all modes. Setting is persistently saved.

## [1.5.1] - 2026-03-04

### Fixed
- Friday orders failed ("Online orders are not available"). Cause: the order payload used `preorder: false` and a wrong time (`T10:00:00.000Z` instead of `T10:30:00Z`). Both were corrected based on the original Bessa API.

## [1.5.0] - 2026-02-26

### Added
- **Order History**: clear history directly in the app — grouped by year/month, including sums, statuses (Open/Completed/Cancelled) and delta cache for lightning-fast loading.
- **Smart Cache & Performance**: massive reduction of API calls and loading times through intelligent local cache. The bookmarklet now starts practically delay-free.
- **GitHub Release Management**: in-app version menu with auto-update check (`🆕` icon). Switch between "Stable" and "Dev" versions as well as downgrade possibility directly via the GitHub API.
- **Smart Highlights & UX**: food favorites now glow in design purple and receive feature badges. The order badge for next week now intelligently filters personalized highlights.
- **Order Warning & Notifications**: the system alarm now correctly accounts for sessions, shows dynamic color changes (yellow/green/red) and reliably warns before the order deadline (10:00 AM). Legacy items from previous days are automatically cleaned up.
- **Own Favicon**: the bookmarklet and the installer now have their own icon (triangle with cutlery), which is adopted when dragged into the bookmark bar (dynamically generated as local PNG).
- **Local Cache Clear**: a "trash can" built into the version menu that exclusively cleans faulty canteen caches without accidentally destroying the active Bessa host session.
- **Session Persistence**: the login session now survives new tabs, windows, and version upgrades smoothly through the switch to `localStorage`.
- **Testing & Stability**: fully automated DOM and logic testing suites integrated into the release pipeline. Faulty UI buttons are a thing of the past.

## [1.4.0] - 2026-02-22

### Added
- Order history available at the press of a button. Clear display, grouped by months and calendar weeks, including cancellations.

## [1.3.2] - 2026-02-19

### Fixed
- Wrong number of highlight menus in the "Next Week" badge corrected (counted all menus instead of only highlights).

## [1.3.1] - 2026-02-16

### Changed
- Smart Cache — API refresh at startup is skipped when data for the current calendar week is present and cache is < 1h old.

## [1.3.0] - 2026-02-16

### Added
- GitHub Release Management
  - Version menu: click on version number shows all available versions.
  - Dev-Mode toggle: switch between releases (stable) and tags (dev).
  - Downgrade support: each version has its own installer link.
  - Update check now uses the GitHub API instead of `version.txt`.
  - GitHub PAT for higher API rate limit (5000/h).
  - SemVer check: update icon only on truly newer version.

## [1.2.9] - 2026-02-16

No changes.

## [1.2.8] - 2026-02-16

### Added
- Additional logging (fetch status, start log) for troubleshooting.

## [1.2.7] - 2026-02-16

### Added
- Verbose logging for update check built in.

## [1.2.6] - 2026-02-16

### Changed
- Version bump for testing live update detection.

## [1.2.5] - 2026-02-16

### Changed
- Update detection completely overhauled (hourly check, discreet 🆕 icon in header, no more banner).
- Cleanup: unused CSS code and network traffic reduced.

### Fixed
- Highlight logic stabilized (no false matches on empty tags).

## [1.2.4] - 2026-02-16

### Added
- Found highlights are now displayed directly in the menu as a badge.

## [1.2.3] - 2026-02-16

### Added
- Unit tests for update logic integrated into the build.

### Fixed
- Update icon is now clickable and leads directly to the installer.

## [1.2.2] - 2026-02-16

### Changed
- Installer changelog now collapsible for more overview.

## [1.2.1] - 2026-02-16

### Added
- Mock data (`mock-data.js`) for standalone tests built in.

### Changed
- Highlight glow with blue pulse animation (`blue-pulse`) revised.
- Tag badges designed consistently with the badge system.
- "Add" button (`#btn-add-tag`) styled as primary button.
- Modal body padding and input font corrected.
- README project structure with table for `dist/` artifacts added.

### Fixed
- Smart Highlights are now correctly applied to menu items (`checkHighlight` in `createDayCard`).

## [1.2.0] - 2026-02-16

### Added
- Build tests added.

### Changed
- Better UX in the installer (button at top, log at bottom, features updated).

### Fixed
- Encoding problems finally fixed (thanks to Python build logic).

## [1.1.2] - 2026-02-16

### Fixed
- Encoding problem with the bookmarklet fixed (URL Malformed Error).

## [1.1.1] - 2026-02-16

### Fixed
- Critical error that prevented the wrapper from loading fixed.

## [1.1.0] - 2026-02-16

### Added
- **Order Countdown**: shows a red countdown 1 hour before the order deadline.
- **Smart Highlights**: mark your favorite dishes (e.g. "Schnitzel", "Vegetarian") so they glow.
- **Changelog**: this overview of changes.

### Changed
- Live check of the version on update.

## [1.0.3] - 2026-02-13

### Fixed
- Update link now opens the installer directly as a web page (via htmlpreview).

## [1.0.2] - 2026-02-13

### Changed
- Version synchronized with GitHub.

## [1.0.1] - 2026-02-12

### Added
- Better design for "Next Week" (badges).

### Changed
- Core: basic functions (order, balance, token store).

---

> Die Android-App wurde in ein eigenes Repository ausgelagert: [github.com/TauNeutrino/kantine-app](https://github.com/TauNeutrino/kantine-app)

[Unreleased]: https://github.com/TauNeutrino/kantine-overview/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/TauNeutrino/kantine-overview/compare/v1.10.6...v2.0.0
[1.10.6]: https://github.com/TauNeutrino/kantine-overview/compare/v1.10.5...v1.10.6
[1.10.5]: https://github.com/user/repo/compare/v1.10.4...v1.10.5
[1.9.4]: https://github.com/user/repo/compare/v1.9.3...v1.9.4
[1.9.3]: https://github.com/user/repo/compare/v1.9.2...v1.9.3
[1.9.2]: https://github.com/user/repo/compare/v1.9.1...v1.9.2
[1.9.1]: https://github.com/user/repo/compare/v1.9.0...v1.9.1
[1.9.0]: https://github.com/user/repo/compare/v1.8.11...v1.9.0
[1.8.11]: https://github.com/user/repo/compare/v1.8.10...v1.8.11
[1.8.10]: https://github.com/user/repo/compare/v1.8.9...v1.8.10
[1.8.9]: https://github.com/user/repo/compare/v1.8.8...v1.8.9
[1.8.8]: https://github.com/user/repo/compare/v1.8.7...v1.8.8
[1.8.7]: https://github.com/user/repo/compare/v1.8.6...v1.8.7
[1.8.6]: https://github.com/user/repo/compare/v1.8.5...v1.8.6
[1.8.5]: https://github.com/user/repo/compare/v1.8.4:...v1.8.5
[1.8.4]: https://github.com/user/repo/compare/v1.8.3...v1.8.4
[1.8.3]: https://github.com/user/repo/compare/v1.8.2...v1.8.3
[1.8.2]: https://github.com/user/repo/compare/v1.8.1...v1.8.2
[1.8.1]: https://github.com/user/repo/compare/v1.8.0...v1.8.1
[1.8.0]: https://github.com/user/repo/compare/v1.7.3...v1.8.0
[1.7.3]: https://github.com/user/repo/compare/v1.7.2...v1.7.3
[1.7.2]: https://github.com/user/repo/compare/v1.7.1...v1.7.2
[1.7.1]: https://github.com/user/repo/compare/v1.6.25...v1.7.1
[1.6.25]: https://github.com/user/repo/compare/v1.6.24...v1.6.25
[1.6.24]: https://github.com/user/repo/compare/v1.6.23...v1.6.24
[1.6.23]: https://github.com/user/repo/compare/v1.6.22...v1.6.23
[1.6.22]: https://github.com/user/repo/compare/v1.6.21...v1.6.22
[1.6.21]: https://github.com/user/repo/compare/v1.6.20...v1.6.21
[1.6.20]: https://github.com/user/repo/compare/v1.6.19...v1.6.20
[1.6.19]: https://github.com/user/repo/compare/v1.6.14...v1.6.19
[1.6.14]: https://github.com/user/repo/compare/v1.6.13...v1.6.14
[1.6.13]: https://github.com/user/repo/compare/v1.6.12...v1.6.13
[1.6.12]: https://github.com/user/repo/compare/v1.6.11...v1.6.12
[1.6.11]: https://github.com/user/repo/compare/v1.6.10...v1.6.11
[1.6.10]: https://github.com/user/repo/compare/v1.6.9...v1.6.10
[1.6.9]: https://github.com/user/repo/compare/v1.6.8...v1.6.9
[1.6.8]: https://github.com/user/repo/compare/v1.6.7...v1.6.8
[1.6.7]: https://github.com/user/repo/compare/v1.6.6...v1.6.7
[1.6.6]: https://github.com/user/repo/compare/v1.6.5...v1.6.6
[1.6.5]: https://github.com/user/repo/compare/v1.6.4...v1.6.5
[1.6.4]: https://github.com/user/repo/compare/v1.6.3...v1.6.4
[1.6.3]: https://github.com/user/repo/compare/v1.6.2...v1.6.3
[1.6.2]: https://github.com/user/repo/compare/v1.6.0...v1.6.2
[1.6.0]: https://github.com/user/repo/compare/v1.5.1...v1.6.0
[1.5.1]: https://github accuser/repo/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/user/repo/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/user/repo/compare/v1.3.2...v1.4.0
[1.3.2]: https://github.com/user/repo/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/user/repo/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/user/repo/compare/v1.2.9...v1.3.0
[1.2.9]: https://github.com/user/repo/compare/v1.2.8...v1.2.9
[1.2.8]: https://github.com/user/repo/compare/v1.2.7...v1.2.8
[1.2.7]: https://github.com/user/repo/compare/v1.2.6...v1.2.7
[1.2.6]: https://github.com/user/repo/compare/v1.2.5...v1.2.6
[1.2.5]: https://github.com/user/repo/compare/v1.2.4...v1.2.5
[1.2.4]: https://github.com/user/repo/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/user/repo/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/user/repo/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/user/repo/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/user/repo/compare/v1.1.2...v1.2.0
[1.1.2]: https://github.com/user/repo/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/user/repo/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/user/repo/compare/v1.0.3...v1.1.0
[1.0.3]: https://github.com/user/repo/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/user/repo/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/user/repo/releases/tag/v1.0.1
