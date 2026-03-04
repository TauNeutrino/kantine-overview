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
    <button class="lang-btn" data-lang="de">DE</button>
    <button class="lang-btn" data-lang="en">EN</button>
    <button class="lang-btn" data-lang="all">ALL</button>
    
    <button id="btn-refresh">Refresh</button>
    <button id="btn-logout">Logout</button>
    <div class="order-history-header">Header</div>
    <button id="btn-error-redirect">Error Redirect</button>
</body>
</html>
`;

log("Reading file jsCode...");
const jsCode = fs.readFileSync('kantine.js', 'utf8')
    .replace('(function () {', '')
    .replace('})();', '')
    .replace('if (window.__KANTINE_LOADED) return;', '')
    .replace('window.location.reload();', 'window.__RELOAD_CALLED = true;');

log("Instantiating JSDOM...");
const dom = new JSDOM(html, { runScripts: "dangerously", url: "http://localhost/" });
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
        // Add flag
        userFlags.add('2026-02-24_123'); updateAlarmBell();
        if (document.getElementById('alarm-bell').className.includes('hidden')) throw new Error("Bell should be visible");

        // Remove flag
        userFlags.delete('2026-02-24_123'); updateAlarmBell();
        if (!document.getElementById('alarm-bell').className.includes('hidden')) throw new Error("Bell should be hidden");

        console.log("✅ Alarm Bell Test Passed");

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
        // We need authToken to be truthy to open history modal
        authToken = "fake_token";
        const historyModal = document.getElementById('history-modal');
        document.getElementById('btn-history').click();
        if (historyModal.classList.contains('hidden')) throw new Error("History modal should open");
        document.getElementById('btn-history-close').click();
        if (!historyModal.classList.contains('hidden')) throw new Error("History modal should close");
        console.log("✅ History Modal Test Passed");

        console.log("--- Testing Version Modal ---");
        const versionModal = document.getElementById('version-modal');
        document.querySelector('.version-tag').click();
        if (versionModal.classList.contains('hidden')) throw new Error("Version modal should open");
        document.getElementById('btn-version-close').click();
        if (!versionModal.classList.contains('hidden')) throw new Error("Version modal should close");
        console.log("✅ Version Modal Test Passed");

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

        window.__TEST_PASSED = true;
    `;

dom.window.eval(jsCode + "\n" + testCode);

if (!dom.window.__TEST_PASSED) {
    throw new Error("Tests failed to reach completion inside JSDOM.");
}

process.exit(0);
