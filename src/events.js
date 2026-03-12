import { displayMode, langMode, authToken, currentUser, orderMap, userFlags, pollIntervalId, setLangMode, setDisplayMode, setAuthToken, setCurrentUser, setOrderMap } from './state.js';
import { updateAuthUI, loadMenuDataFromAPI, fetchOrders, startPolling, stopPolling, fetchFullOrderHistory, addHighlightTag, renderTagsList, refreshFlaggedItems } from './actions.js';
import { renderVisibleWeeks, openVersionMenu, updateNextWeekBadge, updateAlarmBell, syncMenuItemHeights } from './ui_helpers.js';
import { API_BASE, GUEST_TOKEN, LS } from './constants.js';
import { apiHeaders } from './api.js';
import { t } from './i18n.js';
import { debounce } from './utils.js';

/**
 * Updates all static UI labels/tooltips to match the current language.
 * Called when the user switches the language toggle.
 */
function updateUILanguage() {
    // Navigation buttons
    const btnThisWeek = document.getElementById('btn-this-week');
    const btnNextWeek = document.getElementById('btn-next-week');
    if (btnThisWeek) {
        btnThisWeek.textContent = t('thisWeek');
        btnThisWeek.title = t('thisWeekTooltip');
    }
    if (btnNextWeek) {
        btnNextWeek.textContent = t('nextWeek');
        // Tooltip will be re-set by updateNextWeekBadge()
    }

    // Header title
    const appTitle = document.querySelector('.header-left h1');
    if (appTitle) {
        const versionTag = appTitle.querySelector('.version-tag');
        const updateIcon = appTitle.querySelector('.update-icon');
        appTitle.textContent = t('appTitle') + ' ';
        if (versionTag) appTitle.appendChild(versionTag);
        if (updateIcon) appTitle.appendChild(updateIcon);
    }

    // Action button tooltips
    const btnRefresh = document.getElementById('btn-refresh');
    if (btnRefresh) btnRefresh.setAttribute('aria-label', t('refresh'));
    if (btnRefresh) btnRefresh.title = t('refresh');

    const btnHistory = document.getElementById('btn-history');
    if (btnHistory) btnHistory.setAttribute('aria-label', t('history'));
    if (btnHistory) btnHistory.title = t('history');

    const btnHighlights = document.getElementById('btn-highlights');
    if (btnHighlights) btnHighlights.setAttribute('aria-label', t('highlights'));
    if (btnHighlights) btnHighlights.title = t('highlights');

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.title = t('themeTooltip');

    // Login/Logout
    const btnLoginOpen = document.getElementById('btn-login-open');
    if (btnLoginOpen) {
        btnLoginOpen.title = t('loginTooltip');
        const loginText = btnLoginOpen.querySelector('span:last-child');
        if (loginText && !loginText.classList.contains('material-icons-round')) {
            loginText.textContent = t('login');
        }
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) btnLogout.title = t('logoutTooltip');

    // Language toggle tooltip
    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) langToggle.title = t('langTooltip');

    // Modal headers
    const highlightsHeader = document.querySelector('#highlights-modal .modal-header h2');
    if (highlightsHeader) highlightsHeader.textContent = t('highlightsTitle');
    const highlightsDesc = document.querySelector('#highlights-modal .modal-body > p');
    if (highlightsDesc) highlightsDesc.textContent = t('highlightsDesc');
    const tagInput = document.getElementById('tag-input');
    if (tagInput) {
        tagInput.placeholder = t('tagInputPlaceholder');
        tagInput.title = t('tagInputTooltip');
    }
    const btnAddTag = document.getElementById('btn-add-tag');
    if (btnAddTag) {
        btnAddTag.textContent = t('addTag');
        btnAddTag.title = t('addTagTooltip');
    }

    const historyHeader = document.querySelector('#history-modal .modal-header h2');
    if (historyHeader) historyHeader.textContent = t('historyTitle');

    const loginHeader = document.querySelector('#login-modal .modal-header h2');
    if (loginHeader) loginHeader.textContent = t('loginTitle');

    // Alarm bell
    const alarmBell = document.getElementById('alarm-bell');
    if (alarmBell && userFlags.size === 0) {
        alarmBell.title = t('alarmTooltipNone');
    }

    // Re-render dynamic parts that may use t()
    renderVisibleWeeks();
    updateNextWeekBadge();
    updateAlarmBell();
}

export function bindEvents() {
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
            setLangMode(btn.dataset.lang);
            localStorage.setItem(LS.LANG, btn.dataset.lang);
            document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (langDropdown) langDropdown.classList.add('hidden');
            updateUILanguage();
        });
    });

    if (btnHighlights) {
        btnHighlights.addEventListener('click', () => {
            renderTagsList();
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
        if (displayMode !== 'this-week') {
            setDisplayMode('this-week');
            btnThisWeek.classList.add('active');
            btnNextWeek.classList.remove('active');
            renderVisibleWeeks();
        }
    });

    btnNextWeek.addEventListener('click', () => {
        btnNextWeek.classList.remove('new-week-available');
        if (displayMode !== 'next-week') {
            setDisplayMode('next-week');
            btnNextWeek.classList.add('active');
            btnThisWeek.classList.remove('active');
            renderVisibleWeeks();
        }
    });

    btnRefresh.addEventListener('click', () => {
        if (!authToken) {
            loginModal.classList.remove('hidden');
            return;
        }
        loadMenuDataFromAPI();
    });

    const bellBtn = document.getElementById('alarm-bell');
    if (bellBtn) {
        bellBtn.addEventListener('click', () => {
            refreshFlaggedItems();
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
            const response = await fetch(`${API_BASE}/auth/login/`, {
                method: 'POST',
                headers: apiHeaders(GUEST_TOKEN),
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                setAuthToken(data.key);
                setCurrentUser(employeeId);
                localStorage.setItem(LS.AUTH_TOKEN, data.key);
                localStorage.setItem(LS.CURRENT_USER, employeeId);

                try {
                    const userResp = await fetch(`${API_BASE}/auth/user/`, {
                        headers: apiHeaders(data.key)
                    });
                    if (userResp.ok) {
                        const userData = await userResp.json();
                        if (userData.first_name) localStorage.setItem(LS.FIRST_NAME, userData.first_name);
                        if (userData.last_name) localStorage.setItem(LS.LAST_NAME, userData.last_name);
                    }
                } catch (err) {
                    console.error('Failed to fetch user info:', err);
                }

                updateAuthUI();
                loginModal.classList.add('hidden');
                fetchOrders();
                loginForm.reset();
                startPolling();
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

    btnLogout.addEventListener('click', () => {
        localStorage.removeItem(LS.AUTH_TOKEN);
        localStorage.removeItem(LS.CURRENT_USER);
        localStorage.removeItem(LS.FIRST_NAME);
        localStorage.removeItem(LS.LAST_NAME);
        setAuthToken(null);
        setCurrentUser(null);
        setOrderMap(new Map());
        stopPolling();
        updateAuthUI();
        renderVisibleWeeks();
    });

    // Sync heights on window resize (FR-Performance)
    window.addEventListener('resize', debounce(() => {
        const grid = document.querySelector('.days-grid');
        if (grid) syncMenuItemHeights(grid);
    }, 150));
}
