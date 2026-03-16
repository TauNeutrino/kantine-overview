
const { performance } = require('perf_hooks');

function benchmarkConcat(menuGroups) {
    let dayItems = [];
    for (const group of menuGroups) {
        if (group.items && Array.isArray(group.items)) {
            dayItems = dayItems.concat(group.items);
        }
    }
    return dayItems;
}

function benchmarkPush(menuGroups) {
    let dayItems = [];
    for (const group of menuGroups) {
        if (group.items && Array.isArray(group.items)) {
            dayItems.push(...group.items);
        }
    }
    return dayItems;
}

const numGroups = 1000;
const itemsPerGroup = 100;
const menuGroups = Array.from({ length: numGroups }, (_, i) => ({
    items: Array.from({ length: itemsPerGroup }, (_, j) => ({ id: `item-${i}-${j}` }))
}));

// Warm up
benchmarkConcat(menuGroups);
benchmarkPush(menuGroups);

const iterations = 100;

console.log(`Running benchmark with ${numGroups} groups and ${itemsPerGroup} items per group...`);

let totalConcatTime = 0;
for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    benchmarkConcat(menuGroups);
    totalConcatTime += (performance.now() - start);
}
console.log(`Average Concat Time: ${(totalConcatTime / iterations).toFixed(4)}ms`);

let totalPushTime = 0;
for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    benchmarkPush(menuGroups);
    totalPushTime += (performance.now() - start);
}
console.log(`Average Push Time: ${(totalPushTime / iterations).toFixed(4)}ms`);

const improvement = ((totalConcatTime - totalPushTime) / totalConcatTime * 100).toFixed(2);
console.log(`Improvement: ${improvement}%`);
