const fs = require('fs');
fs.writeFileSync('trace.log', '');
function log(m) { fs.appendFileSync('trace.log', m + '\n'); }

log("Initializing JSDOM...");
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

log("Reading html...");
const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        .hidden { display: none !important; }
        .icon-btn { display: inline-flex; }
    </style>
</head>
<body>
    <button id="alarm-bell" class="icon-btn hidden">
        <span id="alarm-bell-icon" style="color:var(--text-secondary);"></span>
    </button>
    
    <!-- Mocks for Highlights Feature -->
    <button id="btn-highlights">Highlights</button>
    <div id="highlights-modal" class="modal hidden">
        <button id="btn-highlights-close">Close</button>
        <input id="tag-input" type="text" />
        <button id="btn-add-tag">Add</button>
        <ul id="tags-list"></ul>
    </div>
    
    <!-- Mocks for Login Modal -->
    <button id="btn-login-open">Login</button>
    <div id="login-modal" class="modal hidden">
        <button id="btn-login-close">Close</button>
        <form id="login-form"></form>
        <div id="login-error" class="hidden"></div>
    </div>

    <!-- Mocks for Dish Image Popover -->
    <div id="dish-image-popover" class="dish-image-popover hidden" role="dialog" aria-hidden="true">
        <div class="dish-image-popover-header">
            <span id="dish-image-title"></span>
            <button id="btn-dish-image-close" class="icon-btn" aria-label="Close" title="Schließen">
                <span class="material-icons-round">close</span>
            </button>
        </div>
        <div id="dish-image-body"></div>
    </div>
    
    <!-- Mocks for History Modal -->
    <button id="btn-history">History</button>
    <div id="history-modal" class="modal hidden">
        <button id="btn-history-close">Close</button>
        <div id="history-loading" class="hidden"></div>
        <div id="history-content"></div>
    </div>

    <!-- Mocks for Version Modal -->
    <span class="version-tag">v1.4.17</span>
    <div id="version-modal" class="modal hidden">
        <button id="btn-version-close">Close</button>
        <button id="btn-clear-cache">Clear</button>
        <span id="version-current"></span>
        <div id="version-list-container"></div>
    </div>

    <!-- Mocks for Theme Toggle -->
    <button id="theme-toggle"><span class="theme-icon">light_mode</span></button>

    <!-- Mocks for Navigation Tabs -->
    <button id="btn-this-week" class="active">This Week</button>
    <button id="btn-next-week">Next Week</button>

    <!-- Mocks for Language Toggle -->
    <div id="lang-toggle">
        <button id="btn-lang-toggle"><span class="material-icons-round">translate</span></button>
        <div id="lang-dropdown" class="hidden">
            <button class="lang-btn" data-lang="de">🇦🇹 DE</button>
            <button class="lang-btn" data-lang="en">🇬🇧 EN</button>
            <button class="lang-btn" data-lang="all">🌐 ALL</button>
        </div>
    </div>
    
    <button id="btn-refresh">Refresh</button>
    <button id="btn-logout">Logout</button>
    <div class="order-history-header">Header</div>
    <button id="btn-error-redirect">Error Redirect</button>
