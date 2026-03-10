import { authToken, currentUser, orderMap, userFlags, pollIntervalId, highlightTags, allWeeks, currentWeekNumber, currentYear, displayMode, langMode, setAuthToken, setCurrentUser, setOrderMap, setUserFlags, setPollIntervalId, setHighlightTags, setAllWeeks, setCurrentWeekNumber, setCurrentYear } from './state.js';
import { getISOWeek, getWeekYear, translateDay, escapeHtml, getRelativeTime, isNewer } from './utils.js';
import { API_BASE, GUEST_TOKEN, VENUE_ID, MENU_ID, POLL_INTERVAL_MS, GITHUB_API, INSTALLER_BASE, CLIENT_VERSION } from './constants.js';
import { apiHeaders, githubHeaders } from './api.js';
import { renderVisibleWeeks, updateNextWeekBadge, updateAlarmBell } from './ui_helpers.js';

let fullOrderHistoryCache = null;

export function updateAuthUI() {
    if (!authToken) {
        try {
            const akita = localStorage.getItem('AkitaStores');
            if (akita) {
                const parsed = JSON.parse(akita);
                if (parsed.auth && parsed.auth.token) {
                    console.log('Found existing Bessa session!');
                    setAuthToken(parsed.auth.token);
                    localStorage.setItem('kantine_authToken', parsed.auth.token);

                    if (parsed.auth.user) {
                        setCurrentUser(parsed.auth.user.id || 'unknown');
                        localStorage.setItem('kantine_currentUser', parsed.auth.user.id || 'unknown');
                        if (parsed.auth.user.firstName) localStorage.setItem('kantine_firstName', parsed.auth.user.firstName);
                        if (parsed.auth.user.lastName) localStorage.setItem('kantine_lastName', parsed.auth.user.lastName);
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to parse AkitaStores:', e);
        }
    }

    setAuthToken(localStorage.getItem('kantine_authToken'));
    setCurrentUser(localStorage.getItem('kantine_currentUser'));
    const firstName = localStorage.getItem('kantine_firstName');
    const btnLoginOpen = document.getElementById('btn-login-open');
    const userInfo = document.getElementById('user-info');
    const userIdDisplay = document.getElementById('user-id-display');

    if (authToken) {
        btnLoginOpen.classList.add('hidden');
        userInfo.classList.remove('hidden');
        userIdDisplay.textContent = firstName || (currentUser ? `User ${currentUser}` : 'Angemeldet');
        fetchOrders();
    } else {
        btnLoginOpen.classList.remove('hidden');
        userInfo.classList.add('hidden');
        userIdDisplay.textContent = '';
    }

    renderVisibleWeeks();
}

export async function fetchOrders() {
    if (!authToken) return;
    try {
        const response = await fetch(`${API_BASE}/user/orders/?venue=${VENUE_ID}&ordering=-created&limit=50`, {
            headers: apiHeaders(authToken)
        });
        const data = await response.json();

        if (response.ok) {
            const newOrderMap = new Map();
            const results = data.results || [];

            for (const order of results) {
                if (order.order_state === 9) continue;
                const orderDate = order.date.split('T')[0];

                for (const item of (order.items || [])) {
                    const key = `${orderDate}_${item.article}`;
                    if (!newOrderMap.has(key)) newOrderMap.set(key, []);
                    newOrderMap.get(key).push(order.id);
                }
            }
            setOrderMap(newOrderMap);
            console.log(`Fetched ${results.length} orders, mapped active ones.`);
            renderVisibleWeeks();
            updateNextWeekBadge();
        }
    } catch (error) {
        console.error('Error fetching orders:', error);
    }
}

export async function fetchFullOrderHistory() {
    const historyLoading = document.getElementById('history-loading');
    const historyContent = document.getElementById('history-content');
    const progressFill = document.getElementById('history-progress-fill');
    const progressText = document.getElementById('history-progress-text');

    let localCache = [];
    if (fullOrderHistoryCache) {
        localCache = fullOrderHistoryCache;
    } else {
        const ls = localStorage.getItem('kantine_history_cache');
        if (ls) {
            try {
                localCache = JSON.parse(ls);
                fullOrderHistoryCache = localCache;
            } catch (e) {
                console.warn('History cache parse error', e);
            }
        }
    }

    if (localCache.length > 0) {
        renderHistory(localCache);
    }

    if (!authToken) return;

    if (localCache.length === 0) {
        historyContent.innerHTML = '';
        historyLoading.classList.remove('hidden');
    }

    progressFill.style.width = '0%';
    progressText.textContent = localCache.length > 0 ? 'Suche nach neuen Bestellungen...' : 'Lade Bestellhistorie...';
    if (localCache.length > 0) historyLoading.classList.remove('hidden');

    let nextUrl = localCache.length > 0
        ? `${API_BASE}/user/orders/?venue=${VENUE_ID}&ordering=-created&limit=5`
        : `${API_BASE}/user/orders/?venue=${VENUE_ID}&ordering=-created&limit=50`;
    let fetchedOrders = [];
    let totalCount = 0;
    let requiresFullFetch = localCache.length === 0;
    let deltaComplete = false;

    try {
        while (nextUrl && !deltaComplete) {
            const response = await fetch(nextUrl, { headers: apiHeaders(authToken) });
            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

            const data = await response.json();

            if (data.count && totalCount === 0) {
                totalCount = data.count;
            }

            const results = data.results || [];

            for (const order of results) {
                const existingOrderIndex = localCache.findIndex(cached => cached.id === order.id);

                if (!requiresFullFetch && existingOrderIndex !== -1) {
                    const existingOrder = localCache[existingOrderIndex];
                    if (existingOrder.updated === order.updated && existingOrder.order_state === order.order_state) {
                        deltaComplete = true;
                        break;
                    }
                }
                fetchedOrders.push(order);
            }

            if (!deltaComplete && requiresFullFetch) {
                if (totalCount > 0) {
                    const pct = Math.round((fetchedOrders.length / totalCount) * 100);
                    progressFill.style.width = `${pct}%`;
                    progressText.textContent = `Lade Bestellung ${fetchedOrders.length} von ${totalCount}...`;
                } else {
                    progressText.textContent = `Lade Bestellung ${fetchedOrders.length}...`;
                }
            } else if (!deltaComplete) {
                progressText.textContent = `${fetchedOrders.length} neue/geänderte Bestellungen gefunden...`;
            }

            nextUrl = deltaComplete ? null : data.next;
        }

        if (fetchedOrders.length > 0) {
            const cacheMap = new Map(localCache.map(o => [o.id, o]));
            for (const order of fetchedOrders) {
                cacheMap.set(order.id, order);
            }
            const mergedOrders = Array.from(cacheMap.values());
            mergedOrders.sort((a, b) => new Date(b.created) - new Date(a.created));

            fullOrderHistoryCache = mergedOrders;
            try {
                localStorage.setItem('kantine_history_cache', JSON.stringify(mergedOrders));
            } catch (e) {
                console.warn('History cache write error', e);
            }
            renderHistory(fullOrderHistoryCache);
        }
    } catch (error) {
        console.error('Error in history sync:', error);
        if (localCache.length === 0) {
            historyContent.innerHTML = `<p style="color:var(--error-color);text-align:center;">Fehler beim Laden der Historie.</p>`;
        } else {
            showToast('Hintergrund-Synchronisation fehlgeschlagen', 'error');
        }
    } finally {
        historyLoading.classList.add('hidden');
    }
}

export function renderHistory(orders) {
    const content = document.getElementById('history-content');
    if (!orders || orders.length === 0) {
        content.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:20px;">Keine Bestellungen gefunden.</p>';
        return;
    }

    const groups = {};

    orders.forEach(order => {
        const d = new Date(order.date);
        const y = d.getFullYear();
        const m = d.getMonth();
        const monthKey = `${y}-${m.toString().padStart(2, '0')}`;
        const monthName = d.toLocaleString('de-AT', { month: 'long' });

        const kw = getISOWeek(d);

        if (!groups[y]) {
            groups[y] = { year: y, months: {} };
        }
        if (!groups[y].months[monthKey]) {
            groups[y].months[monthKey] = { name: monthName, year: y, monthIndex: m, count: 0, total: 0, weeks: {} };
        }
        if (!groups[y].months[monthKey].weeks[kw]) {
            groups[y].months[monthKey].weeks[kw] = { label: `KW ${kw}`, items: [], count: 0, total: 0 };
        }

        const items = order.items || [];
        items.forEach(item => {
            const itemPrice = parseFloat(item.price || order.total || 0);
            groups[y].months[monthKey].weeks[kw].items.push({
                date: order.date,
                name: item.name || 'Menü',
                price: itemPrice,
                state: order.order_state
            });

            if (order.order_state !== 9) {
                groups[y].months[monthKey].weeks[kw].count++;
                groups[y].months[monthKey].weeks[kw].total += itemPrice;
                groups[y].months[monthKey].count++;
                groups[y].months[monthKey].total += itemPrice;
            }
        });
    });

    const sortedYears = Object.keys(groups).sort((a, b) => b - a);
    let html = '';

    sortedYears.forEach(yKey => {
        const yearGroup = groups[yKey];
        html += `<div class="history-year-group">
            <h2 class="history-year-header">${yearGroup.year}</h2>`;

        const sortedMonths = Object.keys(yearGroup.months).sort((a, b) => b.localeCompare(a));

        sortedMonths.forEach(mKey => {
            const monthGroup = yearGroup.months[mKey];

            html += `<div class="history-month-group">
                <div class="history-month-header" tabindex="0" role="button" aria-expanded="false" title="Klicken, um die Bestellungen für diesen Monat ein-/auszublenden">
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <span>${monthGroup.name}</span>
                        <div class="history-month-summary">
                            <span>${monthGroup.count} Bestellungen &bull; <strong>€${monthGroup.total.toFixed(2)}</strong></span>
                        </div>
                    </div>
                    <span class="material-icons-round">expand_more</span>
                </div>
                <div class="history-month-content">`;

            const sortedKWs = Object.keys(monthGroup.weeks).sort((a, b) => parseInt(b) - parseInt(a));

            sortedKWs.forEach(kw => {
                const week = monthGroup.weeks[kw];
                html += `<div class="history-week-group">
                    <div class="history-week-header">
                        <strong>${week.label}</strong>
                        <span>${week.count} Bestellungen &bull; <strong>€${week.total.toFixed(2)}</strong></span>
                    </div>`;

                week.items.forEach(item => {
                    const dateObj = new Date(item.date);
                    const dayStr = dateObj.toLocaleDateString('de-AT', { weekday: 'short', day: '2-digit', month: '2-digit' });

                    let statusBadge = '';
                    if (item.state === 9) {
                        statusBadge = '<span class="history-item-status">Storniert</span>';
                    } else if (item.state === 8) {
                        statusBadge = '<span class="history-item-status">Abgeschlossen</span>';
                    } else {
                        statusBadge = '<span class="history-item-status">Übertragen</span>';
                    }

                    html += `
                    <div class="history-item ${item.state === 9 ? 'history-item-cancelled' : ''}">
                        <div style="font-size: 0.85rem; color: var(--text-secondary);">${dayStr}</div>
                        <div class="history-item-details">
                            <span class="history-item-name">${escapeHtml(item.name)}</span>
                            <div>${statusBadge}</div>
                        </div>
                        <div class="history-item-price ${item.state === 9 ? 'history-item-price-cancelled' : ''}">€${item.price.toFixed(2)}</div>
                    </div>`;
                });
                html += `</div>`;
            });
            html += `</div></div>`;
        });
        html += `</div>`;
    });

    content.innerHTML = html;

    const monthHeaders = content.querySelectorAll('.history-month-header');
    monthHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const parentGroup = header.parentElement;
            const isOpen = parentGroup.classList.contains('open');

            if (isOpen) {
                parentGroup.classList.remove('open');
                header.setAttribute('aria-expanded', 'false');
            } else {
                parentGroup.classList.add('open');
                header.setAttribute('aria-expanded', 'true');
            }
        });
    });
}

