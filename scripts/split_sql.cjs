const fs = require('fs');
const path = require('path');

const inputFile = 'scripts/batch5_only.sql';

try {
    const content = fs.readFileSync(inputFile, 'utf8');
    // Split by 'DO $$' but keep the delimiter. 
    // The file starts with DO $$.
    // If I split by 'DO $$', the first element might be empty.
    const rawChunks = content.split('DO $$');

    let currentChunk = '';
    let fileIndex = 1;

    for (const raw of rawChunks) {
        if (!raw.trim()) continue;

        // Re-attach the 'DO $$' prefix
        const block = 'DO $$' + raw;

        // Check size
        if (currentChunk.length + block.length > 10000) { // 10KB limit
            const outName = `scripts/batch5_part_${fileIndex}.sql`;
            fs.writeFileSync(outName, currentChunk);
            console.log(`Created ${outName} (${currentChunk.length} chars)`);
            fileIndex++;
            currentChunk = block;
        } else {
            currentChunk += (currentChunk ? '\n\n' : '') + block;
        }
    }

    if (currentChunk) {
        const outName = `scripts/batch5_part_${fileIndex}.sql`;
        fs.writeFileSync(outName, currentChunk);
        console.log(`Created ${outName} (${currentChunk.length} chars)`);
    }

} catch (e) {
    console.error(e);
}