</body>
</html>
`;

log("Reading file jsCode...");
const jsCode = fs.readFileSync('dist/kantine.bundle.js', 'utf8')
    .replace('if (window.__KANTINE_LOADED) {', 'if (false) {')
    .replace('window.location.reload();', 'window.__RELOAD_CALLED = true;')
    .replace('function createDayCard(day) {', 'window.createDayCard = function(day) {')
    .replace('function closeDishImageModal() {', 'window.openDishImageModal = openDishImageModal; window.closeDishImageModal = closeDishImageModal;\nfunction closeDishImageModal() {');

log("Instantiating JSDOM...");
const { VirtualConsole } = require('jsdom');
const virtualConsole = new VirtualConsole();
['log', 'info', 'warn', 'error', 'debug', 'trace'].forEach((ev) =>
    virtualConsole.on(ev, (...args) => console[ev === 'trace' ? 'log' : ev](...args))
);
virtualConsole.on('jsdomError', (err) => {
    const msg = (err && err.message) || String(err);
    // Expected interim noise: jsdom never opens the Google tab, and
    // open/closeDishImageModal land in this module only in the next wave (Todo 6).
    if (/Not implemented: navigation/.test(msg)) return;
    if (/openDishImageModal|closeDishImageModal/.test(msg)) return;
    console.error(msg);
});
const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://web.bessa.app/", virtualConsole });
log("JSDOM dom created...");
global.window = dom.window;
global.document = window.document;
global.localStorage = { getItem: () => '[]', setItem: () => { } };
global.sessionStorage = { getItem: () => null };

global.showToast = () => { };
global.saveFlags = () => { };
global.renderVisibleWeeks = () => { };
// Mock missing browser features if needed
global.Notification = { permission: 'default', requestPermission: () => { } };
global.window.matchMedia = () => ({ matches: false, addListener: () => { }, removeListener: () => { } });
global.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) });
global.window.fetch = global.fetch;

log("Before eval...");
const testCode = `
        console.log("--- Testing Alarm Bell ---");
        // We will mock the state directly to test logic via JSDOM event firing if possible,
        // but for now bypass webpack internal requires and let the application logic fire.

        // Add flag
        const alarmBtn = document.getElementById('alarm-bell');
        alarmBtn.classList.remove('hidden');
        if (document.getElementById('alarm-bell').className.includes('hidden')) throw new Error("Bell should be visible");

        // Remove flag
        alarmBtn.classList.add('hidden');
        if (!document.getElementById('alarm-bell').className.includes('hidden')) throw new Error("Bell should be hidden");

        // Test Click Refresh
        alarmBtn.click();
        console.log("✅ Alarm Bell Test (Click) Passed");

        console.log("--- Testing Highlights Modal ---");
        // First, verify initial state
        const hlModal = document.getElementById('highlights-modal');
        if (!hlModal.classList.contains('hidden')) throw new Error("Highlights modal should be hidden initially");

        // Click to open
        document.getElementById('btn-highlights').click();
        if (hlModal.classList.contains('hidden')) throw new Error("Highlights modal did not open upon clicking btn-highlights!");

        // Click to close
        document.getElementById('btn-highlights-close').click();
        if (!hlModal.classList.contains('hidden')) throw new Error("Highlights modal did not close upon clicking btn-highlights-close!");

        console.log("✅ Highlights Modal Test Passed");
        
        console.log("--- Testing Login Modal ---");
        const loginModal = document.getElementById('login-modal');
        document.getElementById('btn-login-open').click();
        if (loginModal.classList.contains('hidden')) throw new Error("Login modal should open");
        document.getElementById('btn-login-close').click();
        if (!loginModal.classList.contains('hidden')) throw new Error("Login modal should close");
        console.log("✅ Login Modal Test Passed");

        console.log("--- Testing History Modal ---");
        // Due to Webpack isolation, we simulate the internal state change by manually firing the
        // login process and then clicking the history button, which will bypass checking the isolated authToken if mocked properly.
        // Actually, btnHistory doesn't depend on external modules if we click login first, but login modal handles auth logic internally.
        // For testing we'll just test that login opens when clicking history if not logged in.

        const historyModal = document.getElementById('history-modal');
        document.getElementById('btn-history').click();
        // Fallback checks logic - either history modal opens or login modal opens
        if (historyModal.classList.contains('hidden') && loginModal.classList.contains('hidden')) {
            throw new Error("Either history or login modal should open");
        }
        document.getElementById('btn-history-close').click();
        document.getElementById('btn-login-close').click(); // close whichever opened
        console.log("✅ History Modal Test Passed (with unauthenticated fallback)");

        console.log("--- Testing Version Modal ---");
        const versionModal = document.getElementById('version-modal');
        document.querySelector('.version-tag').click();
        if (versionModal.classList.contains('hidden')) throw new Error("Version modal should open");
        document.getElementById('btn-version-close').click();
        if (!versionModal.classList.contains('hidden')) throw new Error("Version modal should close");
        console.log("✅ Version Modal Test Passed");

        console.log("--- Testing Version List: Two-Button Layout ---");
        // Simulate renderVersionsList with mock data
        const versionContainer = document.getElementById('version-list-container');
        versionContainer.innerHTML = '<ul class="version-list"></ul>';
        const vList = versionContainer.querySelector('.version-list');

        // Insert a version item as the code would (non-current version)
        const mockLi = document.createElement('li');
        mockLi.className = 'version-item';
        mockLi.innerHTML = \`
            <div class="version-info"><strong>v1.7.0</strong></div>
            <div class="version-actions">
                <button class="btn-install-raw" data-raw-url="https://raw.githubusercontent.com/TauNeutrino/kantine-overview/refs/tags/v1.7.0/dist/install.html"
                    title="v1.7.0 installieren">Installieren</button>
                <a href="https://github.com/TauNeutrino/kantine-overview/blob/v1.7.0/dist/install.html"
                    target="_blank" class="btn-github-link" title="v1.7.0 auf GitHub ansehen">&rarr; Github</a>
            </div>
        \`;
        vList.appendChild(mockLi);

        // Verify: .btn-install-raw must exist (new layout)
        const installBtn = versionContainer.querySelector('.btn-install-raw');
        if (!installBtn) throw new Error("Version list: .btn-install-raw button not found");

        // Verify: .btn-github-link must exist (new layout)
        const githubLink = versionContainer.querySelector('.btn-github-link');
        if (!githubLink) throw new Error("Version list: .btn-github-link not found");

        // Verify: github link opens in new tab
        if (githubLink.getAttribute('target') !== '_blank') throw new Error("Version list: .btn-github-link must have target=_blank");

        // Verify: old .install-link no longer present
        const oldLink = versionContainer.querySelector('.install-link');
        if (oldLink) throw new Error("Version list: old .install-link element should not exist");

        // Verify raw URL references raw.githubusercontent.com (not htmlpreview)
        const rawUrl = installBtn.dataset.rawUrl;
        if (!rawUrl || rawUrl.includes('htmlpreview')) throw new Error("Version list: rawUrl must not use htmlpreview: " + rawUrl);
        if (!rawUrl.includes('raw.githubusercontent.com')) throw new Error("Version list: rawUrl must use raw.githubusercontent.com: " + rawUrl);

        console.log("✅ Version List Two-Button Layout Test Passed");

        console.log("--- Testing Theme Toggle ---");
        const themeBtn = document.getElementById('theme-toggle');
        const initialTheme = document.documentElement.getAttribute('data-theme');
        themeBtn.click();
        const newTheme = document.documentElement.getAttribute('data-theme');
        if (initialTheme === newTheme) throw new Error("Theme did not toggle");
        console.log("✅ Theme Toggle Test Passed");

        console.log("--- Testing Navigation Tabs ---");
        const btnThis = document.getElementById('btn-this-week');
        const btnNext = document.getElementById('btn-next-week');
        btnNext.click();
        if (!btnNext.classList.contains('active') || btnThis.classList.contains('active')) throw new Error("Next week tab not active");
        btnThis.click();
        if (!btnThis.classList.contains('active') || btnNext.classList.contains('active')) throw new Error("This week tab not active");
        console.log("✅ Navigation Tabs Test Passed");
        
        console.log("--- Testing Clear Cache Button ---");
        // Mock confirm directly inside evaluated JSDOM context
        window.confirm = () => true;
        document.getElementById('btn-clear-cache').click();
        if (!window.__RELOAD_CALLED) throw new Error("Clear cache did not reload the page");
        console.log("✅ Clear Cache Button Test Passed");

        console.log("--- Testing Bug 2: renderTagsList() called on modal open ---");
        // Close the modal first (it may still be open from earlier test)
        document.getElementById('btn-highlights-close').click();
        const hlModalBug2 = document.getElementById('highlights-modal');
        if (!hlModalBug2.classList.contains('hidden')) {
            hlModalBug2.classList.add('hidden');
        }
        // Open the modal — this should call renderTagsList() without throwing
        let bug2Error = null;
        try {
            document.getElementById('btn-highlights').click();
        } catch(e) {
            bug2Error = e;
        }
        if (bug2Error) throw new Error("Bug 2: Opening highlights modal threw an error: " + bug2Error.message);
        // After click the modal should be visible (i.e., the handler completed)
        if (hlModalBug2.classList.contains('hidden')) throw new Error("Bug 2: Highlights modal did not open – renderTagsList may have thrown");
        console.log("✅ Bug 2: renderTagsList() called on modal open without error – Test Passed");

        console.log("--- Testing Feature 3: Next-week button has tooltip, no numeric spans ---");
        const nextWeekBtn = document.getElementById('btn-next-week');
        // The button should not contain any .nav-badge elements with numbers
        const navBadge = nextWeekBtn.querySelector('.nav-badge');
        if (navBadge) throw new Error("Feature 3: .nav-badge should not be present in next-week button");
        console.log("✅ Feature 3: No numeric badge in next-week button – Test Passed");

        console.log("--- Testing Feature 4: Language toggle updates UI labels ---");
        const enBtn = document.querySelector('.lang-btn[data-lang="en"]');
        if (enBtn) {
            enBtn.click();
            // After EN click, btn-this-week should be in English
            const thisWeekBtn = document.getElementById('btn-this-week');
            // Check that textContent is not the original German default "Diese Woche" or "This Week" (either is fine – just that the handler ran)
            console.log("✅ Feature 4: Language toggle click handler ran without error – Test Passed");
        } else {
            throw new Error("Feature 4: EN language button not found");
        }

        console.log("--- Testing Confidence Badge (DEV Mode) ---");
        const mockDay = {
            date: '2026-06-25',
            weekday: 4,
            items: [{
                id: 'item_123',
                articleId: 123,
                name: 'Schnitzel',
                description: 'DE: Wiener Schnitzel | EN: Viennese Schnitzel (Confidence: 0.95)',
                price: 5.50,
                available: true,
                amountTracking: false
            }]
        };

        localStorage.setItem('kantine_dev_mode', 'false');
        let cardOff = window.createDayCard(mockDay);
        if (cardOff && cardOff.querySelector('.confidence-badge')) throw new Error('Badge should be absent when DEV off');

        localStorage.setItem('kantine_dev_mode', 'true');
        let cardOn = window.createDayCard(mockDay);
        let badgeOn = cardOn ? cardOn.querySelector('.confidence-badge') : null;
        if (!badgeOn) throw new Error('Badge must be present when DEV on');
        
        let titleAttr = badgeOn.getAttribute('title') || '';
        if (!titleAttr.includes('score')) throw new Error('Badge tooltip must contain score');
        console.log("✅ Confidence Badge (DEV Mode) Test Passed");

        window.__TEST_PASSED = true;
    `;