export async function placeOrder(date, articleId, name, price, description) {
    if (!authToken) return;
    try {
        const userResp = await fetch(`${API_BASE}/auth/user/`, {
            headers: apiHeaders(authToken)
        });
        if (!userResp.ok) {
            showToast('Fehler: Benutzerdaten konnten nicht geladen werden', 'error');
            return;
        }
        const userData = await userResp.json();
        const now = new Date().toISOString();

        const orderPayload = {
            uuid: crypto.randomUUID(),
            created: now,
            updated: now,
            order_type: 7,
            items: [{
                article: articleId,
                course_group: null,
                modifiers: [],
                uuid: crypto.randomUUID(),
                name: name,
                description: description || '',
                price: String(parseFloat(price)),
                amount: 1,
                vat: '10.00',
                comment: ''
            }],
            table: null,
            total: parseFloat(price),
            tip: 0,
            currency: 'EUR',
            venue: VENUE_ID,
            states: [],
            order_state: 1,
            date: `${date}T10:30:00Z`,
            payment_method: 'payroll',
            customer: {
                first_name: userData.first_name,
                last_name: userData.last_name,
                email: userData.email,
                newsletter: false
            },
            preorder: true,
            delivery_fee: 0,
            cash_box_table_name: null,
            take_away: false
        };

        const response = await fetch(`${API_BASE}/user/orders/`, {
            method: 'POST',
            headers: apiHeaders(authToken),
            body: JSON.stringify(orderPayload)
        });

        if (response.ok || response.status === 201) {
            showToast(`Bestellt: ${name}`, 'success');
            fullOrderHistoryCache = null;
            await fetchOrders();
        } else {
            const data = await response.json();
            showToast(`Fehler: ${data.detail || data.non_field_errors?.[0] || 'Bestellung fehlgeschlagen'}`, 'error');
        }
    } catch (error) {
        console.error('Order error:', error);
        showToast('Netzwerkfehler bei Bestellung', 'error');
    }
}

