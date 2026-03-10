import { API_BASE, GUEST_TOKEN, CLIENT_VERSION } from './constants.js';

export function apiHeaders(token) {
    return {
        'Authorization': `Token ${token || GUEST_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Client-Version': CLIENT_VERSION
    };
}

export function githubHeaders() {
    return { 'Accept': 'application/vnd.github.v3+json' };
}
