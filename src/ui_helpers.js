import { authToken, currentUser, orderMap, userFlags, pollIntervalId, highlightTags, allWeeks, currentWeekNumber, currentYear, displayMode, langMode, setAuthToken, setCurrentUser, setOrderMap, setUserFlags, setPollIntervalId, setHighlightTags, setAllWeeks, setCurrentWeekNumber, setCurrentYear } from './state.js';
import { getISOWeek, getWeekYear, translateDay, escapeHtml, getRelativeTime, isNewer, getLocalizedText } from './utils.js';
import { API_BASE, VENUE_ID, MENU_ID, POLL_INTERVAL_MS, GITHUB_API, INSTALLER_BASE, CLIENT_VERSION, LS } from './constants.js';
import { apiHeaders, githubHeaders } from './api.js';
import { placeOrder, cancelOrder, toggleFlag, showToast, checkHighlight, loadMenuDataFromAPI } from './actions.js';
import { t } from './i18n.js';

/**
 * Updates the "Next Week" button tooltip and glow state.
 * Tooltip shows order status summary and highlight count.
 * Glow activates only if Mon-Thu have orderable menus without orders (Friday exempt).
 */
export function updateNextWeekBadge() {
    const btnNextWeek = document.getElementById('btn-next-week');
    let nextWeek = currentWeekNumber + 1;
    let nextYear = currentYear;
    if (nextWeek > 52) { nextWeek = 1; nextYear++; }

    const nextWeekData = allWeeks.find(w => w.weekNumber === nextWeek && w.year === nextYear);
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
                    if (orderMap.has(key) && orderMap.get(key).length > 0) hasOrder = true;
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
                    const nameMatches = checkHighlight(item.name);
                    const descMatches = checkHighlight(item.description);
                    if (nameMatches.length > 0 || descMatches.length > 0) {
                        highlightCount++;
                    }
                });
            });
        }

        // Feature 3: All info goes to button tooltip instead of visible badge
        let tooltipParts = [`${daysWithOrders} ${t('badgeOrdered')} / ${orderableCount} ${t('badgeOrderable')} / ${totalDataCount} ${t('badgeTotal')}`];
        if (highlightCount > 0) {
            tooltipParts.push(`${highlightCount} ${t('badgeHighlights')}`);
        }
        btnNextWeek.title = tooltipParts.join(' • ');

        // Feature 5: Glow only if Mon-Thu have orderable days without existing orders
        if (monThuOrderableNoOrder > 0) {
            btnNextWeek.classList.add('new-week-available');
            const storageKey = `kantine_notified_nextweek_${nextYear}_${nextWeek}`;
            if (!localStorage.getItem(storageKey)) {
                localStorage.setItem(storageKey, 'true');
                showToast(t('newMenuDataAvailable'), 'info');
            }
        } else {
            btnNextWeek.classList.remove('new-week-available');
        }
    } else {
        btnNextWeek.title = t('nextWeekTooltipDefault');
        btnNextWeek.classList.remove('new-week-available');
    }
}


