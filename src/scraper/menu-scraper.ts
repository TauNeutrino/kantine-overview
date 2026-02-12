/// <reference lib="dom" />
import puppeteer, { Browser, Page } from 'puppeteer';
import { WeeklyMenu, DayMenu, MenuItem } from '../types.js';
import { SELECTORS, URLS } from './selectors.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


interface ApiMenuItem {
    id: number;
    name: string;
    description: string;
    price: string;
    available_amount: string;
    created: string;
    updated: string;
}

interface ApiMenuResult {
    id: number;
    items: ApiMenuItem[];
    date: string;
}

interface ApiMenuResponse {
    results: ApiMenuResult[];
}

export class MenuScraper {
    private browser: Browser | null = null;
    private page: Page | null = null;

    /**
     * Initialize browser and page
     */
    async init(): Promise<void> {
        logger.info('[TRACE] Starting browser initialization...');
        logger.info(`[TRACE] Using Chromium at: /usr/bin/chromium`);
        logger.info(`[TRACE] Headless mode: ${config.puppeteer.headless}`);

        this.browser = await puppeteer.launch({
            headless: config.puppeteer.headless,
            executablePath: '/usr/bin/chromium',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
            ],
        });
        logger.info('[TRACE] Puppeteer launch completed');

        logger.info('[TRACE] Creating new page...');
        this.page = await this.browser.newPage();

        logger.info('[TRACE] Setting viewport to 1280x1024...');
        await this.page.setViewport({ width: 1280, height: 1024 });

        logger.info(`[TRACE] Setting default timeout to ${config.puppeteer.defaultTimeout}ms`);
        await this.page.setDefaultTimeout(config.puppeteer.defaultTimeout);

