const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

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
</body>
</html>
`;

const jsCode = fs.readFileSync('kantine.js', 'utf8').replace('(function () {', '').replace(/}\)\(\);$/, '');

const dom = new JSDOM(html, { runScripts: "dangerously" });
global.window = dom.window;
global.document = window.document;
global.localStorage = { getItem: () => '[]', setItem: () => {} };
global.sessionStorage = { getItem: () => null };

global.showToast = () => {};
global.saveFlags = () => {};
global.renderVisibleWeeks = () => {};
// Mock missing browser features if needed
global.Notification = { permission: 'default', requestPermission: () => {} };

try {
    dom.window.eval(jsCode);
    console.log("Initial Bell Classes:", window.document.getElementById('alarm-bell').className);
    
    // Add flag
    dom.window.eval("userFlags.add('2026-02-24_123'); updateAlarmBell();");
    console.log("After Add:", window.document.getElementById('alarm-bell').className);
    
    // Remove flag
    dom.window.eval("userFlags.delete('2026-02-24_123'); updateAlarmBell();");
    console.log("After Remove:", window.document.getElementById('alarm-bell').className);
} catch (e) {
    console.error(e);
}
