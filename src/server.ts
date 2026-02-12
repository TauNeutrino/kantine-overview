import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { FlagStore, FlaggedItem } from './storage/flag-store.js';
import { SseManager } from './services/sse-manager.js';
import { PollingOrchestrator } from './services/polling-orchestrator.js';

const app = express();
const port = 3005; // Changed from 3000 to avoid conflicts

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Project root (assuming we are in src/)
const projectRoot = join(__dirname, '..');
const publicDir = join(projectRoot, 'public');
const dataFile = join(projectRoot, 'data', 'menus.json');
const dataDir = join(projectRoot, 'data');

// Initialize Services
const flagStore = new FlagStore(dataDir);
const sseManager = new SseManager();
const orchestrator = new PollingOrchestrator(flagStore, sseManager);

// Bessa API Constants
const BESSA_API_BASE = 'https://api.bessa.app/v1';
const GUEST_TOKEN = 'c3418725e95a9f90e3645cbc846b4d67c7c66131';
const CLIENT_VERSION = '1.7.0_prod/2026-01-26';

// Middleware
app.use(express.json());

// API Routes
app.post('/api/login', async (req, res) => {
    const { employeeId, password } = req.body;

    if (!employeeId || !password) {
        return res.status(400).json({ error: 'Employee ID and password are required' });
    }

    // Transform employee ID to email format as expected by Bessa API
    const email = `knapp-${employeeId}@bessa.app`;

    try {
        const response = await fetch(`${BESSA_API_BASE}/auth/login/`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${GUEST_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Client-Version': CLIENT_VERSION
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            const token = data.key;

            // Fetch user details to get First Name
            try {
                const userResponse = await fetch(`${BESSA_API_BASE}/auth/user/`, {
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Accept': 'application/json',
                        'X-Client-Version': CLIENT_VERSION
                    }
                });

                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    res.json({
                        key: token,
                        firstName: userData.first_name,
                        lastName: userData.last_name
                    });
                } else {
                    // Fallback if user fetch fails
                    logger.warn(`Failed to fetch user details for ${email}`);
                    res.json({ key: token });
                }
            } catch (userError) {
                logger.error(`Error fetching user details: ${userError}`);
                res.json({ key: token });
            }
        } else {
            logger.error(`Login failed for ${email}: ${JSON.stringify(data)}`);
            res.status(response.status).json({ error: data.non_field_errors?.[0] || 'Login failed' });
        }
    } catch (error) {
        logger.error(`Login error: ${error}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const userResponse = await fetch(`${BESSA_API_BASE}/auth/user/`, {
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
                'X-Client-Version': CLIENT_VERSION
            }
        });

        if (userResponse.ok) {
            const userData = await userResponse.json();
            res.json({
                firstName: userData.first_name,
                lastName: userData.last_name,
                email: userData.email
            });
        } else {
            res.status(userResponse.status).json({ error: 'Failed to fetch user details' });
        }
    } catch (error) {
        logger.error(`Error fetching user details: ${error}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/user/orders', async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Authorization header is required' });
    }

    try {
        const response = await fetch(`${BESSA_API_BASE}/venues/591/menu/dates/`, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
                'X-Client-Version': CLIENT_VERSION
            }
        });

        const data = await response.json();

        if (response.ok) {
            // Return full order details per date for orderMap building
            const dateOrders = data.results.map((day: any) => ({
                date: day.date,
                orders: (day.orders || []).map((order: any) => ({
                    id: order.id,
                    state: order.order_state,
                    total: order.total,
                    items: (order.items || []).map((item: any) => ({
                        name: item.name,
                        articleId: item.article,
                        price: item.price
                    }))
                }))
            }));
            res.json({ dateOrders });
        } else {
            logger.error(`Failed to fetch orders: ${JSON.stringify(data)}`);
            res.status(response.status).json({ error: 'Failed to fetch orders' });
        }
    } catch (error) {
        logger.error(`Orders fetch error: ${error}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Place an order via Bessa API
app.post('/api/order', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Authorization header is required' });
    }

    const { date, articleId, name, price, vat, description } = req.body;
    if (!date || !articleId || !name || price === undefined) {
        return res.status(400).json({ error: 'Missing required fields: date, articleId, name, price' });
    }

    try {
        // Fetch user details for customer object
        const userResponse = await fetch(`${BESSA_API_BASE}/auth/user/`, {
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
                'X-Client-Version': CLIENT_VERSION
            }
        });

        if (!userResponse.ok) {
            return res.status(401).json({ error: 'Failed to fetch user details' });
        }

        const userData = await userResponse.json();
        const now = new Date().toISOString();

        // Construct order payload matching exact Bessa format
        const orderPayload = {
            uuid: crypto.randomUUID(),
            created: now,
            updated: now,
            order_type: 7,
            items: [
                {
                    article: articleId,
                    course_group: null,
                    modifiers: [],
                    uuid: crypto.randomUUID(),
                    name: name,
                    description: description || '',
                    price: String(parseFloat(price)),
                    amount: 1,
                    vat: vat || '10.00',
                    comment: ''
                }
            ],
            table: null,
            total: parseFloat(price),
            tip: 0,
            currency: 'EUR',
            venue: 591,
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

        logger.info(`Placing order: ${name} for ${date} (article ${articleId})`);

        const orderResponse = await fetch(`${BESSA_API_BASE}/user/orders/`, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Client-Version': CLIENT_VERSION
            },
            body: JSON.stringify(orderPayload)
        });

        const orderData = await orderResponse.json();

        if (orderResponse.ok || orderResponse.status === 201) {
            logger.success(`Order placed: ID ${orderData.id} (${name})`);
            res.status(201).json({
                orderId: orderData.id,
                hashId: orderData.hash_id,
                state: orderData.order_state,
                total: orderData.total
            });
        } else {
            logger.error(`Order failed: ${JSON.stringify(orderData)}`);
            res.status(orderResponse.status).json({
                error: orderData.detail || orderData.non_field_errors?.[0] || 'Order failed'
            });
        }
    } catch (error) {
        logger.error(`Order error: ${error}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Cancel an order via Bessa API
app.post('/api/order/cancel', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Authorization header is required' });
    }

    const { orderId } = req.body;
    if (!orderId) {
        return res.status(400).json({ error: 'Missing required field: orderId' });
    }

    try {
        logger.info(`Cancelling order: ${orderId}`);

        const cancelResponse = await fetch(`${BESSA_API_BASE}/user/orders/${orderId}/cancel/`, {
            method: 'PATCH',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Client-Version': CLIENT_VERSION
            },
            body: JSON.stringify({})
        });

        const cancelData = await cancelResponse.json();

        if (cancelResponse.ok) {
            logger.success(`Order ${orderId} cancelled`);
            res.json({ success: true, orderId: cancelData.order_id, state: cancelData.state });
        } else {
            logger.error(`Cancel failed for ${orderId}: ${JSON.stringify(cancelData)}`);
            res.status(cancelResponse.status).json({
                error: cancelData.detail || 'Cancellation failed'
            });
        }
    } catch (error) {
        logger.error(`Cancel error: ${error}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- Flagging & Polling API ---

app.get('/api/flags', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    // In a real app we would filter by user, but for now return all active flags
    // or arguably only the flags for this user?
    // Requirement says "Flagged items ... flagged by user".
    // But polling is distributed.
    // Let's return all flags so UI can show them? Or just user's flags?
    // For "Yellow Glow" we likely want to see what *I* flagged.
    // Let's filter by pseudo-user-id if possible, but we don't strictly have one except the Bessa ID.
    // Let's assume the client sends a userID or we trust the client to filter.
    // For simplicity, return all, client filters? No, improved privacy:
    // We don't have a robust user session here, just the token.
    // We'll trust the client to send 'X-User-Id' for now or just return all and let client handle it.
    // Going with returning ALL for simplicity of the "Shared/Distributed" nature if we wanted shared flags,
    // but the requirement implies personal flagging.
    // Implementation Plan didn't specify strict user separation.
    // Let's return ALL for now to debug easily.
    const flags = await flagStore.getAllFlags();
    res.json(flags);
});

app.post('/api/flags', async (req, res) => {
    const { id, date, articleId, userId, cutoff, description, name } = req.body;
    if (!id || !date || !articleId || !userId || !cutoff) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const item: FlaggedItem = {
        id, date, articleId, userId, cutoff, description, name,
        createdAt: new Date().toISOString()
    };

    const success = await flagStore.addFlag(item);
    if (success) {
        logger.info(`Flag added: ${name} (${id}) by ${userId}`);
        res.status(201).json({ success: true });
    } else {
        res.status(409).json({ error: 'Flag already exists' });
    }
});

app.delete('/api/flags/:id', async (req, res) => {
    const { id } = req.params;
    const success = await flagStore.removeFlag(id);
    if (success) {
        logger.info(`Flag removed: ${id}`);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Flag not found' });
    }
});

app.post('/api/check-item', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const { date, articleId } = req.body;
    if (!date || !articleId) return res.status(400).json({ error: 'Missing date or articleId' });

    try {
        // Fetch menu details for the specific date using User's Token
        // URL Pattern: /venues/591/menu/7/{date}/
        // Assumption: Menu ID 7 is standard.
        const response = await fetch(`${BESSA_API_BASE}/venues/591/menu/7/${date}/`, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
                'X-Client-Version': CLIENT_VERSION
            }
        });

        if (!response.ok) {
            // If 404, maybe no menu for that day?
            if (response.status === 404) {
                return res.json({ available: false, error: 'Menu not found' });
            }
            return res.status(response.status).json({ error: 'Failed to fetch menu from Bessa' });
        }

        const data = await response.json();
        const results = data.results || [];

        // Find the item
        let foundItem = null;
        for (const group of results) {
            if (group.items) {
                foundItem = group.items.find((i: any) => i.article === articleId || i.id === articleId);
                if (foundItem) break;
            }
        }

        if (foundItem) {
            // Check availability
            const isUnlimited = foundItem.amount_tracking === false;
            const hasStock = parseInt(foundItem.available_amount) > 0;
            const isAvailable = isUnlimited || hasStock;

            logger.info(`Check Item ${articleId} on ${date}: ${isAvailable ? 'AVAILABLE' : 'SOLD OUT'}`);
            res.json({ available: isAvailable });
        } else {
            logger.warn(`Check Item ${articleId} on ${date}: Item not found in menu`);
            res.json({ available: false, error: 'Item not found in menu' });
        }

    } catch (error) {
        logger.error(`Check Item Error: ${error}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/poll-result', async (req, res) => {
    const { flagId, isAvailable } = req.body;
    if (!flagId) return res.status(400).json({ error: 'Missing flagId' });

    await orchestrator.handlePollResult(flagId, isAvailable);
    res.json({ success: true });
});

app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const clientId = sseManager.addClient(res);

    // Send initial ping/id
    sseManager.sendToClient(clientId, 'connected', { clientId });
});

