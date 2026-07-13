window.__kantine_load_start = Date.now();

import { injectUI } from './ui.js';
import { bindEvents } from './events.js';
import { updateAuthUI, cleanupExpiredFlags, loadMenuCache, isCacheFresh, loadMenuDataFromAPI, startPolling } from './actions.js';
import { checkForUpdates } from './ui_helpers.js';
import { authToken } from './state.js';
import { tracker } from './stats-tracker.js';
import { computeUserHash } from './stats-hash.js';
import { GIST_ID, COMMIT_HASH, BUNDLED_CSS } from './constants.js';
import { langMode } from './state.js';

if (!window.__KANTINE_LOADED) {
    if (window.location.protocol === 'blob:' || (window.location.hostname !== 'web.bessa.app' && window.location.hostname !== '')) {
        window.location.href = 'https://web.bessa.app/knapp-kantine';
        // We throw an error to halt further execution of the script
        throw new Error('Redirecting to the correct domain...');
    }

    window.__KANTINE_LOADED = true;

    // Inject/replace CSS — the install-time style had id="kantine-style";
    // the bundle replaces it with the bundled (possibly newer) CSS.
    (function(){
      var old = document.getElementById('kantine-style');
      if (old) old.remove();
      var s = document.createElement('style');
      s.id = 'kantine-style';
      s.textContent = BUNDLED_CSS;
      document.head.appendChild(s);
    })();

    // Stats: baseline metrics
    tracker.increment('starts');
    tracker.increment('session_count');
    tracker.incrementCategory('version', '{{VERSION}}');
    tracker.set('version_commit_hash', COMMIT_HASH);
    tracker.increment('hour_' + new Date().getHours());
    tracker.incrementCategory('mobile', window.innerWidth < 768);
    tracker.incrementCategory('lang', langMode);
    tracker.incrementCategory('logged_in', !!authToken);
    
    (async () => {
        try {
            const newHash = await computeUserHash();
            tracker.setUserHash(newHash);
        } catch (e) {
            console.warn('[Stats] computeUserHash failed:', e.message, e.stack);
            tracker.setUserHashError();
        }
        let pending = tracker.getPendingFlush();
        while (pending) {
            const current = tracker.load();
            await tracker.flushToGist(pending.date, pending.daily, current.user_hash || pending.user_hash);
            pending = tracker.getPendingFlush();
        }
    })();

    injectUI();
    bindEvents();
    updateAuthUI();
    cleanupExpiredFlags();

    const hadCache = loadMenuCache();
    if (hadCache) {
        document.getElementById('loading').classList.add('hidden');
        const loadMs = Date.now() - window.__kantine_load_start;
        tracker.incrementValue('load_time_sum', loadMs);
        tracker.increment('load_time_count');
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
        const dur = Math.round((Date.now() - startMs) / 1000);
        tracker.incrementValue('session_duration_sum', dur);
        tracker.increment('session_duration_count');
    }
});
