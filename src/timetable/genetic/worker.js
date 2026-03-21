const { parentPort, workerData } = require('worker_threads');
const { evolveTimeTable } = require('./engine');

(async () => {
    try {
        const { batch, allRooms, occupiedSlots, config } = workerData;
        const bestChromosome = await evolveTimeTable(batch, allRooms, occupiedSlots, config);

        // Return the best chromosome (Structured Clone will strip methods, but properties like 'genes' remain)
        parentPort.postMessage(bestChromosome);
    } catch (error) {
        console.error('Worker Error:', error);
        process.exit(1);
    }
})();