        // Set realistic User-Agent
        await this.page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        // Capture console logs with more detail
        this.page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            if (type === 'error' || type === 'warn' || text.includes('auth') || text.includes('login')) {
                logger.info(`[BROWSER ${type.toUpperCase()}] ${text}`);
            }
        });

        // Capture all requests/responses for auth debugging
        this.page.on('request', request => {
            const url = request.url();
            if (url.includes('auth') || url.includes('login') || url.includes('session') || url.includes('bessa.app/api')) {
                logger.info(`[NETWORK REQ] ${request.method()} ${url}`);
            }
        });

        this.page.on('response', response => {
            const url = response.url();
            if (url.includes('auth') || url.includes('login') || url.includes('session') || url.includes('bessa.app/api')) {
                const status = response.status();
                logger.info(`[NETWORK RES] ${status} ${url}`);
                if (status >= 400) {
                    logger.warn(`[NETWORK ERR] ${status} for ${url}`);
                }
            }
        });

        // Capture failed requests
        this.page.on('requestfailed', request => {
            const url = request.url();
            const error = request.failure()?.errorText;
            logger.warn(`[NETWORK FAILURE] ${url} - ${error}`);
        });

        logger.success('[TRACE] Browser initialized successfully');
    }

    /**
     * Save a screenshot for debugging
     */
    private async saveScreenshot(name: string): Promise<string | null> {
        if (!this.page) return null;
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `${name}_${timestamp}.png`;

            // Use current session brain path or fallback to a local screenshots directory
            const brainPath = process.env.ANTIGRAVITY_ARTIFACTS_DIR || path.join(process.cwd(), 'screenshots');
            const filePath = path.join(brainPath, fileName);

            // Ensure directory exists if it's the local fallback
            if (!process.env.ANTIGRAVITY_ARTIFACTS_DIR) {
                const fs = await import('fs/promises');
                await fs.mkdir(brainPath, { recursive: true });
            }

            await this.page.screenshot({ path: filePath });
            logger.info(`[TRACE] Screenshot saved to: ${filePath}`);
            return filePath;
        } catch (error) {
            logger.error(`[TRACE] Failed to save screenshot: ${error}`);
            return null;
        }
    }

    /**
     * Close browser
     */
    async close(): Promise<void> {
        logger.info('[TRACE] Closing browser...');
        if (this.browser) {
            await this.browser.close();
            logger.success('[TRACE] Browser closed');
        } else {
            logger.warn('[TRACE] Browser was already null, nothing to close');
        }
    }

    /**
     * Navigate to Bessa and handle cookie consent
     */
    private async navigateAndAcceptCookies(): Promise<void> {
        if (!this.page) throw new Error('Page not initialized');

        logger.info(`[TRACE] Navigating to ${URLS.BASE}...`);
        logger.info('[TRACE] Waiting for networkidle2...');

        await this.page.goto(URLS.BASE, { waitUntil: 'networkidle2' });

        const currentUrl = this.page.url();
        logger.success(`[TRACE] Navigation complete. Current URL: ${currentUrl}`);

        // Accept cookies if banner is present
        logger.info(`[TRACE] Looking for cookie banner (selector: ${SELECTORS.COOKIE_ACCEPT_ALL})...`);
        logger.info('[TRACE] Timeout: 5000ms');

        try {
            await this.page.waitForSelector(SELECTORS.COOKIE_ACCEPT_ALL, { timeout: 5000 });
            logger.success('[TRACE] Cookie banner found!');

            logger.info('[TRACE] Clicking "Accept all" button...');
            await this.page.click(SELECTORS.COOKIE_ACCEPT_ALL);

            logger.info(`[TRACE] Waiting ${config.scraper.waitAfterClick}ms after click...`);
            await this.wait(config.scraper.waitAfterClick);

            logger.success('[TRACE] Cookies accepted successfully');
        } catch (error) {
            logger.info('[TRACE] No cookie banner found (timeout reached)');
        }

        logger.info(`[TRACE] Current URL after cookie handling: ${this.page.url()}`);
    }

    /**
     * Helper to reliably fill an input and trigger validation events
     */
    private async fillInput(selector: string, value: string): Promise<void> {
        if (!this.page) return;
        await this.page.waitForSelector(selector);
        await this.page.focus(selector);

        // Clear field first
        await this.page.evaluate((sel) => {
            const el = document.querySelector(sel) as HTMLInputElement;
            if (el) el.value = '';
        }, selector);

        await this.page.type(selector, value, { delay: 50 });

        // Trigger validation events for Angular/React/etc.
        await this.page.evaluate((sel) => {
            const el = document.querySelector(sel) as HTMLInputElement;
            if (el) {
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.dispatchEvent(new Event('blur', { bubbles: true }));
            }
        }, selector);
    }

    /**
     * Check if the user is currently logged in based on page content
     */
    private async isLoggedIn(): Promise<boolean> {
        if (!this.page) return false;
        return await this.page.evaluate(() => {
            const bodyText = document.body.innerText;
            return bodyText.includes('Log Out') ||
                bodyText.includes('Abmelden') ||
                bodyText.includes('Mein Konto') ||
                !!document.querySelector('button[mat-menu-item]');
        });
    }

    /**
     * Perform login
     */
    private async login(): Promise<void> {
        if (!this.page) throw new Error('Page not initialized');

        logger.info('[TRACE] ===== LOGIN FLOW START =====');
        logger.info(`[TRACE] Current URL before login: ${this.page.url()}`);

        // Detect if already logged in
        if (await this.isLoggedIn()) {
            logger.success('[TRACE] Already logged in detected! Skipping login modal flow.');
            await this.navigateToDaySelection();
            return;
        }

        logger.info(`[TRACE] Waiting for Pre-order menu button (selector: ${SELECTORS.PREORDER_MENU_BUTTON})...`);
        await this.page.waitForSelector(SELECTORS.PREORDER_MENU_BUTTON);
        logger.success('[TRACE] Pre-order menu button found!');

        logger.info('[TRACE] Clicking Pre-order menu button...');
        await this.page.click(SELECTORS.PREORDER_MENU_BUTTON);
        logger.success('[TRACE] Click executed');

        logger.info(`[TRACE] Waiting ${config.scraper.waitAfterClick}ms for modal to appear...`);
        await this.wait(config.scraper.waitAfterClick);
        logger.info(`[TRACE] Current URL after button click: ${this.page.url()}`);

        logger.info('[TRACE] ----- LOGIN FORM FILLING START -----');
        logger.info(`[TRACE] Waiting for modal container (selector: ${SELECTORS.LOGIN_MODAL_CONTAINER})...`);
        logger.info('[TRACE] Timeout: 30000ms');

        try {
            await this.page.waitForSelector(SELECTORS.LOGIN_MODAL_CONTAINER);
            logger.success('[TRACE] Modal container found!');
        } catch (error: any) {
            logger.error(`[TRACE] Modal container NOT found! Error: ${error.message}`);
            await this.saveScreenshot('failed_login_modal');
            const bodyText = await this.page.evaluate(() => document.body.innerText);
            logger.info(`[TRACE] Page body text (first 500 chars): ${bodyText.substring(0, 500)}`);
            throw error;
        }

        logger.info('[TRACE] Typing access code...');
        await this.fillInput(SELECTORS.LOGIN_ACCESS_CODE, config.credentials.employeeNumber);

        // Verify value
        const accessCodeValue = await this.page.$eval(SELECTORS.LOGIN_ACCESS_CODE, (el: any) => el.value);
        if (accessCodeValue !== config.credentials.employeeNumber) {
            logger.warn(`[TRACE] Access code value verification failed!`);
        }
        logger.success(`[TRACE] Access code entered`);
        await this.saveScreenshot('after_access_code_input');

        logger.info(`[TRACE] Waiting for password field (selector: ${SELECTORS.LOGIN_PASSWORD})...`);
        await this.page.waitForSelector(SELECTORS.LOGIN_PASSWORD);
        logger.success('[TRACE] Password field found!');

        logger.info('[TRACE] Typing password...');
        await this.fillInput(SELECTORS.LOGIN_PASSWORD, config.credentials.password);

        // Verify value
        const passwordValue = await this.page.$eval(SELECTORS.LOGIN_PASSWORD, (el: any) => el.value);
        if (passwordValue !== config.credentials.password) {
            logger.warn('[TRACE] Password value verification failed!');
        }
        logger.success('[TRACE] Password entered');
        await this.saveScreenshot('after_password_input');

        logger.info(`[TRACE] Checking for error messages before clicking login button...`);
        const errorMessage = await this.page.evaluate((selector) => {
            const errorElement = document.querySelector(selector);
            return errorElement ? (errorElement as HTMLElement).innerText : null;
        }, SELECTORS.LOGIN_ERROR_MESSAGE);

        if (errorMessage) {
            logger.warn(`[TRACE] Found error message before login click: "${errorMessage}". Attempting to proceed anyway.`);
        } else {
            logger.info('[TRACE] No error messages found.');
        }

        logger.info(`[TRACE] Clicking login button and pressing Enter: ${SELECTORS.LOGIN_SUBMIT}...`);
        try {
            await this.page.waitForSelector(SELECTORS.LOGIN_SUBMIT, { timeout: 10000 });

            // Check if button is disabled (Angular validation might have failed)
            const btnState = await this.page.$eval(SELECTORS.LOGIN_SUBMIT, (el: any) => ({
                disabled: el.disabled,
                text: el.innerText,
                classes: el.className
            }));

            logger.info(`[TRACE] Button state: disabled=${btnState.disabled}, classes="${btnState.classes}"`);

            if (btnState.disabled) {
                logger.warn(`[TRACE] Login button is DISABLED! Forcing direct click via evaluate and Enter key...`);
            }

            // Strategy: Focus password and press Enter + click button
            await this.page.focus(SELECTORS.LOGIN_PASSWORD);
            await this.page.keyboard.press('Enter');

            // Allow a small gap
            await this.wait(500);

            // Perform single click via page.click
            await this.page.click(SELECTORS.LOGIN_SUBMIT, { delay: 100 });

            // Fallback: trigger click via evaluate as well if Enter didn't work
            await this.page.evaluate((selector) => {
                const btn = document.querySelector(selector) as HTMLButtonElement;
                if (btn) btn.click();
            }, SELECTORS.LOGIN_SUBMIT);

            logger.success('[TRACE] Login triggers executed (Enter + Click)');
        } catch (error) {
            logger.error(`[TRACE] Failed to interact with login button: ${error}`);
            await this.saveScreenshot('failed_login_button_interaction');
            logger.info('[TRACE] Attempting "Enter" key final fallback on password field...');
            await this.page.focus(SELECTORS.LOGIN_PASSWORD);
            await this.page.keyboard.press('Enter');
        }

        logger.info(`[TRACE] Waiting ${config.scraper.waitAfterNavigation * 2}ms for transition... (increased for stability)`);
        await this.wait(config.scraper.waitAfterNavigation * 2);

        // Transition check & Refresh Strategy
        let isAtDaySelection = false;
        try {
            // Check for dialog or redirect
            await this.page.waitForSelector(SELECTORS.DAY_SELECTION_DIALOG, { timeout: 15000 });
            isAtDaySelection = true;
            logger.success('[TRACE] Day selection dialog appeared directly after login');
        } catch (e) {
            logger.warn('[TRACE] Day selection dialog not found after login. Investigating state...');
            await this.saveScreenshot('login_stuck_before_action');

            // Check if login modal is still present
            const isModalStillThere = await this.page.evaluate((sel1, sel2) => {
                return !!document.querySelector(sel1) || !!document.querySelector(sel2);
            }, SELECTORS.LOGIN_MODAL_CONTAINER, SELECTORS.LOGIN_ACCESS_CODE);

            if (isModalStillThere) {
                logger.warn('[TRACE] Login modal or fields are STILL present! Submit might have failed silently.');

                // Check for error messages specifically
                const postLoginError = await this.page.evaluate((selector) => {
                    const el = document.querySelector(selector);
                    return el ? (el as HTMLElement).innerText : null;
                }, SELECTORS.LOGIN_ERROR_MESSAGE);

                if (postLoginError) {
                    logger.error(`[TRACE] Login failed with error message: "${postLoginError}"`);
                    throw new Error(`Login failed on page: ${postLoginError}`);
                }
            }

            // Strategy: Check if we are at least logged in now (even if modal is weird)
            if (await this.isLoggedIn()) {
                logger.success('[TRACE] Detected as logged in after wait! Navigating to day selection.');
                await this.navigateToDaySelection();
                isAtDaySelection = true;
                return;
            }

            logger.warn('[TRACE] Not logged in and dialog missing. Applying Refresh Strategy...');

            // User's suggestion: Refresh the page and try again
            logger.info(`[TRACE] Refreshing page by navigating to ${URLS.BASE}...`);
            await this.page.goto(URLS.BASE, { waitUntil: 'networkidle2' });

            // Per user feedback: We must click the button again to see if the session is picked up
            logger.info('[TRACE] Refresh done. Clicking Pre-order button to trigger session check...');
            await this.navigateToDaySelection();

            // Re-verify login status
            if (await this.isLoggedIn()) {
                logger.success('[TRACE] Refresh confirmed: We are logged in! Day selection should be open.');
                isAtDaySelection = true;
            } else {
                logger.error('[TRACE] Refresh failed: Still not logged in. Login might have truly failed.');
                await this.saveScreenshot('login_failed_after_refresh');
                throw new Error('Login failed: Not logged in even after refresh.');
            }
        }

        logger.info(`[TRACE] Current URL after login attempt: ${this.page.url()}`);
        logger.success('[TRACE] ===== LOGIN FLOW ATTEMPT COMPLETE =====');
    }

    /**
     * Common logic to click the pre-order button and wait for the dialog
     */
    private async navigateToDaySelection(): Promise<void> {
        if (!this.page) throw new Error('Page not initialized');

        logger.info(`[TRACE] Clicking Pre-order menu button (selector: ${SELECTORS.PREORDER_MENU_BUTTON})...`);
        await this.page.waitForSelector(SELECTORS.PREORDER_MENU_BUTTON);
        await this.page.click(SELECTORS.PREORDER_MENU_BUTTON);
        logger.success('[TRACE] Pre-order menu button clicked');

        logger.info(`[TRACE] Waiting ${config.scraper.waitAfterNavigation}ms for transition to dialog...`);
        await this.wait(config.scraper.waitAfterNavigation);
    }

    private getWeekNumber(date: Date = new Date()): number {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }

    /**
     * Extract current week number and year from the page
     */
    private async extractWeekInfo(): Promise<{ year: number; weekNumber: number }> {
        if (!this.page) throw new Error('Page not initialized');

        logger.info('[TRACE] Extracting week information from page...');

        try {
            await this.page.waitForSelector(SELECTORS.WEEK_HEADER, { timeout: 10000 });
        } catch (e) {
            logger.warn('[TRACE] Week header selector not found, attempting anyway...');
        }

        const { weekText, headerTitle, bodyText } = await this.page.evaluate((selInfo) => {
            const h = document.querySelector(selInfo);
            return {
                weekText: h?.textContent || '',
                headerTitle: document.title || '',
                bodyText: document.body.innerText || ''
            };
        }, SELECTORS.WEEK_HEADER);

        logger.info(`[TRACE] Week header text: "${weekText}" (Title: "${headerTitle}")`);

        // Parse "CW 6", "KW 6", "Week 6", "Woche 6"
        // Try multiple sources: Header element, Page title, and Page body as a fallback
        const cwMatch = weekText.match(/(?:CW|KW|Week|Woche|W)\s*(\d+)/i) ||
            headerTitle.match(/(?:CW|KW|Week|Woche|W)\s*(\d+)/i) ||
            bodyText.match(/(?:CW|KW|Week|Woche|W)\s*(\d+)/i);

        const weekNumber = cwMatch ? parseInt(cwMatch[1]) : this.getWeekNumber();

        logger.info(`[TRACE] Parsed week number: ${weekNumber}`);

        // Get current year
        const year = new Date().getFullYear();
        logger.info(`[TRACE] Using year: ${year}`);

        logger.success(`[TRACE] Detected week: ${year}-W${weekNumber}`);
        return { year, weekNumber };
    }

    /**
     * Extract Authentication Token from LocalStorage
     */
    private async getAuthToken(): Promise<string> {
        if (!this.page) throw new Error('Page not initialized');

        const token = await this.page.evaluate(() => {
            const store = localStorage.getItem('AkitaStores');
            if (!store) return null;
            try {
                const parsed = JSON.parse(store);
                return parsed.auth?.token;
            } catch (e) {
                return null;
            }
        });

        if (!token) {
            throw new Error('Authentication token not found in LocalStorage (AkitaStores)');
        }
        return token;
    }

    /**
     * Fetch menu for a specific date using the Bessa API
     */
    private async fetchMenuForDate(token: string, date: string, weekday: string): Promise<DayMenu> {
        if (!this.page) throw new Error('Page not initialized');

        const venueId = 591;
        const menuId = 7; // "Bestellung" / configured menu ID
        const apiUrl = `${URLS.API_BASE}/venues/${venueId}/menu/${menuId}/${date}/`;

        // Execute fetch inside the browser context
        const responseData = await this.page.evaluate(async (url, authToken) => {
            try {
                const res = await fetch(url, {
                    headers: {
                        'Authorization': `Token ${authToken}`,
                        'Accept': 'application/json'
                    }
                });

                if (!res.ok) {
                    return { error: `Status ${res.status}: ${res.statusText}` };
                }

                return await res.json();
            } catch (e: any) {
                return { error: e.toString() };
            }
        }, apiUrl, token);

        if (responseData.error) {
            // 404 might just mean no menu for that day (e.g. weekend)
            logger.warn(`[TRACE] API fetch warning for ${date}: ${responseData.error}`);
            // Return empty menu for that day
            return { date, weekday, items: [] };
        }

        const apiResponse = responseData as ApiMenuResponse;
        const items: MenuItem[] = [];

        // Parse results
        if (apiResponse.results && apiResponse.results.length > 0) {
            for (const group of apiResponse.results) {
                if (group.items) {
                    for (const item of group.items) {
                        items.push({
                            id: `${date}_${item.id}`,
                            name: item.name,
                            description: item.description,
                            price: parseFloat(item.price),
                            available: parseInt(item.available_amount) > 0 || item.available_amount === null // Null sometimes acts as available
                        });
                    }
                }
            }
        }

        return {
            date,
            weekday,
            items
        };
    }

    /**
     * Scrape menu for the current week using API
     */
    /**
     * Scrape menus starting from current week until no more data is found (min 2 weeks)
     */
    async scrapeMenus(saveToFile: boolean = true): Promise<WeeklyMenu> {
        await this.init();
        try {
            logger.info('[TRACE] ========== SCRAPING MENUS (MULTI-WEEK) ==========');

            // 1. Navigate and Login (uses env credentials by default if not previously logged in in this instance, 
            // but here we assume login() called before or we use default)
            // Ideally scrapeMenus should rely on session but current flow navigates again.
            // Let's ensure we don't double login if already on page?
            // Actually, for the /api/login flow, we will call scraper.login(user, pass) explicitly.
            // But scrapeMenus calls this.login() internally. We should refactor scrapeMenus to accept credentials or skip login if already done.
            // BETTER: separate init/login from scraping loop.
            // For now, to keep it compatible:
            if (!this.page) await this.init(); // Re-init if needed

            // If we are calling from /api/login, we might have already logged in. 
            // But scrapeMenus does full flow.
            // Let's modify scrapeMenus to ONLY scrape and assume login is handled IF we want to separate them.
            // However, existing `main()` calls `scrapeMenus()` which does everything.
            // Let's just make it check if we are already logged in? Hard with Puppeteer statelessness efficiently.

            // Simpler approach for this task:
            // Let scrapeMenus take optional credentials too? No, keep it simple.
            // We will let the server call `login` then `scrapeMenus`. 
            // BUT `scrapeMenus` calls `login`. We need to remove `login` from `scrapeMenus` or make it conditional.
            // Let's make `scrapeMenus` NOT strictly require login if we are already there, OR just call `login` again (idempotent-ish).
            // Actually, `login` types in credentials.

            // Modification: scrapeMenus will use whatever credentials are set or env.
            // But wait, `scrapeMenus` has `await this.login()` hardcoded.
            // We will invoke `navigateAndAcceptCookies` and `login` ONLY if we are seemingly not ready.
            // Or easier: Make a new method `scrapeMenusRaw` or just reuse `scrapeMenus` but pass a flag `skipLogin`.

            await this.navigateAndAcceptCookies();
            // We'll rely on the caller to have called login if they wanted custom creds, 
            // OR we call login here with defaults if not. 
            // ISSUE: `this.login()` uses env vars if no args.
            // If the server calls `await scraper.login(u,p)`, then calls `await scraper.scrapeMenus()`, 
            // `scrapeMenus` will call `this.login()` (no args) -> uses env vars -> OVERWRITES the user session with default admin!

            // FIX: Add `skipLogin` param.

        } catch (e) { /*...*/ }
        return { days: [], weekNumber: 0, year: 0, scrapedAt: '' }; // stub
    }

    // RETHINKING: The tool requires REPLACE.
    // Let's change signature to `async scrapeMenus(saveToFile: boolean = true, skipLogin: boolean = false): Promise<WeeklyMenu>`

    async scrapeMenus(saveToFile: boolean = true, skipLogin: boolean = false): Promise<WeeklyMenu> {
        await this.init();
        try {
            logger.info('[TRACE] ========== SCRAPING MENUS (MULTI-WEEK) ==========');

            if (!skipLogin) {
                await this.navigateAndAcceptCookies();
                await this.login();
            }

            // 2. Get Auth Token
            logger.info('[TRACE] Retrieving Auth Token...');
            const token = await this.getAuthToken();
            logger.success(`[TRACE] Auth token retrieved: ${token.substring(0, 10)}...`);

            // 3. Determine Start Date (Monday of current week)
            const today = new Date();
            const weekInfo = await this.extractWeekInfo();

            const currentDay = today.getUTCDay() || 7; // Sunday is 0 -> 7
            const startMonday = new Date(today);
            startMonday.setUTCDate(today.getUTCDate() - currentDay + 1);
            // Reset time to avoid drift
            startMonday.setUTCHours(0, 0, 0, 0);

            logger.info(`[TRACE] Starting scrape from ${startMonday.toISOString().split('T')[0]}`);

            const days: DayMenu[] = [];
            const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

            const MAX_WEEKS = 8;
            const MIN_DAYS_COVERAGE = 14;

            let currentDate = new Date(startMonday);
            let daysProcessed = 0;

            while (true) {
                // Safety break to prevent infinite loops (approx 8 weeks)
                if (daysProcessed > MAX_WEEKS * 7) {
                    logger.warn('[TRACE] Reached maximum week limit (safety break). Stopping.');
                    break;
                }

                const dayOfWeek = currentDate.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                if (isWeekend) {
                    // Skip weekends, just advance
                    // logger.debug(`[TRACE] Skipping weekend: ${currentDate.toISOString().split('T')[0]}`);
                    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
                    daysProcessed++;
                    continue;
                }

                const dateStr = currentDate.toISOString().split('T')[0];
                // Map 0(Sun)->6, 1(Mon)->0, etc.
                const dayNameIndex = (dayOfWeek + 6) % 7;
                const weekday = dayNames[dayNameIndex];

                logger.info(`[TRACE] Fetching menu for ${weekday} (${dateStr})...`);

                try {
                    const dayMenu = await this.fetchMenuForDate(token, dateStr, weekday);

                    if (dayMenu.items.length === 0) {
                        // Check if we have covered enough time
                        // Calculate difference in days from start
                        const diffTime = Math.abs(currentDate.getTime() - startMonday.getTime());
                        const daysCovered = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (daysCovered >= MIN_DAYS_COVERAGE) {
                            logger.info(`[TRACE] Stopping scraping at ${dateStr} (No items found and > 2 weeks covered)`);
                            break;
                        } else {
                            logger.info(`[TRACE] Empty menu at ${dateStr}, but only covered ${daysCovered} days. Continuing...`);
                            // Add empty day to preserve structure if needed, or just skip? 
                            // Usually we want to record empty days if they are valid weekdays
                            days.push(dayMenu);
                        }
                    } else {
                        days.push(dayMenu);
                    }

                } catch (error) {
                    logger.error(`[TRACE] Failed to fetch menu for ${dateStr}: ${error}`);
                    days.push({ date: dateStr, weekday, items: [] });
                }

                // Advance to next day
                currentDate.setUTCDate(currentDate.getUTCDate() + 1);
                daysProcessed++;

                // Be nice to the API
                await this.wait(150);
            }

            const resultMenu: WeeklyMenu = {
                year: weekInfo.year,
                weekNumber: weekInfo.weekNumber,
                days: days,
                scrapedAt: new Date().toISOString()
            };

            logger.success(`[TRACE] Scraping completed. Found ${days.length} days of menus.`);
            return resultMenu;

        } catch (error) {
            logger.error(`[TRACE] Scraping failed: ${error}`);
            await this.saveScreenshot('scrape_error');
            throw error;
        } finally {
            await this.close();
        }
    }

    /**
     * Helper to wait
     */
    private async wait(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

