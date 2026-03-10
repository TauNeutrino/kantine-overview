
const { performance } = require('perf_hooks');

function escapeHtml(text) {
    // Simple mock for benchmark purposes
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function currentImplementation(matchedTags) {
    const badges = matchedTags.map(t => `<span class="tag-badge-small"><span class="material-icons-round" style="font-size:10px;margin-right:2px">star</span>${escapeHtml(t)}</span>`).join('');
    return `<div class="matched-tags">${badges}</div>`;
}

function optimizedImplementation(matchedTags) {
    let badges = '';
    for (const t of matchedTags) {
        badges += `<span class="tag-badge-small"><span class="material-icons-round" style="font-size:10px;margin-right:2px">star</span>${escapeHtml(t)}</span>`;
    }
    return `<div class="matched-tags">${badges}</div>`;
}

const tagSizes = [0, 1, 5, 10, 50];
const iterations = 100000;

console.log(`Running benchmark with ${iterations} iterations...`);

for (const size of tagSizes) {
    const tags = Array.from({ length: size }, (_, i) => `Tag ${i}`);

    console.log(`\nTag count: ${size}`);

    // Baseline
    const startBaseline = performance.now();
    for (let i = 0; i < iterations; i++) {
        currentImplementation(tags);
    }
    const endBaseline = performance.now();
    console.log(`Baseline (map.join): ${(endBaseline - startBaseline).toFixed(4)}ms`);

    // Optimized
    const startOptimized = performance.now();
    for (let i = 0; i < iterations; i++) {
        optimizedImplementation(tags);
    }
    const endOptimized = performance.now();
    console.log(`Optimized (for...of): ${(endOptimized - startOptimized).toFixed(4)}ms`);
}
