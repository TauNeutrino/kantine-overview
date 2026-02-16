/**
 * Mock data for standalone HTML testing.
 * Intercepts fetch() calls to api.bessa.app and returns realistic dummy data.
 * Injected BEFORE kantine.js in standalone builds only.
 */
(function () {
    'use strict';

    // Generate dates for this week and next week (Mon-Fri)
    function getWeekDates(weekOffset) {
        const dates = [];
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon
        const monday = new Date(now);
        monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + (weekOffset * 7));

        for (let i = 0; i < 5; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            dates.push(d.toISOString().split('T')[0]);
        }
        return dates;
    }

    const thisWeekDates = getWeekDates(0);
    const nextWeekDates = getWeekDates(1);
    const allDates = [...thisWeekDates, ...nextWeekDates];

    // Realistic German canteen menu items per day
    const menuPool = [
        [
            { id: 101, name: 'Wiener Schnitzel mit Kartoffelsalat', description: 'Paniertes Schweineschnitzel mit hausgemachtem Kartoffelsalat', price: '6.90', available_amount: '15', amount_tracking: true },
            { id: 102, name: 'Gemüse-Curry mit Basmatireis', description: 'Veganes Curry mit saisonalem Gemüse und Kokosmilch', price: '5.50', available_amount: '0', amount_tracking: true },
            { id: 103, name: 'Rindergulasch mit Spätzle', description: 'Geschmortes Rindfleisch in Paprikasauce mit Eierspätzle', price: '7.20', available_amount: '8', amount_tracking: true },
            { id: 104, name: 'Tagessuppe: Tomatencremesuppe', description: 'Cremige Tomatensuppe mit Croutons', price: '3.20', available_amount: '0', amount_tracking: false },
        ],
        [
            { id: 201, name: 'Hähnchenbrust mit Pilzrahmsauce', description: 'Gebratene Hähnchenbrust mit Champignon-Rahmsauce und Reis', price: '6.50', available_amount: '12', amount_tracking: true },
            { id: 202, name: 'Vegetarische Lasagne', description: 'Lasagne mit Spinat, Ricotta und Tomatensauce', price: '5.80', available_amount: '10', amount_tracking: true },
            { id: 203, name: 'Bratwurst mit Sauerkraut', description: 'Thüringer Bratwurst mit Sauerkraut und Kartoffelpüree', price: '5.90', available_amount: '0', amount_tracking: true },
            { id: 204, name: 'Caesar Salad mit Hähnchen', description: 'Römersalat mit gegrilltem Hähnchen, Parmesan und Croutons', price: '6.10', available_amount: '0', amount_tracking: false },
        ],
        [
            { id: 301, name: 'Spaghetti Bolognese', description: 'Klassische Bolognese mit frischen Spaghetti', price: '5.20', available_amount: '20', amount_tracking: true },
            { id: 302, name: 'Gebratener Lachs mit Dillsauce', description: 'Lachsfilet auf Blattspinat mit Senf-Dill-Sauce', price: '8.50', available_amount: '5', amount_tracking: true },
            { id: 303, name: 'Kartoffelgratin mit Salat', description: 'Überbackene Kartoffeln mit Sahne und Käse, dazu gemischter Salat', price: '5.00', available_amount: '0', amount_tracking: false },
            { id: 304, name: 'Chili con Carne', description: 'Pikantes Chili mit Hackfleisch, Bohnen und Reis', price: '5.80', available_amount: '9', amount_tracking: true },
        ],
        [
            { id: 401, name: 'Schweinebraten mit Knödel', description: 'Bayerischer Schweinebraten mit Semmelknödel und Bratensauce', price: '7.00', available_amount: '7', amount_tracking: true },
            { id: 402, name: 'Falafel-Bowl mit Hummus', description: 'Knusprige Falafel mit Hummus, Tabouleh und Fladenbrot', price: '5.90', available_amount: '0', amount_tracking: false },
            { id: 403, name: 'Putengeschnetzeltes mit Nudeln', description: 'Putenstreifen in Champignon-Sahnesauce mit Bandnudeln', price: '6.30', available_amount: '11', amount_tracking: true },
            { id: 404, name: 'Tagessuppe: Erbsensuppe', description: 'Deftige Erbsensuppe mit Wiener Würstchen', price: '3.50', available_amount: '0', amount_tracking: false },
        ],
        [
            { id: 501, name: 'Backfisch mit Remoulade', description: 'Paniertes Seelachsfilet mit Remouladensauce und Bratkartoffeln', price: '6.80', available_amount: '6', amount_tracking: true },
            { id: 502, name: 'Käsespätzle mit Röstzwiebeln', description: 'Allgäuer Käsespätzle mit karamellisierten Zwiebeln und Salat', price: '5.50', available_amount: '14', amount_tracking: true },
            { id: 503, name: 'Schnitzel Wiener Art mit Pommes', description: 'Paniertes Hähnchenschnitzel mit knusprigen Pommes Frites', price: '6.20', available_amount: '0', amount_tracking: true },
            { id: 504, name: 'Griechischer Bauernsalat', description: 'Frischer Salat mit Feta, Oliven, Gurke und Tomaten', price: '5.30', available_amount: '0', amount_tracking: false },
        ],
    ];

    // Build mock responses for each date
    const dateResponses = {};
    allDates.forEach((date, i) => {
        const menuIndex = i % menuPool.length;
        dateResponses[date] = {
            results: [{
                id: 1,
                name: 'Mittagsmenü',
                items: menuPool[menuIndex].map(item => ({
                    ...item,
                    // Ensure unique IDs per date
                    id: item.id + (i * 1000)
                }))
            }]
        };
    });

    // Mock some orders for today (to show "Bestellt" badges)
    const todayStr = new Date().toISOString().split('T')[0];
    const todayMenu = dateResponses[todayStr];
    const mockOrders = [];
    let nextOrderId = 9001;
    if (todayMenu) {
        const firstItem = todayMenu.results[0].items[0];
        mockOrders.push({
            id: nextOrderId++,
            article: firstItem.id,
            article_name: firstItem.name,
            date: todayStr,
            venue: 591,
            status: 'confirmed',
            created: new Date().toISOString()
        });
    }

    // Pre-seed a mock auth session so flag/order buttons render
    sessionStorage.setItem('kantine_authToken', 'mock-token-for-testing');
    sessionStorage.setItem('kantine_currentUser', '12345');
    sessionStorage.setItem('kantine_firstName', 'Test');
    sessionStorage.setItem('kantine_lastName', 'User');

    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = function (url, options) {
        const urlStr = typeof url === 'string' ? url : url.toString();

        // Menu dates endpoint
        if (urlStr.includes('/menu/dates/')) {
            console.log('[MOCK] Returning mock dates data');
            return Promise.resolve(new Response(JSON.stringify({
                results: allDates.map(date => ({ date, orders: [] }))
            }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }

        // Menu detail for a specific date
        const dateMatch = urlStr.match(/\/menu\/\d+\/(\d{4}-\d{2}-\d{2})\//);
        if (dateMatch) {
            const date = dateMatch[1];
            const data = dateResponses[date] || { results: [] };
            console.log(`[MOCK] Returning mock menu for ${date}`);
            return Promise.resolve(new Response(JSON.stringify(data), {
                status: 200, headers: { 'Content-Type': 'application/json' }
            }));
        }

        // Orders endpoint
        if (urlStr.includes('/user/orders/') && (!options || options.method === 'GET' || !options.method)) {
            console.log('[MOCK] Returning mock orders');
            return Promise.resolve(new Response(JSON.stringify({
                results: mockOrders
            }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }

        // Auth user endpoint
        if (urlStr.includes('/auth/user/')) {
            console.log('[MOCK] Returning mock user');
            return Promise.resolve(new Response(JSON.stringify({
                pk: 12345,
                username: 'testuser',
                email: 'test@example.com',
                first_name: 'Test',
                last_name: 'User'
            }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }

        // Order create (POST to /user/orders/)
        if (urlStr.includes('/user/orders/') && options && options.method === 'POST') {
            const body = JSON.parse(options.body || '{}');
            const newOrder = {
                id: nextOrderId++,
                article: body.article,
                article_name: 'Mock Order',
                date: body.date,
                venue: 591,
                status: 'confirmed',
                created: new Date().toISOString()
            };
            mockOrders.push(newOrder);
            console.log('[MOCK] Created order:', newOrder);
            return Promise.resolve(new Response(JSON.stringify(newOrder), {
                status: 201, headers: { 'Content-Type': 'application/json' }
            }));
        }

        // Order cancel (POST to /user/orders/{id}/cancel/)
        const cancelMatch = urlStr.match(/\/user\/orders\/(\d+)\/cancel\//);
        if (cancelMatch) {
            const orderId = parseInt(cancelMatch[1]);
            const idx = mockOrders.findIndex(o => o.id === orderId);
            if (idx >= 0) mockOrders.splice(idx, 1);
            console.log('[MOCK] Cancelled order:', orderId);
            return Promise.resolve(new Response('{}', {
                status: 200, headers: { 'Content-Type': 'application/json' }
            }));
        }

        // Fallback to real fetch for other URLs (fonts, etc.)
        return originalFetch.apply(this, arguments);
    };

    console.log('[MOCK] 🧪 Mock data active – using dummy canteen menus for UI testing');
})();
