window.__kantine_load_start = Date.now();

import { injectUI } from './ui.js';
import { bindEvents } from './events.js';
import { updateAuthUI, cleanupExpiredFlags, loadMenuCache, isCacheFresh, loadMenuDataFromAPI, startPolling } from './actions.js';
import { checkForUpdates } from './ui_helpers.js';
import { authToken } from './state.js';
import { tracker } from './stats-tracker.js';
import { computeUserHash } from './stats-hash.js';
import { GIST_ID } from './constants.js';
import { langMode } from './state.js';

if (!window.__KANTINE_LOADED) {
    if (window.location.protocol === 'blob:' || (window.location.hostname !== 'web.bessa.app' && window.location.hostname !== '')) {
        window.location.href = 'https://web.bessa.app/knapp-kantine';
        // We throw an error to halt further execution of the script
        throw new Error('Redirecting to the correct domain...');
    }

    window.__KANTINE_LOADED = true;

    // Stats: baseline metrics
    tracker.increment('starts');
    tracker.set('version', '{{VERSION}}');
    tracker.set('hour', new Date().getHours());
    tracker.set('day', new Date().getDay());
    tracker.set('mobile', window.innerWidth < 768);
    tracker.set('lang', langMode);
    tracker.set('logged_in', !!authToken);
    
    const state = tracker.load();
    state.user_hash = computeUserHash();
    tracker.persist();

    const pending = tracker.getPendingFlush();
    if (pending) {
        tracker.flushToGist(pending.date, pending.daily, state.user_hash || pending.user_hash)
            .catch(e => console.warn('Flush failed:', e));
    }

    injectUI();
    bindEvents();
    updateAuthUI();
    cleanupExpiredFlags();

    const hadCache = loadMenuCache();
    if (hadCache) {
        document.getElementById('loading').classList.add('hidden');
        tracker.set('load_time_ms', Date.now() - window.__kantine_load_start);
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

window.addEventListener('beforeunload', () => {
    const startMs = tracker.load().session?.start_ms;
    if (startMs) {
        tracker.set('session_duration_s', Math.round((Date.now() - startMs) / 1000));
    }
});
