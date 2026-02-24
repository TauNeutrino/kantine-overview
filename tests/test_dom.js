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
</body>
</html>
`;

log("Reading file jsCode...");
const jsCode = fs.readFileSync('kantine.js', 'utf8')
    .replace('(function () {', '')
    .replace('})();', '')
    .replace('if (window.__KANTINE_LOADED) return;', '');

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

        // Call bindEvents manually to attach the listeners since the IIFE is stripped
        bindEvents();

        // Click to open
        document.getElementById('btn-highlights').click();
        if (hlModal.classList.contains('hidden')) throw new Error("Highlights modal did not open upon clicking btn-highlights!");

        // Click to close
        document.getElementById('btn-highlights-close').click();
        if (!hlModal.classList.contains('hidden')) throw new Error("Highlights modal did not close upon clicking btn-highlights-close!");

        console.log("✅ Highlights Modal Test Passed");
        
        window.__TEST_PASSED = true;
    `;

dom.window.eval(jsCode + "\n" + testCode);

if (!dom.window.__TEST_PASSED) {
    throw new Error("Tests failed to reach completion inside JSDOM.");
}

process.exit(0);
