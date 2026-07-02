import { LS } from './constants.js';

export async function computeUserHash() {
    const currentUser = localStorage.getItem(LS.CURRENT_USER);
    if (!currentUser) return null;
    const encoder = new TextEncoder();
    const buffer = encoder.encode(currentUser);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