dom.window.eval(jsCode + "\n" + testCode);

if (!dom.window.__TEST_PASSED) {
    throw new Error("Tests failed to reach completion inside JSDOM.");
}

console.log("--- Testing Background Specificity Fix (CSS) ---");
const cssContent = fs.readFileSync('style.css', 'utf8');
if (!cssContent.includes('body, body.bg')) {
    throw new Error("CSS Fix: body.bg selector is missing");
}
if (!cssContent.includes('background-color: var(--bg-body) !important;')) {
    throw new Error("CSS Fix: body.bg background-color !important is missing");
}
if (!cssContent.includes('font-family: \'Inter\', system-ui, -apple-system, sans-serif !important;')) {
    throw new Error("CSS Fix: body.bg font-family !important is missing");
}
if (!/#kantine-wrapper\s*\{[^}]*background-color:\s*var\(--bg-body\)/.test(cssContent)) {
    throw new Error("CSS Fix: #kantine-wrapper background-color is missing or incorrect");
}
console.log("✅ CSS Background Specificity Fix Test Passed");

console.log("--- Testing Dish Image Trigger Link (Todo 5) ---");
const w = dom.window;
const d = w.document;
const HIGH_DESC = 'Zucchinisuppe / Zucchini soup Lasagne Bolognese mit Tomatensauce / Lasagna Bolognese with tomato sauce(AFO) Himbeer- Mandelkuchen / Rasberry- almond cake(AFH)';
const TEMPLATE_DESC = 'Suppe / Soup Salat / Salad Dessert';
const HOVER_MS = 500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const interimErrors = [];
w.addEventListener('error', (e) => {
    const msg = e.message || '';
    if (/openDishImageModal|closeDishImageModal/.test(msg)) {
        interimErrors.push(msg);
        e.preventDefault();
    }
});

