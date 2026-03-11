/**
 * Application-wide constants.
 * All API endpoints, IDs and timing parameters are centralized here
 * to make changes easy and avoid magic numbers scattered across the codebase.
 */

/** Base URL for the Bessa REST API (v1). */
export const API_BASE = 'https://api.bessa.app/v1';

/** Guest token for unauthenticated API calls (e.g. browsing the menu). */
export const GUEST_TOKEN = 'c3418725e95a9f90e3645cbc846b4d67c7c66131';

/** The client version injected into every API request header. */
export const CLIENT_VERSION = 'v1.6.19';

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

/** Base URL for htmlpreview-hosted installer pages. */
export const INSTALLER_BASE = `https://htmlpreview.github.io/?https://github.com/${GITHUB_REPO}/blob`;

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
    HISTORY_CACHE:           'kantine_history_cache',
    HIGHLIGHT_TAGS:          'kantine_highlightTags',
    LAST_UPDATED:            'kantine_last_updated',
    VERSION_CACHE:           'kantine_version_cache',
    DEV_MODE:                'kantine_dev_mode',
};
