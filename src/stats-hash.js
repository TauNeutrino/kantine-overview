const STORAGE_KEY_ANON = '_kstats_anon_id';

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
            anonUUID = crypto.randomUUID();
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