export async function cancelOrder(date, articleId, name) {
    if (!authToken) return;
    const key = `${date}_${articleId}`;
    const orderIds = orderMap.get(key);
    if (!orderIds || orderIds.length === 0) return;

    const orderId = orderIds[orderIds.length - 1];
    try {
        const response = await fetch(`${API_BASE}/user/orders/${orderId}/cancel/`, {
            method: 'PATCH',
            headers: apiHeaders(authToken),
            body: JSON.stringify({})
        });

        if (response.ok) {
            showToast(`Storniert: ${name}`, 'success');
            fullOrderHistoryCache = null;
            await fetchOrders();
        } else {
            const data = await response.json();
            showToast(`Fehler: ${data.detail || 'Stornierung fehlgeschlagen'}`, 'error');
        }
    } catch (error) {
        console.error('Cancel error:', error);
        showToast('Netzwerkfehler bei Stornierung', 'error');
    }
}

export function saveFlags() {
    localStorage.setItem('kantine_flags', JSON.stringify([...userFlags]));
}

export async function refreshFlaggedItems() {
    if (userFlags.size === 0) return;
    const token = authToken || GUEST_TOKEN;
    const datesToFetch = new Set();

    for (const flagId of userFlags) {
        const [dateStr] = flagId.split('_');
        datesToFetch.add(dateStr);
    }

    let updated = false;
    for (const dateStr of datesToFetch) {
        try {
            const resp = await fetch(`${API_BASE}/venues/${VENUE_ID}/menu/${MENU_ID}/${dateStr}/`, {
                headers: apiHeaders(token)
            });
            if (!resp.ok) continue;
            const data = await resp.json();
            const menuGroups = data.results || [];
            let dayItems = [];
            for (const group of menuGroups) {
                if (group.items && Array.isArray(group.items)) {
                    dayItems = dayItems.concat(group.items);
                }
            }

            for (let week of allWeeks) {
                if (!week.days) continue;
                let dayObj = week.days.find(d => d.date === dateStr);
                if (dayObj) {
                    dayObj.items = dayItems.map(item => {
                        const isUnlimited = item.amount_tracking === false;
                        const hasStock = parseInt(item.available_amount) > 0;
                        return {
                            id: `${dateStr}_${item.id}`,
                            articleId: item.id,
                            name: item.name || 'Unknown',
                            description: item.description || '',
                            price: parseFloat(item.price) || 0,
                            available: isUnlimited || hasStock,
                            availableAmount: parseInt(item.available_amount) || 0,
                            amountTracking: item.amount_tracking !== false
                        };
                    });
                    updated = true;
                }
            }
        } catch (e) {
            console.error('Error refreshing flag date', dateStr, e);
        }
    }

    if (updated) {
        saveMenuCache();
        updateLastUpdatedTime(new Date().toISOString());
        updateAlarmBell();
        renderVisibleWeeks();
    }
}


