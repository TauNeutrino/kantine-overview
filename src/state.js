import { getISOWeek } from './utils.js';

export let allWeeks = [];
export let currentWeekNumber = getISOWeek(new Date());
export let currentYear = new Date().getFullYear();
export let displayMode = 'this-week';
export let authToken = localStorage.getItem('kantine_authToken');
export let currentUser = localStorage.getItem('kantine_currentUser');
export let orderMap = new Map();
export let userFlags = new Set(JSON.parse(localStorage.getItem('kantine_flags') || '[]'));
export let pollIntervalId = null;
export let langMode = localStorage.getItem('kantine_lang') || 'de';
export let highlightTags = JSON.parse(localStorage.getItem('kantine_highlightTags') || '[]');

export function setAllWeeks(weeks) { allWeeks = weeks; }
export function setCurrentWeekNumber(week) { currentWeekNumber = week; }
export function setCurrentYear(year) { currentYear = year; }
export function setDisplayMode(mode) { displayMode = mode; }
export function setAuthToken(token) { authToken = token; }
export function setCurrentUser(user) { currentUser = user; }
export function setOrderMap(map) { orderMap = map; }
export function setUserFlags(flags) { userFlags = flags; }
export function setPollIntervalId(id) { pollIntervalId = id; }
export function setLangMode(lang) { langMode = lang; }
export function setHighlightTags(tags) { highlightTags = tags; }
