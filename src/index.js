import { injectUI } from './ui.js';
import { bindEvents } from './events.js';
import { updateAuthUI, cleanupExpiredFlags, loadMenuCache, isCacheFresh, loadMenuDataFromAPI, startPolling } from './actions.js';
import { checkForUpdates } from './ui_helpers.js';
import { authToken } from './state.js';

if (!window.__KANTINE_LOADED) {
    if (window.location.hostname !== 'web.bessa.app' && window.location.hostname !== '') {
        window.location.href = 'https://web.bessa.app/knapp-kantine';
        // We throw an error to halt further execution of the script
        throw new Error('Redirecting to the correct domain...');
    }

    window.__KANTINE_LOADED = true;

    injectUI();
    bindEvents();
    updateAuthUI();
    cleanupExpiredFlags();

    const hadCache = loadMenuCache();
    if (hadCache) {
        document.getElementById('loading').classList.add('hidden');
        if (!isCacheFresh()) {
            loadMenuDataFromAPI();
        }
    } else {
        loadMenuDataFromAPI();
    }

    if (authToken) {
        startPolling();
    }

    checkForUpdates();
    setInterval(checkForUpdates, 60 * 60 * 1000);
}
