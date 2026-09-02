/**
 * Application-wide constants.
 * All API endpoints, IDs and timing parameters are centralized here
 * to make changes easy and avoid magic numbers scattered across the codebase.
 */

/** Base URL for the Bessa REST API (v1). */
export const API_BASE = 'https://api.bessa.app/v1';

/** The client version injected into every API request header. */
export const CLIENT_VERSION = '{{VERSION}}';
export const COMMIT_HASH = '{{COMMIT_HASH}}';

/** CSS content injected at build time; the install-time #kantine-style is replaced by the bundle. */
export const BUNDLED_CSS = '{{CSS}}';

/** Bessa venue ID for Knapp-Kantine. */
export const VENUE_ID = 591;

/** Bessa menu ID for the weekly lunch menu. */
export const MENU_ID = 7;

/** Polling interval for flagged-menu availability checks (5 minutes). */
export const POLL_INTERVAL_MS = 5 * 60 * 1000;

/** GitHub repository identifier for update checks and release links. */
export const GITHUB_REPO = 'TauNeutrino/kantine-overview';

/** GitHub REST API base URL for this repository. */
export const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}`;

/** Base URL for raw GitHub content (used to fetch installer HTML as blob). */
export const RAW_INSTALLER_BASE = `https://raw.githubusercontent.com/${GITHUB_REPO}/refs/tags`;

/** Base URL for GitHub file browser link ("-> Github" button). */
export const GITHUB_FILE_BASE = `https://github.com/${GITHUB_REPO}/blob`;

/**
 * Centralized localStorage key registry.
 * Always use these constants instead of raw strings to avoid typos and ease renaming.
 */
export const LS = {
    AUTH_TOKEN:              'kantine_authToken',
    CURRENT_USER:            'kantine_currentUser',
    FIRST_NAME:              'kantine_firstName',
    LAST_NAME:               'kantine_lastName',
    LANG:                    'kantine_lang',
    FLAGS:                   'kantine_flags',
    FLAGGED_LAST_CHECKED:    'kantine_flagged_items_last_checked',
    LAST_CHECKED:            'kantine_last_checked',
    MENU_CACHE:              'kantine_menuCache',
    MENU_CACHE_TS:           'kantine_menuCacheTs',
    DISH_IMAGE_CACHE:        'kantine_dishImageCache',
    HISTORY_CACHE:           'kantine_history_cache',
    HIGHLIGHT_TAGS:          'kantine_highlightTags',
    LAST_UPDATED:            'kantine_last_updated',
    VERSION_CACHE:           'kantine_version_cache',
    VERSION_ETAG:            'kantine_version_etag',
    DEV_MODE:                'kantine_dev_mode',
    STATS_STATE:             '_kstats_state',
    BOOTLOADER_VERSION_KEY:  '_k_boot_ver',
};

/** Minimum bootloader version that has the domain guard fix (v2.0.5). */
export const MIN_BOOTLOADER_VERSION = 'v2.0.5';

/** Dish image search: hover-dwell popup timing, keyless proxy chain and Openverse fallback. */
export const DISH_IMAGE_HOVER_MS = 500;
export const DISH_IMAGE_CAROUSEL_INTERVAL_MS = 3000;
export const DISH_IMAGE_FETCH_TIMEOUT_MS = 10000;
export const DISH_IMAGE_MAX_RESULTS = 5;
export const DISH_IMAGE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Wikipedia article summary (lead image) — direct fetch, CORS-enabled, no proxy needed. */
export const DISH_IMAGE_WIKIPEDIA_URL = 'https://de.wikipedia.org/api/rest_v1/page/summary/{q}';
/** Wikimedia Commons file search (thumburl per hit) — direct fetch, CORS via origin=*, no proxy needed. */
export const DISH_IMAGE_COMMONS_URL = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url&iiurlwidth=480&gsrsearch={q}';
export const DISH_IMAGE_GOOGLE_SCRAPE_URL = 'https://www.google.com/search?q={q}&tbm=isch&hl={hl}&gl=at&ijn=0';
export const DISH_IMAGE_OPENVERSE_URL = 'https://api.openverse.org/v1/images/?q={q}&page_size=5';
export const DISH_IMAGE_PROXY_CHAIN = [{ name: 'allorigins-raw', template: 'https://api.allorigins.win/raw?url={url}' }, { name: 'codetabs', template: 'https://api.codetabs.com/v1/proxy?quest={url}' }, { name: 'allorigins-get', template: 'https://api.allorigins.win/get?url={url}' }];
export const DISH_IMAGE_GOOGLE_TAB_URL = 'https://www.google.com/search?q={q}&udm=2';

export const GIST_ID = '{{GIST_ID}}';
export const GIST_SALT = '{{GIST_SALT}}';
export const GIST_PAT = '{{GIST_PAT}}';

/** SHA-256 (UTF-8, lowercase hex) of the password required to enable Dev-Mode. */
export const DEV_MODE_PW_HASH = '1d79c4226fdd41df94698643b006eaada305d85871d80ca75fb0bf218ab189f4';
