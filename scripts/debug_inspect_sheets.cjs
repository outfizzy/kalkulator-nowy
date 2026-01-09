
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const rootDir = process.cwd();
const FILE_PATH = path.resolve(rootDir, 'imports', 'Aluxe Preisliste UPE 2026_DE.xlsx');

async function inspect() {
    console.log(`Inspecting ${FILE_PATH}`);
    const workbook = XLSX.readFile(FILE_PATH);

    // Check specific problematic sheet
    const target = workbook.SheetNames.find(n => n.trim() === 'Trendline Zone 1R' || n === 'Trendline Zone 1' || n.includes('Trendline Zone 1R'));
    if (target) {
        console.log(`\n\n=== ANALYZING TARGET: ${target} ===`);
        const ws = workbook.Sheets[target];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1 });

        console.log('-- Headers --');
        for (let i = 0; i < Math.min(10, json.length); i++) {
            console.log(`Row ${i}: ${JSON.stringify(json[i])}`);
        }
    } else {
        console.log('Target Trendline Zone 1R not found.');
        console.log('Available Trendline sheets:', workbook.SheetNames.filter(n => n.includes('Trendline')));
    }
}

inspect().catch(console.error);
