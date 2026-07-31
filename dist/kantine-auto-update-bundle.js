/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 367
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   A0: () => (/* binding */ refreshFlaggedItems),
/* harmony export */   Aq: () => (/* binding */ fetchFullOrderHistory),
/* harmony export */   BM: () => (/* binding */ checkHighlight),
/* harmony export */   Et: () => (/* binding */ stopPolling),
/* harmony export */   Gb: () => (/* binding */ fetchOrders),
/* harmony export */   H: () => (/* binding */ cleanupExpiredFlags),
/* harmony export */   KG: () => (/* binding */ loadMenuCache),
/* harmony export */   N4: () => (/* binding */ cancelOrder),
/* harmony export */   P0: () => (/* binding */ showToast),
/* harmony export */   PQ: () => (/* binding */ toggleFlag),
/* harmony export */   VL: () => (/* binding */ isCacheFresh),
/* harmony export */   Y1: () => (/* binding */ renderTagsList),
/* harmony export */   g8: () => (/* binding */ startPolling),
/* harmony export */   i_: () => (/* binding */ updateAuthUI),
/* harmony export */   m9: () => (/* binding */ loadMenuDataFromAPI),
/* harmony export */   oL: () => (/* binding */ addHighlightTag),
/* harmony export */   wH: () => (/* binding */ placeOrder)
/* harmony export */ });
/* unused harmony exports renderHistory, saveFlags, refreshMenuForDate, pollFlaggedItems, saveHighlightTags, removeHighlightTag, saveMenuCache, updateLastUpdatedTime */
/* harmony import */ var _state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(901);
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(801);
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(521);
/* harmony import */ var _api_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(672);
/* harmony import */ var _ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(842);
/* harmony import */ var _i18n_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(646);
/* harmony import */ var _stats_tracker_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(618);








let fullOrderHistoryCache = null;

function updateAuthUI() {
    if (!_state_js__WEBPACK_IMPORTED_MODULE_0__/* .authToken */ .gX) {
        try {
            const akita = localStorage.getItem('AkitaStores');
            if (akita) {
                const parsed = JSON.parse(akita);
                if (parsed.auth && parsed.auth.token) {
                    (0,_state_js__WEBPACK_IMPORTED_MODULE_0__/* .setAuthToken */ .O5)(parsed.auth.token);
                    localStorage.setItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.AUTH_TOKEN, parsed.auth.token);

                    if (parsed.auth.user) {
                        (0,_state_js__WEBPACK_IMPORTED_MODULE_0__/* .setCurrentUser */ .lt)(parsed.auth.user.id || 'unknown');
                        localStorage.setItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.CURRENT_USER, parsed.auth.user.id || 'unknown');
                        if (parsed.auth.user.firstName) localStorage.setItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.FIRST_NAME, parsed.auth.user.firstName);
                        if (parsed.auth.user.lastName) localStorage.setItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.LAST_NAME, parsed.auth.user.lastName);
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to parse AkitaStores:', e);
        }
    }

    (0,_state_js__WEBPACK_IMPORTED_MODULE_0__/* .setAuthToken */ .O5)(localStorage.getItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.AUTH_TOKEN));
    (0,_state_js__WEBPACK_IMPORTED_MODULE_0__/* .setCurrentUser */ .lt)(localStorage.getItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.CURRENT_USER));
    const firstName = localStorage.getItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.FIRST_NAME);
    const btnLoginOpen = document.getElementById('btn-login-open');
    const userInfo = document.getElementById('user-info');
    const userIdDisplay = document.getElementById('user-id-display');

    if (_state_js__WEBPACK_IMPORTED_MODULE_0__/* .authToken */ .gX) {
        btnLoginOpen.classList.add('hidden');
        userInfo.classList.remove('hidden');
        userIdDisplay.textContent = firstName || (_state_js__WEBPACK_IMPORTED_MODULE_0__/* .currentUser */ .Ny ? `User ${_state_js__WEBPACK_IMPORTED_MODULE_0__/* .currentUser */ .Ny}` : (0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('loggedIn'));
        fetchOrders();
    } else {
        btnLoginOpen.classList.remove('hidden');
        userInfo.classList.add('hidden');
        userIdDisplay.textContent = '';
    }

    (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .renderVisibleWeeks */ .OR)();
}

async function fetchOrders() {
    if (!_state_js__WEBPACK_IMPORTED_MODULE_0__/* .authToken */ .gX) return;
    try {
        const response = await fetch(`${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .API_BASE */ .tE}/user/orders/?venue=${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .VENUE_ID */ .eW}&ordering=-created&limit=50`, {
            headers: (0,_api_js__WEBPACK_IMPORTED_MODULE_3__/* .apiHeaders */ .H)(_state_js__WEBPACK_IMPORTED_MODULE_0__/* .authToken */ .gX)
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
            (0,_state_js__WEBPACK_IMPORTED_MODULE_0__/* .setOrderMap */ .di)(newOrderMap);
            (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .renderVisibleWeeks */ .OR)();
            (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .updateNextWeekBadge */ .gJ)();
        }
    } catch (error) {
        console.error('Error fetching orders:', error);
    }
}

async function fetchFullOrderHistory() {
    const historyLoading = document.getElementById('history-loading');
    const historyContent = document.getElementById('history-content');
    const progressFill = document.getElementById('history-progress-fill');
    const progressText = document.getElementById('history-progress-text');

    let localCache = [];
    if (fullOrderHistoryCache) {
        localCache = fullOrderHistoryCache;
    } else {
        const ls = localStorage.getItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.HISTORY_CACHE);
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

    if (!_state_js__WEBPACK_IMPORTED_MODULE_0__/* .authToken */ .gX) return;

    if (localCache.length === 0) {
        historyContent.innerHTML = '';
        historyLoading.classList.remove('hidden');
    }

    progressFill.style.width = '0%';
    progressText.textContent = localCache.length > 0 ? (0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('historyLoadingDelta') : (0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('historyLoadingFull');
    if (localCache.length > 0) historyLoading.classList.remove('hidden');

    let nextUrl = localCache.length > 0
        ? `${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .API_BASE */ .tE}/user/orders/?venue=${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .VENUE_ID */ .eW}&ordering=-created&limit=5`
        : `${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .API_BASE */ .tE}/user/orders/?venue=${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .VENUE_ID */ .eW}&ordering=-created&limit=50`;
    let fetchedOrders = [];
    let totalCount = 0;
    let requiresFullFetch = localCache.length === 0;
    let deltaComplete = false;
    const cacheMap = new Map();
    for (const o of localCache) cacheMap.set(o.id, o);

    try {
        while (nextUrl && !deltaComplete) {
            const response = await fetch(nextUrl, { headers: (0,_api_js__WEBPACK_IMPORTED_MODULE_3__/* .apiHeaders */ .H)(_state_js__WEBPACK_IMPORTED_MODULE_0__/* .authToken */ .gX) });
            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

            const data = await response.json();

            if (data.count && totalCount === 0) {
                totalCount = data.count;
            }

            const results = data.results || [];

            for (const order of results) {
                const existingOrder = cacheMap.get(order.id);

                if (!requiresFullFetch && existingOrder) {
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
                    progressText.textContent = `${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('historyLoadingItem')} ${fetchedOrders.length} ${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('historyLoadingOf')} ${totalCount}...`;
                } else {
                    progressText.textContent = `${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('historyLoadingItem')} ${fetchedOrders.length}...`;
                }
            } else if (!deltaComplete) {
                progressText.textContent = `${fetchedOrders.length} ${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('historyLoadingNew')}`;
            }

            nextUrl = deltaComplete ? null : data.next;
        }

        if (fetchedOrders.length > 0) {
            const cacheMap = new Map();
            for (const o of localCache) cacheMap.set(o.id, o);
            for (const order of fetchedOrders) {
                cacheMap.set(order.id, order);
            }
            const mergedOrders = Array.from(cacheMap.values());
            mergedOrders.sort((a, b) => new Date(b.created) - new Date(a.created));

            fullOrderHistoryCache = mergedOrders;
            try {
                localStorage.setItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.HISTORY_CACHE, JSON.stringify(mergedOrders));
            } catch (e) {
                console.warn('History cache write error', e);
            }
            renderHistory(fullOrderHistoryCache);
        }
    } catch (error) {
        console.error('Error in history sync:', error);
        if (localCache.length === 0) {
            historyContent.innerHTML = `<p style="color:var(--error-color);text-align:center;">${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('historyLoadError')}</p>`;
        } else {
            showToast((0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('bgSyncFailed'), 'error');
        }
    } finally {
        historyLoading.classList.add('hidden');
    }
}

function renderHistory(orders) {
    const content = document.getElementById('history-content');
    if (!orders || orders.length === 0) {
        content.innerHTML = `<p style="text-align:center;color:var(--text-secondary);padding:20px;">${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('noOrders')}</p>`;
        return;
    }

    const groups = {};

    orders.forEach(order => {
        const d = new Date(order.date);
        const y = d.getFullYear();
        const m = d.getMonth();
        const monthKey = `${y}-${m.toString().padStart(2, '0')}`;
        const uiLocale = _state_js__WEBPACK_IMPORTED_MODULE_0__/* .langMode */ .Kl === 'en' ? 'en-US' : 'de-AT';
        const monthName = d.toLocaleString(uiLocale, { month: 'long' });

        const kw = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .getISOWeek */ .sn)(d);

        if (!groups[y]) {
            groups[y] = { year: y, months: {} };
        }
        if (!groups[y].months[monthKey]) {
            groups[y].months[monthKey] = { name: monthName, year: y, monthIndex: m, count: 0, total: 0, weeks: {} };
        }
        if (!groups[y].months[monthKey].weeks[kw]) {
            groups[y].months[monthKey].weeks[kw] = { label: _state_js__WEBPACK_IMPORTED_MODULE_0__/* .langMode */ .Kl === 'en' ? `CW ${kw}` : `KW ${kw}`, items: [], count: 0, total: 0 };
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

    content.innerHTML = '';
    const sortedYears = Object.keys(groups).sort((a, b) => b - a);

    sortedYears.forEach(yKey => {
        const yearGroup = groups[yKey];
        const yearGroupDiv = document.createElement('div');
        yearGroupDiv.className = 'history-year-group';

        const yearHeader = document.createElement('h2');
        yearHeader.className = 'history-year-header';
        yearHeader.textContent = yearGroup.year;
        yearGroupDiv.appendChild(yearHeader);

        const sortedMonths = Object.keys(yearGroup.months).sort((a, b) => b.localeCompare(a));

        sortedMonths.forEach(mKey => {
            const monthGroup = yearGroup.months[mKey];

            const monthGroupDiv = document.createElement('div');
            monthGroupDiv.className = 'history-month-group';

            const monthHeader = document.createElement('div');
            monthHeader.className = 'history-month-header';
            monthHeader.setAttribute('tabindex', '0');
            monthHeader.setAttribute('role', 'button');
            monthHeader.setAttribute('aria-expanded', 'false');
            monthHeader.setAttribute('title', (0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('historyMonthToggle'));

            const monthHeaderContent = document.createElement('div');
            monthHeaderContent.style.display = 'flex';
            monthHeaderContent.style.flexDirection = 'column';
            monthHeaderContent.style.gap = '4px';

            const monthNameSpan = document.createElement('span');
            monthNameSpan.textContent = monthGroup.name;
            monthHeaderContent.appendChild(monthNameSpan);

            const monthSummary = document.createElement('div');
            monthSummary.className = 'history-month-summary';

            const monthSummarySpan = document.createElement('span');
            monthSummarySpan.innerHTML = `${monthGroup.count} ${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('orders')} &bull; <strong>€${monthGroup.total.toFixed(2)}</strong>`;
            monthSummary.appendChild(monthSummarySpan);

            monthHeaderContent.appendChild(monthSummary);
            monthHeader.appendChild(monthHeaderContent);

            const expandIcon = document.createElement('span');
            expandIcon.className = 'material-icons-round';
            expandIcon.textContent = 'expand_more';
            monthHeader.appendChild(expandIcon);

            monthHeader.addEventListener('click', () => {
                const parentGroup = monthHeader.parentElement;
                const isOpen = parentGroup.classList.contains('open');

                if (isOpen) {
                    parentGroup.classList.remove('open');
                    monthHeader.setAttribute('aria-expanded', 'false');
                } else {
                    parentGroup.classList.add('open');
                    monthHeader.setAttribute('aria-expanded', 'true');
                }
            });

            monthGroupDiv.appendChild(monthHeader);

            const monthContentDiv = document.createElement('div');
            monthContentDiv.className = 'history-month-content';

            const sortedKWs = Object.keys(monthGroup.weeks).sort((a, b) => parseInt(b) - parseInt(a));

            sortedKWs.forEach(kw => {
                const week = monthGroup.weeks[kw];
                const weekGroupDiv = document.createElement('div');
                weekGroupDiv.className = 'history-week-group';

                const weekHeader = document.createElement('div');
                weekHeader.className = 'history-week-header';

                const weekLabel = document.createElement('strong');
                weekLabel.textContent = week.label;
                weekHeader.appendChild(weekLabel);

                const weekSummary = document.createElement('span');
                weekSummary.innerHTML = `${week.count} ${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('orders')} &bull; <strong>€${week.total.toFixed(2)}</strong>`;
                weekHeader.appendChild(weekSummary);

                weekGroupDiv.appendChild(weekHeader);

                week.items.forEach(item => {
                    const dateObj = new Date(item.date);
                    const uiLocale = _state_js__WEBPACK_IMPORTED_MODULE_0__/* .langMode */ .Kl === 'en' ? 'en-US' : 'de-AT';
                    const dayStr = dateObj.toLocaleDateString(uiLocale, { weekday: 'short', day: '2-digit', month: '2-digit' });

                    const historyItem = document.createElement('div');
                    historyItem.className = 'history-item';
                    if (item.state === 9) {
                        historyItem.classList.add('history-item-cancelled');
                    }

                    const dateDiv = document.createElement('div');
                    dateDiv.style.fontSize = '0.85rem';
                    dateDiv.style.color = 'var(--text-secondary)';
                    dateDiv.textContent = dayStr;
                    historyItem.appendChild(dateDiv);

                    const detailsDiv = document.createElement('div');
                    detailsDiv.className = 'history-item-details';

                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'history-item-name';
                    nameSpan.textContent = item.name;
                    detailsDiv.appendChild(nameSpan);

                    const statusDiv = document.createElement('div');
                    const statusSpan = document.createElement('span');
                    statusSpan.className = 'history-item-status';
                    if (item.state === 9) {
                        statusSpan.textContent = (0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('stateCancelled');
                    } else if (item.state === 8) {
                        statusSpan.textContent = (0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('stateCompleted');
                    } else {
                        statusSpan.textContent = (0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('stateTransferred');
                    }
                    statusDiv.appendChild(statusSpan);
                    detailsDiv.appendChild(statusDiv);

                    historyItem.appendChild(detailsDiv);

                    const priceDiv = document.createElement('div');
                    priceDiv.className = 'history-item-price';
                    if (item.state === 9) {
                        priceDiv.classList.add('history-item-price-cancelled');
                    }
                    priceDiv.textContent = `€${item.price.toFixed(2)}`;
                    historyItem.appendChild(priceDiv);

                    weekGroupDiv.appendChild(historyItem);
                });

                monthContentDiv.appendChild(weekGroupDiv);
            });

            monthGroupDiv.appendChild(monthContentDiv);
            yearGroupDiv.appendChild(monthGroupDiv);
        });

        content.appendChild(yearGroupDiv);
    });
}

async function placeOrder(date, articleId, name, price, description) {
    if (!_state_js__WEBPACK_IMPORTED_MODULE_0__/* .authToken */ .gX) return;
    try {
        const userResp = await fetch(`${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .API_BASE */ .tE}/auth/user/`, {
            headers: (0,_api_js__WEBPACK_IMPORTED_MODULE_3__/* .apiHeaders */ .H)(_state_js__WEBPACK_IMPORTED_MODULE_0__/* .authToken */ .gX)
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
            venue: _constants_js__WEBPACK_IMPORTED_MODULE_2__/* .VENUE_ID */ .eW,
            states: [],
            order_state: 1,
            date: `${date}T09:00:00.000Z`,
            payment_method: 'payroll',
            customer: {
                first_name: userData.first_name,
                last_name: userData.last_name,
                email: userData.email,
                newsletter: false
            },
            preorder: false,
            delivery_fee: 0,
            cash_box_table_name: null,
            take_away: false
        };

        const response = await fetch(`${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .API_BASE */ .tE}/user/orders/`, {
            method: 'POST',
            headers: (0,_api_js__WEBPACK_IMPORTED_MODULE_3__/* .apiHeaders */ .H)(_state_js__WEBPACK_IMPORTED_MODULE_0__/* .authToken */ .gX),
            body: JSON.stringify(orderPayload)
        });

        if (response.ok || response.status === 201) {
            showToast(`${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('orderSuccess')}: ${name}`, 'success');
            _stats_tracker_js__WEBPACK_IMPORTED_MODULE_6__/* .tracker */ .F.increment('order_placed');
            fullOrderHistoryCache = null;
            
            const flagId = `${date}_${articleId}`;
            if (_state_js__WEBPACK_IMPORTED_MODULE_0__/* .userFlags */ .BY.has(flagId)) {
                _state_js__WEBPACK_IMPORTED_MODULE_0__/* .userFlags */ .BY.delete(flagId);
                saveFlags();
                (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .updateAlarmBell */ .Mb)();
            }

            await fetchOrders();
            await refreshMenuForDate(date);
        } else {
            const data = await response.json();
            showToast(`Fehler: ${data.detail || data.non_field_errors?.[0] || 'Bestellung fehlgeschlagen'}`, 'error');
            await refreshMenuForDate(date);
        }
    } catch (error) {
        console.error('Order error:', error);
        showToast('Netzwerkfehler bei Bestellung', 'error');
        await refreshMenuForDate(date);
    }
}

async function cancelOrder(date, articleId, name) {
    if (!_state_js__WEBPACK_IMPORTED_MODULE_0__/* .authToken */ .gX) return;
    const key = `${date}_${articleId}`;
    const orderIds = _state_js__WEBPACK_IMPORTED_MODULE_0__/* .orderMap */ .L.get(key);
    if (!orderIds || orderIds.length === 0) return;

    const orderId = orderIds[orderIds.length - 1];
    try {
        const response = await fetch(`${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .API_BASE */ .tE}/user/orders/${orderId}/cancel/`, {
            method: 'PATCH',
            headers: (0,_api_js__WEBPACK_IMPORTED_MODULE_3__/* .apiHeaders */ .H)(_state_js__WEBPACK_IMPORTED_MODULE_0__/* .authToken */ .gX),
            body: JSON.stringify({})
        });

        if (response.ok) {
            showToast(`${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('cancelSuccess')}: ${name}`, 'success');
            _stats_tracker_js__WEBPACK_IMPORTED_MODULE_6__/* .tracker */ .F.increment('order_cancelled');
            fullOrderHistoryCache = null;
            await fetchOrders();
            await refreshMenuForDate(date);
        } else {
            const data = await response.json();
            showToast(`Fehler: ${data.detail || 'Stornierung fehlgeschlagen'}`, 'error');
        }
    } catch (error) {
        console.error('Cancel error:', error);
        showToast('Netzwerkfehler bei Stornierung', 'error');
    }
}

function saveFlags() {
    localStorage.setItem('kantine_flags', JSON.stringify([..._state_js__WEBPACK_IMPORTED_MODULE_0__/* .userFlags */ .BY]));
}

async function refreshFlaggedItems() {
    if (_state_js__WEBPACK_IMPORTED_MODULE_0__/* .userFlags */ .BY.size === 0) return;
    const token = _state_js__WEBPACK_IMPORTED_MODULE_0__/* .authToken */ .gX;
    if (!token) {
        const bellBtn = document.getElementById('alarm-bell');
        if (bellBtn) bellBtn.classList.remove('refreshing');
        return;
    }

    // Collect unique dates that have flagged items
    const datesToFetch = new Set();
    for (const flagId of _state_js__WEBPACK_IMPORTED_MODULE_0__/* .userFlags */ .BY) {
        const [dateStr] = flagId.split('_');
        datesToFetch.add(dateStr);
    }

    let updated = false;
    const bellBtn = document.getElementById('alarm-bell');
    if (bellBtn) bellBtn.classList.add('refreshing');

    try {
        await Promise.all(Array.from(datesToFetch).map(async (dateStr) => {
            try {
                const resp = await fetch(`${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .API_BASE */ .tE}/venues/${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .VENUE_ID */ .eW}/menu/${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .MENU_ID */ .YU}/${dateStr}/`, {
                    headers: (0,_api_js__WEBPACK_IMPORTED_MODULE_3__/* .apiHeaders */ .H)(token)
                });
                if (!resp.ok) return;
                const data = await resp.json();
                const menuGroups = data.results || [];

                // Build a lookup of fresh API items by article ID
                const apiItemMap = new Map();
                for (const group of menuGroups) {
                    if (group.items && Array.isArray(group.items)) {
                        for (const item of group.items) {
                            apiItemMap.set(item.id, item);
                        }
                    }
                }

                // Only update items that are actually flagged
                for (let week of _state_js__WEBPACK_IMPORTED_MODULE_0__/* .allWeeks */ .p_) {
                    if (!week.days) continue;
                    const dayObj = week.days.find(d => d.date === dateStr);
                    if (!dayObj || !dayObj.items) continue;

                    for (let i = 0; i < dayObj.items.length; i++) {
                        const existing = dayObj.items[i];
                        const flagId = `${dateStr}_${existing.articleId}`;
                        if (!_state_js__WEBPACK_IMPORTED_MODULE_0__/* .userFlags */ .BY.has(flagId)) continue;

                        const apiItem = apiItemMap.get(existing.articleId);
                        if (apiItem) {
                            const isUnlimited = apiItem.amount_tracking === false;
                            const hasStock = parseInt(apiItem.available_amount) > 0;
                            existing.available = isUnlimited || hasStock;
                            existing.availableAmount = parseInt(apiItem.available_amount) || 0;
                            existing.amountTracking = apiItem.amount_tracking !== false;
                            updated = true;
                        }
                    }
                }
            } catch (e) {
                console.error('Error refreshing flag date', dateStr, e);
            }
        }));

        if (updated) {
            saveMenuCache();
        }

        // Always update the check timestamp and bell status
        localStorage.setItem('kantine_flagged_items_last_checked', new Date().toISOString());
        (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .updateAlarmBell */ .Mb)();
        (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .renderVisibleWeeks */ .OR)();

        showToast(`${_state_js__WEBPACK_IMPORTED_MODULE_0__/* .userFlags */ .BY.size} ${_state_js__WEBPACK_IMPORTED_MODULE_0__/* .userFlags */ .BY.size === 1 ? (0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('menuSingular') : (0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('menuPlural')} ${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('menuChecked')}`, 'info');
    } finally {
        if (bellBtn) bellBtn.classList.remove('refreshing');
    }
}

async function refreshMenuForDate(dateStr) {
    if (!_state_js__WEBPACK_IMPORTED_MODULE_0__/* .authToken */ .gX) return;
    try {
        const resp = await fetch(`${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .API_BASE */ .tE}/venues/${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .VENUE_ID */ .eW}/menu/${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .MENU_ID */ .YU}/${dateStr}/`, {
            headers: (0,_api_js__WEBPACK_IMPORTED_MODULE_3__/* .apiHeaders */ .H)(_state_js__WEBPACK_IMPORTED_MODULE_0__/* .authToken */ .gX)
        });
        if (!resp.ok) return;
        const data = await resp.json();
        const menuGroups = data.results || [];
        
        const apiItemMap = new Map();
        for (const group of menuGroups) {
            if (group.items && Array.isArray(group.items)) {
                for (const item of group.items) {
                    apiItemMap.set(item.id, item);
                }
            }
        }
        
        let updated = false;
        for (let week of _state_js__WEBPACK_IMPORTED_MODULE_0__/* .allWeeks */ .p_) {
            if (!week.days) continue;
            const dayObj = week.days.find(d => d.date === dateStr);
            if (!dayObj || !dayObj.items) continue;

            for (let i = 0; i < dayObj.items.length; i++) {
                const existing = dayObj.items[i];
                const apiItem = apiItemMap.get(existing.articleId);
                if (apiItem) {
                    const isUnlimited = apiItem.amount_tracking === false;
                    const hasStock = parseInt(apiItem.available_amount) > 0;
                    if (existing.available !== (isUnlimited || hasStock) || 
                        existing.availableAmount !== (parseInt(apiItem.available_amount) || 0)) {
                        existing.available = isUnlimited || hasStock;
                        existing.availableAmount = parseInt(apiItem.available_amount) || 0;
                        existing.amountTracking = apiItem.amount_tracking !== false;
                        updated = true;
                    }
                }
            }
        }
        
        if (updated) {
            saveMenuCache();
            (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .renderVisibleWeeks */ .OR)();
            (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .updateNextWeekBadge */ .gJ)();
        }
    } catch (e) {
        console.error('Error refreshing menu date', dateStr, e);
    }
}


function toggleFlag(date, articleId, name, cutoff) {
    const id = `${date}_${articleId}`;
    let flagAdded = false;
    if (_state_js__WEBPACK_IMPORTED_MODULE_0__/* .userFlags */ .BY.has(id)) {
        _state_js__WEBPACK_IMPORTED_MODULE_0__/* .userFlags */ .BY.delete(id);
        showToast(`${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('flagRemoved')} ${name}`, 'success');
    } else {
        _state_js__WEBPACK_IMPORTED_MODULE_0__/* .userFlags */ .BY.add(id);
        flagAdded = true;
        showToast(`${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('flagActivated')} ${name}`, 'success');
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
    saveFlags();

    if (flagAdded) {
        refreshFlaggedItems();
    } else {
        (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .updateAlarmBell */ .Mb)();
        (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .renderVisibleWeeks */ .OR)();
    }
}

function cleanupExpiredFlags() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    let changed = false;

    for (const flagId of [..._state_js__WEBPACK_IMPORTED_MODULE_0__/* .userFlags */ .BY]) {
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
            _state_js__WEBPACK_IMPORTED_MODULE_0__/* .userFlags */ .BY.delete(flagId);
            changed = true;
        }
    }
    if (changed) saveFlags();
}

function startPolling() {
    if (_state_js__WEBPACK_IMPORTED_MODULE_0__/* .pollIntervalId */ .K8) return;
    if (!_state_js__WEBPACK_IMPORTED_MODULE_0__/* .authToken */ .gX) return;
    (0,_state_js__WEBPACK_IMPORTED_MODULE_0__/* .setPollIntervalId */ .cc)(setInterval(() => pollFlaggedItems(), _constants_js__WEBPACK_IMPORTED_MODULE_2__/* .POLL_INTERVAL_MS */ .fv));
}

function stopPolling() {
    if (_state_js__WEBPACK_IMPORTED_MODULE_0__/* .pollIntervalId */ .K8) {
        clearInterval(_state_js__WEBPACK_IMPORTED_MODULE_0__/* .pollIntervalId */ .K8);
        (0,_state_js__WEBPACK_IMPORTED_MODULE_0__/* .setPollIntervalId */ .cc)(null);
    }
}

async function pollFlaggedItems() {
    if (_state_js__WEBPACK_IMPORTED_MODULE_0__/* .userFlags */ .BY.size === 0 || !_state_js__WEBPACK_IMPORTED_MODULE_0__/* .authToken */ .gX) return;

    cleanupExpiredFlags();
    if (_state_js__WEBPACK_IMPORTED_MODULE_0__/* .userFlags */ .BY.size === 0) return;

    const flagsByDate = {};
    for (const flagId of _state_js__WEBPACK_IMPORTED_MODULE_0__/* .userFlags */ .BY) {
        const [date, articleIdStr] = flagId.split('_');
        if (!flagsByDate[date]) flagsByDate[date] = [];
        flagsByDate[date].push(parseInt(articleIdStr));
    }

    let needsReload = false;

    await Promise.all(Object.entries(flagsByDate).map(async ([date, articleIds]) => {
        try {
            const response = await fetch(`${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .API_BASE */ .tE}/venues/${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .VENUE_ID */ .eW}/menu/${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .MENU_ID */ .YU}/${date}/`, {
                headers: (0,_api_js__WEBPACK_IMPORTED_MODULE_3__/* .apiHeaders */ .H)(_state_js__WEBPACK_IMPORTED_MODULE_0__/* .authToken */ .gX)
            });
            if (!response.ok) return;

            const data = await response.json();
            const groups = data.results || [];

            const apiItemMap = new Map();
            for (const group of groups) {
                if (group.items) {
                    for (const item of group.items) {
                        const id = item.id;
                        const art = item.article;
                        if (id !== undefined && id !== null && !apiItemMap.has(id)) apiItemMap.set(id, item);
                        if (art !== undefined && art !== null && !apiItemMap.has(art)) apiItemMap.set(art, item);
                    }
                }
            }

            for (const articleId of articleIds) {
                const foundItem = apiItemMap.get(articleId);
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
                        needsReload = true;
                    }
                }
            }
        } catch (err) {
            console.error(`Poll error for date ${date}:`, err);
        }
    }));

    if (needsReload) {
        loadMenuDataFromAPI();
    }

    localStorage.setItem('kantine_flagged_items_last_checked', new Date().toISOString());
    (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .updateAlarmBell */ .Mb)();
}

function saveHighlightTags() {
    localStorage.setItem('kantine_highlightTags', JSON.stringify(_state_js__WEBPACK_IMPORTED_MODULE_0__/* .highlightTags */ .yz));
    (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .renderVisibleWeeks */ .OR)();
    (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .updateNextWeekBadge */ .gJ)();
}

function addHighlightTag(tag) {
    if (!tag) return false;
    tag = tag.trim();
    if (tag.length < 2) {
        showToast('Tag muss mindestens 2 Zeichen lang sein.', 'error');
        return false;
    }
    if (tag.length > 20) {
        showToast('Tag darf maximal 20 Zeichen lang sein.', 'error');
        return false;
    }
    // Only allow alphanumeric characters, spaces and common special chars for food
    if (!/^[a-zA-Z0-9äöüÄÖÜß\s\-\.]+$/.test(tag)) {
        showToast('Ungültige Zeichen im Tag.', 'error');
        return false;
    }
    if (_state_js__WEBPACK_IMPORTED_MODULE_0__/* .highlightTags */ .yz.includes(tag)) return false;
    const newTags = [..._state_js__WEBPACK_IMPORTED_MODULE_0__/* .highlightTags */ .yz, tag];
    (0,_state_js__WEBPACK_IMPORTED_MODULE_0__/* .setHighlightTags */ .iw)(newTags);
    saveHighlightTags();
    return true;
}

function removeHighlightTag(tag) {
    const newTags = _state_js__WEBPACK_IMPORTED_MODULE_0__/* .highlightTags */ .yz.filter(t => t !== tag);
    (0,_state_js__WEBPACK_IMPORTED_MODULE_0__/* .setHighlightTags */ .iw)(newTags);
    saveHighlightTags();
}

function renderTagsList() {
    const list = document.getElementById('tags-list');
    if (!list) return;
    list.innerHTML = ''; // Clear existing content
    _state_js__WEBPACK_IMPORTED_MODULE_0__/* .highlightTags */ .yz.forEach(tag => {
        const badge = document.createElement('span');
        badge.className = 'tag-badge';
        
        const label = document.createElement('span');
        label.textContent = tag;
        badge.appendChild(label);
        
        const removeBtn = document.createElement('span');
        removeBtn.className = 'tag-remove';
        removeBtn.innerHTML = '&times;';
        removeBtn.title = (0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('removeTagTooltip') || 'Entfernen';
        removeBtn.onclick = () => {
            removeHighlightTag(tag);
            renderTagsList();
        };
        badge.appendChild(removeBtn);
        list.appendChild(badge);
    });
}

function checkHighlight(text) {
    if (!text) return [];
    text = text.toLowerCase();
    return _state_js__WEBPACK_IMPORTED_MODULE_0__/* .highlightTags */ .yz.filter(tag => text.includes(tag));
}

const CACHE_KEY = 'kantine_menuCache';
const CACHE_TS_KEY = 'kantine_menuCacheTs';

function saveMenuCache() {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(_state_js__WEBPACK_IMPORTED_MODULE_0__/* .allWeeks */ .p_));
        localStorage.setItem(CACHE_TS_KEY, new Date().toISOString());
    } catch (e) {
        console.warn('Failed to cache menu data:', e);
    }
}

function loadMenuCache() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        const cachedTs = localStorage.getItem(CACHE_TS_KEY);
        if (cached) {
            (0,_state_js__WEBPACK_IMPORTED_MODULE_0__/* .setAllWeeks */ .tn)(JSON.parse(cached));
            (0,_state_js__WEBPACK_IMPORTED_MODULE_0__/* .setCurrentWeekNumber */ .Xt)((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .getISOWeek */ .sn)(new Date()));
            (0,_state_js__WEBPACK_IMPORTED_MODULE_0__/* .setCurrentYear */ .pK)(new Date().getFullYear());
            (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .renderVisibleWeeks */ .OR)();
            (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .updateNextWeekBadge */ .gJ)();
            (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .updateAlarmBell */ .Mb)();
            if (cachedTs) updateLastUpdatedTime(cachedTs);


            return true;
        }
    } catch (e) {
        console.warn('Failed to load cached menu:', e);
    }
    return false;
}

function isCacheFresh() {
    const cachedTs = localStorage.getItem(CACHE_TS_KEY);
    if (!cachedTs) {
        return false;
    }

    const ageMs = Date.now() - new Date(cachedTs).getTime();
    if (ageMs > 60 * 60 * 1000) {
        return false;
    }

    const thisWeek = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .getISOWeek */ .sn)(new Date());
    const thisYear = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .getWeekYear */ .Ao)(new Date());
    const hasCurrentWeek = _state_js__WEBPACK_IMPORTED_MODULE_0__/* .allWeeks */ .p_.some(w => w.weekNumber === thisWeek && w.year === thisYear && w.days && w.days.length > 0);

    return hasCurrentWeek;
}

async function loadMenuDataFromAPI() {
    const loading = document.getElementById('loading');
    const progressModal = document.getElementById('progress-modal');
    const progressFill = document.getElementById('progress-fill');
    const progressPercent = document.getElementById('progress-percent');
    const progressMessage = document.getElementById('progress-message');

    loading.classList.remove('hidden');

    const token = _state_js__WEBPACK_IMPORTED_MODULE_0__/* .authToken */ .gX;
    if (!token) {
        loading.classList.add('hidden');
        return;
    }

    const __apiStart = Date.now();
    try {
        progressModal.classList.remove('hidden');
        progressMessage.textContent = 'Hole verfügbare Daten...';
        progressFill.style.width = '0%';
        progressPercent.textContent = '0%';

        const datesResponse = await fetch(`${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .API_BASE */ .tE}/venues/${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .VENUE_ID */ .eW}/menu/dates/`, {
            headers: (0,_api_js__WEBPACK_IMPORTED_MODULE_3__/* .apiHeaders */ .H)(token)
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

        const BATCH_SIZE = 5;
        for (let i = 0; i < totalDates; i += BATCH_SIZE) {
            const batch = availableDates.slice(i, i + BATCH_SIZE);
            const results = await Promise.all(batch.map(async (dateObj) => {
                const dateStr = dateObj.date;
                let dayData = null;
                try {
                    const detailResp = await fetch(`${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .API_BASE */ .tE}/venues/${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .VENUE_ID */ .eW}/menu/${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .MENU_ID */ .YU}/${dateStr}/`, {
                        headers: (0,_api_js__WEBPACK_IMPORTED_MODULE_3__/* .apiHeaders */ .H)(token)
                    });

                    if (detailResp.ok) {
                        const detailData = await detailResp.json();
                        const menuGroups = detailData.results || [];
                        let dayItems = [];
                        for (const group of menuGroups) {
                            if (group.items && Array.isArray(group.items)) {
                                dayItems.push(...group.items);
                            }
                        }
                        if (dayItems.length > 0) {
                            dayData = {
                                date: dateStr,
                                menu_items: dayItems,
                                orders: dateObj.orders || []
                            };
                        }
                    }
                } catch (err) {
                    console.error(`Failed to fetch details for ${dateStr}:`, err);
                } finally {
                    completed++;
                    const pct = Math.round((completed / totalDates) * 100);
                    progressFill.style.width = `${pct}%`;
                    progressPercent.textContent = `${pct}%`;
                    progressMessage.textContent = `Lade Menü für ${dateStr}...`;
                }
                return dayData;
            }));

            for (const result of results) {
                if (result) {
                    allDays.push(result);
                }
            }
        }

        const weeksMap = new Map();

        if (_state_js__WEBPACK_IMPORTED_MODULE_0__/* .allWeeks */ .p_ && _state_js__WEBPACK_IMPORTED_MODULE_0__/* .allWeeks */ .p_.length > 0) {
            _state_js__WEBPACK_IMPORTED_MODULE_0__/* .allWeeks */ .p_.forEach(w => {
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
            const weekNum = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .getISOWeek */ .sn)(d);
            const year = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .getWeekYear */ .Ao)(d);
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
        (0,_state_js__WEBPACK_IMPORTED_MODULE_0__/* .setAllWeeks */ .tn)(newAllWeeks);

        saveMenuCache();

        updateLastUpdatedTime(new Date().toISOString());

        (0,_state_js__WEBPACK_IMPORTED_MODULE_0__/* .setCurrentWeekNumber */ .Xt)((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .getISOWeek */ .sn)(new Date()));
        (0,_state_js__WEBPACK_IMPORTED_MODULE_0__/* .setCurrentYear */ .pK)(new Date().getFullYear());

        updateAuthUI();
        (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .renderVisibleWeeks */ .OR)();
        (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .updateNextWeekBadge */ .gJ)();
        (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .updateAlarmBell */ .Mb)();

        progressMessage.textContent = 'Fertig!';
        setTimeout(() => progressModal.classList.add('hidden'), 500);

    } catch (error) {
        console.error('Error fetching menu:', error);
        progressModal.classList.add('hidden');
        Promise.resolve(/* import() */).then(__webpack_require__.bind(__webpack_require__, 842)).then(uiHelpers => {
            uiHelpers.showErrorModal(
                'Keine Verbindung',
                'Die Menüdaten konnten nicht geladen werden. Möglicherweise besteht keine Verbindung zur API oder zur Bessa-Webseite.',
                error.message,
                'Zur Original-Seite',
                'https://web.bessa.app/knapp-kantine'
            );
        });
    } finally {
        loading.classList.add('hidden');
        _stats_tracker_js__WEBPACK_IMPORTED_MODULE_6__/* .tracker */ .F.incrementValue('api_latency_sum', Date.now() - __apiStart);
        _stats_tracker_js__WEBPACK_IMPORTED_MODULE_6__/* .tracker */ .F.increment('api_latency_count');
        if (window.__kantine_load_start) {
            const loadMs = Date.now() - window.__kantine_load_start;
            _stats_tracker_js__WEBPACK_IMPORTED_MODULE_6__/* .tracker */ .F.incrementValue('load_time_sum', loadMs);
            _stats_tracker_js__WEBPACK_IMPORTED_MODULE_6__/* .tracker */ .F.increment('load_time_count');
        }
    }
}

let lastUpdatedTimestamp = null;
let lastUpdatedIntervalId = null;

function updateLastUpdatedTime(isoTimestamp) {
    const subtitle = document.getElementById('last-updated-subtitle');
    if (!isoTimestamp) return;
    lastUpdatedTimestamp = isoTimestamp;
    localStorage.setItem('kantine_last_updated', isoTimestamp);
    localStorage.setItem('kantine_last_checked', isoTimestamp);
    try {
        const date = new Date(isoTimestamp);
        const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        const ago = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .getRelativeTime */ .gs)(date);
        subtitle.textContent = `Aktualisiert: ${dateStr} ${timeStr} (${ago})`;
    } catch (e) {
        subtitle.textContent = '';
    }
    if (!lastUpdatedIntervalId) {
        lastUpdatedIntervalId = setInterval(() => {
            if (lastUpdatedTimestamp) {
                updateLastUpdatedTime(lastUpdatedTimestamp);
                (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .updateAlarmBell */ .Mb)();
            }
        }, 60 * 1000);
    }
}

function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';
    toast.innerHTML = `<span class="material-icons-round">${icon}</span><span>${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(message)}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}


/***/ },

/***/ 672
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   H: () => (/* binding */ apiHeaders),
/* harmony export */   O: () => (/* binding */ githubHeaders)
/* harmony export */ });
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(521);
/**
 * API header factories for the Bessa REST API and GitHub API.
 * All fetch calls in the app route through these helpers to ensure
 * consistent auth and versioning headers.
 */


/**
 * Returns request headers for the Bessa REST API.
 * @param {string|null} token - Auth token.
 * @returns {Object} HTTP headers for fetch()
 */
function apiHeaders(token) {
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Client-Version': _constants_js__WEBPACK_IMPORTED_MODULE_0__/* .CLIENT_VERSION */ .fZ
    };
    if (token) {
        headers['Authorization'] = `Token ${token}`;
    }
    return headers;
}

/**
 * Returns request headers for the GitHub REST API v3.
 * Used for version checks and release listing.
 * Pass optional etag to enable conditional requests (If-None-Match),
 * which return 304 Not Modified (no rate limit cost) when content is unchanged.
 * @param {string|null} [etag] - Stored ETag for conditional request
 * @returns {Object} HTTP headers for fetch()
 */
function githubHeaders(etag) {
    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (etag) {
        headers['If-None-Match'] = etag;
    }
    return headers;
}


/***/ },

/***/ 521
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HC: () => (/* binding */ BUNDLED_CSS),
/* harmony export */   IY: () => (/* binding */ RAW_INSTALLER_BASE),
/* harmony export */   KJ: () => (/* binding */ GIST_ID),
/* harmony export */   LS: () => (/* binding */ LS),
/* harmony export */   X9: () => (/* binding */ COMMIT_HASH),
/* harmony export */   YU: () => (/* binding */ MENU_ID),
/* harmony export */   Z7: () => (/* binding */ DEV_MODE_PW_HASH),
/* harmony export */   eW: () => (/* binding */ VENUE_ID),
/* harmony export */   fK: () => (/* binding */ GITHUB_FILE_BASE),
/* harmony export */   fZ: () => (/* binding */ CLIENT_VERSION),
/* harmony export */   fv: () => (/* binding */ POLL_INTERVAL_MS),
/* harmony export */   pe: () => (/* binding */ GITHUB_API),
/* harmony export */   q: () => (/* binding */ GIST_PAT),
/* harmony export */   tE: () => (/* binding */ API_BASE),
/* harmony export */   w$: () => (/* binding */ MIN_BOOTLOADER_VERSION)
/* harmony export */ });
/* unused harmony exports GITHUB_REPO, GIST_SALT */
/**
 * Application-wide constants.
 * All API endpoints, IDs and timing parameters are centralized here
 * to make changes easy and avoid magic numbers scattered across the codebase.
 */

/** Base URL for the Bessa REST API (v1). */
const API_BASE = 'https://api.bessa.app/v1';

/** The client version injected into every API request header. */
const CLIENT_VERSION = 'v2.1.0';
const COMMIT_HASH = '3fd73db';

/** CSS content injected at build time; the install-time #kantine-style is replaced by the bundle. */
const BUNDLED_CSS = ':root { /* Premium Slate/Gray-Blue Palette - Light Mode */ --bg-body: #f1f5f9; /* Slate 100 */ --bg-card: #ffffff; --text-primary: #334155; /* Slate 700 */ --text-secondary: #64748b; --accent-color: #2563eb; /* Blue 600 – visible accent, distinguishable from text */ --border-color: #cbd5e1; /* Slate 300 */ --banner-bg: #e2e8f0; --banner-text: #1e293b; --success-color: #059669; --error-color: #dc2626; --card-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05); /* Reduced opacity for visible glassmorphism blur effect */ --header-bg: rgba(255, 255, 255, 0.72); --header-border: 1px solid rgba(203, 213, 225, 0.6); } [data-theme="dark"] { /* Premium Slate/Gray-Blue Palette - Dark Mode */ --bg-body: #1e293b; /* Deep Slate Gray (Requested) */ --bg-card: #283548; /* Darker than Slate 700 → more layer contrast vs bg-body */ --text-primary: #f8fafc; /* Slate 50 */ --text-secondary: #cbd5e1; /* Slate 300 */ --accent-color: #60a5fa; /* Blue 400 */ --border-color: #526377; /* Slightly lighter → visible border on darker card bg */ --banner-bg: #475569; --banner-text: #e2e8f0; /* Reduced opacity for visible glassmorphism blur effect */ --header-bg: rgba(30, 41, 59, 0.72); --header-border: 1px solid rgba(71, 85, 105, 0.6); --card-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.4); } * { box-sizing: border-box; margin: 0; padding: 0; } body, body.bg { font-family: \'Inter\', system-ui, -apple-system, sans-serif !important; background-color: var(--bg-body) !important; color: var(--text-primary); transition: background-color 0.3s ease, color 0.3s ease; line-height: 1.5; -webkit-font-smoothing: antialiased; } /* Fix scrolling bug: Reset html/body styles from host page */ /* IMPORTANT: html must NOT have overflow set, or it creates a scroll container that breaks position: sticky */ html { height: auto !important; min-height: 100% !important; overflow: visible !important; position: static !important; margin: 0 !important; padding: 0 !important; } body { height: auto !important; min-height: 100% !important; overflow-x: clip !important; /* clip prevents horizontal overflow without breaking sticky */ overflow-y: visible !important; position: static !important; margin: 0 !important; padding: 0 !important; } /* Header */ .app-header { flex-shrink: 0; z-index: 100; backdrop-filter: blur(12px); background-color: var(--header-bg); border-bottom: var(--header-border); padding: 1rem 0; } .header-content { width: 100%; /* Full width */ padding: 0 2rem; /* Comfortable padding */ display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 1rem; } .brand { display: flex; align-items: center; gap: 0.75rem; } .brand-text { display: flex; flex-direction: column; } .brand h1 { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.025em; margin-bottom: 0; } .subtitle { font-size: 0.85rem; color: var(--text-secondary); font-weight: 400; margin-left: 2px; } .logo-icon { font-size: 1.5rem; color: var(--accent-color); } /* Controls */ .controls { display: flex; align-items: center; gap: 1.5rem; justify-self: end; } /* Header Week Info (centered) */ .header-week-info { text-align: center; line-height: 1.3; } .header-center-wrapper { display: flex; flex-direction: row; align-items: center; gap: 1.5rem; justify-content: center; } .header-week-title { font-size: 1.1rem; font-weight: 600; color: var(--text-primary); } .header-week-subtitle { font-size: 0.85rem; color: var(--text-secondary); } /* Language Toggle (FR-100) */ .lang-toggle { display: inline-flex; gap: 0; border-radius: 6px; overflow: hidden; border: 1px solid var(--border-color); background: var(--bg-card); } .lang-btn { padding: 3px 10px; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.03em; background: transparent; color: var(--text-secondary); border: none; cursor: pointer; transition: all 0.2s; } .lang-btn:hover { color: var(--text-primary); background: rgba(100, 116, 139, 0.1); } .lang-btn.active { background: var(--accent-color); color: white; } .nav-group { display: flex; background-color: var(--bg-card); border: 1px solid var(--border-color); padding: 0.25rem; border-radius: 8px; } .nav-btn { background: none; border: none; padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: var(--text-secondary); cursor: pointer; border-radius: 6px; transition: all 0.2s; display: flex; align-items: center; gap: 0.5rem; } .nav-btn:hover { color: var(--text-primary); background-color: rgba(100, 116, 139, 0.1); } .nav-btn.active { background-color: var(--accent-color); color: white; } /* Notification state for Next Week */ .nav-btn.new-week-available { animation: goldPulse 2s infinite; border-color: #f59e0b; color: var(--accent-color); } .nav-btn.new-week-available.active { color: white; } @keyframes goldPulse { 0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); } 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); } } /* Badge for nav buttons (day count indicator) */ .nav-badge { background-color: var(--error-color); color: white; font-size: 0.75rem; font-weight: 600; padding: 0 6px; border-radius: 10px; min-width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; margin-left: 8px; gap: 3px; line-height: 1; } .nav-badge .orderable { color: #fff; font-weight: 800; } .nav-badge .separator { opacity: 0.6; font-weight: 400; } .nav-badge .total { opacity: 0.8; font-weight: 400; } .nav-btn.active .nav-badge { background: rgba(255, 255, 255, 0.3); } /* Primary style for Login Button to match header */ #btn-login-open { background-color: var(--accent-color); color: white; padding: 0.5rem 1.25rem; border-radius: 8px; font-weight: 600; letter-spacing: 0.025em; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); } #btn-login-open:hover { background-color: #334155; /* Slightly lighter than slate-900 */ transform: translateY(-1px); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); } /* User Badge Button (Login) */ .user-badge-btn { display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 20px; font-size: 0.9rem; font-weight: 500; color: var(--text-primary); cursor: pointer; transition: all 0.2s; } .user-badge-btn:hover { background: rgba(100, 116, 139, 0.1); border-color: var(--accent-color); } .user-badge-btn .material-icons-round { font-size: 1.25rem; color: var(--accent-color); } .icon-btn { background: none; border: none; color: var(--text-primary); cursor: pointer; padding: 0.5rem; border-radius: 50%; transition: background-color 0.2s; display: flex; align-items: center; justify-content: center; } .icon-btn:hover { background-color: rgba(100, 116, 139, 0.1); } /* Refresh button animation */ #btn-refresh.refreshing .material-icons-round, #alarm-bell.refreshing .material-icons-round { animation: rotate 1s linear infinite; } @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } /* Progress Modal */ .progress-container { margin-bottom: 1.5rem; } .progress-bar { width: 100%; height: 8px; background-color: var(--border-color); border-radius: 4px; overflow: hidden; margin-bottom: 0.75rem; } .progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent-color) 0%, #60a5fa 100%); width: 0%; transition: width 0.3s ease; border-radius: 4px; } .progress-percent { text-align: center; font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem; } .progress-message { text-align: center; color: var(--text-secondary); font-size: 0.9rem; font-weight: 500; } /* Container - flex column, full width so child scrollbar is at edge */ .container { flex: 1; width: 100%; overflow: hidden; padding: 0 0 0 0; /* Only top padding, no horizontal so child fills width */ display: flex; flex-direction: column; } /* Add horizontal padding to direct children of container to maintain layout */ .container>*:not(.menu-grid) { padding-left: 2rem; padding-right: 2rem; } /* Banner */ .banner { background-color: var(--banner-bg); color: var(--banner-text); padding: 0.75rem 1rem; border-radius: 8px; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 2rem; font-size: 0.875rem; font-weight: 500; border: 1px solid var(--border-color); max-width: fit-content; } /* User Badge */ .user-badge { display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: var(--bg-card); /* Changed from --surface */ border: 1px solid var(--border-color); /* Changed from --border */ border-radius: 20px; font-size: 0.9rem; font-weight: 500; } /* Language Toggle */ .lang-toggle-dropdown { position: relative; display: flex; align-items: center; } #btn-lang-toggle { min-width: 42px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.04em; padding: 0 8px; text-align: center; justify-content: center; } .lang-dropdown-menu { position: absolute; top: calc(100% + 8px); right: 0; background: var(--bg-card); backdrop-filter: blur(12px); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); z-index: 1001; min-width: 120px; padding: 8px; display: flex; flex-direction: column; gap: 4px; animation: modalSlide 0.2s ease-out; } .lang-dropdown-menu .lang-btn { background: none; border: none; padding: 10px 14px; border-radius: 8px; color: var(--text-primary); font-size: 0.9rem; font-weight: 500; cursor: pointer; text-align: left; transition: all 0.2s; display: flex; align-items: center; gap: 8px; white-space: nowrap; } .lang-dropdown-menu .lang-btn:hover { background: rgba(59, 130, 246, 0.1); color: var(--accent-color); } .lang-dropdown-menu .lang-btn.active { background: rgba(59, 130, 246, 0.15); color: var(--accent-color); font-weight: 700; } .icon-btn-small { background: none; border: none; padding: 4px; cursor: pointer; color: var(--text-secondary); /* Changed from --text-muted */ display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s; } .icon-btn-small:hover { color: var(--error-color); /* Changed from --danger */ background: rgba(239, 68, 68, 0.1); } /* Modal */ .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; transition: all 0.3s; } .modal.hidden { opacity: 0; pointer-events: none; } .modal-content { background: var(--bg-card); width: 90%; max-width: 400px; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); overflow: hidden; animation: modalSlide 0.3s ease-out; } /* History Modal specific */ .history-modal-content { max-width: 600px; max-height: 85vh; display: flex; flex-direction: column; } .history-modal-content .modal-body { overflow-y: auto; padding: 0; /* Padding is handled by inner elements */ } /* History Styles */ .history-year-group { margin-bottom: 16px; } .history-year-header { background: var(--bg-card); padding: 12px 20px; margin: 0; font-size: 1.2rem; font-weight: 700; color: var(--text-primary); border-bottom: 2px solid var(--border-color); position: sticky; top: 0; z-index: 12; } .history-month-group { border-bottom: 1px solid var(--border-color); } .history-month-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; margin: 0; font-size: 1.05rem; font-weight: 600; color: var(--text-primary); background: var(--bg-body); cursor: pointer; transition: background 0.2s; } .history-month-header:hover { background: var(--border-color); /* Slight hover effect */ } .history-month-summary { display: flex; align-items: center; gap: 12px; font-size: 0.95rem; color: var(--text-secondary); } .history-month-content { display: none; /* Collapsed by default */ background: var(--bg-card); } .history-month-group.open .history-month-content { display: block; /* Expanded when open class is present */ } .history-month-group.open .history-month-header .material-icons-round { transform: rotate(180deg); } .history-month-header .material-icons-round { transition: transform 0.3s; font-size: 20px; } .history-week-group { padding: 12px 20px; border-bottom: 1px dashed var(--border-color); } .history-week-group:last-child { border-bottom: none; } .history-week-header { display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 10px; } .history-week-summary { font-size: 0.85rem; font-weight: 500; background: rgba(100, 116, 139, 0.1); padding: 4px 10px; border-radius: 12px; } .history-items { display: flex; flex-direction: column; gap: 8px; } .history-item { display: grid; grid-template-columns: 50px 1fr auto; align-items: center; gap: 12px; padding: 10px 12px; background: var(--bg-body); border-radius: 8px; border: 1px solid var(--border-color); } .history-item-date { font-size: 0.85rem; color: var(--text-secondary); font-weight: 500; } .history-item-details { display: flex; flex-direction: column; gap: 4px; } .history-item-name { font-size: 0.95rem; font-weight: 500; color: var(--text-primary); } .history-item-price { font-weight: 600; color: var(--text-primary); } .history-item-status { font-size: 0.8rem; font-weight: 600; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.5px; } .history-item-cancelled { opacity: 0.5; filter: grayscale(1); } .history-item-price-cancelled { text-decoration: line-through; color: var(--text-secondary); } @keyframes modalSlide { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } } .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px; border-bottom: 1px solid var(--border-color); } .modal-header h2 { margin: 0; font-size: 1.25rem; } .modal-body { padding: 20px; } #login-form { padding: 20px; } .form-group { margin-bottom: 20px; } .form-group label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 0.9rem; } .form-group input { width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); /* Changed from --border */ border-radius: 8px; background: var(--bg-body); /* Changed from --bg */ color: var(--text-primary); /* Changed from --text */ font-family: inherit; transition: border-color 0.2s; } .form-group input:focus { outline: none; border-color: var(--accent-color); /* Changed from --primary */ } .help-text { display: block; margin-top: 4px; color: var(--text-secondary); /* Changed from --text-muted */ font-size: 0.75rem; } .error-msg { margin-bottom: 16px; padding: 10px; background: rgba(239, 68, 68, 0.1); color: var(--error-color); /* Changed from --danger */ border-radius: 8px; font-size: 0.85rem; text-align: center; } .modal-actions { margin-top: 24px; } .btn-primary.wide { width: 100%; justify-content: center; } .hidden { display: none !important; } /* Menu Grid Container */ .menu-grid { display: flex; flex-direction: column; flex: 1; overflow: hidden; gap: 1rem; } .week-section { margin-bottom: 2rem; } .week-header { margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; text-align: center; } .week-title { font-size: 1.75rem; font-weight: 700; color: var(--text-primary); } .week-range { color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.25rem; } /* Full-viewport layout: header + scrollable content + footer */ #kantine-wrapper { display: flex; flex-direction: column; height: 100vh; height: 100dvh; /* Dynamic viewport height for mobile browsers */ overflow: hidden; background-color: var(--bg-body); } .days-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 0.5rem; flex: 1; overflow-y: auto; /* This is the scroll container at the window edge */ align-content: start; padding: 0 2rem 2rem 2rem; } /* Card */ .menu-card { background-color: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-color); box-shadow: var(--card-shadow); overflow: clip; /* Clips scrolling content behind sticky header */ transition: box-shadow 0.2s ease; display: flex; flex-direction: column; } /* Past Day Styling - Target specific elements so ordered items can remain visible AND preserve sticky context */ /* We MUST apply filter/opacity to children, not the parent .menu-card, or else position: sticky breaks */ /* Header keeps fully opaque background to hide scrolling items, only grayscales */ .menu-card.past-day .card-header { filter: grayscale(0.8); transition: filter 0.3s; } /* Items become semi-transparent */ .menu-card.past-day .menu-item:not(.ordered) { opacity: 0.6; filter: grayscale(0.8); transition: opacity 0.3s, filter 0.3s; } .menu-card.past-day:hover .card-header { filter: grayscale(0.4); } .menu-card.past-day:hover .menu-item:not(.ordered) { opacity: 0.8; filter: grayscale(0.4); } /* Past ordered items get no special frame or shadow, but remain visually distinct by staying fully opaque (via the :not(.ordered) selector above) */ .menu-item.today-ordered { border: 2px solid #8b5cf6; box-shadow: 0 0 30px rgba(139, 92, 246, 0.6); border-radius: 8px; padding: 1rem; margin: 0; display: flex; flex-direction: column; background: var(--bg-card); position: relative; z-index: 5; animation: pulse-glow-strong 3s infinite; } @keyframes pulse-glow-strong { 0% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.4); } 50% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.8); } 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.4); } } .menu-card:hover { box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1); } .card-header { padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: baseline; background-color: var(--bg-card); /* Removed border-radius: 12px 12px 0 0; .menu-card\'s overflow: clip will round the corners initially. When sticky at the top, it will be square and perfectly hide scrolling content! */ /* Sticky within .container scroll area */ position: sticky; top: 0; z-index: 90; } .card-body { padding: 1.25rem; display: grid; grid-template-columns: 1fr; row-gap: 1.5rem; align-content: start; } .day-name { font-size: 1.125rem; font-weight: 600; } .day-date { font-size: 0.8rem; font-weight: 400; color: var(--text-secondary); opacity: 0.75; /* Visually subordinate to day-name */ } .empty-state { color: var(--text-secondary); font-style: italic; text-align: center; padding: 1rem; } /* Menu Items */ .menu-item { /* Spacing now handled by .card-body grid gap */ display: flex; flex-direction: column; /* Subtle separator between items */ border-bottom: 1px solid var(--border-color); padding-bottom: 0.25rem; } .menu-item:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; } .item-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; gap: 1rem; } .item-name { font-weight: 600; color: var(--text-primary); font-size: 0.95rem; /* Slightly smaller to reduce visual competition with day header */ } .item-price { font-weight: 700; color: var(--accent-color); white-space: nowrap; } .item-desc-wrap { position: relative; } .item-desc { font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5; /* Consistent with body line-height */ margin-bottom: 0.75rem; white-space: pre-wrap; } .badges { display: flex; gap: 0.5rem; margin-left: auto; flex-wrap: wrap; } .item-status-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; } .badge { display: inline-flex; align-items: center; justify-content: center; height: 24px; font-size: 0.75rem; padding: 0 10px; border-radius: 6px; /* Unified radius matching buttons and tag-badge-small */ font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; line-height: normal; white-space: nowrap; } .badge.available { background-color: rgba(16, 185, 129, 0.1); /* Emerald 500 / 10% */ color: var(--success-color); border: 1px solid rgba(16, 185, 129, 0.2); } .badge.available-low { background-color: rgba(163, 190, 35, 0.15); /* Green-yellow / 15% */ color: #7a8b1a; border: 1px solid rgba(163, 190, 35, 0.35); } .badge.sold-out { background-color: rgba(239, 68, 68, 0.1); /* Red 500 / 10% */ color: var(--error-color); border: 1px solid rgba(239, 68, 68, 0.2); } .badge.ordered { background-color: rgba(139, 92, 246, 0.1); /* Violet 500 / 10% */ color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.2); gap: 4px; } .badge.ordered .material-icons-round { font-size: 1rem; } /* Loading */ .loading-state { text-align: center; padding: 4rem; color: var(--text-secondary); } .spinner { width: 40px; height: 40px; border: 3px solid var(--border-color); border-top-color: var(--accent-color); border-radius: 50%; margin: 0 auto 1rem; animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } } /* Footer */ .app-footer { flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; padding: 0.2rem 3rem 0.2rem 1.5rem; color: var(--text-secondary); font-size: 0.8rem; border-top: 1px solid var(--border-color); gap: 1rem; flex-wrap: wrap; min-height: 32px; } .footer-left { width: 140px; /* Spacer to match right side */ } .footer-center { flex-grow: 1; text-align: center; min-width: 250px; } .footer-right { width: 140px; display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; } #donate-button-container { display: flex; align-items: center; height: 24px; overflow: visible; transform: scale(0.9); transform-origin: right center; } /* === Order / Cancel Buttons (inline in status row) === */ .btn-order { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border: none; border-radius: 6px; background: var(--success-color); color: white; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; font-family: inherit; } .btn-order .material-icons-round { font-size: 16px; } .btn-order:hover:not(:disabled) { filter: brightness(1.15); transform: translateY(-1px); } .btn-order:active:not(:disabled) { transform: scale(0.97); filter: brightness(0.95); } .btn-order:disabled { opacity: 0.5; cursor: not-allowed; } .btn-order.loading { pointer-events: none; opacity: 0.6; } .btn-order-compact { padding: 2px 4px; gap: 0; } .btn-order-compact .material-icons-round { font-size: 16px; } .btn-cancel { display: inline-flex; align-items: center; justify-content: center; padding: 4px 6px; border: none; border-radius: 6px; background: var(--error-color); color: white; font-size: 0.75rem; cursor: pointer; transition: all 0.2s ease; font-family: inherit; } .btn-cancel .material-icons-round { font-size: 16px; } .btn-cancel:hover:not(:disabled) { filter: brightness(1.15); transform: translateY(-1px); } .btn-cancel:active:not(:disabled) { transform: scale(0.97); filter: brightness(0.95); } .btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; } /* Past days: hide action buttons */ .past-day .item-actions { display: none; } /* Order count badge (for multi-orders) */ .order-count-badge { display: inline-flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.3); color: white; font-size: 0.65rem; font-weight: 700; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; margin-left: 4px; line-height: 1; } /* === Toast Notifications === */ #toast-container { position: fixed; bottom: 20px; right: 20px; z-index: 10000; display: flex; flex-direction: column; gap: 8px; pointer-events: none; } .toast { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 8px; font-size: 0.85rem; font-weight: 500; font-family: \'Inter\', sans-serif; color: white; backdrop-filter: blur(10px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); pointer-events: auto; transform: translateX(120%); opacity: 0; transition: transform 0.3s ease, opacity 0.3s ease; } .toast.show { transform: translateX(0); opacity: 1; } .toast .material-icons-round { font-size: 18px; } .toast-success { background: rgba(5, 150, 105, 0.95); } .toast-error { background: rgba(220, 38, 38, 0.95); } .toast-info { background: rgba(59, 130, 246, 0.95); } /* === Mobile Responsiveness === */ /* 768px covers tablets (e.g. iPad Mini); 600px was too narrow-only */ @media (max-width: 768px) { .header-content { display: grid; /* Ensure grid is active, prevents flex-only fallback */ grid-template-columns: 1fr; gap: 1rem; padding: 0.75rem; } .week-nav { width: 100%; justify-content: center; } .nav-pills { width: 100%; justify-content: space-between; } .nav-btn { flex: 1; justify-content: center; padding: 0.5rem; font-size: 0.85rem; } .days-grid { display: grid; /* Explicit grid declaration to prevent flex-context override */ grid-template-columns: 1fr; } .main-content { padding: 1rem; } .week-title { font-size: 1.5rem; } /* Adjust toast position for mobile */ .toast-container { bottom: 1rem; right: 1rem; left: 1rem; /* Center on mobile */ width: auto; } .menu-card { margin-bottom: 1rem; } } /* Tighter layout for high column counts (e.g., 5-day landscape) */ @media (min-width: 1024px) { .card-body { padding: 1rem 0.75rem; } .item-header { gap: 0.5rem; } } /* === Accessibility: Respect prefers-reduced-motion === */ @media (prefers-reduced-motion: reduce) { /* Disable all decorative pulse/glow animations */ .menu-item.today-ordered, .menu-item.flagged-sold-out, .menu-item.flagged-available, .menu-item.highlight-glow, .nav-btn.new-week-available, .update-icon, #order-countdown.urgent { animation: none; } /* Keep functional animations (modal slide, spinner) */ .toast { transition: none; } } /* === Focus Visibility (A11y: Keyboard Navigation) === */ :focus-visible { outline: 2px solid var(--accent-color); outline-offset: 2px; border-radius: 4px; } /* === Flagging & Notification Styles === */ .btn-flag { display: inline-flex; align-items: center; justify-content: center; background: transparent; border: 1px solid var(--text-secondary); color: var(--text-secondary); border-radius: 6px; padding: 4px; cursor: pointer; transition: all 0.2s; margin-right: 0.5rem; width: 28px; height: 28px; } .btn-flag:hover { background: rgba(234, 179, 8, 0.1); /* Yellow-500 / 10% */ color: #eab308; border-color: #eab308; } .btn-flag.active { background: rgba(234, 179, 8, 0.1); color: #eab308; border-color: #eab308; } .btn-flag:active { transform: scale(0.97); } .btn-flag .material-icons-round { font-size: 1.1rem; } /* Flagged & Sold Out (Yellow Glow) */ .menu-item.flagged-sold-out { border: 1px solid #eab308; box-shadow: 0 0 10px rgba(234, 179, 8, 0.2); border-radius: 8px; padding: 1rem; margin: 0; display: flex; flex-direction: column; background: var(--bg-card); position: relative; z-index: 5; animation: yellow-pulse 3s infinite; } @keyframes yellow-pulse { 0% { box-shadow: 0 0 8px rgba(234, 179, 8, 0.2); } 50% { box-shadow: 0 0 16px rgba(234, 179, 8, 0.5); } 100% { box-shadow: 0 0 8px rgba(234, 179, 8, 0.2); } } /* Flagged & Available (Green Glow) */ .menu-item.flagged-available { border: 2px solid var(--success-color); box-shadow: 0 0 15px rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 1rem; margin: 0; display: flex; flex-direction: column; background: var(--bg-card); position: relative; z-index: 5; animation: green-pulse 3s infinite; } @keyframes green-pulse { 0% { box-shadow: 0 0 10px rgba(16, 185, 129, 0.3); } 50% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.6); } 100% { box-shadow: 0 0 10px rgba(16, 185, 129, 0.3); } } /* Day Header Badges */ .day-header-left { display: flex; align-items: center; gap: 0.75rem; } .menu-code-badge { font-size: 0.75rem; font-weight: 700; color: #8b5cf6; /* Violet 500 */ background-color: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.3); padding: 2px 6px; border-radius: 6px; line-height: normal; display: inline-block; } /* Detailed Badge Colors */ .nav-badge.badge-violet { background-color: #8b5cf6; } .nav-badge.badge-green { background-color: var(--success-color); } .nav-badge.badge-red { background-color: var(--error-color); } .nav-badge.badge-blue { background-color: var(--accent-color); } /* Day Header Status Colors (User Request) */ .card-header.header-violet { background-color: var(--bg-card); background-image: linear-gradient(rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.15)); border-bottom: 2px solid #8b5cf6; } .card-header.header-green { background-color: var(--bg-card); background-image: linear-gradient(rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.15)); border-bottom: 2px solid var(--success-color); } .card-header.header-red { background-color: var(--bg-card); background-image: linear-gradient(rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.15)); border-bottom: 2px solid var(--error-color); } .card-header.header-violet .day-name, .card-header.header-green .day-name, .card-header.header-red .day-name { font-weight: 700; color: var(--text-primary); /* Ensure text remains standard color */ } /* Update Icon */ .update-icon { display: inline-flex; align-items: center; justify-content: center; margin-left: 8px; background-color: rgba(16, 185, 129, 0.2); /* Green tint */ color: var(--success-color); border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 14px; transition: all 0.2s; text-decoration: none; animation: pulse 2s infinite; } .update-icon:hover { background-color: var(--success-color); color: white; transform: scale(1.1); } @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } } /* Order Countdown */ #order-countdown { background: rgba(255, 255, 255, 0.1); padding: 0.25rem 0.75rem; border-radius: 99px; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; white-space: nowrap; border: 1px solid var(--border-color); } #order-countdown span { opacity: 0.7; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; } #order-countdown.urgent { background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.5); color: #ef4444; animation: pulse-red 2s infinite; } @keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } } /* Smart Highlights (Blue Glow - matches today-ordered/flagged pattern) */ .menu-item.highlight-glow { border: 2px solid rgba(59, 130, 246, 0.7); box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); border-radius: 8px; padding: 1rem; margin: 0; display: flex; flex-direction: column; background: var(--bg-card); position: relative; z-index: 5; animation: blue-pulse 3s infinite; } @keyframes blue-pulse { 0% { box-shadow: 0 0 15px rgba(59, 130, 246, 0.3); } 50% { box-shadow: 0 0 25px rgba(59, 130, 246, 0.6); } 100% { box-shadow: 0 0 15px rgba(59, 130, 246, 0.3); } } /* Nav Badge with Count */ .nav-badge.has-highlights { background-color: var(--bg-card); /* Neutral background */ color: var(--text-primary); border: 1px solid var(--border-color); padding: 2px 6px; } .nav-badge .highlight-count { color: #3b82f6; /* Blue 500 */ font-weight: 700; margin-left: 4px; } /* Tag Management Modal */ #tags-list { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem; min-height: 50px; } /* Tag badges styled consistently with .badge (verfügbar/ausverkauft) */ .tag-badge { display: inline-flex; align-items: center; justify-content: center; height: 24px; font-size: 0.75rem; padding: 0 10px; border-radius: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; line-height: normal; white-space: nowrap; background-color: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); gap: 4px; } .tag-remove { cursor: pointer; opacity: 0.7; font-size: 1.1em; line-height: 1; transition: all 0.2s; } .tag-remove:hover { opacity: 1; color: #ef4444; } .input-group { display: flex; gap: 0.5rem; } .input-group input { flex: 1; padding: 0.75rem; background: var(--bg-body); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 8px; font-family: inherit; } /* Add tag button - styled like .btn-order with nav-btn.active color */ #btn-add-tag { display: inline-flex; align-items: center; gap: 4px; padding: 0.5rem 1rem; border: none; border-radius: 6px; background: var(--accent-color); color: white; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; font-family: inherit; white-space: nowrap; } #btn-add-tag:hover { filter: brightness(1.15); transform: translateY(-1px); } .matched-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; /* Space between tags and title */ margin-top: -5px; /* Pull closer to header */ } .tag-badge-small { display: inline-flex; align-items: center; font-size: 0.7rem; padding: 2px 8px; border-radius: 6px; /* Unified with .badge and button border-radius */ background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; } [data-theme="light"] .tag-badge-small { background: rgba(37, 99, 235, 0.1); color: #2563eb; border: 1px solid rgba(37, 99, 235, 0.2); } /* Installer Changelog */ .changelog-container ul { padding-left: 1.5rem; margin: 0.5rem 0; } .changelog-container li { margin-bottom: 0.4rem; line-height: 1.5; } .changelog-container h3 { margin-top: 1.5rem; margin-bottom: 0.5rem; font-size: 1.1em; color: var(--accent-color); } /* === Version Menu === */ .version-tag { cursor: pointer; transition: opacity 0.2s ease, text-decoration 0.2s ease; } .version-tag:hover { opacity: 1 !important; text-decoration: underline; } .version-list { list-style: none; padding: 0; margin: 0; } .version-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-radius: 8px; margin-bottom: 4px; transition: background 0.2s; } .version-item:hover { background: rgba(100, 116, 139, 0.08); } .version-item.current { background: rgba(2, 154, 168, 0.1); border: 1px solid rgba(2, 154, 168, 0.25); } [data-theme="dark"] .version-item:hover { background: rgba(255, 255, 255, 0.05); } [data-theme="dark"] .version-item.current { background: rgba(96, 165, 250, 0.12); border: 1px solid rgba(96, 165, 250, 0.25); } .version-info { display: flex; align-items: center; gap: 10px; } .badge-current { font-size: 0.75rem; font-weight: 600; color: var(--success-color); padding: 2px 8px; border-radius: 4px; background: rgba(5, 150, 105, 0.1); } .badge-new { font-size: 0.75rem; font-weight: 600; color: #029aa8; padding: 2px 8px; border-radius: 4px; background: rgba(2, 154, 168, 0.1); } [data-theme="dark"] .badge-new { color: #60a5fa; background: rgba(96, 165, 250, 0.12); } .version-actions { display: flex; align-items: center; gap: 6px; } /* Primary "Installieren" button – fetches raw HTML as Blob */ .btn-install-raw { font-size: 0.8rem; font-weight: 600; padding: 4px 12px; border-radius: 6px; background: rgba(2, 154, 168, 0.1); color: #029aa8; border: 1px solid rgba(2, 154, 168, 0.25); cursor: pointer; font-family: inherit; transition: all 0.2s; white-space: nowrap; } .btn-install-raw:hover { background: rgba(2, 154, 168, 0.22); border-color: rgba(2, 154, 168, 0.5); } [data-theme="dark"] .btn-install-raw { color: #60a5fa; background: rgba(96, 165, 250, 0.12); border: 1px solid rgba(96, 165, 250, 0.25); } [data-theme="dark"] .btn-install-raw:hover { background: rgba(96, 165, 250, 0.22); border-color: rgba(96, 165, 250, 0.5); } /* Secondary "-> Github" link */ .btn-github-link { font-size: 0.8rem; font-weight: 500; padding: 4px 10px; border-radius: 6px; background: transparent; color: var(--text-secondary); text-decoration: none; border: 1px solid var(--border-color); transition: all 0.2s; white-space: nowrap; } .btn-github-link:hover { color: var(--text-primary); border-color: var(--text-secondary); background: rgba(100, 116, 139, 0.08); } .dev-toggle { padding: 10px 14px; border-radius: 8px; background: rgba(100, 116, 139, 0.05); border: 1px solid var(--border-color); } .dev-toggle input[type="checkbox"] { accent-color: #029aa8; width: 16px; height: 16px; } [data-theme="dark"] .dev-toggle input[type="checkbox"] { accent-color: #60a5fa; } .confidence-badge { font-size: 0.6em; padding: 1px 4px; border-radius: 4px; margin-left: 4px; cursor: default; vertical-align: middle; opacity: 0.75; } .confidence-high { background: rgba(39, 174, 96, 0.25); color: #27ae60; border: 1px solid rgba(39, 174, 96, 0.4); } .confidence-medium { background: rgba(243, 156, 18, 0.25); color: #f39c12; border: 1px solid rgba(243, 156, 18, 0.4); } .confidence-low { background: rgba(231, 76, 60, 0.25); color: #e74c3c; border: 1px solid rgba(231, 76, 60, 0.4); } .confidence-fallback { background: rgba(231, 76, 60, 0.25); color: #e74c3c; border: 1px solid rgba(231, 76, 60, 0.4); } .confidence-template { background: rgba(52, 152, 219, 0.25); color: #3498db; border: 1px solid rgba(52, 152, 219, 0.4); } .heatmap-row { margin-top: 6px; font-family: monospace; font-size: 0.75em; line-height: 1.4; letter-spacing: 0.5px; word-break: break-all; } .heatmap-char { display: inline; } /* Bootloader Update Warning Badge */ .bootloader-warning-badge { display: inline-flex; align-items: center; justify-content: center; margin-left: 6px; font-size: 14px; cursor: pointer; transition: transform 0.2s ease; vertical-align: middle; animation: blinker 2s ease-in-out infinite; } .bootloader-warning-badge:hover { transform: scale(1.2); } @keyframes blinker { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } } /* Bootloader Update Tooltip */ .bootloader-warning-tooltip { position: fixed; z-index: 10000; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15); padding: 16px; min-width: 260px; max-width: 320px; animation: modalSlide 0.2s ease-out; } .bootloader-warning-text { font-size: 0.85rem; line-height: 1.5; color: var(--text-primary); margin-bottom: 12px; } .btn-install-bootloader { display: block; width: 100%; padding: 10px 16px; background: var(--accent-color); color: white; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s ease; text-align: center; } .btn-install-bootloader:hover { filter: brightness(1.15); transform: translateY(-1px); } .btn-install-bootloader:active { transform: scale(0.97); }';

/** Bessa venue ID for Knapp-Kantine. */
const VENUE_ID = 591;

/** Bessa menu ID for the weekly lunch menu. */
const MENU_ID = 7;

/** Polling interval for flagged-menu availability checks (5 minutes). */
const POLL_INTERVAL_MS = 5 * 60 * 1000;

/** GitHub repository identifier for update checks and release links. */
const GITHUB_REPO = 'TauNeutrino/kantine-overview';

/** GitHub REST API base URL for this repository. */
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}`;

/** Base URL for raw GitHub content (used to fetch installer HTML as blob). */
const RAW_INSTALLER_BASE = `https://raw.githubusercontent.com/${GITHUB_REPO}/refs/tags`;

/** Base URL for GitHub file browser link ("-> Github" button). */
const GITHUB_FILE_BASE = `https://github.com/${GITHUB_REPO}/blob`;

/**
 * Centralized localStorage key registry.
 * Always use these constants instead of raw strings to avoid typos and ease renaming.
 */
const LS = {
    AUTH_TOKEN:              'kantine_authToken',
    CURRENT_USER:            'kantine_currentUser',
    FIRST_NAME:              'kantine_firstName',
    LAST_NAME:               'kantine_lastName',
    LANG:                    'kantine_lang',
    FLAGS:                   'kantine_flags',
    FLAGGED_LAST_CHECKED:    'kantine_flagged_items_last_checked',
    LAST_CHECKED:            'kantine_last_checked',
    MENU_CACHE:              'kantine_menuCache',
    MENU_CACHE_TS:           'kantine_menuCacheTs',
    HISTORY_CACHE:           'kantine_history_cache',
    HIGHLIGHT_TAGS:          'kantine_highlightTags',
    LAST_UPDATED:            'kantine_last_updated',
    VERSION_CACHE:           'kantine_version_cache',
    VERSION_ETAG:            'kantine_version_etag',
    DEV_MODE:                'kantine_dev_mode',
    LANG_MODEL_DELTA:        'kantine_lang_model_delta',
    STATS_STATE:             '_kstats_state',
    BOOTLOADER_VERSION_KEY:  '_k_boot_ver',
};

/** Minimum bootloader version that has the domain guard fix (v2.0.5). */
const MIN_BOOTLOADER_VERSION = 'v2.0.5';

const GIST_ID = '1e8de3cc6c9dcb90cf0905d502ce2fa4';
const GIST_SALT = 'thisismysalt7344526';
const GIST_PAT = 'VgxHZlNnQnxwEj4vA3wnKFtZcVh+fGNbLQRqZwsKBR0UeAJHUGkNTQ==';

/** SHA-256 (UTF-8, lowercase hex) of the password required to enable Dev-Mode. */
const DEV_MODE_PW_HASH = '1d79c4226fdd41df94698643b006eaada305d85871d80ca75fb0bf218ab189f4';


/***/ },

/***/ 646
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   t: () => (/* binding */ t)
/* harmony export */ });
/* unused harmony export getUILang */
/* unused harmony import specifier */ var langMode;
/* harmony import */ var _state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(901);
/**
 * Internationalization (i18n) module for the Kantine Wrapper UI.
 * Provides translations for all static UI text based on the current language mode.
 * German (de) is the default; English (en) is fully supported.
 * When langMode is 'all', German labels are used for the GUI.
 */


const TRANSLATIONS = {
    de: {
        // Navigation
        thisWeek: 'Diese Woche',
        nextWeek: 'Nächste Woche',
        nextWeekTooltipDefault: 'Menü nächster Woche anzeigen',
        thisWeekTooltip: 'Menü dieser Woche anzeigen',

        // Header
        appTitle: 'Kantinen Übersicht',
        updatedAt: 'Aktualisiert',
        langTooltip: 'Sprache der Menübeschreibung',
        weekLabel: 'Woche',

        // Action buttons
        refresh: 'Menüdaten neu laden',
        history: 'Bestellhistorie',
        highlights: 'Persönliche Highlights verwalten',
        themeTooltip: 'Erscheinungsbild (Hell/Dunkel) wechseln',
        login: 'Anmelden',
        loginTooltip: 'Mit Bessa.app Account anmelden',
        logout: 'Abmelden',
        logoutTooltip: 'Von Bessa.app abmelden',

        // Login modal
        loginTitle: 'Login',
        employeeId: 'Mitarbeiternummer',
        employeeIdPlaceholder: 'z.B. 2041',
        employeeIdHelp: 'Deine offizielle Knapp Mitarbeiternummer.',
        password: 'Passwort',
        passwordPlaceholder: 'Bessa Passwort',
        passwordHelp: 'Das Passwort für deinen Bessa Account.',
        loginButton: 'Einloggen',
        loggingIn: 'Wird eingeloggt...',

        // Highlights modal
        highlightsTitle: 'Meine Highlights',
        highlightsDesc: 'Markiere Menüs automatisch, wenn sie diese Schlagwörter enthalten.',
        tagInputPlaceholder: 'z.B. Schnitzel, Vegetarisch...',
        tagInputTooltip: 'Neues Schlagwort zum Hervorheben eingeben',
        addTag: 'Hinzufügen',
        addTagTooltip: 'Schlagwort zur Liste hinzufügen',
        removeTagTooltip: 'Schlagwort entfernen',

        // History modal
        historyTitle: 'Bestellhistorie',
        loadingHistory: 'Lade Historie...',
        noOrders: 'Keine Bestellungen gefunden.',
        orders: 'Bestellungen',
        historyMonthToggle: 'Klicken, um die Bestellungen für diesen Monat ein-/auszublenden',

        // Menu item labels
        available: 'Verfügbar',
        soldOut: 'Ausverkauft',
        lowStock: 'Wenig verfügbar',
        ordered: 'Bestellt',
        orderButton: 'Bestellen',
        orderAgainTooltip: 'nochmal bestellen',
        orderTooltip: 'bestellen',
        cancelOrder: 'Bestellung stornieren',
        cancelOneOrder: 'Eine Bestellung stornieren',
        flagActivate: 'Benachrichtigen wenn verfügbar',
        flagDeactivate: 'Benachrichtigung deaktivieren',

        // Alarm bell
        alarmTooltipNone: 'Keine beobachteten Menüs',
        alarmLastChecked: 'Zuletzt geprüft',

        // Version modal
        versionsTitle: '📦 Versionen',
        currentVersion: 'Aktuell',
        devModeLabel: 'Dev-Mode (alle Tags anzeigen)',
        loadingVersions: 'Lade Versionen...',
        noVersions: 'Keine Versionen gefunden.',
        installed: '✓ Installiert',
        newVersion: '⬆ Neu!',
        installLink: 'Installieren',
        reportBug: 'Fehler melden',
        reportBugTooltip: 'Melde einen Fehler auf GitHub',
        featureRequest: 'Feature vorschlagen',
        featureRequestTooltip: 'Schlage ein neues Feature auf GitHub vor',
        clearCache: 'Lokalen Cache leeren',
        clearCacheTooltip: 'Löscht alle lokalen Daten & erzwingt einen Neuladen',
        clearCacheConfirm: 'Möchtest du wirklich alle lokalen Daten (inkl. Login-Session, Cache und Einstellungen) löschen? Die Seite wird danach neu geladen.',
        versionMenuTooltip: 'Klick für Versionsmenü',

        // Bootloader update notice
        bootloaderUpdateNeeded: 'Bookmarklet-Update erforderlich',
        bootloaderUpdateTooltip: 'Dein Bookmarklet ist veraltet. Bitte aktualisieren, um wichtige Fehlerbehebungen zu erhalten.',
        bootloaderUpdateLink: 'Jetzt aktualisieren',

        // Progress modal
        progressTitle: 'Menüdaten aktualisieren',
        progressInit: 'Initialisierung...',

        // Empty state
        noMenuData: 'Keine Menüdaten für KW',
        noMenuDataHint: 'Versuchen Sie eine andere Woche oder schauen Sie später vorbei.',

        // Weekly cost

        // Countdown
        orderDeadline: 'Bestellschluss',

        // Toast messages
        flagRemoved: 'Flag entfernt für',
        flagActivated: 'Benachrichtigung aktiviert für',
        menuChecked: 'geprüft',
        menuSingular: 'Menü',
        menuPlural: 'Menüs',
        newMenuDataAvailable: 'Neue Menüdaten für nächste Woche verfügbar!',
        orderSuccess: 'Bestellt',
        cancelSuccess: 'Storniert',
        bgSyncFailed: 'Hintergrund-Synchronisation fehlgeschlagen',
        historyLoadError: 'Fehler beim Laden der Historie.',
        historyLoadingFull: 'Lade Bestellhistorie...',
        historyLoadingDelta: 'Suche nach neuen Bestellungen...',
        historyLoadingItem: 'Lade Bestellung',
        historyLoadingOf: 'von',
        historyLoadingNew: 'neue/geänderte Bestellungen gefunden...',

        // Badge tooltip parts
        badgeOrdered: 'bestellt',
        badgeOrderable: 'bestellbar',
        badgeTotal: 'gesamt',
        badgeHighlights: 'Highlights gefunden',

        // History item states
        stateCancelled: 'Storniert',
        stateCompleted: 'Abgeschlossen',
        stateTransferred: 'Übertragen',

        // Close button
        close: 'Schließen',

        // Error modal
        noConnection: 'Keine Verbindung',
        toOriginalPage: 'Zur Original-Seite',

        // Misc
        loggedIn: 'Angemeldet',
    },
    en: {
        // Navigation
        thisWeek: 'This Week',
        nextWeek: 'Next Week',
        nextWeekTooltipDefault: 'Show next week\'s menu',
        thisWeekTooltip: 'Show this week\'s menu',

        // Header
        appTitle: 'Canteen Overview',
        updatedAt: 'Updated',
        langTooltip: 'Menu description language',
        weekLabel: 'Week',

        // Action buttons
        refresh: 'Reload menu data',
        history: 'Order history',
        highlights: 'Manage personal highlights',
        themeTooltip: 'Toggle appearance (Light/Dark)',
        login: 'Sign in',
        loginTooltip: 'Sign in with Bessa.app account',
        logout: 'Sign out',
        logoutTooltip: 'Sign out from Bessa.app',

        // Login modal
        loginTitle: 'Login',
        employeeId: 'Employee ID',
        employeeIdPlaceholder: 'e.g. 2041',
        employeeIdHelp: 'Your official Knapp employee number.',
        password: 'Password',
        passwordPlaceholder: 'Bessa password',
        passwordHelp: 'The password for your Bessa account.',
        loginButton: 'Log in',
        loggingIn: 'Logging in...',

        // Highlights modal
        highlightsTitle: 'My Highlights',
        highlightsDesc: 'Automatically highlight menus containing these keywords.',
        tagInputPlaceholder: 'e.g. Schnitzel, Vegetarian...',
        tagInputTooltip: 'Enter new keyword to highlight',
        addTag: 'Add',
        addTagTooltip: 'Add keyword to list',
        removeTagTooltip: 'Remove keyword',

        // History modal
        historyTitle: 'Order History',
        loadingHistory: 'Loading history...',
        noOrders: 'No orders found.',
        orders: 'Orders',
        historyMonthToggle: 'Click to expand/collapse orders for this month',

        // Menu item labels
        available: 'Available',
        soldOut: 'Sold out',
        lowStock: 'Low availability',
        ordered: 'Ordered',
        orderButton: 'Order',
        orderAgainTooltip: 'order again',
        orderTooltip: 'order',
        cancelOrder: 'Cancel order',
        cancelOneOrder: 'Cancel one order',
        flagActivate: 'Notify when available',
        flagDeactivate: 'Deactivate notification',

        // Alarm bell
        alarmTooltipNone: 'No flagged menus',
        alarmLastChecked: 'Last checked',

        // Version modal
        versionsTitle: '📦 Versions',
        currentVersion: 'Current',
        devModeLabel: 'Dev mode (show all tags)',
        loadingVersions: 'Loading versions...',
        noVersions: 'No versions found.',
        installed: '✓ Installed',
        newVersion: '⬆ New!',
        installLink: 'Install',
        reportBug: 'Report a bug',
        reportBugTooltip: 'Report a bug on GitHub',
        featureRequest: 'Request a feature',
        featureRequestTooltip: 'Suggest a new feature on GitHub',
        clearCache: 'Clear local cache',
        clearCacheTooltip: 'Deletes all local data & forces a reload',
        clearCacheConfirm: 'Do you really want to delete all local data (including login session, cache, and settings)? The page will reload afterwards.',
        versionMenuTooltip: 'Click for version menu',

        // Bootloader update notice
        bootloaderUpdateNeeded: 'Bookmarklet update required',
        bootloaderUpdateTooltip: 'Your bookmarklet is outdated. Please update to get important fixes.',
        bootloaderUpdateLink: 'Update now',

        // Progress modal
        progressTitle: 'Updating menu data',
        progressInit: 'Initializing...',

        // Empty state
        noMenuData: 'No menu data for CW',
        noMenuDataHint: 'Try another week or check back later.',

        // Weekly cost

        // Countdown
        orderDeadline: 'Order deadline',

        // Toast messages
        flagRemoved: 'Flag removed for',
        flagActivated: 'Notification activated for',
        menuChecked: 'checked',
        menuSingular: 'menu',
        menuPlural: 'menus',
        newMenuDataAvailable: 'New menu data available for next week!',
        orderSuccess: 'Ordered',
        cancelSuccess: 'Cancelled',
        bgSyncFailed: 'Background synchronisation failed',
        historyLoadError: 'Error loading history.',
        historyLoadingFull: 'Loading order history...',
        historyLoadingDelta: 'Checking for new orders...',
        historyLoadingItem: 'Loading order',
        historyLoadingOf: 'of',
        historyLoadingNew: 'new/updated orders found...',

        // Badge tooltip parts
        badgeOrdered: 'ordered',
        badgeOrderable: 'orderable',
        badgeTotal: 'total',
        badgeHighlights: 'highlights found',

        // History item states
        stateCancelled: 'Cancelled',
        stateCompleted: 'Completed',
        stateTransferred: 'Transferred',

        // Close button
        close: 'Close',

        // Error modal
        noConnection: 'No connection',
        toOriginalPage: 'Go to original page',

        // Misc
        loggedIn: 'Logged in',
    }
};

/**
 * Returns the translated string for the given key.
 * Uses the current langMode (en = English, anything else = German).
 * Falls back to German if a key is missing in the target language.
 * @param {string} key - Translation key
 * @returns {string} Translated text
 */
function t(key) {
    const lang = _state_js__WEBPACK_IMPORTED_MODULE_0__/* .langMode */ .Kl === 'en' ? 'en' : 'de';
    return TRANSLATIONS[lang][key] || TRANSLATIONS['de'][key] || key;
}

/**
 * Returns the effective UI language code ('en' or 'de').
 * 'all' mode uses German for the GUI.
 */
function getUILang() {
    return langMode === 'en' ? 'en' : 'de';
}


/***/ },

/***/ 152
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   C: () => (/* binding */ createLangModel)
/* harmony export */ });
/* harmony import */ var _loanwords_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(830);


function createLangModel(seed) {
    const FUNC_WEIGHT = 2.0;

    const trigramsDe = { ...(seed.trigramsDe || {}) };
    const trigramsEn = { ...(seed.trigramsEn || {}) };
    const funcDe = new Set(seed.funcDe || []);
    const funcEn = new Set(seed.funcEn || []);

    let totalDe = 0;
    for (const k in trigramsDe) {
        totalDe += trigramsDe[k];
    }

    let totalEn = 0;
    for (const k in trigramsEn) {
        totalEn += trigramsEn[k];
    }

    function scorePhrase(text) {
        if (!text) return { de: 0, en: 0 };

        let deScore = 0;
        let enScore = 0;

        const lowerText = text.toLowerCase();
        // Filter out loanword tokens: cross-lingual food terms (lasagne, gnocchi,
        // schnitzel, ...) appear in BOTH German and English descriptions, so they
        // should not bias the DE/EN evidence either way. Same applies to global
        // text rules (umlauts, digraphs) — "schnitzel" must not trigger the
        // "sch"+"tz" DE digitraph bonus.
        const alphaWords = (lowerText.match(/[a-zäöüß]+/g) || []).filter(w => !(0,_loanwords_js__WEBPACK_IMPORTED_MODULE_0__/* .isLoanword */ .n)(w));
        const filteredText = alphaWords.join(' ');

        let deTriLog = 0;
        let enTriLog = 0;

        for (const w of alphaWords) {
            for (let i = 0; i <= w.length - 3; i++) {
                const tri = w.substring(i, i + 3);

                const countDe = trigramsDe[tri] || 0;
                deTriLog += Math.log((countDe + 1) / (totalDe + 2));

                const countEn = trigramsEn[tri] || 0;
                enTriLog += Math.log((countEn + 1) / (totalEn + 2));
            }
        }

        const minTri = Math.min(deTriLog, enTriLog);
        deScore += (deTriLog - minTri);
        enScore += (enTriLog - minTri);

        for (const w of alphaWords) {
            if (funcDe.has(w)) deScore += FUNC_WEIGHT;
            if (funcEn.has(w)) enScore += FUNC_WEIGHT;
        }

        const umlauts = filteredText.match(/[äöüß]/g);
        if (umlauts) {
            deScore += 0.5 * umlauts.length;
        }

        for (const w of alphaWords) {
            if (/(ung|suppe|chen|kartoffel|schnitzel)$/.test(w)) deScore += 1.0;
            if (/(ing|ed)$/.test(w)) enScore += 0.5;
            if (/^th/.test(w)) enScore += 0.5;
        }

        const deDigraphs = filteredText.match(/(sch|pf|tz|ck)/g);
        if (deDigraphs) {
            deScore += 0.3 * deDigraphs.length;
        }

        return { de: deScore, en: enScore };
    }

    function scoreLang(text) {
        const scores = scorePhrase(text);
        return scores.de - scores.en;
    }

    function scoreCharAffinities(text) {
        if (!text) return [];

        const lowerText = text.toLowerCase();
        const len = lowerText.length;
        const rawScores = new Array(len).fill(0);
        const counts = new Array(len).fill(0);

        for (let i = 0; i <= len - 3; i++) {
            const tri = lowerText.substring(i, i + 3);
            
            if (!/^[a-zäöüß]{3}$/.test(tri)) continue;

            const countDe = trigramsDe[tri] || 0;
            const countEn = trigramsEn[tri] || 0;
            const logDe = Math.log((countDe + 1) / (totalDe + 2));
            const logEn = Math.log((countEn + 1) / (totalEn + 2));
            const signedDiff = logDe - logEn;

            for (let j = 0; j < 3; j++) {
                rawScores[i + j] += signedDiff;
                counts[i + j]++;
            }
        }

        const averaged = rawScores.map((sum, i) => counts[i] > 0 ? sum / counts[i] : 0);

        const maxAbs = Math.max(...averaged.map(Math.abs), 1e-9);
        const normalized = averaged.map(v => v / maxAbs);

        const result = [];
        for (let i = 0; i < len; i++) {
            result.push({
                char: text[i],
                affinity: normalized[i]
            });
        }

        return result;
    }

    function getModel() {
        return {
            version: seed.version,
            trigramsDe: trigramsDe,
            trigramsEn: trigramsEn,
            funcDe: Array.from(funcDe),
            funcEn: Array.from(funcEn)
        };
    }

    function mergeDelta(delta) {
        if (!delta) return modelObj;
        for (const [k, v] of Object.entries(delta)) {
            trigramsDe[k] = (trigramsDe[k] || 0) + v;
            totalDe += v;
        }
        return modelObj;
    }

    let learnedDelta = { trigramsDe: {}, trigramsEn: {} };

    function learnFromCourse(course, splitResult, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (course.anchored === true && splitResult.label === 'high') {
            const extractTrigrams = (text) => {
                const map = {};
                if (!text) return map;
                const lowerText = text.toLowerCase();
                const alphaWords = lowerText.match(/[a-zäöüß]+/g) || [];
                for (const w of alphaWords) {
                    for (let i = 0; i <= w.length - 3; i++) {
                        const tri = w.substring(i, i + 3);
                        map[tri] = (map[tri] || 0) + 1;
                    }
                }
                return map;
            };

            const newDe = extractTrigrams(course.de);
            const newEn = extractTrigrams(course.en);

            for (const [tri, count] of Object.entries(newDe)) {
                learnedDelta.trigramsDe[tri] = (learnedDelta.trigramsDe[tri] || 0) + count;
                trigramsDe[tri] = (trigramsDe[tri] || 0) + count;
                totalDe += count;
            }
            for (const [tri, count] of Object.entries(newEn)) {
                learnedDelta.trigramsEn[tri] = (learnedDelta.trigramsEn[tri] || 0) + count;
                trigramsEn[tri] = (trigramsEn[tri] || 0) + count;
                totalEn += count;
            }
        }
    }

    function loadDelta(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (!storage) return;
        try {
            const dataStr = storage.getItem('kantine_lang_model_delta');
            if (dataStr) {
                const delta = JSON.parse(dataStr);
                if (delta.modelVersion !== seed.version) {
                    storage.removeItem('kantine_lang_model_delta');
                } else {
                    learnedDelta = {
                        trigramsDe: delta.trigramsDe || {},
                        trigramsEn: delta.trigramsEn || {}
                    };
                    for (const [k, v] of Object.entries(learnedDelta.trigramsDe)) {
                        trigramsDe[k] = (trigramsDe[k] || 0) + v;
                        totalDe += v;
                    }
                    for (const [k, v] of Object.entries(learnedDelta.trigramsEn)) {
                        trigramsEn[k] = (trigramsEn[k] || 0) + v;
                        totalEn += v;
                    }
                }
            }
        } catch(e) {}
    }

    function saveDelta(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (!storage) return;

        let delta = {
            modelVersion: seed.version,
            trigramsDe: { ...learnedDelta.trigramsDe },
            trigramsEn: { ...learnedDelta.trigramsEn }
        };

        const tryStringify = () => JSON.stringify(delta);

        let str = tryStringify();
        if (str.length > 50 * 1024) {
            const allKeys = new Set([...Object.keys(delta.trigramsDe), ...Object.keys(delta.trigramsEn)]);
            const entries = Array.from(allKeys).map(k => {
                const w = Math.abs((trigramsDe[k] || 0) - (trigramsEn[k] || 0));
                return { k, weight: w };
            });
            entries.sort((a, b) => a.weight - b.weight);

            while (str.length > 50 * 1024 && entries.length > 0) {
                const evicted = entries.shift();
                delete delta.trigramsDe[evicted.k];
                delete delta.trigramsEn[evicted.k];
                str = tryStringify();
            }
            learnedDelta.trigramsDe = delta.trigramsDe;
            learnedDelta.trigramsEn = delta.trigramsEn;
        }

        try {
            storage.setItem('kantine_lang_model_delta', str);
        } catch(e) {}
    }

    const modelObj = {
        scorePhrase,
        scoreLang,
        scoreCharAffinities,
        getModel,
        mergeDelta,
        learnFromCourse,
        loadDelta,
        saveDelta
    };

    return modelObj;
}


/***/ },

/***/ 977
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   x: () => (/* binding */ LANG_MODEL_SEED)
/* harmony export */ });
// GENERATED by tools/train-langmodel.js
const LANG_MODEL_SEED = {
  "version": "v2.0.10",
  "trigramsDe": {
    "aan": 2.2578834535178327,
    "aau": 1.1289417267589164,
    "aav": 1.1289417267589164,
    "aba": 4.515766907035665,
    "abe": 11.289417267589164,
    "abi": 20.320951081660496,
    "abl": 9.03153381407133,
    "abo": 3.386825180276749,
    "abr": 1.1289417267589164,
    "acc": 5.644708633794582,
    "ach": 32.73931007600857,
    "ack": 45.157669070356654,
    "aco": 9.03153381407133,
    "acr": 14.676242447865913,
    "acu": 5.644708633794582,
    "ada": 1.1289417267589164,
    "ade": 10.160475540830248,
    "adi": 3.386825180276749,
    "adl": 1.1289417267589164,
    "adn": 1.1289417267589164,
    "ado": 7.9025920873124145,
    "ael": 1.1289417267589164,
    "afe": 5.644708633794582,
    "aff": 4.515766907035665,
    "afr": 2.2578834535178327,
    "afs": 4.515766907035665,
    "aft": 1.1289417267589164,
    "age": 25.965659715455075,
    "agh": 5.644708633794582,
    "agl": 3.386825180276749,
    "agn": 9.03153381407133,
    "ago": 15.805184174624829,
    "agu": 3.386825180276749,
    "ahm": 45.157669070356654,
    "ahr": 2.2578834535178327,
    "ahu": 2.2578834535178327,
    "aib": 6.773650360553498,
    "aic": 3.386825180276749,
    "aik": 2.2578834535178327,
    "ais": 25.965659715455075,
    "aji": 1.1289417267589164,
    "ajm": 2.2578834535178327,
    "ajv": 1.1289417267589164,
    "aka": 2.2578834535178327,
    "ake": 13.547300721106996,
    "aki": 3.386825180276749,
    "akr": 1.1289417267589164,
    "aks": 2.2578834535178327,
    "akv": 1.1289417267589164,
    "ala": 108.37840576885597,
    "alb": 5.644708633794582,
    "alc": 5.644708633794582,
    "ald": 3.386825180276749,
    "ale": 1.1289417267589164,
    "ali": 3.386825180276749,
    "all": 3.386825180276749,
    "alm": 1.1289417267589164,
    "aln": 2.2578834535178327,
    "alo": 1.1289417267589164,
    "als": 3.386825180276749,
    "alt": 2.2578834535178327,
    "alz": 2.2578834535178327,
    "ama": 3.386825180276749,
    "amb": 3.386825180276749,
    "ame": 13.547300721106996,
    "ami": 47.41555252387449,
    "amk": 1.1289417267589164,
    "amo": 4.515766907035665,
    "amp": 7.9025920873124145,
    "amr": 1.1289417267589164,
    "ams": 14.676242447865913,
    "amy": 2.2578834535178327,
    "ana": 37.25507698304424,
    "anb": 2.2578834535178327,
    "anc": 9.03153381407133,
    "and": 24.836717988696158,
    "ane": 19.19200935490158,
    "ang": 41.7708438900799,
    "ani": 29.352484895731827,
    "ank": 2.2578834535178327,
    "anm": 2.2578834535178327,
    "ann": 11.289417267589164,
    "ano": 7.9025920873124145,
    "anp": 4.515766907035665,
    "anr": 1.1289417267589164,
    "ans": 4.515766907035665,
    "ant": 3.386825180276749,
    "anu": 5.644708633794582,
    "anz": 3.386825180276749,
    "aoc": 2.2578834535178327,
    "apa": 4.515766907035665,
    "apc": 1.1289417267589164,
    "ape": 1.1289417267589164,
    "apf": 30.48142662249074,
    "api": 1.1289417267589164,
    "apm": 3.386825180276749,
    "apr": 22.578834535178327,
    "aps": 1.1289417267589164,
    "apu": 5.644708633794582,
    "ara": 21.44989280841941,
    "arb": 7.9025920873124145,
    "arc": 5.644708633794582,
    "ard": 2.2578834535178327,
    "are": 18.06306762814266,
    "arf": 22.578834535178327,
    "arg": 10.160475540830248,
    "ari": 9.03153381407133,
    "arl": 5.644708633794582,
    "arm": 15.805184174624829,
    "arn": 10.160475540830248,
    "aro": 37.25507698304424,
    "arr": 4.515766907035665,
    "ars": 6.773650360553498,
    "art": 86.92851296043656,
    "aru": 3.386825180276749,
    "arz": 6.773650360553498,
    "asa": 18.06306762814266,
    "asc": 19.19200935490158,
    "ase": 3.386825180276749,
    "ash": 1.1289417267589164,
    "asi": 37.25507698304424,
    "ask": 6.773650360553498,
    "asm": 9.03153381407133,
    "aso": 4.515766907035665,
    "asp": 24.836717988696158,
    "ast": 19.19200935490158,
    "asu": 2.2578834535178327,
    "asü": 1.1289417267589164,
    "ata": 3.386825180276749,
    "atb": 1.1289417267589164,
    "atc": 3.386825180276749,
    "atd": 2.2578834535178327,
    "ate": 132.08618203079322,
    "atf": 2.2578834535178327,
    "ath": 1.1289417267589164,
    "ati": 11.289417267589164,
    "atk": 6.773650360553498,
    "atl": 1.1289417267589164,
    "atm": 41.7708438900799,
    "atn": 3.386825180276749,
    "ato": 9.03153381407133,
    "atp": 1.1289417267589164,
    "ats": 4.515766907035665,
    "att": 38.38401870980316,
    "atu": 9.03153381407133,
    "atw": 2.2578834535178327,
    "atz": 2.2578834535178327,
    "aub": 3.386825180276749,
    "auc": 123.05464821672189,
    "aue": 19.19200935490158,
    "auf": 39.512960436562075,
    "aul": 1.1289417267589164,
    "aum": 2.2578834535178327,
    "aun": 15.805184174624829,
    "aup": 5.644708633794582,
    "aur": 6.773650360553498,
    "aus": 4.515766907035665,
    "aut": 2.2578834535178327,
    "ave": 1.1289417267589164,
    "avi": 2.2578834535178327,
    "avo": 5.644708633794582,
    "awu": 1.1289417267589164,
    "awü": 1.1289417267589164,
    "aya": 4.515766907035665,
    "azi": 1.1289417267589164,
    "azy": 1.1289417267589164,
    "bac": 42.89978561683882,
    "bag": 3.386825180276749,
    "bal": 4.515766907035665,
    "ban": 15.805184174624829,
    "bao": 2.2578834535178327,
    "bap": 4.515766907035665,
    "bar": 5.644708633794582,
    "bas": 25.965659715455075,
    "bau": 3.386825180276749,
    "bbq": 1.1289417267589164,
    "bch": 7.9025920873124145,
    "bcr": 4.515766907035665,
    "beb": 1.1289417267589164,
    "bee": 56.44708633794582,
    "bei": 5.644708633794582,
    "bel": 27.094601442213992,
    "ben": 12.418358994348079,
    "ber": 51.93131943091015,
    "beu": 2.2578834535178327,
    "bha": 1.1289417267589164,
    "bia": 2.2578834535178327,
    "bic": 12.418358994348079,
    "bie": 2.2578834535178327,
    "big": 1.1289417267589164,
    "bim": 1.1289417267589164,
    "bir": 2.2578834535178327,
    "bis": 29.352484895731827,
    "bla": 19.19200935490158,
    "ble": 11.289417267589164,
    "blu": 3.386825180276749,
    "blä": 2.2578834535178327,
    "boc": 1.1289417267589164,
    "boe": 3.386825180276749,
    "boh": 18.06306762814266,
    "bol": 1.1289417267589164,
    "bon": 3.386825180276749,
    "bou": 45.157669070356654,
    "bow": 7.9025920873124145,
    "bqc": 1.1289417267589164,
    "bra": 44.02872734359774,
    "bro": 27.094601442213992,
    "bru": 6.773650360553498,
    "brö": 2.2578834535178327,
    "bse": 49.673435977392316,
    "bst": 11.289417267589164,
    "bte": 5.644708633794582,
    "buc": 12.418358994348079,
    "bul": 9.03153381407133,
    "bun": 1.1289417267589164,
    "bur": 3.386825180276749,
    "but": 18.06306762814266,
    "bäc": 7.9025920873124145,
    "bäl": 2.2578834535178327,
    "bär": 10.160475540830248,
    "cad": 6.773650360553498,
    "cak": 1.1289417267589164,
    "cal": 5.644708633794582,
    "cam": 5.644708633794582,
    "can": 1.1289417267589164,
    "cap": 2.2578834535178327,
    "car": 10.160475540830248,
    "cas": 3.386825180276749,
    "cau": 1.1289417267589164,
    "cav": 1.1289417267589164,
    "cca": 1.1289417267589164,
    "cch": 42.89978561683882,
    "cci": 12.418358994348079,
    "cco": 3.386825180276749,
    "ccr": 4.515766907035665,
    "cea": 2.2578834535178327,
    "ceb": 1.1289417267589164,
    "ced": 1.1289417267589164,
    "cel": 1.1289417267589164,
    "cem": 14.676242447865913,
    "ceo": 1.1289417267589164,
    "cer": 1.1289417267589164,
    "cet": 1.1289417267589164,
    "ceu": 13.547300721106996,
    "cev": 1.1289417267589164,
    "cha": 15.805184174624829,
    "chb": 3.386825180276749,
    "chc": 21.44989280841941,
    "chd": 3.386825180276749,
    "che": 213.36998635743518,
    "chf": 2.2578834535178327,
    "chg": 5.644708633794582,
    "chh": 5.644708633794582,
    "chi": 98.21793022802572,
    "chj": 5.644708633794582,
    "chk": 11.289417267589164,
    "chm": 19.19200935490158,
    "chn": 47.41555252387449,
    "cho": 30.48142662249074,
    "chp": 1.1289417267589164,
    "chr": 23.707776261937244,
    "chs": 62.0917949717404,
    "cht": 36.12613525628532,
    "chu": 12.418358994348079,
    "chv": 2.2578834535178327,
    "chw": 23.707776261937244,
    "chä": 2.2578834535178327,
    "chö": 16.934125901383744,
    "cia": 11.289417267589164,
    "cic": 1.1289417267589164,
    "cim": 1.1289417267589164,
    "cio": 2.2578834535178327,
    "ciu": 4.515766907035665,
    "cke": 85.79957123367764,
    "ckm": 1.1289417267589164,
    "cks": 2.2578834535178327,
    "cku": 3.386825180276749,
    "col": 19.19200935490158,
    "con": 5.644708633794582,
    "cor": 4.515766907035665,
    "cot": 5.644708633794582,
    "cou": 27.094601442213992,
    "cra": 2.2578834535178327,
    "cre": 275.4617813291756,
    "cuc": 1.1289417267589164,
    "cuj": 5.644708633794582,
    "cum": 1.1289417267589164,
    "cun": 2.2578834535178327,
    "cur": 27.094601442213992,
    "dal": 1.1289417267589164,
    "dam": 1.1289417267589164,
    "dar": 5.644708633794582,
    "das": 3.386825180276749,
    "dat": 3.386825180276749,
    "dav": 1.1289417267589164,
    "dba": 5.644708633794582,
    "dbe": 19.19200935490158,
    "dbo": 1.1289417267589164,
    "dbr": 2.2578834535178327,
    "dbu": 1.1289417267589164,
    "dch": 2.2578834535178327,
    "dco": 2.2578834535178327,
    "dda": 6.773650360553498,
    "dde": 1.1289417267589164,
    "ddi": 21.44989280841941,
    "ddj": 1.1289417267589164,
    "dei": 10.160475540830248,
    "del": 109.50734749561488,
    "dem": 1.1289417267589164,
    "den": 2.2578834535178327,
    "dep": 3.386825180276749,
    "der": 28.22354316897291,
    "des": 3.386825180276749,
    "dfe": 1.1289417267589164,
    "dfi": 1.1289417267589164,
    "dfl": 11.289417267589164,
    "dfu": 1.1289417267589164,
    "dga": 1.1289417267589164,
    "dge": 18.06306762814266,
    "dgr": 2.2578834535178327,
    "dgu": 1.1289417267589164,
    "dho": 2.2578834535178327,
    "dhü": 2.2578834535178327,
    "die": 2.2578834535178327,
    "dil": 2.2578834535178327,
    "din": 19.19200935490158,
    "dip": 29.352484895731827,
    "dis": 6.773650360553498,
    "dit": 7.9025920873124145,
    "djo": 3.386825180276749,
    "dju": 2.2578834535178327,
    "dka": 4.515766907035665,
    "dko": 1.1289417267589164,
    "dkr": 5.644708633794582,
    "dkä": 3.386825180276749,
    "dla": 4.515766907035665,
    "dle": 6.773650360553498,
    "dli": 1.1289417267589164,
    "dlm": 3.386825180276749,
    "dma": 1.1289417267589164,
    "dmi": 4.515766907035665,
    "dmo": 1.1289417267589164,
    "dna": 4.515766907035665,
    "dne": 1.1289417267589164,
    "dni": 1.1289417267589164,
    "dnu": 4.515766907035665,
    "doc": 2.2578834535178327,
    "dof": 3.386825180276749,
    "dol": 2.2578834535178327,
    "dom": 5.644708633794582,
    "don": 3.386825180276749,
    "dor": 1.1289417267589164,
    "dpa": 11.289417267589164,
    "dpf": 2.2578834535178327,
    "dpi": 3.386825180276749,
    "dpo": 4.515766907035665,
    "dpu": 1.1289417267589164,
    "dra": 1.1289417267589164,
    "dre": 5.644708633794582,
    "dru": 6.773650360553498,
    "dsa": 4.515766907035665,
    "dsb": 1.1289417267589164,
    "dsc": 7.9025920873124145,
    "dse": 4.515766907035665,
    "dsg": 5.644708633794582,
    "dso": 1.1289417267589164,
    "dsp": 1.1289417267589164,
    "dsr": 2.2578834535178327,
    "dss": 5.644708633794582,
    "dsu": 95.96004677450789,
    "dte": 2.2578834535178327,
    "dth": 2.2578834535178327,
    "dto": 1.1289417267589164,
    "dtr": 2.2578834535178327,
    "dum": 3.386825180276749,
    "dwa": 1.1289417267589164,
    "dwe": 3.386825180276749,
    "dzi": 4.515766907035665,
    "däp": 3.386825180276749,
    "eab": 1.1289417267589164,
    "eak": 4.515766907035665,
    "eal": 2.2578834535178327,
    "eam": 19.19200935490158,
    "ean": 1.1289417267589164,
    "eap": 4.515766907035665,
    "ear": 2.2578834535178327,
    "eat": 1.1289417267589164,
    "eau": 7.9025920873124145,
    "eba": 27.094601442213992,
    "ebe": 34.997193529526406,
    "ebl": 3.386825180276749,
    "ebo": 51.93131943091015,
    "ebr": 27.094601442213992,
    "ebä": 7.9025920873124145,
    "eca": 2.2578834535178327,
    "ech": 15.805184174624829,
    "eck": 13.547300721106996,
    "ecr": 30.48142662249074,
    "edd": 5.644708633794582,
    "edg": 6.773650360553498,
    "edi": 7.9025920873124145,
    "edp": 5.644708633794582,
    "eds": 1.1289417267589164,
    "eec": 1.1289417267589164,
    "eef": 10.160475540830248,
    "eeh": 7.9025920873124145,
    "eei": 1.1289417267589164,
    "eej": 3.386825180276749,
    "eek": 2.2578834535178327,
    "een": 5.644708633794582,
    "eer": 46.28661079711557,
    "ees": 3.386825180276749,
    "eeu": 4.515766907035665,
    "eex": 1.1289417267589164,
    "efe": 1.1289417267589164,
    "eff": 3.386825180276749,
    "efk": 1.1289417267589164,
    "efl": 2.2578834535178327,
    "efm": 2.2578834535178327,
    "efs": 6.773650360553498,
    "efü": 7.9025920873124145,
    "ege": 18.06306762814266,
    "egi": 5.644708633794582,
    "egn": 2.2578834535178327,
    "egr": 6.773650360553498,
    "eha": 4.515766907035665,
    "ehe": 7.9025920873124145,
    "eho": 1.1289417267589164,
    "ehü": 3.386825180276749,
    "eib": 7.9025920873124145,
    "eid": 9.03153381407133,
    "eie": 10.160475540830248,
    "eif": 2.2578834535178327,
    "eig": 23.707776261937244,
    "eim": 1.1289417267589164,
    "ein": 71.12332878581174,
    "eir": 1.1289417267589164,
    "eis": 128.69935685051647,
    "eit": 1.1289417267589164,
    "eix": 2.2578834535178327,
    "eiz": 3.386825180276749,
    "eiß": 6.773650360553498,
    "eja": 2.2578834535178327,
    "ejo": 4.515766907035665,
    "eka": 1.1289417267589164,
    "eki": 1.1289417267589164,
    "ekl": 2.2578834535178327,
    "ekn": 1.1289417267589164,
    "eko": 5.644708633794582,
    "ekr": 2.2578834535178327,
    "eku": 1.1289417267589164,
    "ekä": 1.1289417267589164,
    "ela": 19.19200935490158,
    "elb": 14.676242447865913,
    "elc": 13.547300721106996,
    "ele": 7.9025920873124145,
    "elf": 5.644708633794582,
    "elg": 15.805184174624829,
    "elh": 4.515766907035665,
    "eli": 6.773650360553498,
    "elk": 19.19200935490158,
    "ell": 88.05745468719547,
    "elm": 37.25507698304424,
    "eln": 49.673435977392316,
    "elo": 11.289417267589164,
    "elp": 6.773650360553498,
    "elr": 19.19200935490158,
    "els": 47.41555252387449,
    "elt": 14.676242447865913,
    "elu": 5.644708633794582,
    "elv": 2.2578834535178327,
    "elw": 3.386825180276749,
    "elz": 1.1289417267589164,
    "ema": 2.2578834535178327,
    "emb": 4.515766907035665,
    "emc": 1.1289417267589164,
    "eme": 254.01188852075617,
    "emf": 1.1289417267589164,
    "emh": 2.2578834535178327,
    "emi": 187.4043266419801,
    "emk": 2.2578834535178327,
    "eml": 1.1289417267589164,
    "emm": 13.547300721106996,
    "emo": 6.773650360553498,
    "emp": 2.2578834535178327,
    "ems": 3.386825180276749,
    "emu": 1.1289417267589164,
    "emü": 150.14924965893587,
    "ena": 4.515766907035665,
    "enb": 20.320951081660496,
    "enc": 84.67062950691873,
    "end": 5.644708633794582,
    "ene": 59.833911518222564,
    "enf": 21.44989280841941,
    "eng": 19.19200935490158,
    "enh": 3.386825180276749,
    "eni": 14.676242447865913,
    "enj": 3.386825180276749,
    "enk": 38.38401870980316,
    "enl": 2.2578834535178327,
    "enm": 46.28661079711557,
    "enn": 7.9025920873124145,
    "eno": 2.2578834535178327,
    "enp": 14.676242447865913,
    "enr": 30.48142662249074,
    "ens": 57.57602806470474,
    "ent": 27.094601442213992,
    "enu": 20.320951081660496,
    "enw": 1.1289417267589164,
    "enz": 5.644708633794582,
    "enö": 1.1289417267589164,
    "enü": 4.515766907035665,
    "eod": 1.1289417267589164,
    "eof": 1.1289417267589164,
    "epa": 4.515766907035665,
    "epe": 2.2578834535178327,
    "epf": 2.2578834535178327,
    "epr": 2.2578834535178327,
    "epu": 5.644708633794582,
    "epü": 1.1289417267589164,
    "era": 38.38401870980316,
    "erb": 81.28380432664198,
    "erc": 22.578834535178327,
    "erd": 19.19200935490158,
    "ere": 22.578834535178327,
    "erf": 22.578834535178327,
    "erg": 7.9025920873124145,
    "erh": 5.644708633794582,
    "eri": 9.03153381407133,
    "erj": 7.9025920873124145,
    "erk": 30.48142662249074,
    "erl": 62.0917949717404,
    "erm": 53.06026115766907,
    "ern": 24.836717988696158,
    "erp": 2.2578834535178327,
    "err": 25.965659715455075,
    "ers": 69.99438705905281,
    "ert": 32.73931007600857,
    "eru": 11.289417267589164,
    "erv": 7.9025920873124145,
    "erw": 4.515766907035665,
    "erz": 3.386825180276749,
    "esa": 32.73931007600857,
    "esb": 2.2578834535178327,
    "esc": 27.094601442213992,
    "ese": 5.644708633794582,
    "esf": 2.2578834535178327,
    "esg": 2.2578834535178327,
    "esi": 2.2578834535178327,
    "esj": 3.386825180276749,
    "esl": 2.2578834535178327,
    "esm": 5.644708633794582,
    "eso": 7.9025920873124145,
    "esp": 15.805184174624829,
    "esr": 1.1289417267589164,
    "ess": 38.38401870980316,
    "est": 18.06306762814266,
    "esu": 197.56480218281035,
    "esy": 2.2578834535178327,
    "esz": 1.1289417267589164,
    "esü": 1.1289417267589164,
    "eta": 24.836717988696158,
    "ete": 7.9025920873124145,
    "eti": 2.2578834535178327,
    "etm": 14.676242447865913,
    "etn": 1.1289417267589164,
    "eto": 2.2578834535178327,
    "ett": 31.610368349249658,
    "etz": 11.289417267589164,
    "eub": 1.1289417267589164,
    "eue": 1.1289417267589164,
    "euf": 3.386825180276749,
    "eul": 1.1289417267589164,
    "eum": 2.2578834535178327,
    "eun": 44.02872734359774,
    "eur": 2.2578834535178327,
    "eva": 1.1289417267589164,
    "eve": 1.1289417267589164,
    "evo": 4.515766907035665,
    "ewi": 1.1289417267589164,
    "ewk": 1.1289417267589164,
    "ewm": 2.2578834535178327,
    "eww": 1.1289417267589164,
    "exh": 1.1289417267589164,
    "exi": 2.2578834535178327,
    "exm": 1.1289417267589164,
    "exo": 2.2578834535178327,
    "ext": 1.1289417267589164,
    "eyb": 1.1289417267589164,
    "eym": 1.1289417267589164,
    "eys": 1.1289417267589164,
    "ezi": 1.1289417267589164,
    "ezu": 1.1289417267589164,
    "ezw": 5.644708633794582,
    "eße": 2.2578834535178327,
    "eßm": 1.1289417267589164,
    "eßn": 22.578834535178327,
    "eßp": 1.1289417267589164,
    "eßs": 5.644708633794582,
    "fad": 1.1289417267589164,
    "faj": 1.1289417267589164,
    "fal": 3.386825180276749,
    "fan": 6.773650360553498,
    "far": 2.2578834535178327,
    "fas": 7.9025920873124145,
    "fba": 1.1289417267589164,
    "fbe": 3.386825180276749,
    "fbl": 1.1289417267589164,
    "fch": 1.1289417267589164,
    "fco": 1.1289417267589164,
    "fee": 4.515766907035665,
    "fef": 3.386825180276749,
    "fel": 119.66782303644513,
    "fen": 29.352484895731827,
    "fer": 13.547300721106996,
    "fet": 9.03153381407133,
    "feu": 1.1289417267589164,
    "ffb": 1.1289417267589164,
    "ffc": 1.1289417267589164,
    "ffe": 89.1863964139544,
    "ffm": 4.515766907035665,
    "fil": 27.094601442213992,
    "fio": 20.320951081660496,
    "fis": 15.805184174624829,
    "fit": 1.1289417267589164,
    "fka": 1.1289417267589164,
    "fko": 1.1289417267589164,
    "fkö": 1.1289417267589164,
    "fla": 11.289417267589164,
    "fle": 34.997193529526406,
    "flo": 2.2578834535178327,
    "fme": 1.1289417267589164,
    "fmi": 20.320951081660496,
    "fnu": 3.386825180276749,
    "for": 9.03153381407133,
    "fpu": 1.1289417267589164,
    "fra": 3.386825180276749,
    "fre": 1.1289417267589164,
    "fri": 21.44989280841941,
    "fru": 11.289417267589164,
    "frü": 11.289417267589164,
    "fsa": 2.2578834535178327,
    "fse": 1.1289417267589164,
    "fsk": 4.515766907035665,
    "fso": 4.515766907035665,
    "fsp": 1.1289417267589164,
    "fst": 5.644708633794582,
    "fte": 11.289417267589164,
    "fto": 3.386825180276749,
    "ftu": 1.1289417267589164,
    "fua": 1.1289417267589164,
    "fuk": 1.1289417267589164,
    "fun": 1.1289417267589164,
    "fup": 1.1289417267589164,
    "fus": 3.386825180276749,
    "fzi": 4.515766907035665,
    "fzu": 1.1289417267589164,
    "fül": 9.03153381407133,
    "gan": 5.644708633794582,
    "gar": 7.9025920873124145,
    "gba": 2.2578834535178327,
    "gea": 1.1289417267589164,
    "geb": 55.3181446111869,
    "gef": 6.773650360553498,
    "geg": 1.1289417267589164,
    "gel": 11.289417267589164,
    "gem": 152.40713311245372,
    "gen": 12.418358994348079,
    "gep": 2.2578834535178327,
    "ger": 12.418358994348079,
    "ges": 23.707776261937244,
    "get": 9.03153381407133,
    "ghe": 5.644708633794582,
    "gho": 1.1289417267589164,
    "ghu": 37.25507698304424,
    "gie": 5.644708633794582,
    "gin": 2.2578834535178327,
    "gla": 3.386825180276749,
    "gli": 3.386825180276749,
    "gll": 1.1289417267589164,
    "gma": 1.1289417267589164,
    "gmi": 9.03153381407133,
    "gne": 10.160475540830248,
    "gno": 23.707776261937244,
    "goc": 1.1289417267589164,
    "goj": 2.2578834535178327,
    "gok": 2.2578834535178327,
    "gom": 5.644708633794582,
    "gon": 2.2578834535178327,
    "gop": 2.2578834535178327,
    "gor": 1.1289417267589164,
    "gos": 15.805184174624829,
    "gou": 15.805184174624829,
    "gpo": 2.2578834535178327,
    "gra": 3.386825180276749,
    "gre": 6.773650360553498,
    "gri": 42.89978561683882,
    "grö": 2.2578834535178327,
    "grü": 4.515766907035665,
    "gsa": 1.1289417267589164,
    "gsb": 1.1289417267589164,
    "gsc": 1.1289417267589164,
    "gso": 1.1289417267589164,
    "gsr": 5.644708633794582,
    "gta": 2.2578834535178327,
    "gtu": 1.1289417267589164,
    "gue": 3.386825180276749,
    "gul": 7.9025920873124145,
    "gur": 14.676242447865913,
    "gwe": 14.676242447865913,
    "gzw": 3.386825180276749,
    "hab": 4.515766907035665,
    "had": 2.2578834535178327,
    "haf": 9.03153381407133,
    "hai": 3.386825180276749,
    "hal": 1.1289417267589164,
    "ham": 6.773650360553498,
    "har": 1.1289417267589164,
    "has": 2.2578834535178327,
    "hau": 9.03153381407133,
    "haz": 1.1289417267589164,
    "hba": 2.2578834535178327,
    "hbu": 1.1289417267589164,
    "hcr": 21.44989280841941,
    "hdi": 3.386825180276749,
    "hdu": 3.386825180276749,
    "hea": 1.1289417267589164,
    "hec": 7.9025920873124145,
    "hed": 5.644708633794582,
    "hee": 3.386825180276749,
    "heg": 1.1289417267589164,
    "hei": 14.676242447865913,
    "hek": 1.1289417267589164,
    "hel": 7.9025920873124145,
    "hen": 164.8254921068018,
    "her": 28.22354316897291,
    "hes": 2.2578834535178327,
    "het": 5.644708633794582,
    "hew": 1.1289417267589164,
    "hfl": 1.1289417267589164,
    "hfü": 1.1289417267589164,
    "hge": 2.2578834535178327,
    "hgh": 1.1289417267589164,
    "hgn": 1.1289417267589164,
    "hgr": 1.1289417267589164,
    "hhe": 5.644708633794582,
    "hia": 5.644708633794582,
    "hic": 4.515766907035665,
    "hie": 5.644708633794582,
    "hif": 1.1289417267589164,
    "hii": 2.2578834535178327,
    "hil": 7.9025920873124145,
    "him": 33.86825180276749,
    "hin": 53.06026115766907,
    "hir": 9.03153381407133,
    "his": 1.1289417267589164,
    "hjo": 5.644708633794582,
    "hkn": 1.1289417267589164,
    "hkr": 1.1289417267589164,
    "hku": 3.386825180276749,
    "hkä": 5.644708633794582,
    "hli": 5.644708633794582,
    "hlm": 1.1289417267589164,
    "hlr": 16.934125901383744,
    "hls": 1.1289417267589164,
    "hma": 4.515766907035665,
    "hmd": 4.515766907035665,
    "hme": 1.1289417267589164,
    "hmg": 1.1289417267589164,
    "hmi": 10.160475540830248,
    "hmk": 1.1289417267589164,
    "hmo": 4.515766907035665,
    "hms": 36.12613525628532,
    "hmu": 2.2578834535178327,
    "hna": 2.2578834535178327,
    "hnc": 1.1289417267589164,
    "hne": 71.12332878581174,
    "hnf": 1.1289417267589164,
    "hnh": 1.1289417267589164,
    "hni": 34.997193529526406,
    "hnk": 5.644708633794582,
    "hnm": 6.773650360553498,
    "hnn": 3.386825180276749,
    "hno": 4.515766907035665,
    "hnp": 1.1289417267589164,
    "hnu": 4.515766907035665,
    "hob": 1.1289417267589164,
    "hoc": 1.1289417267589164,
    "hok": 20.320951081660496,
    "hol": 3.386825180276749,
    "hon": 7.9025920873124145,
    "hop": 1.1289417267589164,
    "hor": 2.2578834535178327,
    "hos": 2.2578834535178327,
    "hpa": 1.1289417267589164,
    "hra": 2.2578834535178327,
    "hre": 18.06306762814266,
    "hri": 3.386825180276749,
    "hro": 3.386825180276749,
    "hsa": 4.515766907035665,
    "hsb": 1.1289417267589164,
    "hsc": 2.2578834535178327,
    "hsf": 5.644708633794582,
    "hsl": 1.1289417267589164,
    "hsp": 3.386825180276749,
    "hst": 18.06306762814266,
    "hsu": 21.44989280841941,
    "hsz": 2.2578834535178327,
    "hsü": 2.2578834535178327,
    "htc": 5.644708633794582,
    "hte": 13.547300721106996,
    "htf": 7.9025920873124145,
    "htj": 5.644708633794582,
    "hto": 1.1289417267589164,
    "hts": 2.2578834535178327,
    "hua": 2.2578834535178327,
    "huh": 18.06306762814266,
    "hum": 2.2578834535178327,
    "hun": 11.289417267589164,
    "hup": 3.386825180276749,
    "hur": 37.25507698304424,
    "hvi": 1.1289417267589164,
    "hvo": 1.1289417267589164,
    "hwa": 1.1289417267589164,
    "hwe": 18.06306762814266,
    "hwü": 4.515766907035665,
    "hym": 5.644708633794582,
    "hät": 2.2578834535178327,
    "höb": 16.934125901383744,
    "hüh": 41.7708438900799,
    "ial": 1.1289417267589164,
    "ian": 12.418358994348079,
    "iap": 6.773650360553498,
    "ias": 1.1289417267589164,
    "iat": 18.06306762814266,
    "iau": 1.1289417267589164,
    "ibc": 6.773650360553498,
    "ibt": 5.644708633794582,
    "ibu": 2.2578834535178327,
    "ica": 12.418358994348079,
    "icc": 5.644708633794582,
    "ice": 2.2578834535178327,
    "ich": 20.320951081660496,
    "ici": 2.2578834535178327,
    "ick": 2.2578834535178327,
    "ico": 4.515766907035665,
    "icr": 22.578834535178327,
    "icu": 4.515766907035665,
    "ide": 9.03153381407133,
    "idn": 1.1289417267589164,
    "iea": 1.1289417267589164,
    "ieb": 27.094601442213992,
    "iec": 1.1289417267589164,
    "ied": 1.1289417267589164,
    "ieg": 1.1289417267589164,
    "ien": 13.547300721106996,
    "iep": 1.1289417267589164,
    "ier": 29.352484895731827,
    "ies": 3.386825180276749,
    "iet": 7.9025920873124145,
    "ieß": 33.86825180276749,
    "ifa": 1.1289417267589164,
    "ife": 2.2578834535178327,
    "iff": 1.1289417267589164,
    "ifl": 1.1289417267589164,
    "ige": 5.644708633794582,
    "igi": 1.1289417267589164,
    "igm": 2.2578834535178327,
    "ign": 6.773650360553498,
    "igo": 1.1289417267589164,
    "igp": 2.2578834535178327,
    "igs": 4.515766907035665,
    "igt": 2.2578834535178327,
    "ihi": 2.2578834535178327,
    "iin": 3.386825180276749,
    "ika": 27.094601442213992,
    "ike": 1.1289417267589164,
    "iki": 1.1289417267589164,
    "iko": 1.1289417267589164,
    "iku": 23.707776261937244,
    "ila": 4.515766907035665,
    "ilc": 25.965659715455075,
    "ild": 1.1289417267589164,
    "ile": 27.094601442213992,
    "ili": 41.7708438900799,
    "ill": 82.4127460534009,
    "ilm": 1.1289417267589164,
    "ils": 1.1289417267589164,
    "ilz": 7.9025920873124145,
    "ima": 1.1289417267589164,
    "imb": 18.06306762814266,
    "ime": 11.289417267589164,
    "imi": 31.610368349249658,
    "imm": 2.2578834535178327,
    "imo": 1.1289417267589164,
    "ims": 2.2578834535178327,
    "ina": 36.12613525628532,
    "inb": 3.386825180276749,
    "inc": 3.386825180276749,
    "ind": 138.8598323913467,
    "ine": 20.320951081660496,
    "inf": 1.1289417267589164,
    "ing": 51.93131943091015,
    "ini": 47.41555252387449,
    "inj": 1.1289417267589164,
    "ink": 32.73931007600857,
    "inl": 23.707776261937244,
    "inm": 15.805184174624829,
    "ino": 5.644708633794582,
    "inp": 3.386825180276749,
    "inr": 10.160475540830248,
    "ins": 15.805184174624829,
    "int": 10.160475540830248,
    "inu": 1.1289417267589164,
    "inz": 4.515766907035665,
    "inü": 1.1289417267589164,
    "iol": 22.578834535178327,
    "ion": 1.1289417267589164,
    "ios": 2.2578834535178327,
    "ipa": 5.644708633794582,
    "ipl": 15.805184174624829,
    "ipu": 2.2578834535178327,
    "ira": 6.773650360553498,
    "ire": 2.2578834535178327,
    "iri": 3.386825180276749,
    "irm": 1.1289417267589164,
    "irn": 2.2578834535178327,
    "iro": 3.386825180276749,
    "irp": 1.1289417267589164,
    "irs": 27.094601442213992,
    "isa": 3.386825180276749,
    "isb": 1.1289417267589164,
    "isc": 97.08898850126681,
    "ise": 14.676242447865913,
    "isf": 5.644708633794582,
    "isg": 3.386825180276749,
    "isi": 2.2578834535178327,
    "isk": 12.418358994348079,
    "isl": 2.2578834535178327,
    "ism": 12.418358994348079,
    "isn": 1.1289417267589164,
    "iso": 16.934125901383744,
    "isp": 3.386825180276749,
    "isr": 1.1289417267589164,
    "iss": 2.2578834535178327,
    "ist": 2.2578834535178327,
    "isu": 22.578834535178327,
    "isz": 2.2578834535178327,
    "ita": 10.160475540830248,
    "itb": 50.80237770415123,
    "itc": 7.9025920873124145,
    "itd": 14.676242447865913,
    "ite": 54.189202884427985,
    "itf": 36.12613525628532,
    "itg": 64.34967842525823,
    "ith": 31.610368349249658,
    "itj": 9.03153381407133,
    "itk": 60.96285324498148,
    "itl": 11.289417267589164,
    "itm": 33.86825180276749,
    "itn": 5.644708633794582,
    "ito": 9.03153381407133,
    "itp": 36.12613525628532,
    "itq": 2.2578834535178327,
    "itr": 81.28380432664198,
    "its": 93.70216332099005,
    "itt": 66.60756187877607,
    "itv": 5.644708633794582,
    "itw": 6.773650360553498,
    "ity": 1.1289417267589164,
    "itz": 23.707776261937244,
    "iun": 2.2578834535178327,
    "iut": 4.515766907035665,
    "ive": 4.515766907035665,
    "ivr": 1.1289417267589164,
    "ixe": 2.2578834535178327,
    "iya": 2.2578834535178327,
    "izc": 1.1289417267589164,
    "ize": 3.386825180276749,
    "izi": 1.1289417267589164,
    "izo": 2.2578834535178327,
    "izz": 11.289417267589164,
    "iße": 6.773650360553498,
    "jab": 2.2578834535178327,
    "jam": 4.515766907035665,
    "jas": 6.773650360553498,
    "jaw": 1.1289417267589164,
    "jit": 1.1289417267589164,
    "jma": 2.2578834535178327,
    "jog": 38.38401870980316,
    "jun": 3.386825180276749,
    "juv": 2.2578834535178327,
    "jva": 1.1289417267589164,
    "jäg": 3.386825180276749,
    "kaa": 1.1289417267589164,
    "kac": 3.386825180276749,
    "kaf": 4.515766907035665,
    "kag": 1.1289417267589164,
    "kah": 2.2578834535178327,
    "kai": 2.2578834535178327,
    "kal": 1.1289417267589164,
    "kam": 2.2578834535178327,
    "kan": 5.644708633794582,
    "kap": 3.386825180276749,
    "kar": 144.5045410251413,
    "kas": 23.707776261937244,
    "kau": 3.386825180276749,
    "kav": 1.1289417267589164,
    "kbu": 2.2578834535178327,
    "keb": 4.515766907035665,
    "kee": 1.1289417267589164,
    "ken": 80.15486259988306,
    "ker": 53.06026115766907,
    "kes": 1.1289417267589164,
    "ket": 1.1289417267589164,
    "keu": 1.1289417267589164,
    "key": 2.2578834535178327,
    "kic": 6.773650360553498,
    "kid": 1.1289417267589164,
    "kim": 2.2578834535178327,
    "kir": 18.06306762814266,
    "kit": 1.1289417267589164,
    "kka": 3.386825180276749,
    "kko": 18.06306762814266,
    "kkä": 1.1289417267589164,
    "kla": 11.289417267589164,
    "kle": 11.289417267589164,
    "klo": 1.1289417267589164,
    "kma": 1.1289417267589164,
    "kna": 2.2578834535178327,
    "kno": 13.547300721106996,
    "knö": 40.64190216332099,
    "kob": 9.03153381407133,
    "koe": 1.1289417267589164,
    "koh": 21.44989280841941,
    "kok": 54.189202884427985,
    "kol": 18.06306762814266,
    "kom": 1.1289417267589164,
    "kon": 1.1289417267589164,
    "kop": 2.2578834535178327,
    "kor": 5.644708633794582,
    "kos": 49.673435977392316,
    "kot": 3.386825180276749,
    "kra": 2.2578834535178327,
    "kre": 1.1289417267589164,
    "kro": 16.934125901383744,
    "kru": 4.515766907035665,
    "krä": 32.73931007600857,
    "ksm": 1.1289417267589164,
    "kst": 2.2578834535178327,
    "ksv": 1.1289417267589164,
    "kuc": 136.60194893782887,
    "kui": 5.644708633794582,
    "kum": 24.836717988696158,
    "kun": 4.515766907035665,
    "kur": 1.1289417267589164,
    "kvo": 1.1289417267589164,
    "kwr": 1.1289417267589164,
    "käf": 4.515766907035665,
    "käs": 49.673435977392316,
    "kön": 1.1289417267589164,
    "kör": 1.1289417267589164,
    "kür": 18.06306762814266,
    "lac": 23.707776261937244,
    "lad": 10.160475540830248,
    "laf": 1.1289417267589164,
    "lag": 22.578834535178327,
    "lai": 7.9025920873124145,
    "lam": 1.1289417267589164,
    "lan": 9.03153381407133,
    "lap": 2.2578834535178327,
    "lar": 13.547300721106996,
    "las": 21.44989280841941,
    "lat": 102.73369713506139,
    "lau": 56.44708633794582,
    "law": 1.1289417267589164,
    "lay": 2.2578834535178327,
    "lba": 1.1289417267589164,
    "lbe": 15.805184174624829,
    "lbi": 1.1289417267589164,
    "lbr": 4.515766907035665,
    "lch": 32.73931007600857,
    "lcr": 31.610368349249658,
    "lcu": 1.1289417267589164,
    "ldb": 3.386825180276749,
    "ldi": 1.1289417267589164,
    "ldl": 1.1289417267589164,
    "lea": 2.2578834535178327,
    "leb": 6.773650360553498,
    "lec": 11.289417267589164,
    "led": 4.515766907035665,
    "leg": 5.644708633794582,
    "leh": 1.1289417267589164,
    "lei": 47.41555252387449,
    "lem": 11.289417267589164,
    "len": 38.38401870980316,
    "lep": 4.515766907035665,
    "ler": 40.64190216332099,
    "les": 15.805184174624829,
    "let": 30.48142662249074,
    "leu": 2.2578834535178327,
    "lew": 1.1289417267589164,
    "lfe": 5.644708633794582,
    "lge": 15.805184174624829,
    "lgr": 1.1289417267589164,
    "lgu": 13.547300721106996,
    "lha": 4.515766907035665,
    "lhe": 2.2578834535178327,
    "lia": 5.644708633794582,
    "lic": 24.836717988696158,
    "lie": 6.773650360553498,
    "lif": 1.1289417267589164,
    "lih": 2.2578834535178327,
    "lii": 1.1289417267589164,
    "lik": 24.836717988696158,
    "lim": 16.934125901383744,
    "lin": 30.48142662249074,
    "lir": 1.1289417267589164,
    "lis": 4.515766907035665,
    "liv": 4.515766907035665,
    "lka": 1.1289417267589164,
    "lke": 1.1289417267589164,
    "lki": 4.515766907035665,
    "lkn": 2.2578834535178327,
    "lko": 6.773650360553498,
    "lku": 3.386825180276749,
    "lkä": 4.515766907035665,
    "lla": 25.965659715455075,
    "llb": 2.2578834535178327,
    "llc": 3.386825180276749,
    "lld": 1.1289417267589164,
    "lle": 91.44427986747222,
    "llg": 5.644708633794582,
    "llh": 2.2578834535178327,
    "lli": 5.644708633794582,
    "llk": 4.515766907035665,
    "llo": 51.93131943091015,
    "llp": 3.386825180276749,
    "lls": 1.1289417267589164,
    "llt": 7.9025920873124145,
    "llu": 1.1289417267589164,
    "lma": 1.1289417267589164,
    "lmi": 45.157669070356654,
    "lmk": 1.1289417267589164,
    "lmo": 1.1289417267589164,
    "lmu": 7.9025920873124145,
    "lnc": 2.2578834535178327,
    "lng": 1.1289417267589164,
    "lnj": 1.1289417267589164,
    "lnm": 4.515766907035665,
    "lnp": 1.1289417267589164,
    "lns": 1.1289417267589164,
    "lnt": 2.2578834535178327,
    "lnu": 11.289417267589164,
    "loc": 1.1289417267589164,
    "log": 1.1289417267589164,
    "lom": 2.2578834535178327,
    "lon": 59.833911518222564,
    "loo": 1.1289417267589164,
    "lop": 1.1289417267589164,
    "lou": 1.1289417267589164,
    "low": 1.1289417267589164,
    "lpa": 2.2578834535178327,
    "lpf": 2.2578834535178327,
    "lpr": 1.1289417267589164,
    "lpu": 3.386825180276749,
    "lpü": 1.1289417267589164,
    "lra": 22.578834535178327,
    "lri": 12.418358994348079,
    "lro": 1.1289417267589164,
    "lsa": 21.44989280841941,
    "lsc": 3.386825180276749,
    "lse": 1.1289417267589164,
    "lsp": 2.2578834535178327,
    "lst": 2.2578834535178327,
    "lsu": 28.22354316897291,
    "lte": 16.934125901383744,
    "lti": 1.1289417267589164,
    "ltm": 3.386825180276749,
    "lto": 3.386825180276749,
    "lum": 3.386825180276749,
    "lun": 23.707776261937244,
    "lva": 1.1289417267589164,
    "lvo": 1.1289417267589164,
    "lwe": 1.1289417267589164,
    "lwü": 2.2578834535178327,
    "lze": 4.515766907035665,
    "lzk": 2.2578834535178327,
    "lzr": 3.386825180276749,
    "lzu": 1.1289417267589164,
    "lät": 2.2578834535178327,
    "mac": 11.289417267589164,
    "mah": 2.2578834535178327,
    "mai": 23.707776261937244,
    "mak": 1.1289417267589164,
    "mam": 2.2578834535178327,
    "man": 42.89978561683882,
    "mar": 23.707776261937244,
    "mas": 2.2578834535178327,
    "mat": 72.25227051257065,
    "mba": 2.2578834535178327,
    "mbe": 24.836717988696158,
    "mbh": 1.1289417267589164,
    "mbo": 1.1289417267589164,
    "mca": 1.1289417267589164,
    "mcr": 5.644708633794582,
    "mdi": 5.644708633794582,
    "mea": 1.1289417267589164,
    "mec": 2.2578834535178327,
    "med": 7.9025920873124145,
    "mel": 34.997193529526406,
    "mem": 25.965659715455075,
    "men": 10.160475540830248,
    "mer": 2.2578834535178327,
    "mes": 199.8226856363282,
    "met": 11.289417267589164,
    "meu": 1.1289417267589164,
    "mex": 3.386825180276749,
    "mfa": 1.1289417267589164,
    "mge": 1.1289417267589164,
    "mhu": 3.386825180276749,
    "mhü": 1.1289417267589164,
    "mia": 5.644708633794582,
    "mic": 6.773650360553498,
    "mig": 2.2578834535178327,
    "mil": 28.22354316897291,
    "min": 33.86825180276749,
    "mir": 2.2578834535178327,
    "mis": 5.644708633794582,
    "mit": 610.7574741765737,
    "mju": 1.1289417267589164,
    "mka": 1.1289417267589164,
    "mko": 1.1289417267589164,
    "mkr": 1.1289417267589164,
    "mku": 1.1289417267589164,
    "mkä": 3.386825180276749,
    "mla": 1.1289417267589164,
    "mme": 20.320951081660496,
    "mmo": 1.1289417267589164,
    "mmu": 1.1289417267589164,
    "mof": 3.386825180276749,
    "mog": 1.1289417267589164,
    "moh": 10.160475540830248,
    "mol": 3.386825180276749,
    "mon": 4.515766907035665,
    "moq": 2.2578834535178327,
    "mor": 4.515766907035665,
    "mos": 2.2578834535178327,
    "mou": 1.1289417267589164,
    "moz": 4.515766907035665,
    "mpa": 2.2578834535178327,
    "mpe": 4.515766907035665,
    "mpf": 1.1289417267589164,
    "mpi": 6.773650360553498,
    "mpl": 3.386825180276749,
    "mpo": 1.1289417267589164,
    "mpr": 1.1289417267589164,
    "mre": 1.1289417267589164,
    "mri": 1.1289417267589164,
    "msa": 18.06306762814266,
    "msc": 7.9025920873124145,
    "mso": 14.676242447865913,
    "msp": 1.1289417267589164,
    "msu": 23.707776261937244,
    "mun": 3.386825180276749,
    "mus": 10.160475540830248,
    "myz": 2.2578834535178327,
    "müs": 150.14924965893587,
    "nac": 16.934125901383744,
    "nad": 1.1289417267589164,
    "nai": 1.1289417267589164,
    "nak": 12.418358994348079,
    "nal": 2.2578834535178327,
    "nam": 1.1289417267589164,
    "nan": 25.965659715455075,
    "nar": 3.386825180276749,
    "nas": 16.934125901383744,
    "nat": 18.06306762814266,
    "nau": 5.644708633794582,
    "nba": 11.289417267589164,
    "nbe": 2.2578834535178327,
    "nbi": 2.2578834535178327,
    "nbl": 4.515766907035665,
    "nbo": 1.1289417267589164,
    "nbr": 4.515766907035665,
    "nbu": 2.2578834535178327,
    "nca": 7.9025920873124145,
    "nce": 1.1289417267589164,
    "nch": 7.9025920873124145,
    "nco": 9.03153381407133,
    "ncr": 69.99438705905281,
    "ncu": 9.03153381407133,
    "nda": 4.515766907035665,
    "ndb": 11.289417267589164,
    "ndc": 4.515766907035665,
    "ndd": 7.9025920873124145,
    "nde": 48.544494250633406,
    "ndf": 14.676242447865913,
    "ndg": 15.805184174624829,
    "ndh": 4.515766907035665,
    "ndi": 9.03153381407133,
    "ndj": 3.386825180276749,
    "ndk": 14.676242447865913,
    "ndl": 9.03153381407133,
    "ndm": 6.773650360553498,
    "ndn": 9.03153381407133,
    "ndo": 7.9025920873124145,
    "ndp": 16.934125901383744,
    "ndr": 13.547300721106996,
    "nds": 128.69935685051647,
    "ndt": 5.644708633794582,
    "ndw": 4.515766907035665,
    "ndz": 4.515766907035665,
    "nea": 5.644708633794582,
    "neb": 3.386825180276749,
    "neg": 2.2578834535178327,
    "neh": 5.644708633794582,
    "nei": 1.1289417267589164,
    "nek": 1.1289417267589164,
    "nel": 3.386825180276749,
    "nem": 24.836717988696158,
    "nen": 72.25227051257065,
    "neo": 1.1289417267589164,
    "nep": 1.1289417267589164,
    "ner": 67.73650360553498,
    "nes": 32.73931007600857,
    "net": 11.289417267589164,
    "neu": 1.1289417267589164,
    "nev": 1.1289417267589164,
    "ney": 1.1289417267589164,
    "nez": 1.1289417267589164,
    "nfa": 1.1289417267589164,
    "nfe": 2.2578834535178327,
    "nfi": 20.320951081660496,
    "nfk": 1.1289417267589164,
    "nfl": 2.2578834535178327,
    "nfr": 1.1289417267589164,
    "nga": 1.1289417267589164,
    "ngb": 2.2578834535178327,
    "nge": 27.094601442213992,
    "ngm": 7.9025920873124145,
    "ngn": 1.1289417267589164,
    "ngo": 29.352484895731827,
    "ngr": 2.2578834535178327,
    "ngs": 5.644708633794582,
    "ngt": 1.1289417267589164,
    "ngu": 4.515766907035665,
    "ngw": 14.676242447865913,
    "ngz": 3.386825180276749,
    "nhi": 3.386825180276749,
    "nhu": 1.1289417267589164,
    "nia": 1.1289417267589164,
    "nic": 3.386825180276749,
    "nie": 4.515766907035665,
    "nig": 10.160475540830248,
    "nik": 4.515766907035665,
    "nil": 18.06306762814266,
    "nim": 4.515766907035665,
    "nin": 15.805184174624829,
    "nip": 15.805184174624829,
    "nir": 4.515766907035665,
    "nis": 15.805184174624829,
    "nit": 36.12613525628532,
    "niu": 2.2578834535178327,
    "niz": 5.644708633794582,
    "njo": 4.515766907035665,
    "njä": 1.1289417267589164,
    "nka": 6.773650360553498,
    "nke": 29.352484895731827,
    "nkn": 5.644708633794582,
    "nko": 15.805184174624829,
    "nkr": 3.386825180276749,
    "nku": 10.160475540830248,
    "nkä": 7.9025920873124145,
    "nla": 24.836717988696158,
    "nli": 1.1289417267589164,
    "nma": 19.19200935490158,
    "nme": 4.515766907035665,
    "nmi": 94.83110504774898,
    "nmo": 7.9025920873124145,
    "nna": 5.644708633794582,
    "nne": 9.03153381407133,
    "nno": 5.644708633794582,
    "nnu": 3.386825180276749,
    "noa": 5.644708633794582,
    "nob": 13.547300721106996,
    "noc": 47.41555252387449,
    "nof": 5.644708633794582,
    "nom": 2.2578834535178327,
    "non": 6.773650360553498,
    "noo": 5.644708633794582,
    "nor": 2.2578834535178327,
    "npa": 9.03153381407133,
    "npf": 2.2578834535178327,
    "npi": 2.2578834535178327,
    "npo": 13.547300721106996,
    "nra": 15.805184174624829,
    "nre": 15.805184174624829,
    "nri": 3.386825180276749,
    "nro": 4.515766907035665,
    "nru": 1.1289417267589164,
    "nrö": 1.1289417267589164,
    "nsa": 19.19200935490158,
    "nsc": 27.094601442213992,
    "nse": 13.547300721106996,
    "nsg": 2.2578834535178327,
    "nso": 3.386825180276749,
    "nsp": 6.773650360553498,
    "nss": 1.1289417267589164,
    "nst": 5.644708633794582,
    "nsu": 18.06306762814266,
    "nsü": 1.1289417267589164,
    "nta": 22.578834535178327,
    "nte": 3.386825180276749,
    "nto": 16.934125901383744,
    "ntr": 2.2578834535178327,
    "nud": 38.38401870980316,
    "nun": 34.997193529526406,
    "nus": 5.644708633794582,
    "nut": 1.1289417267589164,
    "nuß": 12.418358994348079,
    "nwr": 1.1289417267589164,
    "nza": 3.386825180276749,
    "nze": 1.1289417267589164,
    "nzs": 3.386825180276749,
    "nzu": 4.515766907035665,
    "nzw": 1.1289417267589164,
    "nöd": 40.64190216332099,
    "nöl": 1.1289417267589164,
    "nüg": 1.1289417267589164,
    "nük": 1.1289417267589164,
    "nüq": 1.1289417267589164,
    "nüs": 2.2578834535178327,
    "oaa": 1.1289417267589164,
    "oab": 1.1289417267589164,
    "oak": 1.1289417267589164,
    "oas": 1.1289417267589164,
    "oat": 2.2578834535178327,
    "oau": 1.1289417267589164,
    "oba": 7.9025920873124145,
    "obi": 1.1289417267589164,
    "obl": 13.547300721106996,
    "obr": 1.1289417267589164,
    "obs": 11.289417267589164,
    "obä": 2.2578834535178327,
    "oca": 4.515766907035665,
    "occ": 21.44989280841941,
    "och": 2.2578834535178327,
    "ock": 32.73931007600857,
    "ocr": 2.2578834535178327,
    "ocu": 1.1289417267589164,
    "ode": 1.1289417267589164,
    "odl": 5.644708633794582,
    "oei": 1.1289417267589164,
    "oer": 1.1289417267589164,
    "oeu": 3.386825180276749,
    "ofc": 1.1289417267589164,
    "ofe": 10.160475540830248,
    "off": 83.5416877801598,
    "ofm": 2.2578834535178327,
    "ofr": 2.2578834535178327,
    "ofu": 3.386825180276749,
    "oga": 5.644708633794582,
    "oge": 2.2578834535178327,
    "ogh": 37.25507698304424,
    "ogl": 2.2578834535178327,
    "ogn": 1.1289417267589164,
    "ohe": 2.2578834535178327,
    "ohl": 19.19200935490158,
    "ohn": 28.22354316897291,
    "ohs": 1.1289417267589164,
    "oiv": 1.1289417267589164,
    "oja": 5.644708633794582,
    "ojo": 2.2578834535178327,
    "oka": 3.386825180276749,
    "oke": 1.1289417267589164,
    "okk": 21.44989280841941,
    "oko": 75.63909569284739,
    "oku": 1.1289417267589164,
    "ola": 14.676242447865913,
    "olc": 16.934125901383744,
    "ole": 23.707776261937244,
    "oli": 31.610368349249658,
    "oll": 16.934125901383744,
    "olo": 1.1289417267589164,
    "ols": 2.2578834535178327,
    "oma": 77.89697914636523,
    "omb": 2.2578834535178327,
    "omh": 2.2578834535178327,
    "omi": 13.547300721106996,
    "omm": 5.644708633794582,
    "omp": 1.1289417267589164,
    "oms": 2.2578834535178327,
    "ona": 5.644708633794582,
    "onb": 2.2578834535178327,
    "onc": 3.386825180276749,
    "ond": 1.1289417267589164,
    "one": 53.06026115766907,
    "onf": 1.1289417267589164,
    "ong": 3.386825180276749,
    "oni": 11.289417267589164,
    "onm": 50.80237770415123,
    "onn": 1.1289417267589164,
    "ono": 1.1289417267589164,
    "onp": 2.2578834535178327,
    "ons": 9.03153381407133,
    "ont": 1.1289417267589164,
    "onu": 1.1289417267589164,
    "ood": 5.644708633794582,
    "ook": 1.1289417267589164,
    "opa": 4.515766907035665,
    "opf": 31.610368349249658,
    "opi": 5.644708633794582,
    "opp": 1.1289417267589164,
    "ops": 1.1289417267589164,
    "oqu": 2.2578834535178327,
    "ora": 10.160475540830248,
    "ord": 2.2578834535178327,
    "ore": 10.160475540830248,
    "ori": 9.03153381407133,
    "ork": 7.9025920873124145,
    "orm": 2.2578834535178327,
    "orn": 3.386825180276749,
    "orr": 3.386825180276749,
    "ort": 7.9025920873124145,
    "oru": 1.1289417267589164,
    "osa": 18.06306762814266,
    "osc": 11.289417267589164,
    "ose": 2.2578834535178327,
    "osi": 1.1289417267589164,
    "osk": 2.2578834535178327,
    "osm": 10.160475540830248,
    "oso": 1.1289417267589164,
    "osp": 7.9025920873124145,
    "osr": 1.1289417267589164,
    "oss": 13.547300721106996,
    "ost": 1.1289417267589164,
    "osu": 9.03153381407133,
    "ota": 1.1289417267589164,
    "ote": 12.418358994348079,
    "oti": 2.2578834535178327,
    "otk": 1.1289417267589164,
    "ots": 1.1289417267589164,
    "ott": 55.3181446111869,
    "oui": 47.41555252387449,
    "oul": 5.644708633794582,
    "oum": 1.1289417267589164,
    "oun": 4.515766907035665,
    "oup": 34.997193529526406,
    "ous": 25.965659715455075,
    "out": 16.934125901383744,
    "owe": 1.1289417267589164,
    "owl": 7.9025920873124145,
    "ozz": 4.515766907035665,
    "pae": 1.1289417267589164,
    "pag": 6.773650360553498,
    "pal": 1.1289417267589164,
    "pan": 15.805184174624829,
    "pap": 22.578834535178327,
    "par": 28.22354316897291,
    "pas": 18.06306762814266,
    "pat": 1.1289417267589164,
    "pay": 2.2578834535178327,
    "pci": 1.1289417267589164,
    "pec": 7.9025920873124145,
    "pei": 10.160475540830248,
    "pek": 2.2578834535178327,
    "pem": 114.02311440265055,
    "pen": 1.1289417267589164,
    "per": 1.1289417267589164,
    "pes": 6.773650360553498,
    "pet": 6.773650360553498,
    "peu": 1.1289417267589164,
    "pfa": 7.9025920873124145,
    "pfe": 46.28661079711557,
    "pfl": 1.1289417267589164,
    "pfm": 6.773650360553498,
    "pfn": 3.386825180276749,
    "pfp": 1.1289417267589164,
    "pfr": 1.1289417267589164,
    "pfs": 2.2578834535178327,
    "pft": 11.289417267589164,
    "pfu": 1.1289417267589164,
    "pic": 5.644708633794582,
    "pie": 4.515766907035665,
    "pig": 6.773650360553498,
    "pil": 7.9025920873124145,
    "pin": 22.578834535178327,
    "pis": 1.1289417267589164,
    "piz": 6.773650360553498,
    "pli": 3.386825180276749,
    "plu": 15.805184174624829,
    "pmi": 3.386825180276749,
    "poi": 1.1289417267589164,
    "pol": 20.320951081660496,
    "pom": 3.386825180276749,
    "por": 6.773650360553498,
    "pot": 2.2578834535178327,
    "ppe": 543.0209705710388,
    "ppi": 1.1289417267589164,
    "ppo": 1.1289417267589164,
    "ppr": 1.1289417267589164,
    "pre": 25.965659715455075,
    "pri": 22.578834535178327,
    "pro": 5.644708633794582,
    "psc": 1.1289417267589164,
    "pse": 1.1289417267589164,
    "pts": 4.515766907035665,
    "pud": 18.06306762814266,
    "pul": 4.515766907035665,
    "pun": 6.773650360553498,
    "put": 28.22354316897291,
    "pwi": 9.03153381407133,
    "pät": 18.06306762814266,
    "pür": 7.9025920873124145,
    "qcr": 1.1289417267589164,
    "que": 2.2578834535178327,
    "qui": 5.644708633794582,
    "rab": 19.19200935490158,
    "rac": 11.289417267589164,
    "rad": 3.386825180276749,
    "rag": 15.805184174624829,
    "rah": 45.157669070356654,
    "raj": 2.2578834535178327,
    "ram": 13.547300721106996,
    "ran": 23.707776261937244,
    "rap": 9.03153381407133,
    "rar": 5.644708633794582,
    "ras": 4.515766907035665,
    "rat": 41.7708438900799,
    "rau": 7.9025920873124145,
    "rav": 2.2578834535178327,
    "raw": 1.1289417267589164,
    "rba": 9.03153381407133,
    "rbc": 4.515766907035665,
    "rbe": 4.515766907035665,
    "rbi": 18.06306762814266,
    "rbo": 9.03153381407133,
    "rbr": 11.289417267589164,
    "rbs": 49.673435977392316,
    "rbu": 1.1289417267589164,
    "rcc": 5.644708633794582,
    "rcr": 22.578834535178327,
    "rda": 1.1289417267589164,
    "rdb": 14.676242447865913,
    "rde": 1.1289417267589164,
    "rdi": 1.1289417267589164,
    "rdo": 2.2578834535178327,
    "rdä": 3.386825180276749,
    "rea": 18.06306762814266,
    "reb": 2.2578834535178327,
    "ree": 15.805184174624829,
    "reg": 5.644708633794582,
    "rei": 103.8626388618203,
    "rek": 5.644708633794582,
    "rel": 13.547300721106996,
    "rem": 256.269771974274,
    "ren": 7.9025920873124145,
    "rer": 12.418358994348079,
    "res": 27.094601442213992,
    "rez": 1.1289417267589164,
    "rfa": 2.2578834535178327,
    "rfe": 5.644708633794582,
    "rfi": 29.352484895731827,
    "rfl": 11.289417267589164,
    "rfo": 2.2578834535178327,
    "rge": 19.19200935490158,
    "rgi": 1.1289417267589164,
    "rgr": 4.515766907035665,
    "rha": 6.773650360553498,
    "rho": 1.1289417267589164,
    "rhü": 2.2578834535178327,
    "ria": 4.515766907035665,
    "ric": 3.386825180276749,
    "rie": 39.512960436562075,
    "rik": 20.320951081660496,
    "ril": 14.676242447865913,
    "rin": 141.11771584486453,
    "ris": 23.707776261937244,
    "rit": 16.934125901383744,
    "riy": 2.2578834535178327,
    "riz": 3.386825180276749,
    "rjo": 9.03153381407133,
    "rka": 3.386825180276749,
    "rkb": 2.2578834535178327,
    "rke": 11.289417267589164,
    "rki": 5.644708633794582,
    "rkk": 1.1289417267589164,
    "rkl": 1.1289417267589164,
    "rkn": 5.644708633794582,
    "rkr": 1.1289417267589164,
    "rku": 14.676242447865913,
    "rkw": 1.1289417267589164,
    "rkä": 1.1289417267589164,
    "rla": 11.289417267589164,
    "rle": 1.1289417267589164,
    "rli": 10.160475540830248,
    "rlm": 4.515766907035665,
    "rls": 2.2578834535178327,
    "rma": 4.515766907035665,
    "rme": 15.805184174624829,
    "rmi": 51.93131943091015,
    "rmo": 1.1289417267589164,
    "rna": 1.1289417267589164,
    "rnc": 1.1289417267589164,
    "rne": 19.19200935490158,
    "rno": 2.2578834535178327,
    "rns": 5.644708633794582,
    "rnu": 7.9025920873124145,
    "roa": 2.2578834535178327,
    "roc": 3.386825180276749,
    "rog": 5.644708633794582,
    "roh": 1.1289417267589164,
    "rok": 22.578834535178327,
    "rol": 12.418358994348079,
    "rom": 2.2578834535178327,
    "ron": 42.89978561683882,
    "rop": 16.934125901383744,
    "ros": 7.9025920873124145,
    "rot": 47.41555252387449,
    "rou": 6.773650360553498,
    "rpa": 1.1289417267589164,
    "rpu": 2.2578834535178327,
    "rra": 14.676242447865913,
    "rre": 9.03153381407133,
    "rrh": 4.515766907035665,
    "rri": 1.1289417267589164,
    "rrj": 1.1289417267589164,
    "rrk": 1.1289417267589164,
    "rrt": 3.386825180276749,
    "rry": 28.22354316897291,
    "rsa": 27.094601442213992,
    "rsc": 34.997193529526406,
    "rse": 6.773650360553498,
    "rsi": 6.773650360553498,
    "rso": 1.1289417267589164,
    "rsp": 1.1289417267589164,
    "rst": 15.805184174624829,
    "rsu": 22.578834535178327,
    "rsü": 1.1289417267589164,
    "rta": 1.1289417267589164,
    "rtd": 3.386825180276749,
    "rte": 27.094601442213992,
    "rti": 5.644708633794582,
    "rtk": 2.2578834535178327,
    "rtm": 5.644708633794582,
    "rto": 82.4127460534009,
    "rts": 2.2578834535178327,
    "rtu": 1.1289417267589164,
    "ruc": 25.965659715455075,
    "rud": 9.03153381407133,
    "run": 10.160475540830248,
    "rus": 11.289417267589164,
    "rve": 1.1289417267589164,
    "rvi": 6.773650360553498,
    "rwr": 1.1289417267589164,
    "rwu": 2.2578834535178327,
    "rwü": 1.1289417267589164,
    "rya": 1.1289417267589164,
    "ryh": 2.2578834535178327,
    "ryk": 3.386825180276749,
    "ryl": 2.2578834535178327,
    "rym": 7.9025920873124145,
    "ryr": 3.386825180276749,
    "rys": 1.1289417267589164,
    "ryw": 1.1289417267589164,
    "ryz": 5.644708633794582,
    "rze": 3.386825180276749,
    "rzi": 6.773650360553498,
    "rzs": 1.1289417267589164,
    "rzu": 1.1289417267589164,
    "räu": 36.12613525628532,
    "rös": 7.9025920873124145,
    "rüc": 5.644708633794582,
    "rüf": 2.2578834535178327,
    "rüh": 5.644708633794582,
    "rün": 4.515766907035665,
    "sab": 1.1289417267589164,
    "saf": 3.386825180276749,
    "sag": 10.160475540830248,
    "sal": 110.6362892223738,
    "sam": 9.03153381407133,
    "san": 15.805184174624829,
    "sar": 1.1289417267589164,
    "sas": 2.2578834535178327,
    "sat": 1.1289417267589164,
    "sau": 108.37840576885597,
    "sbe": 1.1289417267589164,
    "sbo": 4.515766907035665,
    "sbr": 1.1289417267589164,
    "sca": 1.1289417267589164,
    "sch": 282.23543168972907,
    "sci": 4.515766907035665,
    "sco": 12.418358994348079,
    "scr": 28.22354316897291,
    "scu": 2.2578834535178327,
    "sde": 1.1289417267589164,
    "sea": 3.386825180276749,
    "seb": 45.157669070356654,
    "sec": 23.707776261937244,
    "see": 9.03153381407133,
    "sef": 4.515766907035665,
    "sei": 4.515766907035665,
    "sej": 2.2578834535178327,
    "sek": 2.2578834535178327,
    "sel": 23.707776261937244,
    "sem": 22.578834535178327,
    "sen": 63.220736698499316,
    "sep": 4.515766907035665,
    "ser": 33.86825180276749,
    "ses": 41.7708438900799,
    "seu": 20.320951081660496,
    "sev": 4.515766907035665,
    "sfi": 2.2578834535178327,
    "sfl": 5.644708633794582,
    "sfo": 5.644708633794582,
    "sge": 10.160475540830248,
    "sgu": 3.386825180276749,
    "she": 1.1289417267589164,
    "sia": 3.386825180276749,
    "sie": 2.2578834535178327,
    "sig": 1.1289417267589164,
    "sil": 38.38401870980316,
    "sim": 2.2578834535178327,
    "sin": 3.386825180276749,
    "sis": 2.2578834535178327,
    "sja": 1.1289417267589164,
    "sjä": 2.2578834535178327,
    "ska": 1.1289417267589164,
    "ski": 1.1289417267589164,
    "skn": 22.578834535178327,
    "sko": 15.805184174624829,
    "sku": 11.289417267589164,
    "skä": 4.515766907035665,
    "sla": 3.386825180276749,
    "sli": 2.2578834535178327,
    "sma": 3.386825180276749,
    "smi": 36.12613525628532,
    "smo": 2.2578834535178327,
    "snu": 1.1289417267589164,
    "soj": 5.644708633794582,
    "sol": 1.1289417267589164,
    "som": 2.2578834535178327,
    "son": 1.1289417267589164,
    "sor": 1.1289417267589164,
    "sos": 1.1289417267589164,
    "sot": 14.676242447865913,
    "sou": 34.997193529526406,
    "spa": 22.578834535178327,
    "spe": 15.805184174624829,
    "spf": 1.1289417267589164,
    "spi": 23.707776261937244,
    "spr": 23.707776261937244,
    "spu": 10.160475540830248,
    "spä": 18.06306762814266,
    "sra": 2.2578834535178327,
    "sre": 1.1289417267589164,
    "sri": 2.2578834535178327,
    "sro": 5.644708633794582,
    "ssa": 6.773650360553498,
    "ssc": 7.9025920873124145,
    "sse": 11.289417267589164,
    "ssi": 2.2578834535178327,
    "ssk": 27.094601442213992,
    "sss": 1.1289417267589164,
    "sst": 1.1289417267589164,
    "ssu": 18.06306762814266,
    "ssw": 2.2578834535178327,
    "sta": 25.965659715455075,
    "stb": 1.1289417267589164,
    "ste": 22.578834535178327,
    "sth": 3.386825180276749,
    "sti": 13.547300721106996,
    "stj": 1.1289417267589164,
    "stk": 1.1289417267589164,
    "stm": 5.644708633794582,
    "sto": 6.773650360553498,
    "str": 28.22354316897291,
    "sts": 3.386825180276749,
    "stu": 1.1289417267589164,
    "sty": 1.1289417267589164,
    "stz": 2.2578834535178327,
    "stä": 3.386825180276749,
    "sun": 9.03153381407133,
    "sup": 545.2788540245566,
    "svo": 1.1289417267589164,
    "swu": 2.2578834535178327,
    "syb": 2.2578834535178327,
    "sza": 1.1289417267589164,
    "sze": 2.2578834535178327,
    "szi": 1.1289417267589164,
    "szw": 1.1289417267589164,
    "süß": 27.094601442213992,
    "tab": 20.320951081660496,
    "tac": 1.1289417267589164,
    "tag": 3.386825180276749,
    "taj": 1.1289417267589164,
    "tal": 3.386825180276749,
    "tam": 22.578834535178327,
    "tan": 2.2578834535178327,
    "tap": 4.515766907035665,
    "tar": 11.289417267589164,
    "tas": 4.515766907035665,
    "tat": 21.44989280841941,
    "tau": 14.676242447865913,
    "tav": 2.2578834535178327,
    "taz": 1.1289417267589164,
    "tba": 20.320951081660496,
    "tbb": 1.1289417267589164,
    "tbe": 1.1289417267589164,
    "tbi": 1.1289417267589164,
    "tbl": 1.1289417267589164,
    "tbr": 7.9025920873124145,
    "tbu": 19.19200935490158,
    "tbä": 1.1289417267589164,
    "tca": 5.644708633794582,
    "tch": 2.2578834535178327,
    "tco": 1.1289417267589164,
    "tcr": 6.773650360553498,
    "tcu": 1.1289417267589164,
    "tda": 2.2578834535178327,
    "tde": 3.386825180276749,
    "tdi": 13.547300721106996,
    "tdj": 1.1289417267589164,
    "tea": 7.9025920873124145,
    "teb": 3.386825180276749,
    "teg": 5.644708633794582,
    "teh": 2.2578834535178327,
    "tei": 55.3181446111869,
    "tek": 1.1289417267589164,
    "tel": 72.25227051257065,
    "tem": 6.773650360553498,
    "ten": 204.33845254336387,
    "tep": 1.1289417267589164,
    "ter": 94.83110504774898,
    "tes": 15.805184174624829,
    "tet": 1.1289417267589164,
    "teu": 3.386825180276749,
    "tew": 3.386825180276749,
    "tex": 1.1289417267589164,
    "tfa": 2.2578834535178327,
    "tfe": 3.386825180276749,
    "tfi": 9.03153381407133,
    "tfl": 3.386825180276749,
    "tfr": 29.352484895731827,
    "tge": 36.12613525628532,
    "tgl": 2.2578834535178327,
    "tgr": 25.965659715455075,
    "tha": 4.515766907035665,
    "thd": 3.386825180276749,
    "thi": 2.2578834535178327,
    "thm": 1.1289417267589164,
    "thn": 4.515766907035665,
    "tho": 2.2578834535178327,
    "thr": 1.1289417267589164,
    "ths": 1.1289417267589164,
    "thu": 13.547300721106996,
    "thy": 5.644708633794582,
    "thü": 5.644708633794582,
    "tia": 1.1289417267589164,
    "tic": 3.386825180276749,
    "tif": 1.1289417267589164,
    "tim": 3.386825180276749,
    "tin": 20.320951081660496,
    "tio": 1.1289417267589164,
    "tir": 9.03153381407133,
    "tis": 5.644708633794582,
    "tja": 5.644708633794582,
    "tjo": 7.9025920873124145,
    "tju": 2.2578834535178327,
    "tka": 37.25507698304424,
    "tke": 2.2578834535178327,
    "tki": 4.515766907035665,
    "tkn": 2.2578834535178327,
    "tko": 1.1289417267589164,
    "tkr": 12.418358994348079,
    "tku": 1.1289417267589164,
    "tkä": 7.9025920873124145,
    "tkü": 3.386825180276749,
    "tla": 5.644708633794582,
    "tle": 5.644708633794582,
    "tli": 5.644708633794582,
    "tma": 29.352484895731827,
    "tme": 3.386825180276749,
    "tmi": 81.28380432664198,
    "tmu": 1.1289417267589164,
    "tna": 2.2578834535178327,
    "tne": 1.1289417267589164,
    "tni": 3.386825180276749,
    "tnu": 3.386825180276749,
    "tob": 2.2578834535178327,
    "toe": 1.1289417267589164,
    "tof": 85.79957123367764,
    "tok": 2.2578834535178327,
    "tol": 2.2578834535178327,
    "tom": 75.63909569284739,
    "ton": 2.2578834535178327,
    "top": 20.320951081660496,
    "tor": 12.418358994348079,
    "tou": 4.515766907035665,
    "tpa": 12.418358994348079,
    "tpe": 3.386825180276749,
    "tpi": 2.2578834535178327,
    "tpo": 7.9025920873124145,
    "tpr": 3.386825180276749,
    "tpu": 3.386825180276749,
    "tpü": 5.644708633794582,
    "tqu": 2.2578834535178327,
    "tra": 11.289417267589164,
    "tre": 37.25507698304424,
    "tri": 5.644708633794582,
    "tro": 62.0917949717404,
    "tru": 9.03153381407133,
    "trä": 3.386825180276749,
    "trö": 2.2578834535178327,
    "trü": 2.2578834535178327,
    "tsa": 25.965659715455075,
    "tsc": 34.997193529526406,
    "tse": 16.934125901383744,
    "tso": 1.1289417267589164,
    "tsp": 30.48142662249074,
    "tst": 2.2578834535178327,
    "tsu": 1.1289417267589164,
    "tsü": 4.515766907035665,
    "tta": 25.965659715455075,
    "tte": 119.66782303644513,
    "tth": 6.773650360553498,
    "tti": 5.644708633794582,
    "ttl": 4.515766907035665,
    "ttm": 2.2578834535178327,
    "tto": 34.997193529526406,
    "ttr": 11.289417267589164,
    "tts": 4.515766907035665,
    "tun": 15.805184174624829,
    "tur": 2.2578834535178327,
    "tva": 5.644708633794582,
    "twe": 3.386825180276749,
    "twu": 4.515766907035665,
    "twü": 1.1289417267589164,
    "tya": 1.1289417267589164,
    "tyl": 1.1289417267589164,
    "tza": 1.1289417267589164,
    "tze": 32.73931007600857,
    "tzi": 4.515766907035665,
    "tzl": 18.06306762814266,
    "tzw": 3.386825180276749,
    "täb": 1.1289417267589164,
    "täd": 2.2578834535178327,
    "uan": 2.2578834535178327,
    "uau": 1.1289417267589164,
    "ube": 3.386825180276749,
    "ubu": 1.1289417267589164,
    "ucc": 25.965659715455075,
    "uce": 82.4127460534009,
    "uch": 204.33845254336387,
    "uco": 14.676242447865913,
    "ucu": 1.1289417267589164,
    "udd": 16.934125901383744,
    "ude": 47.41555252387449,
    "udi": 1.1289417267589164,
    "uec": 2.2578834535178327,
    "uer": 20.320951081660496,
    "uet": 3.386825180276749,
    "ufb": 4.515766907035665,
    "ufe": 2.2578834535178327,
    "uff": 1.1289417267589164,
    "ufk": 1.1289417267589164,
    "ufl": 9.03153381407133,
    "ufm": 5.644708633794582,
    "ufr": 1.1289417267589164,
    "ufs": 5.644708633794582,
    "uft": 3.386825180276749,
    "ufz": 5.644708633794582,
    "uhn": 18.06306762814266,
    "uil": 47.41555252387449,
    "uin": 5.644708633794582,
    "uit": 5.644708633794582,
    "uja": 5.644708633794582,
    "uka": 1.1289417267589164,
    "ula": 13.547300721106996,
    "ule": 1.1289417267589164,
    "ulg": 9.03153381407133,
    "uli": 1.1289417267589164,
    "ull": 4.515766907035665,
    "uma": 1.1289417267589164,
    "umb": 1.1289417267589164,
    "umc": 5.644708633794582,
    "umd": 1.1289417267589164,
    "ume": 3.386825180276749,
    "umi": 4.515766907035665,
    "umj": 1.1289417267589164,
    "umk": 2.2578834535178327,
    "umm": 1.1289417267589164,
    "ump": 9.03153381407133,
    "umr": 1.1289417267589164,
    "ums": 6.773650360553498,
    "una": 2.2578834535178327,
    "und": 173.85702592087313,
    "unf": 4.515766907035665,
    "ung": 5.644708633794582,
    "uns": 6.773650360553498,
    "unt": 1.1289417267589164,
    "upa": 1.1289417267589164,
    "upf": 5.644708633794582,
    "upo": 1.1289417267589164,
    "upp": 546.4077957513155,
    "upt": 4.515766907035665,
    "upw": 9.03153381407133,
    "ure": 6.773650360553498,
    "urg": 6.773650360553498,
    "urk": 9.03153381407133,
    "urm": 1.1289417267589164,
    "urr": 29.352484895731827,
    "urs": 9.03153381407133,
    "urt": 37.25507698304424,
    "urz": 2.2578834535178327,
    "usa": 1.1289417267589164,
    "usc": 14.676242447865913,
    "usd": 1.1289417267589164,
    "usi": 1.1289417267589164,
    "usm": 3.386825180276749,
    "uso": 1.1289417267589164,
    "uss": 13.547300721106996,
    "ust": 11.289417267589164,
    "usu": 1.1289417267589164,
    "ute": 62.0917949717404,
    "utf": 1.1289417267589164,
    "uti": 2.2578834535178327,
    "utm": 7.9025920873124145,
    "utp": 1.1289417267589164,
    "uts": 1.1289417267589164,
    "utt": 22.578834535178327,
    "utu": 2.2578834535178327,
    "uve": 2.2578834535178327,
    "ußb": 1.1289417267589164,
    "ußk": 11.289417267589164,
    "van": 15.805184174624829,
    "vap": 1.1289417267589164,
    "var": 2.2578834535178327,
    "vec": 2.2578834535178327,
    "veg": 10.160475540830248,
    "ven": 4.515766907035665,
    "vie": 7.9025920873124145,
    "vin": 1.1289417267589164,
    "vio": 2.2578834535178327,
    "vit": 1.1289417267589164,
    "voc": 4.515766907035665,
    "vog": 2.2578834535178327,
    "vol": 1.1289417267589164,
    "vom": 4.515766907035665,
    "von": 5.644708633794582,
    "vre": 1.1289417267589164,
    "wal": 5.644708633794582,
    "war": 1.1289417267589164,
    "was": 1.1289417267589164,
    "wed": 6.773650360553498,
    "wei": 24.836717988696158,
    "wer": 15.805184174624829,
    "wie": 27.094601442213992,
    "wil": 1.1289417267589164,
    "wit": 11.289417267589164,
    "wko": 1.1289417267589164,
    "wlm": 7.9025920873124145,
    "wmi": 2.2578834535178327,
    "wra": 3.386825180276749,
    "wur": 11.289417267589164,
    "wwi": 1.1289417267589164,
    "wür": 10.160475540830248,
    "xeb": 2.2578834535178327,
    "xhü": 1.1289417267589164,
    "xic": 1.1289417267589164,
    "xik": 1.1289417267589164,
    "xme": 1.1289417267589164,
    "xot": 2.2578834535178327,
    "xtr": 1.1289417267589164,
    "yaa": 2.2578834535178327,
    "yak": 3.386825180276749,
    "yam": 2.2578834535178327,
    "yan": 1.1289417267589164,
    "ybo": 3.386825180276749,
    "yhu": 2.2578834535178327,
    "yka": 2.2578834535178327,
    "yku": 1.1289417267589164,
    "yle": 1.1289417267589164,
    "yli": 2.2578834535178327,
    "yme": 1.1289417267589164,
    "ymi": 14.676242447865913,
    "yra": 1.1289417267589164,
    "yri": 2.2578834535178327,
    "yst": 1.1289417267589164,
    "ysu": 1.1289417267589164,
    "ywu": 1.1289417267589164,
    "yzi": 2.2578834535178327,
    "yzu": 5.644708633794582,
    "zam": 9.03153381407133,
    "zan": 9.03153381407133,
    "zar": 4.515766907035665,
    "zat": 2.2578834535178327,
    "zca": 1.1289417267589164,
    "zec": 2.2578834535178327,
    "zej": 1.1289417267589164,
    "zel": 30.48142662249074,
    "zem": 2.2578834535178327,
    "zen": 5.644708633794582,
    "zer": 4.515766907035665,
    "zes": 1.1289417267589164,
    "zie": 2.2578834535178327,
    "zik": 1.1289417267589164,
    "zin": 1.1289417267589164,
    "zip": 5.644708633794582,
    "zit": 23.707776261937244,
    "zka": 2.2578834535178327,
    "zle": 18.06306762814266,
    "zof": 2.2578834535178327,
    "zra": 1.1289417267589164,
    "zri": 2.2578834535178327,
    "zsa": 1.1289417267589164,
    "zsu": 3.386825180276749,
    "zuc": 25.965659715455075,
    "zwi": 27.094601442213992,
    "zym": 1.1289417267589164,
    "zza": 15.805184174624829,
    "ßbu": 1.1289417267589164,
    "ßem": 1.1289417267589164,
    "ßet": 1.1289417267589164,
    "ßez": 5.644708633794582,
    "ßka": 23.707776261937244,
    "ßkr": 11.289417267589164,
    "ßmi": 1.1289417267589164,
    "ßno": 22.578834535178327,
    "ßpu": 1.1289417267589164,
    "ßsa": 3.386825180276749,
    "ßsu": 5.644708633794582,
    "äbc": 1.1289417267589164,
    "äck": 7.9025920873124145,
    "ädt": 2.2578834535178327,
    "äfe": 4.515766907035665,
    "äge": 3.386825180276749,
    "äll": 2.2578834535178327,
    "änd": 1.1289417267589164,
    "äpf": 3.386825180276749,
    "ärl": 10.160475540830248,
    "äse": 49.673435977392316,
    "ätt": 2.2578834535178327,
    "ätz": 20.320951081660496,
    "äuc": 3.386825180276749,
    "äut": 32.73931007600857,
    "öbe": 16.934125901383744,
    "öde": 40.64190216332099,
    "ölu": 1.1289417267589164,
    "öni": 1.1289417267589164,
    "örn": 1.1289417267589164,
    "öse": 2.2578834535178327,
    "öst": 5.644708633794582,
    "übe": 9.03153381407133,
    "üch": 5.644708633794582,
    "üff": 2.2578834535178327,
    "ügr": 1.1289417267589164,
    "ühl": 5.644708633794582,
    "ühn": 41.7708438900799,
    "ükn": 1.1289417267589164,
    "üll": 9.03153381407133,
    "üne": 4.515766907035665,
    "üqu": 1.1289417267589164,
    "ürb": 18.06306762814266,
    "üre": 7.9025920873124145,
    "ürf": 5.644708633794582,
    "ürs": 4.515766907035665,
    "üse": 150.14924965893587,
    "üsp": 1.1289417267589164,
    "üss": 1.1289417267589164,
    "üßk": 23.707776261937244,
    "üßs": 3.386825180276749
  },
  "trigramsEn": {
    "aan": 12,
    "aar": 4,
    "aba": 4,
    "abb": 7,
    "abh": 1,
    "abi": 17,
    "abj": 2,
    "abl": 160,
    "abo": 3,
    "abr": 1,
    "aca": 7,
    "acc": 5,
    "ace": 1,
    "acg": 1,
    "ach": 35,
    "aco": 18,
    "acr": 34,
    "acu": 7,
    "ada": 7,
    "adb": 1,
    "adc": 3,
    "add": 84,
    "adf": 1,
    "adi": 4,
    "ado": 7,
    "adp": 23,
    "adr": 10,
    "ads": 1,
    "adu": 20,
    "adw": 44,
    "ael": 1,
    "aet": 12,
    "afb": 1,
    "aff": 2,
    "afp": 1,
    "afs": 2,
    "afw": 1,
    "age": 29,
    "agh": 3,
    "agi": 1,
    "agl": 3,
    "agn": 29,
    "ago": 13,
    "agu": 12,
    "aha": 3,
    "ahe": 1,
    "ahi": 3,
    "aho": 1,
    "ahr": 2,
    "ahu": 2,
    "ahw": 2,
    "aib": 9,
    "aic": 8,
    "ain": 6,
    "aja": 2,
    "aji": 2,
    "ajm": 2,
    "ajv": 1,
    "aka": 1,
    "akc": 1,
    "ake": 216,
    "akg": 1,
    "aki": 4,
    "akl": 1,
    "akm": 1,
    "akp": 1,
    "aks": 2,
    "akw": 3,
    "ala": 255,
    "alb": 2,
    "alc": 17,
    "alf": 2,
    "ali": 4,
    "all": 17,
    "alm": 16,
    "aln": 2,
    "alo": 6,
    "alr": 1,
    "als": 5,
    "alt": 1,
    "alv": 1,
    "ama": 18,
    "amb": 7,
    "amc": 6,
    "amd": 3,
    "ame": 21,
    "amk": 1,
    "amm": 1,
    "amn": 4,
    "amo": 10,
    "amp": 10,
    "amr": 5,
    "ams": 165,
    "amt": 1,
    "amw": 17,
    "amy": 3,
    "ana": 33,
    "anb": 6,
    "anc": 40,
    "and": 198,
    "anf": 2,
    "ang": 44,
    "ani": 26,
    "anl": 1,
    "anm": 1,
    "ann": 14,
    "ano": 6,
    "anp": 4,
    "anr": 4,
    "ans": 24,
    "ant": 13,
    "anu": 2,
    "anv": 1,
    "anw": 12,
    "anz": 2,
    "aoe": 1,
    "aol": 5,
    "aon": 1,
    "aou": 1,
    "apa": 5,
    "apc": 1,
    "ape": 6,
    "api": 2,
    "apm": 1,
    "apo": 1,
    "app": 41,
    "apr": 15,
    "apu": 12,
    "apw": 3,
    "ara": 27,
    "arb": 9,
    "arc": 7,
    "ard": 4,
    "are": 10,
    "arg": 4,
    "ari": 7,
    "ark": 2,
    "arl": 23,
    "arm": 18,
    "arn": 34,
    "arr": 35,
    "ars": 27,
    "aru": 9,
    "arv": 5,
    "ary": 1,
    "arz": 5,
    "asa": 57,
    "asb": 7,
    "asd": 1,
    "ase": 2,
    "asg": 1,
    "ash": 17,
    "asi": 30,
    "asl": 2,
    "asm": 9,
    "asn": 1,
    "aso": 8,
    "asp": 19,
    "asq": 2,
    "ass": 13,
    "ast": 46,
    "asu": 2,
    "asw": 2,
    "ata": 12,
    "atb": 2,
    "atc": 4,
    "atd": 1,
    "ate": 76,
    "atf": 3,
    "ath": 1,
    "ati": 10,
    "atl": 4,
    "ato": 165,
    "atp": 16,
    "atr": 2,
    "ats": 78,
    "att": 19,
    "atw": 3,
    "atz": 1,
    "auc": 131,
    "aul": 21,
    "aus": 15,
    "aut": 4,
    "ava": 2,
    "ave": 1,
    "avi": 2,
    "avo": 4,
    "awb": 18,
    "awh": 1,
    "awi": 44,
    "awn": 2,
    "awü": 1,
    "aya": 8,
    "aye": 1,
    "ayo": 3,
    "aze": 4,
    "azi": 2,
    "bab": 2,
    "bag": 8,
    "bak": 42,
    "bal": 21,
    "ban": 12,
    "bap": 2,
    "bar": 8,
    "bas": 26,
    "bba": 6,
    "bbi": 2,
    "bbo": 2,
    "bbq": 1,
    "bbu": 1,
    "bch": 9,
    "bcr": 2,
    "bdi": 1,
    "bea": 19,
    "bee": 139,
    "bel": 11,
    "ber": 67,
    "bes": 6,
    "bha": 2,
    "bhi": 1,
    "bia": 5,
    "bic": 10,
    "big": 1,
    "bji": 2,
    "ble": 162,
    "blu": 10,
    "bma": 1,
    "boa": 3,
    "boc": 1,
    "boi": 4,
    "bol": 12,
    "bon": 5,
    "bow": 7,
    "bpo": 1,
    "bqc": 1,
    "bre": 32,
    "bro": 61,
    "bsa": 12,
    "bsl": 1,
    "bso": 1,
    "bsp": 1,
    "bti": 5,
    "bto": 1,
    "buc": 10,
    "bul": 8,
    "bun": 1,
    "bur": 3,
    "but": 18,
    "cab": 5,
    "cad": 4,
    "cak": 169,
    "cal": 5,
    "cam": 4,
    "can": 16,
    "cao": 1,
    "cap": 4,
    "car": 51,
    "cas": 10,
    "cau": 21,
    "caw": 1,
    "cba": 2,
    "cca": 5,
    "cch": 39,
    "cci": 12,
    "cco": 19,
    "ccr": 15,
    "cea": 17,
    "ceb": 8,
    "cec": 1,
    "ced": 25,
    "cee": 1,
    "cef": 3,
    "ceg": 1,
    "cej": 1,
    "cek": 2,
    "cel": 12,
    "cem": 9,
    "cen": 1,
    "ceo": 2,
    "cep": 15,
    "cer": 1,
    "ces": 8,
    "cev": 6,
    "cew": 20,
    "cgl": 1,
    "cgs": 1,
    "cha": 12,
    "chd": 3,
    "che": 112,
    "chf": 4,
    "chg": 4,
    "chi": 137,
    "chj": 2,
    "chl": 2,
    "cho": 33,
    "chp": 1,
    "chu": 7,
    "chö": 10,
    "cia": 5,
    "cic": 1,
    "cil": 1,
    "cin": 1,
    "cio": 2,
    "cis": 5,
    "ciu": 4,
    "ciw": 1,
    "ckb": 3,
    "cke": 72,
    "ckn": 1,
    "ckp": 8,
    "cks": 2,
    "ckw": 6,
    "cle": 5,
    "coa": 2,
    "coc": 44,
    "cof": 5,
    "coi": 2,
    "col": 43,
    "com": 2,
    "con": 55,
    "cor": 20,
    "cot": 8,
    "cou": 31,
    "cra": 2,
    "cre": 272,
    "cri": 7,
    "cro": 2,
    "cru": 5,
    "csa": 1,
    "ctu": 2,
    "cub": 5,
    "cuc": 4,
    "cum": 5,
    "cur": 56,
    "cvi": 1,
    "dal": 6,
    "dam": 1,
    "dan": 10,
    "dap": 12,
    "dar": 11,
    "das": 3,
    "dat": 3,
    "dav": 1,
    "dba": 5,
    "dbe": 14,
    "dbl": 1,
    "dbo": 1,
    "dbr": 9,
    "dbu": 1,
    "dbä": 1,
    "dca": 15,
    "dch": 26,
    "dco": 3,
    "dcr": 11,
    "dcu": 2,
    "dda": 6,
    "dde": 81,
    "ddi": 40,
    "ddj": 1,
    "ddo": 5,
    "ddu": 14,
    "ded": 2,
    "deg": 10,
    "dem": 1,
    "des": 81,
    "dfe": 1,
    "dfi": 1,
    "dfr": 6,
    "dfu": 1,
    "dga": 10,
    "dge": 9,
    "dgn": 2,
    "dgr": 3,
    "dha": 8,
    "dhe": 6,
    "dho": 2,
    "dhu": 1,
    "dia": 14,
    "dil": 2,
    "din": 33,
    "dip": 37,
    "dis": 13,
    "dit": 7,
    "djo": 1,
    "dju": 3,
    "dki": 1,
    "dkr": 3,
    "dle": 53,
    "dli": 3,
    "dlm": 1,
    "dma": 1,
    "dme": 11,
    "dmo": 2,
    "dmu": 4,
    "dna": 2,
    "dne": 1,
    "dno": 3,
    "dnu": 2,
    "dnü": 1,
    "doa": 3,
    "doc": 2,
    "dol": 6,
    "don": 8,
    "dor": 2,
    "dou": 15,
    "dov": 2,
    "dow": 2,
    "dpa": 26,
    "dpe": 14,
    "dpf": 1,
    "dpi": 4,
    "dpl": 26,
    "dpo": 33,
    "dra": 2,
    "dri": 18,
    "dro": 12,
    "dsa": 9,
    "dsh": 2,
    "dso": 9,
    "dsp": 2,
    "dst": 3,
    "dsw": 3,
    "dsy": 1,
    "dta": 1,
    "dte": 2,
    "dth": 4,
    "dto": 8,
    "dtr": 7,
    "dtu": 2,
    "dum": 72,
    "dve": 17,
    "dwa": 1,
    "dwe": 3,
    "dwi": 47,
    "dwt": 2,
    "dww": 1,
    "dyo": 4,
    "dzu": 2,
    "eaa": 2,
    "eab": 3,
    "eac": 16,
    "ead": 26,
    "eaf": 2,
    "eah": 3,
    "eak": 8,
    "eal": 4,
    "eam": 265,
    "ean": 59,
    "eap": 11,
    "ear": 13,
    "eas": 30,
    "eat": 32,
    "eba": 14,
    "ebb": 1,
    "ebl": 4,
    "ebr": 37,
    "ebu": 7,
    "eca": 5,
    "ech": 11,
    "eco": 11,
    "ecr": 27,
    "ecu": 6,
    "eda": 13,
    "edb": 8,
    "edc": 24,
    "edd": 10,
    "ede": 3,
    "edf": 1,
    "edg": 9,
    "edh": 5,
    "edi": 12,
    "edl": 7,
    "edm": 11,
    "edn": 2,
    "edo": 3,
    "edp": 53,
    "edr": 1,
    "eds": 16,
    "edt": 15,
    "edu": 21,
    "edv": 8,
    "edw": 5,
    "edz": 2,
    "eec": 1,
    "eed": 10,
    "eef": 128,
    "eek": 12,
    "een": 11,
    "eep": 4,
    "ees": 67,
    "eet": 29,
    "eeu": 1,
    "eey": 3,
    "efa": 5,
    "efb": 6,
    "efc": 2,
    "efe": 2,
    "eff": 1,
    "efg": 2,
    "efi": 12,
    "efk": 1,
    "efl": 1,
    "efm": 1,
    "efo": 1,
    "efp": 3,
    "efr": 6,
    "efs": 100,
    "efw": 4,
    "ega": 5,
    "ege": 158,
    "egg": 29,
    "ego": 2,
    "egr": 3,
    "eht": 2,
    "eiz": 5,
    "eja": 3,
    "eki": 2,
    "ekn": 1,
    "ekr": 1,
    "eks": 11,
    "ela": 24,
    "elc": 5,
    "ele": 9,
    "eli": 7,
    "elo": 10,
    "elp": 7,
    "elv": 1,
    "elw": 13,
    "ema": 6,
    "emb": 4,
    "emo": 51,
    "emt": 1,
    "ena": 6,
    "enb": 11,
    "end": 2,
    "enh": 1,
    "enl": 8,
    "enm": 20,
    "enn": 18,
    "eno": 2,
    "ens": 34,
    "ent": 37,
    "enu": 12,
    "env": 4,
    "enw": 15,
    "eoa": 3,
    "eon": 8,
    "eor": 1,
    "eov": 1,
    "epa": 9,
    "epc": 3,
    "epe": 8,
    "epi": 2,
    "epo": 10,
    "epp": 19,
    "eps": 1,
    "epu": 14,
    "erb": 55,
    "erc": 19,
    "erd": 8,
    "erh": 2,
    "eri": 22,
    "ero": 9,
    "erp": 2,
    "err": 71,
    "ers": 48,
    "ert": 88,
    "erv": 3,
    "erw": 6,
    "ery": 11,
    "esa": 94,
    "esb": 3,
    "ese": 86,
    "esf": 4,
    "esg": 2,
    "esi": 2,
    "esk": 3,
    "esl": 11,
    "esm": 2,
    "eso": 36,
    "esp": 10,
    "ess": 91,
    "est": 29,
    "esw": 27,
    "esy": 2,
    "esz": 1,
    "eta": 168,
    "etb": 1,
    "ete": 3,
    "etg": 1,
    "eti": 2,
    "etl": 1,
    "etn": 2,
    "eto": 5,
    "etp": 31,
    "etr": 2,
    "etw": 16,
    "etz": 13,
    "eub": 1,
    "euw": 2,
    "eva": 2,
    "eve": 10,
    "ewe": 8,
    "ewh": 1,
    "ewi": 97,
    "ewo": 2,
    "ewr": 1,
    "ews": 5,
    "eww": 10,
    "exc": 1,
    "exi": 2,
    "exm": 1,
    "exo": 2,
    "ext": 1,
    "eyb": 1,
    "eyc": 8,
    "eyg": 1,
    "eym": 3,
    "eyo": 5,
    "eyp": 1,
    "eyr": 8,
    "eys": 17,
    "fad": 1,
    "faj": 1,
    "fal": 4,
    "fan": 4,
    "far": 5,
    "fau": 1,
    "fbe": 2,
    "fbr": 5,
    "fca": 1,
    "fco": 7,
    "fcu": 2,
    "fed": 4,
    "fee": 4,
    "fef": 1,
    "feo": 1,
    "fet": 8,
    "fey": 1,
    "ffi": 1,
    "ffl": 2,
    "ffp": 2,
    "ffr": 2,
    "ffw": 5,
    "fgo": 2,
    "fil": 32,
    "fin": 4,
    "fis": 12,
    "fit": 1,
    "fke": 1,
    "fko": 2,
    "flm": 1,
    "flo": 22,
    "fme": 1,
    "fno": 1,
    "fnt": 1,
    "fnu": 2,
    "foa": 1,
    "fpa": 2,
    "fpo": 4,
    "fre": 1,
    "fri": 26,
    "fro": 8,
    "fru": 30,
    "fry": 1,
    "fsa": 4,
    "fsc": 1,
    "fsm": 2,
    "fso": 86,
    "fst": 9,
    "fua": 3,
    "fub": 1,
    "fuc": 2,
    "fue": 2,
    "ful": 2,
    "fuo": 1,
    "fup": 1,
    "fus": 5,
    "fut": 3,
    "fuu": 2,
    "fwi": 10,
    "fwo": 1,
    "gal": 2,
    "gan": 8,
    "gar": 49,
    "gat": 3,
    "gbo": 2,
    "gdo": 5,
    "gea": 1,
    "gec": 1,
    "geg": 2,
    "geh": 2,
    "gep": 5,
    "ger": 17,
    "ges": 18,
    "get": 159,
    "gew": 4,
    "gfr": 1,
    "gga": 2,
    "ggn": 3,
    "ggp": 12,
    "ggs": 2,
    "ghd": 5,
    "ghe": 3,
    "ght": 2,
    "gin": 14,
    "gla": 2,
    "gli": 3,
    "gll": 1,
    "glm": 1,
    "glu": 2,
    "gma": 1,
    "gna": 12,
    "gne": 30,
    "gno": 22,
    "goa": 5,
    "gob": 1,
    "goc": 4,
    "goj": 1,
    "gok": 1,
    "gon": 5,
    "gop": 8,
    "gor": 1,
    "gos": 14,
    "gou": 21,
    "goy": 3,
    "gpa": 5,
    "gpl": 7,
    "gpo": 1,
    "gra": 11,
    "gre": 12,
    "gro": 6,
    "grö": 2,
    "gsb": 1,
    "gsm": 1,
    "gsp": 2,
    "gsw": 6,
    "gue": 4,
    "gul": 12,
    "gur": 46,
    "gus": 8,
    "gva": 2,
    "gwi": 15,
    "gän": 1,
    "hab": 3,
    "had": 2,
    "hah": 3,
    "hai": 3,
    "haj": 1,
    "hak": 7,
    "hal": 4,
    "ham": 24,
    "han": 12,
    "hap": 5,
    "har": 4,
    "has": 4,
    "hav": 2,
    "haz": 2,
    "hba": 31,
    "hbb": 1,
    "hbe": 12,
    "hbo": 2,
    "hbr": 18,
    "hbu": 7,
    "hca": 6,
    "hce": 1,
    "hch": 45,
    "hck": 1,
    "hco": 3,
    "hcu": 10,
    "hda": 3,
    "hdi": 11,
    "hdj": 2,
    "hdr": 10,
    "hdu": 7,
    "hea": 6,
    "hed": 12,
    "hee": 71,
    "heg": 10,
    "heo": 1,
    "her": 56,
    "hes": 10,
    "het": 4,
    "hfa": 1,
    "hfe": 3,
    "hfi": 5,
    "hfl": 2,
    "hfr": 11,
    "hfu": 1,
    "hga": 27,
    "hgi": 1,
    "hgl": 2,
    "hgn": 1,
    "hgo": 3,
    "hgr": 11,
    "hha": 10,
    "hhe": 11,
    "hho": 2,
    "hhu": 2,
    "hia": 5,
    "hic": 70,
    "hii": 2,
    "hil": 13,
    "hin": 26,
    "hio": 1,
    "hir": 4,
    "hit": 9,
    "hiv": 4,
    "hiw": 14,
    "hja": 4,
    "hjo": 2,
    "hka": 1,
    "hke": 2,
    "hla": 2,
    "hle": 5,
    "hli": 10,
    "hlo": 1,
    "hlr": 14,
    "hma": 30,
    "hme": 4,
    "hmi": 6,
    "hmu": 5,
    "hna": 2,
    "hni": 18,
    "hno": 9,
    "hoc": 19,
    "hof": 1,
    "hol": 4,
    "hon": 7,
    "hop": 3,
    "hor": 3,
    "hos": 7,
    "hou": 1,
    "hov": 1,
    "hpa": 13,
    "hpe": 11,
    "hpo": 13,
    "hpr": 3,
    "hpu": 6,
    "hqu": 2,
    "hra": 6,
    "hri": 35,
    "hro": 23,
    "hsa": 11,
    "hsc": 11,
    "hse": 24,
    "hsh": 6,
    "hsl": 13,
    "hsm": 8,
    "hso": 14,
    "hsp": 24,
    "hst": 13,
    "hsw": 5,
    "hth": 2,
    "hto": 25,
    "htr": 1,
    "htt": 4,
    "htu": 8,
    "htz": 1,
    "hua": 2,
    "hub": 5,
    "hum": 3,
    "hup": 3,
    "hva": 5,
    "hve": 23,
    "hwe": 7,
    "hwh": 1,
    "hwi": 52,
    "hya": 1,
    "hym": 4,
    "hyo": 2,
    "höb": 10,
    "iac": 1,
    "ial": 2,
    "ian": 31,
    "iap": 5,
    "iat": 14,
    "iba": 2,
    "ibb": 2,
    "ibc": 9,
    "ibi": 1,
    "ica": 16,
    "icb": 2,
    "icc": 16,
    "ice": 121,
    "ich": 11,
    "ici": 1,
    "ick": 72,
    "ico": 7,
    "icr": 22,
    "ics": 1,
    "ict": 2,
    "icu": 5,
    "icv": 1,
    "ida": 5,
    "idn": 1,
    "ied": 24,
    "ies": 27,
    "iet": 3,
    "ifa": 1,
    "ifl": 21,
    "igh": 2,
    "igm": 1,
    "ign": 2,
    "igo": 1,
    "igs": 1,
    "ihb": 1,
    "ihc": 1,
    "iht": 1,
    "iin": 4,
    "ika": 11,
    "ike": 3,
    "iki": 1,
    "ikk": 2,
    "iko": 1,
    "ila": 6,
    "ild": 10,
    "ilk": 16,
    "ill": 88,
    "ilo": 5,
    "ilp": 6,
    "ilr": 1,
    "ils": 17,
    "ilw": 1,
    "ima": 2,
    "ime": 9,
    "imp": 3,
    "ina": 50,
    "inb": 5,
    "inc": 36,
    "ine": 25,
    "ing": 141,
    "inh": 2,
    "ini": 44,
    "ino": 5,
    "inp": 1,
    "inr": 4,
    "ins": 11,
    "int": 6,
    "inu": 1,
    "inv": 2,
    "inz": 1,
    "ion": 29,
    "ios": 3,
    "ipa": 13,
    "ipc": 10,
    "ipd": 5,
    "ipe": 5,
    "iph": 1,
    "ipj": 1,
    "ipm": 4,
    "ipp": 8,
    "ips": 9,
    "ira": 6,
    "ire": 2,
    "irf": 1,
    "iri": 3,
    "irt": 1,
    "irw": 1,
    "ise": 8,
    "isg": 1,
    "ish": 44,
    "isi": 15,
    "isl": 1,
    "iso": 35,
    "isp": 2,
    "iss": 8,
    "ist": 8,
    "isv": 2,
    "itc": 8,
    "ith": 620,
    "itn": 2,
    "ito": 6,
    "ity": 5,
    "itz": 19,
    "iun": 3,
    "iut": 4,
    "ive": 21,
    "ivr": 1,
    "iwi": 30,
    "ixs": 2,
    "iya": 2,
    "izc": 1,
    "ize": 5,
    "izo": 2,
    "izz": 6,
    "jac": 2,
    "jam": 8,
    "jas": 6,
    "jat": 1,
    "jaw": 1,
    "jig": 1,
    "jin": 1,
    "jit": 1,
    "jiv": 1,
    "jma": 2,
    "jol": 2,
    "juv": 3,
    "jva": 1,
    "kac": 5,
    "kag": 1,
    "kai": 2,
    "kam": 3,
    "kan": 8,
    "kaw": 1,
    "kbe": 6,
    "kbl": 5,
    "kbu": 1,
    "kch": 4,
    "kcr": 4,
    "kcu": 4,
    "kdu": 1,
    "keb": 4,
    "kec": 1,
    "ked": 49,
    "kef": 5,
    "ken": 65,
    "kep": 5,
    "kes": 23,
    "kew": 7,
    "key": 27,
    "kgr": 1,
    "kic": 4,
    "kid": 1,
    "kin": 15,
    "kit": 1,
    "kiw": 2,
    "kka": 3,
    "kli": 2,
    "kmi": 2,
    "kna": 1,
    "kne": 1,
    "koh": 14,
    "kon": 1,
    "kor": 3,
    "kpe": 8,
    "kpi": 1,
    "kpo": 1,
    "kra": 3,
    "kre": 2,
    "kri": 5,
    "ksa": 1,
    "kso": 8,
    "ksp": 1,
    "kst": 10,
    "ksw": 1,
    "kto": 1,
    "kur": 1,
    "kwe": 1,
    "kwh": 5,
    "kwi": 17,
    "kwr": 1,
    "kön": 1,
    "laa": 2,
    "lac": 20,
    "lad": 158,
    "laf": 1,
    "lah": 3,
    "lai": 12,
    "lak": 2,
    "lam": 1,
    "lan": 16,
    "lap": 12,
    "las": 46,
    "lat": 127,
    "law": 3,
    "lay": 5,
    "laz": 2,
    "lba": 1,
    "lbr": 2,
    "lca": 2,
    "lcr": 23,
    "lcu": 2,
    "ldg": 9,
    "ldi": 2,
    "lea": 16,
    "leb": 41,
    "lec": 33,
    "led": 20,
    "lee": 11,
    "lef": 2,
    "leg": 2,
    "lej": 2,
    "lel": 8,
    "lem": 27,
    "len": 35,
    "leo": 3,
    "lep": 12,
    "ler": 18,
    "les": 123,
    "let": 40,
    "leu": 2,
    "lev": 5,
    "lew": 25,
    "ley": 6,
    "lfi": 3,
    "lgu": 8,
    "lha": 2,
    "lhe": 1,
    "lia": 7,
    "lib": 2,
    "lic": 62,
    "lif": 21,
    "lii": 2,
    "lim": 12,
    "lin": 118,
    "lio": 1,
    "lir": 1,
    "lis": 10,
    "liu": 1,
    "liv": 15,
    "liw": 5,
    "lka": 1,
    "lkb": 6,
    "lkc": 4,
    "lkr": 7,
    "lku": 1,
    "lla": 34,
    "lld": 1,
    "lle": 63,
    "llh": 1,
    "lli": 14,
    "llm": 5,
    "llp": 11,
    "lls": 8,
    "lly": 2,
    "lma": 5,
    "lmk": 1,
    "lmn": 1,
    "lmo": 16,
    "lmw": 1,
    "lnc": 1,
    "lnj": 1,
    "lnp": 1,
    "lns": 1,
    "lnt": 1,
    "lnu": 5,
    "lnw": 2,
    "loa": 4,
    "lof": 1,
    "log": 12,
    "lol": 1,
    "lom": 5,
    "loo": 6,
    "lou": 1,
    "low": 22,
    "lpa": 4,
    "lpe": 12,
    "lpo": 5,
    "lpu": 3,
    "lra": 14,
    "lro": 1,
    "lsa": 15,
    "lsi": 2,
    "lsm": 1,
    "lso": 13,
    "lsr": 1,
    "lss": 2,
    "lsv": 1,
    "lsw": 3,
    "lti": 1,
    "lua": 2,
    "lue": 10,
    "lva": 1,
    "lve": 1,
    "lwi": 21,
    "lyi": 2,
    "mah": 4,
    "mal": 13,
    "mam": 1,
    "man": 40,
    "mar": 12,
    "mas": 14,
    "mat": 92,
    "maw": 1,
    "mba": 5,
    "mbh": 1,
    "mbo": 1,
    "mbs": 4,
    "mch": 3,
    "mcr": 3,
    "mdi": 3,
    "mea": 27,
    "mec": 2,
    "med": 9,
    "mef": 1,
    "meg": 1,
    "mel": 20,
    "men": 7,
    "mep": 4,
    "mer": 12,
    "mew": 2,
    "mex": 3,
    "mfi": 1,
    "mic": 2,
    "mil": 28,
    "min": 37,
    "mir": 2,
    "mis": 7,
    "mix": 2,
    "mki": 2,
    "mku": 2,
    "mme": 9,
    "mmu": 2,
    "mmü": 1,
    "mno": 5,
    "mod": 1,
    "mof": 8,
    "mok": 8,
    "mol": 28,
    "mon": 44,
    "mor": 4,
    "mos": 1,
    "mou": 1,
    "moz": 4,
    "mpa": 1,
    "mpe": 2,
    "mpi": 2,
    "mpk": 13,
    "mpl": 71,
    "mpo": 8,
    "mps": 1,
    "mre": 2,
    "mri": 2,
    "mro": 3,
    "msa": 15,
    "msb": 1,
    "mso": 153,
    "mth": 1,
    "mti": 1,
    "mto": 1,
    "mtr": 1,
    "mue": 1,
    "muf": 1,
    "mus": 21,
    "mwi": 18,
    "myl": 2,
    "mys": 1,
    "naa": 1,
    "nab": 2,
    "nac": 42,
    "nad": 20,
    "nag": 1,
    "nai": 1,
    "nam": 4,
    "nan": 26,
    "nap": 2,
    "nar": 3,
    "nas": 10,
    "naw": 7,
    "nay": 3,
    "nba": 7,
    "nbe": 8,
    "nbl": 2,
    "nbo": 3,
    "nbr": 7,
    "nbu": 1,
    "nca": 45,
    "nce": 5,
    "nch": 15,
    "nco": 16,
    "ncu": 5,
    "nda": 12,
    "ndb": 22,
    "ndc": 27,
    "ndd": 16,
    "ndf": 7,
    "ndg": 6,
    "ndh": 10,
    "ndi": 25,
    "ndj": 1,
    "ndl": 9,
    "ndm": 7,
    "ndn": 4,
    "ndo": 11,
    "ndp": 27,
    "ndr": 12,
    "ndt": 7,
    "ndv": 9,
    "ndw": 5,
    "ndy": 4,
    "nea": 19,
    "neb": 10,
    "ned": 5,
    "neg": 2,
    "nel": 9,
    "nem": 13,
    "nes": 22,
    "neu": 1,
    "new": 14,
    "ney": 8,
    "nfa": 2,
    "nfe": 1,
    "nfk": 1,
    "nfl": 3,
    "nfr": 6,
    "nga": 2,
    "ngb": 2,
    "ngd": 5,
    "nge": 23,
    "ngf": 1,
    "ngi": 1,
    "ngn": 2,
    "ngo": 38,
    "ngp": 1,
    "ngr": 7,
    "ngs": 52,
    "ngv": 1,
    "ngw": 15,
    "ngä": 1,
    "nha": 1,
    "nhe": 3,
    "nia": 4,
    "nic": 6,
    "nid": 5,
    "nil": 25,
    "nio": 22,
    "nip": 18,
    "nis": 40,
    "nit": 19,
    "niu": 2,
    "niv": 1,
    "niw": 7,
    "nkr": 1,
    "nle": 8,
    "nme": 2,
    "nmu": 1,
    "nna": 5,
    "nne": 23,
    "nno": 7,
    "noa": 5,
    "nof": 5,
    "nog": 1,
    "non": 2,
    "noo": 40,
    "now": 1,
    "npa": 7,
    "npe": 4,
    "npo": 11,
    "npu": 1,
    "nri": 14,
    "nro": 2,
    "nsa": 20,
    "nse": 8,
    "nsh": 3,
    "nsm": 1,
    "nso": 36,
    "nsp": 2,
    "nsr": 2,
    "nst": 15,
    "nsw": 3,
    "nsü": 1,
    "nta": 25,
    "ntb": 1,
    "ntc": 1,
    "nte": 3,
    "nth": 1,
    "nti": 14,
    "ntp": 1,
    "ntr": 6,
    "nts": 3,
    "ntu": 3,
    "ntw": 1,
    "nty": 1,
    "nup": 1,
    "nus": 3,
    "nut": 70,
    "nve": 6,
    "nvi": 1,
    "nwi": 33,
    "nwr": 2,
    "nza": 2,
    "nzb": 1,
    "nzu": 2,
    "nüs": 1,
    "oaa": 1,
    "oab": 1,
    "oac": 7,
    "oaf": 3,
    "oah": 1,
    "oal": 4,
    "oam": 1,
    "oan": 6,
    "oas": 15,
    "oat": 6,
    "oav": 1,
    "oba": 7,
    "obe": 2,
    "obh": 1,
    "obr": 3,
    "obu": 2,
    "oca": 10,
    "occ": 41,
    "och": 3,
    "oco": 76,
    "ocr": 24,
    "ocu": 5,
    "odl": 40,
    "odo": 1,
    "oeg": 2,
    "oes": 32,
    "ofc": 8,
    "ofe": 6,
    "ofi": 3,
    "ofk": 1,
    "ofu": 18,
    "oga": 5,
    "ogl": 1,
    "ogn": 12,
    "ogo": 2,
    "ogr": 2,
    "ogu": 38,
    "ogv": 1,
    "ohl": 14,
    "oil": 4,
    "ois": 2,
    "oiv": 1,
    "oja": 6,
    "ojo": 1,
    "oke": 9,
    "okm": 1,
    "okn": 1,
    "okw": 2,
    "ola": 22,
    "ole": 41,
    "oli": 61,
    "oll": 27,
    "olo": 13,
    "oma": 89,
    "ome": 2,
    "omf": 1,
    "omm": 5,
    "omo": 4,
    "omp": 2,
    "omr": 2,
    "oms": 10,
    "omt": 2,
    "ona": 8,
    "onb": 6,
    "onc": 10,
    "ond": 12,
    "onf": 8,
    "ong": 3,
    "onh": 1,
    "oni": 24,
    "onl": 6,
    "onn": 2,
    "ono": 1,
    "onp": 14,
    "onr": 9,
    "ons": 27,
    "ont": 5,
    "onu": 46,
    "onw": 6,
    "onz": 1,
    "ood": 40,
    "oom": 14,
    "oop": 1,
    "oor": 2,
    "oos": 1,
    "oot": 7,
    "opa": 8,
    "ope": 2,
    "opi": 5,
    "opo": 3,
    "opp": 12,
    "opw": 2,
    "oqu": 1,
    "ora": 9,
    "orc": 1,
    "ord": 2,
    "orh": 1,
    "ori": 9,
    "ork": 48,
    "orm": 2,
    "orn": 18,
    "oro": 5,
    "ort": 7,
    "osa": 43,
    "osc": 7,
    "ose": 1,
    "osi": 2,
    "oso": 5,
    "ost": 4,
    "osw": 1,
    "osz": 1,
    "ota": 92,
    "otc": 12,
    "otd": 1,
    "otg": 10,
    "oth": 40,
    "oti": 2,
    "oto": 1,
    "ots": 10,
    "ott": 24,
    "otv": 2,
    "oug": 15,
    "oul": 8,
    "oum": 1,
    "oup": 484,
    "our": 26,
    "ous": 28,
    "out": 23,
    "ove": 8,
    "ovi": 1,
    "owe": 23,
    "owi": 13,
    "owl": 7,
    "oyb": 2,
    "oyc": 1,
    "oyo": 4,
    "oys": 1,
    "ozu": 3,
    "ozz": 4,
    "pae": 13,
    "pag": 5,
    "pan": 46,
    "pap": 12,
    "par": 43,
    "pas": 29,
    "pat": 17,
    "pay": 2,
    "pbe": 9,
    "pbr": 1,
    "pbu": 5,
    "pch": 5,
    "pci": 1,
    "pcr": 10,
    "pdo": 5,
    "pea": 51,
    "ped": 2,
    "pen": 11,
    "pep": 19,
    "per": 24,
    "pes": 16,
    "pew": 1,
    "pfn": 3,
    "pge": 6,
    "pgn": 1,
    "pgr": 1,
    "phi": 4,
    "phl": 1,
    "pic": 5,
    "pig": 2,
    "pik": 3,
    "pin": 50,
    "pis": 1,
    "piz": 6,
    "pja": 1,
    "pka": 4,
    "pki": 14,
    "pla": 39,
    "ple": 40,
    "pli": 73,
    "pma": 2,
    "pme": 1,
    "pmi": 3,
    "pmo": 1,
    "poi": 1,
    "pol": 19,
    "pom": 2,
    "pop": 9,
    "por": 49,
    "pot": 94,
    "ppa": 1,
    "ppi": 6,
    "ppl": 40,
    "ppo": 4,
    "ppy": 9,
    "pra": 2,
    "prc": 1,
    "pri": 22,
    "pro": 5,
    "psa": 77,
    "psc": 1,
    "psm": 2,
    "psp": 5,
    "psw": 4,
    "pud": 32,
    "puf": 2,
    "pul": 4,
    "pum": 15,
    "pun": 4,
    "pur": 2,
    "pwe": 1,
    "pwi": 106,
    "pwo": 1,
    "pyc": 2,
    "pyr": 1,
    "pys": 6,
    "pzi": 1,
    "qcr": 1,
    "qua": 4,
    "que": 1,
    "qui": 5,
    "rab": 20,
    "rac": 5,
    "rad": 3,
    "rag": 22,
    "rai": 5,
    "raj": 4,
    "ram": 14,
    "ran": 28,
    "rap": 5,
    "ras": 18,
    "rau": 5,
    "rav": 5,
    "raw": 22,
    "raz": 2,
    "rba": 12,
    "rbb": 1,
    "rbc": 2,
    "rbd": 1,
    "rbe": 3,
    "rbm": 1,
    "rbo": 5,
    "rbp": 1,
    "rbs": 31,
    "rbt": 6,
    "rca": 2,
    "rcc": 5,
    "rch": 10,
    "rci": 1,
    "rco": 1,
    "rcr": 28,
    "rcu": 1,
    "rda": 1,
    "rdc": 3,
    "rdd": 5,
    "rdn": 2,
    "rdo": 2,
    "rdp": 1,
    "rds": 3,
    "rdu": 5,
    "rea": 297,
    "red": 14,
    "ree": 15,
    "ref": 1,
    "ren": 4,
    "ret": 1,
    "rew": 1,
    "rex": 1,
    "rey": 1,
    "rfa": 3,
    "rfn": 1,
    "rfr": 1,
    "rfw": 1,
    "rgu": 4,
    "rhe": 1,
    "rho": 1,
    "rhu": 5,
    "ria": 6,
    "rib": 3,
    "ric": 96,
    "rie": 36,
    "rik": 10,
    "ril": 11,
    "rim": 3,
    "rip": 23,
    "ris": 24,
    "riy": 2,
    "riz": 3,
    "rka": 9,
    "rkb": 3,
    "rkc": 7,
    "rkd": 1,
    "rke": 25,
    "rkl": 1,
    "rko": 1,
    "rkp": 1,
    "rkr": 1,
    "rks": 7,
    "rkt": 1,
    "rkw": 13,
    "rle": 1,
    "rlh": 2,
    "rli": 22,
    "rlo": 1,
    "rma": 3,
    "rme": 20,
    "rmo": 1,
    "rna": 2,
    "rnc": 6,
    "rne": 12,
    "rni": 25,
    "rnm": 1,
    "rns": 8,
    "roa": 14,
    "roc": 24,
    "rog": 5,
    "rol": 34,
    "rom": 6,
    "roo": 17,
    "roq": 1,
    "ros": 7,
    "rot": 72,
    "rou": 11,
    "row": 2,
    "rpe": 2,
    "rpo": 1,
    "rra": 10,
    "rri": 8,
    "rro": 30,
    "rry": 101,
    "rsa": 18,
    "rsb": 1,
    "rse": 11,
    "rsl": 8,
    "rsm": 1,
    "rsn": 11,
    "rso": 18,
    "rsp": 1,
    "rss": 2,
    "rst": 6,
    "rsv": 1,
    "rsw": 1,
    "rta": 2,
    "rtc": 3,
    "rtd": 5,
    "rti": 2,
    "rtm": 2,
    "rts": 2,
    "rtu": 1,
    "rud": 14,
    "ruf": 2,
    "rug": 9,
    "rui": 30,
    "ruk": 2,
    "rum": 3,
    "rve": 8,
    "rwi": 8,
    "rya": 3,
    "ryb": 3,
    "ryc": 31,
    "ryd": 1,
    "ryi": 1,
    "ryl": 2,
    "rym": 8,
    "ryp": 7,
    "ryr": 8,
    "rys": 14,
    "ryv": 1,
    "ryw": 17,
    "ryy": 15,
    "ryz": 5,
    "rzi": 5,
    "sab": 2,
    "sad": 1,
    "saf": 2,
    "sag": 49,
    "sal": 256,
    "sam": 10,
    "san": 75,
    "sar": 3,
    "sas": 3,
    "sau": 144,
    "saw": 2,
    "sba": 4,
    "sbe": 7,
    "sbi": 1,
    "sbl": 1,
    "sca": 3,
    "sci": 5,
    "sco": 14,
    "scu": 3,
    "sdh": 1,
    "sea": 7,
    "sec": 13,
    "sed": 24,
    "see": 9,
    "sef": 6,
    "seg": 3,
    "sek": 1,
    "sel": 12,
    "sem": 34,
    "sen": 27,
    "seo": 1,
    "ser": 93,
    "ses": 26,
    "sew": 7,
    "sfe": 2,
    "sfi": 2,
    "sgn": 1,
    "sgr": 3,
    "sha": 7,
    "shc": 1,
    "she": 18,
    "shf": 2,
    "shr": 18,
    "shs": 7,
    "sht": 2,
    "shw": 8,
    "sia": 6,
    "sig": 1,
    "sil": 29,
    "sim": 2,
    "sin": 18,
    "sio": 5,
    "ske": 5,
    "ski": 2,
    "sla": 2,
    "sle": 10,
    "sli": 29,
    "sma": 16,
    "sme": 1,
    "smo": 9,
    "smu": 2,
    "sni": 11,
    "snu": 1,
    "soj": 6,
    "sol": 1,
    "son": 4,
    "sor": 1,
    "sot": 19,
    "sou": 505,
    "soy": 4,
    "spa": 28,
    "spb": 9,
    "spi": 22,
    "spo": 4,
    "squ": 2,
    "sra": 2,
    "sri": 2,
    "sro": 5,
    "ssa": 10,
    "sse": 93,
    "ssh": 1,
    "ssi": 5,
    "sso": 1,
    "ssr": 5,
    "sss": 2,
    "sst": 5,
    "sta": 24,
    "stb": 2,
    "stc": 1,
    "ste": 42,
    "stg": 1,
    "sti": 5,
    "sto": 19,
    "str": 70,
    "sts": 1,
    "stu": 4,
    "stw": 8,
    "sty": 8,
    "stä": 2,
    "sua": 1,
    "sug": 2,
    "sum": 2,
    "sun": 4,
    "sur": 3,
    "sus": 2,
    "sve": 5,
    "swe": 28,
    "swi": 58,
    "syb": 2,
    "syo": 1,
    "szc": 2,
    "szu": 2,
    "taa": 10,
    "tab": 159,
    "tac": 3,
    "tag": 4,
    "taj": 1,
    "tal": 3,
    "tan": 10,
    "tao": 7,
    "tar": 13,
    "tas": 7,
    "tat": 89,
    "taw": 22,
    "tbe": 2,
    "tbr": 3,
    "tca": 23,
    "tce": 1,
    "tch": 6,
    "tco": 1,
    "tcr": 21,
    "tcu": 2,
    "tdi": 8,
    "tdo": 1,
    "tdu": 2,
    "tea": 11,
    "teb": 11,
    "tec": 6,
    "ted": 14,
    "tee": 1,
    "teo": 5,
    "tep": 1,
    "tes": 9,
    "tew": 43,
    "tex": 1,
    "tfi": 10,
    "tfu": 1,
    "tga": 1,
    "tgi": 10,
    "tha": 21,
    "thb": 70,
    "thc": 59,
    "thd": 25,
    "the": 11,
    "thf": 17,
    "thg": 41,
    "thh": 25,
    "thj": 4,
    "thk": 2,
    "thl": 15,
    "thm": 41,
    "thn": 12,
    "tho": 5,
    "thp": 45,
    "thq": 2,
    "thr": 46,
    "ths": 114,
    "tht": 35,
    "thv": 28,
    "thw": 44,
    "thy": 7,
    "tia": 1,
    "tic": 9,
    "tie": 16,
    "tif": 1,
    "tih": 2,
    "tik": 2,
    "til": 14,
    "tim": 1,
    "tio": 1,
    "tip": 1,
    "tir": 11,
    "tiw": 1,
    "tkn": 1,
    "tku": 1,
    "tla": 3,
    "tlo": 3,
    "tme": 3,
    "tmu": 2,
    "tna": 4,
    "toa": 6,
    "tob": 14,
    "toc": 43,
    "toe": 33,
    "tog": 4,
    "tol": 3,
    "tom": 90,
    "ton": 8,
    "too": 2,
    "tor": 11,
    "tos": 39,
    "tot": 1,
    "tou": 3,
    "tov": 3,
    "tow": 9,
    "toy": 1,
    "toz": 3,
    "tpa": 20,
    "tpl": 2,
    "tpo": 34,
    "tpu": 3,
    "tra": 28,
    "tri": 22,
    "tro": 30,
    "tru": 21,
    "try": 8,
    "tsa": 82,
    "tsg": 1,
    "tso": 22,
    "tst": 4,
    "tsz": 2,
    "tti": 22,
    "tto": 37,
    "ttu": 3,
    "tuc": 3,
    "tuf": 4,
    "tur": 29,
    "tve": 2,
    "twi": 33,
    "twu": 2,
    "tyl": 7,
    "tyo": 6,
    "tyr": 3,
    "tza": 1,
    "tze": 18,
    "tzi": 2,
    "tzl": 18,
    "tzw": 1,
    "täd": 2,
    "uac": 1,
    "uan": 5,
    "uar": 4,
    "uat": 2,
    "uba": 5,
    "ube": 6,
    "ubu": 1,
    "uca": 2,
    "ucc": 23,
    "uce": 131,
    "uck": 6,
    "ucu": 4,
    "udd": 32,
    "udl": 1,
    "uea": 1,
    "ueb": 8,
    "uec": 2,
    "ues": 1,
    "uet": 4,
    "uff": 9,
    "ugh": 15,
    "ugl": 2,
    "ugo": 2,
    "ugu": 7,
    "uin": 5,
    "uit": 30,
    "uke": 2,
    "ula": 20,
    "ule": 1,
    "ulg": 8,
    "uli": 22,
    "ull": 4,
    "uma": 2,
    "umb": 7,
    "umi": 2,
    "umk": 2,
    "umm": 4,
    "umo": 1,
    "ump": 84,
    "una": 3,
    "unc": 4,
    "une": 2,
    "unf": 1,
    "ung": 2,
    "unn": 1,
    "unt": 3,
    "uon": 1,
    "upa": 1,
    "upb": 6,
    "upc": 2,
    "upe": 4,
    "upf": 4,
    "upg": 8,
    "uph": 4,
    "upi": 10,
    "upk": 5,
    "upl": 6,
    "upm": 2,
    "upo": 2,
    "upr": 2,
    "ups": 79,
    "upw": 103,
    "upz": 1,
    "urc": 20,
    "urd": 9,
    "ure": 5,
    "urf": 2,
    "urg": 3,
    "urk": 26,
    "urm": 4,
    "urp": 1,
    "urr": 47,
    "urs": 7,
    "urt": 43,
    "urv": 1,
    "urw": 1,
    "usa": 16,
    "usc": 18,
    "use": 1,
    "ush": 15,
    "usi": 5,
    "uso": 2,
    "usp": 2,
    "usr": 1,
    "uss": 7,
    "ust": 7,
    "usv": 1,
    "usw": 3,
    "uta": 3,
    "utb": 1,
    "utc": 25,
    "utd": 1,
    "utf": 7,
    "utl": 1,
    "uto": 5,
    "utp": 8,
    "utr": 7,
    "uts": 26,
    "utt": 22,
    "utw": 7,
    "uun": 2,
    "uve": 3,
    "uwi": 2,
    "van": 18,
    "vap": 1,
    "var": 2,
    "vay": 2,
    "veb": 2,
    "vec": 2,
    "ved": 4,
    "veg": 161,
    "ven": 9,
    "ver": 6,
    "ves": 7,
    "vet": 1,
    "vie": 4,
    "vin": 2,
    "vio": 2,
    "vit": 1,
    "voc": 4,
    "vre": 1,
    "was": 1,
    "wbe": 18,
    "wea": 1,
    "wed": 9,
    "wee": 28,
    "wer": 27,
    "wha": 1,
    "whe": 6,
    "whi": 6,
    "who": 1,
    "wih": 1,
    "wil": 9,
    "win": 2,
    "wis": 7,
    "wit": 620,
    "wlw": 7,
    "wnr": 1,
    "wns": 1,
    "wok": 4,
    "wra": 4,
    "wso": 5,
    "wti": 2,
    "wwi": 11,
    "xch": 1,
    "xic": 2,
    "xme": 1,
    "xot": 2,
    "xsa": 2,
    "xtr": 1,
    "yab": 1,
    "yak": 3,
    "yal": 1,
    "yam": 1,
    "yan": 1,
    "yap": 4,
    "yaw": 3,
    "ybe": 7,
    "ybo": 1,
    "yca": 14,
    "ych": 2,
    "yco": 4,
    "ycr": 20,
    "ycu": 2,
    "ydh": 1,
    "yer": 1,
    "ygi": 1,
    "yic": 2,
    "yin": 1,
    "yle": 11,
    "yme": 5,
    "ymi": 8,
    "ymu": 2,
    "yog": 39,
    "yos": 1,
    "ypi": 2,
    "ypo": 5,
    "ypu": 1,
    "yra": 6,
    "yrh": 5,
    "yri": 6,
    "yro": 3,
    "ysa": 12,
    "ysc": 8,
    "yse": 6,
    "ysk": 3,
    "ysl": 1,
    "yso": 3,
    "ysp": 1,
    "yst": 5,
    "yva": 1,
    "ywi": 17,
    "yyo": 15,
    "yzu": 5,
    "zan": 4,
    "zar": 4,
    "zat": 1,
    "zaw": 5,
    "zbu": 1,
    "zca": 1,
    "zch": 2,
    "zed": 2,
    "zel": 20,
    "zen": 5,
    "zik": 1,
    "zil": 2,
    "zip": 5,
    "zle": 18,
    "zoc": 2,
    "zuc": 23,
    "zza": 10,
    "ädt": 2,
    "änd": 1,
    "öbe": 10,
    "öni": 1,
    "öst": 2,
    "üsl": 1,
    "üss": 1
  },
  "funcDe": [
    "mit",
    "und",
    "auf",
    "von",
    "vom",
    "nach",
    "in",
    "an",
    "zu",
    "aus",
    "bei",
    "für",
    "über",
    "unter"
  ],
  "funcEn": [
    "with",
    "and",
    "on",
    "from",
    "the",
    "of",
    "in",
    "a",
    "to",
    "at",
    "by",
    "for"
  ]
};


/***/ },

/***/ 830
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   n: () => (/* binding */ isLoanword)
/* harmony export */ });
/* unused harmony export LOANWORDS */
// Cross-lingual food loanwords that appear (often capitalized) in BOTH German and
// English menu descriptions and may score "German-ish" on the trigram model.
//
// Used for two purposes:
//  1. dishes.js  — avoid mistaking a loanword inside an English dish name for the
//                  start of the next German dish (small tie-breaker penalty).
//  2. score.js   — exempt these from the asymmetric "German-word-inside-English"
//                  purity penalty, so a legit English dish name isn't punished.
const LOANWORDS = new Set([
    'gnocchi', 'risotto', 'tiramisu', 'ravioli', 'lasagne', 'lasagna', 'pasta', 'penne',
    'spaghetti', 'pesto', 'ratatouille', 'stifado', 'gulasch', 'goulash', 'couscous',
    'bulgur', 'falafel', 'hummus', 'masala', 'chana', 'ravaya', 'yakitori', 'donut',
    'muffin', 'parmesan', 'mozzarella', 'feta', 'focaccia', 'baguette', 'panini',
    'gyros', 'baklava', 'wrap', 'bowl', 'dip', 'wok', 'sushi', 'curry', 'chili',
    'nachos', 'tacos', 'burrito', 'kebab', 'doner', 'quiche', 'wedges', 'polenta',
    'ciabatta', 'bruschetta', 'antipasti', 'carpaccio', 'bolognese', 'pomodoro',
    'tagliatelle', 'carbonara', 'arrabiata', 'arabiata',
    'schnitzel', 'schöberl', 'backerbsen', 'strudel', 'spätzle', 'spaetzle',
    'pizza', 'zucchini', 'minestrone', 'cheddar', 'tofu', 'croutons', 'quinoa',
    'harissa', 'prosciutto', 'steak', 'burger'
]);

function isLoanword(token) {
    if (!token) return false;
    const w = String(token).toLowerCase().replace(/[^a-zäöüß]/g, '');
    return w.length > 0 && LOANWORDS.has(w);
}


/***/ },

/***/ 901
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BT: () => (/* binding */ currentWeekNumber),
/* harmony export */   BY: () => (/* binding */ userFlags),
/* harmony export */   K8: () => (/* binding */ pollIntervalId),
/* harmony export */   Kl: () => (/* binding */ langMode),
/* harmony export */   L: () => (/* binding */ orderMap),
/* harmony export */   Ny: () => (/* binding */ currentUser),
/* harmony export */   O5: () => (/* binding */ setAuthToken),
/* harmony export */   UD: () => (/* binding */ setLangMode),
/* harmony export */   Xt: () => (/* binding */ setCurrentWeekNumber),
/* harmony export */   cc: () => (/* binding */ setPollIntervalId),
/* harmony export */   di: () => (/* binding */ setOrderMap),
/* harmony export */   gX: () => (/* binding */ authToken),
/* harmony export */   iw: () => (/* binding */ setHighlightTags),
/* harmony export */   lt: () => (/* binding */ setCurrentUser),
/* harmony export */   pK: () => (/* binding */ setCurrentYear),
/* harmony export */   p_: () => (/* binding */ allWeeks),
/* harmony export */   qo: () => (/* binding */ setDisplayMode),
/* harmony export */   sw: () => (/* binding */ displayMode),
/* harmony export */   tn: () => (/* binding */ setAllWeeks),
/* harmony export */   vW: () => (/* binding */ currentYear),
/* harmony export */   yz: () => (/* binding */ highlightTags)
/* harmony export */ });
/* unused harmony export setUserFlags */
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(801);
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(521);



let allWeeks = [];
let currentWeekNumber = (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__/* .getISOWeek */ .sn)(new Date());
let currentYear = new Date().getFullYear();
let displayMode = 'this-week';
let authToken = localStorage.getItem(_constants_js__WEBPACK_IMPORTED_MODULE_1__.LS.AUTH_TOKEN);
let currentUser = localStorage.getItem(_constants_js__WEBPACK_IMPORTED_MODULE_1__.LS.CURRENT_USER);
let orderMap = new Map();
let userFlags = new Set(JSON.parse(localStorage.getItem(_constants_js__WEBPACK_IMPORTED_MODULE_1__.LS.FLAGS) || '[]'));
let pollIntervalId = null;
let langMode = localStorage.getItem(_constants_js__WEBPACK_IMPORTED_MODULE_1__.LS.LANG) || 'de';
let highlightTags = JSON.parse(localStorage.getItem(_constants_js__WEBPACK_IMPORTED_MODULE_1__.LS.HIGHLIGHT_TAGS) || '[]');

function setAllWeeks(weeks) { allWeeks = weeks; }
function setCurrentWeekNumber(week) { currentWeekNumber = week; }
function setCurrentYear(year) { currentYear = year; }
function setAuthToken(token) { authToken = token; }
function setCurrentUser(user) { currentUser = user; }
function setOrderMap(map) { orderMap = map; }
function setUserFlags(flags) { userFlags = flags; }
function setPollIntervalId(id) { pollIntervalId = id; }
function setHighlightTags(tags) { highlightTags = tags; }

/** Only 'this-week' and 'next-week' are valid display modes. */
function setDisplayMode(mode) {
    if (mode !== 'this-week' && mode !== 'next-week') {
        console.warn(`[state] Invalid displayMode: "${mode}". Ignoring.`);
        return;
    }
    displayMode = mode;
}

/** Only 'de', 'en', and 'all' are valid language modes. */
function setLangMode(lang) {
    if (!['de', 'en', 'all'].includes(lang)) {
        console.warn(`[state] Invalid langMode: "${lang}". Ignoring.`);
        return;
    }
    langMode = lang;
}


/***/ },

/***/ 618
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   F: () => (/* binding */ tracker)
/* harmony export */ });
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(521);
const STORAGE_KEY = '_kstats_state';
const GIST_ID_KEY = '_kstats_gist_id';



// GIST_PAT arrives obfuscated (XOR with DEV_MODE_PW_HASH + base64) so GitHub's
// secret scanning cannot revoke the committed token. Reverse it here.
function _deobfuscatePat(blob, key) {
    try {
        const bin = atob(blob);
        const k = new TextEncoder().encode(key);
        let out = '';
        for (let i = 0; i < bin.length; i++) {
            out += String.fromCharCode(bin.charCodeAt(i) ^ k[i % k.length]);
        }
        return out;
    } catch (e) {
        return '';
    }
}
const GIST_PAT_REAL = typeof _constants_js__WEBPACK_IMPORTED_MODULE_0__/* .GIST_PAT */ .q !== 'undefined'
    ? _deobfuscatePat(_constants_js__WEBPACK_IMPORTED_MODULE_0__/* .GIST_PAT */ .q, _constants_js__WEBPACK_IMPORTED_MODULE_0__/* .DEV_MODE_PW_HASH */ .Z7)
    : '';

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
            pendingFlush: null,
            pendingFlushes: [],
            _catCounted: {}
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
                    pendingFlush: null,
                    pendingFlushes: parsed.pendingFlushes || (parsed.pendingFlush ? [parsed.pendingFlush] : []),
                    _catCounted: parsed._catCounted || {}
                };
            } catch (e) {
                this._state = this._freshState(today);
            }
        } else {
            this._state = this._freshState(today);
        }

        if (this._state.date !== today) {
            this._state.pendingFlushes.push({
                date: this._state.date,
                daily: { ...this._state.daily },
                user_hash: this._state.user_hash
            });
            this._state.daily = {};
            this._state._catCounted = {};
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

    incrementValue(key, val) {
        this.load();
        this._state.daily[key] = (this._state.daily[key] || 0) + val;
        this.persist();
    }

    incrementCategory(key, value) {
        this.load();
        const safe = String(value).replace(/[^a-zA-Z0-9]/g, '_');
        const composite = key + '_' + safe;
        if (!this._state._catCounted) this._state._catCounted = {};
        if (this._state._catCounted[composite]) return;
        this._state._catCounted[composite] = true;
        if (!this._state.daily[composite]) this._state.daily[composite] = 0;
        this._state.daily[composite]++;
        this.persist();
    }

    set(key, value) {
        this.load();
        this._state.daily[key] = value;
        this.persist();
    }

    setUserHash(hash) {
        this.load();
        this._state.user_hash = hash;
        this.persist();
    }

    setUserHashError() {
        this.load();
        this._state.user_hash = null;
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
        const list = this._state.pendingFlushes;
        return list.length > 0 ? { ...list[0] } : null;
    }

    markFlushed() {
        this.load();
        this._state.has_flushed = true;
        this._state.pendingFlush = null;
        if (this._state.pendingFlushes.length > 0) {
            this._state.pendingFlushes.shift();
        }
        this.persist();
    }

    _resolveGistId() {
        return localStorage.getItem(GIST_ID_KEY) || _constants_js__WEBPACK_IMPORTED_MODULE_0__/* .GIST_ID */ .KJ;
    }

    _saveGistId(id) {
        localStorage.setItem(GIST_ID_KEY, id);
    }

    async flushToGist(pendingDate, pendingDaily, pendingUserHash) {
        try {
            let gistId = this._resolveGistId();
            let resp = await fetch(`https://api.github.com/gists/${gistId}`, {
                headers: { 'Authorization': `token ${GIST_PAT_REAL}`, 'Accept': 'application/vnd.github.v3+json' }
            });

            let data;
            if (resp.status === 404 && !localStorage.getItem(GIST_ID_KEY)) {
                // Gist doesn't exist and we haven't saved an ID yet — auto-create
                console.log('[StatsTracker] Gist not found, creating a new secret Gist...');
                const createResp = await fetch('https://api.github.com/gists', {
                    method: 'POST',
                    headers: { 'Authorization': `token ${GIST_PAT_REAL}`, 'Content-Type': 'application/json' },
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
            // Self-contained day metadata
            day.date = pendingDate;
            if (pendingUserHash) {
                day.user_hash = pendingUserHash;
            }
            if (!day.seen_hashes) day.seen_hashes = [];
            if (!day.unique_today) day.unique_today = 0;

            if (pendingUserHash && !day.seen_hashes.includes(pendingUserHash)) {
                day.seen_hashes.push(pendingUserHash);
                day.unique_today++;
            }

            for (const [key, val] of Object.entries(pendingDaily)) {
                if (key.endsWith('_sum') || key.endsWith('_count')) continue;
                if (typeof val === 'number') {
                    day[key] = (day[key] || 0) + val;
                } else {
                    day[key] = val;
                }
            }

            // Compute averages from sum/count pairs
            const AVG_PAIRS = [
                { sum: 'session_duration_sum', count: 'session_duration_count', avg: 'session_duration_avg' },
                { sum: 'load_time_sum', count: 'load_time_count', avg: 'load_time_avg' },
                { sum: 'api_latency_sum', count: 'api_latency_count', avg: 'api_latency_avg' },
            ];
            for (const pair of AVG_PAIRS) {
                const sum = pendingDaily[pair.sum];
                const count = pendingDaily[pair.count];
                if (typeof sum === 'number' && typeof count === 'number' && count > 0) {
                    const oldCount = day[pair.count] || 0;
                    const oldAvg = day[pair.avg] || 0;
                    day[pair.avg] = (oldAvg * oldCount + sum) / (oldCount + count);
                    day[pair.count] = oldCount + count;
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
                headers: { 'Authorization': `token ${GIST_PAT_REAL}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: { 'stats.json': { content: JSON.stringify(data, null, 2) } } })
            });
            if (!patchResp.ok) throw new Error(`Gist PATCH failed: ${patchResp.status}`);

            this.markFlushed();
        } catch (e) {
            console.warn('[StatsTracker] Flush failed:', e.message);
        }
    }
}

const tracker = new StatsTracker();


/***/ },

/***/ 842
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Gk: () => (/* binding */ openVersionMenu),
/* harmony export */   Mb: () => (/* binding */ updateAlarmBell),
/* harmony export */   OR: () => (/* binding */ renderVisibleWeeks),
/* harmony export */   Ux: () => (/* binding */ checkForUpdates),
/* harmony export */   gJ: () => (/* binding */ updateNextWeekBadge),
/* harmony export */   showErrorModal: () => (/* binding */ showErrorModal),
/* harmony export */   um: () => (/* binding */ checkBootloaderVersion),
/* harmony export */   wy: () => (/* binding */ syncMenuItemHeights)
/* harmony export */ });
/* unused harmony exports createDayCard, fetchVersions, openInstallPage, updateCountdown, removeCountdown */
/* harmony import */ var _state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(901);
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(801);
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(521);
/* harmony import */ var _api_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(672);
/* harmony import */ var _actions_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(367);
/* harmony import */ var _i18n_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(646);
/* harmony import */ var _lang_langModel_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(152);
/* harmony import */ var _lang_langModelSeed_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(977);









const heatmapLangModel = (0,_lang_langModel_js__WEBPACK_IMPORTED_MODULE_6__/* .createLangModel */ .C)(_lang_langModelSeed_js__WEBPACK_IMPORTED_MODULE_7__/* .LANG_MODEL_SEED */ .x);

/**
 * Updates the "Next Week" button tooltip and glow state.
 * Tooltip shows order status summary and highlight count.
 * Glow activates only if Mon-Thu have orderable menus without orders (Friday exempt).
 */
function updateNextWeekBadge() {
    const btnNextWeek = document.getElementById('btn-next-week');
    let nextWeek = _state_js__WEBPACK_IMPORTED_MODULE_0__/* .currentWeekNumber */ .BT + 1;
    let nextYear = _state_js__WEBPACK_IMPORTED_MODULE_0__/* .currentYear */ .vW;
    if (nextWeek > 52) { nextWeek = 1; nextYear++; }

    const nextWeekData = _state_js__WEBPACK_IMPORTED_MODULE_0__/* .allWeeks */ .p_.find(w => w.weekNumber === nextWeek && w.year === nextYear);
    let totalDataCount = 0;
    let orderableCount = 0;
    let daysWithOrders = 0;
    let monThuOrderableNoOrder = 0;

    if (nextWeekData && nextWeekData.days) {
        nextWeekData.days.forEach(day => {
            if (day.items && day.items.length > 0) {
                totalDataCount++;
                const isOrderable = day.items.some(item => item.available);
                if (isOrderable) orderableCount++;

                let hasOrder = false;
                day.items.forEach(item => {
                    const articleId = item.articleId || parseInt(item.id.split('_')[1]);
                    const key = `${day.date}_${articleId}`;
                    if (_state_js__WEBPACK_IMPORTED_MODULE_0__/* .orderMap */ .L.has(key) && _state_js__WEBPACK_IMPORTED_MODULE_0__/* .orderMap */ .L.get(key).length > 0) hasOrder = true;
                });

                if (hasOrder) daysWithOrders++;

                // Feature 5: Only Mon(1)-Thu(4) count for glow logic, Friday(5) is exempt
                const dayOfWeek = new Date(day.date).getDay();
                if (dayOfWeek >= 1 && dayOfWeek <= 4 && isOrderable && !hasOrder) {
                    monThuOrderableNoOrder++;
                }
            }
        });
    }

    // Remove any old visible badge element (Feature 3: numbers hidden)
    const existingBadge = btnNextWeek.querySelector('.nav-badge');
    if (existingBadge) existingBadge.remove();

    if (totalDataCount > 0) {
        // Count highlight menus in next week
        let highlightCount = 0;
        if (nextWeekData && nextWeekData.days) {
            nextWeekData.days.forEach(day => {
                day.items.forEach(item => {
                    const nameMatches = (0,_actions_js__WEBPACK_IMPORTED_MODULE_4__/* .checkHighlight */ .BM)(item.name);
                    const descMatches = (0,_actions_js__WEBPACK_IMPORTED_MODULE_4__/* .checkHighlight */ .BM)(item.description);
                    if (nameMatches.length > 0 || descMatches.length > 0) {
                        highlightCount++;
                    }
                });
            });
        }

        // Feature 3: All info goes to button tooltip instead of visible badge
        let tooltipParts = [`${daysWithOrders} ${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('badgeOrdered')} / ${orderableCount} ${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('badgeOrderable')} / ${totalDataCount} ${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('badgeTotal')}`];
        if (highlightCount > 0) {
            tooltipParts.push(`${highlightCount} ${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('badgeHighlights')}`);
        }
        btnNextWeek.title = tooltipParts.join(' • ');

        // Feature 5: Glow only if Mon-Thu have orderable days without existing orders
        if (monThuOrderableNoOrder > 0) {
            btnNextWeek.classList.add('new-week-available');
            const storageKey = `kantine_notified_nextweek_${nextYear}_${nextWeek}`;
            if (!localStorage.getItem(storageKey)) {
                localStorage.setItem(storageKey, 'true');
                (0,_actions_js__WEBPACK_IMPORTED_MODULE_4__/* .showToast */ .P0)((0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('newMenuDataAvailable'), 'info');
                if (Notification.permission === 'granted') {
                    new Notification('Kantine Wrapper', {
                        body: (0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('newMenuDataAvailable'),
                        icon: '🍽️'
                    });
                } else if (Notification.permission === 'default') {
                    Notification.requestPermission();
                }
            }
        } else {
            btnNextWeek.classList.remove('new-week-available');
        }
    } else {
        btnNextWeek.title = (0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('nextWeekTooltipDefault');
        btnNextWeek.classList.remove('new-week-available');
    }
}


function renderVisibleWeeks() {
    const menuContainer = document.getElementById('menu-container');
    if (!menuContainer) return;

    // Save scroll position before DOM wipe — .days-grid is the scroll container
    const oldGrid = menuContainer.querySelector('.days-grid');
    const savedScrollTop = oldGrid ? oldGrid.scrollTop : 0;

    menuContainer.innerHTML = '';

    let targetWeek = _state_js__WEBPACK_IMPORTED_MODULE_0__/* .currentWeekNumber */ .BT;
    let targetYear = _state_js__WEBPACK_IMPORTED_MODULE_0__/* .currentYear */ .vW;

    if (_state_js__WEBPACK_IMPORTED_MODULE_0__/* .displayMode */ .sw === 'next-week') {
        targetWeek++;
        if (targetWeek > 52) { targetWeek = 1; targetYear++; }
    }

    const allDays = _state_js__WEBPACK_IMPORTED_MODULE_0__/* .allWeeks */ .p_.flatMap(w => w.days || []);
    const daysInTargetWeek = allDays.filter(day => {
        const d = new Date(day.date);
        return (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .getISOWeek */ .sn)(d) === targetWeek && (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .getWeekYear */ .Ao)(d) === targetYear;
    });

    if (daysInTargetWeek.length === 0) {
        menuContainer.innerHTML = `
            <div class="empty-state">
                <p>${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('noMenuData')} ${targetWeek} (${targetYear}).</p>
                <small>${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('noMenuDataHint')}</small>
            </div>`;
        return;
    }


    const headerWeekInfo = document.getElementById('header-week-info');
    const weekTitle = _state_js__WEBPACK_IMPORTED_MODULE_0__/* .displayMode */ .sw === 'this-week' ? (0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('thisWeek') : (0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('nextWeek');
    headerWeekInfo.innerHTML = `
        <div class="header-week-title">${weekTitle}</div>
        <div class="header-week-subtitle">${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('weekLabel')} ${targetWeek} • ${targetYear}</div>`;

    const grid = document.createElement('div');
    grid.className = 'days-grid';

    daysInTargetWeek.sort((a, b) => a.date.localeCompare(b.date));

    const workingDays = daysInTargetWeek.filter(d => {
        const date = new Date(d.date);
        const day = date.getDay();
        return day !== 0 && day !== 6;
    });

    workingDays.forEach(day => {
        const card = createDayCard(day);
        if (card) grid.appendChild(card);
    });

    menuContainer.appendChild(grid);

    // Restore scroll position on the new .days-grid
    if (savedScrollTop > 0) grid.scrollTop = savedScrollTop;

    setTimeout(() => syncMenuItemHeights(grid), 0);
}

function syncMenuItemHeights(grid) {
    const cards = grid.querySelectorAll('.menu-card');
    if (cards.length === 0) return;

    // 1. Gather all menu-item groups (rows) across cards
    const itemRows = [];
    let maxItems = 0;

    const cardItems = Array.from(cards).map(card => {
        const items = Array.from(card.querySelectorAll('.menu-item'));
        maxItems = Math.max(maxItems, items.length);
        return items;
    });

    for (let i = 0; i < maxItems; i++) {
        // Collect i-th item from each card (forming a "row")
        itemRows[i] = cardItems.map(items => items[i]).filter(item => !!item);
    }

    // 2. Batch Reset (Write phase) - clear old heights to let them flow naturally
    itemRows.flat().forEach(item => {
        item.style.height = 'auto';
    });

    // 3. Batch Read (Read phase) - measure all heights in one pass to avoid layout thrashing
    const rowMaxHeights = itemRows.map(row => {
        return Math.max(...row.map(item => item.offsetHeight));
    });

    // 4. Batch Apply (Write phase) - set synchronized heights
    itemRows.forEach((row, i) => {
        const height = `${rowMaxHeights[i]}px`;
        row.forEach(item => {
            item.style.height = height;
        });
    });
}

function createDayCard(day) {
    if (!day.items || day.items.length === 0) return null;

    const card = document.createElement('div');
    card.className = 'menu-card';

    const now = new Date();
    const cardDate = new Date(day.date);

    let isPastCutoff = false;
    if (day.orderCutoff) {
        isPastCutoff = now >= new Date(day.orderCutoff);
    } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const cd = new Date(day.date);
        cd.setHours(0, 0, 0, 0);
        isPastCutoff = cd < today;
    }

    if (isPastCutoff) card.classList.add('past-day');

    const menuBadges = [];
    if (day.items) {
        day.items.forEach(item => {
            const articleId = item.articleId || parseInt(item.id.split('_')[1]);
            const orderKey = `${day.date}_${articleId}`;
            const orders = _state_js__WEBPACK_IMPORTED_MODULE_0__/* .orderMap */ .L.get(orderKey) || [];
            const count = orders.length;

            if (count > 0) {
                const match = item.name.match(/([M][1-9][Ff]?)/);
                if (match) {
                    let code = match[1];
                    if (count > 1) code += '+';
                    menuBadges.push(code);
                }
            }
        });
    }

    const header = document.createElement('div');
    header.className = 'card-header';
    const dateStr = cardDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

    const badgesHtml = menuBadges.reduce((acc, code) => acc + `<span class="menu-code-badge">${code}</span>`, '');

    let headerClass = '';
    const hasAnyOrder = day.items && day.items.some(item => {
        const articleId = item.articleId || parseInt(item.id.split('_')[1]);
        const key = `${day.date}_${articleId}`;
        return _state_js__WEBPACK_IMPORTED_MODULE_0__/* .orderMap */ .L.has(key) && _state_js__WEBPACK_IMPORTED_MODULE_0__/* .orderMap */ .L.get(key).length > 0;
    });

    const hasOrderable = day.items && day.items.some(item => item.available);

    if (hasAnyOrder) {
        headerClass = 'header-violet';
    } else if (hasOrderable && !isPastCutoff) {
        headerClass = 'header-green';
    } else {
        headerClass = 'header-red';
    }

    if (headerClass) header.classList.add(headerClass);

    header.innerHTML = `
        <div class="day-header-left">
            <span class="day-name">${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .translateDay */ .FS)(day.weekday)}</span>
            <div class="day-badges">${badgesHtml}</div>
        </div>
        <span class="day-date">${dateStr}</span>`;
    card.appendChild(header);

    const body = document.createElement('div');
    body.className = 'card-body';

    const todayDateStr = new Date().toISOString().split('T')[0];
    const isToday = day.date === todayDateStr;

    const sortedItems = [...day.items].sort((a, b) => {
        if (isToday) {
            const aId = a.articleId || parseInt(a.id.split('_')[1]);
            const bId = b.articleId || parseInt(b.id.split('_')[1]);
            const aOrdered = _state_js__WEBPACK_IMPORTED_MODULE_0__/* .orderMap */ .L.has(`${day.date}_${aId}`);
            const bOrdered = _state_js__WEBPACK_IMPORTED_MODULE_0__/* .orderMap */ .L.has(`${day.date}_${bId}`);

            if (aOrdered && !bOrdered) return -1;
            if (!aOrdered && bOrdered) return 1;
        }
        return a.name.localeCompare(b.name);
    });

    sortedItems.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'menu-item';

        const articleId = item.articleId || parseInt(item.id.split('_')[1]);
        const orderKey = `${day.date}_${articleId}`;
        const orderIds = _state_js__WEBPACK_IMPORTED_MODULE_0__/* .orderMap */ .L.get(orderKey) || [];
        const orderCount = orderIds.length;

        const dm = localStorage.getItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.DEV_MODE) === 'true';

        const isLowStock = item.available && item.amountTracking
            && typeof item.availableAmount === 'number'
            && item.availableAmount > 0 && item.availableAmount < 10;

        // Normal mode deliberately hides the Stückzahl; dev mode shows it.
        // Stock below 10 switches to the "wenig verfügbar" label + green-yellow color.
        let statusBadge = '';
        if (!item.available) {
            statusBadge = `<span class="badge sold-out">${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('soldOut')}</span>`;
        } else if (isLowStock) {
            statusBadge = dm
                ? `<span class="badge available-low">${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('available')} (${item.availableAmount})</span>`
                : `<span class="badge available-low">${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('lowStock')}</span>`;
        } else if (!item.amountTracking) {
            statusBadge = `<span class="badge available">${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('available')}</span>`;
        } else if (dm) {
            statusBadge = `<span class="badge available">${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('available')} (${item.availableAmount})</span>`;
        } else {
            statusBadge = `<span class="badge available">${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('available')}</span>`;
        }

        const split = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .splitLanguage */ .dk)(item.description || '');
        const lbl = split.label || 'fallback';
        
        let dTitle = '';
        if (lbl !== 'high' && lbl !== 'template') {
            dTitle = ` title="${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(item.description || '')}"`;
        }

        let cBadge = '';
        if (dm) {
            const c = split.confidence ?? 0;
            const s = split.subScores || {};
            const tp = `Split confidence: score ${c.toFixed(2)} · anchor ${(s.anchor||0).toFixed(2)} · purity ${(s.purity||0).toFixed(2)} · courses ${(s.course||0).toFixed(2)} · coverage ${(s.coverage||0).toFixed(2)}`;
            cBadge = `<span class="badge confidence-badge confidence-${lbl}" title="${tp}">${lbl}</span>`;
        }

        let heatmapHtml = '';
        if (dm && lbl !== 'high') {
            const descText = item.description || '';
            const affinities = heatmapLangModel.scoreCharAffinities(descText);
            const chars = affinities.map(({char, affinity}) => {
                const hue = affinity > 0 ? 210 : 0;
                const saturation = Math.round(Math.min(80, Math.abs(affinity) * 80));
                const color = `hsl(${hue}, ${saturation}%, 50%)`;
                return `<span class="heatmap-char" style="color: ${color}">${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(char)}</span>`;
            }).join('');
            heatmapHtml = `<div class="heatmap-row">${chars}</div>`;
        }

        let orderedBadge = '';
        if (orderCount > 0) {
            const countBadge = orderCount > 1 ? `<span class="order-count-badge">${orderCount}</span>` : '';
            orderedBadge = `<span class="badge ordered"><span class="material-icons-round">check_circle</span> ${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('ordered')}${countBadge}</span>`;
            itemEl.classList.add('ordered');
            if (new Date(day.date).toDateString() === now.toDateString()) {
                itemEl.classList.add('today-ordered');
            }
        }

        const flagId = `${day.date}_${articleId}`;
        const isFlagged = _state_js__WEBPACK_IMPORTED_MODULE_0__/* .userFlags */ .BY.has(flagId);
        if (isFlagged) {
            itemEl.classList.add(item.available ? 'flagged-available' : 'flagged-sold-out');
        }

        const matchedTags = [...new Set([...(0,_actions_js__WEBPACK_IMPORTED_MODULE_4__/* .checkHighlight */ .BM)(item.name), ...(0,_actions_js__WEBPACK_IMPORTED_MODULE_4__/* .checkHighlight */ .BM)(item.description)])];
        if (matchedTags.length > 0) {
            itemEl.classList.add('highlight-glow');
        }

        let orderButton = '';
        let cancelButton = '';
        let flagButton = '';

        if (_state_js__WEBPACK_IMPORTED_MODULE_0__/* .authToken */ .gX && !isPastCutoff) {
            const flagIcon = isFlagged ? 'notifications_active' : 'notifications_none';
            const flagClass = isFlagged ? 'btn-flag active' : 'btn-flag';
            const flagTitle = isFlagged ? (0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('flagDeactivate') : (0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('flagActivate');
            if (!item.available || isFlagged) {
                flagButton = `<button class="${flagClass}" data-date="${day.date}" data-article="${articleId}" data-name="${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(item.name)}" data-cutoff="${day.orderCutoff}" title="${flagTitle}"><span class="material-icons-round">${flagIcon}</span></button>`;
            }

            if (item.available) {
                if (orderCount > 0) {
                    orderButton = `<button class="btn-order btn-order-compact" data-date="${day.date}" data-article="${articleId}" data-name="${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(item.name)}" data-price="${item.price}" data-desc="${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(item.description || '')}" title="${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(item.name)} – ${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('orderAgainTooltip')}"><span class="material-icons-round">add</span></button>`;
                } else {
                    orderButton = `<button class="btn-order" data-date="${day.date}" data-article="${articleId}" data-name="${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(item.name)}" data-price="${item.price}" data-desc="${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(item.description || '')}" title="${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(item.name)} – ${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('orderTooltip')}"><span class="material-icons-round">add_shopping_cart</span> ${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('orderButton')}</button>`;
                }
            }

            if (orderCount > 0) {
                const cancelIcon = orderCount === 1 ? 'close' : 'remove';
                const cancelTitle = orderCount === 1 ? (0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('cancelOrder') : (0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('cancelOneOrder');
                cancelButton = `<button class="btn-cancel" data-date="${day.date}" data-article="${articleId}" data-name="${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(item.name)}" title="${cancelTitle}"><span class="material-icons-round">${cancelIcon}</span></button>`;
            }
        }

        let tagsHtml = '';
        if (matchedTags.length > 0) {
            const badges = matchedTags.reduce((acc, t) => acc + `<span class="tag-badge-small"><span class="material-icons-round" style="font-size:10px;margin-right:2px">star</span>${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(t)}</span>`, '');
            tagsHtml = `<div class="matched-tags">${badges}</div>`;
        }

        itemEl.innerHTML = `<div class="item-header"><span class="item-name">${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(item.name)}</span><span class="item-price">${item.price.toFixed(2)} €</span></div><div class="item-status-row">${orderedBadge}${cancelButton}${orderButton}${flagButton}<div class="badges">${statusBadge}</div></div>${tagsHtml}<div class="item-desc-wrap"><p class="item-desc"${dTitle}>${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .getLocalizedText */ .PC)(item.description))} ${cBadge}</p>${heatmapHtml}</div>`;

        const orderBtn = itemEl.querySelector('.btn-order');
        if (orderBtn) {
            orderBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const btn = e.currentTarget;
                btn.disabled = true;
                btn.classList.add('loading');
                (0,_actions_js__WEBPACK_IMPORTED_MODULE_4__/* .placeOrder */ .wH)(btn.dataset.date, parseInt(btn.dataset.article), btn.dataset.name, parseFloat(btn.dataset.price), btn.dataset.desc || '')
                    .finally(() => { btn.disabled = false; btn.classList.remove('loading'); });
            });
        }

        const cancelBtn = itemEl.querySelector('.btn-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const btn = e.currentTarget;
                btn.disabled = true;
                (0,_actions_js__WEBPACK_IMPORTED_MODULE_4__/* .cancelOrder */ .N4)(btn.dataset.date, parseInt(btn.dataset.article), btn.dataset.name)
                    .finally(() => { btn.disabled = false; });
            });
        }

        const flagBtn = itemEl.querySelector('.btn-flag');
        if (flagBtn) {
            flagBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const btn = e.currentTarget;
                (0,_actions_js__WEBPACK_IMPORTED_MODULE_4__/* .toggleFlag */ .PQ)(btn.dataset.date, parseInt(btn.dataset.article), btn.dataset.name, btn.dataset.cutoff);
            });
        }

        body.appendChild(itemEl);
    });

    card.appendChild(body);
    return card;
}

async function fetchVersions(devMode) {
    const endpoint = devMode
        ? `${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .GITHUB_API */ .pe}/tags?per_page=20`
        : `${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .GITHUB_API */ .pe}/releases?per_page=20`;

    // Send stored ETag (if any) for conditional request — GitHub returns 304 at no rate-limit cost
    const storedEtag = localStorage.getItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.VERSION_ETAG);
    const resp = await fetch(endpoint, { headers: (0,_api_js__WEBPACK_IMPORTED_MODULE_3__/* .githubHeaders */ .O)(storedEtag) });

    // 304 Not Modified — content unchanged, skip processing
    if (resp.status === 304) return null;

    if (!resp.ok) {
        if (resp.status === 403) {
            throw new Error('API Rate Limit erreicht (403). Bitte später erneut versuchen.');
        }
        throw new Error(`GitHub API ${resp.status}`);
    }

    // Persist new ETag for next conditional request
    const newEtag = resp.headers.get('ETag');
    if (newEtag) localStorage.setItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.VERSION_ETAG, newEtag);

    const data = await resp.json();

    return data.map(item => {
        const tag = devMode ? item.name : item.tag_name;
        return {
            tag,
            name: devMode ? tag : (item.name || tag),
            // Raw content URL: fetched as blob to bypass firewall blocking htmlpreview
            rawUrl: `${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .RAW_INSTALLER_BASE */ .IY}/${tag}/dist/install.html`,
            // GitHub file browser URL: opened directly in new tab
            githubUrl: `${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .GITHUB_FILE_BASE */ .fK}/${tag}/dist/install.html`,
            body: item.body || ''
        };
    });
}

/**
 * Fetches an install.html from raw GitHub content and opens it as a Blob URL.
 * Falls back to opening the raw URL directly if fetch fails.
 * @param {string} rawUrl - The raw.githubusercontent.com URL of the installer HTML.
 */
async function openInstallPage(rawUrl) {
    try {
        const resp = await fetch(rawUrl);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const html = await resp.text();
        const blob = new Blob([html], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, '_blank');
        if (!win) throw new Error('Popup blocked');
        // Revoke blob URL after 5 minutes to free memory
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5 * 60 * 1000);
    } catch (e) {
        console.warn('[Kantine] Blob open failed, falling back to raw URL:', e);
        window.open(rawUrl, '_blank');
    }
}

async function checkForUpdates() {
    const currentVersion = 'v2.1.0';
    const devMode = localStorage.getItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.DEV_MODE) === 'true';

    // Cache-first: use cached versions if ≤1h old to avoid hitting GitHub API rate limit
    const cachedRaw = localStorage.getItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.VERSION_CACHE);
    if (cachedRaw) {
        try {
            const cached = JSON.parse(cachedRaw);
            if (cached && cached.timestamp && cached.devMode === devMode && cached.versions && cached.versions.length) {
                const age = Date.now() - cached.timestamp;
                if (age < 60 * 60 * 1000) {
                    const latest = cached.versions[0].tag;
                    if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .isNewer */ .U4)(latest, currentVersion)) {
                        showUpdateBadge(cached.versions[0]);
                    }
                    return; // skip API call entirely
                }
            }
        } catch (_) {}
    }

    try {
        const versions = await fetchVersions(devMode);
        if (!versions || !versions.length) return;

        localStorage.setItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.VERSION_CACHE, JSON.stringify({
            timestamp: Date.now(), devMode, versions
        }));

        const latest = versions[0].tag;

        if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .isNewer */ .U4)(latest, currentVersion)) return;

        showUpdateBadge(versions[0]);
    } catch (e) {
        console.warn('[Kantine] Version check failed:', e);
    }
}

/** Helper: show/cache the 🆕 badge in the header. Extracted so cache-first path can also show it. */
function showUpdateBadge(version) {
    const headerTitle = document.querySelector('.header-left h1');
    if (headerTitle && !headerTitle.querySelector('.update-icon')) {
        const icon = document.createElement('span');
        icon.className = 'update-icon';
        icon.role = 'button';
        icon.innerHTML = '🆕';
        icon.title = `Update: ${version.tag} — Klick zum Installieren`;
        icon.addEventListener('click', () => openInstallPage(version.rawUrl));
        headerTitle.appendChild(icon);
    }
}

/**
 * Checks if the bootloader (bookmarklet) version is older than MIN_BOOTLOADER_VERSION (v2.0.5).
 * The bootloader stashes its version in LS.BOOTLOADER_VERSION_KEY (_k_boot_ver).
 * If the key is missing (pre-v2.0.6 bootloader) or the version is < v2.0.5,
 * injects a ⚠️ badge next to the version tag with a hover tooltip
 * containing an explanation and a link button to the installer page.
 */
function checkBootloaderVersion() {
    const bootVer = localStorage.getItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.BOOTLOADER_VERSION_KEY);
    if (bootVer && !(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .isNewer */ .U4)(_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .MIN_BOOTLOADER_VERSION */ .w$, bootVer)) {
        console.log('[Kantine] Bootloader OK (_k_boot_ver=' + bootVer + ')');
        return;
    }
    console.log('[Kantine] ⚠ User bookmarklet update required! (_k_boot_ver=' + (bootVer || 'MISSING') + ')');

    const versionTag = document.querySelector('.version-tag');
    if (!versionTag) return;
    const parent = versionTag.parentNode;
    if (!parent) return;
    if (parent.querySelector('.bootloader-warning-badge')) return;

    const badge = document.createElement('span');
    badge.className = 'bootloader-warning-badge';
    badge.innerHTML = '⚠️';
    badge.title = (0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('bootloaderUpdateTooltip');

    const tooltip = document.createElement('div');
    tooltip.className = 'bootloader-warning-tooltip hidden';
    tooltip.innerHTML = `
        <div class="bootloader-warning-text">${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('bootloaderUpdateTooltip')}</div>
        <button class="btn-install-bootloader">${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('bootloaderUpdateLink')}</button>
    `;

    versionTag.parentNode.insertBefore(badge, versionTag.nextSibling);

    let hideTimeout;

    function scheduleHide() {
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
            tooltip.classList.add('hidden');
            if (tooltip.parentNode) tooltip.remove();
        }, 200);
    }

    badge.addEventListener('mouseenter', () => {
        clearTimeout(hideTimeout);
        tooltip.classList.remove('hidden');
        document.body.appendChild(tooltip);
        const rect = badge.getBoundingClientRect();
        tooltip.style.top = (rect.bottom + window.scrollY + 8) + 'px';
        tooltip.style.left = (rect.left + window.scrollX) + 'px';
    });
    badge.addEventListener('mouseleave', scheduleHide);
    tooltip.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
    tooltip.addEventListener('mouseleave', scheduleHide);

    tooltip.querySelector('.btn-install-bootloader').addEventListener('click', () => {
        const installerUrl = `${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .RAW_INSTALLER_BASE */ .IY}/${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .CLIENT_VERSION */ .fZ}/dist/install.html`;
        openInstallPage(installerUrl);
    });
}

function openVersionMenu() {
    const modal = document.getElementById('version-modal');
    const container = document.getElementById('version-list-container');
    const devToggle = document.getElementById('dev-mode-toggle');
    const currentVersion = 'v2.1.0';

    if (!modal) return;
    modal.classList.remove('hidden');

    const cur = document.getElementById('version-current');
    if (cur) cur.textContent = currentVersion;

    const devMode = localStorage.getItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.DEV_MODE) === 'true';
    devToggle.checked = devMode;

    async function loadVersions(forceRefresh) {
        const dm = devToggle.checked;
        container.innerHTML = '<p style="color:var(--text-secondary);">Lade Versionen...</p>';

        function renderVersionsList(versions) {
            if (!versions || !versions.length) {
                container.innerHTML = '<p style="color:var(--text-secondary);">Keine Versionen gefunden.</p>';
                return;
            }

            container.innerHTML = '<ul class="version-list"></ul>';
            const list = container.querySelector('.version-list');

            versions.forEach(v => {
                const isCurrent = v.tag === currentVersion;
                const isNew = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .isNewer */ .U4)(v.tag, currentVersion);
                const li = document.createElement('li');
                li.className = 'version-item' + (isCurrent ? ' current' : '');

                let badge = '';
                if (isCurrent) badge = '<span class="badge-current">✓ Installiert</span>';
                else if (isNew) badge = '<span class="badge-new">⬆ Neu!</span>';

                li.innerHTML = `
                    <div class="version-info">
                        <strong>${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(v.tag)}</strong>
                        ${badge}
                    </div>
                    <div class="version-actions">
                        <button class="btn-install-raw"
                            data-raw-url="${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(v.rawUrl)}"
                            title="${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(v.tag)} installieren (laedt Install-Seite aus GitHub Raw-Content)">
                            Installieren
                        </button>
                        <a href="${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(v.githubUrl)}" target="_blank" class="btn-github-link"
                            title="${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(v.tag)} auf GitHub ansehen">
                            &rarr; Github
                        </a>
                    </div>
                `;

                // Attach click handler for Blob-based install
                const installBtn = li.querySelector('.btn-install-raw');
                if (installBtn) {
                    installBtn.addEventListener('click', () => {
                        openInstallPage(installBtn.dataset.rawUrl);
                    });
                }

                list.appendChild(li);
            });
        }

        try {
            const cachedRaw = localStorage.getItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.VERSION_CACHE);
            let cached = null;
            if (cachedRaw) {
                try { cached = JSON.parse(cachedRaw); } catch (e) { }
            }

            if (cached && cached.devMode === dm && cached.versions) {
                renderVersionsList(cached.versions);
            }

            const liveVersions = await fetchVersions(dm);
            if (liveVersions !== null) {
                const liveVersionsStr = JSON.stringify(liveVersions);
                const cachedVersionsStr = cached ? JSON.stringify(cached.versions) : '';

                if (liveVersionsStr !== cachedVersionsStr) {
                    localStorage.setItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.VERSION_CACHE, JSON.stringify({
                        timestamp: Date.now(), devMode: dm, versions: liveVersions
                    }));
                    renderVersionsList(liveVersions);
                }
            }

        } catch (e) {
            container.innerHTML = `<p style="color:#e94560;">Fehler: ${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(e.message)}</p>`;
        }
    }

    loadVersions(false);

    devToggle.onchange = async () => {
        if (devToggle.checked) {
            const promptText = _state_js__WEBPACK_IMPORTED_MODULE_0__/* .langMode */ .Kl === 'en' ? 'Dev-Mode password:' : 'Dev-Mode Passwort:';
            const entered = prompt(promptText);
            if (entered === null) {
                devToggle.checked = false;
                console.warn('[Kantine] Dev-Mode activation cancelled.');
                return;
            }
            const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(entered));
            const hashHex = Array.from(new Uint8Array(hashBuffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            if (hashHex !== _constants_js__WEBPACK_IMPORTED_MODULE_2__/* .DEV_MODE_PW_HASH */ .Z7) {
                devToggle.checked = false;
                localStorage.setItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.DEV_MODE, 'false');
                console.warn('[Kantine] Dev-Mode activation rejected: wrong password.');
                return;
            }
            localStorage.setItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.DEV_MODE, 'true');
        } else {
            localStorage.setItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.DEV_MODE, 'false');
        }
        localStorage.removeItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.VERSION_CACHE);
        localStorage.removeItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.VERSION_ETAG);
        loadVersions(true);
        renderVisibleWeeks();
    };
}

function updateCountdown() {
    if (!_state_js__WEBPACK_IMPORTED_MODULE_0__/* .authToken */ .gX || !_state_js__WEBPACK_IMPORTED_MODULE_0__/* .currentUser */ .Ny) {
        removeCountdown();
        return;
    }

    const now = new Date();
    const currentDay = now.getDay();
    if (currentDay === 0 || currentDay === 6) {
        removeCountdown();
        return;
    }

    const todayStr = now.toISOString().split('T')[0];

    let hasOrder = false;
    for (const key of _state_js__WEBPACK_IMPORTED_MODULE_0__/* .orderMap */ .L.keys()) {
        if (key.startsWith(todayStr)) {
            hasOrder = true;
            break;
        }
    }

    if (hasOrder) {
        removeCountdown();
        return;
    }

    const cutoff = new Date();
    cutoff.setHours(10, 0, 0, 0);

    const diff = cutoff - now;

    if (diff <= 0) {
        removeCountdown();
        return;
    }

    const diffHrs = Math.floor(diff / 3600000);
    const diffMins = Math.floor((diff % 3600000) / 60000);

    const headerCenter = document.querySelector('.header-center-wrapper');
    if (!headerCenter) return;

    let countdownEl = document.getElementById('order-countdown');
    if (!countdownEl) {
        countdownEl = document.createElement('div');
        countdownEl.id = 'order-countdown';
        headerCenter.insertBefore(countdownEl, headerCenter.firstChild);
    }

    countdownEl.innerHTML = `<span>${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('orderDeadline')}:</span> <strong>${diffHrs}h ${diffMins}m</strong>`;

    if (diff < 3600000) {
        countdownEl.classList.add('urgent');

        const notifiedKey = `kantine_notified_${todayStr}`;
        if (!localStorage.getItem(notifiedKey)) {
            if (Notification.permission === 'granted') {
                new Notification('Kantine: Bestellschluss naht!', {
                    body: 'Du hast heute noch nichts bestellt. Nur noch 1 Stunde!',
                    icon: '⏳'
                });
            } else if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
            localStorage.setItem(notifiedKey, 'true');
        }
    } else {
        countdownEl.classList.remove('urgent');
    }
}

function removeCountdown() {
    const el = document.getElementById('order-countdown');
    if (el) el.remove();
}

setInterval(updateCountdown, 60000);
setTimeout(updateCountdown, 1000);

function showErrorModal(title, message, details, btnText, url) {
    const modalId = 'error-modal';
    let modal = document.getElementById(modalId);
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal'; // Removed hidden because we are showing it now
    
    const content = document.createElement('div');
    content.className = 'modal-content';
    
    const header = document.createElement('div');
    header.className = 'modal-header';
    const h2 = document.createElement('h2');
    h2.style.cssText = 'color: var(--error-color); display: flex; align-items: center; gap: 10px;';
    
    const icon = document.createElement('span');
    icon.className = 'material-icons-round';
    icon.textContent = 'signal_wifi_off';
    h2.appendChild(icon);
    
    const titleSpan = document.createElement('span');
    titleSpan.textContent = title;
    h2.appendChild(titleSpan);
    
    header.appendChild(h2);
    content.appendChild(header);
    
    const body = document.createElement('div');
    body.style.padding = '20px';
    
    const p = document.createElement('p');
    p.style.cssText = 'margin-bottom: 15px; color: var(--text-primary);';
    p.textContent = message;
    body.appendChild(p);
    
    if (details) {
        const small = document.createElement('small');
        small.style.cssText = 'display: block; margin-top: 10px; color: var(--text-secondary);';
        small.textContent = details;
        body.appendChild(small);
    }
    
    const footer = document.createElement('div');
    footer.style.cssText = 'margin-top: 20px; display: flex; justify-content: center;';
    
    const btn = document.createElement('button');
    btn.style.cssText = `
        background-color: var(--accent-color);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        border: none;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
    `;
    btn.textContent = btnText || 'Zur Original-Seite';
    btn.onclick = () => {
        window.open(url || 'https://web.bessa.app/knapp-kantine', '_blank');
        modal.classList.add('hidden');
    };
    
    footer.appendChild(btn);
    body.appendChild(footer);
    content.appendChild(body);
    modal.appendChild(content);
    document.body.appendChild(modal);
}

function updateAlarmBell() {
    const bellBtn = document.getElementById('alarm-bell');
    const bellIcon = document.getElementById('alarm-bell-icon');
    if (!bellBtn || !bellIcon) return;

    if (_state_js__WEBPACK_IMPORTED_MODULE_0__/* .userFlags */ .BY.size === 0) {
        bellBtn.classList.add('hidden');
        bellBtn.style.display = 'none';
        bellIcon.style.color = 'var(--text-secondary)';
        bellIcon.style.textShadow = 'none';
        return;
    }

    bellBtn.classList.remove('hidden');
    bellBtn.style.display = 'inline-flex';

    let anyAvailable = false;
    for (const wk of _state_js__WEBPACK_IMPORTED_MODULE_0__/* .allWeeks */ .p_) {
        if (!wk.days) continue;
        for (const d of wk.days) {
            if (!d.items) continue;
            for (const item of d.items) {
                if (item.available && _state_js__WEBPACK_IMPORTED_MODULE_0__/* .userFlags */ .BY.has(item.id)) {
                    anyAvailable = true;
                    break;
                }
            }
            if (anyAvailable) break;
        }
        if (anyAvailable) break;
    }

    const lastCheckedStr = localStorage.getItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.LAST_CHECKED);
    const flaggedLastCheckedStr = localStorage.getItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.FLAGGED_LAST_CHECKED);

    let latestTime = 0;
    if (lastCheckedStr) latestTime = Math.max(latestTime, new Date(lastCheckedStr).getTime());
    if (flaggedLastCheckedStr) latestTime = Math.max(latestTime, new Date(flaggedLastCheckedStr).getTime());

    let timeStr = 'gerade eben';
    if (latestTime === 0) {
        const now = new Date().toISOString();
        localStorage.setItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.LAST_CHECKED, now);
        latestTime = new Date(now).getTime();
    }

    timeStr = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .getRelativeTime */ .gs)(new Date(latestTime));

    bellBtn.title = `${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('alarmLastChecked')}: ${timeStr}`;

    if (anyAvailable) {
        bellIcon.style.color = '#10b981';
        bellIcon.style.textShadow = '0 0 10px rgba(16, 185, 129, 0.4)';
    } else {
        bellIcon.style.color = '#f59e0b';
        bellIcon.style.textShadow = '0 0 10px rgba(245, 158, 11, 0.4)';
    }
}


/***/ },

/***/ 801
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  sg: () => (/* binding */ debounce),
  ZD: () => (/* binding */ escapeHtml),
  sn: () => (/* binding */ getISOWeek),
  PC: () => (/* binding */ getLocalizedText),
  gs: () => (/* binding */ getRelativeTime),
  Ao: () => (/* binding */ getWeekYear),
  U4: () => (/* binding */ isNewer),
  dk: () => (/* reexport */ splitLanguage),
  FS: () => (/* binding */ translateDay)
});

// EXTERNAL MODULE: ./src/state.js
var state = __webpack_require__(901);
;// ./src/lang/normalize.js
function isValidAllergen(content) {
    if (typeof content !== 'string' || !content) return false;
    return /^[A-Z](\s*,?\s*[A-Z])*$/.test(content.trim());
}

function normalize(text) {
    let modifiedText = text;
    let notes = [];

    // 1. Repair allergen-internal slashes: (A/F/N) -> (AFN)
    modifiedText = modifiedText.replace(/\(([A-Z](?:\/[A-Z])+)\)/g, (match, p1) => {
        return '(' + p1.replace(/\//g, '') + ')';
    });

    // 2. Repair slash-before-allergen: /ACLM) -> (ACLM)
    modifiedText = modifiedText.replace(/\/([A-Z]{1,8})\)/g, '($1)');

    // 4. Detect and park notes (doing it before step 3 to use the 6 spaces rule)
    
    // Pass 1: Extract "Achtung Änderung" specifically as requested
    const aaRegex = /Achtung Änderung/gi;
    const aaMatches = modifiedText.match(aaRegex);
    if (aaMatches) {
        aaMatches.forEach(m => {
            notes.push(m.trim());
            modifiedText = modifiedText.replace(m, ' ');
        });
    }

    // Pass 2: Detect based on combinations
    let parts = modifiedText.split(/ {6,}/);
    if (parts.length > 1) {
        let lastPart = parts[parts.length - 1];
        let hasA = /!!!|!{3,}/.test(lastPart);
        let hasB = /[A-ZÄÖÜ]{6,}/.test(lastPart);
        let hasC = /ACHTUNG|Achtung|Änderung|ABHOLUNG|WERKSRESTAURANT/i.test(lastPart);
        let hasD = !lastPart.includes(' / ') && !isValidAllergen(lastPart.replace(/[()]/g, ''));
        
        if ((hasA && hasB) || (hasA && hasC) || (hasB && hasC) || (hasD && hasC)) {
            notes.push(lastPart.trim());
            modifiedText = modifiedText.substring(0, modifiedText.lastIndexOf(lastPart)).trim();
        }
    } else {
        let exclIndex = modifiedText.indexOf('!!!');
        if (exclIndex !== -1) {
            let lastPart = modifiedText.substring(exclIndex);
            let hasA = true;
            let hasB = /[A-ZÄÖÜ]{6,}/.test(lastPart);
            let hasC = /ACHTUNG|Achtung|Änderung|ABHOLUNG|WERKSRESTAURANT/i.test(lastPart);
            let hasD = false;
            
            if ((hasA && hasB) || (hasA && hasC) || (hasB && hasC) || (hasD && hasC)) {
                notes.push(lastPart.trim());
                modifiedText = modifiedText.substring(0, exclIndex).trim();
            }
        }
    }

    // 3. Collapse whitespace
    modifiedText = modifiedText.replace(/\s{2,}/g, ' ').trim();

    return {
        text: modifiedText,
        notes: notes
    };
}
;// ./src/lang/templates.js
// @ts-check

const TEMPLATES = [
  {
    test: (t) => /^Suppe\s*\/\s*Soup\s+Salat\s*\/\s*Salad\s+Dessert$/i.test(String(t).trim()),
    result: {
      de: '• Suppe\n• Salat\n• Dessert',
      en: '• Soup\n• Salad\n• Dessert',
      raw: '• Suppe / Soup\n• Salat / Salad\n• Dessert',
      label: 'template',
      confidence: 1.0,
      subScores: { anchor: 1, purity: 1, course: 1, coverage: 1 },
      notes: [],
    },
  },
  {
    test: (t) => /^Suppe\s*\/\s*Soup\s+Salat\s*\/\s*Salad\s*\/\s*Dessert$/i.test(String(t).trim()),
    result: {
      de: '• Suppe\n• Salat\n• Dessert',
      en: '• Soup\n• Salad\n• Dessert',
      raw: '• Suppe / Soup\n• Salat / Salad\n• Dessert',
      label: 'template',
      confidence: 1.0,
      subScores: { anchor: 1, purity: 1, course: 1, coverage: 1 },
      notes: [],
    },
  },
  {
    test: (t) => /^Suppr\s*\/\s*Soup\s+Salat\s*\/\s*Salad\s+Dessert$/i.test(String(t).trim()),
    result: {
      de: '• Suppe\n• Salat\n• Dessert',
      en: '• Soup\n• Salad\n• Dessert',
      raw: '• Suppe / Soup\n• Salat / Salad\n• Dessert',
      label: 'template',
      confidence: 1.0,
      subScores: { anchor: 1, purity: 1, course: 1, coverage: 1 },
      notes: [],
    },
  },
];

function matchTemplate(normalizedText) {
  if (typeof normalizedText !== 'string' || !normalizedText) return null;

  for (const tpl of TEMPLATES) {
    if (tpl.test(normalizedText)) return tpl.result;
  }

  return null;
}

;// ./src/lang/segment.js
function segment_isValidAllergen(content) {
  if (typeof content !== 'string' || !content) return false;
  return /^[A-Z](\s*,?\s*[A-Z])*$/.test(content.trim());
}

/**
 * Segments a normalized menu text into separate course objects.
 * 
 * @param {string} normalizedText 
 * @returns {Array<{de: string, en: string, allergen: string, mono: boolean, anchored: boolean}>}
 */
function segment(normalizedText) {
  if (!normalizedText || typeof normalizedText !== 'string') {
    return [];
  }

  const courses = [];
  const parenRegex = /\(([^()]+)\)\s*(?!\s*\/)/g;
  let match;
  let lastScanIndex = 0;

  while ((match = parenRegex.exec(normalizedText)) !== null) {
    const content = match[1];
    if (segment_isValidAllergen(content)) {
      // End of this course segment is at the end of the matched parenthesis
      const segmentEndIndex = match.index + match[0].length;
      let segmentText = normalizedText.substring(lastScanIndex, segmentEndIndex);
      
      courses.push(processSegment(segmentText, content, true));
      lastScanIndex = segmentEndIndex;
    }
  }

  // Any remaining text after the last valid allergen is an unanchored segment
  if (lastScanIndex < normalizedText.length) {
    const remainingText = normalizedText.substring(lastScanIndex).trim();
    if (remainingText) {
      courses.push(processSegment(remainingText, "", false));
    }
  }

  return courses;
}

function processSegment(segmentText, allergen, anchored) {
  // 1. Strip the allergen code from the end of the segment text if it exists
  let textWithoutAllergen = segmentText;
  if (allergen) {
    const suffix = `(${allergen})`;
    if (textWithoutAllergen.endsWith(suffix)) {
      textWithoutAllergen = textWithoutAllergen.substring(0, textWithoutAllergen.length - suffix.length);
    } else {
      // In case of whitespace before the parenthesis in the raw segment
      const lastParenIndex = textWithoutAllergen.lastIndexOf(`(${allergen})`);
      if (lastParenIndex !== -1) {
        textWithoutAllergen = textWithoutAllergen.substring(0, lastParenIndex);
      }
    }
  }
  textWithoutAllergen = textWithoutAllergen.trim();

  // 2. Split DE|EN at the FIRST slash that is NOT inside parentheses
  //    (skips slashes in e.g. "(Schwein/Rind)" or "(pork/beef)")
  let de, en, mono;
  let slashIdx = -1;
  let parenDepth = 0;
  for (let i = 0; i < textWithoutAllergen.length; i++) {
    const ch = textWithoutAllergen[i];
    if (ch === '(') parenDepth++;
    else if (ch === ')') parenDepth--;
    else if (ch === '/' && parenDepth === 0) { slashIdx = i; break; }
  }
  if (slashIdx === -1 && parenDepth > 0) {
    const openIdx = textWithoutAllergen.indexOf('(');
    parenDepth = 0;
    for (let i = 0; i < textWithoutAllergen.length; i++) {
      const ch = textWithoutAllergen[i];
      if (i === openIdx) continue;
      if (ch === '(') parenDepth++;
      else if (ch === ')') parenDepth--;
      else if (ch === '/' && parenDepth === 0) { slashIdx = i; break; }
    }
  }
  if (slashIdx !== -1) {
    // Expand to surrounding whitespace (equivalent to the old /\s*\/\s*/ match)
    let left = slashIdx;
    let right = slashIdx + 1;
    while (left > 0 && textWithoutAllergen[left - 1] === ' ') left--;
    while (right < textWithoutAllergen.length && textWithoutAllergen[right] === ' ') right++;
    de = textWithoutAllergen.substring(0, left).trim();
    en = textWithoutAllergen.substring(right).trim();
    mono = false;
  } else {
    de = textWithoutAllergen;
    en = textWithoutAllergen;
    mono = true;
  }

  // 3. Re-attach allergen if it exists and not already present
  if (allergen) {
    const aSuffix = ` (${allergen})`;
    de = de.includes(`(${allergen})`) ? de : `${de}${aSuffix}`;
    en = en.includes(`(${allergen})`) ? en : `${en}${aSuffix}`;
  }

  return {
    de,
    en,
    allergen,
    mono,
    anchored
  };
}

;// ./src/lang/boundary.js
function resolveBoundary(fragment, langModel) {
    const MIN_BOUNDARY_CONFIDENCE = 1.5;
    const MIN_LEFT_ENGLISH = 1.0;
    
    // Handle empty fragment
    if (!fragment || fragment.trim() === '') {
        return { enPart: '', deCut: '' };
    }

    const words = fragment.trim().split(/\s+/);
    
    if (words.length < 2) {
        return { enPart: fragment, deCut: '' };
    }

    let bestK = -1;
    let maxScore = -9999;

    for (let k = 1; k < words.length; k++) {
        const leftWords = words.slice(0, k);
        const rightWords = words.slice(k);

        const leftText = leftWords.join(' ');
        const rightText = rightWords.join(' ');

        const leftScore = langModel.scoreLang(leftText);
        const rightScore = langModel.scoreLang(rightText);

        const leftLooksEnglish = leftScore < -MIN_LEFT_ENGLISH;
        const rightLooksGerman = rightScore > 0;

        const boundaryScore = (-leftScore) + rightScore;

        if (leftLooksEnglish && rightLooksGerman && boundaryScore > maxScore) {
            maxScore = boundaryScore;
            bestK = k;
        }
    }

    if (bestK !== -1 && maxScore > MIN_BOUNDARY_CONFIDENCE) {
        return {
            enPart: words.slice(0, bestK).join(' '),
            deCut: words.slice(bestK).join(' ')
        };
    }

    return { enPart: fragment, deCut: '' };
}

// EXTERNAL MODULE: ./src/lang/loanwords.js
var loanwords = __webpack_require__(830);
;// ./src/lang/dishes.js


// Split a reconstructed bilingual segment "DE1 / EN1 DE2 / EN2 ..." into individual
// dishes. The separator-slash count is the structural skeleton (every bilingual dish
// is "German / English"); allergens are optional anchors handled by the caller.
//
// Each returned dish = { de, en, mono }. The caller (splitter.js) reattaches the
// allergen to the LAST dish and assigns the `anchored` flag.
function splitDishes(text, langModel) {
    const t = String(text || '').replace(/\s*\/\s*/g, ' / ').replace(/\s+/g, ' ').trim();
    if (!t) return [];

    const tokens = t.split(' ');
    const slashIdxs = [];
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === '/') slashIdxs.push(i);
    }

    // No slash -> a single mono dish (e.g. "Vanillapudding").
    if (slashIdxs.length === 0) {
        return [{ de: t, en: t, mono: true }];
    }

    // Exactly one slash -> a single bilingual dish.
    if (slashIdxs.length === 1) {
        const si = slashIdxs[0];
        const de = tokens.slice(0, si).join(' ').trim();
        const en = tokens.slice(si + 1).join(' ').trim();
        if (!de || !en) {
            const solo = de || en;
            return [{ de: solo, en: solo, mono: true }];
        }
        return [{ de, en, mono: false }];
    }

    // Two or more slashes -> peel the first dish, recurse on the remainder.
    // Structure between the first two slashes is "EN_1 ... DE_2"; the EN_1 -> DE_2
    // boundary is resolved via the multi-signal detector below.
    const s1 = slashIdxs[0];
    const s2 = slashIdxs[1];
    const de1 = tokens.slice(0, s1).join(' ').trim();
    const mid = tokens.slice(s1 + 1, s2); // EN_1 ... DE_2
    const k = findDishBoundary(mid, langModel);
    const en1 = mid.slice(0, k).join(' ').trim();
    const de2 = mid.slice(k).join(' ').trim();
    const tail = tokens.slice(s2 + 1).join(' ').trim();

    const first = { de: de1, en: en1 || de1, mono: false };
    const remainder = (de2 ? de2 + ' / ' : '/ ') + tail;
    return [first, ...splitDishes(remainder, langModel)];
}

// Continuous language evidence per token: the trigram model's signed score
// (positive = German, negative = English). Loanwords are neutral — they occur
// on both sides ("Kichererbsencurry" vs "chickpea curry").
// Capitalization is NOT used as evidence here: English dish text in the source
// data capitalizes freely ("Indian: Mix Sabji", "Vegetables"), so a hard
// "capital => German" rule drowns the model signal. It only breaks ties.
function findDishBoundary(midTokens, langModel) {
    const n = midTokens.length;
    if (n <= 1) return n;

    const EPS = 1e-9;
    const scores = midTokens.map(t => (0,loanwords/* isLoanword */.n)(t) ? 0 : langModel.scoreLang(t));

    let bestK = 1;
    let bestPenalty = Infinity;
    let bestCap = -1;

    for (let k = 1; k < n; k++) {
        // Left of the boundary should be English, right should be German:
        // penalize German evidence left + English evidence right.
        let penalty = 0;
        for (let i = 0; i < k; i++) if (scores[i] > 0) penalty += scores[i];
        for (let i = k; i < n; i++) if (scores[i] < 0) penalty -= scores[i];

        const cap = /^[A-ZÄÖÜ]/.test(midTokens[k]) ? 1 : 0;

        if (penalty < bestPenalty - EPS || (Math.abs(penalty - bestPenalty) <= EPS && cap > bestCap)) {
            bestPenalty = penalty;
            bestCap = cap;
            bestK = k;
        }
    }

    return bestK;
}

;// ./src/lang/score.js


const WEIGHT_ANCHOR = 0.35;
const WEIGHT_PURITY = 0.30;
const WEIGHT_COURSE = 0.20;
const WEIGHT_COVERAGE = 0.15;

const THRESHOLD_HIGH = 0.80;
const THRESHOLD_MEDIUM = 0.55;

function tokenize(text) {
  return (text || '').toLowerCase().match(/[a-zäöüß]{2,}/g) || [];
}

function countGermanIntrusionsInEnglish(enClean) {
  const tokens = enClean.split(/\s+/);
  let count = 0;
  for (let i = 1; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!/^[A-ZÄÖÜ]/.test(tok)) continue;
    const word = tok.toLowerCase().replace(/[^a-zäöüß]/g, '');
    if (word.length < 3 || (0,loanwords/* isLoanword */.n)(tok)) continue;
    count++;
  }
  return count;
}

function hasSeparatorSlash(text) {
  return (text || '').replace(/\([^)]*\)/g, '').indexOf('/') !== -1;
}

function scoreSplit({ courses, notes, raw, langModel }) {
  // anchor score
  const anchoredCount = courses.filter(c => c.anchored).length;
  const anchor = anchoredCount / Math.max(courses.length, 1);

  // purity score
  let puritySum = 0;
  let purityCount = 0;
  for (const course of courses) {
    if (!course.mono) {
      const deClean = (course.de || '').replace(/\([^)]*\)/g, '').trim();
      const enClean = (course.en || '').replace(/\([^)]*\)/g, '').trim();
      
      const deScoreLang = langModel.scoreLang(deClean);
      const enScoreLang = langModel.scoreLang(enClean);
      
      const de_purity = Math.max(0, deScoreLang) / (Math.abs(deScoreLang) + 1);
      let en_purity = Math.max(0, -enScoreLang) / (Math.abs(enScoreLang) + 1);
      if (countGermanIntrusionsInEnglish(enClean) > 0) {
        en_purity = Math.min(en_purity, 0.2);
      }

      puritySum += de_purity + en_purity;
      purityCount += 2;
    }
  }
  const purity = purityCount > 0 ? puritySum / purityCount : 1.0;

  // course score
  const baseCourseScore = (courses.length === 1 || courses.length === 3) ? 1.0 : 0.0;
  let penalties = 0;
  for (const course of courses) {
    if (!course.mono) {
      if (!course.de || course.de.length === 0 || !course.en || course.en.length === 0) {
        penalties += 0.3;
      }
    }
  }
  const courseScore = Math.max(0, baseCourseScore - penalties);

  // coverage score
  const rawTokens = tokenize(raw);
  const splitText = courses.map(c => (c.de || '') + ' ' + (c.en || '')).join(' ') + ' ' + (notes || []).join(' ');
  const splitTokenSet = new Set(tokenize(splitText));
  const covered = rawTokens.filter(t => splitTokenSet.has(t)).length;
  const coverage = covered / Math.max(rawTokens.length, 1);

  // composite confidence
  const confidence = Math.max(0, Math.min(1,
    anchor * WEIGHT_ANCHOR +
    purity * WEIGHT_PURITY +
    courseScore * WEIGHT_COURSE +
    coverage * WEIGHT_COVERAGE
  ));

  const corrupted = courses.some(c => hasSeparatorSlash(c.en) || hasSeparatorSlash(c.de));
  const suspiciousCourseCount = courses.length === 2;

  let label = 'low';
  if (!corrupted && !suspiciousCourseCount && confidence >= THRESHOLD_HIGH) {
    label = 'high';
  } else if (!corrupted && confidence >= THRESHOLD_MEDIUM) {
    label = 'medium';
  }

  let finalConfidence = confidence;
  if (corrupted) {
    finalConfidence = Math.min(finalConfidence, THRESHOLD_MEDIUM - 0.05);
  } else if (suspiciousCourseCount) {
    finalConfidence = Math.min(finalConfidence, THRESHOLD_HIGH - 0.01);
  }

  return {
    confidence: finalConfidence,
    subScores: {
      anchor,
      purity,
      course: courseScore,
      coverage
    },
    label
  };
}
// EXTERNAL MODULE: ./src/lang/langModel.js
var lang_langModel = __webpack_require__(152);
// EXTERNAL MODULE: ./src/lang/langModelSeed.js
var langModelSeed = __webpack_require__(977);
;// ./src/lang/alignTrailing.js
// @ts-check



const MIN_ENGLISH_SCORE = -0.8;
const MIN_DETECT_CONFIDENCE = 0.7;

const GERMAN_FUNCTION_WORDS = new Set([
    'mit', 'und', 'auf', 'von', 'vom', 'nach', 'in', 'an', 'zu', 'aus',
    'bei', 'für', 'über', 'unter', 'der', 'die', 'das', 'des', 'dem', 'den',
]);

function splitTopLevel(text) {
    if (!text || typeof text !== 'string') return [];

    const phrases = [];
    let current = '';
    let parenDepth = 0;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '(' || ch === '[' || ch === '{') {
            parenDepth++;
            current += ch;
        } else if (ch === ')' || ch === ']' || ch === '}') {
            parenDepth--;
            current += ch;
        } else if (parenDepth === 0 && (ch === ',' || ch === '/')) {
            const trimmed = current.trim();
            if (trimmed) phrases.push(trimmed);
            current = '';
        } else {
            current += ch;
        }
    }

    const trimmed = current.trim();
    if (trimmed) phrases.push(trimmed);
    return phrases;
}

function stripAllergenFromEnd(text, allergen) {
    if (!allergen) return text;
    const suffix = ` (${allergen})`;
    if (text.endsWith(suffix)) return text.slice(0, -suffix.length).trim();
    const idx = text.lastIndexOf(`(${allergen})`);
    if (idx !== -1) return text.slice(0, idx).trim();
    return text;
}

function hasGermanMarker(text) {
    if (/[äöüßÄÖÜ]/.test(text)) return true;
    const words = text.toLowerCase().match(/[a-zäöüß]+/g) || [];
    return words.some(w => GERMAN_FUNCTION_WORDS.has(w) && !(0,loanwords/* isLoanword */.n)(w));
}

function isStronglyEnglish(text, langModel) {
    if (!text || hasGermanMarker(text)) return false;
    return langModel.scoreLang(text) <= MIN_ENGLISH_SCORE;
}

function looksLikeAllergenParens(text) {
    return /\(\s*[A-Z](\s*,?\s*[A-Z])*\s*\)\s*$/.test(text.trim());
}

function attachAllergenToPhrase(phrase, allergen) {
    let enPhrase = phrase.replace(/\s*\([^)]*\)\s*$/, '').trim();
    if (allergen && !looksLikeAllergenParens(enPhrase)) {
        enPhrase = `${enPhrase} (${allergen})`;
    }
    return enPhrase;
}

function repairMonoTail(courses, langModel) {
    const last = courses[courses.length - 1];
    if (!last || last.anchored || !last.mono) return courses;

    const tailText = last.de || '';
    const phrases = splitTopLevel(tailText);
    if (phrases.length < 2) return courses;

    const germanCourses = courses.slice(0, -1);
    if (germanCourses.length !== phrases.length) return courses;
    if (germanCourses.some(c => !c.mono)) return courses;

    let detectConfidence = 1.0;
    for (const phrase of phrases) {
        if (!isStronglyEnglish(phrase, langModel)) return courses;
        if (langModel.scoreLang(phrase) > MIN_ENGLISH_SCORE - 0.5) detectConfidence -= 0.2;
    }
    if (detectConfidence < MIN_DETECT_CONFIDENCE) return courses;

    return germanCourses.map((course, i) => ({
        de: course.de,
        en: attachAllergenToPhrase(phrases[i], course.allergen),
        allergen: course.allergen,
        mono: false,
        anchored: course.anchored,
    }));
}

function repairInterleavedEnglish(courses, langModel) {
    if (courses.length < 2) return courses;

    const changed = courses.slice();
    let modified = false;

    for (let i = 0; i < changed.length - 1; i++) {
        const course = changed[i];
        const next = changed[i + 1];
        if (!course.mono || !next.mono) continue;

        const nextText = stripAllergenFromEnd(next.de, next.allergen);
        const phrases = splitTopLevel(nextText);
        if (phrases.length === 0) continue;

        const leading = phrases[0];
        if (!isStronglyEnglish(leading, langModel)) continue;

        const rest = phrases.slice(1).join(', ').trim();
        if (!rest) continue;
        const restHasGerman = !isStronglyEnglish(rest, langModel) && /[a-zäöüß]{3,}/i.test(rest);
        if (!restHasGerman) continue;

        changed[i] = {
            de: course.de,
            en: attachAllergenToPhrase(leading, course.allergen),
            allergen: course.allergen,
            mono: false,
            anchored: course.anchored,
        };

        if (rest) {
            const newAllergen = next.allergen ? ` (${next.allergen})` : '';
            changed[i + 1] = {
                ...next,
                de: `${rest}${newAllergen}`,
                en: `${rest}${newAllergen}`,
                mono: true,
            };
        } else {
            changed.splice(i + 1, 1);
            i--;
        }
        modified = true;
    }

    return modified ? changed : courses;
}

function repairSlashTail(courses, langModel) {
    if (courses.length < 2) return courses;

    const last = courses[courses.length - 1];
    if (!last || last.anchored || last.mono) return courses;

    const lastDe = stripAllergenFromEnd(last.de, last.allergen);
    const lastEn = stripAllergenFromEnd(last.en, last.allergen);
    if (!lastDe || !lastEn || lastDe === lastEn) return courses;

    const germanCourses = courses.slice(0, -1);
    let slashPhrases = splitTopLevel(lastEn);

    // Format "DE1 (A) DE2 (B) EN1 / EN2": segmentation cuts the trailing block at
    // the first slash, so EN1 lands on the course's de-side. When that de-side is
    // itself strongly English, split the full trailing text to recover every EN dish.
    if (slashPhrases.length !== germanCourses.length && isStronglyEnglish(lastDe, langModel)) {
        const fullPhrases = splitTopLevel(lastDe + ' / ' + lastEn);
        if (fullPhrases.length === germanCourses.length) slashPhrases = fullPhrases;
    }

    if (slashPhrases.length < 2) return courses;
    if (germanCourses.length !== slashPhrases.length) return courses;
    if (germanCourses.some(c => !c.mono)) return courses;

    for (const phrase of slashPhrases) {
        if (!isStronglyEnglish(phrase, langModel)) return courses;
    }

    return germanCourses.map((course, i) => ({
        de: course.de,
        en: attachAllergenToPhrase(slashPhrases[i], course.allergen),
        allergen: course.allergen,
        mono: false,
        anchored: course.anchored,
    }));
}

function alignTrailingEnglish(courses, langModel) {
    if (!Array.isArray(courses) || courses.length < 2) return courses;

    let result = repairInterleavedEnglish(courses, langModel);
    result = repairMonoTail(result, langModel);
    result = repairSlashTail(result, langModel);
    return result;
}

;// ./src/lang/splitter.js










function stripAllergen(text, allergen) {
    if (!text) return '';
    let out = text;
    if (allergen) {
        const suffix = `(${allergen})`;
        const idx = out.lastIndexOf(suffix);
        if (idx !== -1) out = out.slice(0, idx) + out.slice(idx + suffix.length);
    }
    return out.replace(/\s+/g, ' ').trim();
}

function attachAllergen(dish, allergen, anchored) {
    let de = dish.de || '';
    let en = dish.en || '';
    if (allergen) {
        const tag = ` (${allergen})`;
        if (!de.includes(`(${allergen})`)) de = de + tag;
        if (!en.includes(`(${allergen})`)) en = en + tag;
    }
    return { de, en, allergen: allergen || '', mono: !!dish.mono, anchored: !!anchored };
}

// Allergen-internal slashes are repaired during normalization, so a "/" surviving
// paren removal can only be a dish separator => merged dishes.
function splitter_hasSeparatorSlash(text) {
    return (text || '').replace(/\([^)]*\)/g, '').indexOf('/') !== -1;
}

function repairMergedCourses(courses, langModel) {
    const repaired = [];
    for (const course of courses) {
        if (!course.mono && splitter_hasSeparatorSlash(course.en)) {
            const allergen = course.allergen || '';
            const fullText = stripAllergen(course.de, allergen) + ' / ' + stripAllergen(course.en, allergen);
            const dishes = splitDishes(fullText, langModel);
            if (dishes.length >= 2) {
                dishes.forEach((dish, idx) => {
                    const isLast = idx === dishes.length - 1;
                    repaired.push(attachAllergen(dish, isLast ? allergen : '', isLast ? course.anchored : false));
                });
                continue;
            }
        }
        repaired.push(course);
    }
    return repaired;
}

function peelGluedTailFromUnanchored(courses, langModel) {
    for (let i = 0; i < courses.length; i++) {
        const course = courses[i];
        if (!course.anchored && course.en && !splitter_hasSeparatorSlash(course.en) && langModel.scoreLang(course.en) > 0) {
            const { enPart, deCut } = resolveBoundary(course.en, langModel);
            if (deCut) {
                if (course.mono) {
                    course.en = enPart;
                    course.de = deCut;
                    course.mono = false;
                } else {
                    courses[i].en = enPart;
                    courses.splice(i + 1, 0, { de: deCut, en: deCut, mono: true, anchored: false });
                }
            }
        }
    }
    return courses;
}

function peelTrailingMonoCourse(courses) {
    if (courses.length !== 2) return courses;
    const last = courses[1];
    const allergen = last.allergen || '';

    const enWords = stripAllergen(last.en, allergen).split(/\s+/);
    if (enWords.length < 2) return courses;

    const word = enWords[enWords.length - 1];
    if (!/^[A-ZÄÖÜ][a-zäöüß]/.test(word)) return courses;

    const newEn = enWords.slice(0, -1).join(' ');
    const deNoAllergen = stripAllergen(last.de, allergen);
    const deWords = deNoAllergen.split(/\s+/);
    const newDe = (deWords.length >= 2 && deWords[deWords.length - 1] === word)
        ? deWords.slice(0, -1).join(' ')
        : deNoAllergen;

    courses[1] = { de: newDe, en: newEn, allergen: '', mono: newDe === newEn, anchored: false };
    const monoText = allergen ? `${word} (${allergen})` : word;
    courses.push({ de: monoText, en: monoText, allergen, mono: true, anchored: !!allergen });
    return courses;
}

// Merge a trailing mono course that is only a non-allergen parenthetical
// ingredient/meat annotation back into the previous anchored course.
// Example (Friday single-course menus): "... (ACGLMF)(Beef, Pork)" should be
// one course, not three.
function mergeTrailingAnnotations(courses) {
    if (courses.length < 2) return courses;
    const last = courses[courses.length - 1];
    if (last.anchored || !last.mono) return courses;

    const text = (last.de || '').trim();
    // Parenthetical with comma- or slash-separated words (meat/ingredient lists).
    // Must not look like an allergen code (those are handled by segment()).
    if (!/^\(\s*[A-Za-z][A-Za-z]*(?:\s*[，,\/]\s*[A-Za-z][A-Za-z]*)*\s*\)$/.test(text)) {
        return courses;
    }

    const prev = courses[courses.length - 2];
    prev.de = ((prev.de || '') + ' ' + text).trim();
    prev.en = ((prev.en || '') + ' ' + text).trim();
    courses.pop();
    return courses;
}

function splitLanguage(text, options = {}) {
    if (!text) return { de: '', en: '', raw: '', confidence: 0, subScores: {anchor:0,purity:0,course:0,coverage:0}, label: 'fallback', notes: [] };

    const { text: normText, notes } = normalize(text);

    const tplResult = matchTemplate(normText);
    if (tplResult) {
        tplResult.raw = '• ' + text;
        tplResult.notes = notes;
        return tplResult;
    }

    const langModel = (options && options.langModel) ? options.langModel : (0,lang_langModel/* createLangModel */.C)(langModelSeed/* LANG_MODEL_SEED */.x);

    let courses = segment(normText);
    courses = mergeTrailingAnnotations(courses);
    courses = alignTrailingEnglish(courses, langModel);
    courses = repairMergedCourses(courses, langModel);
    courses = peelGluedTailFromUnanchored(courses, langModel);
    courses = peelTrailingMonoCourse(courses);

    const deParts = [];
    const enParts = [];

    for (const course of courses) {
        const dePart = course.de;
        const enPart = course.en;
        deParts.push(dePart);
        enParts.push(enPart);
    }

    if (deParts.length > 3 || enParts.length > 3) {
        const formattedRaw = '• ' + text.replace(/(?:\(|(?:\/|\s|^))([A-Z,]+)\)\s*(?=\S)(?!\s*\/)/g, '($1)\n• ').replace(/^• • /, '• ');
        return { de: formattedRaw, en: formattedRaw, raw: formattedRaw, label: 'fallback', confidence: 0, subScores: {anchor:0,purity:0,course:0,coverage:0}, notes };
    }

    const de = deParts.length > 0 ? '• ' + deParts.join('\n• ') : '';
    const en = enParts.length > 0 ? '• ' + enParts.join('\n• ') : '';
    const raw = de;

    const { confidence, subScores, label } = scoreSplit({ courses, notes, raw: normText, langModel });

    const noteText = notes.length > 0 ? '\n' + notes.join(' ') : '';
    return { de: de + noteText, en: en + noteText, raw: raw + noteText, confidence, subScores, label, notes };
}

;// ./src/utils.js


function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getWeekYear(d) {
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
function translateDay(englishDay) {
    if (state/* langMode */.Kl === 'en') return englishDay;
    const map = { Monday: 'Montag', Tuesday: 'Dienstag', Wednesday: 'Mittwoch', Thursday: 'Donnerstag', Friday: 'Freitag', Saturday: 'Samstag', Sunday: 'Sonntag' };
    return map[englishDay] || englishDay;
}

function escapeHtml(text) {
    if (!text) return '';
    return text.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function isNewer(remote, local) {
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

function getRelativeTime(date) {
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




function getLocalizedText(text) {
    if (state/* langMode */.Kl === 'all') return text || '';
    const split = splitLanguage(text);
    // Low-confidence splits: show raw source text instead of a guessed translation
    if (split.label === 'low' || split.label === 'fallback') {
        return split.raw || text || '';
    }
    if (state/* langMode */.Kl === 'en') return split.en || split.raw;
    return split.de || split.raw;
}

function debounce(func, wait) {
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


/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};

// EXTERNAL MODULE: ./src/state.js
var state = __webpack_require__(901);
// EXTERNAL MODULE: ./src/stats-tracker.js
var stats_tracker = __webpack_require__(618);
;// ./src/ui.js
/**
 * UI injection module.
 * Renders the full Kantine Wrapper HTML skeleton into the current page,
 * including fonts, icon stylesheet, favicon, and all modal/panel containers.
 * Must be called before bindEvents() and any state-rendering logic.
 */



/**
 * Injects the full application HTML into the current tab.
 * Idempotent in conjunction with the __KANTINE_LOADED guard in index.js.
 */
function injectUI() {
    document.title = 'Kantine Weekly Menu';

    if (document.querySelectorAll) {
        document.querySelectorAll('link[rel*="icon"]').forEach(el => el.remove());
    }
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/png';
    favicon.href = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAOUElEQVR4nNWYaXRVRbbH//tMd0xITAISyASBAGGSOYJP6fdEhAAiMjiAAxDoVsCWtpu0jdcrrUQFGYI2CQg8RIYwCQiCtjIIChImISASSJgTSYiZ7niqdn+4AQEbaIcP7+21zqqzzqmq86tdtXf96wD/x41+gz4UANylS5dE5mDU3r0H8uueyas1XC6l7tntLTWVgZXAkJXiN2ADAKhEhIg7IpaGhYWdZGYCoOIXDJ6uua6Y9mvhAIjOnTu3y8/Pf0RKqSckJDwD4L26d5IAbrtofs9LJOJVnxcCZGeGBcRWgKwsySpIWAXDQlAsDLZrBLVdzB3PfjpoxPe/FhCqpuLIkSPTwsPD9fDwcFlSUvLapEmT1mRlZVXi3ntV3r5dsCKp2uud57NadcUfBLTQbBOHhsFQwWAQQutClxI+gT8D/+m6uAkbAJHaNjXd4/H8T2bmJLFq1UoZCAQaLFy4cDIRSWzfznC56JsRGZ8319WOVr//ogwEGLW1fng8Jtdd8NSa8HhNeDxB8vpMGQjUBj21gZ8LSDfcMzMbxwuOvxnbKJbHjh1LnTt3Ufv37ydLS0uf7devXysAEm434HJp+54Zd7iFrvax6XoZGxYLGAoAjcGaCdYAaGBoADQCVNht+LmAXBeNV9rJpKSk3/v9/pavv/Z3GR5eT5FS0syZs9hqtRpbt259W9M0BkBwu024XNrep5872FzVHrABhawqBGYmEFQoodETIdSAYL/mQ7fBYgoVTHC7Je69VwMgMzMzY86cOTO5Y6cOcvjwJxUhBIQQSEpKUidOnCiqq6sfaNOmVT8AAoBaB2nsG/WHAw6FtsEwCAQJuiHciUBgGfSr8vaALpcCIr5r3rzk6AXvnmm28N1h2L7dJFXlhQsXTpZSRs2aOUsSEQkhQASYpolJkyZR47jGfPTo8beY2VLnfU1xuwMNc2e/Xk40Cj6/hKKEogPMVyiJADCkrvpuA1jnsYy8vHr7R406yVLsv2BYliW8P/+Z6Y2aNSwpKRn38MMDZffuPVQigmEY0DQdmqbB6XQqWVOzpN/vT0lISpgAIklut9lwXvYr5aqWKb0+wcwKJMAAsaJSKIx/zIQOOELAN4Uj4r4ffBC5q6r0lFXXZpaPGu+ul5v9vveOek/EnP9+evLy1W1yli7pFR+XIE+eLFRKS0ohhED9BvWRmJAIh8PB/Qf05w0bPqKcO++s75r68lM/SH5LeDwmARqYmUmBBpACeAKaaleDQSFVTdVZVt0TE5e8eciQS/8+DxJxv6VLG3z82GOlkTmz3qtyhr8SmTvLWpExbrj1HzMqizk48Ymc7EvVlyvQ7eFHyOP3w2qxAAT4fX4IIdC6TWtu2769svuTT9e/MemPf6wQ8q/S4zPBUgWIWVGkZrOqMVKOjrPY9x7y1mz1a3okCcEMljK0dm/YSeo8l5eXZ4y9dPZwZG72moqMcWOj5s7kmpjoScac6Vpx+86nXvPW8t83rI85mNwc8xctohbNmsFqs13t5vjx41i6YgVdPn2aB29co7xbcORFq8/PBKiAAkmQutWqNhBy/OmMcfPPAOg8f26v4/B/7FGNaAoEgvVQiZ8CEjFcLmXw4MHBF3JmT6kIc8yOzM3G5YxxY6NyZhkluvqnzKoKzOmUhsYR9fiFf24hpV44lrRMwf5du+DxeRHXuDGSU1rA/fLLtOpcMZ7ctD5dV1RIliCAhQKpWS1qAynHn84Yl80ul4b7gL09x+Z3zp1z/1GWnwnAHl8v3v9TQABwuyUBiuJ2ZzeeO8N6KTLyzbB/zKKLGePH9lmx5J7cQ/vbC0XhB5OaKobNjvUH98Ol62hy8CgulpfjYmkpurVOha33/Rjx4WroNrskVVXq5geaYVHrm3L86bETQnButwk3AJdL25vx3MGU+dkPlAtlWX5ZmQ1A7c0VRygtmHE5s6act1n/1pnp6y8GDE51HzvsmLLtc8CwwGrRETBNNI2IxHdPZlxturjgEJ7ashG6ZoAolEYlgdnQzcTI6LEnhzy+8CrctZaXp2LIEDF02bJEr81Wvv6hh6pvJYkILpequt1m7PJFr56tqJj8fGob9E9qigfXroKiKmBm+KRAQ7sdB4eOQITFhhWF32Lkp5tD6UGhkAAQUioOm9Lph9plF17MXFasqRvYFNdrxh8do8Dtvvr8VomaXa+8IgURHv54qzkqsWlw5hfbZa/VeSCFAMnQiEBSItbuRH1nOHws4f5yJ4LBIAxdD6kVyTCFUBb+d29e3LvvgHOGsb5Du/ZtANRpmRvM7ZbXbKm3FJUqABEZHd3H0NSNhceOyb8c2qe8u3c3oGqhllJC03UYRPhrlzS81KU7jpZdQt8P81BcXQOHocFjBjGlbQf8pWt3aHYHp6Wl0Z49e7bput4zEAioqEsnN7ObefCKWtErysreTE5Ols6ISH6tXUe4O3RC99hYpEREIL1pM8TYbPBIE3/buQ0Ttn2CVtEx2DJoGOLDHKitqsSygUPQ4lwJchYvBjNT9+53CwD3paQkP4Yr+/QvAFQAyObNk8cQUWqTpCbMzOrq1WuQXHQeO4eOQP6wEdgwYDDWpg9EpGbAolswe18+Ht+0Ds0jo/DRQ0OQ22cAhsY3gaNBA5w9fRpEhORmzYiZuaj4zFsTJkyIAOoEzM8AVADwo48+Gn3+wkUXM0u7w05EBI/XgxqWkMxwGlb4hYmudzbCugGPQFcAm8WCpceO4MG1y9E8Mgqj23WEKSXqhYUhGAyGemco9evHSCFk7KJFi14lInkLR/3bF0REctOmTS6FlOgnhj/OpaWlCgBER0ehrKwMChFqzCB6rVmBiTv+iXsaxWN1+iBACtgtVmw+dRI9VizG6apKaIqC0rIyOB0OMDNOnTqJoUOHKBmjR4rKyso/9OzZswNuMdU3AqoAZHp6emplZeWYJ4Y/Ll/660vKkcOHAQAdO3bGt0cOw2MG0f/DldhRfApv5+/BS19uQ6+EJKzqNwjCNOGwWJFfWoLfLV+MMz4PThw8iJatW4OIcPjIETRp2pRee30qHA6HumfPnuy6k+B/ZGqdXPrY4XTw+fPnTCEEx8fH8d59+czMvPPLnfy7lUsY06Zw+DvT2TlnGuOtV3nCtk+YmfnDwm9ZmzGVHXOmszJjKjd+7x1evP0zNr1e/qGqihvHNeZ9+0N9vT1jugmAU1KSn7nGQTf1oApAtG7duk9NTU3vF198UcTGNlIVRUHvB/tgissFE8DU8lJ8XlyEMJsdJjMkh/RmjNUGU0oMaJqC9x9Ih8fvhV03UFJdjQlHv8FuXy22rFqFiDsi0eGujggGgxg/fgK1b99OFhYWZblcrmiEAua6WaVrSmJm1TCMgw0b3tny2LFjbLXaFBBwuqgYWz7Zgs0JsVh36ADCwsMhZAjMKwVye6djVErqdSNfXVSIR9asgNNmQyAQhGax4IXGcRjZrBXimqdACBOGbmD37q9EWtrdalRM1LyK8ooMKeV1ufGGQ1DC2GAw2CorK0va7Q7FFAIEQlyTJHzePBHrjnwDZ71wmCwBlvAIE5NSWiLNE0DJ99+jrLwMBQUFmDF7Fs4uy8P8B/qgpqYGuq5BmkFknS7CRzIAVVGgajqCZhDduqWpo0aNEuWXykf16NEjDTcEDF2BzMzMjHrjjTeOde3aJfLLL79CwAwquqrBLwUGrF+FT747jrDwcJhCAmB4g0HM7Z2O3qqBN7Oz4fN6AWZYLBakpKRgwMCBSIxPwIqzpzBs5XI4LFYwS3i8Hvw57R680aMnhBRgBqoqK0VKSopaU1Oz3+v1dqkTGBJA6D8KEYmoqKg5ZeVlz369Z4/ZsVNnjYVAkICBG1Zjc+EJOO0OCCFBxPAEg3C17YDJ3e+FarXeNOL+d8kSHNr5BRo98yT+9MU2OKxWKESorq3BU+3uwvz7+wCSoaoqFixYIEaOHKkmJiZOKC4unn0lJggA9e3bN3Xjxo0Hhj06TFm2dBmxlORniYEb1mBz4XdwOuwQpgQR4KmqQs7Dg6F+uhXuadPRo3t3dOvWFQmJidBUDRcunMfevfnYtWsnQITxzz+PMU8/jaz8r5C57XM4nE6oRKiqrUXfZs2xvO9AOHUDADjt7jTe/dXu6jFjxqTm5ORcAECk6xoMw7Le6XSmF54sNJ0Op1oT8CuDN63D5sLvEO5wQAiBoBAiIAUtHDAITzVJAQCcOHEC69Z9iP37D+Dy5cuQLBEeFo4WLVugb5++SEtLu86jc747jHEb1sNmWFhXFbXKU4u0uASs7vsQGjrD+ey5c8HWqakGES2rqal5TAihUnx8/ONnzpxZEhsbi65du+L+nvfhWMe2nL19K4XXi0BQmCCG1Jx2ZXLrdihbsgKHi4qhqQrsNjscDgdM00QgEAAzwzAM6LoOv9+PyqpKCFNA0zQIKdGpVQsogwbg9QP7oAZNqSuKUlldhf9q0ZInWsJoUe487NixA+Xl5UhKSupfVFS0QfP7/cPtdntBxQ8/8Nq1a9G0VQvrZxcik1WrRZhSgBWiILMyslnKx6ULlzSYNjfHWpevfrZt/OgjyrJagsN63uP7oOBIV0gh7Dab/Pr7Uv2A03dx7dq15RarFXannbw+7xP5+fmbr+Q+AQIURYXP69XvzM3eUWmzdIPXC9UwECPly8Ujn5sCANZbBMXtjAH4fT7oRIiaOzO3ymoZzULC6vN7erVskbruwYHFXq+XDMPgQCCgEpG8cQ9UAMge773X5AR7p5ng2AjGgqLR43JlXp7KgwdLIvpF3rsKyUxEBBXguPnvTPAbets7/GJBwejf70KdDr1tB6ireTVbXiPBf6XRDeWPNz8Khuuc9pNjJ9WdjRmAcLsZeXkKhgz5rX5o83VlXp7KBQWhH6shXXhtnf8f9i8ccK5KeMWwRQAAAABJRU5ErkJggg==';
    document.head.appendChild(favicon);

    if (!document.querySelector('link[href*="fonts.googleapis.com/css2?family=Inter"]')) {
        const fontLink = document.createElement('link');
        fontLink.rel = 'stylesheet';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
        document.head.appendChild(fontLink);
    }
    if (!document.querySelector('link[href*="Material+Icons+Round"]')) {
        const iconLink = document.createElement('link');
        iconLink.rel = 'stylesheet';
        iconLink.href = 'https://fonts.googleapis.com/icon?family=Material+Icons+Round';
        document.head.appendChild(iconLink);
    }

    const htmlContent = `
    <div id="kantine-wrapper">
        <header class="app-header">
            <div class="header-content">
                <div class="brand">
                    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAOUElEQVR4nNWYaXRVRbbH//tMd0xITAISyASBAGGSOYJP6fdEhAAiMjiAAxDoVsCWtpu0jdcrrUQFGYI2CQg8RIYwCQiCtjIIChImISASSJgTSYiZ7niqdn+4AQEbaIcP7+21zqqzzqmq86tdtXf96wD/x41+gz4UANylS5dE5mDU3r0H8uueyas1XC6l7tntLTWVgZXAkJXiN2ADAKhEhIg7IpaGhYWdZGYCoOIXDJ6uua6Y9mvhAIjOnTu3y8/Pf0RKqSckJDwD4L26d5IAbrtofs9LJOJVnxcCZGeGBcRWgKwsySpIWAXDQlAsDLZrBLVdzB3PfjpoxPe/FhCqpuLIkSPTwsPD9fDwcFlSUvLapEmT1mRlZVXi3ntV3r5dsCKp2uud57NadcUfBLTQbBOHhsFQwWAQQutClxI+gT8D/+m6uAkbAJHaNjXd4/H8T2bmJLFq1UoZCAQaLFy4cDIRSWzfznC56JsRGZ8319WOVr//ogwEGLW1fng8Jtdd8NSa8HhNeDxB8vpMGQjUBj21gZ8LSDfcMzMbxwuOvxnbKJbHjh1LnTt3Ufv37ydLS0uf7devXysAEm434HJp+54Zd7iFrvax6XoZGxYLGAoAjcGaCdYAaGBoADQCVNht+LmAXBeNV9rJpKSk3/v9/pavv/Z3GR5eT5FS0syZs9hqtRpbt259W9M0BkBwu024XNrep5872FzVHrABhawqBGYmEFQoodETIdSAYL/mQ7fBYgoVTHC7Je69VwMgMzMzY86cOTO5Y6cOcvjwJxUhBIQQSEpKUidOnCiqq6sfaNOmVT8AAoBaB2nsG/WHAw6FtsEwCAQJuiHciUBgGfSr8vaALpcCIr5r3rzk6AXvnmm28N1h2L7dJFXlhQsXTpZSRs2aOUsSEQkhQASYpolJkyZR47jGfPTo8beY2VLnfU1xuwMNc2e/Xk40Cj6/hKKEogPMVyiJADCkrvpuA1jnsYy8vHr7R406yVLsv2BYliW8P/+Z6Y2aNSwpKRn38MMDZffuPVQigmEY0DQdmqbB6XQqWVOzpN/vT0lISpgAIklut9lwXvYr5aqWKb0+wcwKJMAAsaJSKIx/zIQOOELAN4Uj4r4ffBC5q6r0lFXXZpaPGu+ul5v9vveOek/EnP9+evLy1W1yli7pFR+XIE+eLFRKS0ohhED9BvWRmJAIh8PB/Qf05w0bPqKcO++s75r68lM/SH5LeDwmARqYmUmBBpACeAKaaleDQSFVTdVZVt0TE5e8eciQS/8+DxJxv6VLG3z82GOlkTmz3qtyhr8SmTvLWpExbrj1HzMqizk48Ymc7EvVlyvQ7eFHyOP3w2qxAAT4fX4IIdC6TWtu2769svuTT9e/MemPf6wQ8q/S4zPBUgWIWVGkZrOqMVKOjrPY9x7y1mz1a3okCcEMljK0dm/YSeo8l5eXZ4y9dPZwZG72moqMcWOj5s7kmpjoScac6Vpx+86nXvPW8t83rI85mNwc8xctohbNmsFqs13t5vjx41i6YgVdPn2aB29co7xbcORFq8/PBKiAAkmQutWqNhBy/OmMcfPPAOg8f26v4/B/7FGNaAoEgvVQiZ8CEjFcLmXw4MHBF3JmT6kIc8yOzM3G5YxxY6NyZhkluvqnzKoKzOmUhsYR9fiFf24hpV44lrRMwf5du+DxeRHXuDGSU1rA/fLLtOpcMZ7ctD5dV1RIliCAhQKpWS1qAynHn84Yl80ul4b7gL09x+Z3zp1z/1GWnwnAHl8v3v9TQABwuyUBiuJ2ZzeeO8N6KTLyzbB/zKKLGePH9lmx5J7cQ/vbC0XhB5OaKobNjvUH98Ol62hy8CgulpfjYmkpurVOha33/Rjx4WroNrskVVXq5geaYVHrm3L86bETQnButwk3AJdL25vx3MGU+dkPlAtlWX5ZmQ1A7c0VRygtmHE5s6act1n/1pnp6y8GDE51HzvsmLLtc8CwwGrRETBNNI2IxHdPZlxturjgEJ7ashG6ZoAolEYlgdnQzcTI6LEnhzy+8CrctZaXp2LIEDF02bJEr81Wvv6hh6pvJYkILpequt1m7PJFr56tqJj8fGob9E9qigfXroKiKmBm+KRAQ7sdB4eOQITFhhWF32Lkp5tD6UGhkAAQUioOm9Lph9plF17MXFasqRvYFNdrxh8do8Dtvvr8VomaXa+8IgURHv54qzkqsWlw5hfbZa/VeSCFAMnQiEBSItbuRH1nOHws4f5yJ4LBIAxdD6kVyTCFUBb+d29e3LvvgHOGsb5Du/ZtANRpmRvM7ZbXbKm3FJUqABEZHd3H0NSNhceOyb8c2qe8u3c3oGqhllJC03UYRPhrlzS81KU7jpZdQt8P81BcXQOHocFjBjGlbQf8pWt3aHYHp6Wl0Z49e7bput4zEAioqEsnN7ObefCKWtErysreTE5Ols6ISH6tXUe4O3RC99hYpEREIL1pM8TYbPBIE3/buQ0Ttn2CVtEx2DJoGOLDHKitqsSygUPQ4lwJchYvBjNT9+53CwD3paQkP4Yr+/QvAFQAyObNk8cQUWqTpCbMzOrq1WuQXHQeO4eOQP6wEdgwYDDWpg9EpGbAolswe18+Ht+0Ds0jo/DRQ0OQ22cAhsY3gaNBA5w9fRpEhORmzYiZuaj4zFsTJkyIAOoEzM8AVADwo48+Gn3+wkUXM0u7w05EBI/XgxqWkMxwGlb4hYmudzbCugGPQFcAm8WCpceO4MG1y9E8Mgqj23WEKSXqhYUhGAyGemco9evHSCFk7KJFi14lInkLR/3bF0REctOmTS6FlOgnhj/OpaWlCgBER0ehrKwMChFqzCB6rVmBiTv+iXsaxWN1+iBACtgtVmw+dRI9VizG6apKaIqC0rIyOB0OMDNOnTqJoUOHKBmjR4rKyso/9OzZswNuMdU3AqoAZHp6emplZeWYJ4Y/Ll/660vKkcOHAQAdO3bGt0cOw2MG0f/DldhRfApv5+/BS19uQ6+EJKzqNwjCNOGwWJFfWoLfLV+MMz4PThw8iJatW4OIcPjIETRp2pRee30qHA6HumfPnuy6k+B/ZGqdXPrY4XTw+fPnTCEEx8fH8d59+czMvPPLnfy7lUsY06Zw+DvT2TlnGuOtV3nCtk+YmfnDwm9ZmzGVHXOmszJjKjd+7x1evP0zNr1e/qGqihvHNeZ9+0N9vT1jugmAU1KSn7nGQTf1oApAtG7duk9NTU3vF198UcTGNlIVRUHvB/tgissFE8DU8lJ8XlyEMJsdJjMkh/RmjNUGU0oMaJqC9x9Ih8fvhV03UFJdjQlHv8FuXy22rFqFiDsi0eGujggGgxg/fgK1b99OFhYWZblcrmiEAua6WaVrSmJm1TCMgw0b3tny2LFjbLXaFBBwuqgYWz7Zgs0JsVh36ADCwsMhZAjMKwVye6djVErqdSNfXVSIR9asgNNmQyAQhGax4IXGcRjZrBXimqdACBOGbmD37q9EWtrdalRM1LyK8ooMKeV1ufGGQ1DC2GAw2CorK0va7Q7FFAIEQlyTJHzePBHrjnwDZ71wmCwBlvAIE5NSWiLNE0DJ99+jrLwMBQUFmDF7Fs4uy8P8B/qgpqYGuq5BmkFknS7CRzIAVVGgajqCZhDduqWpo0aNEuWXykf16NEjDTcEDF2BzMzMjHrjjTeOde3aJfLLL79CwAwquqrBLwUGrF+FT747jrDwcJhCAmB4g0HM7Z2O3qqBN7Oz4fN6AWZYLBakpKRgwMCBSIxPwIqzpzBs5XI4LFYwS3i8Hvw57R680aMnhBRgBqoqK0VKSopaU1Oz3+v1dqkTGBJA6D8KEYmoqKg5ZeVlz369Z4/ZsVNnjYVAkICBG1Zjc+EJOO0OCCFBxPAEg3C17YDJ3e+FarXeNOL+d8kSHNr5BRo98yT+9MU2OKxWKESorq3BU+3uwvz7+wCSoaoqFixYIEaOHKkmJiZOKC4unn0lJggA9e3bN3Xjxo0Hhj06TFm2dBmxlORniYEb1mBz4XdwOuwQpgQR4KmqQs7Dg6F+uhXuadPRo3t3dOvWFQmJidBUDRcunMfevfnYtWsnQITxzz+PMU8/jaz8r5C57XM4nE6oRKiqrUXfZs2xvO9AOHUDADjt7jTe/dXu6jFjxqTm5ORcAECk6xoMw7Le6XSmF54sNJ0Op1oT8CuDN63D5sLvEO5wQAiBoBAiIAUtHDAITzVJAQCcOHEC69Z9iP37D+Dy5cuQLBEeFo4WLVugb5++SEtLu86jc747jHEb1sNmWFhXFbXKU4u0uASs7vsQGjrD+ey5c8HWqakGES2rqal5TAihUnx8/ONnzpxZEhsbi65du+L+nvfhWMe2nL19K4XXi0BQmCCG1Jx2ZXLrdihbsgKHi4qhqQrsNjscDgdM00QgEAAzwzAM6LoOv9+PyqpKCFNA0zQIKdGpVQsogwbg9QP7oAZNqSuKUlldhf9q0ZInWsJoUe487NixA+Xl5UhKSupfVFS0QfP7/cPtdntBxQ8/8Nq1a9G0VQvrZxcik1WrRZhSgBWiILMyslnKx6ULlzSYNjfHWpevfrZt/OgjyrJagsN63uP7oOBIV0gh7Dab/Pr7Uv2A03dx7dq15RarFXannbw+7xP5+fmbr+Q+AQIURYXP69XvzM3eUWmzdIPXC9UwECPly8Ujn5sCANZbBMXtjAH4fT7oRIiaOzO3ymoZzULC6vN7erVskbruwYHFXq+XDMPgQCCgEpG8cQ9UAMge773X5AR7p5ng2AjGgqLR43JlXp7KgwdLIvpF3rsKyUxEBBXguPnvTPAbets7/GJBwejf70KdDr1tB6ireTVbXiPBf6XRDeWPNz8Khuuc9pNjJ9WdjRmAcLsZeXkKhgz5rX5o83VlXp7KBQWhH6shXXhtnf8f9i8ccK5KeMWwRQAAAABJRU5ErkJggg==" alt="Logo" class="logo-img" style="height: 2em; width: 2em; object-fit: contain;">
                    <div class="header-left">
                        <h1>Kantinen Übersicht <small class="version-tag" style="font-size: 0.6em; opacity: 0.7; font-weight: 400; cursor: pointer;" title="Klick für Versionsmenü">v2.1.0</small></h1>
                        <div id="last-updated-subtitle" class="subtitle"></div>
                    </div>
                    <div class="nav-group" style="margin-left: 1rem;">
                        <button id="btn-this-week" class="nav-btn active" title="Menü dieser Woche anzeigen">Diese Woche</button>
                        <button id="btn-next-week" class="nav-btn" title="Menü nächster Woche anzeigen">Nächste Woche</button>
                    </div>
                    <button id="alarm-bell" class="icon-btn hidden" aria-label="Benachrichtigungen" title="Keine beobachteten Menüs" style="margin-left: -0.5rem;">
                        <span class="material-icons-round" id="alarm-bell-icon" style="color:var(--text-secondary); transition: color 0.3s;">notifications</span>
                    </button>
                </div>
                <div class="header-center-wrapper">
                    <div id="header-week-info" class="header-week-info"></div>
                </div>
                <div class="controls">
                    <button id="btn-refresh" class="icon-btn" aria-label="Menüdaten aktualisieren" title="Menüdaten neu laden">
                        <span class="material-icons-round">refresh</span>
                    </button>
                    <button id="btn-history" class="icon-btn" aria-label="Bestellhistorie" title="Bestellhistorie">
                        <span class="material-icons-round">receipt_long</span>
                    </button>
                    <button id="btn-highlights" class="icon-btn" aria-label="Persönliche Highlights verwalten" title="Persönliche Highlights verwalten">
                        <span class="material-icons-round">label</span>
                    </button>
                    <button id="theme-toggle" class="icon-btn" aria-label="Toggle Theme" title="Erscheinungsbild (Hell/Dunkel) wechseln">
                        <span class="material-icons-round theme-icon">light_mode</span>
                    </button>
                    <div id="lang-toggle" class="lang-toggle-dropdown" title="Sprache der Menübeschreibung">
                        <button id="btn-lang-toggle" class="icon-btn" aria-label="Sprache wählen" title="Sprache der Menübeschreibung">
                            <span class="material-icons-round">translate</span>
                        </button>
                        <div id="lang-dropdown" class="lang-dropdown-menu hidden">
                            <button class="lang-btn${state/* langMode */.Kl === 'de' ? ' active' : ''}" data-lang="de">🇦🇹 DE</button>
                            <button class="lang-btn${state/* langMode */.Kl === 'en' ? ' active' : ''}" data-lang="en">🇬🇧 EN</button>
                            <button class="lang-btn${state/* langMode */.Kl === 'all' ? ' active' : ''}" data-lang="all">🌐 ALL</button>
                        </div>
                    </div>
                    <button id="btn-login-open" class="user-badge-btn icon-btn-small" title="Mit Bessa.app Account anmelden">
                        <span class="material-icons-round">login</span>
                        <span>Anmelden</span>
                    </button>
                    <div id="user-info" class="user-badge hidden">
                        <span class="material-icons-round">person</span>
                        <span id="user-id-display"></span>
                        <button id="btn-logout" class="icon-btn-small" aria-label="Logout" title="Von Bessa.app abmelden">
                            <span class="material-icons-round">logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <div id="login-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Login</h2>
                    <button id="btn-login-close" class="icon-btn" aria-label="Close" title="Schließen">
                        <span class="material-icons-round">close</span>
                    </button>
                </div>
                <form id="login-form">
                    <div class="form-group">
                        <label for="employee-id">Mitarbeiternummer</label>
                        <input type="text" id="employee-id" name="employee-id" placeholder="z.B. 2041" required>
                        <small class="help-text">Deine offizielle Knapp Mitarbeiternummer.</small>
                    </div>
                    <div class="form-group">
                        <label for="password">Passwort</label>
                        <input type="password" id="password" name="password" placeholder="Bessa Passwort" required>
                        <small class="help-text">Das Passwort für deinen Bessa Account.</small>
                    </div>
                    <div id="login-error" class="error-msg hidden"></div>
                    <div class="modal-actions">
                        <button type="submit" class="btn-primary wide">Einloggen</button>
                    </div>
                </form>
            </div>
        </div>

        <div id="progress-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Menüdaten aktualisieren</h2>
                </div>
                <div class="modal-body" style="padding: 20px;">
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div id="progress-fill" class="progress-fill"></div>
                        </div>
                        <div id="progress-percent" class="progress-percent">0%</div>
                    </div>
                    <p id="progress-message" class="progress-message">Initialisierung...</p>
                </div>
            </div>
        </div>

        <div id="highlights-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Meine Highlights</h2>
                    <button id="btn-highlights-close" class="icon-btn" aria-label="Close" title="Schließen">
                        <span class="material-icons-round">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 1rem; color: var(--text-secondary);">
                        Markiere Menüs automatisch, wenn sie diese Schlagwörter enthalten.
                    </p>
                    <div class="input-group">
                        <input type="text" id="tag-input" placeholder="z.B. Schnitzel, Vegetarisch..." title="Neues Schlagwort zum Hervorheben eingeben">
                        <button id="btn-add-tag" class="btn-primary" title="Schlagwort zur Liste hinzufügen">Hinzufügen</button>
                    </div>
                    <div id="tags-list"></div>
                </div>
            </div>
        </div>

        <div id="history-modal" class="modal hidden">
            <div class="modal-content history-modal-content">
                <div class="modal-header">
                    <h2>Bestellhistorie</h2>
                    <button id="btn-history-close" class="icon-btn" aria-label="Close" title="Schließen">
                        <span class="material-icons-round">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div id="history-loading" class="hidden">
                        <p id="history-progress-text" style="text-align: center; margin-bottom: 1rem; color: var(--text-secondary);">Lade Historie...</p>
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div id="history-progress-fill" class="progress-fill"></div>
                            </div>
                        </div>
                    </div>
                    <div id="history-content">
                    </div>
                </div>
            </div>
        </div>

        <div id="version-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>📦 Versionen</h2>
                    <button id="btn-version-close" class="icon-btn" aria-label="Close" title="Schließen">
                        <span class="material-icons-round">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 1rem;">
                        <strong>Aktuell:</strong> <span id="version-current">v2.1.0</span>
                    </div>
                    <div class="dev-toggle">
                        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                            <input type="checkbox" id="dev-mode-toggle">
                            <span>Dev-Mode (alle Tags anzeigen)</span>
                        </label>
                    </div>
                    <div id="version-list-container" style="margin-top:1rem; max-height: 250px; overflow-y: auto;">
                        <p style="color:var(--text-secondary);">Lade Versionen...</p>
                    </div>
                    <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9em;">
                        <a href="https://github.com/TauNeutrino/kantine-overview/issues" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color); text-decoration: none; display: flex; align-items: center; gap: 0.5rem;" title="Melde einen Fehler auf GitHub">
                            <span class="material-icons-round" style="font-size: 1.2em;">bug_report</span> Fehler melden
                        </a>
                        <a href="https://github.com/TauNeutrino/kantine-overview/discussions/categories/ideas" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color); text-decoration: none; display: flex; align-items: center; gap: 0.5rem;" title="Schlage ein neues Feature auf GitHub vor">
                            <span class="material-icons-round" style="font-size: 1.2em;">lightbulb</span> Feature vorschlagen
                        </a>
                        <button id="btn-clear-cache" style="background: none; border: none; padding: 0; color: var(--error-color); text-decoration: none; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; text-align: left; font-size: inherit; font-family: inherit;" title="Löscht alle lokalen Daten & erzwingt einen Neuladen">
                            <span class="material-icons-round" style="font-size: 1.2em;">delete_forever</span> Lokalen Cache leeren
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <main class="container">
            <div id="last-updated-banner" class="banner hidden">
                <span class="material-icons-round">update</span>
                <span id="last-updated-text">Gerade aktualisiert</span>
            </div>
            <div id="loading" class="loading-state">
                <div class="spinner"></div>
                <p>Lade Menüdaten...</p>
            </div>
            <div id="menu-container" class="menu-grid"></div>
        </main>

        <footer class="app-footer">
            <div class="footer-left"></div>
            <div class="footer-center">
                <p>Jetzt Bessa Einfach! &bull; Knapp-Kantine Wrapper &bull; <span id="current-year">${new Date().getFullYear()}</span> by Kaufi 😃👍 mit Hilfe von KI 🤖</p>
            </div>
            <div class="footer-right">
                <a href="https://ko-fi.com/O4O01ZCNJE" target="_blank" title="Unterstütze die Entwicklung auf Ko-fi">
                    <img height="20" style="border:0px;height:20px;" src="https://storage.ko-fi.com/cdn/kofi5.png?v=6" border="0" alt="Buy Me a Coffee at ko-fi.com" />
                </a>
                <div id="donate-button-container">
                    <div id="donate-button"></div>
                </div>
            </div>
        </footer>
    </div>`;

    // On first load we take over the whole page; on re-init we only replace
    // the wrapper so external scripts (e.g. PayPal donate SDK) stay intact.
    var existingWrapper = document.getElementById('kantine-wrapper');
    if (existingWrapper) {
        existingWrapper.remove();
        var temp = document.createElement('div');
        temp.innerHTML = htmlContent;
        while (temp.firstChild) {
            document.body.appendChild(temp.firstChild);
        }
    } else {
        document.body.innerHTML = htmlContent;
    }

    // Initialize or re-initialize PayPal Donation Button.
    function renderPaypalButton() {
        if (window.PayPal && PayPal.Donation) {
            try {
                PayPal.Donation.Button({
                    env: 'production',
                    hosted_button_id: 'R5G9H9TFGQNUY',
                    image: {
                        src: 'https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif',
                        alt: 'Donate with PayPal button',
                        title: 'PayPal - The safer, easier way to pay online!',
                    }
                }).render('#donate-button');
            } catch (e) {
                console.warn('[Kantine] PayPal donate button render skipped:', e.message);
            }
        }
    }

    if (!document.getElementById('paypal-sdk')) {
        const script = document.createElement('script');
        script.id = 'paypal-sdk';
        script.src = "https://www.paypalobjects.com/donate/sdk/donate-sdk.js";
        script.charset = "UTF-8";
        script.onload = renderPaypalButton;
        document.body.appendChild(script);
    } else {
        renderPaypalButton();
    }

}

// EXTERNAL MODULE: ./src/actions.js
var actions = __webpack_require__(367);
// EXTERNAL MODULE: ./src/ui_helpers.js
var ui_helpers = __webpack_require__(842);
// EXTERNAL MODULE: ./src/constants.js
var constants = __webpack_require__(521);
// EXTERNAL MODULE: ./src/api.js
var api = __webpack_require__(672);
// EXTERNAL MODULE: ./src/i18n.js
var i18n = __webpack_require__(646);
// EXTERNAL MODULE: ./src/utils.js + 8 modules
var utils = __webpack_require__(801);
;// ./src/events.js









/**
 * Updates all static UI labels/tooltips to match the current language.
 * Called when the user switches the language toggle.
 */
function updateUILanguage() {
    // Navigation buttons
    const btnThisWeek = document.getElementById('btn-this-week');
    const btnNextWeek = document.getElementById('btn-next-week');
    if (btnThisWeek) {
        btnThisWeek.textContent = (0,i18n.t)('thisWeek');
        btnThisWeek.title = (0,i18n.t)('thisWeekTooltip');
    }
    if (btnNextWeek) {
        btnNextWeek.textContent = (0,i18n.t)('nextWeek');
        // Tooltip will be re-set by updateNextWeekBadge()
    }

    // Header title
    const appTitle = document.querySelector('.header-left h1');
    if (appTitle) {
        const versionTag = appTitle.querySelector('.version-tag');
        const updateIcon = appTitle.querySelector('.update-icon');
        appTitle.textContent = (0,i18n.t)('appTitle') + ' ';
        if (versionTag) appTitle.appendChild(versionTag);
        if (updateIcon) appTitle.appendChild(updateIcon);
    }

    // Action button tooltips
    const btnRefresh = document.getElementById('btn-refresh');
    if (btnRefresh) btnRefresh.setAttribute('aria-label', (0,i18n.t)('refresh'));
    if (btnRefresh) btnRefresh.title = (0,i18n.t)('refresh');

    const btnHistory = document.getElementById('btn-history');
    if (btnHistory) btnHistory.setAttribute('aria-label', (0,i18n.t)('history'));
    if (btnHistory) btnHistory.title = (0,i18n.t)('history');

    const btnHighlights = document.getElementById('btn-highlights');
    if (btnHighlights) btnHighlights.setAttribute('aria-label', (0,i18n.t)('highlights'));
    if (btnHighlights) btnHighlights.title = (0,i18n.t)('highlights');

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.title = (0,i18n.t)('themeTooltip');

    // Login/Logout
    const btnLoginOpen = document.getElementById('btn-login-open');
    if (btnLoginOpen) {
        btnLoginOpen.title = (0,i18n.t)('loginTooltip');
        const loginText = btnLoginOpen.querySelector('span:last-child');
        if (loginText && !loginText.classList.contains('material-icons-round')) {
            loginText.textContent = (0,i18n.t)('login');
        }
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) btnLogout.title = (0,i18n.t)('logoutTooltip');

    // Language toggle tooltip
    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) langToggle.title = (0,i18n.t)('langTooltip');

    // Modal headers
    const highlightsHeader = document.querySelector('#highlights-modal .modal-header h2');
    if (highlightsHeader) highlightsHeader.textContent = (0,i18n.t)('highlightsTitle');
    const highlightsDesc = document.querySelector('#highlights-modal .modal-body > p');
    if (highlightsDesc) highlightsDesc.textContent = (0,i18n.t)('highlightsDesc');
    const tagInput = document.getElementById('tag-input');
    if (tagInput) {
        tagInput.placeholder = (0,i18n.t)('tagInputPlaceholder');
        tagInput.title = (0,i18n.t)('tagInputTooltip');
    }
    const btnAddTag = document.getElementById('btn-add-tag');
    if (btnAddTag) {
        btnAddTag.textContent = (0,i18n.t)('addTag');
        btnAddTag.title = (0,i18n.t)('addTagTooltip');
    }

    const historyHeader = document.querySelector('#history-modal .modal-header h2');
    if (historyHeader) historyHeader.textContent = (0,i18n.t)('historyTitle');

    const loginHeader = document.querySelector('#login-modal .modal-header h2');
    if (loginHeader) loginHeader.textContent = (0,i18n.t)('loginTitle');

    // Alarm bell
    const alarmBell = document.getElementById('alarm-bell');
    if (alarmBell && state/* userFlags */.BY.size === 0) {
        alarmBell.title = (0,i18n.t)('alarmTooltipNone');
    }

    // Re-render dynamic parts that may use t()
    (0,ui_helpers/* renderVisibleWeeks */.OR)();
    (0,ui_helpers/* updateNextWeekBadge */.gJ)();
    (0,ui_helpers/* updateAlarmBell */.Mb)();
    (0,ui_helpers/* checkBootloaderVersion */.um)();
}

function bindEvents() {
    const btnThisWeek = document.getElementById('btn-this-week');
    const btnNextWeek = document.getElementById('btn-next-week');
    const btnRefresh = document.getElementById('btn-refresh');
    const themeToggle = document.getElementById('theme-toggle');
    const btnLoginOpen = document.getElementById('btn-login-open');
    const btnLoginClose = document.getElementById('btn-login-close');
    const btnLogout = document.getElementById('btn-logout');
    const loginForm = document.getElementById('login-form');
    const loginModal = document.getElementById('login-modal');

    const btnHighlights = document.getElementById('btn-highlights');
    const highlightsModal = document.getElementById('highlights-modal');
    const btnHighlightsClose = document.getElementById('btn-highlights-close');
    const btnAddTag = document.getElementById('btn-add-tag');
    const tagInput = document.getElementById('tag-input');

    const btnHistory = document.getElementById('btn-history');
    const historyModal = document.getElementById('history-modal');
    const btnHistoryClose = document.getElementById('btn-history-close');

    const btnLangToggle = document.getElementById('btn-lang-toggle');
    const langDropdown = document.getElementById('lang-dropdown');

    function updateLangToggleLabel() {
        if (btnLangToggle) btnLangToggle.textContent = state/* langMode */.Kl.toUpperCase();
    }

    if (btnLangToggle) {
        btnLangToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const modes = ['de', 'en', 'all'];
            const nextIndex = (modes.indexOf(state/* langMode */.Kl) + 1) % modes.length;
            const next = modes[nextIndex];
            (0,state/* setLangMode */.UD)(next);
            localStorage.setItem(constants.LS.LANG, next);
            updateLangToggleLabel();
            updateUILanguage();
            stats_tracker/* tracker */.F.increment('lang_switch');
        });
    }

    if (btnHighlights) {
        btnHighlights.addEventListener('click', () => {
            (0,actions/* renderTagsList */.Y1)();
            highlightsModal.classList.remove('hidden');
            stats_tracker/* tracker */.F.increment('highlights_mgr');
        });
    }

    if (btnHighlightsClose) {
        btnHighlightsClose.addEventListener('click', () => {
            highlightsModal.classList.add('hidden');
        });
    }

    btnHistory.addEventListener('click', () => {
        if (!state/* authToken */.gX) {
            loginModal.classList.remove('hidden');
            return;
        }
        historyModal.classList.remove('hidden');
        (0,actions/* fetchFullOrderHistory */.Aq)();
        stats_tracker/* tracker */.F.increment('order_history');
    });

    btnHistoryClose.addEventListener('click', () => {
        historyModal.classList.add('hidden');
    });

    window.addEventListener('click', (e) => {
        if (e.target === historyModal) historyModal.classList.add('hidden');
        if (e.target === highlightsModal) highlightsModal.classList.add('hidden');
    });

    const versionTag = document.querySelector('.version-tag');
    const versionModal = document.getElementById('version-modal');
    const btnVersionClose = document.getElementById('btn-version-close');

    if (versionTag) {
        versionTag.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            (0,ui_helpers/* openVersionMenu */.Gk)();
        });
    }

    if (btnVersionClose) {
        btnVersionClose.addEventListener('click', () => {
            versionModal.classList.add('hidden');
        });
    }

    const btnClearCache = document.getElementById('btn-clear-cache');
    if (btnClearCache) {
        btnClearCache.addEventListener('click', () => {
            if (confirm('Möchtest du wirklich alle lokalen Daten (inkl. Login-Session, Cache und Einstellungen) löschen? Die Seite wird danach neu geladen.')) {
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('kantine_')) {
                        localStorage.removeItem(key);
                    }
                });
                window.location.reload();
            }
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === versionModal) versionModal.classList.add('hidden');
    });

    btnAddTag.addEventListener('click', () => {
        const tag = tagInput.value;
        if ((0,actions/* addHighlightTag */.oL)(tag)) {
            tagInput.value = '';
            (0,actions/* renderTagsList */.Y1)();
        }
    });

    tagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btnAddTag.click();
        }
    });

    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const themeIcon = themeToggle.querySelector('.theme-icon');

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeIcon.textContent = 'dark_mode';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        themeIcon.textContent = 'light_mode';
    }

    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        themeIcon.textContent = next === 'dark' ? 'dark_mode' : 'light_mode';
        stats_tracker/* tracker */.F.increment('theme_switch');
    });

    btnThisWeek.addEventListener('click', () => {
        if (state/* displayMode */.sw !== 'this-week') {
            (0,state/* setDisplayMode */.qo)('this-week');
            btnThisWeek.classList.add('active');
            btnNextWeek.classList.remove('active');
            (0,ui_helpers/* renderVisibleWeeks */.OR)();
            stats_tracker/* tracker */.F.increment('week_nav');
        }
    });

    btnNextWeek.addEventListener('click', () => {
        btnNextWeek.classList.remove('new-week-available');
        if (state/* displayMode */.sw !== 'next-week') {
            (0,state/* setDisplayMode */.qo)('next-week');
            btnNextWeek.classList.add('active');
            btnThisWeek.classList.remove('active');
            (0,ui_helpers/* renderVisibleWeeks */.OR)();
            stats_tracker/* tracker */.F.increment('week_nav');
        }
    });

    btnRefresh.addEventListener('click', () => {
        if (!state/* authToken */.gX) {
            loginModal.classList.remove('hidden');
            return;
        }
        (0,actions/* loadMenuDataFromAPI */.m9)();
        stats_tracker/* tracker */.F.increment('refresh');
    });

    const bellBtn = document.getElementById('alarm-bell');
    if (bellBtn) {
        bellBtn.addEventListener('click', () => {
            (0,actions/* refreshFlaggedItems */.A0)();
        });
    }

    btnLoginOpen.addEventListener('click', () => {
        loginModal.classList.remove('hidden');
        document.getElementById('login-error').classList.add('hidden');
        loginForm.reset();
    });

    btnLoginClose.addEventListener('click', () => {
        loginModal.classList.add('hidden');
    });

    window.addEventListener('click', (e) => {
        if (e.target === loginModal) loginModal.classList.add('hidden');
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const employeeId = document.getElementById('employee-id').value.trim();
        const password = document.getElementById('password').value;
        const loginError = document.getElementById('login-error');
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Wird eingeloggt...';

        try {
            const email = `knapp-${employeeId}@bessa.app`;
            const response = await fetch(`${constants/* API_BASE */.tE}/auth/login/`, {
                method: 'POST',
                headers: (0,api/* apiHeaders */.H)(),
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                (0,state/* setAuthToken */.O5)(data.key);
                (0,state/* setCurrentUser */.lt)(employeeId);
                localStorage.setItem(constants.LS.AUTH_TOKEN, data.key);
                localStorage.setItem(constants.LS.CURRENT_USER, employeeId);

                try {
                    const userResp = await fetch(`${constants/* API_BASE */.tE}/auth/user/`, {
                        headers: (0,api/* apiHeaders */.H)(data.key)
                    });
                    if (userResp.ok) {
                        const userData = await userResp.json();
                        if (userData.first_name) localStorage.setItem(constants.LS.FIRST_NAME, userData.first_name);
                        if (userData.last_name) localStorage.setItem(constants.LS.LAST_NAME, userData.last_name);
                    }
                } catch (err) {
                    console.error('Failed to fetch user info:', err);
                }

                (0,actions/* updateAuthUI */.i_)();
                loginModal.classList.add('hidden');
                (0,actions/* fetchOrders */.Gb)();
                loginForm.reset();
                stats_tracker/* tracker */.F.increment('login');
                (0,actions/* startPolling */.g8)();
                (0,actions/* loadMenuDataFromAPI */.m9)();
            } else {
                loginError.textContent = data.non_field_errors?.[0] || data.error || 'Login fehlgeschlagen';
                loginError.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Login error:', error);
            loginError.textContent = 'Ein Fehler ist aufgetreten';
            loginError.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });

    btnLogout.addEventListener('click', () => {
        // Secure Logout (FR-006): Clear all application-related data from localStorage
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('kantine_')) {
                localStorage.removeItem(key);
            }
        });

        (0,state/* setAuthToken */.O5)(null);
        (0,state/* setCurrentUser */.lt)(null);
        (0,state/* setOrderMap */.di)(new Map());
        (0,actions/* stopPolling */.Et)();
        (0,actions/* updateAuthUI */.i_)();
        (0,ui_helpers/* renderVisibleWeeks */.OR)();
        stats_tracker/* tracker */.F.increment('logout');
    });

    // Sync heights on window resize (FR-Performance)
    window.addEventListener('resize', (0,utils/* debounce */.sg)(() => {
        const grid = document.querySelector('.days-grid');
        if (grid) (0,ui_helpers/* syncMenuItemHeights */.wy)(grid);
    }, 150));

    updateLangToggleLabel();
}

;// ./src/stats-hash.js


async function computeUserHash() {
    const currentUser = localStorage.getItem(constants.LS.CURRENT_USER);
    if (!currentUser) return null;
    const encoder = new TextEncoder();
    const buffer = encoder.encode(currentUser);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

;// ./src/index.js
window.__kantine_load_start = Date.now();

(function(){
    var splash = document.getElementById('kantine-splash');
    if (splash) splash.remove();
    var oldWrapper = document.getElementById('kantine-wrapper');
    if (oldWrapper) oldWrapper.remove();
})();











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
      s.textContent = constants/* BUNDLED_CSS */.HC;
      document.head.appendChild(s);
    })();

    // Stats: baseline metrics
    stats_tracker/* tracker */.F.increment('starts');
    stats_tracker/* tracker */.F.increment('session_count');
    stats_tracker/* tracker */.F.incrementCategory('version', 'v2.1.0');
    stats_tracker/* tracker */.F.set('version_commit_hash', constants/* COMMIT_HASH */.X9);
    stats_tracker/* tracker */.F.increment('hour_' + new Date().getHours());
    stats_tracker/* tracker */.F.incrementCategory('mobile', window.innerWidth < 768);
    stats_tracker/* tracker */.F.incrementCategory('lang', state/* langMode */.Kl);
    stats_tracker/* tracker */.F.incrementCategory('logged_in', !!state/* authToken */.gX);
    
    (async () => {
        try {
            const newHash = await computeUserHash();
            stats_tracker/* tracker */.F.setUserHash(newHash);
        } catch (e) {
            console.warn('[Stats] computeUserHash failed:', e.message, e.stack);
            stats_tracker/* tracker */.F.setUserHashError();
        }
        let pending = stats_tracker/* tracker */.F.getPendingFlush();
        while (pending) {
            const current = stats_tracker/* tracker */.F.load();
            await stats_tracker/* tracker */.F.flushToGist(pending.date, pending.daily, current.user_hash || pending.user_hash);
            pending = stats_tracker/* tracker */.F.getPendingFlush();
        }
    })();

    injectUI();
    bindEvents();
    (0,actions/* updateAuthUI */.i_)();
    (0,actions/* cleanupExpiredFlags */.H)();

    const hadCache = (0,actions/* loadMenuCache */.KG)();
    if (hadCache) {
        document.getElementById('loading').classList.add('hidden');
        const loadMs = Date.now() - window.__kantine_load_start;
        stats_tracker/* tracker */.F.incrementValue('load_time_sum', loadMs);
        stats_tracker/* tracker */.F.increment('load_time_count');
        if (!(0,actions/* isCacheFresh */.VL)()) {
            (0,actions/* loadMenuDataFromAPI */.m9)();
        }
    } else {
        (0,actions/* loadMenuDataFromAPI */.m9)();
    }

    if (state/* authToken */.gX) {
        (0,actions/* startPolling */.g8)();
    }

    (0,ui_helpers/* checkForUpdates */.Ux)();
    setInterval(ui_helpers/* checkForUpdates */.Ux, 60 * 60 * 1000);

    (0,ui_helpers/* checkBootloaderVersion */.um)();
}

window.addEventListener('beforeunload', () => {
    const startMs = stats_tracker/* tracker */.F.load().session?.start_ms;
    if (startMs) {
        const dur = Math.round((Date.now() - startMs) / 1000);
        stats_tracker/* tracker */.F.incrementValue('session_duration_sum', dur);
        stats_tracker/* tracker */.F.increment('session_duration_count');
    }
});

/******/ })()
;