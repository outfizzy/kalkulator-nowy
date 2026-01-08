
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const FILE_PATH = path.resolve(rootDir, 'imports', 'Aluxe Preisliste UPE 2026_DE.xlsx');

const run = async () => {
    if (!fs.existsSync(FILE_PATH)) {
        console.error('File not found');
        return;
    }
    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = "Loses Material allgemein "; // Note space at end from previous output?
    // Let's try to match loosely
    const realSheetName = workbook.SheetNames.find(s => s.trim() === "Loses Material allgemein");

    if (!realSheetName) {
        console.error("Sheet not found: Loses Material allgemein");
        console.log("Available:", workbook.SheetNames);
        return;
    }

    console.log(`--- Inspecting Sheet: ${realSheetName} ---`);
    const ws = workbook.Sheets[realSheetName];
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // Search all rows for keywords
    console.log(`--- Searching ${json.length} rows for: LED, Beleuchtung, Set, Dimm ---`);
    let found = 0;
    json.forEach((row, i) => {
        const str = JSON.stringify(row).toLowerCase();
        if (str.includes('led') || str.includes('beleuchtung') || str.includes('dimm')) {
            console.log(`Row ${i}:`, JSON.stringify(row));
            found++;
        }
    });
    if (found === 0) console.log("No matches found.");
};

run();
