// tests/stats-integration.test.js
// Integration smoke test for stats bundle
const fs = require('fs');
const path = require('path');

const bundlePath = path.join(__dirname, '..', 'dist', 'kantine.bundle.js');

let exitCode = 0;

try {
    const code = fs.readFileSync(bundlePath, 'utf8');
    const bundleSize = fs.statSync(bundlePath).size;

    console.log('=== Stats Integration Smoke Test ===');

    // Check for tracker API presence
    const checks = [
        { name: 'StatsTracker.increment', pattern: 'increment' },
        { name: 'StatsTracker.set', pattern: '.set(' },
        { name: 'StatsTracker.getPendingFlush', pattern: 'getPendingFlush' },
        { name: 'StatsTracker.flushToGist', pattern: 'flushToGist' },
        { name: 'StatsTracker.markFlushed', pattern: 'markFlushed' },
        { name: 'StatsTracker.load', pattern: '.load(' },
        { name: 'computeDailyHash', pattern: 'computeDailyHash' },
        { name: 'GitHub Gist URL', pattern: 'api.github.com/gists' },
        { name: 'GIST_ID placeholder', pattern: '{{GIST_ID}}' },
        { name: 'GIST_PAT placeholder', pattern: '{{GIST_PAT}}' },
        { name: 'GIST_SALT placeholder', pattern: '{{GIST_SALT}}' },
    ];

    let allPassed = true;
    for (const check of checks) {
        const found = code.includes(check.pattern);
        console.log(`  ${found ? '\u2705' : '\u274c'} ${check.name}: ${found ? 'found' : 'MISSING'}`);
        if (!found) allPassed = false;
    }

    // Size check
    const sizeKB = (bundleSize / 1024).toFixed(0);
    console.log(`\n  Bundle size: ${sizeKB} KB (${bundleSize} bytes)`);
    const versionMatch = code.match(/['"](\d+\.\d+\.\d+)['"]/);
    console.log(`  Version: ${versionMatch ? versionMatch[1] : 'unknown'}`);

    console.log(`\n${allPassed ? '\u2705 ALL CHECKS PASSED' : '\u274c SOME CHECKS FAILED'}`);

    if (!allPassed) exitCode = 1;

    const remainingPlaceholders = ['{{GIST_PAT}}', '{{GIST_ID}}', '{{GIST_SALT}}'].filter(p => code.includes(p)).length;
    if (remainingPlaceholders > 0 && process.env.GIST_PAT) {
        console.log(`\n\u26a0 Warning: ${remainingPlaceholders} of 3 Gist placeholders remain in bundle (env was set!)`);
    } else if (remainingPlaceholders > 0) {
        console.log(`\n\u2139 ${remainingPlaceholders} of 3 Gist placeholders remain in bundle (expected when no env vars)`);
    } else {
        console.log('\n\u2705 All Gist placeholders were injected');
    }

} catch (err) {
    console.error('\u274c Smoke test error:', err.message);
    exitCode = 1;
}

process.exit(exitCode);