export function toggleFlag(date, articleId, name, cutoff) {
    const id = `${date}_${articleId}`;
    let flagAdded = false;
    if (userFlags.has(id)) {
        userFlags.delete(id);
        showToast(`Flag entfernt für ${name}`, 'success');
    } else {
        userFlags.add(id);
        flagAdded = true;
        showToast(`Benachrichtigung aktiviert für ${name}`, 'success');
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
    saveFlags();
    updateAlarmBell();
    renderVisibleWeeks();

    if (flagAdded) {
        refreshFlaggedItems();
    }
}

export function cleanupExpiredFlags() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    let changed = false;

    for (const flagId of [...userFlags]) {
        const [dateStr] = flagId.split('_');

        let isExpired = false;

        if (dateStr < todayStr) {
            isExpired = true;
        } else if (dateStr === todayStr) {
            const cutoff = new Date(dateStr);
            cutoff.setHours(10, 0, 0, 0);
            if (now >= cutoff) {
                isExpired = true;
            }
        }

        if (isExpired) {
            userFlags.delete(flagId);
            changed = true;
        }
    }
    if (changed) saveFlags();
}

export function startPolling() {
    if (pollIntervalId) return;
    if (!authToken) return;
    setPollIntervalId(setInterval(() => pollFlaggedItems(), POLL_INTERVAL_MS));
    console.log('Polling started (every 5 min)');
}

