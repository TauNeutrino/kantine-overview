const STORAGE_KEY = '_kstats_state';

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
            hash: null,
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
                    hash: parsed.hash || null,
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
                hash: this._state.hash
            };
            this._state.daily = {};
            this._state.hash = null;
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

    async flushToGist(pendingDate, pendingDaily, pendingHash) {
        try {
            const resp = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
                headers: { 'Authorization': `token ${GIST_PAT}`, 'Accept': 'application/vnd.github.v3+json' }
            });
            if (!resp.ok) throw new Error(`Gist GET failed: ${resp.status}`);
            const gist = await resp.json();
            let data = JSON.parse(gist.files['stats.json'].content);

            const dayKey = pendingDate;
            if (!data.daily[dayKey]) data.daily[dayKey] = { seen_hashes: [], unique_today: 0 };
            const day = data.daily[dayKey];

            if (!day.seen_hashes.includes(pendingHash)) {
                day.seen_hashes.push(pendingHash);
                day.unique_today++;
            }

            for (const [key, val] of Object.entries(pendingDaily)) {
                if (typeof val === 'number') {
                    day[key] = (day[key] || 0) + val;
                }
            }

            const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
            for (const dk of Object.keys(data.daily)) {
                if (dk < thirtyDaysAgo && data.daily[dk].seen_hashes) {
                    delete data.daily[dk].seen_hashes;
                }
            }

            data.last_updated = new Date().toISOString();
            const patchResp = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
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
