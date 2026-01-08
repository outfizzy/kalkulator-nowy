
import XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const FILE_PATH = path.resolve(rootDir, 'imports', 'Aluxe Preisliste UPE 2026_DE.xlsx');

const sheets = [
    'Trendline Glas zone 1R'
];

async function inspect() {
    console.log(`Inspecting ${FILE_PATH}`);
    const workbook = XLSX.readFile(FILE_PATH);

    for (const sheetName of sheets) {
        console.log(`\n--- Sheet: ${sheetName} ---`);
        const ws = workbook.Sheets[sheetName];
        if (!ws) {
            console.log('Sheet not found');
            continue;
        }
        const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
        // Log first 10 rows
        for (let i = 0; i < Math.min(10, json.length); i++) {
            console.log(`Row ${i}:`, JSON.stringify(json[i]));
        }
    }
}

inspect().catch(console.error);
