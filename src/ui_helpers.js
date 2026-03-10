import { authToken, currentUser, orderMap, userFlags, pollIntervalId, highlightTags, allWeeks, currentWeekNumber, currentYear, displayMode, langMode, setAuthToken, setCurrentUser, setOrderMap, setUserFlags, setPollIntervalId, setHighlightTags, setAllWeeks, setCurrentWeekNumber, setCurrentYear } from './state.js';
import { getISOWeek, getWeekYear, translateDay, escapeHtml, getRelativeTime, isNewer, getLocalizedText } from './utils.js';
import { API_BASE, GUEST_TOKEN, VENUE_ID, MENU_ID, POLL_INTERVAL_MS, GITHUB_API, INSTALLER_BASE, CLIENT_VERSION } from './constants.js';
import { apiHeaders, githubHeaders } from './api.js';
import { placeOrder, cancelOrder, toggleFlag, showToast, checkHighlight, loadMenuDataFromAPI } from './actions.js';

export function updateNextWeekBadge() {
    const btnNextWeek = document.getElementById('btn-next-week');
    let nextWeek = currentWeekNumber + 1;
    let nextYear = currentYear;
    if (nextWeek > 52) { nextWeek = 1; nextYear++; }

    const nextWeekData = allWeeks.find(w => w.weekNumber === nextWeek && w.year === nextYear);
    let totalDataCount = 0;
    let orderableCount = 0;
    let daysWithOrders = 0;
    let daysWithOrderableAndNoOrder = 0;

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
                if (isOrderable && !hasOrder) daysWithOrderableAndNoOrder++;
            }
        });
    }

    let badge = btnNextWeek.querySelector('.nav-badge');
    if (totalDataCount > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'nav-badge';
            btnNextWeek.appendChild(badge);
        }

        badge.title = `${daysWithOrders} bestellt / ${orderableCount} bestellbar / ${totalDataCount} gesamt`;
        badge.innerHTML = `<span class="ordered">${daysWithOrders}</span><span class="separator">/</span><span class="orderable">${orderableCount}</span><span class="separator">/</span><span class="total">${totalDataCount}</span>`;

        badge.classList.remove('badge-violet', 'badge-green', 'badge-red', 'badge-blue');

        if (daysWithOrders > 0 && daysWithOrderableAndNoOrder === 0) {
            badge.classList.add('badge-violet');
        } else if (daysWithOrderableAndNoOrder > 0) {
            badge.classList.add('badge-green');
        } else if (orderableCount === 0) {
            badge.classList.add('badge-red');
        } else {
            badge.classList.add('badge-blue');
        }

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

        if (highlightCount > 0) {
            badge.insertAdjacentHTML('beforeend', `<span class="highlight-count" title="${highlightCount} Highlight Menüs">(${highlightCount})</span>`);
            badge.title += ` • ${highlightCount} Highlights gefunden`;
            badge.classList.add('has-highlights');
        }

        if (daysWithOrders === 0) {
            btnNextWeek.classList.add('new-week-available');
            const storageKey = `kantine_notified_nextweek_${nextYear}_${nextWeek}`;
            if (!localStorage.getItem(storageKey)) {
                localStorage.setItem(storageKey, 'true');
                showToast('Neue Menüdaten für nächste Woche verfügbar!', 'info');
            }
        } else {
            btnNextWeek.classList.remove('new-week-available');
        }

    } else if (badge) {
        badge.remove();
    }
}

