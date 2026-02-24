const fs = require('fs');
const jsCode = fs.readFileSync('kantine.js', 'utf8').replace('(function () {', '').replace(/}\)\(\);$/, '');
try {
    const vm = require('vm');
    new vm.Script(jsCode);
} catch (e) {
    console.error(e.message);
    const lines = jsCode.split('\n');
    console.error("Around line", e.loc?.line);
    if(e.loc?.line) {
       console.log(lines[e.loc.line - 2]);
       console.log(lines[e.loc.line - 1]);
       console.log(lines[e.loc.line]);
    }
}
