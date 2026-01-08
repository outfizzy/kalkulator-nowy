
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE_PATH = path.resolve(__dirname, '../imports/Aluxe Preisliste UPE 2026_DE.xlsx');

const wb = XLSX.readFile(FILE_PATH);

function dumpSheet(name, start, end) {
    const ws = wb.Sheets[name];
    if (!ws) { console.log(`Sheet ${name} not found`); return; }
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
    console.log(`--- ${name} [${start}-${end}] ---`);
    for (let i = start; i <= end && i < json.length; i++) {
        console.log(`Row ${i}:`, JSON.stringify(json[i]));
    }
}

dumpSheet('Materialien Orangeline', 0, 20);
dumpSheet('Panorama AL 23R', 0, 20);
