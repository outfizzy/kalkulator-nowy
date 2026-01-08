
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const FILE_PATH = path.resolve(rootDir, 'imports', 'Aluxe Preisliste UPE 2026_DE.xlsx');

const run = async () => {
    if (!fs.existsSync(FILE_PATH)) {
        console.error('File not found:', FILE_PATH);
        return;
    }
    const workbook = XLSX.readFile(FILE_PATH);
    console.log("--- EXCEL SHEET NAMES ---");
    workbook.SheetNames.forEach((name, idx) => {
        console.log(`${idx + 1}. ${name}`);
    });
};

run();