export function updateWeeklyCost(days) {
    let totalCost = 0;
    if (days && days.length > 0) {
        days.forEach(day => {
            if (day.items) {
                day.items.forEach(item => {
                    const articleId = item.articleId || parseInt(item.id.split('_')[1]);
                    const key = `${day.date}_${articleId}`;
                    const orders = orderMap.get(key) || [];
                    if (orders.length > 0) totalCost += item.price * orders.length;
                });
            }
        });
    }

    const costDisplay = document.getElementById('weekly-cost-display');
    if (totalCost > 0) {
        costDisplay.innerHTML = `<span class="material-icons-round">shopping_bag</span> <span>Gesamt: ${totalCost.toFixed(2).replace('.', ',')} €</span>`;
        costDisplay.classList.remove('hidden');
    } else {
        costDisplay.classList.add('hidden');
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
                <p>Keine Menüdaten für KW ${targetWeek} (${targetYear}) verfügbar.</p>
                <small>Versuchen Sie eine andere Woche oder schauen Sie später vorbei.</small>
            </div>`;
        document.getElementById('weekly-cost-display').classList.add('hidden');
        return;
    }

    updateWeeklyCost(daysInTargetWeek);

    const headerWeekInfo = document.getElementById('header-week-info');
    const weekTitle = displayMode === 'this-week' ? 'Diese Woche' : 'Nächste Woche';
    headerWeekInfo.innerHTML = `
        <div class="header-week-title">${weekTitle}</div>
        <div class="header-week-subtitle">Week ${targetWeek} • ${targetYear}</div>`;

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

    const badgesHtml = menuBadges.map(code => `<span class="menu-code-badge">${code}</span>`).join('');

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
                ? `<span class="badge available">Verfügbar (${item.availableAmount})</span>`
                : `<span class="badge available">Verfügbar</span>`;
        } else {
            statusBadge = `<span class="badge sold-out">Ausverkauft</span>`;
        }

        let orderedBadge = '';
        if (orderCount > 0) {
            const countBadge = orderCount > 1 ? `<span class="order-count-badge">${orderCount}</span>` : '';
            orderedBadge = `<span class="badge ordered"><span class="material-icons-round">check_circle</span> Bestellt${countBadge}</span>`;
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
            const flagTitle = isFlagged ? 'Benachrichtigung deaktivieren' : 'Benachrichtigen wenn verfügbar';
            if (!item.available || isFlagged) {
                flagButton = `<button class="${flagClass}" data-date="${day.date}" data-article="${articleId}" data-name="${escapeHtml(item.name)}" data-cutoff="${day.orderCutoff}" title="${flagTitle}"><span class="material-icons-round">${flagIcon}</span></button>`;
            }

            if (item.available) {
                if (orderCount > 0) {
                    orderButton = `<button class="btn-order btn-order-compact" data-date="${day.date}" data-article="${articleId}" data-name="${escapeHtml(item.name)}" data-price="${item.price}" data-desc="${escapeHtml(item.description || '')}" title="${escapeHtml(item.name)} nochmal bestellen"><span class="material-icons-round">add</span></button>`;
                } else {
                    orderButton = `<button class="btn-order" data-date="${day.date}" data-article="${articleId}" data-name="${escapeHtml(item.name)}" data-price="${item.price}" data-desc="${escapeHtml(item.description || '')}" title="${escapeHtml(item.name)} bestellen"><span class="material-icons-round">add_shopping_cart</span> Bestellen</button>`;
                }
            }

            if (orderCount > 0) {
                const cancelIcon = orderCount === 1 ? 'close' : 'remove';
                const cancelTitle = orderCount === 1 ? 'Bestellung stornieren' : 'Eine Bestellung stornieren';
                cancelButton = `<button class="btn-cancel" data-date="${day.date}" data-article="${articleId}" data-name="${escapeHtml(item.name)}" title="${cancelTitle}"><span class="material-icons-round">${cancelIcon}</span></button>`;
            }
        }

        let tagsHtml = '';
        if (matchedTags.length > 0) {
            let badges = '';
            for (const t of matchedTags) {
                badges += `<span class="tag-badge-small"><span class="material-icons-round" style="font-size:10px;margin-right:2px">star</span>${escapeHtml(t)}</span>`;
            }
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
    const devMode = localStorage.getItem('kantine_dev_mode') === 'true';

    try {
        const versions = await fetchVersions(devMode);
        if (!versions.length) return;

        localStorage.setItem('kantine_version_cache', JSON.stringify({
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

    const devMode = localStorage.getItem('kantine_dev_mode') === 'true';
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
            const cachedRaw = localStorage.getItem('kantine_version_cache');
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
                localStorage.setItem('kantine_version_cache', JSON.stringify({
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
        localStorage.setItem('kantine_dev_mode', devToggle.checked);
        localStorage.removeItem('kantine_version_cache');
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

    countdownEl.innerHTML = `<span>Bestellschluss:</span> <strong>${diffHrs}h ${diffMins}m</strong>`;

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

export function showErrorModal(title, htmlContent, btnText, url) {
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
                    ${escapeHtml(title)}
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
                        ${escapeHtml(btnText)}
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

    let lastUpdatedStr = localStorage.getItem('kantine_last_checked');
    let timeStr = 'gerade eben';
    if (!lastUpdatedStr) {
        lastUpdatedStr = new Date().toISOString();
        localStorage.setItem('kantine_last_checked', lastUpdatedStr);
    }

    const lastUpdated = new Date(lastUpdatedStr);
    timeStr = getRelativeTime(lastUpdated);

    bellBtn.title = `Zuletzt geprüft: ${timeStr}`;

    if (anyAvailable) {
        bellIcon.style.color = '#10b981';
        bellIcon.style.textShadow = '0 0 10px rgba(16, 185, 129, 0.4)';
    } else {
        bellIcon.style.color = '#f59e0b';
        bellIcon.style.textShadow = '0 0 10px rgba(245, 158, 11, 0.4)';
    }
}
