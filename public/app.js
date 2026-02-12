document.addEventListener('DOMContentLoaded', () => {
    // State
    let allWeeks = [];
    let currentWeekNumber = getISOWeek(new Date());
    let currentYear = new Date().getFullYear();
    let displayMode = 'this-week'; // 'this-week' or 'next-week'
    let authToken = sessionStorage.getItem('authToken');
    let currentUser = sessionStorage.getItem('currentUser');
    // orderMap: key = "date_articleId" -> value = [orderId, orderId, ...]
    let orderMap = new Map();
    // userFlags: Set of "date_articleId" that are flagged
    let userFlags = new Set();
    let eventSource = null; // Long-lived SSE connection

    // DOM Elements
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('.theme-icon');
    const loading = document.getElementById('loading');
    const menuContainer = document.getElementById('menu-container');
    const lastUpdatedBanner = document.getElementById('last-updated-banner');
    const lastUpdatedText = document.getElementById('last-updated-text');
    const btnThisWeek = document.getElementById('btn-this-week');
    const btnNextWeek = document.getElementById('btn-next-week');

    // Login Elements
    const btnLoginOpen = document.getElementById('btn-login-open');
    const btnLoginClose = document.getElementById('btn-login-close');
    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const userInfo = document.getElementById('user-info');
    const userIdDisplay = document.getElementById('user-id-display');
    const btnLogout = document.getElementById('btn-logout');

    // Refresh Elements
    const btnRefresh = document.getElementById('btn-refresh');
    const progressModal = document.getElementById('progress-modal');
    const progressFill = document.getElementById('progress-fill');
    const progressPercent = document.getElementById('progress-percent');
    const progressMessage = document.getElementById('progress-message');

    // === Theme Handling ===
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark' || (!savedTheme && prefersDarkScheme.matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeIcon.textContent = 'dark_mode';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        themeIcon.textContent = 'light_mode';
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeIcon.textContent = newTheme === 'dark' ? 'dark_mode' : 'light_mode';
    });

    // === Navigation handling ===
    btnThisWeek.addEventListener('click', () => {
        if (displayMode !== 'this-week') {
            displayMode = 'this-week';
            updateNavState();
            renderVisibleWeeks();
        }
    });

    btnNextWeek.addEventListener('click', () => {
        if (displayMode !== 'next-week') {
            displayMode = 'next-week';
            updateNavState();
            renderVisibleWeeks();
        }
    });

    function updateNavState() {
        if (displayMode === 'this-week') {
            btnThisWeek.classList.add('active');
            btnNextWeek.classList.remove('active');
        } else {
            btnThisWeek.classList.remove('active');
            btnNextWeek.classList.add('active');
        }
    }

    // === Login Handling ===
    btnLoginOpen.addEventListener('click', () => {
        loginModal.classList.remove('hidden');
        loginError.classList.add('hidden');
        loginForm.reset();
    });

    btnLoginClose.addEventListener('click', () => {
        loginModal.classList.add('hidden');
    });

    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.classList.add('hidden');
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const employeeId = document.getElementById('employee-id').value;
        const password = document.getElementById('password').value;

        loginError.classList.add('hidden');
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employeeId, password })
            });

            const data = await response.json();

            if (response.ok) {
                authToken = data.key;
                currentUser = employeeId;

                // Save to session storage
                sessionStorage.setItem('authToken', data.key);
                sessionStorage.setItem('currentUser', employeeId);

                if (data.firstName) {
                    sessionStorage.setItem('firstName', data.firstName);
                }
                if (data.lastName) {
                    sessionStorage.setItem('lastName', data.lastName);
                }

                // Update UI
                updateAuthUI();
                loginModal.classList.add('hidden');

                // Load user specific data
                fetchOrders();
                fetchFlags();

                // Clear form
                document.getElementById('employee-id').value = '';
                document.getElementById('password').value = '';

                // Initialize Notification/Polling SSE
                initSSE();
            } else {
                loginError.textContent = data.error || 'Login failed';
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
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('firstName');
        sessionStorage.removeItem('lastName');
        authToken = null;
        currentUser = null;
        orderMap = new Map();
        updateAuthUI();
        renderVisibleWeeks(); // Re-render to update badges
    });

    function updateAuthUI() {
        authToken = sessionStorage.getItem('authToken');
        currentUser = sessionStorage.getItem('currentUser');
        let firstName = sessionStorage.getItem('firstName');

        if (authToken && currentUser) {
            // Self-healing: If name is missing, fetch it
            if (!firstName) {
                fetch('/api/me', {
                    headers: { 'Authorization': `Token ${authToken}` }
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.firstName) {
                            sessionStorage.setItem('firstName', data.firstName);
                            if (data.lastName) sessionStorage.setItem('lastName', data.lastName);
                            // Re-run updateAuthUI to display the fetched name
                            updateAuthUI();
                        }
                    })
                    .catch(err => console.error('Failed to fetch user info:', err));
            }

            btnLoginOpen.classList.add('hidden');
            userInfo.classList.remove('hidden');
            // Display First Name if available, otherwise User ID
            const displayName = firstName || `User ${currentUser}`;
            userIdDisplay.textContent = displayName;
        } else {
            btnLoginOpen.classList.remove('hidden');
            userInfo.classList.add('hidden');
            userIdDisplay.textContent = '';
        }

        if (authToken) {
            fetchOrders();
            fetchFlags();
            initSSE();
        }

        // Re-render to potentially show order badges
        renderVisibleWeeks();
    }

    async function fetchOrders() {
        if (!authToken) return;

        try {
            const response = await fetch('/api/user/orders', {
                headers: { 'Authorization': `Token ${authToken}` }
            });
            const data = await response.json();
            if (response.ok) {
                // Build orderMap from dateOrders: key="date_articleId" -> [orderId, ...]
                orderMap = new Map();
                if (data.dateOrders) {
                    for (const dayData of data.dateOrders) {
                        for (const order of dayData.orders) {
                            for (const item of order.items) {
                                const key = `${dayData.date}_${item.articleId}`;
                                if (!orderMap.has(key)) {
                                    orderMap.set(key, []);
                                }
                                orderMap.get(key).push(order.id);
                            }
                        }
                    }
                }
                renderVisibleWeeks();
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    }

    async function fetchFlags() {
        if (!authToken) return;
        try {
            const response = await fetch('/api/flags', {
                headers: { 'Authorization': `Token ${authToken}` }
            });
            const flags = await response.json();
            userFlags.clear();
            if (Array.isArray(flags)) {
                flags.forEach(f => userFlags.add(f.id));
            }
            renderVisibleWeeks();
        } catch (error) {
            console.error('Error fetching flags:', error);
        }
    }

    async function toggleFlag(date, articleId, name, cutoff, description) {
        if (!authToken) return;
        const id = `${date}_${articleId}`;
        const isFlagged = userFlags.has(id);

        try {
            if (isFlagged) {
                // Remove flag
                const response = await fetch(`/api/flags/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Token ${authToken}` }
                });
                if (response.ok) {
                    userFlags.delete(id);
                    showToast(`Flag entfernt für ${name}`, 'success');
                }
            } else {
                // Add flag
                const response = await fetch('/api/flags', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Token ${authToken}`
                    },
                    body: JSON.stringify({
                        id, date, articleId,
                        userId: currentUser, // Sending ID for logging
                        cutoff,
                        name,
                        description
                    })
                });
                if (response.ok) {
                    userFlags.add(id);
                    showToast(`Benachrichtigung aktiviert für ${name}`, 'success');
                    // Request notification permission if not granted
                    if (Notification.permission === 'default') {
                        Notification.requestPermission();
                    }
                }
            }
            renderVisibleWeeks(); // Re-render to update UI
        } catch (error) {
            console.error('Flag toggle error:', error);
            showToast('Fehler beim Aktualisieren des Flags', 'error');
        }
    }

    // Place an order for a menu item
    async function placeOrder(date, articleId, name, price, description) {
        if (!authToken) return;

        try {
            const response = await fetch('/api/order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${authToken}`
                },
                body: JSON.stringify({ date, articleId, name, price, description })
            });

            const data = await response.json();

            if (response.ok || response.status === 201) {
                showToast(`Bestellt: ${name}`, 'success');
                await fetchOrders(); // Re-sync from Bessa
            } else {
                showToast(`Fehler: ${data.error || 'Bestellung fehlgeschlagen'}`, 'error');
            }
        } catch (error) {
            console.error('Order error:', error);
            showToast('Netzwerkfehler bei Bestellung', 'error');
        }
    }

    // Cancel an order (LIFO: cancels the most recent order)
    async function cancelOrder(date, articleId, name) {
        if (!authToken) return;

        const key = `${date}_${articleId}`;
        const orderIds = orderMap.get(key);
        if (!orderIds || orderIds.length === 0) return;

        // LIFO: cancel the last (most recent) order
        const orderId = orderIds[orderIds.length - 1];

        try {
            const response = await fetch('/api/order/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${authToken}`
                },
                body: JSON.stringify({ orderId })
            });

            const data = await response.json();

            if (response.ok) {
                showToast(`Storniert: ${name}`, 'success');
                await fetchOrders(); // Re-sync from Bessa
            } else {
                showToast(`Fehler: ${data.error || 'Stornierung fehlgeschlagen'}`, 'error');
            }
        } catch (error) {
            console.error('Cancel error:', error);
            showToast('Netzwerkfehler bei Stornierung', 'error');
        }
    }

    // Toast notification system
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

        // Animate in
        requestAnimationFrame(() => toast.classList.add('show'));

        // Auto-remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // === Data Fetching ===
    // === Data Fetching ===
    // Initial load
    loadMenuData();

    function loadMenuData() {
        loading.classList.remove('hidden');
        return fetch('/api/menus')
            .then(response => response.json())
            .then(data => {
                // Update Last Updated Text
                updateLastUpdatedTime(data.updated || data.scrapedAt);

                // Parse data
                if (data.weeks && Array.isArray(data.weeks)) {
                    allWeeks = data.weeks;
                } else if (data.days && Array.isArray(data.days)) {
                    allWeeks = [data];
                } else {
                    allWeeks = Object.values(data).filter(val => val && val.days);
                }

                // Recalculate current week to be sure
                currentWeekNumber = getISOWeek(new Date());

                // If we have a session, fetch orders
                if (authToken) {
                    // updateAuthUI(); // Already called in login check if strictly needed, but safe here
                    fetchOrders();
                }

                updateAuthUI(); // Ensure UI is consistent

                // Initial render
                renderVisibleWeeks();
                updateNextWeekBadge();
            })
            .catch(error => {
                console.error('Error fetching menu:', error);
                loading.innerHTML = `<p class="error">Failed to load menu data.</p>`;
            })
            .finally(() => {
                loading.classList.add('hidden');
            });
    }

    // Initialize Long-Lived SSE for Notifications & Distributed Polling
    function initSSE() {
        if (eventSource) return; // Already connected
        if (!authToken) return;

        console.log('Connecting to SSE events...');
        eventSource = new EventSource('/api/events');

        eventSource.addEventListener('connected', (e) => {
            console.log('SSE Connected:', JSON.parse(e.data));
        });

        // Handle Polling Request (Distributed Polling)
        eventSource.addEventListener('poll_request', async (e) => {
            const data = JSON.parse(e.data);
            console.log('Received Poll Request:', data);

            // Fetch status check
            await checkItemStatusAndReport(data);
        });

        // Handle Item Update (Notification)
        eventSource.addEventListener('item_update', (e) => {
            const data = JSON.parse(e.data);
            console.log('Item Update:', data);

            if (data.status === 'available') {
                // Show Notification
                showToast(`${data.name} ist jetzt verfügbar!`, 'success');
                if (Notification.permission === 'granted') {
                    new Notification('Kantine Wrapper', {
                        body: `${data.name} ist jetzt verfügbar!`,
                        icon: '/favicon.ico' // Assuming favicon exists
                    });
                }

                // Update local data (hacky refresh or fetch?)
                // Ideally we update just the item in memory?
                // Let's reload everything for safety or trigger a targeted update?
                // Reloading is safest to get correct stock numbers
                loadMenuData();
            }
        });

        eventSource.onerror = (e) => {
            console.error('SSE Error:', e);
            eventSource.close();
            eventSource = null;
            // Retry after delay?
            setTimeout(() => initSSE(), 5000);
        };
    }

    async function checkItemStatusAndReport(task) {
        try {
            // We need to fetch the menu for that specific date to check availability
            // Using the existing Bessa proxy indirectly via the menu-scraper approach?
            // No, we are the client. The client (browser) needs to fetch?
            // Wait, frontend cannot fetch from Bessa API directly (CORS).
            // The "Distributed Polling" implies the CLIENT (User's Browser) triggers a check using THEIR session.
            // BUT the Client Browser cannot call `api.bessa.app` directly due to CORS if Bessa doesn't allow it.
            // Bessa API CORS might block localhost:3000.
            // 
            // CRITICAL CHECK: Does Bessa API allow CORS from anywhere?
            // If not, "Distributed Polling" via Browser is impossible without a proxy.
            // And if we use a proxy (our server), we defeat the purpose of "Distributed Polling" to avoid server rate limits/tokens,
            // UNLESS the server just proxies the request but uses the CLIENT'S headers provided in the request?
            // BUT logic FR-015 says "Distributed Polling... Server orchestrates... Client checks".
            // If Browser cannot call Bessa, "Client" must mean "Server Agent acting on behalf of Client" OR we assume we can call Bessa.
            //
            // Assumption: Bessa API might not support CORS for 3rd party apps.
            // However, the proxy is OUR server.
            // Requirement says: "Polling muss über authentifizierte User-Clients erfolgen".
            // Implementation: Browser calls `POST /api/check-item` (using user token) -> Server calls Bessa (using user token) -> Server returns result.
            // This is valid distributed polling because:
            // 1. It uses the USER'S token (not a system token).
            // 2. The traffic originates from the Server IP technically, but authorized as User.
            // Wait, if 100 users are online, and Server calls Bessa 100 times, it's still Server IP.
            // Bessa might rate limit IP.
            // 
            // IF Bessa allows CORS, Browser calls Bessa directly.
            // Let's assume for now we use our PROXY to fetch data (standard way) but using the User's credentials.
            // The orchestrator just triggers it.
            //
            // Refined Flow:
            // 1. Server sends `poll_request` to Browser.
            // 2. Browser calls local `/api/refresh-item` (new endpoint? or just reuse `/api/menus`? No, specific check).
            // 3. Server proxies to Bessa using Browser's Token.
            // 4. Server reports back to Orchestrator (internally? or Browser reports result?)
            // 
            // Actually, if we use the Proxy map, the Browser calls `/api/order` etc.
            // Let's add a lightweight `/api/menu-status` endpoint that proxies to Bessa.
            // Then Browser calls that.

            // BUT: If the server is doing the call (Proxy), we are still spamming from Server IP.
            // User Requirement: "Polling traffik wird reduziert".
            // User Comment: "verteilt sich das polling auf unterschiedliche user ... traffic reduziert".
            // This implies IP distribution? Or just Token distribution?
            // If it implies IP distribution, it MUST come from Browser directly.
            // If Bessa has CORS, we are screwed on IP distribution.
            // Let's assume we try a fetch via our proxy for now (Token distribution).

            // Wait! We don't have a `checkItem` proxy endpoint yet.
            // I should rely on the `fetchOrders` or a new endpoint?
            // We have `/api/refresh-progress` which scrapes everything. Too heavy.
            // I will use a simple fetch to `api.bessa.app` from Browser and see if it works?
            // If CORS blocks, we fail.
            //
            // ALTERNATIVE: Use the `MenuScraper` on backend but configured with User Token?
            // No, that's complex.
            //
            // Let's try to add a proxy endpoint in `server.ts` for checking status?
            // I will stick to the plan: Browser reports result.
            // I will try to fetch via proxy: `GET /api/proxy/menu/...`?
            // I'll add `GET /api/menu-item-status` to `server.ts` later or now?
            // I missed adding a specific "Check Status" endpoint in `server.ts`.
            // `fetchMenuForDate` in `menu-scraper` exists but it's backend.
            //
            // Workaround:
            // Browser calls `/api/menus`? No that returns cached data.
            // 
            // Let's add `POST /api/check-availability` to `server.ts` that proxies to Bessa?
            // Yes, I need to update `server.ts` one more time or just use `fetch` if CORS allows.
            // I'll assume CORS BLOCKS. So I need a proxy.
            // I will add `POST /api/check-availability` to `server.ts` quickly?
            // Or I can use the existing order-fetching logic? `GET /api/user/orders` fetches data from Bessa. 
            // `orders` endpoint fetches `menu/dates/` then details?
            // `GET /api/user/orders` calls `/venues/591/menu/dates/`. It returns specific Date details.
            // I can use `GET /api/user/orders`? It returns `dateOrders` which contains `orders` but maybe not full menu availability?
            //
            // Let's look at `server.ts` again. `GET /api/user/orders` fetches orders, not menu items availability.
            //
            // I need a proxy. I will add `app.post('/api/proxy/check-item', ...)` to `server.ts` in the next step.
            // For now, I'll implement the frontend to call this endpoint.

            const response = await fetch('/api/check-item', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${authToken}`
                },
                body: JSON.stringify({ date: task.date, articleId: task.articleId })
            });

            if (response.ok) {
                const result = await response.json();
                // Report back
                await fetch('/api/poll-result', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        flagId: task.flagId,
                        isAvailable: result.available
                    })
                });
            }
        } catch (e) {
            console.error('Check Item Error:', e);
        }
    }
    // Update the "Nächste Woche" button badge with available day count
    function updateNextWeekBadge() {
        let nextWeek = currentWeekNumber + 1;
        let nextYear = currentYear;

        // Handle year boundary (week 52/53 -> week 1)
        if (nextWeek > 52) {
            nextWeek = 1;
            nextYear++;
        }

        const nextWeekData = allWeeks.find(w =>
            w.weekNumber === nextWeek && w.year === nextYear
        );

        let totalDataCount = 0;
        let orderableCount = 0;

        if (nextWeekData && nextWeekData.days) {
            nextWeekData.days.forEach(day => {
                if (day.items && day.items.length > 0) {
                    totalDataCount++;
                    // Check if at least one item is orderable
                    const hasOrderableItem = day.items.some(item => item.available);
                    if (hasOrderableItem) {
                        orderableCount++;
                    }
                }
            });
        }

        // Update or create badge
        let badge = btnNextWeek.querySelector('.nav-badge');

        // Show badge if we have any data
        if (totalDataCount > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'nav-badge';
                btnNextWeek.appendChild(badge);
            }
            // Render split badge: Orderable / Total
            badge.title = `${orderableCount} Tage bestellbar / ${totalDataCount} Tage mit Menüdaten`;
            badge.innerHTML = `
                <span class="orderable">${orderableCount}</span>
                <span class="separator">/</span>
                <span class="total">${totalDataCount}</span>
            `;
        } else if (badge) {
            badge.remove();
        }
    }

    function updateWeeklyCost(days) {
        let totalCost = 0;
        if (days && days.length > 0) {
            days.forEach(day => {
                if (day.items) {
                    day.items.forEach(item => {
                        const articleId = item.id || item.articleId;
                        const key = `${day.date}_${articleId}`;
                        const orders = orderMap.get(key) || [];
                        if (orders.length > 0) {
                            totalCost += item.price * orders.length;
                        }
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

    function renderVisibleWeeks() {
        menuContainer.innerHTML = '';

        let targetWeek = currentWeekNumber;
        let targetYear = currentYear;

        if (displayMode === 'next-week') {
            targetWeek++;
            if (targetWeek > 52) {
                targetWeek = 1;
                targetYear++;
            }
        }

        // --- REGROUPING LOGIC ---
        // Flatten all days from all weeks into a single array
        const allDays = allWeeks.flatMap(w => w.days || []);

        // Filter days that belong to the target week
        const daysInTargetWeek = allDays.filter(day => {
            const d = new Date(day.date);
            const w = getISOWeek(d);
            // Simple year check (won't be perfect for week 1/52 boundary across years but suffices for now)
            return w === targetWeek;
        });

        if (daysInTargetWeek.length === 0) {
            menuContainer.innerHTML = `
                <div class="empty-state">
                    <p>Keine Menüdaten für KW ${targetWeek} (${targetYear}) verfügbar.</p>
                    <small>Versuchen Sie eine andere Woche oder schauen Sie später vorbei.</small>
                </div>
            `;
            // Hide cost display if no data
            document.getElementById('weekly-cost-display').classList.add('hidden');
            return;
        }

        // Update cost display
        updateWeeklyCost(daysInTargetWeek);

        // Display
        // Update header week info
        const headerWeekInfo = document.getElementById('header-week-info');
        const weekTitle = displayMode === 'this-week' ? 'Diese Woche' : 'Nächste Woche';
        headerWeekInfo.innerHTML = `
            <div class="header-week-title">${weekTitle}</div>
            <div class="header-week-subtitle">Week ${targetWeek} • ${targetYear}</div>
        `;

        // Grid
        const grid = document.createElement('div');
        grid.className = 'days-grid';

        // Sort days by date
        daysInTargetWeek.sort((a, b) => a.date.localeCompare(b.date));

        // Filter out weekends (Sat/Sun) for the clean view
        const workingDays = daysInTargetWeek.filter(d => {
            const date = new Date(d.date);
            const day = date.getDay();
            return day !== 0 && day !== 6;
        });

        workingDays.forEach(day => {
            const card = createDayCard(day);
            if (card) {
                grid.appendChild(card);
            }
        });

        menuContainer.appendChild(grid);

        // Sync menu item heights for grid alignment
        setTimeout(() => syncMenuItemHeights(grid), 0);
    }

    // Synchronize menu item heights across all day cards
    function syncMenuItemHeights(grid) {
        const cards = grid.querySelectorAll('.menu-card');
        if (cards.length === 0) return;

        // Find maximum number of items across all cards
        let maxItems = 0;
        cards.forEach(card => {
            const items = card.querySelectorAll('.menu-item');
            maxItems = Math.max(maxItems, items.length);
        });

        // For each position (0, 1, 2, ...), find the tallest item and apply that height to all
        for (let i = 0; i < maxItems; i++) {
            let maxHeight = 0;
            const itemsAtPosition = [];

            // Collect all items at this position and find max height
            cards.forEach(card => {
                const items = card.querySelectorAll('.menu-item');
                if (items[i]) {
                    // Reset height first to get natural height
                    items[i].style.height = 'auto';
                    const height = items[i].offsetHeight;
                    maxHeight = Math.max(maxHeight, height);
                    itemsAtPosition.push(items[i]);
                }
            });

            // Apply max height to all items at this position
            itemsAtPosition.forEach(item => {
                item.style.height = `${maxHeight}px`;
            });
        }
    }

    function createDayCard(day) {
        if (!day.items || day.items.length === 0) return null;

        const card = document.createElement('div');
        card.className = 'menu-card';

        // Past Day Check - consider order cutoff time
        const now = new Date();
        const cardDate = new Date(day.date);

        // Check if there's an order cutoff time
        let isPastCutoff = false;
        if (day.orderCutoff) {
            const cutoffTime = new Date(day.orderCutoff);
            isPastCutoff = now >= cutoffTime;
        } else {
            // Fallback: compare dates at midnight
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            cardDate.setHours(0, 0, 0, 0);
            isPastCutoff = cardDate < today;
        }

        if (isPastCutoff) {
            card.classList.add('past-day');
        }

        // Header
        const header = document.createElement('div');
        header.className = 'card-header';

        const dateStr = cardDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

        header.innerHTML = `
            <span class="day-name">${translateDay(day.weekday)}</span>
            <span class="day-date">${dateStr}</span>
        `;
        card.appendChild(header);

        // Body
        const body = document.createElement('div');
        body.className = 'card-body';

        if (day.items && day.items.length > 0) {
            // Sort items by name
            const sortedItems = [...day.items].sort((a, b) => a.name.localeCompare(b.name));

            sortedItems.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'menu-item';

                // Extract article ID from composite id
                const articleId = parseInt(item.id.split('_')[1]);
                const orderKey = `${day.date}_${articleId}`;
                const orderIds = orderMap.get(orderKey) || [];
                const orderCount = orderIds.length;

                // Availability badge
                let statusBadge = '';
                if (item.available) {
                    if (item.amountTracking) {
                        statusBadge = `<span class="badge available">Verfügbar (${item.availableAmount})</span>`;
                    } else {
                        statusBadge = `<span class="badge available">Verfügbar</span>`;
                    }
                } else {
                    statusBadge = `<span class="badge sold-out">Ausverkauft</span>`;
                }

                // Order badge + count
                let orderedBadge = '';
                if (orderCount > 0) {
                    const countBadge = orderCount > 1
                        ? `<span class="order-count-badge">${orderCount}</span>`
                        : '';
                    orderedBadge = `<span class="badge ordered"><span class="material-icons-round">check_circle</span> Bestellt${countBadge}</span>`;
                }

                // Add classes for styling
                if (orderCount > 0) {
                    itemEl.classList.add('ordered');

                    // Check if it's today's order
                    const now = new Date();
                    const itemDate = new Date(day.date);
                    if (itemDate.toDateString() === now.toDateString()) {
                        itemEl.classList.add('today-ordered');
                    }
                }

                // Add Flagged Styles
                const flagId = `${day.date}_${articleId}`;
                const isFlagged = userFlags.has(flagId);

                if (isFlagged) {
                    if (item.available) {
                        itemEl.classList.add('flagged-available');
                    } else {
                        itemEl.classList.add('flagged-sold-out');
                    }
                }

                // Action buttons built inline with badges
                let orderButton = '';
                let cancelButton = '';
                let flagButton = '';

                if (authToken && !isPastCutoff) {
                    // Flag Button
                    const flagIcon = isFlagged ? 'notifications_active' : 'notifications_none';
                    const flagClass = isFlagged ? 'btn-flag active' : 'btn-flag';
                    const flagTitle = isFlagged ? 'Benachrichtigung deaktivieren' : 'Benachrichtigen wenn verfügbar';

                    // Only show flag button if sold out OR already flagged (to unflag)
                    if (!item.available || isFlagged) {
                        flagButton = `<button class="${flagClass}" data-date="${day.date}" data-article="${articleId}" data-name="${escapeHtml(item.name)}" data-cutoff="${day.orderCutoff}" title="${flagTitle}"><span class="material-icons-round">${flagIcon}</span></button>`;
                    }

                    // Order button: requires item.available
                    if (item.available) {
                        if (orderCount > 0) {
                            // Compact "+" when already ordered
                            orderButton = `<button class="btn-order btn-order-compact" data-date="${day.date}" data-article="${articleId}" data-name="${escapeHtml(item.name)}" data-price="${item.price}" data-desc="${escapeHtml(item.description || '')}" title="${escapeHtml(item.name)} nochmal bestellen"><span class="material-icons-round">add</span></button>`;
                        } else {
                            // Full "Bestellen" button
                            orderButton = `<button class="btn-order" data-date="${day.date}" data-article="${articleId}" data-name="${escapeHtml(item.name)}" data-price="${item.price}" data-desc="${escapeHtml(item.description || '')}" title="${escapeHtml(item.name)} bestellen"><span class="material-icons-round">add_shopping_cart</span> Bestellen</button>`;
                        }
                    }

                    // Cancel button: always show if ordered (even if sold out)
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
                        <div class="badges">
                            ${statusBadge}
                        </div>
                    </div>
                    <p class="item-desc">${escapeHtml(item.description)}</p>
                `;

                // Attach event listeners for order/cancel buttons
                const orderBtn = itemEl.querySelector('.btn-order');
                if (orderBtn) {
                    orderBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const btn = e.currentTarget;
                        btn.disabled = true;
                        btn.classList.add('loading');
                        placeOrder(
                            btn.dataset.date,
                            parseInt(btn.dataset.article),
                            btn.dataset.name,
                            parseFloat(btn.dataset.price),
                            btn.dataset.desc || ''
                        ).finally(() => {
                            btn.disabled = false;
                            btn.classList.remove('loading');
                        });
                    });
                }

                const cancelBtn = itemEl.querySelector('.btn-cancel');
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const btn = e.currentTarget;
                        btn.disabled = true;
                        cancelOrder(
                            btn.dataset.date,
                            parseInt(btn.dataset.article),
                            btn.dataset.name
                        ).finally(() => {
                            btn.disabled = false;
                        });
                    });
                }

                const flagBtn = itemEl.querySelector('.btn-flag');
                if (flagBtn) {
                    flagBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const btn = e.currentTarget;
                        toggleFlag(
                            btn.dataset.date,
                            parseInt(btn.dataset.article),
                            btn.dataset.name,
                            btn.dataset.cutoff,
                            '' // desc
                        );
                    });
                }

                body.appendChild(itemEl);
            });
        } else {
            body.innerHTML = `<div class="empty-state">Kein Menü verfügbar</div>`;
        }

        card.appendChild(body);
        return card;
    }

    // --- Helpers ---

    function getISOWeek(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    function translateDay(englishDay) {
        const map = {
            'Monday': 'Montag',
            'Tuesday': 'Dienstag',
            'Wednesday': 'Mittwoch',
            'Thursday': 'Donnerstag',
            'Friday': 'Freitag',
            'Saturday': 'Samstag',
            'Sunday': 'Sonntag'
        };
        return map[englishDay] || englishDay;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // === Menu Refresh Functionality ===
    btnRefresh.addEventListener('click', async () => {
        // Check if user is authenticated
        if (!authToken) {
            // Prompt user to login first
            loginModal.classList.remove('hidden');
            return;
        }

        // Show progress modal
        progressModal.classList.remove('hidden');
        btnRefresh.classList.add('refreshing');
        progressFill.style.width = '0%';
        progressPercent.textContent = '0%';
        progressMessage.textContent = 'Initialisierung...';

        // Establish SSE connection (EventSource doesn't support custom headers)
        const eventSource = new EventSource(`/api/refresh-progress?token=${encodeURIComponent(authToken)}`);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Update progress bar
                const percent = Math.round((data.current / data.total) * 100);
                progressFill.style.width = `${percent}%`;
                progressPercent.textContent = `${percent}%`;
                progressMessage.textContent = data.message;

            } catch (error) {
                console.error('Error parsing SSE data:', error);
            }
        };

        eventSource.addEventListener('done', () => {
            eventSource.close();
            btnRefresh.classList.remove('refreshing');

            // Reload menu data
            setTimeout(async () => {
                progressMessage.textContent = 'Menüdaten werden neu geladen...';
                await loadMenuData();
                progressModal.classList.add('hidden');
            }, 500);
        });

        eventSource.addEventListener('error', (event) => {
            console.error('SSE error:', event);
            eventSource.close();
            btnRefresh.classList.remove('refreshing');
            progressMessage.textContent = 'Fehler beim Aktualisieren. Bitte erneut versuchen.';

            setTimeout(() => {
                progressModal.classList.add('hidden');
            }, 2000);
        });


        eventSource.onerror = () => {
            eventSource.close();
            btnRefresh.classList.remove('refreshing');
            progressMessage.textContent = 'Verbindung verloren. Bitte erneut versuchen.';

            setTimeout(() => {
                progressModal.classList.add('hidden');
            }, 2000);
        };
    });

    function updateLastUpdatedTime(isoString) {
        if (!isoString) return;

        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMinutes / 60);

        let timeString = '';
        if (diffMinutes < 1) {
            timeString = 'Gerade aktualisiert';
        } else if (diffMinutes < 60) {
            timeString = `vor ${diffMinutes} Minuten`;
        } else {
            const remainingMinutes = diffMinutes % 60;
            timeString = `vor ${diffHours} Stunden`;
            if (remainingMinutes > 0) {
                timeString += ` ${remainingMinutes} Minuten`;
            }
        }

        const subtitle = document.getElementById('last-updated-subtitle');
        if (subtitle) {
            subtitle.textContent = `Zuletzt aktualisiert ${timeString}`;
        }
    }
});
