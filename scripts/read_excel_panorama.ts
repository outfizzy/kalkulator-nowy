

import XLSX from 'xlsx';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();


// Try to read .env.local manually
let localEnv = '';
try {
    localEnv = fs.readFileSync('.env.local', 'utf8');
} catch (e) {
    console.log('No .env.local found');
}

const getEnv = (key: string) => {
    // 1. Process Env
    if (process.env[key]) return process.env[key];

    // 2. Parse .env.local
    const match = localEnv.match(new RegExp(`${key}=("?)(.*?)(\\1|$)`));
    return match ? match[2] : undefined;
}

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL') || 'https://whgjs.supabase.co';
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');



// Mock Supabase for now just to read excel
// const supabase = createClient(supabaseUrl, supabaseKey);

async function importPanorama() {
    console.log("Reading AluxePreisliste.xlsx...");
    const workbook = XLSX.readFile('AluxePreisliste.xlsx');
    console.log("Sheets:", workbook.SheetNames);

    // Check all sheets for matrix-like structures (large numeric grids)
    /*
    workbook.SheetNames.forEach(name => {
        const ws = workbook.Sheets[name];
        // simple check...
    });
    */

    process.exit(0);

    // Find Sheet with Panorama
    // Heuristic: Look for sheet name "Panorama" or check content
    const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('panorama')) || workbook.SheetNames[0];

    // 2. Read 'Trendline Polycarbonat Zone1R' (Roof)
    const roofSheetName = 'Trendline Polycarbonat Zone1R';
    const roofSheet = workbook.Sheets[roofSheetName];
    if (roofSheet) {
        console.log(`\n--- Sheet: ${roofSheetName} (First 15 Rows) ---`);
        const rows = XLSX.utils.sheet_to_json(roofSheet, { header: 1, range: 0, defval: null });
        console.log(JSON.stringify(rows.slice(0, 15), null, 2));
    } else {
        console.log(`Sheet '${roofSheetName}' not found.`);
    }

    // 3. Read 'Panorama AL22R' (Addon)
    const panoramaSheetName = 'Panorama AL22R';
    const panoramaSheet = workbook.Sheets[panoramaSheetName];
    if (panoramaSheet) {
        console.log(`\n--- Sheet: ${panoramaSheetName} (First 20 Rows) ---`);
        const rows = XLSX.utils.sheet_to_json(panoramaSheet, { header: 1, range: 0, defval: null });
        console.log(JSON.stringify(rows.slice(0, 20), null, 2));
    } else {
        console.log(`Sheet '${panoramaSheetName}' not found.`);
    }
}

importPanorama();