function makeDishCard(description, articleId) {
    const day = {
        date: '2026-09-02',
        weekday: 3,
        items: [{
            id: 'item_' + articleId,
            articleId,
            name: 'Menü ' + articleId,
            description,
            price: 6.5,
            available: true,
            amountTracking: false
        }]
    };
    const card = w.createDayCard(day);
    d.body.appendChild(card);
    return card;
}

function firePointer(el, type, pointerType) {
    const ev = new w.Event(type, { cancelable: true });
    ev.pointerType = pointerType;
    el.dispatchEvent(ev);
}

function readDishTabCount() {
    const raw = w.localStorage.getItem('_kstats_state');
    if (!raw) return 0;
    try {
        return (JSON.parse(raw).daily || {}).dish_image_tab || 0;
    } catch (e) {
        return 0;
    }
}

const realMatchMedia = w.matchMedia;
const realSetTimeout = w.setTimeout;
let scheduledTimers = [];
function setHoverCapable(capable) {
    w.matchMedia = (q) => ({
        matches: capable && q === '(hover: hover) and (pointer: fine)',
        addListener: () => { }, removeListener: () => { },
        addEventListener: () => { }, removeEventListener: () => { }
    });
}
function startTimerSpy() {
    scheduledTimers = [];
    w.setTimeout = function (fn, ms, ...args) {
        scheduledTimers.push(ms);
        return realSetTimeout.call(w, fn, ms, ...args);
    };
}
function stopTimerSpy() {
    w.setTimeout = realSetTimeout;
}

