/**
 * Kantine Wrapper – Client-Only Bookmarklet
 * Replaces Bessa page content with enhanced weekly menu view.
 * All API calls go directly to api.bessa.app (same origin).
 * Data stored in localStorage (flags, theme, auth).
 */
(function () {
    'use strict';

    // Prevent double injection
    if (window.__KANTINE_LOADED) return;
    window.__KANTINE_LOADED = true;

    // === Constants ===
    const API_BASE = 'https://api.bessa.app/v1';
    const GUEST_TOKEN = 'c3418725e95a9f90e3645cbc846b4d67c7c66131';
    const CLIENT_VERSION = '1.7.0_prod/2026-01-26';
    const VENUE_ID = 591;
    const MENU_ID = 7;
    const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

    // === State ===
    let allWeeks = [];
    let currentWeekNumber = getISOWeek(new Date());
    let currentYear = new Date().getFullYear();
    let displayMode = 'this-week';
    let authToken = sessionStorage.getItem('kantine_authToken');
    let currentUser = sessionStorage.getItem('kantine_currentUser');
    let orderMap = new Map();
    let userFlags = new Set(JSON.parse(localStorage.getItem('kantine_flags') || '[]'));
    let pollIntervalId = null;

    // === API Helpers ===
    function apiHeaders(token) {
        return {
            'Authorization': `Token ${token || GUEST_TOKEN}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Client-Version': CLIENT_VERSION
        };
    }

    // === Inject UI ===
    function injectUI() {
        // Replace entire page content
        document.title = 'Kantine Weekly Menu';

        // Inject Google Fonts if not already present
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

        document.body.innerHTML = `
        <div id="kantine-wrapper">
            <header class="app-header">
                <div class="header-content">
                    <div class="brand">
                        <span class="material-icons-round logo-icon">restaurant_menu</span>
                        <div class="header-left">
                            <h1>Kantinen Übersicht <small style="font-size: 0.6em; opacity: 0.7; font-weight: 400;">{{VERSION}}</small></h1>
                            <div id="last-updated-subtitle" class="subtitle"></div>
                        </div>
                    </div>
                    <div class="header-center-wrapper">
                        <div id="header-week-info" class="header-week-info"></div>
                        <div id="weekly-cost-display" class="weekly-cost hidden"></div>
                    </div>
                    <div class="controls">
                        <button id="btn-refresh" class="icon-btn" aria-label="Menüdaten aktualisieren" title="Menüdaten neu laden">
                            <span class="material-icons-round">refresh</span>
                        </button>
                        <button id="btn-highlights" class="icon-btn" aria-label="Persönliche Highlights verwalten" title="Persönliche Highlights verwalten">
                            <span class="material-icons-round">label</span>
                        </button>
                        <div class="nav-group">
                            <button id="btn-this-week" class="nav-btn active">Diese Woche</button>
                            <button id="btn-next-week" class="nav-btn">Nächste Woche</button>
                        </div>
                        <button id="theme-toggle" class="icon-btn" aria-label="Toggle Theme">
                            <span class="material-icons-round theme-icon">light_mode</span>
                        </button>
                        <button id="btn-login-open" class="user-badge-btn icon-btn-small">
                            <span class="material-icons-round">login</span>
                            <span>Anmelden</span>
                        </button>
                        <div id="user-info" class="user-badge hidden">
                            <span class="material-icons-round">person</span>
                            <span id="user-id-display"></span>
                            <button id="btn-logout" class="icon-btn-small" aria-label="Logout">
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
                        <button id="btn-login-close" class="icon-btn" aria-label="Close">
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
                        <button id="btn-highlights-close" class="icon-btn" aria-label="Close">
                            <span class="material-icons-round">close</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p style="margin-bottom: 1rem; color: var(--text-secondary);">
                            Markiere Menüs automatisch, wenn sie diese Schlagwörter enthalten.
                        </p>
                        <div class="input-group">
                            <input type="text" id="tag-input" placeholder="z.B. Schnitzel, Vegetarisch...">
                            <button id="btn-add-tag" class="btn-primary">Hinzufügen</button>
                        </div>
                        <div id="tags-list"></div>
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
                <p>Bessa Knapp-Kantine Wrapper &bull; <span id="current-year">${new Date().getFullYear()}</span></p>
            </footer>
        </div>`;
    }

    // === Bind Events ===
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

        // Highlights Modal
        const btnHighlights = document.getElementById('btn-highlights');
        const highlightsModal = document.getElementById('highlights-modal');
        const btnHighlightsClose = document.getElementById('btn-highlights-close');
        const btnAddTag = document.getElementById('btn-add-tag');
        const tagInput = document.getElementById('tag-input');

        btnHighlights.addEventListener('click', () => {
            highlightsModal.classList.remove('hidden');
            renderTagsList();
            tagInput.focus();
        });

        btnHighlightsClose.addEventListener('click', () => {
            highlightsModal.classList.add('hidden');
        });

        window.addEventListener('click', (e) => {
            if (e.target === highlightsModal) highlightsModal.classList.add('hidden');
        });

        btnAddTag.addEventListener('click', () => {
            const tag = tagInput.value;
            if (addHighlightTag(tag)) {
                tagInput.value = '';
                renderTagsList();
            }
        });

        tagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                btnAddTag.click();
            }
        });

        // Theme
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

        // Navigation
        btnThisWeek.addEventListener('click', () => {
            if (displayMode !== 'this-week') {
                displayMode = 'this-week';
                btnThisWeek.classList.add('active');
                btnNextWeek.classList.remove('active');
                renderVisibleWeeks();
            }
        });

        btnNextWeek.addEventListener('click', () => {
            if (displayMode !== 'next-week') {
                displayMode = 'next-week';
                btnNextWeek.classList.add('active');
                btnThisWeek.classList.remove('active');
                renderVisibleWeeks();
            }
        });

        // Refresh – fetch fresh data from Bessa API
        btnRefresh.addEventListener('click', () => {
            if (!authToken) {
                loginModal.classList.remove('hidden');
                return;
            }
            loadMenuDataFromAPI();
        });

        // Login Modal
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

        // Login Form Submit
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
                const response = await fetch(`${API_BASE}/auth/login/`, {
                    method: 'POST',
                    headers: apiHeaders(GUEST_TOKEN),
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    authToken = data.key;
                    currentUser = employeeId;
                    sessionStorage.setItem('kantine_authToken', data.key);
                    sessionStorage.setItem('kantine_currentUser', employeeId);

                    // Fetch user name
                    try {
                        const userResp = await fetch(`${API_BASE}/auth/user/`, {
                            headers: apiHeaders(authToken)
                        });
                        if (userResp.ok) {
                            const userData = await userResp.json();
                            if (userData.first_name) sessionStorage.setItem('kantine_firstName', userData.first_name);
                            if (userData.last_name) sessionStorage.setItem('kantine_lastName', userData.last_name);
                        }
                    } catch (err) {
                        console.error('Failed to fetch user info:', err);
                    }

                    updateAuthUI();
                    loginModal.classList.add('hidden');
                    fetchOrders();
                    loginForm.reset();
                    startPolling();

                    // Reload menu data with auth for full details
                    loadMenuDataFromAPI();
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

        // Logout
        btnLogout.addEventListener('click', () => {
            sessionStorage.removeItem('kantine_authToken');
            sessionStorage.removeItem('kantine_currentUser');
            sessionStorage.removeItem('kantine_firstName');
            sessionStorage.removeItem('kantine_lastName');
            authToken = null;
            currentUser = null;
            orderMap = new Map();
            stopPolling();
            updateAuthUI();
            renderVisibleWeeks();
        });
    }

    // === Auth UI ===
    function updateAuthUI() {
        // Try to recover session from Bessa's storage if not already logged in
        if (!authToken) {
            try {
                const akita = localStorage.getItem('AkitaStores');
                if (akita) {
                    const parsed = JSON.parse(akita);
                    if (parsed.auth && parsed.auth.token) {
                        console.log('Found existing Bessa session!');
                        authToken = parsed.auth.token;
                        sessionStorage.setItem('kantine_authToken', authToken);

                        if (parsed.auth.user) {
                            currentUser = parsed.auth.user.id || 'unknown';
                            sessionStorage.setItem('kantine_currentUser', currentUser);
                            if (parsed.auth.user.firstName) sessionStorage.setItem('kantine_firstName', parsed.auth.user.firstName);
                            if (parsed.auth.user.lastName) sessionStorage.setItem('kantine_lastName', parsed.auth.user.lastName);
                        }
                    }
                }
            } catch (e) {
                console.warn('Failed to parse AkitaStores:', e);
            }
        }

        authToken = sessionStorage.getItem('kantine_authToken');
        currentUser = sessionStorage.getItem('kantine_currentUser');
        const firstName = sessionStorage.getItem('kantine_firstName');
        const btnLoginOpen = document.getElementById('btn-login-open');
        const userInfo = document.getElementById('user-info');
        const userIdDisplay = document.getElementById('user-id-display');

        if (authToken) {
            btnLoginOpen.classList.add('hidden');
            userInfo.classList.remove('hidden');
            userIdDisplay.textContent = firstName || (currentUser ? `User ${currentUser}` : 'Angemeldet');
            fetchOrders(); // Always fetch fresh orders on auth update
        } else {
            btnLoginOpen.classList.remove('hidden');
            userInfo.classList.add('hidden');
            userIdDisplay.textContent = '';
        }

        renderVisibleWeeks();
    }

    // === Fetch Orders from Bessa ===
    async function fetchOrders() {
        if (!authToken) return;
        try {
            // Use user/orders endpoint for reliable history
            const response = await fetch(`${API_BASE}/user/orders/?venue=${VENUE_ID}&ordering=-created&limit=50`, {
                headers: apiHeaders(authToken)
            });
            const data = await response.json();

            if (response.ok) {
                orderMap = new Map();
                const results = data.results || [];

                for (const order of results) {
                    // Filter out cancelled orders (State 9)
                    // Accepting State 1 (Created?), 5 (Placed?), 8 (Completed)
                    // TODO: Verify exact states. Subagent saw 5=Active, 8=Completed, 9=Cancelled.
                    if (order.order_state === 9) continue;

                    // Extract date properly (it comes as ISO string)
                    const orderDate = order.date.split('T')[0];

                    for (const item of (order.items || [])) {
                        const key = `${orderDate}_${item.article}`;
                        if (!orderMap.has(key)) orderMap.set(key, []);
                        orderMap.get(key).push(order.id);
                    }
                }
                console.log(`Fetched ${results.length} orders, mapped active ones.`);
                renderVisibleWeeks();
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    }

    // === Place Order ===
    async function placeOrder(date, articleId, name, price, description) {
        if (!authToken) return;
        try {
            // Get user data for customer object
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
                date: `${date}T10:00:00.000Z`,
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

            const response = await fetch(`${API_BASE}/user/orders/`, {
                method: 'POST',
                headers: apiHeaders(authToken),
                body: JSON.stringify(orderPayload)
            });

            if (response.ok || response.status === 201) {
                showToast(`Bestellt: ${name}`, 'success');
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

    // === Cancel Order ===
    async function cancelOrder(date, articleId, name) {
        if (!authToken) return;
        const key = `${date}_${articleId}`;
        const orderIds = orderMap.get(key);
        if (!orderIds || orderIds.length === 0) return;

        // LIFO: cancel most recent
        const orderId = orderIds[orderIds.length - 1];
        try {
            const response = await fetch(`${API_BASE}/user/orders/${orderId}/cancel/`, {
                method: 'PATCH',
                headers: apiHeaders(authToken),
                body: JSON.stringify({})
            });

            if (response.ok) {
                showToast(`Storniert: ${name}`, 'success');
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

    // === Flag Management (localStorage) ===
    function saveFlags() {
        localStorage.setItem('kantine_flags', JSON.stringify([...userFlags]));
    }

    function toggleFlag(date, articleId, name, cutoff) {
        const id = `${date}_${articleId}`;
        if (userFlags.has(id)) {
            userFlags.delete(id);
            showToast(`Flag entfernt für ${name}`, 'success');
        } else {
            userFlags.add(id);
            showToast(`Benachrichtigung aktiviert für ${name}`, 'success');
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
        saveFlags();
        renderVisibleWeeks();
    }

    // FR-019: Auto-remove flags whose cutoff has passed
    function cleanupExpiredFlags() {
        const now = new Date();
        let changed = false;
        for (const flagId of [...userFlags]) {
            const [date] = flagId.split('_');
            const cutoff = new Date(date);
            cutoff.setHours(10, 0, 0, 0); // Standard cutoff 10:00
            if (now >= cutoff) {
                userFlags.delete(flagId);
                changed = true;
            }
        }
        if (changed) saveFlags();
    }

    // === Polling (Client-Side) ===
    function startPolling() {
        if (pollIntervalId) return;
        if (!authToken) return;
        pollIntervalId = setInterval(() => pollFlaggedItems(), POLL_INTERVAL_MS);
        console.log('Polling started (every 5 min)');
    }

    function stopPolling() {
        if (pollIntervalId) {
            clearInterval(pollIntervalId);
            pollIntervalId = null;
            console.log('Polling stopped');
        }
    }

    async function pollFlaggedItems() {
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
                        // Refresh menu data to update UI
                        loadMenuDataFromAPI();
                    }
                }
            } catch (err) {
                console.error(`Poll error for ${flagId}:`, err);
                // Small delay between checks
                await new Promise(r => setTimeout(r, 200));
            }
        }
    }

    // === Highlight Management ===
    let highlightTags = JSON.parse(localStorage.getItem('kantine_highlightTags') || '[]');

    function saveHighlightTags() {
        localStorage.setItem('kantine_highlightTags', JSON.stringify(highlightTags));
        renderVisibleWeeks(); // Refresh UI to apply changes
        updateNextWeekBadge();
    }

    function addHighlightTag(tag) {
        tag = tag.trim().toLowerCase();
        if (tag && !highlightTags.includes(tag)) {
            highlightTags.push(tag);
            saveHighlightTags();
            return true;
        }
        return false;
    }

    function removeHighlightTag(tag) {
        highlightTags = highlightTags.filter(t => t !== tag);
        saveHighlightTags();
    }

    function renderTagsList() {
        const list = document.getElementById('tags-list');
        list.innerHTML = '';
        highlightTags.forEach(tag => {
            const badge = document.createElement('span');
            badge.className = 'tag-badge';
            badge.innerHTML = `${tag} <span class="tag-remove" data-tag="${tag}">&times;</span>`;
            list.appendChild(badge);
        });

        // Bind remove events
        list.querySelectorAll('.tag-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                removeHighlightTag(e.target.dataset.tag);
                renderTagsList();
            });
        });
    }

    function checkHighlight(text) {
        if (!text) return false;
        text = text.toLowerCase();
        return highlightTags.some(tag => text.includes(tag));
    }

    // === Local Menu Cache (localStorage) ===
    const CACHE_KEY = 'kantine_menuCache';
    const CACHE_TS_KEY = 'kantine_menuCacheTs';

    function saveMenuCache() {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(allWeeks));
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
                allWeeks = JSON.parse(cached);
                currentWeekNumber = getISOWeek(new Date());
                currentYear = new Date().getFullYear();
                renderVisibleWeeks();
                updateNextWeekBadge();
                if (cachedTs) updateLastUpdatedTime(cachedTs);
                console.log('Loaded menu from cache');
                return true;
            }
        } catch (e) {
            console.warn('Failed to load cached menu:', e);
        }
        return false;
    }

    // === Menu Data Fetching (Direct from Bessa API) ===
    async function loadMenuDataFromAPI() {
        const loading = document.getElementById('loading');
        const progressModal = document.getElementById('progress-modal');
        const progressFill = document.getElementById('progress-fill');
        const progressPercent = document.getElementById('progress-percent');
        const progressMessage = document.getElementById('progress-message');

        loading.classList.remove('hidden');

        const token = authToken || GUEST_TOKEN;

        try {
            // Show progress modal
            progressModal.classList.remove('hidden');
            progressMessage.textContent = 'Hole verfügbare Daten...';
            progressFill.style.width = '0%';
            progressPercent.textContent = '0%';

            // 1. Fetch available dates
            const datesResponse = await fetch(`${API_BASE}/venues/${VENUE_ID}/menu/dates/`, {
                headers: apiHeaders(token)
            });

            if (!datesResponse.ok) throw new Error(`Failed to fetch dates: ${datesResponse.status}`);

            const datesData = await datesResponse.json();
            let availableDates = datesData.results || [];

            // Filter – last 7 days + future, limit 30
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 7);
            const cutoffStr = cutoff.toISOString().split('T')[0];

            availableDates = availableDates
                .filter(d => d.date >= cutoffStr)
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 30);

            const totalDates = availableDates.length;
            progressMessage.textContent = `${totalDates} Tage gefunden. Lade Details...`;

            // 2. Fetch details for each date
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
                        // Debug: log raw API response for first date
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
                            // Debug: log first item structure
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
                // Small delay to avoid rate limiting
                await new Promise(r => setTimeout(r, 100));
            }

            // 3. Group by ISO week (Merge with existing to preserve past days)
            const weeksMap = new Map();

            // Hydrate from existing cache (preserve past data)
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

                // Merge: Overwrite if exists, push if new
                const existingIndex = weekObj.days.findIndex(existing => existing.date === day.date);
                if (existingIndex >= 0) {
                    weekObj.days[existingIndex] = newDayObj;
                } else {
                    weekObj.days.push(newDayObj);
                }
            }

            // Sort weeks and days
            allWeeks = Array.from(weeksMap.values()).sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.weekNumber - b.weekNumber;
            });
            allWeeks.forEach(w => {
                if (w.days) w.days.sort((a, b) => a.date.localeCompare(b.date));
            });

            // Save to localStorage cache
            saveMenuCache();

            // Update timestamp
            updateLastUpdatedTime(new Date().toISOString());

            currentWeekNumber = getISOWeek(new Date());
            currentYear = new Date().getFullYear();



            updateAuthUI(); // This will trigger fetchOrders if logged in
            renderVisibleWeeks();
            updateNextWeekBadge();

            progressMessage.textContent = 'Fertig!';
            setTimeout(() => progressModal.classList.add('hidden'), 500);

        } catch (error) {
            console.error('Error fetching menu:', error);
            progressModal.classList.add('hidden');

            showErrorModal(
                'Keine Verbindung',
                `Die Menüdaten konnten nicht geladen werden. Möglicherweise besteht keine Verbindung zur API oder zur Bessa-Webseite.<br><br><small style="color:var(--text-secondary)">${error.message}</small>`,
                'Zur Original-Seite',
                'https://web.bessa.app/knapp-kantine'
            );
        } finally {
            loading.classList.add('hidden');
        }
    }

    // === Last Updated Display ===
    function updateLastUpdatedTime(isoTimestamp) {
        const subtitle = document.getElementById('last-updated-subtitle');
        if (!isoTimestamp) return;
        try {
            const date = new Date(isoTimestamp);
            const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
            subtitle.textContent = `Aktualisiert: ${dateStr} ${timeStr}`;
        } catch (e) {
            subtitle.textContent = '';
        }
    }

    // === Toast Notification ===
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
        toast.innerHTML = `<span class="material-icons-round">${icon}</span><span>${message}</span>`;
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // === Next Week Badge ===
    function updateNextWeekBadge() {
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

            // Format: ( Ordered / Orderable / Total )
            badge.title = `${daysWithOrders} bestellt / ${orderableCount} bestellbar / ${totalDataCount} gesamt`;
            badge.innerHTML = `<span class="ordered">${daysWithOrders}</span><span class="separator">/</span><span class="orderable">${orderableCount}</span><span class="separator">/</span><span class="total">${totalDataCount}</span>`;

            // Color Logic
            badge.classList.remove('badge-violet', 'badge-green', 'badge-red', 'badge-blue');

            // Refined Logic (v1.7.4):
            // Violet: If we have orders AND there are no DAYS left that are orderable but un-ordered.
            // (i.e. "I have ordered everything I can")
            if (daysWithOrders > 0 && daysWithOrderableAndNoOrder === 0) {
                badge.classList.add('badge-violet');
            } else if (daysWithOrderableAndNoOrder > 0) {
                badge.classList.add('badge-green'); // Orderable days exist without order
            } else if (orderableCount === 0) {
                badge.classList.add('badge-red'); // No orderable days at all & no orders
            } else {
                badge.classList.add('badge-blue'); // Default / partial state
            }

            // Advanced Feature: Highlight Count
            let highlightCount = 0;
            if (nextWeekData && nextWeekData.days) {
                nextWeekData.days.forEach(day => {
                    day.items.forEach(item => {
                        if (checkHighlight(item.name) || checkHighlight(item.description)) {
                            highlightCount++;
                        }
                    });
                });
            }

            if (highlightCount > 0) {
                // Append blue count
                badge.innerHTML += `<span class="highlight-count" title="${highlightCount} Highlight Menüs">(${highlightCount})</span>`;
                badge.title += ` • ${highlightCount} Highlights gefunden`;
                badge.classList.add('has-highlights');
            }

        } else if (badge) {
            badge.remove();
        }
    }

    // === Weekly Cost ===
    function updateWeeklyCost(days) {
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

    // === Render Weeks ===
    function renderVisibleWeeks() {
        const menuContainer = document.getElementById('menu-container');
        if (!menuContainer) return;
        menuContainer.innerHTML = '';

        let targetWeek = currentWeekNumber;
        let targetYear = currentYear;

        if (displayMode === 'next-week') {
            targetWeek++;
            if (targetWeek > 52) { targetWeek = 1; targetYear++; }
        }

        // Flatten & filter by week + year
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

        // Update header
        const headerWeekInfo = document.getElementById('header-week-info');
        const weekTitle = displayMode === 'this-week' ? 'Diese Woche' : 'Nächste Woche';
        headerWeekInfo.innerHTML = `
            <div class="header-week-title">${weekTitle}</div>
            <div class="header-week-subtitle">Week ${targetWeek} • ${targetYear}</div>`;

        const grid = document.createElement('div');
        grid.className = 'days-grid';

        daysInTargetWeek.sort((a, b) => a.date.localeCompare(b.date));

        // Filter weekends
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

    // === Sync Item Heights ===
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

    // === Create Day Card ===
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

        // Collect ordered menu codes
        const menuBadges = [];
        if (day.items) {
            day.items.forEach(item => {
                const articleId = item.articleId || parseInt(item.id.split('_')[1]);
                const orderKey = `${day.date}_${articleId}`;
                const orders = orderMap.get(orderKey) || [];
                const count = orders.length;

                if (count > 0) {
                    // Regex for M1, M2, M1F etc.
                    const match = item.name.match(/([M][1-9][Ff]?)/);
                    if (match) {
                        let code = match[1];
                        if (count > 1) code += '+';
                        menuBadges.push(code);
                    }
                }
            });
        }

        // Header
        const header = document.createElement('div');
        header.className = 'card-header';
        const dateStr = cardDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

        const badgesHtml = menuBadges.map(code => `<span class="menu-code-badge">${code}</span>`).join('');

        // Determine Day Status for Header Color
        // Violet: Has Order
        // Green: No Order but Orderable
        // Red: No Order and Not Orderable (Locked/Sold Out)
        let headerClass = '';
        const hasAnyOrder = day.items && day.items.some(item => {
            const articleId = item.articleId || parseInt(item.id.split('_')[1]);
            const key = `${day.date}_${articleId}`;
            return orderMap.has(key) && orderMap.get(key).length > 0;
        });

        const hasOrderable = day.items && day.items.some(item => {
            // Use pre-calculated available flag from loadMenuDataFromAPI calculation
            return item.available;
        });

        if (hasAnyOrder) {
            headerClass = 'header-violet';
        } else if (hasOrderable && !isPastCutoff) {
            headerClass = 'header-green';
        } else {
            // Red if not orderable (or past cutoff)
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

        // Body
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

            // Status badge
            let statusBadge = '';
            if (item.available) {
                statusBadge = item.amountTracking
                    ? `<span class="badge available">Verfügbar (${item.availableAmount})</span>`
                    : `<span class="badge available">Verfügbar</span>`;
            } else {
                statusBadge = `<span class="badge sold-out">Ausverkauft</span>`;
            }

            // Order badge
            let orderedBadge = '';
            if (orderCount > 0) {
                const countBadge = orderCount > 1 ? `<span class="order-count-badge">${orderCount}</span>` : '';
                orderedBadge = `<span class="badge ordered"><span class="material-icons-round">check_circle</span> Bestellt${countBadge}</span>`;
                itemEl.classList.add('ordered');
                if (new Date(day.date).toDateString() === now.toDateString()) {
                    itemEl.classList.add('today-ordered');
                }
            }

            // Flagged styles
            const flagId = `${day.date}_${articleId}`;
            const isFlagged = userFlags.has(flagId);
            if (isFlagged) {
                itemEl.classList.add(item.available ? 'flagged-available' : 'flagged-sold-out');
            }

            // Highlight matching menu items based on user tags
            if (checkHighlight(item.name) || checkHighlight(item.description)) {
                itemEl.classList.add('highlight-glow');
            }

            // Action buttons
            let orderButton = '';
            let cancelButton = '';
            let flagButton = '';

            if (authToken && !isPastCutoff) {
                // Flag button
                const flagIcon = isFlagged ? 'notifications_active' : 'notifications_none';
                const flagClass = isFlagged ? 'btn-flag active' : 'btn-flag';
                const flagTitle = isFlagged ? 'Benachrichtigung deaktivieren' : 'Benachrichtigen wenn verfügbar';
                if (!item.available || isFlagged) {
                    flagButton = `<button class="${flagClass}" data-date="${day.date}" data-article="${articleId}" data-name="${escapeHtml(item.name)}" data-cutoff="${day.orderCutoff}" title="${flagTitle}"><span class="material-icons-round">${flagIcon}</span></button>`;
                }

                // Order button
                if (item.available) {
                    if (orderCount > 0) {
                        orderButton = `<button class="btn-order btn-order-compact" data-date="${day.date}" data-article="${articleId}" data-name="${escapeHtml(item.name)}" data-price="${item.price}" data-desc="${escapeHtml(item.description || '')}" title="${escapeHtml(item.name)} nochmal bestellen"><span class="material-icons-round">add</span></button>`;
                    } else {
                        orderButton = `<button class="btn-order" data-date="${day.date}" data-article="${articleId}" data-name="${escapeHtml(item.name)}" data-price="${item.price}" data-desc="${escapeHtml(item.description || '')}" title="${escapeHtml(item.name)} bestellen"><span class="material-icons-round">add_shopping_cart</span> Bestellen</button>`;
                    }
                }

                // Cancel button
                if (orderCount > 0) {
                    const cancelIcon = orderCount === 1 ? 'close' : 'remove';
                    const cancelTitle = orderCount === 1 ? 'Bestellung stornieren' : 'Eine Bestellung stornieren';
                    cancelButton = `<button class="btn-cancel" data-date="${day.date}" data-article="${articleId}" data-name="${escapeHtml(item.name)}" title="${cancelTitle}"><span class="material-icons-round">${cancelIcon}</span></button>`;
                }
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
                <p class="item-desc">${escapeHtml(item.description)}</p>`;

            // Event: Order
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

            // Event: Cancel
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

            // Event: Flag
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

    // === Version Check ===
    async function checkForUpdates() {
        const CurrentVersion = '{{VERSION}}';
        const VersionUrl = 'https://raw.githubusercontent.com/TauNeutrino/kantine-overview/main/version.txt';
        const InstallerUrl = 'https://htmlpreview.github.io/?https://github.com/TauNeutrino/kantine-overview/blob/main/dist/install.html';

        console.log(`[Kantine] Checking for updates... (Current: ${CurrentVersion})`);

        try {
            const response = await fetch(VersionUrl, { cache: 'no-cache' });
            if (!response.ok) return;

            const remoteVersion = (await response.text()).trim();

            if (remoteVersion && remoteVersion !== CurrentVersion) {
                console.log(`[Kantine] New version available: ${remoteVersion}`);

                // Fetch Changelog content
                let changeSummary = '';
                try {
                    const clResp = await fetch('https://raw.githubusercontent.com/TauNeutrino/kantine-overview/main/changelog.md');
                    if (clResp.ok) {
                        const clText = await clResp.text();
                        const match = clText.match(/## (v[^\n]+)\n((?:-[^\n]+\n)+)/);
                        if (match && match[1].includes(remoteVersion)) {
                            changeSummary = match[2].replace(/- /g, '• ').trim();
                        }
                    }
                } catch (e) { console.warn('No changelog', e); }

                // Create Banner
                const updateBanner = document.createElement('div');
                updateBanner.className = 'update-banner';
                updateBanner.innerHTML = `
                        <div class="update-content">
                            <strong>Update verfügbar: ${remoteVersion}</strong>
                            ${changeSummary ? `<pre class="change-summary">${changeSummary}</pre>` : ''}
                            <a href="${InstallerUrl}" target="_blank" class="update-link">
                                <span class="material-icons-round">system_update_alt</span>
                                Jetzt aktualisieren
                            </a>
                        </div>
                        <button class="icon-btn-small close-update">&times;</button>
                    `;

                document.body.appendChild(updateBanner);
                updateBanner.querySelector('.close-update').addEventListener('click', () => updateBanner.remove());

                // Highlight Header Icon -> Make Clickable
                const lastUpdatedIcon = document.querySelector('.material-icons-round.logo-icon');
                if (lastUpdatedIcon) {
                    const updateLink = document.createElement('a');
                    updateLink.href = InstallerUrl;
                    updateLink.target = '_blank';
                    updateLink.className = 'material-icons-round logo-icon update-pulse';
                    updateLink.style.color = 'var(--accent-color)';
                    updateLink.style.textDecoration = 'none';
                    updateLink.style.cursor = 'pointer';
                    updateLink.title = `Update verfügbar: ${remoteVersion}`;
                    updateLink.textContent = 'system_update'; // Change icon to update icon

                    lastUpdatedIcon.replaceWith(updateLink);
                }
            }
} catch (error) {
    console.warn('[Kantine] Version check failed:', error);
}
    }

// === Order Countdown ===
function updateCountdown() {
    const now = new Date();
    const currentDay = now.getDay();
    // Skip weekends (0=Sun, 6=Sat)
    if (currentDay === 0 || currentDay === 6) {
        removeCountdown();
        return;
    }

    const todayStr = now.toISOString().split('T')[0];

    // 1. Check if we already ordered for today
    let hasOrder = false;
    // Optimization: Check orderMap for today's date
    // Keys are "YYYY-MM-DD_ArticleID"
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

    // 2. Calculate time to cutoff (10:00 AM)
    const cutoff = new Date();
    cutoff.setHours(10, 0, 0, 0);

    const diff = cutoff - now;

    // If passed cutoff or more than 3 hours away (e.g. 07:00), maybe don't show?
    // User req: "heute noch keine bestellung... countdown erscheinen"
    // Let's show it if within valid order window (e.g. 00:00 - 10:00)

    if (diff <= 0) {
        removeCountdown();
        return;
    }

    // 3. Render Countdown
    const diffHrs = Math.floor(diff / 3600000);
    const diffMins = Math.floor((diff % 3600000) / 60000);

    const headerCenter = document.querySelector('.header-center-wrapper');
    if (!headerCenter) return;

    let countdownEl = document.getElementById('order-countdown');
    if (!countdownEl) {
        countdownEl = document.createElement('div');
        countdownEl.id = 'order-countdown';
        // Insert before cost display or append
        headerCenter.insertBefore(countdownEl, headerCenter.firstChild);
    }

    countdownEl.innerHTML = `<span>Bestellschluss:</span> <strong>${diffHrs}h ${diffMins}m</strong>`;

    // Red Alert if < 1 hour
    if (diff < 3600000) { // 1 hour
        countdownEl.classList.add('urgent');

        // Notification logic (One time)
        const notifiedKey = `kantine_notified_${todayStr}`;
        if (!sessionStorage.getItem(notifiedKey)) {
            if (Notification.permission === 'granted') {
                new Notification('Kantine: Bestellschluss naht!', {
                    body: 'Du hast heute noch nichts bestellt. Nur noch 1 Stunde!',
                    icon: '⏳'
                });
            } else if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
            sessionStorage.setItem(notifiedKey, 'true');
        }
    } else {
        countdownEl.classList.remove('urgent');
    }
}

function removeCountdown() {
    const el = document.getElementById('order-countdown');
    if (el) el.remove();
}

// Update countdown every minute
setInterval(updateCountdown, 60000);
// Also update on load
setTimeout(updateCountdown, 1000);

// === Helpers === 
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


function translateDay(englishDay) {
    const map = { Monday: 'Montag', Tuesday: 'Dienstag', Wednesday: 'Mittwoch', Thursday: 'Donnerstag', Friday: 'Freitag', Saturday: 'Samstag', Sunday: 'Sonntag' };
    return map[englishDay] || englishDay;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// === Bootstrap ===
injectUI();
bindEvents();
updateAuthUI();
cleanupExpiredFlags();

// Load cached data first for instant UI, then refresh from API
const hadCache = loadMenuCache();
if (hadCache) {
    // Hide loading spinner since cache is shown
    document.getElementById('loading').classList.add('hidden');
}
loadMenuDataFromAPI();

// Auto-start polling if already logged in
if (authToken) {
    startPolling();
}

// Check for updates
checkForUpdates();

console.log('Kantine Wrapper loaded ✅');
}) ();

// === Error Modal ===
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
                        ${title}
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
                            ${btnText}
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
