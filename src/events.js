import { displayMode, langMode, authToken, currentUser, orderMap, userFlags, pollIntervalId, setLangMode, setDisplayMode, setAuthToken, setCurrentUser, setOrderMap } from './state.js';
import { updateAuthUI, loadMenuDataFromAPI, fetchOrders, startPolling, stopPolling, fetchFullOrderHistory, addHighlightTag, renderTagsList, refreshFlaggedItems } from './actions.js';
import { renderVisibleWeeks, openVersionMenu } from './ui_helpers.js';
import { API_BASE, GUEST_TOKEN } from './constants.js';
import { apiHeaders } from './api.js';

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

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setLangMode(btn.dataset.lang);
            localStorage.setItem('kantine_lang', btn.dataset.lang);
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
                localStorage.setItem('kantine_authToken', data.key);
                localStorage.setItem('kantine_currentUser', employeeId);

                try {
                    const userResp = await fetch(`${API_BASE}/auth/user/`, {
                        headers: apiHeaders(data.key)
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
        localStorage.removeItem('kantine_authToken');
        localStorage.removeItem('kantine_currentUser');
        localStorage.removeItem('kantine_firstName');
        localStorage.removeItem('kantine_lastName');
        setAuthToken(null);
        setCurrentUser(null);
        setOrderMap(new Map());
        stopPolling();
        updateAuthUI();
        renderVisibleWeeks();
    });
}
