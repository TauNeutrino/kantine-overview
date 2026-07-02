import { LS } from './constants.js';

function djb2(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h) + str.charCodeAt(i);
        h = h & h;
    }
    return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Stable user hash based on the persistent `kantine_currentUser` identity.
 * Returns null when no user is logged in — only authenticated users are counted
 * as unique, since the session auth-token rotates and would break uniqueness otherwise.
 */
export function computeUserHash() {
    const currentUser = localStorage.getItem(LS.CURRENT_USER);
    if (!currentUser) return null;
    return djb2(currentUser);
}
