const STORAGE_KEY_ANON = '_kstats_anon_id';

export async function computeDailyHash(authToken, currentUser, GIST_SALT) {
    const today = new Date().toISOString().split('T')[0];
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
    const data = identity + today + (GIST_SALT || '');
    const encoder = new TextEncoder();
    const buffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
