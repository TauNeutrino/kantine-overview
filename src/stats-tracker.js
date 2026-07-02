const STORAGE_KEY = '_kstats_state';
const GIST_ID_KEY = '_kstats_gist_id';

import { GIST_ID, GIST_PAT } from './constants.js';

class StatsTracker {
    constructor() {
        this._state = null;
    }

    _getToday() {
        return new Date().toISOString().split('T')[0];
    }

    _freshState(today) {
        return {
            date: today,
            daily: {},
            user_hash: null,
            session: { start_ms: Date.now() },
            has_flushed: false,
            pendingFlush: null
        };
    }

    load() {
        const raw = localStorage.getItem(STORAGE_KEY);
        const today = this._getToday();

        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                this._state = {
                    date: parsed.date || today,
                    daily: parsed.daily || {},
                    user_hash: parsed.user_hash || null,
                    session: parsed.session || { start_ms: Date.now() },
                    has_flushed: parsed.has_flushed || false,
                    pendingFlush: parsed.pendingFlush || null
                };
            } catch (e) {
                this._state = this._freshState(today);
            }
        } else {
            this._state = this._freshState(today);
        }

        if (this._state.date !== today) {
            this._state.pendingFlush = {
                date: this._state.date,
                daily: { ...this._state.daily },
                user_hash: this._state.user_hash
            };
            this._state.daily = {};
            this._state.session = { start_ms: Date.now() };
            this._state.date = today;
            this._state.has_flushed = false;
            this.persist();
        }

        return this._state;
    }

    persist() {
        if (!this._state) this.load();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
    }

    increment(key) {
        this.load();
        if (!this._state.daily[key]) this._state.daily[key] = 0;
        this._state.daily[key]++;
        this.persist();
    }

    set(key, value) {
        this.load();
        this._state.daily[key] = value;
        this.persist();
    }

    reset() {
        this._state = this._freshState(this._getToday());
        localStorage.removeItem(STORAGE_KEY);
    }

    getLocalStats() {
        this.load();
        return { ...this._state.daily };
    }

    getPendingFlush() {
        this.load();
        return this._state.pendingFlush ? { ...this._state.pendingFlush } : null;
    }

    markFlushed() {
        this.load();
        this._state.has_flushed = true;
        this._state.pendingFlush = null;
        this.persist();
    }

    _resolveGistId() {
        return localStorage.getItem(GIST_ID_KEY) || GIST_ID;
    }

    _saveGistId(id) {
        localStorage.setItem(GIST_ID_KEY, id);
    }

    async flushToGist(pendingDate, pendingDaily, pendingUserHash) {
        try {
            let gistId = this._resolveGistId();
            let resp = await fetch(`https://api.github.com/gists/${gistId}`, {
                headers: { 'Authorization': `token ${GIST_PAT}`, 'Accept': 'application/vnd.github.v3+json' }
            });

            let data;
            if (resp.status === 404 && !localStorage.getItem(GIST_ID_KEY)) {
                // Gist doesn't exist and we haven't saved an ID yet — auto-create
                console.log('[StatsTracker] Gist not found, creating a new secret Gist...');
                const createResp = await fetch('https://api.github.com/gists', {
                    method: 'POST',
                    headers: { 'Authorization': `token ${GIST_PAT}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        description: 'Kantine Usage Stats',
                        public: false,
                        files: { 'stats.json': { content: '{}' } }
                    })
                });
                if (!createResp.ok) throw new Error(`Gist CREATE failed: ${createResp.status}`);
                const created = await createResp.json();
                gistId = created.id;
                this._saveGistId(gistId);
                data = {};
                console.log('[StatsTracker] Created Gist:', gistId);
            } else if (!resp.ok) {
                throw new Error(`Gist GET failed: ${resp.status}`);
            } else {
                const gist = await resp.json();
                data = JSON.parse(gist.files['stats.json'].content);
            }

            // Track daily unique users via stable user hash
            const dayKey = pendingDate;
            if (!data.daily) data.daily = {};
            if (!data.daily[dayKey]) data.daily[dayKey] = {};
            const day = data.daily[dayKey];
            if (!day.seen_hashes) day.seen_hashes = [];
            if (!day.unique_today) day.unique_today = 0;

            if (pendingUserHash && !day.seen_hashes.includes(pendingUserHash)) {
                day.seen_hashes.push(pendingUserHash);
                day.unique_today++;
            }

            for (const [key, val] of Object.entries(pendingDaily)) {
                if (typeof val === 'number') {
                    day[key] = (day[key] || 0) + val;
                }
            }

            // Track all-time unique users
            if (pendingUserHash) {
                if (!data.all_time) data.all_time = {};
                if (!data.all_time.unique_hashes) data.all_time.unique_hashes = [];
                if (!data.all_time.unique_users) data.all_time.unique_users = 0;
                if (!data.all_time.unique_hashes.includes(pendingUserHash)) {
                    data.all_time.unique_hashes.push(pendingUserHash);
                    data.all_time.unique_users++;
                }
            }

            const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
            for (const dk of Object.keys(data.daily)) {
                if (dk < thirtyDaysAgo && data.daily[dk].seen_hashes) {
                    delete data.daily[dk].seen_hashes;
                }
            }

            data.last_updated = new Date().toISOString();
            const patchResp = await fetch(`https://api.github.com/gists/${gistId}`, {
                method: 'PATCH',
                headers: { 'Authorization': `token ${GIST_PAT}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: { 'stats.json': { content: JSON.stringify(data, null, 2) } } })
            });
            if (!patchResp.ok) throw new Error(`Gist PATCH failed: ${patchResp.status}`);

            this.markFlushed();
        } catch (e) {
            console.warn('[StatsTracker] Flush failed:', e.message);
        }
    }
}

export const tracker = new StatsTracker();
