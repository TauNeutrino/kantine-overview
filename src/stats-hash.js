const STORAGE_KEY_ANON = '_kstats_anon_id';

function generateUUID() {
    try {
        return crypto.randomUUID();
    } catch (_) {
        // Fallback for older browsers: crypto.getRandomValues is widely supported
        const arr = new Uint8Array(16);
        crypto.getRandomValues(arr);
        arr[6] = (arr[6] & 0x0f) | 0x40;
        arr[8] = (arr[8] & 0x3f) | 0x80;
        const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
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
    const data = identity + (GIST_SALT || '');
    const encoder = new TextEncoder();
    const buffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
