const fs = require('fs');
const jsCode = fs.readFileSync('kantine.js', 'utf8')
    .replace('(function () {', '')
    .replace('})();', '')
    .replace('if (window.__KANTINE_LOADED) return;', '');
const testCode = `
    console.log("TEST");
`;
const code = jsCode + '\n' + testCode;
try {
    const vm = require('vm');
    new vm.Script(code);
} catch (e) {
    if(e.stack) {
       console.log("Syntax error at:", e.stack.split('\n').slice(0,3).join('\n'));
    }
}