// SSE endpoint for menu refresh progress
app.get('/api/refresh-progress', async (req, res) => {
    logger.info(`[DEBUG] Received SSE request with token query: ${req.query.token ? 'YES' : 'NO'}`);

    // Get token from query parameter (EventSource doesn't support custom headers)
    const token = req.query.token as string;
    const authHeader = token ? `Token ${token}` : `Token ${GUEST_TOKEN}`;

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendProgress = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        sendProgress({ step: 'start', message: 'Hole verfügbare Daten...', current: 0, total: 100 });

        // 1. Fetch available dates
        logger.info('Fetching available dates...');
        const datesResponse = await fetch(`${BESSA_API_BASE}/venues/591/menu/dates/`, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
                'X-Client-Version': CLIENT_VERSION
            }
        });

        if (!datesResponse.ok) {
            throw new Error(`Failed to fetch dates: ${datesResponse.status}`);
        }

        const datesData = await datesResponse.json();
        let availableDates = datesData.results || [];

        // Filter for future dates or recent past (e.g. last 7 days + future)
        const today = new Date();
        today.setDate(today.getDate() - 7);
        const cutoffDate = today.toISOString().split('T')[0];

        availableDates = availableDates
            .filter((d: any) => d.date >= cutoffDate)
            .sort((a: any, b: any) => a.date.localeCompare(b.date));

        // Limit to reasonable amount (e.g. next 30 days)
        availableDates = availableDates.slice(0, 30);
        const totalDates = availableDates.length;

        sendProgress({ step: 'dates_fetched', message: `${totalDates} Tage gefunden. Lade Details...`, current: 0, total: totalDates });

        // 2. Fetch details for each date
        const allDays: any[] = [];
        let completed = 0;

        for (const dateObj of availableDates) {
            const dateStr = dateObj.date;

            sendProgress({
                step: 'fetching_details',
                message: `Lade Menü für ${dateStr}...`,
                current: completed + 1,
                total: totalDates
            });

            try {
                // Menu ID 7 seems to be the standard lunch menu
                const menuDetailUrl = `${BESSA_API_BASE}/venues/591/menu/7/${dateStr}/`;
                const detailResponse = await fetch(menuDetailUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': authHeader,
                        'Accept': 'application/json',
                        'X-Client-Version': CLIENT_VERSION
                    }
                });

                if (detailResponse.ok) {
                    const detailData = await detailResponse.json();

                    // Structure: { results: [ { name: "Menü", items: [...] } ] }
                    const menuGroups = detailData.results || [];
                    let dayItems: any[] = [];

                    for (const group of menuGroups) {
                        if (group.items && Array.isArray(group.items)) {
                            dayItems = dayItems.concat(group.items);
                        }
                    }

                    if (dayItems.length > 0) {
                        allDays.push({
                            date: dateStr,
                            // Use the dateObj to get weekday if possible, or compute it
                            menu_items: dayItems,
                            orders: dateObj.orders || [] // Store orders for cutoff extraction
                        });
                    }
                }
            } catch (err) {
                logger.error(`Failed to fetch details for ${dateStr}: ${err}`);
            }

            completed++;
            // Small delay
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Group by Week
        const weeksMap = new Map<string, any>();

        // Helper to get ISO week year
        const getWeekYear = (d: Date) => {
            const date = new Date(d.getTime());
            date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
            return date.getFullYear();
        };

        for (const day of allDays) {
            const date = new Date(day.date);
            const weekNum = getISOWeek(date);
            const year = getWeekYear(date);
            const key = `${year}-${weekNum}`;

            if (!weeksMap.has(key)) {
                weeksMap.set(key, {
                    year: year,
                    weekNumber: weekNum,
                    days: []
                });
            }

            const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });

            // Calculate order cutoff time: same day at 10:00 AM local time
            const orderCutoffDate = new Date(day.date);
            orderCutoffDate.setHours(10, 0, 0, 0); // 10:00 AM local time
            const orderCutoff = orderCutoffDate.toISOString();

            weeksMap.get(key).days.push({
                date: day.date,
                weekday: weekday,
                orderCutoff: orderCutoff, // Add the cutoff time
                items: (day.menu_items || []).map((item: any) => {
                    const isUnlimited = item.amount_tracking === false;
                    const hasStock = parseInt(item.available_amount) > 0;

                    return {
                        id: `${day.date}_${item.id}`,
                        name: item.name || 'Unknown',
                        description: item.description || '',
                        price: parseFloat(item.price) || 0,
                        available: isUnlimited || hasStock,
                        availableAmount: parseInt(item.available_amount) || 0,
                        amountTracking: item.amount_tracking !== false // Default to true if missing
                    };
                })
            });
        }

        const menuData = {
            weeks: Array.from(weeksMap.values()).sort((a: any, b: any) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.weekNumber - b.weekNumber;
            }),
            scrapedAt: new Date().toISOString()
        };

        // Smart merge: preserve current-week data on refresh, purge older weeks
        sendProgress({ step: 'saving', message: 'Daten werden gespeichert...', current: totalDates, total: totalDates });

        const currentISOWeek = getISOWeek(new Date());
        const currentISOYear = getWeekYear(new Date());

        let finalData = menuData;

        try {
            const existingRaw = await fs.readFile(dataFile, 'utf-8');
            const existingData = JSON.parse(existingRaw);

            if (existingData.weeks && Array.isArray(existingData.weeks)) {
                const mergedWeeks = new Map<string, any>();

                // Add all fresh weeks first
                for (const week of menuData.weeks) {
                    mergedWeeks.set(`${week.year}-${week.weekNumber}`, week);
                }

                // Merge existing current-week data (preserve days not in fresh data)
                for (const existingWeek of existingData.weeks) {
                    const key = `${existingWeek.year}-${existingWeek.weekNumber}`;
                    const isCurrentOrFuture =
                        existingWeek.year > currentISOYear ||
                        (existingWeek.year === currentISOYear && existingWeek.weekNumber >= currentISOWeek);

                    if (!isCurrentOrFuture) {
                        // Older week: purge (don't keep)
                        continue;
                    }

                    if (mergedWeeks.has(key)) {
                        // Merge: keep existing days that aren't in fresh data
                        const freshWeek = mergedWeeks.get(key);
                        const freshDates = new Set(freshWeek.days.map((d: any) => d.date));

                        for (const existDay of existingWeek.days) {
                            if (!freshDates.has(existDay.date)) {
                                freshWeek.days.push(existDay);
                            }
                        }

                        // Sort days by date
                        freshWeek.days.sort((a: any, b: any) => a.date.localeCompare(b.date));
                    } else {
                        // Future week not in fresh data: keep as-is
                        mergedWeeks.set(key, existingWeek);
                    }
                }

                finalData = {
                    weeks: Array.from(mergedWeeks.values()).sort((a: any, b: any) => {
                        if (a.year !== b.year) return a.year - b.year;
                        return a.weekNumber - b.weekNumber;
                    }),
                    scrapedAt: new Date().toISOString()
                };
            }
        } catch (e) {
            // No existing data or parse error — use fresh data as-is
            logger.info('No existing menu data to merge, using fresh data.');
        }

        await fs.writeFile(dataFile, JSON.stringify(finalData, null, 2), 'utf-8');

        sendProgress({ step: 'complete', message: 'Aktualisierung abgeschlossen!', current: totalDates, total: totalDates });
        res.write('event: done\ndata: {}\n\n');
        res.end();

    } catch (error) {
        logger.error(`Refresh error: ${error}`);
        sendProgress({ step: 'error', message: `Fehler: ${error}`, current: 0, total: 100 });
        res.write('event: error\ndata: {}\n\n');
        res.end();
    }
});

// Helper function for ISO week number
function getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

app.get('/api/menus', async (req, res) => {
    try {
        await fs.access(dataFile);
        const data = await fs.readFile(dataFile, 'utf-8');
        res.header('Content-Type', 'application/json');
        res.send(data);
    } catch (error) {
        logger.error(`Failed to read menu data: ${error}`);
        // If file doesn't exist, return empty structure
        res.json({ days: [], updated: null });
    }
});

// Serve Static Files
app.use(express.static(publicDir));

// Fallback to index.html for any other request
app.use((req, res) => {
    if (req.method === 'GET') {
        res.sendFile(join(publicDir, 'index.html'));
    }
});

// Start Server
app.listen(port, () => {
    logger.success(`Web Interface running at http://localhost:${port}`);
    logger.info(`Serving static files from: ${publicDir}`);

    // Start Polling Orchestrator
    orchestrator.start();
});