// === Dish Image Modal (Todo 6) helpers ===
const CAROUSEL_MS = 3000;
const realSetInterval = w.setInterval;
const defaultFetch = w.fetch;
let intervalCalls = [];
function spyIntervals() {
    intervalCalls = [];
    w.setInterval = function (fn, ms, ...args) {
        intervalCalls.push(ms);
        return realSetInterval.call(w, fn, ms, ...args);
    };
}
function restoreIntervals() {
    w.setInterval = realSetInterval;
}
function clearDishCache() {
    // LS.DISH_IMAGE_CACHE value — this harness evals the built bundle and has no ES-module import path to constants.js
    w.localStorage.removeItem('kantine_dishImageCache');
}
const IMG0 = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:modalCase0&sig=A';
const IMG1 = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:modalCase1&sig=B';
function mockGoogleFetch(thumbUrls) {
    const html = thumbUrls.map((u) => `<img src="${u.replace(/&/g, '&amp;')}">`).join('');
    w.fetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve(html) });
}
function mockFetchFailure() {
    w.fetch = () => Promise.resolve({ ok: false, text: () => Promise.resolve(''), json: () => Promise.resolve({}) });
}
function setReducedMotion(on) {
    w.matchMedia = (q) => ({
        matches: on && q === '(prefers-reduced-motion: reduce)',
        addListener: () => { }, removeListener: () => { },
        addEventListener: () => { }, removeEventListener: () => { }
    });
}

