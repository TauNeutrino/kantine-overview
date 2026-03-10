const fs = require('fs');

async function benchmark() {
    let availableDates = Array.from({length: 30}).map((_, i) => ({ date: `2024-01-${i+1}`}));
    const totalDates = availableDates.length;
    let completed = 0;

    console.log(`Starting benchmark for ${totalDates} items (Concurrent batch=5 without 100ms artificial delay)`);
    const start = Date.now();

    // Simulate Promise.all batching approach
    const BATCH_SIZE = 5;
    for (let i = 0; i < totalDates; i += BATCH_SIZE) {
        const batch = availableDates.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (dateObj) => {
            // mock fetch
            await new Promise(r => setTimeout(r, 50)); // simulate network delay
            completed++;
        }));
    }

    const end = Date.now();
    console.log(`Concurrent loading took ${end - start}ms`);
}

benchmark();