export function stopPolling() {
    if (pollIntervalId) {
        clearInterval(pollIntervalId);
        setPollIntervalId(null);
        console.log('Polling stopped');
    }
}

export async function pollFlaggedItems() {
    if (userFlags.size === 0 || !authToken) return;
    console.log(`Polling ${userFlags.size} flagged items...`);

    for (const flagId of userFlags) {
        const [date, articleIdStr] = flagId.split('_');
        const articleId = parseInt(articleIdStr);

        try {
            const response = await fetch(`${API_BASE}/venues/${VENUE_ID}/menu/${MENU_ID}/${date}/`, {
                headers: apiHeaders(authToken)
            });
            if (!response.ok) continue;

            const data = await response.json();
            const groups = data.results || [];
            let foundItem = null;
            for (const group of groups) {
                if (group.items) {
                    foundItem = group.items.find(i => i.id === articleId || i.article === articleId);
                    if (foundItem) break;
                }
            }

            if (foundItem) {
                const isAvailable = (foundItem.amount_tracking === false) || (parseInt(foundItem.available_amount) > 0);
                if (isAvailable) {
                    const itemName = foundItem.name || 'Unbekannt';
                    showToast(`${itemName} ist jetzt verfügbar!`, 'success');
                    if (Notification.permission === 'granted') {
                        new Notification('Kantine Wrapper', {
                            body: `${itemName} ist jetzt verfügbar!`,
                            icon: '🍽️'
                        });
                    }
                    loadMenuDataFromAPI();
                }
            }
        } catch (err) {
            console.error(`Poll error for ${flagId}:`, err);
            await new Promise(r => setTimeout(r, 200));
        }
    }
    localStorage.setItem('kantine_last_checked', new Date().toISOString());
    updateAlarmBell();
}

