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
    const CLIENT_VERSION = 'v1.6.10';
    const VENUE_ID = 591;
    const MENU_ID = 7;
    const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

    // === GitHub Release Management ===
    const GITHUB_REPO = 'TauNeutrino/kantine-overview';
    const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}`;
    const INSTALLER_BASE = `https://htmlpreview.github.io/?https://github.com/${GITHUB_REPO}/blob`;

    // === State ===
    let allWeeks = [];
    let currentWeekNumber = getISOWeek(new Date());
    let currentYear = new Date().getFullYear();
    let displayMode = 'this-week';
    let authToken = localStorage.getItem('kantine_authToken');
    let currentUser = localStorage.getItem('kantine_currentUser');
    let orderMap = new Map();
    let userFlags = new Set(JSON.parse(localStorage.getItem('kantine_flags') || '[]'));
    let pollIntervalId = null;
    let langMode = localStorage.getItem('kantine_lang') || 'de';

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

        // Inject custom favicon (triangle + fork & knife PNG)
        if (document.querySelectorAll) {
            document.querySelectorAll('link[rel*="icon"]').forEach(el => el.remove());
        }
        const favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.type = 'image/png';
        favicon.href = '{{FAVICON_DATA_URI}}';
        document.head.appendChild(favicon);

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
                        <div id="lang-toggle" class="lang-toggle" title="Sprache der Menübeschreibung">
                            <button class="lang-btn${langMode === 'de' ? ' active' : ''}" data-lang="de">DE</button>
                            <button class="lang-btn${langMode === 'en' ? ' active' : ''}" data-lang="en">EN</button>
                            <button class="lang-btn${langMode === 'all' ? ' active' : ''}" data-lang="all">ALL</button>
                        </div>
                        <div id="header-week-info" class="header-week-info"></div>
                        <div id="weekly-cost-display" class="weekly-cost hidden"></div>
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
                            <!-- Dynamically populated -->
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

        // History Modal
        const btnHistory = document.getElementById('btn-history');
        const historyModal = document.getElementById('history-modal');
        const btnHistoryClose = document.getElementById('btn-history-close');

        // Language Toggle
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                langMode = btn.dataset.lang;
                localStorage.setItem('kantine_lang', langMode);
                document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderVisibleWeeks();
            });
        });

        if (btnHighlights) {
            btnHighlights.addEventListener('click', () => {
                highlightsModal.classList.remove('hidden');
            });
        }

        if (btnHighlightsClose) {
            btnHighlightsClose.addEventListener('click', () => {
                highlightsModal.classList.add('hidden');
            });
        }

        btnHistory.addEventListener('click', () => {
            if (!authToken) {
                loginModal.classList.remove('hidden');
                return;
            }
            historyModal.classList.remove('hidden');
            fetchFullOrderHistory();
        });

        btnHistoryClose.addEventListener('click', () => {
            historyModal.classList.add('hidden');
        });

        window.addEventListener('click', (e) => {
            if (e.target === historyModal) historyModal.classList.add('hidden');
            if (e.target === highlightsModal) highlightsModal.classList.add('hidden');
        });

        // Version Menu
        const versionTag = document.querySelector('.version-tag');
        const versionModal = document.getElementById('version-modal');
        const btnVersionClose = document.getElementById('btn-version-close');

        if (versionTag) {
            versionTag.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                openVersionMenu();
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
                    // Only clear our own keys so we don't destroy the host app's (Bessa's) session
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
            btnNextWeek.classList.remove('new-week-available');
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
                    localStorage.setItem('kantine_authToken', data.key);
                    localStorage.setItem('kantine_currentUser', employeeId);

                    // Fetch user name
                    try {
                        const userResp = await fetch(`${API_BASE}/auth/user/`, {
                            headers: apiHeaders(authToken)
                        });
                        if (userResp.ok) {
                            const userData = await userResp.json();
                            if (userData.first_name) localStorage.setItem('kantine_firstName', userData.first_name);
                            if (userData.last_name) localStorage.setItem('kantine_lastName', userData.last_name);
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
            localStorage.removeItem('kantine_authToken');
            localStorage.removeItem('kantine_currentUser');
            localStorage.removeItem('kantine_firstName');
            localStorage.removeItem('kantine_lastName');
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
                        localStorage.setItem('kantine_authToken', authToken);

                        if (parsed.auth.user) {
                            currentUser = parsed.auth.user.id || 'unknown';
                            localStorage.setItem('kantine_currentUser', currentUser);
                            if (parsed.auth.user.firstName) localStorage.setItem('kantine_firstName', parsed.auth.user.firstName);
                            if (parsed.auth.user.lastName) localStorage.setItem('kantine_lastName', parsed.auth.user.lastName);
                        }
                    }
                }
            } catch (e) {
                console.warn('Failed to parse AkitaStores:', e);
            }
        }

        authToken = localStorage.getItem('kantine_authToken');
        currentUser = localStorage.getItem('kantine_currentUser');
        const firstName = localStorage.getItem('kantine_firstName');
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
                updateNextWeekBadge();
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    }

    // === History Modal Flow ===
    let fullOrderHistoryCache = null;

    async function fetchFullOrderHistory() {
        const historyLoading = document.getElementById('history-loading');
        const historyContent = document.getElementById('history-content');
        const progressFill = document.getElementById('history-progress-fill');
        const progressText = document.getElementById('history-progress-text');

        // Check local storage cache (we still use memory cache if available)
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

        // Show cached version immediately if we have one
        if (localCache.length > 0) {
            renderHistory(localCache);
        }

        if (!authToken) return;

        // Start background delta sync
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
                    // Check if we hit an order that is already in our cache AND has the exact same state/update time
                    // Bessa returns 'updated' timestamp, we can use it to determine if anything changed
                    const existingOrderIndex = localCache.findIndex(cached => cached.id === order.id);

                    if (!requiresFullFetch && existingOrderIndex !== -1) {
                        const existingOrder = localCache[existingOrderIndex];
                        // If order exists and wasn't updated since our cache, we've reached the point 
                        // where everything older is already correctly cached.
                        // order.updated is an ISO string like "2026-03-09T18:30:15.123456Z"
                        if (existingOrder.updated === order.updated && existingOrder.order_state === order.order_state) {
                            deltaComplete = true;
                            break;
                        }
                    }
                    fetchedOrders.push(order);
                }

                // Update progress
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

            // Merge fetched orders with cache
            if (fetchedOrders.length > 0) {
                // We have new/updated orders. We need to merge them into the cache.
                // 1. Create a map of the existing cache for quick ID lookup
                const cacheMap = new Map(localCache.map(o => [o.id, o]));

                // 2. Update/Insert the newly fetched orders
                for (const order of fetchedOrders) {
                    cacheMap.set(order.id, order); // Overwrites existing, or adds new
                }

                // 3. Convert back to array and sort by created date (descending)
                const mergedOrders = Array.from(cacheMap.values());
                mergedOrders.sort((a, b) => new Date(b.created) - new Date(a.created));

                fullOrderHistoryCache = mergedOrders;
                try {
                    localStorage.setItem('kantine_history_cache', JSON.stringify(mergedOrders));
                } catch (e) {
                    console.warn('History cache write error', e);
                }

                // Render the updated history
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

    function renderHistory(orders) {
        const content = document.getElementById('history-content');
        if (!orders || orders.length === 0) {
            content.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:20px;">Keine Bestellungen gefunden.</p>';
            return;
        }

        // Group by Year -> Month -> Week Number (KW)
        const groups = {};

        orders.forEach(order => {
            const d = new Date(order.date);
            const y = d.getFullYear();
            const m = d.getMonth();
            const monthKey = `${y}-${m.toString().padStart(2, '0')}`;
            const monthName = d.toLocaleString('de-AT', { month: 'long' }); // Only month name

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
                    state: order.order_state // 9 is cancelled, 5 is active, 8 is completed
                });

                if (order.order_state !== 9) {
                    groups[y].months[monthKey].weeks[kw].count++;
                    groups[y].months[monthKey].weeks[kw].total += itemPrice;
                    groups[y].months[monthKey].count++;
                    groups[y].months[monthKey].total += itemPrice;
                }
            });
        });

        // Generate HTML 
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
                html += `</div></div>`; // Close month-content and month-group
            });
            html += `</div>`; // Close year-group
        });

        content.innerHTML = html;

        // Bind Accordion Click Events via JS
        const monthHeaders = content.querySelectorAll('.history-month-header');
        monthHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const parentGroup = header.parentElement;
                const isOpen = parentGroup.classList.contains('open');

                // Toggle current
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
                fullOrderHistoryCache = null; // Clear memory cache so next history open triggers delta sync
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
                fullOrderHistoryCache = null; // Clear memory cache so next history open triggers delta sync
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

    async function refreshFlaggedItems() {
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

                // Update allWeeks in memory
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

    function updateAlarmBell() {
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

        // Check if any flagged item is available
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

        let lastUpdatedStr = localStorage.getItem('kantine_last_updated');
        let timeStr = 'gerade eben'; // Fallback instead of Unbekannt
        if (!lastUpdatedStr) {
            lastUpdatedStr = new Date().toISOString();
            localStorage.setItem('kantine_last_updated', lastUpdatedStr);
        }

        const lastUpdated = new Date(lastUpdatedStr);
        timeStr = getRelativeTime(lastUpdated);

        bellBtn.title = `Zuletzt geprüft: ${timeStr}`;

        if (anyAvailable) {
            bellIcon.style.color = '#10b981'; // green / success
            bellIcon.style.textShadow = '0 0 10px rgba(16, 185, 129, 0.4)';
        } else {
            bellIcon.style.color = '#f59e0b'; // yellow / warning
            bellIcon.style.textShadow = '0 0 10px rgba(245, 158, 11, 0.4)';
        }
    }

    function toggleFlag(date, articleId, name, cutoff) {
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

    // FR-019: Auto-remove flags whose cutoff has passed
    function cleanupExpiredFlags() {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD
        let changed = false;

        for (const flagId of [...userFlags]) {
            const [dateStr] = flagId.split('_'); // Format usually is YYYY-MM-DD

            // If the flag's date string is entirely in the past (before today)
            // or if it's today but past the 10:00 cutoff time
            let isExpired = false;

            if (dateStr < todayStr) {
                isExpired = true;
            } else if (dateStr === todayStr) {
                const cutoff = new Date(dateStr);
                cutoff.setHours(10, 0, 0, 0); // Standard cutoff 10:00
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
        // Update timestamp after successful polling cycle
        updateLastUpdatedTime(new Date().toISOString());
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
            badge.innerHTML = `${tag} <span class="tag-remove" data-tag="${tag}" title="Schlagwort entfernen">&times;</span>`;
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
        if (!text) return [];
        text = text.toLowerCase();
        return highlightTags.filter(tag => text.includes(tag));
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
            console.log(`[Cache] localStorage: key=${!!cached} (${cached ? cached.length : 0} chars), ts=${cachedTs}`);
            if (cached) {
                allWeeks = JSON.parse(cached);
                currentWeekNumber = getISOWeek(new Date());
                currentYear = new Date().getFullYear();
                console.log(`[Cache] Parsed ${allWeeks.length} weeks:`, allWeeks.map(w => `KW${w.weekNumber}/${w.year} (${(w.days || []).length} days)`));
                renderVisibleWeeks();
                updateNextWeekBadge();
                updateAlarmBell();
                if (cachedTs) updateLastUpdatedTime(cachedTs);

                // --- TEMP DEBUG LOGGER ---
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

    // FR-024: Check if cache is fresh enough to skip API refresh
    function isCacheFresh() {
        const cachedTs = localStorage.getItem(CACHE_TS_KEY);
        if (!cachedTs) {
            console.log('[Cache] No timestamp found');
            return false;
        }

        // Condition 1: Cache < 1 hour old
        const ageMs = Date.now() - new Date(cachedTs).getTime();
        const ageMin = Math.round(ageMs / 60000);
        if (ageMs > 60 * 60 * 1000) {
            console.log(`[Cache] Stale: ${ageMin}min old (max 60)`);
            return false;
        }

        // Condition 2: Data for current week exists
        const thisWeek = getISOWeek(new Date());
        const thisYear = getWeekYear(new Date());
        const hasCurrentWeek = allWeeks.some(w => w.weekNumber === thisWeek && w.year === thisYear && w.days && w.days.length > 0);

        console.log(`[Cache] Age: ${ageMin}min, looking for KW${thisWeek}/${thisYear}, found: ${hasCurrentWeek}`);
        return hasCurrentWeek;
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
            updateAlarmBell();

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
    let lastUpdatedTimestamp = null;
    let lastUpdatedIntervalId = null;

    function updateLastUpdatedTime(isoTimestamp) {
        const subtitle = document.getElementById('last-updated-subtitle');
        if (!isoTimestamp) return;
        lastUpdatedTimestamp = isoTimestamp;
        localStorage.setItem('kantine_last_updated', isoTimestamp); // Persist for session-over-tab consistency
        try {
            const date = new Date(isoTimestamp);
            const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
            const ago = getRelativeTime(date);
            subtitle.textContent = `Aktualisiert: ${dateStr} ${timeStr} (${ago})`;
        } catch (e) {
            subtitle.textContent = '';
        }
        // Auto-refresh relative time every minute
        if (!lastUpdatedIntervalId) {
            lastUpdatedIntervalId = setInterval(() => {
                if (lastUpdatedTimestamp) {
                    updateLastUpdatedTime(lastUpdatedTimestamp);
                    updateAlarmBell(); // Ensure bell icon title (tooltip) also refreshes
                }
            }, 60 * 1000);
        }
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
                        const nameMatches = checkHighlight(item.name);
                        const descMatches = checkHighlight(item.description);
                        if (nameMatches.length > 0 || descMatches.length > 0) {
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

            // FR-092: Glow Next Week button while data exists but no orders placed
            if (daysWithOrders === 0) {
                btnNextWeek.classList.add('new-week-available');
                // One-time toast notification when new data first arrives
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
            const matchedTags = [...new Set([...checkHighlight(item.name), ...checkHighlight(item.description)])];
            if (matchedTags.length > 0) {
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

            // Build matched-tags HTML (only if tags found)
            let tagsHtml = '';
            if (matchedTags.length > 0) {
                const badges = matchedTags.map(t => `<span class="tag-badge-small"><span class="material-icons-round" style="font-size:10px;margin-right:2px">star</span>${escapeHtml(t)}</span>`).join('');
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

    // === GitHub Release Management ===

    // Semver comparison: returns true if remote > local
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

    // GitHub API headers
    function githubHeaders() {
        return { 'Accept': 'application/vnd.github.v3+json' };
    }

    // Fetch versions from GitHub (releases or tags)
    async function fetchVersions(devMode) {
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

        // Normalize to common format: { tag, name, url, body }
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

    // Periodic update check (runs on init + every hour)
    async function checkForUpdates() {
        const currentVersion = '{{VERSION}}';
        const devMode = localStorage.getItem('kantine_dev_mode') === 'true';

        try {
            const versions = await fetchVersions(devMode);
            if (!versions.length) return;

            // Cache for version menu
            localStorage.setItem('kantine_version_cache', JSON.stringify({
                timestamp: Date.now(), devMode, versions
            }));

            const latest = versions[0].tag;
            console.log(`[Kantine] Version Check: Local [${currentVersion}] vs Latest [${latest}] (${devMode ? 'dev' : 'stable'})`);

            if (!isNewer(latest, currentVersion)) return;

            console.log(`[Kantine] Update verfügbar: ${latest}`);

            // Show 🆕 icon in header (only once)
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

    // Open Version Menu modal
    function openVersionMenu() {
        const modal = document.getElementById('version-modal');
        const container = document.getElementById('version-list-container');
        const devToggle = document.getElementById('dev-mode-toggle');
        const currentVersion = '{{VERSION}}';

        if (!modal) return;
        modal.classList.remove('hidden');

        // Set current version display
        const cur = document.getElementById('version-current');
        if (cur) cur.textContent = currentVersion;

        // Init dev toggle
        const devMode = localStorage.getItem('kantine_dev_mode') === 'true';
        devToggle.checked = devMode;

        // Load versions (from cache or fresh)
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
                        action = `<a href="${v.url}" target="_blank" class="install-link" title="${v.tag} installieren">Installieren</a>`;
                    }

                    li.innerHTML = `
                        <div class="version-info">
                            <strong>${v.tag}</strong>
                            ${badge}
                        </div>
                        ${action}
                    `;
                    list.appendChild(li);
                });
            }

            try {
                // 1. Show cached versions immediately if available
                const cachedRaw = localStorage.getItem('kantine_version_cache');
                let cached = null;
                if (cachedRaw) {
                    try { cached = JSON.parse(cachedRaw); } catch (e) { }
                }

                if (cached && cached.devMode === dm && cached.versions) {
                    renderVersionsList(cached.versions);
                }

                // 2. Fetch fresh versions in background (or foreground if no cache)
                const liveVersions = await fetchVersions(dm);

                // Compare with cache to see if we need to re-render
                const liveVersionsStr = JSON.stringify(liveVersions);
                const cachedVersionsStr = cached ? JSON.stringify(cached.versions) : '';

                if (liveVersionsStr !== cachedVersionsStr) {
                    localStorage.setItem('kantine_version_cache', JSON.stringify({
                        timestamp: Date.now(), devMode: dm, versions: liveVersions
                    }));
                    renderVersionsList(liveVersions);
                }

            } catch (e) {
                container.innerHTML = `<p style="color:#e94560;">Fehler: ${e.message}</p>`;
            }
        }

        loadVersions(false);

        // Dev toggle handler
        devToggle.onchange = () => {
            localStorage.setItem('kantine_dev_mode', devToggle.checked);
            // Clear cache to force refresh when mode changes
            localStorage.removeItem('kantine_version_cache');
            loadVersions(true);
        };
    }

    // === Order Countdown ===
    function updateCountdown() {
        // Only show order alarms for logged-in users
        if (!authToken || !currentUser) {
            removeCountdown();
            return;
        }

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

    // === Language Filter (FR-100) ===
    // DE stems for fallback language detection
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

    /**
     * Splits bilingual menu text into DE and EN parts.
     * Pattern per course: [DE] / [EN](ALLERGENS)
     * Max 3 courses per menu item (sanity check).
     * @param {string} text - The bilingual description text
     * @returns {{ de: string, en: string, raw: string }}
     */
    function splitLanguage(text) {
        if (!text) return { de: '', en: '', raw: '' };

        const raw = text;
        // Formatting: add • for new lines, avoiding dots before slashes
        let formattedRaw = text.replace(/(?:\(|(?:\/|\s|^))([A-Z,]+)\)\s*(?=\S)(?!\s*\/)/g, '($1)\n• ');
        if (!formattedRaw.startsWith('• ')) {
            formattedRaw = '• ' + formattedRaw;
        }

        // Utility to compute DE/EN score for a subset of words
        function scoreBlock(wordArray) {
            let de = 0, en = 0;
            wordArray.forEach(word => {
                const w = word.toLowerCase().replace(/[^a-zäöüß]/g, '');
                if (w) {
                    let bestDeMatch = 0;
                    let bestEnMatch = 0;
                    // Full match is better than partial string match
                    if (DE_STEMS.includes(w)) bestDeMatch = w.length;
                    else DE_STEMS.forEach(s => { if (w.includes(s) && s.length > bestDeMatch) bestDeMatch = s.length; });

                    if (EN_STEMS.includes(w)) bestEnMatch = w.length;
                    else EN_STEMS.forEach(s => { if (w.includes(s) && s.length > bestEnMatch) bestEnMatch = s.length; });

                    if (bestDeMatch > 0) de += (bestDeMatch / w.length);
                    if (bestEnMatch > 0) en += (bestEnMatch / w.length);

                    // Capitalized noun heuristic matches German text styles typically
                    if (/^[A-ZÄÖÜ]/.test(word)) {
                        de += 0.5;
                    }
                }
            });
            return { de, en };
        }

        // Heuristic sliding window to split a fragment containing "EN DE"
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
                // Nouns are capitalized in German
                if (/^[A-ZÄÖÜ]/.test(rightFirstWord)) {
                    capitalBonus = 1.0;
                }

                const score = (leftScore.en - leftScore.de) + (rightScore.de - rightScore.en) + capitalBonus;

                // Mandatory check: The assumed English part must actually look reasonably like English (or at least more so than the right part)
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

        // Match courses: Any text followed by an allergen marker "(...)" but NOT if followed by a slash.
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

        // 2. Process each course individually
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

            // A) Split by slash if present
            const slashParts = courseText.split(/\s*\/\s*(?![A-Z,]+$)/);

            if (slashParts.length >= 2) {
                // Potential DE / EN pair
                const deCandidate = slashParts[0].trim();
                let enCandidate = slashParts.slice(1).join(' / ').trim();

                // Check for nested German in English part (e.g. "Pumpkin cream Achtung...")
                const nestedSplit = heuristicSplitEnDe(enCandidate);
                if (nestedSplit.nextDe) {
                    // Transition back to German found!
                    deParts.push(deCandidate + allergenTxt);
                    enParts.push(nestedSplit.enPart + allergenTxt);

                    // Push the nested German part as a new standalone course (fallback to itself)
                    const nestedDe = nestedSplit.nextDe + allergenTxt;
                    deParts.push(nestedDe);
                    enParts.push(nestedDe);
                } else {
                    // Happy path: standard DE / EN
                    // Avoid double allergens if they were on both sides already
                    const enFinal = enCandidate + allergenTxt;
                    const deFinal = deCandidate.includes(allergenTxt.trim()) ? deCandidate : (deCandidate + allergenTxt);

                    deParts.push(deFinal);
                    enParts.push(enFinal);
                }
            } else {
                // B) No slash found: Either missing translation or "EN DE" mixed
                const heuristicSplit = heuristicSplitEnDe(courseText);
                if (heuristicSplit.nextDe) {
                    enParts.push(heuristicSplit.enPart + allergenTxt);
                    deParts.push(heuristicSplit.nextDe + allergenTxt);
                } else {
                    // Fallback: Use same chunk for both
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

    /**
     * Returns text filtered by the current language mode.
     * @param {string} text - The bilingual text
     * @returns {string}
     */
    function getLocalizedText(text) {
        if (langMode === 'all') return text || '';
        const split = splitLanguage(text);
        if (langMode === 'en') return split.en || split.raw;
        return split.de || split.raw; // 'de' is default
    }

    // === Bootstrap ===
    injectUI();
    bindEvents();
    updateAuthUI();
    cleanupExpiredFlags();

    // Load cached data first for instant UI, refresh only if stale (FR-024)
    const hadCache = loadMenuCache();
    if (hadCache) {
        document.getElementById('loading').classList.add('hidden');
        if (!isCacheFresh()) {
            console.log('Cache stale or incomplete – refreshing from API');
            loadMenuDataFromAPI();
        } else {
            console.log('Cache fresh & complete – skipping API refresh');
        }
    } else {
        loadMenuDataFromAPI();
    }

    // Auto-start polling if already logged in
    if (authToken) {
        startPolling();
    }

    // Check for updates (now + every hour)
    checkForUpdates();
    setInterval(checkForUpdates, 60 * 60 * 1000);

    console.log('Kantine Wrapper loaded ✅');
})();

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
