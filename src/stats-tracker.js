const STORAGE_KEY = '_kstats_state';

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
}

export const tracker = new StatsTracker();
