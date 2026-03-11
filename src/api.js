/**
 * API header factories for the Bessa REST API and GitHub API.
 * All fetch calls in the app route through these helpers to ensure
 * consistent auth and versioning headers.
 */
import { API_BASE, GUEST_TOKEN, CLIENT_VERSION } from './constants.js';

/**
 * Returns request headers for the Bessa REST API.
 * @param {string|null} token - Auth token; falls back to GUEST_TOKEN if absent.
 * @returns {Object} HTTP headers for fetch()
 */
export function apiHeaders(token) {
    return {
        'Authorization': `Token ${token || GUEST_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Client-Version': CLIENT_VERSION
    };
}

/**
 * Returns request headers for the GitHub REST API v3.
 * Used for version checks and release listing.
 * @returns {Object} HTTP headers for fetch()
 */
export function githubHeaders() {
    return { 'Accept': 'application/vnd.github.v3+json' };
}