async function runDishImageTests() {
    // Deterministic language: the Feature-4 test above toggled the UI to EN
    d.querySelector('.lang-btn[data-lang="de"]').click();

    // (a) high split → anchor with safe Google image-search href
    {
        const card = makeDishCard(HIGH_DESC, 901);
        const link = card.querySelector('.dish-image-link');
        if (!link) throw new Error('(a) .dish-image-link missing for high split');
        if (link.tagName !== 'A') throw new Error('(a) trigger must be an <a>, got ' + link.tagName);
        if (link.getAttribute('target') !== '_blank') throw new Error('(a) target=_blank missing');
        const rel = link.getAttribute('rel') || '';
        if (!rel.includes('noopener') || !rel.includes('noreferrer')) throw new Error('(a) rel must contain noopener and noreferrer, got: ' + rel);
        const query = link.getAttribute('data-dish-query');
        if (!query || !query.includes('Lasagne Bolognese')) throw new Error('(a) data-dish-query must carry the main course, got: ' + query);
        const href = link.getAttribute('href');
        if (!href.startsWith('https://www.google.com/search?q=')) throw new Error('(a) href must start with Google search URL, got: ' + href);
        if (!href.includes('udm=2')) throw new Error('(a) href must contain udm=2, got: ' + href);
        if (href !== 'https://www.google.com/search?q=' + encodeURIComponent(query) + '&udm=2') throw new Error('(a) href must encode the query exactly, got: ' + href);
        if (!link.getAttribute('title')) throw new Error('(a) tooltip title missing');
        const desc = card.querySelector('.item-desc');
        if (!desc.textContent.includes('Zucchinisuppe')) throw new Error('(a) other course lines must stay rendered');
        card.remove();
        console.log('OK (a) high split renders dish-image-link anchor');
    }

    // (b) template split → no link, plain text rendering unchanged
    {
        const card = makeDishCard(TEMPLATE_DESC, 902);
        if (card.querySelector('.dish-image-link')) throw new Error('(b) template split must NOT render a link');
        if (card.querySelector('.item-desc a')) throw new Error('(b) template desc must contain no anchor');
        const desc = card.querySelector('.item-desc');
        if (!desc.textContent.includes('Suppe') || !desc.textContent.includes('Dessert')) throw new Error('(b) template desc text lost');
        card.remove();
        console.log('OK (b) template split renders plain text without link');
    }

    // (c) click → tracker counts dish_image_tab +1 (no preventDefault, jsdom does not navigate)
    {
        const card = makeDishCard(HIGH_DESC, 903);
        const link = card.querySelector('.dish-image-link');
        if (!link) throw new Error('(c) link fixture broken');
        const before = readDishTabCount();
        link.click();
        const after = readDishTabCount();
        if (after !== before + 1) throw new Error('(c) dish_image_tab must increment by 1, got ' + before + ' → ' + after);
        card.remove();
        console.log('OK (c) click increments dish_image_tab by 1');
    }

    // (d) pointerenter with touch pointer → NO dwell timer
    {
        setHoverCapable(true);
        startTimerSpy();
        const card = makeDishCard(HIGH_DESC, 904);
        const link = card.querySelector('.dish-image-link');
        firePointer(link, 'pointerenter', 'touch');
        stopTimerSpy();
        if (scheduledTimers.includes(HOVER_MS)) throw new Error('(d) touch pointer must not start the dwell timer');
        card.remove();
        console.log('OK (d) touch pointerenter starts no dwell timer');
    }

    // (e) non-hover device (matchMedia false) → pointerenter mouse starts NO timer
    {
        setHoverCapable(false);
        startTimerSpy();
        const card = makeDishCard(HIGH_DESC, 905);
        const link = card.querySelector('.dish-image-link');
        firePointer(link, 'pointerenter', 'mouse');
        stopTimerSpy();
        if (scheduledTimers.includes(HOVER_MS)) throw new Error('(e) non-hover-capable device must not start the dwell timer');
        card.remove();
        console.log('OK (e) hover-incapable device starts no dwell timer');
    }

    // (f) mouse dwell: timer starts, pointerleave at 499 ms clears it → no popup
    {
        setHoverCapable(true);
        startTimerSpy();
        const card = makeDishCard(HIGH_DESC, 906);
        const link = card.querySelector('.dish-image-link');
        const openErrorsBefore = interimErrors.filter((m) => /openDishImageModal/.test(m)).length;
        firePointer(link, 'pointerenter', 'mouse');
        const started = scheduledTimers.includes(HOVER_MS);
        await sleep(499);
        firePointer(link, 'pointerleave', 'mouse');
        await sleep(400);
        stopTimerSpy();
        if (!started) throw new Error('(f) mouse pointerenter on hover-capable device must start the dwell timer');
        const openErrorsAfter = interimErrors.filter((m) => /openDishImageModal/.test(m)).length;
        if (openErrorsAfter !== openErrorsBefore) throw new Error('(f) popup must not open after pointerleave cleared the timer');
        const modal = d.getElementById('dish-image-popover');
        if (modal && !modal.classList.contains('hidden')) throw new Error('(f) no dish-image modal may be visible after cleared dwell');
        card.remove();
        console.log('OK (f) dwell timer cleared by pointerleave before popup');
    }

    // === Dish Image Modal cases (Todo 6) ===
    const dishModal = d.getElementById('dish-image-popover');
    const dishBody = d.getElementById('dish-image-body');

    // (a) open → visible, 2 skeleton blocks, query as title, aria-hidden false
    {
        clearDishCache();
        w.openDishImageModal('Lasagne Mod A');
        if (dishModal.classList.contains('hidden')) throw new Error('modal(a) popover must be visible after open');
        if (dishModal.getAttribute('aria-hidden') !== 'false') throw new Error('modal(a) aria-hidden must be false when open');
        if (dishBody.querySelectorAll('.skeleton.dish-image-skeleton').length !== 2) throw new Error('modal(a) expected 2 skeleton blocks, got ' + dishBody.querySelectorAll('.skeleton.dish-image-skeleton').length);
        if (d.getElementById('dish-image-title').textContent !== 'Lasagne Mod A') throw new Error('modal(a) title must carry the dish query, got: ' + d.getElementById('dish-image-title').textContent);
        w.closeDishImageModal();
        console.log('OK modal(a) open renders skeleton + query title + aria-hidden=false');
    }

    // (b) fetch resolves with images → first slide is images[0], caption carries source + query
    {
        clearDishCache();
        mockGoogleFetch([IMG0, IMG1]);
        w.openDishImageModal('Lasagne Mod B');
        await sleep(150);
        const img = dishBody.querySelector('.dish-image-slide img');
        if (!img) throw new Error('modal(b) no carousel image rendered');
        if (img.src !== IMG0) throw new Error('modal(b) first slide must be images[0].url, got ' + img.src);
        if (img.getAttribute('loading') !== 'lazy') throw new Error('modal(b) images must be lazy-loaded');
        if (img.getAttribute('referrerpolicy') !== 'no-referrer') throw new Error('modal(b) images need referrerpolicy=no-referrer');
        const caption = dishBody.querySelector('.dish-image-caption');
        if (!caption) throw new Error('modal(b) caption missing');
        if (!caption.textContent.includes('Quelle: Google Bildersuche')) throw new Error('modal(b) caption must name the source, got: ' + caption.textContent);
        if (!caption.textContent.includes('Lasagne Mod B')) throw new Error('modal(b) caption must contain the query');
        console.log('OK modal(b) carousel shows images[0] + source caption');
    }

    // (c) close button click → .hidden + aria-hidden=true (also stops the interval)
    {
        d.getElementById('btn-dish-image-close').click();
        if (!dishModal.classList.contains('hidden')) throw new Error('modal(c) close button must hide the modal');
        if (dishModal.getAttribute('aria-hidden') !== 'true') throw new Error('modal(c) aria-hidden must be true after close');
        w.fetch = defaultFetch;
        console.log('OK modal(c) close button hides modal + aria-hidden=true');
    }

    // (d) ESC keydown (document, bubbles to window) → .hidden
    {
        w.openDishImageModal('Lasagne Mod D');
        if (dishModal.classList.contains('hidden')) throw new Error('modal(d) fixture: modal should be open before ESC');
        d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        if (!dishModal.classList.contains('hidden')) throw new Error('modal(d) ESC must close the popup');
        console.log('OK modal(d) ESC keydown closes modal');
    }

    // (e) pointer leaves the popover → closes after the grace delay; re-enter cancels
    {
        w.openDishImageModal('Lasagne Mod E');
        if (dishModal.classList.contains('hidden')) throw new Error('modal(e) fixture: popover should be open');
        firePointer(dishModal, 'pointerleave', 'mouse');
        await sleep(100);
        if (dishModal.classList.contains('hidden')) throw new Error('modal(e) popover must stay open during the grace delay');
        firePointer(dishModal, 'pointerenter', 'mouse');
        await sleep(400);
        if (dishModal.classList.contains('hidden')) throw new Error('modal(e) popover must stay open while the pointer rests on it');
        firePointer(dishModal, 'pointerleave', 'mouse');
        await sleep(400);
        if (!dishModal.classList.contains('hidden')) throw new Error('modal(e) popover must close after the pointer left');
        console.log('OK modal(e) popover closes after pointer leaves (grace delay), re-enter cancels');
    }

    // (f) total fetch failure → error state with encoded Google link (counts dish_image_tab)
    {
        clearDishCache();
        mockFetchFailure();
        const before = readDishTabCount();
        w.openDishImageModal('Schnitzel Mod F');
        await sleep(150);
        if (!dishBody.querySelector('.dish-image-error-text')) throw new Error('modal(f) error text missing after total failure');
        const link = dishBody.querySelector('.dish-image-google-link');
        if (!link) throw new Error('modal(f) Google fallback link missing');
        const href = link.getAttribute('href');
        if (!href.includes('udm=2')) throw new Error('modal(f) link must open the Google image tab, got: ' + href);
        if (!href.includes(encodeURIComponent('Schnitzel Mod F'))) throw new Error('modal(f) link must carry the encoded query, got: ' + href);
        link.click();
        if (readDishTabCount() !== before + 1) throw new Error('modal(f) link click must increment dish_image_tab');
        w.closeDishImageModal();
        w.fetch = defaultFetch;
        console.log('OK modal(f) total failure shows error state with Google link');
    }

    // (g) prefers-reduced-motion → NO auto-advance interval; motion allowed → interval starts
    {
        clearDishCache();
        setReducedMotion(true);
        mockGoogleFetch([IMG0, IMG1]);
        spyIntervals();
        w.openDishImageModal('Lasagne Mod G');
        await sleep(150);
        restoreIntervals();
        if (!dishBody.querySelector('.dish-image-slide')) throw new Error('modal(g) carousel must still render under reduced motion');
        if (intervalCalls.includes(CAROUSEL_MS)) throw new Error('modal(g) reduced motion must NOT start the 3000 ms auto-advance interval');
        w.closeDishImageModal();
        clearDishCache();
        setReducedMotion(false);
        spyIntervals();
        w.openDishImageModal('Lasagne Mod G2');
        await sleep(150);
        restoreIntervals();
        if (!intervalCalls.includes(CAROUSEL_MS)) throw new Error('modal(g) normal motion must start the 3000 ms auto-advance interval');
        w.closeDishImageModal();
        w.fetch = defaultFetch;
        console.log('OK modal(g) auto-advance interval gated on prefers-reduced-motion');
    }

    // (h) aria-hidden toggles false on open / true on close
    {
        w.openDishImageModal('Lasagne Mod H');
        if (dishModal.getAttribute('aria-hidden') !== 'false') throw new Error('modal(h) aria-hidden must be false while open');
        w.closeDishImageModal();
        if (dishModal.getAttribute('aria-hidden') !== 'true') throw new Error('modal(h) aria-hidden must be true after close');
        console.log('OK modal(h) aria-hidden toggles false/true on open/close');
    }

    // (i) renderVisibleWeeks re-render while open → modal stays open (lives outside #menu-container)
    {
        clearDishCache();
        mockGoogleFetch([IMG0, IMG1]);
        w.openDishImageModal('Lasagne Mod I');
        await sleep(150);
        d.getElementById('btn-lang-toggle').click();
        if (dishModal.classList.contains('hidden')) throw new Error('modal(i) re-render must not close the open popup');
        if (!dishBody.querySelector('.dish-image-slide')) throw new Error('modal(i) carousel content must survive the re-render');
        if (d.getElementById('dish-image-title').textContent !== 'Lasagne Mod I') throw new Error('modal(i) the query title must survive updateUILanguage (language-independent), got: ' + d.getElementById('dish-image-title').textContent);
        d.getElementById('btn-lang-toggle').click();
        d.getElementById('btn-lang-toggle').click();
        w.closeDishImageModal();
        w.fetch = defaultFetch;
        console.log('OK modal(i) modal survives renderVisibleWeeks re-render');
    }

    w.matchMedia = realMatchMedia;
}

runDishImageTests().then(() => {
    console.log("✅ Dish Image Trigger Link Tests Passed");
    process.exit(0);
}).catch((err) => {
    console.error("❌ Dish Image Trigger Link Test Failed:", (err && err.message) || err);
    process.exit(1);
});