export function saveHighlightTags() {
    localStorage.setItem('kantine_highlightTags', JSON.stringify(highlightTags));
    renderVisibleWeeks();
    updateNextWeekBadge();
}

export function addHighlightTag(tag) {
    tag = tag.trim().toLowerCase();
    if (tag && !highlightTags.includes(tag)) {
        const newTags = [...highlightTags, tag];
        setHighlightTags(newTags);
        saveHighlightTags();
        return true;
    }
    return false;
}

export function removeHighlightTag(tag) {
    const newTags = highlightTags.filter(t => t !== tag);
    setHighlightTags(newTags);
    saveHighlightTags();
}

export function renderTagsList() {
    const list = document.getElementById('tags-list');
    list.innerHTML = '';
    highlightTags.forEach(tag => {
        const badge = document.createElement('span');
        badge.className = 'tag-badge';
        badge.innerHTML = `${tag} <span class="tag-remove" data-tag="${tag}" title="Schlagwort entfernen">&times;</span>`;
        list.appendChild(badge);
    });

    list.querySelectorAll('.tag-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            removeHighlightTag(e.target.dataset.tag);
            renderTagsList();
        });
    });
}

export function checkHighlight(text) {
    if (!text) return [];
    text = text.toLowerCase();
    return highlightTags.filter(tag => text.includes(tag));
}

const CACHE_KEY = 'kantine_menuCache';
const CACHE_TS_KEY = 'kantine_menuCacheTs';

export function saveMenuCache() {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(allWeeks));
        localStorage.setItem(CACHE_TS_KEY, new Date().toISOString());
    } catch (e) {
        console.warn('Failed to cache menu data:', e);
    }
}

export function loadMenuCache() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        const cachedTs = localStorage.getItem(CACHE_TS_KEY);
        console.log(`[Cache] localStorage: key=${!!cached} (${cached ? cached.length : 0} chars), ts=${cachedTs}`);
        if (cached) {
            setAllWeeks(JSON.parse(cached));
            setCurrentWeekNumber(getISOWeek(new Date()));
            setCurrentYear(new Date().getFullYear());
            console.log(`[Cache] Parsed ${allWeeks.length} weeks:`, allWeeks.map(w => `KW${w.weekNumber}/${w.year} (${(w.days || []).length} days)`));
            renderVisibleWeeks();
            updateNextWeekBadge();
            updateAlarmBell();
            if (cachedTs) updateLastUpdatedTime(cachedTs);

            try {
                const uniqueMenus = new Set();
                allWeeks.forEach(w => {
                    (w.days || []).forEach(d => {
                        (d.items || []).forEach(item => {
                            let text = (item.description || '').replace(/\s+/g, ' ').trim();
                            if (text && text.includes(' / ')) {
                                uniqueMenus.add(text);
                            }
                        });
                    });
                });
                const res = Array.from(uniqueMenus).join('\n\n');
                console.log("=== GEFUNDENE MENÜ-TEXTE (" + uniqueMenus.size + ") ===");
                console.log(res);
            } catch (e) { }

            console.log('Loaded menu from cache');
            return true;
        }
    } catch (e) {
        console.warn('Failed to load cached menu:', e);
    }
    return false;
}

