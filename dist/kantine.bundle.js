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
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(160);
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
        _stats_tracker_js__WEBPACK_IMPORTED_MODULE_6__/* .tracker */ .F.set('api_latency_ms', Date.now() - __apiStart);
        if (window.__kantine_load_start) {
            _stats_tracker_js__WEBPACK_IMPORTED_MODULE_6__/* .tracker */ .F.set('load_time_ms', Date.now() - window.__kantine_load_start);
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
/* harmony export */   IY: () => (/* binding */ RAW_INSTALLER_BASE),
/* harmony export */   KJ: () => (/* binding */ GIST_ID),
/* harmony export */   LS: () => (/* binding */ LS),
/* harmony export */   YU: () => (/* binding */ MENU_ID),
/* harmony export */   d7: () => (/* binding */ GIST_SALT),
/* harmony export */   eW: () => (/* binding */ VENUE_ID),
/* harmony export */   fK: () => (/* binding */ GITHUB_FILE_BASE),
/* harmony export */   fZ: () => (/* binding */ CLIENT_VERSION),
/* harmony export */   fv: () => (/* binding */ POLL_INTERVAL_MS),
/* harmony export */   pe: () => (/* binding */ GITHUB_API),
/* harmony export */   q: () => (/* binding */ GIST_PAT),
/* harmony export */   tE: () => (/* binding */ API_BASE)
/* harmony export */ });
/* unused harmony export GITHUB_REPO */
/**
 * Application-wide constants.
 * All API endpoints, IDs and timing parameters are centralized here
 * to make changes easy and avoid magic numbers scattered across the codebase.
 */

/** Base URL for the Bessa REST API (v1). */
const API_BASE = 'https://api.bessa.app/v1';

/** The client version injected into every API request header. */
const CLIENT_VERSION = '{{VERSION}}';

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
    STATS_ANON_ID:           '_kstats_anon_id',
};

const GIST_ID = '{{GIST_ID}}';
const GIST_SALT = '{{GIST_SALT}}';
const GIST_PAT = '{{GIST_PAT}}';


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
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(160);
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
        return localStorage.getItem(GIST_ID_KEY) || _constants_js__WEBPACK_IMPORTED_MODULE_0__/* .GIST_ID */ .KJ;
    }

    _saveGistId(id) {
        localStorage.setItem(GIST_ID_KEY, id);
    }

    async flushToGist(pendingDate, pendingDaily, pendingUserHash) {
        try {
            let gistId = this._resolveGistId();
            let resp = await fetch(`https://api.github.com/gists/${gistId}`, {
                headers: { 'Authorization': `token ${_constants_js__WEBPACK_IMPORTED_MODULE_0__/* .GIST_PAT */ .q}`, 'Accept': 'application/vnd.github.v3+json' }
            });

            let data;
            if (resp.status === 404 && !localStorage.getItem(GIST_ID_KEY)) {
                // Gist doesn't exist and we haven't saved an ID yet — auto-create
                console.log('[StatsTracker] Gist not found, creating a new secret Gist...');
                const createResp = await fetch('https://api.github.com/gists', {
                    method: 'POST',
                    headers: { 'Authorization': `token ${_constants_js__WEBPACK_IMPORTED_MODULE_0__/* .GIST_PAT */ .q}`, 'Content-Type': 'application/json' },
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
                headers: { 'Authorization': `token ${_constants_js__WEBPACK_IMPORTED_MODULE_0__/* .GIST_PAT */ .q}`, 'Content-Type': 'application/json' },
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
/* harmony export */   wy: () => (/* binding */ syncMenuItemHeights)
/* harmony export */ });
/* unused harmony exports createDayCard, fetchVersions, openInstallPage, updateCountdown, removeCountdown */
/* harmony import */ var _state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(901);
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(160);
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(521);
/* harmony import */ var _api_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(672);
/* harmony import */ var _actions_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(367);
/* harmony import */ var _i18n_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(646);







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

        let statusBadge = '';
        if (item.available) {
            statusBadge = item.amountTracking
                ? `<span class="badge available">${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('available')} (${item.availableAmount})</span>`
                : `<span class="badge available">${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('available')}</span>`;
        } else {
            statusBadge = `<span class="badge sold-out">${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('soldOut')}</span>`;
        }

        const dm = localStorage.getItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.DEV_MODE) === 'true';
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

        itemEl.innerHTML = `<div class="item-header"><span class="item-name">${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(item.name)}</span><span class="item-price">${item.price.toFixed(2)} €</span></div><div class="item-status-row">${orderedBadge}${cancelButton}${orderButton}${flagButton}<div class="badges">${statusBadge}</div></div>${tagsHtml}<div class="item-desc-wrap"><p class="item-desc"${dTitle}>${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .getLocalizedText */ .PC)(item.description))} ${cBadge}</p></div>`;

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
    const currentVersion = '{{VERSION}}';
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

function openVersionMenu() {
    const modal = document.getElementById('version-modal');
    const container = document.getElementById('version-list-container');
    const devToggle = document.getElementById('dev-mode-toggle');
    const currentVersion = '{{VERSION}}';

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

    devToggle.onchange = () => {
        localStorage.setItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.DEV_MODE, devToggle.checked);
        localStorage.removeItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.VERSION_CACHE);
        localStorage.removeItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.VERSION_ETAG);
        loadVersions(true);
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

/***/ 160
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
  const parenRegex = /\(([^)]+)\)\s*(?!\s*\/)/g;
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

