import { authToken, currentUser, orderMap, userFlags, allWeeks, currentWeekNumber, currentYear, displayMode, langMode } from './state.js';
import { getISOWeek, getWeekYear, translateDay, escapeHtml, getRelativeTime, isNewer, getLocalizedText, splitLanguage } from './utils.js';
import { GITHUB_API, RAW_INSTALLER_BASE, GITHUB_FILE_BASE, CLIENT_VERSION, LS, DEV_MODE_PW_HASH, MIN_BOOTLOADER_VERSION, DISH_IMAGE_HOVER_MS, DISH_IMAGE_CAROUSEL_INTERVAL_MS } from './constants.js';
import { githubHeaders } from './api.js';
import { placeOrder, cancelOrder, toggleFlag, showToast, checkHighlight } from './actions.js';
import { t } from './i18n.js';
import { getMainCourseLine, sanitizeDishQuery, buildGoogleImageUrl, fetchDishImages } from './image_search.js';
import { tracker } from './stats-tracker.js';
import { createLangModel } from './lang/langModel.js';
import { LANG_MODEL_SEED } from './lang/langModelSeed.js';

const heatmapLangModel = createLangModel(LANG_MODEL_SEED);

// Dish image search hover-dwell popup state (FR-125, event-flow spec)
let dwellTimer = null;
let dishImagePopupSuppressed = false;

/** Null-safe modal-closed check: missing element (pre-Todo-6) counts as closed. */
function isDishImageModalClosed() {
    const modal = document.getElementById('dish-image-modal');
    return !modal || modal.classList.contains('hidden');
}

// Dish image carousel modal state (FR-125) — module singleton, lives outside
// the menu container so renderVisibleWeeks re-renders never touch the modal.
let dishImageModalOpen = false;
let dishImageCurrentQuery = null;
let dishImageCarouselIndex = 0;
let dishImageIntervalId = null;
let dishImageTriggerLink = null;

function startDishImageAdvance() {
    stopDishImageAdvance();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    dishImageIntervalId = setInterval(() => showDishImageSlide(dishImageCarouselIndex + 1), DISH_IMAGE_CAROUSEL_INTERVAL_MS);
}

function stopDishImageAdvance() {
    if (dishImageIntervalId !== null) {
        clearInterval(dishImageIntervalId);
        dishImageIntervalId = null;
    }
}

/** Activates slide `index` (wrapping both directions) and syncs the dots. */
function showDishImageSlide(index) {
    const carousel = document.querySelector('#dish-image-body .dish-image-carousel');
    if (!carousel) return;
    const slides = Array.from(carousel.querySelectorAll('.dish-image-slide'));
    if (slides.length === 0) return;
    dishImageCarouselIndex = ((index % slides.length) + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('active', i === dishImageCarouselIndex));
    Array.from(carousel.querySelectorAll('.dish-image-dot')).forEach((dot, i) => dot.classList.toggle('active', i === dishImageCarouselIndex));
}

/**
 * Opens the dish-image popup for a query (event-flow spec step 3/7):
 * suppression flag set here, reset happens on the link's next pointerleave.
 * @param {string} query Sanitized dish query
 * @param {HTMLElement} [linkEl] Triggering anchor — focus returns here on close
 */
export function openDishImageModal(query, linkEl) {
    const modal = document.getElementById('dish-image-modal');
    if (!modal) return;
    dishImagePopupSuppressed = true;
    dishImageTriggerLink = linkEl || null;
    dishImageModalOpen = true;
    dishImageCurrentQuery = query;
    dishImageCarouselIndex = 0;

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.getElementById('btn-dish-image-close').focus();
    document.getElementById('dish-image-title').textContent = t('dishImageModalTitle');
    document.getElementById('dish-image-body').innerHTML = '<div class="skeleton dish-image-skeleton"></div>'.repeat(3) + `<p class="dish-image-loading-text">${escapeHtml(t('dishImageLoading'))}</p>`;
    tracker.increment('dish_image_popup');

    fetchDishImages(query).then(result => {
        // Stale-response guard: ignore results after query change or close.
        if (!dishImageModalOpen || dishImageCurrentQuery !== query) return;
        if (result.source === null) renderDishImageError(query, false);
        else if (!result.images || result.images.length === 0) renderDishImageError(query, true);
        else renderDishImageCarousel(query, result);
    });
}

function renderDishImageError(query, isEmpty) {
    const body = document.getElementById('dish-image-body');
    if (!body) return;
    stopDishImageAdvance();
    body.innerHTML = `<p class="dish-image-error-text">${escapeHtml(isEmpty ? t('dishImageNoImages') : t('dishImageError'))}</p><a href="${escapeHtml(buildGoogleImageUrl(query))}" target="_blank" rel="noopener noreferrer" class="dish-image-google-link">${escapeHtml(t('dishImageOpenInGoogle'))}</a>`;
    const link = body.querySelector('.dish-image-google-link');
    if (link) link.addEventListener('click', () => tracker.increment('dish_image_tab'));
}