export function isCacheFresh() {
    const cachedTs = localStorage.getItem(CACHE_TS_KEY);
    if (!cachedTs) {
        console.log('[Cache] No timestamp found');
        return false;
    }

    const ageMs = Date.now() - new Date(cachedTs).getTime();
    const ageMin = Math.round(ageMs / 60000);
    if (ageMs > 60 * 60 * 1000) {
        console.log(`[Cache] Stale: ${ageMin}min old (max 60)`);
        return false;
    }

    const thisWeek = getISOWeek(new Date());
    const thisYear = getWeekYear(new Date());
    const hasCurrentWeek = allWeeks.some(w => w.weekNumber === thisWeek && w.year === thisYear && w.days && w.days.length > 0);

    console.log(`[Cache] Age: ${ageMin}min, looking for KW${thisWeek}/${thisYear}, found: ${hasCurrentWeek}`);
    return hasCurrentWeek;
}

export async function loadMenuDataFromAPI() {
    const loading = document.getElementById('loading');
    const progressModal = document.getElementById('progress-modal');
    const progressFill = document.getElementById('progress-fill');
    const progressPercent = document.getElementById('progress-percent');
    const progressMessage = document.getElementById('progress-message');

    loading.classList.remove('hidden');

    const token = authToken || GUEST_TOKEN;

    try {
        progressModal.classList.remove('hidden');
        progressMessage.textContent = 'Hole verfügbare Daten...';
        progressFill.style.width = '0%';
        progressPercent.textContent = '0%';

        const datesResponse = await fetch(`${API_BASE}/venues/${VENUE_ID}/menu/dates/`, {
            headers: apiHeaders(token)
        });

        if (!datesResponse.ok) throw new Error(`Failed to fetch dates: ${datesResponse.status}`);

        const datesData = await datesResponse.json();
        let availableDates = datesData.results || [];

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 7);
        const cutoffStr = cutoff.toISOString().split('T')[0];

        availableDates = availableDates
            .filter(d => d.date >= cutoffStr)
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 30);

        const totalDates = availableDates.length;
        progressMessage.textContent = `${totalDates} Tage gefunden. Lade Details...`;

        const allDays = [];
        let completed = 0;

        for (const dateObj of availableDates) {
            const dateStr = dateObj.date;
            const pct = Math.round(((completed + 1) / totalDates) * 100);
            progressFill.style.width = `${pct}%`;
            progressPercent.textContent = `${pct}%`;
            progressMessage.textContent = `Lade Menü für ${dateStr}...`;

            try {
                const detailResp = await fetch(`${API_BASE}/venues/${VENUE_ID}/menu/${MENU_ID}/${dateStr}/`, {
                    headers: apiHeaders(token)
                });

                if (detailResp.ok) {
                    const detailData = await detailResp.json();
                    if (completed === 0) {
                        console.log('[Kantine Debug] Raw API response for', dateStr, ':', JSON.stringify(detailData).substring(0, 2000));
                    }
                    const menuGroups = detailData.results || [];
                    let dayItems = [];
                    for (const group of menuGroups) {
                        if (group.items && Array.isArray(group.items)) {
                            dayItems = dayItems.concat(group.items);
                        }
                    }
                    if (dayItems.length > 0) {
                        if (completed === 0) {
                            console.log('[Kantine Debug] First item keys:', Object.keys(dayItems[0]));
                            console.log('[Kantine Debug] First item:', JSON.stringify(dayItems[0]).substring(0, 500));
                        }
                        allDays.push({
                            date: dateStr,
                            menu_items: dayItems,
                            orders: dateObj.orders || []
                        });
                    }
                }
            } catch (err) {
                console.error(`Failed to fetch details for ${dateStr}:`, err);
            }

            completed++;
            await new Promise(r => setTimeout(r, 100));
        }

        const weeksMap = new Map();

        if (allWeeks && allWeeks.length > 0) {
            allWeeks.forEach(w => {
                const key = `${w.year}-${w.weekNumber}`;
                try {
                    weeksMap.set(key, {
                        year: w.year,
                        weekNumber: w.weekNumber,
                        days: w.days ? w.days.map(d => ({ ...d, items: d.items ? [...d.items] : [] })) : []
                    });
                } catch (e) { console.warn('Error hydrating week:', e); }
            });
        }

        for (const day of allDays) {
            const d = new Date(day.date);
            const weekNum = getISOWeek(d);
            const year = getWeekYear(d);
            const key = `${year}-${weekNum}`;

            if (!weeksMap.has(key)) {
                weeksMap.set(key, { year, weekNumber: weekNum, days: [] });
            }

            const weekObj = weeksMap.get(key);
            const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
            const orderCutoffDate = new Date(day.date);
            orderCutoffDate.setHours(10, 0, 0, 0);

            const newDayObj = {
                date: day.date,
                weekday: weekday,
                orderCutoff: orderCutoffDate.toISOString(),
                items: day.menu_items.map(item => {
                    const isUnlimited = item.amount_tracking === false;
                    const hasStock = parseInt(item.available_amount) > 0;
                    return {
                        id: `${day.date}_${item.id}`,
                        articleId: item.id,
                        name: item.name || 'Unknown',
                        description: item.description || '',
                        price: parseFloat(item.price) || 0,
                        available: isUnlimited || hasStock,
                        availableAmount: parseInt(item.available_amount) || 0,
                        amountTracking: item.amount_tracking !== false
                    };
                })
            };

            const existingIndex = weekObj.days.findIndex(existing => existing.date === day.date);
            if (existingIndex >= 0) {
                weekObj.days[existingIndex] = newDayObj;
            } else {
                weekObj.days.push(newDayObj);
            }
        }

        const newAllWeeks = Array.from(weeksMap.values()).sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.weekNumber - b.weekNumber;
        });
        newAllWeeks.forEach(w => {
            if (w.days) w.days.sort((a, b) => a.date.localeCompare(b.date));
        });
        setAllWeeks(newAllWeeks);

        saveMenuCache();

        updateLastUpdatedTime(new Date().toISOString());

        setCurrentWeekNumber(getISOWeek(new Date()));
        setCurrentYear(new Date().getFullYear());

        updateAuthUI();
        renderVisibleWeeks();
        updateNextWeekBadge();
        updateAlarmBell();

        progressMessage.textContent = 'Fertig!';
        setTimeout(() => progressModal.classList.add('hidden'), 500);

    } catch (error) {
        console.error('Error fetching menu:', error);
        progressModal.classList.add('hidden');
        import('./ui_helpers.js').then(uiHelpers => {
            uiHelpers.showErrorModal(
                'Keine Verbindung',
                `Die Menüdaten konnten nicht geladen werden. Möglicherweise besteht keine Verbindung zur API oder zur Bessa-Webseite.<br><br><small style="color:var(--text-secondary)">${error.message}</small>`,
                'Zur Original-Seite',
                'https://web.bessa.app/knapp-kantine'
            );
        });
    } finally {
        loading.classList.add('hidden');
    }
}

let lastUpdatedTimestamp = null;
let lastUpdatedIntervalId = null;

export function updateLastUpdatedTime(isoTimestamp) {
    const subtitle = document.getElementById('last-updated-subtitle');
    if (!isoTimestamp) return;
    lastUpdatedTimestamp = isoTimestamp;
    localStorage.setItem('kantine_last_updated', isoTimestamp);
    localStorage.setItem('kantine_last_checked', isoTimestamp);
    try {
        const date = new Date(isoTimestamp);
        const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        const ago = getRelativeTime(date);
        subtitle.textContent = `Aktualisiert: ${dateStr} ${timeStr} (${ago})`;
    } catch (e) {
        subtitle.textContent = '';
    }
    if (!lastUpdatedIntervalId) {
        lastUpdatedIntervalId = setInterval(() => {
            if (lastUpdatedTimestamp) {
                updateLastUpdatedTime(lastUpdatedTimestamp);
                updateAlarmBell();
            }
        }, 60 * 1000);
    }
}

export function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';
    toast.innerHTML = `<span class="material-icons-round">${icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
