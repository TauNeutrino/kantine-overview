import { injectUI } from './ui.js';
import { bindEvents } from './events.js';
import { updateAuthUI, cleanupExpiredFlags, loadMenuCache, isCacheFresh, loadMenuDataFromAPI, startPolling } from './actions.js';
import { checkForUpdates } from './ui_helpers.js';
import { authToken } from './state.js';

if (window.__KANTINE_LOADED) {
    console.log("Kantine Wrapper already loaded.");
} else {
    window.__KANTINE_LOADED = true;

    injectUI();
    bindEvents();
    updateAuthUI();
    cleanupExpiredFlags();

    const hadCache = loadMenuCache();
    if (hadCache) {
        document.getElementById('loading').classList.add('hidden');
        if (!isCacheFresh()) {
            console.log('Cache stale or incomplete – refreshing from API');
            loadMenuDataFromAPI();
        } else {
            console.log('Cache fresh & complete – skipping API refresh');
        }
    } else {
        loadMenuDataFromAPI();
    }

    if (authToken) {
        startPolling();
    }

    checkForUpdates();
    setInterval(checkForUpdates, 60 * 60 * 1000);

    console.log('Kantine Wrapper loaded ✅');
}