function renderDishImageCarousel(query, result) {
    const body = document.getElementById('dish-image-body');
    if (!body) return;
    stopDishImageAdvance();

    const sourceLabel = t(result.source === 'openverse' ? 'dishImageSourceOpenverse' : 'dishImageSourceGoogle');
    const slidesHtml = result.images.map(img => {
        const attribution = escapeHtml([img.creator, img.license].filter(Boolean).join(' — '));
        return `<div class="dish-image-slide"><img src="${escapeHtml(img.url)}" alt="" loading="lazy" referrerpolicy="no-referrer" title="${attribution}"></div>`;
    }).join('');

    body.innerHTML = `<div class="dish-image-carousel"><div class="dish-image-track">${slidesHtml}</div><button type="button" class="icon-btn dish-image-nav dish-image-prev" aria-label="${escapeHtml(t('dishImagePrev'))}" title="${escapeHtml(t('dishImagePrev'))}"><span class="material-icons-round">chevron_left</span></button><button type="button" class="icon-btn dish-image-nav dish-image-next" aria-label="${escapeHtml(t('dishImageNext'))}" title="${escapeHtml(t('dishImageNext'))}"><span class="material-icons-round">chevron_right</span></button><div class="dish-image-dots"></div></div><p class="dish-image-caption">${escapeHtml(sourceLabel)} — ${escapeHtml(query)} <a href="${escapeHtml(buildGoogleImageUrl(query))}" target="_blank" rel="noopener noreferrer" class="dish-image-google-link">${escapeHtml(t('dishImageOpenInGoogle'))}</a></p>`;

    const carousel = body.querySelector('.dish-image-carousel');
    const dotsEl = carousel.querySelector('.dish-image-dots');
    dotsEl.innerHTML = Array.from(carousel.querySelectorAll('.dish-image-slide'), (_, i) => `<button type="button" class="dish-image-dot" data-slide="${i}" aria-label="${i + 1}"></button>`).join('');

    carousel.querySelector('.dish-image-prev').addEventListener('click', () => showDishImageSlide(dishImageCarouselIndex - 1));
    carousel.querySelector('.dish-image-next').addEventListener('click', () => showDishImageSlide(dishImageCarouselIndex + 1));
    dotsEl.addEventListener('click', (e) => {
        const dot = e.target.closest('.dish-image-dot');
        if (dot) showDishImageSlide(parseInt(dot.dataset.slide, 10));
    });
    body.querySelector('.dish-image-google-link').addEventListener('click', () => tracker.increment('dish_image_tab'));

    // Failed image: drop its slide, re-sync dots, advance; all failed → error state.
    carousel.querySelectorAll('.dish-image-slide img').forEach(img => {
        img.addEventListener('error', () => {
            const slide = img.closest('.dish-image-slide');
            if (slide) slide.remove();
            if (carousel.querySelectorAll('.dish-image-slide').length === 0) {
                renderDishImageError(query);
                return;
            }
            dotsEl.innerHTML = Array.from(carousel.querySelectorAll('.dish-image-slide'), (_, i) => `<button type="button" class="dish-image-dot" data-slide="${i}" aria-label="${i + 1}"></button>`).join('');
            showDishImageSlide(dishImageCarouselIndex);
        });
    });

    // Pause auto-advance while the pointer or keyboard focus rests on the carousel.
    carousel.addEventListener('mouseenter', stopDishImageAdvance);
    carousel.addEventListener('mouseleave', startDishImageAdvance);
    carousel.addEventListener('focusin', stopDishImageAdvance);
    carousel.addEventListener('focusout', (e) => {
        if (!carousel.contains(e.relatedTarget)) startDishImageAdvance();
    });

    showDishImageSlide(0);
    startDishImageAdvance();
}

/**
 * Closes the popup: clears the interval, hides the modal, resets state and
 * returns focus to the trigger link. Safe no-op when already closed.
 */