export function renderVisibleWeeks() {
    const menuContainer = document.getElementById('menu-container');
    if (!menuContainer) return;
    menuContainer.innerHTML = '';

    let targetWeek = currentWeekNumber;
    let targetYear = currentYear;

    if (displayMode === 'next-week') {
        targetWeek++;
        if (targetWeek > 52) { targetWeek = 1; targetYear++; }
    }

    const allDays = allWeeks.flatMap(w => w.days || []);
    const daysInTargetWeek = allDays.filter(day => {
        const d = new Date(day.date);
        return getISOWeek(d) === targetWeek && getWeekYear(d) === targetYear;
    });

    if (daysInTargetWeek.length === 0) {
        menuContainer.innerHTML = `
            <div class="empty-state">
                <p>${t('noMenuData')} ${targetWeek} (${targetYear}).</p>
                <small>${t('noMenuDataHint')}</small>
            </div>`;
        return;
    }


    const headerWeekInfo = document.getElementById('header-week-info');
    const weekTitle = displayMode === 'this-week' ? t('thisWeek') : t('nextWeek');
    headerWeekInfo.innerHTML = `
        <div class="header-week-title">${weekTitle}</div>
        <div class="header-week-subtitle">${t('weekLabel')} ${targetWeek} • ${targetYear}</div>`;

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

export function syncMenuItemHeights(grid) {
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

export function createDayCard(day) {
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
            const orders = orderMap.get(orderKey) || [];
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
        return orderMap.has(key) && orderMap.get(key).length > 0;
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
            <span class="day-name">${translateDay(day.weekday)}</span>
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
            const aOrdered = orderMap.has(`${day.date}_${aId}`);
            const bOrdered = orderMap.has(`${day.date}_${bId}`);

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
        const orderIds = orderMap.get(orderKey) || [];
        const orderCount = orderIds.length;

        let statusBadge = '';
        if (item.available) {
            statusBadge = item.amountTracking
                ? `<span class="badge available">${t('available')} (${item.availableAmount})</span>`
                : `<span class="badge available">${t('available')}</span>`;
        } else {
            statusBadge = `<span class="badge sold-out">${t('soldOut')}</span>`;
        }

        let orderedBadge = '';
        if (orderCount > 0) {
            const countBadge = orderCount > 1 ? `<span class="order-count-badge">${orderCount}</span>` : '';
            orderedBadge = `<span class="badge ordered"><span class="material-icons-round">check_circle</span> ${t('ordered')}${countBadge}</span>`;
            itemEl.classList.add('ordered');
            if (new Date(day.date).toDateString() === now.toDateString()) {
                itemEl.classList.add('today-ordered');
            }
        }

        const flagId = `${day.date}_${articleId}`;
        const isFlagged = userFlags.has(flagId);
        if (isFlagged) {
            itemEl.classList.add(item.available ? 'flagged-available' : 'flagged-sold-out');
        }

        const matchedTags = [...new Set([...checkHighlight(item.name), ...checkHighlight(item.description)])];
        if (matchedTags.length > 0) {
            itemEl.classList.add('highlight-glow');
        }

        let orderButton = '';
        let cancelButton = '';
        let flagButton = '';

        if (authToken && !isPastCutoff) {
            const flagIcon = isFlagged ? 'notifications_active' : 'notifications_none';
            const flagClass = isFlagged ? 'btn-flag active' : 'btn-flag';
            const flagTitle = isFlagged ? t('flagDeactivate') : t('flagActivate');
            if (!item.available || isFlagged) {
                flagButton = `<button class="${flagClass}" data-date="${day.date}" data-article="${articleId}" data-name="${escapeHtml(item.name)}" data-cutoff="${day.orderCutoff}" title="${flagTitle}"><span class="material-icons-round">${flagIcon}</span></button>`;
            }

            if (item.available) {
                if (orderCount > 0) {
                    orderButton = `<button class="btn-order btn-order-compact" data-date="${day.date}" data-article="${articleId}" data-name="${escapeHtml(item.name)}" data-price="${item.price}" data-desc="${escapeHtml(item.description || '')}" title="${escapeHtml(item.name)} – ${t('orderAgainTooltip')}"><span class="material-icons-round">add</span></button>`;
                } else {
                    orderButton = `<button class="btn-order" data-date="${day.date}" data-article="${articleId}" data-name="${escapeHtml(item.name)}" data-price="${item.price}" data-desc="${escapeHtml(item.description || '')}" title="${escapeHtml(item.name)} – ${t('orderTooltip')}"><span class="material-icons-round">add_shopping_cart</span> ${t('orderButton')}</button>`;
                }
            }

            if (orderCount > 0) {
                const cancelIcon = orderCount === 1 ? 'close' : 'remove';
                const cancelTitle = orderCount === 1 ? t('cancelOrder') : t('cancelOneOrder');
                cancelButton = `<button class="btn-cancel" data-date="${day.date}" data-article="${articleId}" data-name="${escapeHtml(item.name)}" title="${cancelTitle}"><span class="material-icons-round">${cancelIcon}</span></button>`;
            }
        }

        let tagsHtml = '';
        if (matchedTags.length > 0) {
            const badges = matchedTags.reduce((acc, t) => acc + `<span class="tag-badge-small"><span class="material-icons-round" style="font-size:10px;margin-right:2px">star</span>${escapeHtml(t)}</span>`, '');
            tagsHtml = `<div class="matched-tags">${badges}</div>`;
        }

        itemEl.innerHTML = `
            <div class="item-header">
                <span class="item-name">${escapeHtml(item.name)}</span>
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
            <p class="item-desc">${escapeHtml(getLocalizedText(item.description))}</p>`;

        const orderBtn = itemEl.querySelector('.btn-order');
        if (orderBtn) {
            orderBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const btn = e.currentTarget;
                btn.disabled = true;
                btn.classList.add('loading');
                placeOrder(btn.dataset.date, parseInt(btn.dataset.article), btn.dataset.name, parseFloat(btn.dataset.price), btn.dataset.desc || '')
                    .finally(() => { btn.disabled = false; btn.classList.remove('loading'); });
            });
        }

        const cancelBtn = itemEl.querySelector('.btn-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const btn = e.currentTarget;
                btn.disabled = true;
                cancelOrder(btn.dataset.date, parseInt(btn.dataset.article), btn.dataset.name)
                    .finally(() => { btn.disabled = false; });
            });
        }

        const flagBtn = itemEl.querySelector('.btn-flag');
        if (flagBtn) {
            flagBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const btn = e.currentTarget;
                toggleFlag(btn.dataset.date, parseInt(btn.dataset.article), btn.dataset.name, btn.dataset.cutoff);
            });
        }

        body.appendChild(itemEl);
    });

    card.appendChild(body);
    return card;
}

export async function fetchVersions(devMode) {
    const endpoint = devMode
        ? `${GITHUB_API}/tags?per_page=20`
        : `${GITHUB_API}/releases?per_page=20`;

    const resp = await fetch(endpoint, { headers: githubHeaders() });
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
            url: `${INSTALLER_BASE}/${tag}/dist/install.html`,
            body: item.body || ''
        };
    });
}

