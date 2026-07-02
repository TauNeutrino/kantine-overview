const STORAGE_KEY_ANON = '_kstats_anon_id';

function generateUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        try { return crypto.randomUUID(); } catch (_) {}
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        try {
            const arr = new Uint8Array(16);
            crypto.getRandomValues(arr);
            arr[6] = (arr[6] & 0x0f) | 0x40;
            arr[8] = (arr[8] & 0x3f) | 0x80;
            const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
            return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
        } catch (_) {}
    }
    // Math.random()-based fallback — works in every context
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

/**
 * Stable non-crypto hash (DJB2) — fallback when crypto.subtle is unavailable.
 * Sufficient for deduplication purposes; not cryptographically secure.
 */
function simpleHash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

async function digest(str) {
    try {
        const encoder = new TextEncoder();
        const buffer = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (_) {
        // crypto.subtle unavailable (e.g. restricted bookmarklet context) — use DJB2
        return simpleHash(str);
    }
}

/**
 * Stable user hash – does NOT change over time.
 * Used to count both daily and total unique users.
 * Based solely on the user's identity (username if logged in, or persistent random UUID).
 */
export async function computeUserHash(authToken, currentUser, GIST_SALT) {
    let identity;
    if (authToken && currentUser) {
        identity = currentUser;
    } else {
        let anonUUID = localStorage.getItem(STORAGE_KEY_ANON);
        if (!anonUUID) {
            anonUUID = generateUUID();
            localStorage.setItem(STORAGE_KEY_ANON, anonUUID);
        }
        identity = anonUUID;
    }
    return digest(identity + (GIST_SALT || ''));
}
