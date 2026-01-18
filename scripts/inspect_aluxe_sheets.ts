

import XLSX from 'xlsx';

import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Use .env.local for secrets
dotenv.config({ path: '.env.local' });

async function inspectSheets() {
    const filePath = path.resolve(process.cwd(), 'AluxePreisliste.xlsx');

    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }

    console.log(`Reading ${filePath}...`);
    const workbook = XLSX.readFile(filePath);

    console.log('Available Sheets:');
    workbook.SheetNames.forEach((name, idx) => {
        console.log(`${idx + 1}. ${name}`);
    });

    const sheetsToInspect = [
        'Freistehende TerrassendächerR'
    ];

    sheetsToInspect.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        if (sheet) {
            console.log(`\n--- Inspecting contents of sheet: ${sheetName} ---`);
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: null });
            console.log(rows.slice(0, 10)); // Log first 10 rows
        } else {
            console.log(`\nSheet not found: ${sheetName}`);
        }
    });
}

inspectSheets();
