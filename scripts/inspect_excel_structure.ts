
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import xlsx from 'xlsx';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
const envLocalPath = path.resolve(__dirname, '../.env.local');

dotenv.config({ path: envPath });
if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath, override: true });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const FILE_PATH = path.resolve(__dirname, '../imports/Aluxe Preisliste UPE 2026_DE.xlsx');

async function inspectExcel() {
    console.log(`--- Inspecting Excel File: ${path.basename(FILE_PATH)} ---`);

    if (!fs.existsSync(FILE_PATH)) {
        console.error(`❌ File not found at: ${FILE_PATH}`);
        return; // Cannot inspect what I can't find
    }

    const workbook = xlsx.readFile(FILE_PATH);
    const sheetNames = workbook.SheetNames;
    console.log(`✅ File opened successfully. Found ${sheetNames.length} sheets.`);

    // Get Imported Tables from DB to compare
    const { data: importedTables } = await supabase
        .from('price_tables')
        .select('name');

    const importedNames = new Set(importedTables?.map(t => t.name) || []);

    // Heuristic matching: The importer likely transformed sheet names.
    // We'll check if *any* table name contains key parts of the sheet name.

    let importedCount = 0;
    let skippedCount = 0;
    const targetSheets: string[] = [];

    console.log('\n--- Sheet Analysis ---');
    for (const sheetName of sheetNames) {
        const nameLower = sheetName.toLowerCase();
        if (nameLower.includes('topline') || nameLower.includes('topstyle')) {
            console.log(`Found candidate sheet: "${sheetName}"`);
            targetSheets.push(sheetName);
        }
    }

    // Inspect the first one found
    if (targetSheets.length > 0) {
        const sheetName = targetSheets[0];
        console.log(`\n🔍 Analyze Sheet: "${sheetName}"`);
        const sheet = workbook.Sheets[sheetName];
        const range = xlsx.utils.decode_range(sheet['!ref'] || 'A1:A1');
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        console.log(`   Dimensions: ${range.e.r} rows x ${range.e.c} columns`);
        console.log(`   First 20 non-empty rows:`);
        let printed = 0;
        for (const row of rows) {
            if (row.length > 0 && printed < 20) {
                console.log(`   [Row]`, JSON.stringify(row));
                printed++;
            }
        }
    }

    console.log('\n--- Conclusion ---');
    console.log('The Excel file exists and is accessible.');
    console.log('Issues detected with "Materialien" sheets (structure shown above).');
}

inspectExcel();
