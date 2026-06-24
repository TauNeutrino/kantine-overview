/**
 * API header factories for the Bessa REST API and GitHub API.
 * All fetch calls in the app route through these helpers to ensure
 * consistent auth and versioning headers.
 */
import { CLIENT_VERSION } from './constants.js';

/**
 * Returns request headers for the Bessa REST API.
 * @param {string|null} token - Auth token.
 * @returns {Object} HTTP headers for fetch()
 */
export function apiHeaders(token) {
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Client-Version': CLIENT_VERSION
    };
    if (token) {
        headers['Authorization'] = `Token ${token}`;
    }
    return headers;
}

/**
 * Returns request headers for the GitHub REST API v3.
 * Used for version checks and release listing.
 * Pass optional etag to enable conditional requests (If-None-Match),
 * which return 304 Not Modified (no rate limit cost) when content is unchanged.
 * @param {string|null} [etag] - Stored ETag for conditional request
 * @returns {Object} HTTP headers for fetch()
 */
export function githubHeaders(etag) {
    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (etag) {
        headers['If-None-Match'] = etag;
    }
    return headers;
}