export async function checkForUpdates() {
    const currentVersion = '{{VERSION}}';
    const devMode = localStorage.getItem(LS.DEV_MODE) === 'true';

    try {
        const versions = await fetchVersions(devMode);
        if (!versions.length) return;

        localStorage.setItem(LS.VERSION_CACHE, JSON.stringify({
            timestamp: Date.now(), devMode, versions
        }));

        const latest = versions[0].tag;

        if (!isNewer(latest, currentVersion)) return;

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

export function openVersionMenu() {
    const modal = document.getElementById('version-modal');
    const container = document.getElementById('version-list-container');
    const devToggle = document.getElementById('dev-mode-toggle');
    const currentVersion = '{{VERSION}}';

    if (!modal) return;
    modal.classList.remove('hidden');

    const cur = document.getElementById('version-current');
    if (cur) cur.textContent = currentVersion;

    const devMode = localStorage.getItem(LS.DEV_MODE) === 'true';
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
                const isNew = isNewer(v.tag, currentVersion);
                const li = document.createElement('li');
                li.className = 'version-item' + (isCurrent ? ' current' : '');

                let badge = '';
                if (isCurrent) badge = '<span class="badge-current">✓ Installiert</span>';
                else if (isNew) badge = '<span class="badge-new">⬆ Neu!</span>';

                let action = '';
                if (!isCurrent) {
                    action = `<a href="${escapeHtml(v.url)}" target="_blank" class="install-link" title="${escapeHtml(v.tag)} installieren">Installieren</a>`;
                }

                li.innerHTML = `
                    <div class="version-info">
                        <strong>${escapeHtml(v.tag)}</strong>
                        ${badge}
                    </div>
                    ${action}
                `;
                list.appendChild(li);
            });
        }

        try {
            const cachedRaw = localStorage.getItem(LS.VERSION_CACHE);
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
                localStorage.setItem(LS.VERSION_CACHE, JSON.stringify({
                    timestamp: Date.now(), devMode: dm, versions: liveVersions
                }));
                renderVersionsList(liveVersions);
            }

        } catch (e) {
            container.innerHTML = `<p style="color:#e94560;">Fehler: ${escapeHtml(e.message)}</p>`;
        }
    }

    loadVersions(false);

    devToggle.onchange = () => {
        localStorage.setItem(LS.DEV_MODE, devToggle.checked);
        localStorage.removeItem(LS.VERSION_CACHE);
        loadVersions(true);
    };
}

export function updateCountdown() {
    if (!authToken || !currentUser) {
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
    for (const key of orderMap.keys()) {
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

    countdownEl.innerHTML = `<span>${t('orderDeadline')}:</span> <strong>${diffHrs}h ${diffMins}m</strong>`;

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

export function removeCountdown() {
    const el = document.getElementById('order-countdown');
    if (el) el.remove();
}

setInterval(updateCountdown, 60000);
setTimeout(updateCountdown, 1000);

export function showErrorModal(title, message, details, btnText, url) {
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

export function updateAlarmBell() {
    const bellBtn = document.getElementById('alarm-bell');
    const bellIcon = document.getElementById('alarm-bell-icon');
    if (!bellBtn || !bellIcon) return;

    if (userFlags.size === 0) {
        bellBtn.classList.add('hidden');
        bellBtn.style.display = 'none';
        bellIcon.style.color = 'var(--text-secondary)';
        bellIcon.style.textShadow = 'none';
        return;
    }

    bellBtn.classList.remove('hidden');
    bellBtn.style.display = 'inline-flex';

    let anyAvailable = false;
    for (const wk of allWeeks) {
        if (!wk.days) continue;
        for (const d of wk.days) {
            if (!d.items) continue;
            for (const item of d.items) {
                if (item.available && userFlags.has(item.id)) {
                    anyAvailable = true;
                    break;
                }
            }
            if (anyAvailable) break;
        }
        if (anyAvailable) break;
    }

    const lastCheckedStr = localStorage.getItem(LS.LAST_CHECKED);
    const flaggedLastCheckedStr = localStorage.getItem(LS.FLAGGED_LAST_CHECKED);

    let latestTime = 0;
    if (lastCheckedStr) latestTime = Math.max(latestTime, new Date(lastCheckedStr).getTime());
    if (flaggedLastCheckedStr) latestTime = Math.max(latestTime, new Date(flaggedLastCheckedStr).getTime());

    let timeStr = 'gerade eben';
    if (latestTime === 0) {
        const now = new Date().toISOString();
        localStorage.setItem(LS.LAST_CHECKED, now);
        latestTime = new Date(now).getTime();
    }

    timeStr = getRelativeTime(new Date(latestTime));

    bellBtn.title = `${t('alarmLastChecked')}: ${timeStr}`;

    if (anyAvailable) {
        bellIcon.style.color = '#10b981';
        bellIcon.style.textShadow = '0 0 10px rgba(16, 185, 129, 0.4)';
    } else {
        bellIcon.style.color = '#f59e0b';
        bellIcon.style.textShadow = '0 0 10px rgba(245, 158, 11, 0.4)';
    }
}
