
import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import * as readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure we have a place to save logs
const ARTIFACTS_DIR = process.env.ANTIGRAVITY_ARTIFACTS_DIR || path.join(process.cwd(), 'analysis_results');

async function ensureDir(dir: string) {
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
}

async function runInteractiveAnalysis() {
    await ensureDir(ARTIFACTS_DIR);
    console.log('--- INTERACTIVE ANALYSIS TOOL ---');
    console.log('Starting Browser (Headless: FALSE)...');
    console.log('Artifacts will be saved to:', ARTIFACTS_DIR);

    const browser = await puppeteer.launch({
        headless: false, // User wants to see and interact
        defaultViewport: null, // Full window
        executablePath: '/usr/bin/chromium',
        args: [
            '--start-maximized',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ],
        devtools: true // Useful for the user to see what's happening
    });

    const page = await browser.newPage();

    // Setup Data Collection
    const networkLogs: any[] = [];
    const relevantHosts = ['bessa.app', 'web.bessa.app'];

    await page.setRequestInterception(true);

    page.on('request', (request) => {
        // Continue all requests
        request.continue();
    });

    page.on('response', async (response) => {
        const url = response.url();
        const type = response.request().resourceType();

        // Filter: We are mainly interested in XHR, Fetch, and Documents (for initial load)
        // And only from relevant hosts to avoid noise (analytics, external fonts, etc.)
        const isRelevantHost = relevantHosts.some(host => url.includes(host));
        const isRelevantType = ['xhr', 'fetch', 'document', 'script'].includes(type);

        if (isRelevantHost && isRelevantType) {
            try {
                // Try to get JSON response
                let responseBody = null;
                if (url.includes('/api/') || type === 'xhr' || type === 'fetch') {
                    try {
                        responseBody = await response.json();
                    } catch (e) {
                        // Not JSON, maybe text?
                        try {
                            // Limit text size
                            const text = await response.text();
                            responseBody = text.length > 2000 ? text.substring(0, 2000) + '...[TRUNCATED]' : text;
                        } catch (e2) {
                            responseBody = '[COULD NOT READ BODY]';
                        }
                    }
                }

                networkLogs.push({
                    timestamp: new Date().toISOString(),
                    method: response.request().method(),
                    url: url,
                    status: response.status(),
                    type: type,
                    requestHeaders: response.request().headers(),
                    responseHeaders: response.headers(),
                    body: responseBody
                });

                // Real-time feedback
                if (url.includes('/api/')) {
                    console.log(`[API CAPTURED] ${response.request().method()} ${url}`);
                }

            } catch (err) {
                // Ignore errors reading response (e.g. redirects or closed)
            }
        }
    });

    // Initial navigation
    console.log('Navigating to base URL...');
    await page.goto('https://web.bessa.app/knapp-kantine', { waitUntil: 'networkidle2' });

    console.log('\n================================================================================');
    console.log('BROWSER IS OPEN. PLEASE ACTION REQUIRED:');
    console.log('1. Log in manually in the browser window.');
    console.log('2. Navigate to the menu view (Day Selection -> Select Day -> Menu).');
    console.log('3. Browse around to trigger API calls.');
    console.log('\nWHEN YOU ARE DONE, PRESS [ENTER] IN THIS TERMINAL TO SAVE AND EXIT.');
    console.log('================================================================================\n');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    await new Promise<void>(resolve => {
        rl.question('Press Enter to finish analysis...', () => {
            rl.close();
            resolve();
        });
    });

    console.log('Capturing final state...');

    // 1. Save Full Page HTML
    const html = await page.content();
    await fs.writeFile(path.join(ARTIFACTS_DIR, 'final_page_state.html'), html);

    // 2. Save Cookies/Storage (for Auth Replication)
    const client = await page.target().createCDPSession();
    const cookies = await client.send('Network.getAllCookies');
    await fs.writeFile(path.join(ARTIFACTS_DIR, 'cookies.json'), JSON.stringify(cookies, null, 2));

    const localStorageData = await page.evaluate(() => {
        return JSON.stringify(localStorage);
    });
    await fs.writeFile(path.join(ARTIFACTS_DIR, 'local_storage.json'), localStorageData);

    const sessionStorageData = await page.evaluate(() => {
        return JSON.stringify(sessionStorage);
    });
    await fs.writeFile(path.join(ARTIFACTS_DIR, 'session_storage.json'), sessionStorageData);

    // 3. Save Network Logs
    await fs.writeFile(path.join(ARTIFACTS_DIR, 'network_traffic.json'), JSON.stringify(networkLogs, null, 2));

    console.log('Analysis data saved to:', ARTIFACTS_DIR);
    await browser.close();
    process.exit(0);
}

runInteractiveAnalysis().catch(console.error);
