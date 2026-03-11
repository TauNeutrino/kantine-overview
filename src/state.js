import { getISOWeek } from './utils.js';
import { LS } from './constants.js';

export let allWeeks = [];
export let currentWeekNumber = getISOWeek(new Date());
export let currentYear = new Date().getFullYear();
export let displayMode = 'this-week';
export let authToken = localStorage.getItem(LS.AUTH_TOKEN);
export let currentUser = localStorage.getItem(LS.CURRENT_USER);
export let orderMap = new Map();
export let userFlags = new Set(JSON.parse(localStorage.getItem(LS.FLAGS) || '[]'));
export let pollIntervalId = null;
export let langMode = localStorage.getItem(LS.LANG) || 'de';
export let highlightTags = JSON.parse(localStorage.getItem(LS.HIGHLIGHT_TAGS) || '[]');

export function setAllWeeks(weeks) { allWeeks = weeks; }
export function setCurrentWeekNumber(week) { currentWeekNumber = week; }
export function setCurrentYear(year) { currentYear = year; }
export function setAuthToken(token) { authToken = token; }
export function setCurrentUser(user) { currentUser = user; }
export function setOrderMap(map) { orderMap = map; }
export function setUserFlags(flags) { userFlags = flags; }
export function setPollIntervalId(id) { pollIntervalId = id; }
export function setHighlightTags(tags) { highlightTags = tags; }

/** Only 'this-week' and 'next-week' are valid display modes. */
export function setDisplayMode(mode) {
    if (mode !== 'this-week' && mode !== 'next-week') {
        console.warn(`[state] Invalid displayMode: "${mode}". Ignoring.`);
        return;
    }
    displayMode = mode;
}

/** Only 'de', 'en', and 'all' are valid language modes. */
export function setLangMode(lang) {
    if (!['de', 'en', 'all'].includes(lang)) {
        console.warn(`[state] Invalid langMode: "${lang}". Ignoring.`);
        return;
    }
    langMode = lang;
}