export function closeDishImageModal() {
    const modal = document.getElementById('dish-image-modal');
    if (!modal || modal.classList.contains('hidden')) return;
    stopDishImageAdvance();
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    dishImageModalOpen = false;
    dishImageCurrentQuery = null;
    dishImageCarouselIndex = 0;
    const trigger = dishImageTriggerLink;
    dishImageTriggerLink = null;
    if (trigger && trigger.isConnected) trigger.focus();
}

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
                if (Notification.permission === 'granted') {
                    new Notification('Kantine Wrapper', {
                        body: t('newMenuDataAvailable'),
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
        btnNextWeek.title = t('nextWeekTooltipDefault');
        btnNextWeek.classList.remove('new-week-available');
    }
}


export function renderVisibleWeeks() {
    const menuContainer = document.getElementById('menu-container');
    if (!menuContainer) return;

    // Save scroll position before DOM wipe — .days-grid is the scroll container
    const oldGrid = menuContainer.querySelector('.days-grid');
    const savedScrollTop = oldGrid ? oldGrid.scrollTop : 0;

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

    // Restore scroll position on the new .days-grid
    if (savedScrollTop > 0) grid.scrollTop = savedScrollTop;

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

        const dm = localStorage.getItem(LS.DEV_MODE) === 'true';

        const isLowStock = item.available && item.amountTracking
            && typeof item.availableAmount === 'number'
            && item.availableAmount > 0 && item.availableAmount < 10;

        // Normal mode deliberately hides the Stückzahl; dev mode shows it.
        // Stock below 10 switches to the "wenig verfügbar" label + green-yellow color.
        let statusBadge = '';
        if (!item.available) {
            statusBadge = `<span class="badge sold-out">${t('soldOut')}</span>`;
        } else if (isLowStock) {
            statusBadge = dm
                ? `<span class="badge available-low">${t('available')} (${item.availableAmount})</span>`
                : `<span class="badge available-low">${t('lowStock')}</span>`;
        } else if (!item.amountTracking) {
            statusBadge = `<span class="badge available">${t('available')}</span>`;
        } else if (dm) {
            statusBadge = `<span class="badge available">${t('available')} (${item.availableAmount})</span>`;
        } else {
            statusBadge = `<span class="badge available">${t('available')}</span>`;
        }

        const split = splitLanguage(item.description || '');
        const lbl = split.label || 'fallback';
        
        let dTitle = '';
        if (lbl !== 'high' && lbl !== 'template') {
            dTitle = ` title="${escapeHtml(item.description || '')}"`;
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
                return `<span class="heatmap-char" style="color: ${color}">${escapeHtml(char)}</span>`;
            }).join('');
            heatmapHtml = `<div class="heatmap-row">${chars}</div>`;
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

        const localized = getLocalizedText(item.description, split);
        const mainCourse = getMainCourseLine(split, langMode);
        const dishQuery = mainCourse ? sanitizeDishQuery(mainCourse.text) : null;
        let descHtml = escapeHtml(localized);
        if (dishQuery !== null) {
            const rawLines = localized.split('\n');
            const nonEmptyCount = rawLines.map(s => s.trim()).filter(Boolean).length;
            const mainIdx = nonEmptyCount >= 2 ? 1 : 0;
            let seen = 0;
            descHtml = rawLines.map(line => {
                if (line.trim()) {
                    const isMain = seen === mainIdx;
                    seen++;
                    if (isMain) {
                        return `<a href="${buildGoogleImageUrl(dishQuery)}" target="_blank" rel="noopener noreferrer" class="dish-image-link" data-dish-query="${escapeHtml(dishQuery)}" title="${escapeHtml(t('dishImageLinkTooltip'))}">${escapeHtml(mainCourse.text)}</a>`;
                    }
                }
                return escapeHtml(line);
            }).join('\n');
        }

        itemEl.innerHTML = `<div class="item-header"><span class="item-name">${escapeHtml(item.name)}</span><span class="item-price">${item.price.toFixed(2)} €</span></div><div class="item-status-row">${orderedBadge}${cancelButton}${orderButton}${flagButton}<div class="badges">${statusBadge}</div></div>${tagsHtml}<div class="item-desc-wrap"><p class="item-desc"${dTitle}>${descHtml} ${cBadge}</p>${heatmapHtml}</div>`;

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

        const dishLink = itemEl.querySelector('.dish-image-link');
        if (dishLink) {
            const linkQuery = dishLink.dataset.dishQuery;
            dishLink.addEventListener('click', (e) => {
                e.stopPropagation();
                tracker.increment('dish_image_tab');
                closeDishImageModal();
            });
            dishLink.addEventListener('pointerenter', (e) => {
                if (e.pointerType !== 'mouse') return;
                if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
                if (dishImagePopupSuppressed) return;
                if (!isDishImageModalClosed()) return;
                clearTimeout(dwellTimer);
                dwellTimer = setTimeout(() => {
                    dwellTimer = null;
                    if (dishLink.isConnected && isDishImageModalClosed()) openDishImageModal(linkQuery, dishLink);
                }, DISH_IMAGE_HOVER_MS);
            });
            const cancelDishDwell = () => {
                clearTimeout(dwellTimer);
                dwellTimer = null;
                dishImagePopupSuppressed = false;
            };
            dishLink.addEventListener('pointerleave', cancelDishDwell);
            dishLink.addEventListener('pointercancel', cancelDishDwell);
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

    // Send stored ETag (if any) for conditional request — GitHub returns 304 at no rate-limit cost
    const storedEtag = localStorage.getItem(LS.VERSION_ETAG);
    const resp = await fetch(endpoint, { headers: githubHeaders(storedEtag) });

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
    if (newEtag) localStorage.setItem(LS.VERSION_ETAG, newEtag);

    const data = await resp.json();

    return data.map(item => {
        const tag = devMode ? item.name : item.tag_name;
        return {
            tag,
            name: devMode ? tag : (item.name || tag),
            // Raw content URL: fetched as blob to bypass firewall blocking htmlpreview
            rawUrl: `${RAW_INSTALLER_BASE}/${tag}/dist/install.html`,
            // GitHub file browser URL: opened directly in new tab
            githubUrl: `${GITHUB_FILE_BASE}/${tag}/dist/install.html`,
            body: item.body || ''
        };
    });
}

/**
 * Fetches an install.html from raw GitHub content and opens it as a Blob URL.
 * Falls back to opening the raw URL directly if fetch fails.
 * @param {string} rawUrl - The raw.githubusercontent.com URL of the installer HTML.
 */
export async function openInstallPage(rawUrl) {
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

export async function checkForUpdates() {
    const currentVersion = '{{VERSION}}';
    const devMode = localStorage.getItem(LS.DEV_MODE) === 'true';

    // Cache-first: use cached versions if ≤1h old to avoid hitting GitHub API rate limit
    const cachedRaw = localStorage.getItem(LS.VERSION_CACHE);
    if (cachedRaw) {
        try {
            const cached = JSON.parse(cachedRaw);
            if (cached && cached.timestamp && cached.devMode === devMode && cached.versions && cached.versions.length) {
                const age = Date.now() - cached.timestamp;
                if (age < 60 * 60 * 1000) {
                    const latest = cached.versions[0].tag;
                    if (isNewer(latest, currentVersion)) {
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

        localStorage.setItem(LS.VERSION_CACHE, JSON.stringify({
            timestamp: Date.now(), devMode, versions
        }));

        const latest = versions[0].tag;

        if (!isNewer(latest, currentVersion)) return;

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
export function checkBootloaderVersion() {
    const bootVer = localStorage.getItem(LS.BOOTLOADER_VERSION_KEY);
    if (bootVer && !isNewer(MIN_BOOTLOADER_VERSION, bootVer)) {
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
    badge.title = t('bootloaderUpdateTooltip');

    const tooltip = document.createElement('div');
    tooltip.className = 'bootloader-warning-tooltip hidden';
    tooltip.innerHTML = `
        <div class="bootloader-warning-text">${t('bootloaderUpdateTooltip')}</div>
        <button class="btn-install-bootloader">${t('bootloaderUpdateLink')}</button>
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
        const installerUrl = `${RAW_INSTALLER_BASE}/${CLIENT_VERSION}/dist/install.html`;
        openInstallPage(installerUrl);
    });
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

                li.innerHTML = `
                    <div class="version-info">
                        <strong>${escapeHtml(v.tag)}</strong>
                        ${badge}
                    </div>
                    <div class="version-actions">
                        <button class="btn-install-raw"
                            data-raw-url="${escapeHtml(v.rawUrl)}"
                            title="${escapeHtml(v.tag)} installieren (laedt Install-Seite aus GitHub Raw-Content)">
                            Installieren
                        </button>
                        <a href="${escapeHtml(v.githubUrl)}" target="_blank" class="btn-github-link"
                            title="${escapeHtml(v.tag)} auf GitHub ansehen">
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
            const cachedRaw = localStorage.getItem(LS.VERSION_CACHE);
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
                    localStorage.setItem(LS.VERSION_CACHE, JSON.stringify({
                        timestamp: Date.now(), devMode: dm, versions: liveVersions
                    }));
                    renderVersionsList(liveVersions);
                }
            }

        } catch (e) {
            container.innerHTML = `<p style="color:#e94560;">Fehler: ${escapeHtml(e.message)}</p>`;
        }
    }

    loadVersions(false);

    devToggle.onchange = async () => {
        if (devToggle.checked) {
            const promptText = langMode === 'en' ? 'Dev-Mode password:' : 'Dev-Mode Passwort:';
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
            if (hashHex !== DEV_MODE_PW_HASH) {
                devToggle.checked = false;
                localStorage.setItem(LS.DEV_MODE, 'false');
                console.warn('[Kantine] Dev-Mode activation rejected: wrong password.');
                return;
            }
            localStorage.setItem(LS.DEV_MODE, 'true');
        } else {
            localStorage.setItem(LS.DEV_MODE, 'false');
        }
        localStorage.removeItem(LS.VERSION_CACHE);
        localStorage.removeItem(LS.VERSION_ETAG);
        loadVersions(true);
        renderVisibleWeeks();
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
