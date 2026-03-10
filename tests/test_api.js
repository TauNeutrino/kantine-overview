const fs = require('fs');
const vm = require('vm');
const path = require('path');

console.log("=== Running API Unit Tests ===");

// 1. Load Source Code
const apiPath = path.join(__dirname, '..', 'src', 'api.js');
const constantsPath = path.join(__dirname, '..', 'src', 'constants.js');

let apiCode = fs.readFileSync(apiPath, 'utf8');
let constantsCode = fs.readFileSync(constantsPath, 'utf8');

// Strip exports and imports for VM
apiCode = apiCode.replace(/export /g, '').replace(/import .*? from .*?;/g, '');
constantsCode = constantsCode.replace(/export /g, '');

// 2. Setup Mock Environment
const sandbox = {
    console: console,
};

try {
    vm.createContext(sandbox);
    // Load constants first as api.js might depend on them
    vm.runInContext(constantsCode, sandbox);
    vm.runInContext(apiCode, sandbox);

    console.log("--- Testing githubHeaders ---");
    const ghHeaders = sandbox.githubHeaders();
    console.log("Result:", JSON.stringify(ghHeaders));

    if (ghHeaders['Accept'] !== 'application/vnd.github.v3+json') {
        throw new Error(`Expected Accept header 'application/vnd.github.v3+json', but got '${ghHeaders['Accept']}'`);
    }
    console.log("✅ githubHeaders Test Passed");

    console.log("--- Testing apiHeaders ---");

    // Test with token
    const token = 'test-token';
    const headersWithToken = sandbox.apiHeaders(token);
    console.log("With token:", JSON.stringify(headersWithToken));
    if (headersWithToken['Authorization'] !== `Token ${token}`) {
        throw new Error(`Expected Authorization header 'Token ${token}', but got '${headersWithToken['Authorization']}'`);
    }

    // Test without token (should use GUEST_TOKEN)
    const headersWithoutToken = sandbox.apiHeaders();
    console.log("Without token:", JSON.stringify(headersWithoutToken));
    const guestToken = vm.runInContext('GUEST_TOKEN', sandbox);
    if (headersWithoutToken['Authorization'] !== `Token ${guestToken}`) {
        throw new Error(`Expected Authorization header 'Token ${guestToken}', but got '${headersWithoutToken['Authorization']}'`);
    }

    if (headersWithoutToken['Accept'] !== 'application/json') {
        throw new Error(`Expected Accept header 'application/json', but got '${headersWithoutToken['Accept']}'`);
    }

    const clientVersion = vm.runInContext('CLIENT_VERSION', sandbox);
    if (headersWithoutToken['X-Client-Version'] !== clientVersion) {
        throw new Error(`Expected X-Client-Version header '${clientVersion}', but got '${headersWithoutToken['X-Client-Version']}'`);
    }

    console.log("✅ apiHeaders Test Passed");

    console.log("ALL API TESTS PASSED ✅");

} catch (e) {
    console.error("❌ API Unit Test Error:", e);
    process.exit(1);
}