;// ./src/lang/loanwords.js
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
    'ciabatta', 'bruschetta', 'antipasti', 'carpaccio'
]);

function isLoanword(token) {
    if (!token) return false;
    const w = String(token).toLowerCase().replace(/[^a-zäöüß]/g, '');
    return w.length > 0 && LOANWORDS.has(w);
}

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

function classifyToken(token, langModel, isFirst) {
    if (isLoanword(token)) return 'ambig';
    if (!isFirst && /^[A-ZÄÖÜ]/.test(token)) return 'de';
    const s = langModel.scoreLang(token);
    if (s > 0.5) return 'de';
    if (s < -0.5) return 'en';
    return 'ambig';
}

function findDishBoundary(midTokens, langModel) {
    const n = midTokens.length;
    if (n <= 1) return n;

    const tags = midTokens.map((t, i) => classifyToken(t, langModel, i === 0));

    let bestK = 1;
    let bestPenalty = Infinity;
    let bestCap = -1;

    for (let k = 1; k < n; k++) {
        let leftGerman = 0;
        for (let i = 0; i < k; i++) if (tags[i] === 'de') leftGerman++;
        let rightEnglish = 0;
        for (let i = k; i < n; i++) if (tags[i] === 'en') rightEnglish++;

        const penalty = leftGerman + rightEnglish;
        const cap = /^[A-ZÄÖÜ]/.test(midTokens[k]) ? 1 : 0;

        if (penalty < bestPenalty || (penalty === bestPenalty && cap > bestCap)) {
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
    if (word.length < 3 || isLoanword(tok)) continue;
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
;// ./src/lang/langModel.js
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
        const alphaWords = lowerText.match(/[a-zäöüß]+/g) || [];

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

        const umlauts = lowerText.match(/[äöüß]/g);
        if (umlauts) {
            deScore += 0.5 * umlauts.length;
        }

        for (const w of alphaWords) {
            if (/(ung|suppe|chen|kartoffel|schnitzel)$/.test(w)) deScore += 1.0;
            if (/(ing|ed)$/.test(w)) enScore += 0.5;
            if (/^th/.test(w)) enScore += 0.5;
        }

        const deDigraphs = lowerText.match(/(sch|pf|tz|ck)/g);
        if (deDigraphs) {
            deScore += 0.3 * deDigraphs.length;
        }

        return { de: deScore, en: enScore };
    }

    function scoreLang(text) {
        const scores = scorePhrase(text);
        return scores.de - scores.en;
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
        getModel,
        mergeDelta,
        learnFromCourse,
        loadDelta,
        saveDelta
    };

    return modelObj;
}

;// ./src/lang/langModelSeed.js
// GENERATED by tools/train-langmodel.js — do not edit by hand.
// Regenerate via: node tools/train-langmodel.js tests/test_kantine_menuCache.json src/lang/langModelSeed.js (then wrap in export const)
// @ts-check

var LANG_MODEL_SEED = {
  "version": "v1.8.9",
  "trigramsDe": {
    "ack": 24,
    "ade": 7,
    "ahm": 19,
    "ais": 13,
    "ami": 32,
    "ane": 14,
    "anu": 5,
    "apf": 18,
    "arf": 15,
    "arg": 8,
    "aro": 27,
    "art": 52,
    "asc": 11,
    "atm": 26,
    "atu": 5,
    "aub": 3,
    "aue": 3,
    "auf": 26,
    "aun": 10,
    "aup": 5,
    "aur": 6,
    "bac": 22,
    "bel": 16,
    "ben": 6,
    "bis": 15,
    "bla": 10,
    "boe": 3,
    "boh": 9,
    "bou": 20,
    "bra": 27,
    "bru": 4,
    "bse": 26,
    "bst": 10,
    "bäc": 7,
    "bär": 9,
    "ceu": 6,
    "chk": 9,
    "chm": 14,
    "chr": 13,
    "chs": 40,
    "cht": 17,
    "cku": 3,
    "cuj": 5,
    "dei": 4,
    "del": 63,
    "dep": 3,
    "der": 17,
    "dfl": 5,
    "dka": 3,
    "dla": 4,
    "dom": 5,
    "dru": 4,
    "dsc": 6,
    "dsg": 3,
    "dss": 5,
    "dsu": 55,
    "däp": 3,
    "eau": 4,
    "ebe": 23,
    "ebä": 7,
    "eck": 8,
    "eeh": 6,
    "eer": 29,
    "eeu": 3,
    "efü": 4,
    "egi": 5,
    "eha": 4,
    "ehe": 6,
    "ehü": 3,
    "eie": 7,
    "eig": 9,
    "ein": 50,
    "eis": 76,
    "eiß": 6,
    "ejo": 3,
    "elb": 7,
    "elf": 5,
    "elg": 10,
    "elh": 3,
    "elk": 15,
    "ell": 57,
    "elm": 19,
    "eln": 34,
    "elr": 11,
    "els": 31,
    "elt": 3,
    "elu": 4,
    "eme": 157,
    "emi": 121,
    "emm": 8,
    "emü": 83,
    "enc": 62,
    "ene": 35,
    "eng": 10,
    "eni": 10,
    "enk": 22,
    "enp": 9,
    "enr": 18,
    "enü": 4,
    "era": 21,
    "ere": 18,
    "erf": 14,
    "erj": 4,
    "erk": 19,
    "erl": 38,
    "erm": 30,
    "ern": 12,
    "eru": 8,
    "esm": 3,
    "esu": 130,
    "etm": 7,
    "euf": 3,
    "eun": 24,
    "evo": 4,
    "ezw": 5,
    "eßn": 10,
    "eßs": 5,
    "fbe": 3,
    "fel": 77,
    "fer": 8,
    "ffe": 53,
    "fio": 14,
    "fla": 6,
    "fle": 17,
    "fmi": 15,
    "for": 5,
    "frü": 4,
    "fsk": 4,
    "fte": 5,
    "fzi": 4,
    "fül": 4,
    "geb": 37,
    "gef": 4,
    "gel": 9,
    "gem": 85,
    "gen": 9,
    "ghu": 26,
    "gie": 5,
    "gom": 5,
    "gri": 27,
    "grü": 3,
    "gsr": 4,
    "gwe": 9,
    "haf": 7,
    "hau": 7,
    "hcr": 14,
    "hec": 6,
    "hei": 7,
    "hel": 6,
    "hen": 92,
    "him": 22,
    "hkä": 5,
    "hmi": 9,
    "hmo": 3,
    "hms": 16,
    "hne": 40,
    "hnk": 4,
    "hnm": 3,
    "hnu": 4,
    "hok": 16,
    "hre": 10,
    "hsf": 4,
    "hsu": 18,
    "htf": 6,
    "htj": 5,
    "huh": 13,
    "hur": 26,
    "hwü": 4,
    "hüh": 28,
    "ieb": 16,
    "ien": 10,
    "ier": 18,
    "ieß": 19,
    "ign": 6,
    "iku": 4,
    "ilc": 13,
    "ile": 17,
    "ilz": 3,
    "imb": 13,
    "imi": 17,
    "ind": 78,
    "ink": 17,
    "inl": 16,
    "inm": 12,
    "int": 8,
    "iol": 15,
    "ipl": 9,
    "irs": 13,
    "isc": 58,
    "isf": 3,
    "isk": 6,
    "ism": 5,
    "ita": 7,
    "itb": 28,
    "itd": 10,
    "ite": 39,
    "itf": 20,
    "itg": 35,
    "itj": 8,
    "itk": 31,
    "itl": 9,
    "itm": 23,
    "itp": 18,
    "itr": 48,
    "its": 48,
    "itt": 45,
    "itv": 5,
    "iße": 6,
    "jog": 27,
    "kar": 94,
    "kas": 11,
    "kau": 3,
    "ker": 27,
    "kir": 9,
    "kko": 8,
    "kla": 5,
    "kle": 10,
    "kno": 7,
    "knö": 23,
    "kob": 8,
    "kok": 30,
    "kol": 8,
    "kos": 27,
    "kro": 13,
    "krä": 16,
    "kuc": 81,
    "kui": 5,
    "kum": 4,
    "kun": 3,
    "käf": 3,
    "käs": 31,
    "kür": 10,
    "lag": 15,
    "lau": 38,
    "lbe": 5,
    "lch": 18,
    "lcr": 22,
    "leg": 5,
    "lei": 29,
    "lfe": 5,
    "lge": 11,
    "lie": 6,
    "lik": 4,
    "lki": 3,
    "lko": 5,
    "lkä": 4,
    "llc": 3,
    "llg": 5,
    "llk": 3,
    "llo": 24,
    "llt": 5,
    "lmi": 26,
    "lnm": 3,
    "lon": 26,
    "lri": 10,
    "lsc": 3,
    "lsu": 19,
    "lte": 8,
    "lun": 13,
    "lzr": 3,
    "mac": 10,
    "mbe": 16,
    "mem": 16,
    "mes": 125,
    "met": 8,
    "mhu": 3,
    "mia": 4,
    "mit": 357,
    "moh": 6,
    "mpi": 6,
    "msu": 6,
    "müs": 83,
    "nak": 5,
    "nat": 9,
    "nau": 5,
    "ncr": 52,
    "nde": 29,
    "ndk": 9,
    "nds": 74,
    "neh": 5,
    "nen": 43,
    "ner": 47,
    "nhi": 3,
    "nig": 7,
    "nim": 3,
    "nin": 11,
    "niz": 3,
    "nka": 4,
    "nke": 12,
    "nko": 11,
    "nku": 7,
    "nkä": 7,
    "nma": 16,
    "nmi": 42,
    "nmo": 4,
    "nob": 7,
    "non": 6,
    "nra": 10,
    "nre": 11,
    "nsc": 18,
    "nsu": 12,
    "nto": 13,
    "nud": 23,
    "nun": 19,
    "nuß": 11,
    "nöd": 23,
    "oba": 7,
    "obl": 7,
    "obs": 10,
    "ock": 18,
    "oeu": 3,
    "off": 52,
    "ogh": 26,
    "ohn": 15,
    "okk": 10,
    "oko": 45,
    "olc": 14,
    "omi": 8,
    "one": 35,
    "onm": 25,
    "opf": 21,
    "ore": 5,
    "orr": 3,
    "osm": 7,
    "osp": 6,
    "oss": 5,
    "osu": 8,
    "ott": 38,
    "oui": 22,
    "oun": 4,
    "pec": 5,
    "pei": 9,
    "pem": 71,
    "pet": 6,
    "pfe": 30,
    "pfm": 6,
    "pft": 5,
    "pie": 3,
    "pig": 6,
    "pil": 3,
    "plu": 9,
    "ppe": 334,
    "pre": 13,
    "pts": 4,
    "put": 18,
    "pät": 11,
    "pür": 6,
    "rah": 19,
    "rat": 24,
    "rbi": 10,
    "rbr": 6,
    "rdb": 11,
    "rdä": 3,
    "reg": 5,
    "rei": 61,
    "rel": 6,
    "rem": 157,
    "rer": 9,
    "res": 13,
    "rfe": 5,
    "rfi": 20,
    "rfl": 7,
    "rge": 13,
    "rin": 82,
    "rit": 15,
    "rjo": 4,
    "rkn": 5,
    "rku": 8,
    "rla": 10,
    "rmi": 29,
    "rok": 11,
    "ron": 30,
    "rop": 5,
    "rrt": 3,
    "rsc": 19,
    "rsi": 6,
    "rst": 11,
    "rsu": 12,
    "rte": 17,
    "rto": 52,
    "ruc": 16,
    "run": 7,
    "rus": 6,
    "ryk": 3,
    "räu": 18,
    "rös": 5,
    "rüh": 4,
    "rün": 3,
    "sbo": 3,
    "sch": 164,
    "scr": 13,
    "seb": 20,
    "sei": 4,
    "sen": 34,
    "seu": 12,
    "sfl": 3,
    "sfo": 4,
    "sge": 5,
    "skn": 10,
    "sku": 7,
    "skä": 4,
    "smi": 23,
    "spe": 12,
    "spu": 8,
    "spä": 11,
    "ssk": 11,
    "ssu": 10,
    "sth": 3,
    "stm": 4,
    "sun": 8,
    "sup": 335,
    "süß": 17,
    "tam": 16,
    "tau": 9,
    "tba": 11,
    "tbr": 5,
    "tbu": 10,
    "tde": 3,
    "teg": 5,
    "tei": 32,
    "tel": 48,
    "tem": 4,
    "ten": 131,
    "tfr": 19,
    "tge": 20,
    "tgr": 13,
    "thu": 9,
    "thü": 4,
    "tis": 4,
    "tja": 5,
    "tjo": 7,
    "tka": 20,
    "tkä": 5,
    "tkü": 3,
    "tle": 5,
    "tli": 4,
    "tma": 21,
    "tmi": 43,
    "top": 16,
    "tpü": 4,
    "tre": 20,
    "tsc": 18,
    "tse": 9,
    "tsp": 20,
    "tsü": 3,
    "tta": 21,
    "tte": 76,
    "tth": 4,
    "ttr": 5,
    "tun": 9,
    "tva": 5,
    "uch": 120,
    "uco": 11,
    "ufb": 3,
    "ufl": 6,
    "ufs": 5,
    "ufz": 5,
    "uhn": 13,
    "uil": 22,
    "uja": 5,
    "und": 99,
    "uns": 6,
    "upp": 336,
    "upt": 4,
    "usm": 3,
    "ute": 34,
    "ußk": 10,
    "vom": 3,
    "von": 5,
    "wie": 16,
    "wlm": 5,
    "wür": 9,
    "zam": 4,
    "zer": 3,
    "zit": 15,
    "zwi": 16,
    "ßez": 5,
    "ßka": 17,
    "ßkr": 10,
    "ßno": 10,
    "ßsu": 5,
    "äck": 7,
    "äfe": 3,
    "äpf": 3,
    "ärl": 9,
    "äse": 31,
    "ätz": 11,
    "äut": 16,
    "öde": 23,
    "öst": 3,
    "ühl": 4,
    "ühn": 28,
    "üll": 4,
    "üne": 3,
    "ürb": 10,
    "üre": 6,
    "ürf": 5,
    "ürs": 4,
    "üse": 83,
    "üßk": 17
  },
  "trigramsEn": {
    "aar": 4,
    "abb": 5,
    "aca": 5,
    "add": 55,
    "adp": 16,
    "adu": 10,
    "adw": 33,
    "aet": 11,
    "aha": 2,
    "akg": 1,
    "akm": 1,
    "alc": 7,
    "alf": 2,
    "alo": 5,
    "alv": 1,
    "amc": 5,
    "amn": 2,
    "amr": 2,
    "amw": 11,
    "anw": 11,
    "aon": 1,
    "aou": 1,
    "apo": 1,
    "app": 28,
    "apu": 5,
    "ary": 1,
    "asb": 6,
    "ash": 14,
    "ass": 13,
    "atf": 2,
    "atp": 9,
    "atr": 1,
    "awb": 16,
    "awi": 32,
    "aze": 3,
    "bab": 2,
    "bak": 28,
    "bba": 4,
    "bea": 11,
    "bes": 6,
    "boa": 3,
    "bre": 19,
    "bsa": 9,
    "bun": 1,
    "cab": 3,
    "cao": 1,
    "cba": 2,
    "ceg": 1,
    "cej": 1,
    "cel": 8,
    "cep": 13,
    "ces": 6,
    "cew": 9,
    "cil": 1,
    "cis": 5,
    "ciw": 1,
    "ckp": 5,
    "ckw": 5,
    "coa": 2,
    "coc": 27,
    "cof": 3,
    "coi": 2,
    "com": 2,
    "cri": 4,
    "cru": 2,
    "cub": 5,
    "dan": 9,
    "dca": 11,
    "dcr": 10,
    "ddu": 9,
    "deg": 6,
    "dia": 8,
    "dki": 1,
    "dme": 6,
    "doa": 3,
    "dpe": 11,
    "dpl": 18,
    "dri": 10,
    "dro": 8,
    "dsh": 2,
    "dst": 3,
    "dto": 7,
    "dve": 14,
    "dwi": 34,
    "dwt": 2,
    "dyo": 3,
    "dzu": 2,
    "eac": 9,
    "ead": 15,
    "eaf": 1,
    "eah": 2,
    "ear": 12,
    "eas": 21,
    "ebb": 1,
    "ebu": 4,
    "eco": 5,
    "edb": 3,
    "edc": 17,
    "ede": 3,
    "edl": 5,
    "edm": 5,
    "edt": 13,
    "edu": 11,
    "edv": 8,
    "edw": 3,
    "edz": 2,
    "eed": 4,
    "eep": 4,
    "eet": 21,
    "efa": 2,
    "efi": 6,
    "efw": 4,
    "ega": 5,
    "egg": 20,
    "eks": 9,
    "eoa": 2,
    "eon": 8,
    "epc": 3,
    "epi": 2,
    "epo": 10,
    "epp": 12,
    "ero": 7,
    "ery": 11,
    "esk": 2,
    "esw": 15,
    "etg": 1,
    "etp": 23,
    "etw": 9,
    "euw": 1,
    "ewe": 7,
    "ewo": 2,
    "ews": 5,
    "eyc": 7,
    "eyg": 1,
    "eyo": 4,
    "eyp": 1,
    "eyr": 5,
    "fau": 1,
    "fed": 4,
    "fey": 1,
    "ffl": 1,
    "ffp": 2,
    "ffw": 3,
    "fno": 1,
    "fpa": 2,
    "fsm": 1,
    "fua": 3,
    "fuu": 2,
    "fwi": 8,
    "gal": 2,
    "gep": 5,
    "gew": 3,
    "gfr": 1,
    "ggp": 10,
    "gna": 7,
    "goa": 5,
    "goy": 3,
    "gpa": 5,
    "gpl": 5,
    "gro": 4,
    "gsw": 5,
    "gwi": 8,
    "gän": 1,
    "haj": 1,
    "hak": 6,
    "hal": 3,
    "han": 10,
    "hap": 3,
    "hav": 2,
    "hbe": 6,
    "hbr": 11,
    "hbu": 5,
    "hca": 5,
    "hch": 30,
    "hck": 1,
    "hcu": 10,
    "hda": 2,
    "hdj": 2,
    "hea": 4,
    "hed": 6,
    "hfa": 1,
    "hfr": 5,
    "hga": 22,
    "hgl": 2,
    "hha": 6,
    "hhe": 5,
    "hho": 2,
    "hhu": 1,
    "hio": 1,
    "hit": 7,
    "hiw": 9,
    "hka": 1,
    "hle": 4,
    "hlo": 1,
    "hoc": 17,
    "hpa": 11,
    "hpe": 6,
    "hpo": 11,
    "hpr": 2,
    "hpu": 5,
    "hra": 4,
    "hsc": 6,
    "hse": 11,
    "hsh": 5,
    "hsw": 4,
    "htu": 4,
    "htz": 1,
    "hva": 5,
    "hve": 13,
    "hwi": 30,
    "hyo": 2,
    "icb": 2,
    "ida": 5,
    "ihb": 1,
    "imp": 2,
    "inv": 2,
    "ipc": 5,
    "ipe": 5,
    "iph": 1,
    "ipj": 1,
    "ipm": 2,
    "ipp": 7,
    "irt": 1,
    "ish": 37,
    "isv": 1,
    "iwi": 18,
    "ked": 34,
    "kef": 4,
    "kep": 2,
    "kes": 21,
    "kew": 5,
    "kgr": 1,
    "kin": 9,
    "kmi": 2,
    "kpe": 5,
    "kst": 7,
    "kwh": 4,
    "kwi": 10,
    "laa": 2,
    "laz": 2,
    "ldg": 9,
    "lee": 9,
    "lel": 5,
    "leo": 2,
    "lev": 5,
    "ley": 6,
    "lkr": 1,
    "lls": 7,
    "lnw": 2,
    "lof": 1,
    "lpe": 7,
    "lsi": 2,
    "lso": 6,
    "lsw": 1,
    "lue": 4,
    "lve": 1,
    "lwi": 14,
    "mal": 13,
    "mbs": 3,
    "mch": 3,
    "mcr": 2,
    "meg": 1,
    "mep": 4,
    "mew": 2,
    "mki": 2,
    "mno": 2,
    "mok": 6,
    "mpk": 7,
    "mps": 1,
    "mro": 2,
    "mwi": 12,
    "naw": 6,
    "ndv": 6,
    "ndy": 3,
    "new": 10,
    "nfl": 2,
    "nga": 2,
    "ngf": 1,
    "ngä": 1,
    "nha": 1,
    "nid": 5,
    "nio": 16,
    "niw": 4,
    "nle": 7,
    "nti": 8,
    "nts": 1,
    "ntw": 1,
    "nut": 46,
    "nve": 4,
    "nwi": 24,
    "oal": 4,
    "obu": 2,
    "oco": 54,
    "oes": 24,
    "ofi": 3,
    "ofk": 1,
    "ofu": 11,
    "ogu": 32,
    "ois": 2,
    "okm": 1,
    "okw": 2,
    "ome": 2,
    "omo": 4,
    "omr": 2,
    "onl": 5,
    "onw": 6,
    "oom": 10,
    "oor": 1,
    "ope": 2,
    "opp": 7,
    "otc": 12,
    "otg": 7,
    "oth": 20,
    "our": 13,
    "ove": 6,
    "owi": 8,
    "oyo": 4,
    "pat": 10,
    "pbe": 7,
    "pbu": 5,
    "pch": 4,
    "pcr": 5,
    "pea": 34,
    "pep": 12,
    "pge": 4,
    "phi": 3,
    "phl": 1,
    "pja": 1,
    "pka": 2,
    "pki": 8,
    "pla": 27,
    "ple": 27,
    "pop": 6,
    "ppl": 27,
    "ppy": 6,
    "pra": 2,
    "psa": 51,
    "puf": 2,
    "pum": 9,
    "pur": 2,
    "pyc": 2,
    "pyr": 1,
    "rai": 3,
    "rco": 1,
    "rdn": 1,
    "rdp": 1,
    "rds": 2,
    "red": 7,
    "ret": 1,
    "rew": 1,
    "rex": 1,
    "rim": 2,
    "rip": 14,
    "rks": 5,
    "rkw": 5,
    "rlh": 2,
    "rni": 20,
    "roo": 10,
    "row": 2,
    "rpe": 1,
    "rro": 25,
    "rsl": 6,
    "rsm": 1,
    "rsn": 5,
    "rss": 1,
    "rsv": 1,
    "rtc": 3,
    "ruf": 1,
    "rug": 9,
    "rui": 20,
    "ruk": 1,
    "rum": 2,
    "rwi": 7,
    "ryb": 3,
    "ryc": 22,
    "ryp": 7,
    "ryw": 13,
    "ryy": 11,
    "sed": 13,
    "sew": 5,
    "sgr": 2,
    "sha": 4,
    "she": 16,
    "shr": 12,
    "shs": 6,
    "ske": 4,
    "sle": 8,
    "smo": 6,
    "smu": 1,
    "sni": 5,
    "spb": 7,
    "ssr": 5,
    "stw": 6,
    "sty": 4,
    "sug": 2,
    "sve": 3,
    "swe": 20,
    "swi": 37,
    "tac": 2,
    "tao": 6,
    "taw": 19,
    "tce": 1,
    "tcr": 11,
    "tdu": 2,
    "teb": 10,
    "tec": 5,
    "ted": 7,
    "teo": 5,
    "tgi": 7,
    "thb": 43,
    "thc": 44,
    "the": 11,
    "thf": 6,
    "thg": 29,
    "thh": 14,
    "thl": 14,
    "thp": 35,
    "tht": 23,
    "thv": 18,
    "thw": 22,
    "tie": 10,
    "tih": 2,
    "til": 7,
    "toc": 33,
    "toe": 25,
    "too": 1,
    "tos": 28,
    "tow": 4,
    "try": 3,
    "tsg": 1,
    "tso": 13,
    "tuf": 4,
    "twi": 20,
    "tyl": 3,
    "tza": 1,
    "uck": 5,
    "ueb": 2,
    "uff": 8,
    "ugo": 2,
    "ugu": 7,
    "uke": 1,
    "umb": 3,
    "umk": 2,
    "umo": 1,
    "unc": 4,
    "unt": 1,
    "upb": 6,
    "upe": 2,
    "upg": 5,
    "uph": 3,
    "upi": 6,
    "upk": 3,
    "upl": 4,
    "upr": 1,
    "ups": 54,
    "urd": 9,
    "urv": 1,
    "urw": 1,
    "ush": 10,
    "usw": 3,
    "utb": 1,
    "utc": 16,
    "utp": 6,
    "utw": 3,
    "uun": 2,
    "uwi": 1,
    "veb": 1,
    "ver": 6,
    "vet": 1,
    "wbe": 16,
    "wee": 20,
    "whe": 4,
    "whi": 6,
    "wis": 6,
    "wlw": 5,
    "wok": 4,
    "wso": 5,
    "wti": 2,
    "yap": 4,
    "yaw": 3,
    "ybe": 4,
    "yca": 11,
    "yco": 3,
    "ycu": 2,
    "ygi": 1,
    "yle": 5,
    "ymu": 2,
    "yog": 32,
    "ypi": 2,
    "ypo": 5,
    "ypu": 1,
    "ysa": 8,
    "ysc": 6,
    "ysk": 3,
    "yso": 2,
    "ywi": 13,
    "yyo": 11,
    "zat": 1,
    "zed": 2,
    "zen": 4
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
    "an",
    "to",
    "at",
    "by",
    "for"
  ]
};

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

function splitLanguage(text, options = {}) {
    if (!text) return { de: '', en: '', raw: '', confidence: 0, subScores: {anchor:0,purity:0,course:0,coverage:0}, label: 'fallback', notes: [] };

    const { text: normText, notes } = normalize(text);

    const tplResult = matchTemplate(normText);
    if (tplResult) {
        tplResult.raw = '• ' + text;
        tplResult.notes = notes;
        return tplResult;
    }

    const langModel = (options && options.langModel) ? options.langModel : createLangModel(LANG_MODEL_SEED);

    let courses = segment(normText);
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
var src_state = __webpack_require__(901);
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
    favicon.href = '{{FAVICON_DATA_URI}}';
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
                    <img src="{{FAVICON_DATA_URI}}" alt="Logo" class="logo-img" style="height: 2em; width: 2em; object-fit: contain;">
                    <div class="header-left">
                        <h1>Kantinen Übersicht <small class="version-tag" style="font-size: 0.6em; opacity: 0.7; font-weight: 400; cursor: pointer;" title="Klick für Versionsmenü">{{VERSION}}<span style="font-size:0.55em;opacity:0.6;margin-left:4px">{{COMMIT_HASH}}</span></small></h1>
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
                            <button class="lang-btn${src_state/* langMode */.Kl === 'de' ? ' active' : ''}" data-lang="de">🇦🇹 DE</button>
                            <button class="lang-btn${src_state/* langMode */.Kl === 'en' ? ' active' : ''}" data-lang="en">🇬🇧 EN</button>
                            <button class="lang-btn${src_state/* langMode */.Kl === 'all' ? ' active' : ''}" data-lang="all">🌐 ALL</button>
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
                        <strong>Aktuell:</strong> <span id="version-current">{{VERSION}} <span style="font-size:0.8em;opacity:0.6">{{COMMIT_HASH}}</span></span>
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
    document.body.innerHTML = htmlContent;

    // Initialize PayPal Donation Button
    if (!document.getElementById('paypal-sdk')) {
        const script = document.createElement('script');
        script.id = 'paypal-sdk';
        script.src = "https://www.paypalobjects.com/donate/sdk/donate-sdk.js";
        script.charset = "UTF-8";
        script.onload = () => {
            if (window.PayPal && PayPal.Donation) {
                PayPal.Donation.Button({
                    env: 'production',
                    hosted_button_id: 'R5G9H9TFGQNUY',
                    image: {
                        src: 'https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif',
                        alt: 'Donate with PayPal button',
                        title: 'PayPal - The safer, easier way to pay online!',
                    }
                }).render('#donate-button');
            }
        };
        document.body.appendChild(script);
    }

    stats_tracker/* tracker */.F.increment('browser_load');
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
// EXTERNAL MODULE: ./src/utils.js + 10 modules
var utils = __webpack_require__(160);
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
    if (alarmBell && src_state/* userFlags */.BY.size === 0) {
        alarmBell.title = (0,i18n.t)('alarmTooltipNone');
    }

    // Re-render dynamic parts that may use t()
    (0,ui_helpers/* renderVisibleWeeks */.OR)();
    (0,ui_helpers/* updateNextWeekBadge */.gJ)();
    (0,ui_helpers/* updateAlarmBell */.Mb)();
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
        if (btnLangToggle) btnLangToggle.textContent = src_state/* langMode */.Kl.toUpperCase();
    }

    if (btnLangToggle) {
        btnLangToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const modes = ['de', 'en', 'all'];
            const nextIndex = (modes.indexOf(src_state/* langMode */.Kl) + 1) % modes.length;
            const next = modes[nextIndex];
            (0,src_state/* setLangMode */.UD)(next);
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
        if (!src_state/* authToken */.gX) {
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
        if (src_state/* displayMode */.sw !== 'this-week') {
            (0,src_state/* setDisplayMode */.qo)('this-week');
            btnThisWeek.classList.add('active');
            btnNextWeek.classList.remove('active');
            (0,ui_helpers/* renderVisibleWeeks */.OR)();
            stats_tracker/* tracker */.F.increment('week_nav');
        }
    });

    btnNextWeek.addEventListener('click', () => {
        btnNextWeek.classList.remove('new-week-available');
        if (src_state/* displayMode */.sw !== 'next-week') {
            (0,src_state/* setDisplayMode */.qo)('next-week');
            btnNextWeek.classList.add('active');
            btnThisWeek.classList.remove('active');
            (0,ui_helpers/* renderVisibleWeeks */.OR)();
            stats_tracker/* tracker */.F.increment('week_nav');
        }
    });

    btnRefresh.addEventListener('click', () => {
        if (!src_state/* authToken */.gX) {
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
                (0,src_state/* setAuthToken */.O5)(data.key);
                (0,src_state/* setCurrentUser */.lt)(employeeId);
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

        (0,src_state/* setAuthToken */.O5)(null);
        (0,src_state/* setCurrentUser */.lt)(null);
        (0,src_state/* setOrderMap */.di)(new Map());
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
const STORAGE_KEY_ANON = '_kstats_anon_id';

function generateUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        try { return crypto.randomUUID(); } catch (_) {}
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        try {
            const arr = new Uint8Array(16);
            crypto.getRandomValues(arr);
            arr[6] = (arr[6] & 0x0f) | 0x40;
            arr[8] = (arr[8] & 0x3f) | 0x80;
            const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
            return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
        } catch (_) {}
    }
    // Math.random()-based fallback — works in every context
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

/**
 * Stable non-crypto hash (DJB2) — fallback when crypto.subtle is unavailable.
 * Sufficient for deduplication purposes; not cryptographically secure.
 */
function simpleHash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

async function digest(str) {
    try {
        const encoder = new TextEncoder();
        const buffer = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (_) {
        // crypto.subtle unavailable (e.g. restricted bookmarklet context) — use DJB2
        return simpleHash(str);
    }
}

/**
 * Stable user hash – does NOT change over time.
 * Used to count both daily and total unique users.
 * Based solely on the user's identity (username if logged in, or persistent random UUID).
 */
async function computeUserHash(authToken, currentUser, GIST_SALT) {
    let identity;
    if (authToken && currentUser) {
        identity = currentUser;
    } else {
        let anonUUID = localStorage.getItem(STORAGE_KEY_ANON);
        if (!anonUUID) {
            anonUUID = generateUUID();
            localStorage.setItem(STORAGE_KEY_ANON, anonUUID);
        }
        identity = anonUUID;
    }
    return digest(identity + (GIST_SALT || ''));
}

;// ./src/index.js
window.__kantine_load_start = Date.now();











if (!window.__KANTINE_LOADED) {
    if (window.location.protocol === 'blob:' || (window.location.hostname !== 'web.bessa.app' && window.location.hostname !== '')) {
        window.location.href = 'https://web.bessa.app/knapp-kantine';
        // We throw an error to halt further execution of the script
        throw new Error('Redirecting to the correct domain...');
    }

    window.__KANTINE_LOADED = true;

    // Stats: baseline metrics
    stats_tracker/* tracker */.F.increment('starts');
    stats_tracker/* tracker */.F.set('version', '{{VERSION}}');
    stats_tracker/* tracker */.F.set('hour', new Date().getHours());
    stats_tracker/* tracker */.F.set('day', new Date().getDay());
    stats_tracker/* tracker */.F.set('mobile', window.innerWidth < 768);
    stats_tracker/* tracker */.F.set('lang', src_state/* langMode */.Kl);
    stats_tracker/* tracker */.F.set('logged_in', !!src_state/* authToken */.gX);
    
    // Initialize stable user hash (persistent, computed once).
    // Must complete before flushToGist so unique-user counting includes the hash.
    const state = stats_tracker/* tracker */.F.load();
    (async () => {
        if (!state.user_hash) {
            try {
                state.user_hash = await computeUserHash(src_state/* authToken */.gX, null, constants/* GIST_SALT */.d7);
                stats_tracker/* tracker */.F.persist();
            } catch (e) {
                console.warn('[Stats] Failed to compute user hash:', e.message);
            }
        }
        const pending = stats_tracker/* tracker */.F.getPendingFlush();
        if (pending) {
            await stats_tracker/* tracker */.F.flushToGist(pending.date, pending.daily, state.user_hash || pending.user_hash)
                .catch(e => console.warn('Flush failed:', e));
        }
    })();

    injectUI();
    bindEvents();
    (0,actions/* updateAuthUI */.i_)();
    (0,actions/* cleanupExpiredFlags */.H)();

    const hadCache = (0,actions/* loadMenuCache */.KG)();
    if (hadCache) {
        document.getElementById('loading').classList.add('hidden');
        stats_tracker/* tracker */.F.set('load_time_ms', Date.now() - window.__kantine_load_start);
        if (!(0,actions/* isCacheFresh */.VL)()) {
            (0,actions/* loadMenuDataFromAPI */.m9)();
        }
    } else {
        (0,actions/* loadMenuDataFromAPI */.m9)();
    }

    if (src_state/* authToken */.gX) {
        (0,actions/* startPolling */.g8)();
    }

    (0,ui_helpers/* checkForUpdates */.Ux)();
    setInterval(ui_helpers/* checkForUpdates */.Ux, 60 * 60 * 1000);
}

window.addEventListener('beforeunload', () => {
    const startMs = stats_tracker/* tracker */.F.load().session?.start_ms;
    if (startMs) {
        stats_tracker/* tracker */.F.set('session_duration_s', Math.round((Date.now() - startMs) / 1000));
    }
});

/******/ })()
;