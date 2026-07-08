import { langMode } from './state.js';

export function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

export function getWeekYear(d) {
    const date = new Date(d.getTime());
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    return date.getFullYear();
}

/**
 * Translates an English day name to the UI language.
 * Returns German by default; returns English when langMode is 'en'.
 * @param {string} englishDay - Day name in English (e.g. 'Monday')
 * @returns {string} Translated day name
 */
export function translateDay(englishDay) {
    if (langMode === 'en') return englishDay;
    const map = { Monday: 'Montag', Tuesday: 'Dienstag', Wednesday: 'Mittwoch', Thursday: 'Donnerstag', Friday: 'Freitag', Saturday: 'Samstag', Sunday: 'Sonntag' };
    return map[englishDay] || englishDay;
}

export function escapeHtml(text) {
    if (!text) return '';
    return text.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function isNewer(remote, local) {
    if (!remote || !local) return false;
    if (remote === local) return false;

    let rStart = remote.charCodeAt(0) === 118 /* 'v' */ ? 1 : 0;
    let lStart = local.charCodeAt(0) === 118 /* 'v' */ ? 1 : 0;

    const rParts = remote.substring(rStart).split('.');
    const lParts = local.substring(lStart).split('.');

    const len = Math.max(rParts.length, lParts.length);
    for (let i = 0; i < len; i++) {
        const rVal = parseInt(rParts[i] || '0', 10);
        const lVal = parseInt(lParts[i] || '0', 10);
        if (rVal > lVal) return true;
        if (rVal < lVal) return false;
    }
    return false;
}

export function getRelativeTime(date) {
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'gerade eben';
    if (diffMin === 1) return 'vor 1 min.';
    if (diffMin < 60) return `vor ${diffMin} min.`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH === 1) return 'vor 1 Std.';
    return `vor ${diffH} Std.`;
}

// === Language Filter (FR-100) ===
import { splitLanguage } from './lang/splitter.js';

export { splitLanguage };

export function getLocalizedText(text) {
    if (langMode === 'all') return text || '';
    const split = splitLanguage(text);
    // Low-confidence splits: show raw source text instead of a guessed translation
    if (split.label === 'low' || split.label === 'fallback') {
        return split.raw || text || '';
    }
    if (langMode === 'en') return split.en || split.raw;
    return split.de || split.raw;
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
