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
/* unused harmony exports renderHistory, saveFlags, pollFlaggedItems, saveHighlightTags, removeHighlightTag, saveMenuCache, updateLastUpdatedTime */
/* harmony import */ var _state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(901);
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(413);
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(521);
/* harmony import */ var _api_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(672);
/* harmony import */ var _ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(842);
/* harmony import */ var _i18n_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(646);







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
            const cacheMap = new Map(localCache.map(o => [o.id, o]));
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

        const response = await fetch(`${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .API_BASE */ .tE}/user/orders/`, {
            method: 'POST',
            headers: (0,_api_js__WEBPACK_IMPORTED_MODULE_3__/* .apiHeaders */ .H)(_state_js__WEBPACK_IMPORTED_MODULE_0__/* .authToken */ .gX),
            body: JSON.stringify(orderPayload)
        });

        if (response.ok || response.status === 201) {
            showToast(`${(0,_i18n_js__WEBPACK_IMPORTED_MODULE_5__.t)('orderSuccess')}: ${name}`, 'success');
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

function saveFlags() {
    localStorage.setItem('kantine_flags', JSON.stringify([..._state_js__WEBPACK_IMPORTED_MODULE_0__/* .userFlags */ .BY]));
}

async function refreshFlaggedItems() {
    if (_state_js__WEBPACK_IMPORTED_MODULE_0__/* .userFlags */ .BY.size === 0) return;
    const token = _state_js__WEBPACK_IMPORTED_MODULE_0__/* .authToken */ .gX || _constants_js__WEBPACK_IMPORTED_MODULE_2__/* .GUEST_TOKEN */ .f9;

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
        for (const dateStr of datesToFetch) {
            try {
                const resp = await fetch(`${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .API_BASE */ .tE}/venues/${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .VENUE_ID */ .eW}/menu/${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .MENU_ID */ .YU}/${dateStr}/`, {
                    headers: (0,_api_js__WEBPACK_IMPORTED_MODULE_3__/* .apiHeaders */ .H)(token)
                });
                if (!resp.ok) continue;
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
        }

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
    (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .updateAlarmBell */ .Mb)();
    (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .renderVisibleWeeks */ .OR)();

    if (flagAdded) {
        refreshFlaggedItems();
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

    for (const flagId of _state_js__WEBPACK_IMPORTED_MODULE_0__/* .userFlags */ .BY) {
        const [date, articleIdStr] = flagId.split('_');
        const articleId = parseInt(articleIdStr);

        try {
            const response = await fetch(`${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .API_BASE */ .tE}/venues/${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .VENUE_ID */ .eW}/menu/${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .MENU_ID */ .YU}/${date}/`, {
                headers: (0,_api_js__WEBPACK_IMPORTED_MODULE_3__/* .apiHeaders */ .H)(_state_js__WEBPACK_IMPORTED_MODULE_0__/* .authToken */ .gX)
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
    localStorage.setItem('kantine_flagged_items_last_checked', new Date().toISOString());
    (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .updateAlarmBell */ .Mb)();
}

function saveHighlightTags() {
    localStorage.setItem('kantine_highlightTags', JSON.stringify(_state_js__WEBPACK_IMPORTED_MODULE_0__/* .highlightTags */ .yz));
    (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .renderVisibleWeeks */ .OR)();
    (0,_ui_helpers_js__WEBPACK_IMPORTED_MODULE_4__/* .updateNextWeekBadge */ .gJ)();
}

function addHighlightTag(tag) {
    tag = tag.trim().toLowerCase();
    if (tag && !_state_js__WEBPACK_IMPORTED_MODULE_0__/* .highlightTags */ .yz.includes(tag)) {
        const newTags = [..._state_js__WEBPACK_IMPORTED_MODULE_0__/* .highlightTags */ .yz, tag];
        (0,_state_js__WEBPACK_IMPORTED_MODULE_0__/* .setHighlightTags */ .iw)(newTags);
        saveHighlightTags();
        return true;
    }
    return false;
}

function removeHighlightTag(tag) {
    const newTags = _state_js__WEBPACK_IMPORTED_MODULE_0__/* .highlightTags */ .yz.filter(t => t !== tag);
    (0,_state_js__WEBPACK_IMPORTED_MODULE_0__/* .setHighlightTags */ .iw)(newTags);
    saveHighlightTags();
}

function renderTagsList() {
    const list = document.getElementById('tags-list');
    list.innerHTML = '';
    _state_js__WEBPACK_IMPORTED_MODULE_0__/* .highlightTags */ .yz.forEach(tag => {
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

            try {
                const uniqueMenus = new Set();
                _state_js__WEBPACK_IMPORTED_MODULE_0__/* .allWeeks */ .p_.forEach(w => {
                    (w.days || []).forEach(d => {
                        (d.items || []).forEach(item => {
                            let text = (item.description || '').replace(/\s+/g, ' ').trim();
                            if (text && text.includes(' / ')) {
                                uniqueMenus.add(text);
                            }
                        });
                    });
                });
            } catch (e) { }

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

    const token = _state_js__WEBPACK_IMPORTED_MODULE_0__/* .authToken */ .gX || _constants_js__WEBPACK_IMPORTED_MODULE_2__/* .GUEST_TOKEN */ .f9;

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
                                dayItems = dayItems.concat(group.items);
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
                `Die Menüdaten konnten nicht geladen werden. Möglicherweise besteht keine Verbindung zur API oder zur Bessa-Webseite.<br><br><small style="color:var(--text-secondary)">${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(error.message)}</small>`,
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
 * @param {string|null} token - Auth token; falls back to GUEST_TOKEN if absent.
 * @returns {Object} HTTP headers for fetch()
 */
function apiHeaders(token) {
    return {
        'Authorization': `Token ${token || _constants_js__WEBPACK_IMPORTED_MODULE_0__/* .GUEST_TOKEN */ .f9}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Client-Version': _constants_js__WEBPACK_IMPORTED_MODULE_0__/* .CLIENT_VERSION */ .fZ
    };
}

/**
 * Returns request headers for the GitHub REST API v3.
 * Used for version checks and release listing.
 * @returns {Object} HTTP headers for fetch()
 */
function githubHeaders() {
    return { 'Accept': 'application/vnd.github.v3+json' };
}


/***/ },

/***/ 521
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   LS: () => (/* binding */ LS),
/* harmony export */   YU: () => (/* binding */ MENU_ID),
/* harmony export */   d_: () => (/* binding */ INSTALLER_BASE),
/* harmony export */   eW: () => (/* binding */ VENUE_ID),
/* harmony export */   f9: () => (/* binding */ GUEST_TOKEN),
/* harmony export */   fZ: () => (/* binding */ CLIENT_VERSION),
/* harmony export */   fv: () => (/* binding */ POLL_INTERVAL_MS),
/* harmony export */   pe: () => (/* binding */ GITHUB_API),
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

/** Guest token for unauthenticated API calls (e.g. browsing the menu). */
const GUEST_TOKEN = 'c3418725e95a9f90e3645cbc846b4d67c7c66131';

/** The client version injected into every API request header. */
const CLIENT_VERSION = 'v1.6.19';

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

/** Base URL for htmlpreview-hosted installer pages. */
const INSTALLER_BASE = `https://htmlpreview.github.io/?https://github.com/${GITHUB_REPO}/blob`;

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
    DEV_MODE:                'kantine_dev_mode',
};


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
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(413);
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

/***/ 842
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Gk: () => (/* binding */ openVersionMenu),
/* harmony export */   Mb: () => (/* binding */ updateAlarmBell),
/* harmony export */   OR: () => (/* binding */ renderVisibleWeeks),
/* harmony export */   Ux: () => (/* binding */ checkForUpdates),
/* harmony export */   gJ: () => (/* binding */ updateNextWeekBadge),
/* harmony export */   showErrorModal: () => (/* binding */ showErrorModal)
/* harmony export */ });
/* unused harmony exports syncMenuItemHeights, createDayCard, fetchVersions, updateCountdown, removeCountdown */
/* harmony import */ var _state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(901);
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(413);
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
    setTimeout(() => syncMenuItemHeights(grid), 0);
}

function syncMenuItemHeights(grid) {
    const cards = grid.querySelectorAll('.menu-card');
    if (cards.length === 0) return;
    let maxItems = 0;
    cards.forEach(card => {
        maxItems = Math.max(maxItems, card.querySelectorAll('.menu-item').length);
    });
    for (let i = 0; i < maxItems; i++) {
        let maxHeight = 0;
        const itemsAtPos = [];
        cards.forEach(card => {
            const items = card.querySelectorAll('.menu-item');
            if (items[i]) {
                items[i].style.height = 'auto';
                maxHeight = Math.max(maxHeight, items[i].offsetHeight);
                itemsAtPos.push(items[i]);
            }
        });
        itemsAtPos.forEach(item => { item.style.height = `${maxHeight}px`; });
    }
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

        itemEl.innerHTML = `
            <div class="item-header">
                <span class="item-name">${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(item.name)}</span>
                <span class="item-price">${item.price.toFixed(2)} €</span>
            </div>
            <div class="item-status-row">
                ${orderedBadge}
                ${cancelButton}
                ${orderButton}
                ${flagButton}
                <div class="badges">${statusBadge}</div>
            </div>
            ${tagsHtml}
            <p class="item-desc">${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .getLocalizedText */ .PC)(item.description))}</p>`;

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

    const resp = await fetch(endpoint, { headers: (0,_api_js__WEBPACK_IMPORTED_MODULE_3__/* .githubHeaders */ .O)() });
    if (!resp.ok) {
        if (resp.status === 403) {
            throw new Error('API Rate Limit erreicht (403). Bitte später erneut versuchen.');
        }
        throw new Error(`GitHub API ${resp.status}`);
    }
    const data = await resp.json();

    return data.map(item => {
        const tag = devMode ? item.name : item.tag_name;
        return {
            tag,
            name: devMode ? tag : (item.name || tag),
            url: `${_constants_js__WEBPACK_IMPORTED_MODULE_2__/* .INSTALLER_BASE */ .d_}/${tag}/dist/install.html`,
            body: item.body || ''
        };
    });
}

async function checkForUpdates() {
    const currentVersion = '{{VERSION}}';
    const devMode = localStorage.getItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.DEV_MODE) === 'true';

    try {
        const versions = await fetchVersions(devMode);
        if (!versions.length) return;

        localStorage.setItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.VERSION_CACHE, JSON.stringify({
            timestamp: Date.now(), devMode, versions
        }));

        const latest = versions[0].tag;

        if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .isNewer */ .U4)(latest, currentVersion)) return;

        const headerTitle = document.querySelector('.header-left h1');
        if (headerTitle && !headerTitle.querySelector('.update-icon')) {
            const icon = document.createElement('a');
            icon.className = 'update-icon';
            icon.href = versions[0].url;
            icon.target = '_blank';
            icon.innerHTML = '🆕';
            icon.title = `Update: ${latest} — Klick zum Installieren`;
            icon.style.cssText = 'margin-left:8px;font-size:1em;text-decoration:none;cursor:pointer;vertical-align:middle;';
            headerTitle.appendChild(icon);
        }
    } catch (e) {
        console.warn('[Kantine] Version check failed:', e);
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

                let action = '';
                if (!isCurrent) {
                    action = `<a href="${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(v.url)}" target="_blank" class="install-link" title="${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(v.tag)} installieren">Installieren</a>`;
                }

                li.innerHTML = `
                    <div class="version-info">
                        <strong>${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(v.tag)}</strong>
                        ${badge}
                    </div>
                    ${action}
                `;
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

            const liveVersionsStr = JSON.stringify(liveVersions);
            const cachedVersionsStr = cached ? JSON.stringify(cached.versions) : '';

            if (liveVersionsStr !== cachedVersionsStr) {
                localStorage.setItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.VERSION_CACHE, JSON.stringify({
                    timestamp: Date.now(), devMode: dm, versions: liveVersions
                }));
                renderVersionsList(liveVersions);
            }

        } catch (e) {
            container.innerHTML = `<p style="color:#e94560;">Fehler: ${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(e.message)}</p>`;
        }
    }

    loadVersions(false);

    devToggle.onchange = () => {
        localStorage.setItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.DEV_MODE, devToggle.checked);
        localStorage.removeItem(_constants_js__WEBPACK_IMPORTED_MODULE_2__.LS.VERSION_CACHE);
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

function showErrorModal(title, htmlContent, btnText, url) {
    const modalId = 'error-modal';
    let modal = document.getElementById(modalId);
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal hidden';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 style="color: var(--error-color); display: flex; align-items: center; gap: 10px;">
                    <span class="material-icons-round">signal_wifi_off</span>
                    ${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(title)}
                </h2>
            </div>
            <div style="padding: 20px;">
                <p style="margin-bottom: 15px; color: var(--text-primary);">${htmlContent}</p>
                <div style="margin-top: 20px; display: flex; justify-content: center;">
                    <button id="btn-error-redirect" style="
                        background-color: var(--accent-color);
                        color: white;
                        padding: 12px 24px;
                        border-radius: 8px;
                        border: none;
                        font-weight: 600;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        width: 100%;
                        justify-content: center;
                        transition: transform 0.1s;
                    ">
                        ${(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__/* .escapeHtml */ .ZD)(btnText)}
                        <span class="material-icons-round">open_in_new</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('btn-error-redirect').addEventListener('click', () => {
        window.location.href = url;
    });

    requestAnimationFrame(() => {
        modal.classList.remove('hidden');
    });
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

/***/ 413
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Ao: () => (/* binding */ getWeekYear),
/* harmony export */   FS: () => (/* binding */ translateDay),
/* harmony export */   PC: () => (/* binding */ getLocalizedText),
/* harmony export */   U4: () => (/* binding */ isNewer),
/* harmony export */   ZD: () => (/* binding */ escapeHtml),
/* harmony export */   gs: () => (/* binding */ getRelativeTime),
/* harmony export */   sn: () => (/* binding */ getISOWeek)
/* harmony export */ });
/* unused harmony export splitLanguage */
/* harmony import */ var _state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(901);


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
    if (_state_js__WEBPACK_IMPORTED_MODULE_0__/* .langMode */ .Kl === 'en') return englishDay;
    const map = { Monday: 'Montag', Tuesday: 'Dienstag', Wednesday: 'Mittwoch', Thursday: 'Donnerstag', Friday: 'Freitag', Saturday: 'Samstag', Sunday: 'Sonntag' };
    return map[englishDay] || englishDay;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function isNewer(remote, local) {
    if (!remote || !local) return false;
    const r = remote.replace(/^v/, '').split('.').map(Number);
    const l = local.replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < Math.max(r.length, l.length); i++) {
        if ((r[i] || 0) > (l[i] || 0)) return true;
        if ((r[i] || 0) < (l[i] || 0)) return false;
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
const DE_STEMS = [
    'apfel', 'achtung', 'aubergine', 'auflauf', 'beere', 'blumenkohl', 'bohne', 'braten', 'brokkoli', 'brot', 'brust',
    'brötchen', 'butter', 'chili', 'dessert', 'dip', 'eier', 'eintopf', 'eis', 'erbse', 'erdbeer',
    'essig', 'filet', 'fisch', 'fisole', 'fleckerl', 'fleisch', 'flügel', 'frucht', 'für', 'gebraten',
    'gemüse', 'gewürz', 'gratin', 'grieß', 'gulasch', 'gurke', 'himbeer', 'honig', 'huhn', 'hähnchen',
    'jambalaya', 'joghurt', 'karotte', 'kartoffel', 'keule', 'kirsch', 'knacker', 'knoblauch', 'knödel', 'kompott',
    'kraut', 'kräuter', 'kuchen', 'käse', 'kürbis', 'lauch', 'mandel', 'milch', 'mild', 'mit',
    'mohn', 'most', 'möhre', 'natur', 'nockerl', 'nudel', 'nuss', 'nuß', 'obst', 'oder',
    'olive', 'paprika', 'pfanne', 'pfannkuchen', 'pfeffer', 'pikant', 'pilz', 'plunder', 'püree', 'ragout',
    'rahm', 'reis', 'rind', 'sahne', 'salami', 'salat', 'salz', 'sauer', 'scharf', 'schinken',
    'schnitte', 'schnitzel', 'schoko', 'schupf', 'schwein', 'sellerie', 'senf', 'sosse', 'soße', 'spargel',
    'spätzle', 'speck', 'spieß', 'spinat', 'steak', 'suppe', 'süß', 'tofu', 'tomate', 'topfen',
    'torte', 'trüffel', 'und', 'vanille', 'vogerl', 'vom', 'wien', 'wurst', 'zucchini', 'zum',
    'zur', 'zwiebel', 'öl'
];

const EN_STEMS = [
    'almond', 'and', 'apple', 'asparagus', 'bacon', 'baked', 'ball', 'bean', 'beef', 'berry',
    'bread', 'breast', 'broccoli', 'bun', 'butter', 'cabbage', 'cake', 'caper', 'carrot', 'casserole',
    'cauliflower', 'celery', 'cheese', 'cherry', 'chicken', 'chili', 'choco', 'chocolate', 'cider', 'cilantro',
    'coffee', 'compote', 'cream', 'cucumber', 'curd', 'danish', 'dessert', 'dip', 'dumpling', 'egg',
    'eggplant', 'filet', 'fish', 'for', 'fried', 'from', 'fruit', 'garlic', 'goulash', 'gratin',
    'ham', 'herb', 'honey', 'hot', 'ice', 'jambalaya', 'leek', 'leg', 'mash', 'meat',
    'mexican', 'mild', 'milk', 'mint', 'mushroom', 'mustard', 'noodle', 'nut', 'oat', 'oil',
    'olive', 'onion', 'or', 'oven', 'pan', 'pancake', 'pea', 'pepper', 'plain', 'plate',
    'poppy', 'pork', 'potato', 'pumpkin', 'radish', 'ragout', 'raspberry', 'rice', 'roast', 'roll',
    'salad', 'salami', 'salt', 'sauce', 'sausage', 'shrimp', 'skewer', 'slice', 'soup', 'sour',
    'spice', 'spicy', 'spinach', 'steak', 'stew', 'strawberr', 'strawberry', 'strudel', 'sweet', 'tart',
    'thyme', 'to', 'tofu', 'tomat', 'tomato', 'truffle', 'trukey', 'turkey', 'vanilla', 'vegan',
    'vegetable', 'vinegar', 'wedge', 'wing', 'with', 'wok', 'yogurt', 'zucchini'
];

function splitLanguage(text) {
    if (!text) return { de: '', en: '', raw: '' };

    const raw = text;
    let formattedRaw = text.replace(/(?:\(|(?:\/|\s|^))([A-Z,]+)\)\s*(?=\S)(?!\s*\/)/g, '($1)\n• ');
    if (!formattedRaw.startsWith('• ')) {
        formattedRaw = '• ' + formattedRaw;
    }

    function scoreBlock(wordArray) {
        let de = 0, en = 0;
        wordArray.forEach(word => {
            const w = word.toLowerCase().replace(/[^a-zäöüß]/g, '');
            if (w) {
                let bestDeMatch = 0;
                let bestEnMatch = 0;
                if (DE_STEMS.includes(w)) bestDeMatch = w.length;
                else DE_STEMS.forEach(s => { if (w.includes(s) && s.length > bestDeMatch) bestDeMatch = s.length; });

                if (EN_STEMS.includes(w)) bestEnMatch = w.length;
                else EN_STEMS.forEach(s => { if (w.includes(s) && s.length > bestEnMatch) bestEnMatch = s.length; });

                if (bestDeMatch > 0) de += (bestDeMatch / w.length);
                if (bestEnMatch > 0) en += (bestEnMatch / w.length);

                if (/^[A-ZÄÖÜ]/.test(word)) {
                    de += 0.5;
                }
            }
        });
        return { de, en };
    }

    function heuristicSplitEnDe(fragment) {
        const words = fragment.trim().split(/\s+/);
        if (words.length < 2) return { enPart: fragment, nextDe: '' };

        let bestK = -1;
        let maxScore = -9999;

        for (let k = 1; k < words.length; k++) {
            const left = words.slice(0, k);
            const right = words.slice(k);

            const leftScore = scoreBlock(left);
            const rightScore = scoreBlock(right);

            const rightFirstWord = right[0];
            let capitalBonus = 0;
            if (/^[A-ZÄÖÜ]/.test(rightFirstWord)) {
                capitalBonus = 1.0;
            }

            const score = (leftScore.en - leftScore.de) + (rightScore.de - rightScore.en) + capitalBonus;

            const leftLooksEnglish = (leftScore.en > leftScore.de) || (leftScore.en > 0);
            const rightLooksGerman = (rightScore.de + capitalBonus) > rightScore.en;

            if (leftLooksEnglish && rightLooksGerman && score > maxScore) {
                maxScore = score;
                bestK = k;
            }
        }

        if (bestK !== -1) {
            return {
                enPart: words.slice(0, bestK).join(' '),
                nextDe: words.slice(bestK).join(' ')
            };
        }
        return { enPart: fragment, nextDe: '' };
    }

    const allergenRegex = /(.*?)(?:\(|(?:\/|\s|^))([A-Z,]+)\)\s*(?!\s*[/])/g;
    let match;
    const rawCourses = [];
    let lastScanIndex = 0;

    while ((match = allergenRegex.exec(text)) !== null) {
        if (match.index > lastScanIndex) {
            rawCourses.push(text.substring(lastScanIndex, match.index).trim());
        }
        rawCourses.push(match[0].trim());
        lastScanIndex = allergenRegex.lastIndex;
    }
    if (lastScanIndex < text.length) {
        rawCourses.push(text.substring(lastScanIndex).trim());
    }
    if (rawCourses.length === 0 && text.trim() !== '') {
        rawCourses.push(text.trim());
    }

    const deParts = [];
    const enParts = [];

    for (let course of rawCourses) {
        let courseMatch = course.match(/(.*?)(?:\(|(?:\/|\s|^))([A-Z,]+)\)\s*$/);
        let courseText = course;
        let allergenTxt = "";
        let allergenCode = "";

        if (courseMatch) {
            courseText = courseMatch[1].trim();
            allergenCode = courseMatch[2];
            allergenTxt = ` (${allergenCode})`;
        }

        const slashParts = courseText.split(/\s*\/\s*(?![A-Z,]+$)/);

        if (slashParts.length >= 2) {
            const deCandidate = slashParts[0].trim();
            let enCandidate = slashParts.slice(1).join(' / ').trim();

            const nestedSplit = heuristicSplitEnDe(enCandidate);
            if (nestedSplit.nextDe) {
                deParts.push(deCandidate + allergenTxt);
                enParts.push(nestedSplit.enPart + allergenTxt);

                const nestedDe = nestedSplit.nextDe + allergenTxt;
                deParts.push(nestedDe);
                enParts.push(nestedDe);
            } else {
                const enFinal = enCandidate + allergenTxt;
                const deFinal = deCandidate.includes(allergenTxt.trim()) ? deCandidate : (deCandidate + allergenTxt);

                deParts.push(deFinal);
                enParts.push(enFinal);
            }
        } else {
            const heuristicSplit = heuristicSplitEnDe(courseText);
            if (heuristicSplit.nextDe) {
                enParts.push(heuristicSplit.enPart + allergenTxt);
                deParts.push(heuristicSplit.nextDe + allergenTxt);
            } else {
                deParts.push(courseText + allergenTxt);
                enParts.push(courseText + allergenTxt);
            }
        }
    }

    let deJoined = deParts.join('\n• ');
    if (deParts.length > 0 && !deJoined.startsWith('• ')) deJoined = '• ' + deJoined;

    let enJoined = enParts.join('\n• ');
    if (enParts.length > 0 && !enJoined.startsWith('• ')) enJoined = '• ' + enJoined;

    return {
        de: deJoined,
        en: enJoined,
        raw: formattedRaw
    };
}

function getLocalizedText(text) {
    if (_state_js__WEBPACK_IMPORTED_MODULE_0__/* .langMode */ .Kl === 'all') return text || '';
    const split = splitLanguage(text);
    if (_state_js__WEBPACK_IMPORTED_MODULE_0__/* .langMode */ .Kl === 'en') return split.en || split.raw;
    return split.de || split.raw;
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
                        <h1>Kantinen Übersicht <small class="version-tag" style="font-size: 0.6em; opacity: 0.7; font-weight: 400; cursor: pointer;" title="Klick für Versionsmenü">{{VERSION}}</small></h1>
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
                        <strong>Aktuell:</strong> <span id="version-current">{{VERSION}}</span>
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
            <p>Jetzt Bessa Einfach! &bull; Knapp-Kantine Wrapper &bull; <span id="current-year">${new Date().getFullYear()}</span> by Kaufi 😃👍 mit Hilfe von KI 🤖</p>
        </footer>
    </div>`;
    document.body.innerHTML = htmlContent;
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
    if (btnLangToggle && langDropdown) {
        btnLangToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            langDropdown.classList.toggle('hidden');
        });
    }

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            (0,state/* setLangMode */.UD)(btn.dataset.lang);
            localStorage.setItem(constants.LS.LANG, btn.dataset.lang);
            document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (langDropdown) langDropdown.classList.add('hidden');
            updateUILanguage();
        });
    });

    if (btnHighlights) {
        btnHighlights.addEventListener('click', () => {
            (0,actions/* renderTagsList */.Y1)();
            highlightsModal.classList.remove('hidden');
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
    });

    btnHistoryClose.addEventListener('click', () => {
        historyModal.classList.add('hidden');
    });

    window.addEventListener('click', (e) => {
        if (e.target === historyModal) historyModal.classList.add('hidden');
        if (e.target === highlightsModal) highlightsModal.classList.add('hidden');
        if (langDropdown && !langDropdown.classList.contains('hidden') && !e.target.closest('#lang-toggle')) {
            langDropdown.classList.add('hidden');
        }
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
    });

    btnThisWeek.addEventListener('click', () => {
        if (state/* displayMode */.sw !== 'this-week') {
            (0,state/* setDisplayMode */.qo)('this-week');
            btnThisWeek.classList.add('active');
            btnNextWeek.classList.remove('active');
            (0,ui_helpers/* renderVisibleWeeks */.OR)();
        }
    });

    btnNextWeek.addEventListener('click', () => {
        btnNextWeek.classList.remove('new-week-available');
        if (state/* displayMode */.sw !== 'next-week') {
            (0,state/* setDisplayMode */.qo)('next-week');
            btnNextWeek.classList.add('active');
            btnThisWeek.classList.remove('active');
            (0,ui_helpers/* renderVisibleWeeks */.OR)();
        }
    });

    btnRefresh.addEventListener('click', () => {
        if (!state/* authToken */.gX) {
            loginModal.classList.remove('hidden');
            return;
        }
        (0,actions/* loadMenuDataFromAPI */.m9)();
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
                headers: (0,api/* apiHeaders */.H)(constants/* GUEST_TOKEN */.f9),
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
        localStorage.removeItem(constants.LS.AUTH_TOKEN);
        localStorage.removeItem(constants.LS.CURRENT_USER);
        localStorage.removeItem(constants.LS.FIRST_NAME);
        localStorage.removeItem(constants.LS.LAST_NAME);
        (0,state/* setAuthToken */.O5)(null);
        (0,state/* setCurrentUser */.lt)(null);
        (0,state/* setOrderMap */.di)(new Map());
        (0,actions/* stopPolling */.Et)();
        (0,actions/* updateAuthUI */.i_)();
        (0,ui_helpers/* renderVisibleWeeks */.OR)();
    });
}

;// ./src/index.js






if (!window.__KANTINE_LOADED) {
    window.__KANTINE_LOADED = true;

    injectUI();
    bindEvents();
    (0,actions/* updateAuthUI */.i_)();
    (0,actions/* cleanupExpiredFlags */.H)();

    const hadCache = (0,actions/* loadMenuCache */.KG)();
    if (hadCache) {
        document.getElementById('loading').classList.add('hidden');
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
}

/******/ })()
;