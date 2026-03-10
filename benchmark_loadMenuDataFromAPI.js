const fs = require('fs');

async function benchmark() {
    // We will simulate the same exact loop in src/actions.js
    let availableDates = Array.from({length: 30}).map((_, i) => ({ date: `2024-01-${i+1}`}));
    const totalDates = availableDates.length;
    let completed = 0;

    console.log(`Starting benchmark for ${totalDates} items (Sequential with 100ms artificial delay)`);
    const start = Date.now();
    for (const dateObj of availableDates) {
        // mock fetch
        await new Promise(r => setTimeout(r, 50)); // simulate network delay

        completed++;
        await new Promise(r => setTimeout(r, 100)); // the artificial delay in codebase
    }
    const end = Date.now();
    console.log(`Sequential loading took ${end - start}ms`);
}

benchmark();
