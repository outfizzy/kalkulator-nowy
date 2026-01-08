
import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const FILE_PATH = path.resolve(process.cwd(), 'imports', 'Aluxe Preisliste UPE 2026_DE.xlsx');

const analyze = () => {
    if (!fs.existsSync(FILE_PATH)) {
        console.error(`File not found: ${FILE_PATH}`);
        process.exit(1);
    }

    console.log(`Reading file: ${FILE_PATH} (29MB)... this might take a moment.`);
    const workbook = XLSX.readFile(FILE_PATH);
    console.log(`Workbook loaded. Sheets: ${workbook.SheetNames.length}`);

    const report = workbook.SheetNames.map(sheetName => {
        // Skip hidden sheets or strictly ignore list?
        // Heuristics for Product / Attributes from Sheet Name
        const nameLower = sheetName.toLowerCase();

        let product = 'Unknown';
        let snowZone = 'Unknown';
        let subtype = 'Unknown'; // Glass / Poly / VSG
        let roofType = 'Unknown';

        // 1. Product
        if (nameLower.includes('trendstyle')) product = 'Trendstyle';
        else if (nameLower.includes('topstyle')) product = 'Topstyle';
        else if (nameLower.includes('aluxestyle')) product = 'Aluxestyle'; // ? check variants
        else if (nameLower.includes('ultrastyle')) product = 'Ultrastyle';
        else if (nameLower.includes('orangestyle')) product = 'Orangestyle';
        else if (nameLower.includes('lounge')) product = 'Lounge';
        else if (nameLower.includes('flat')) product = 'Rat Flat'; // heuristics
        else product = sheetName.split(' ')[0]; // Fallback

        // 2. Snow Zone
        if (nameLower.includes('zone 1') || nameLower.includes('sk 0.85')) snowZone = '1';
        else if (nameLower.includes('zone 2') || nameLower.includes('sk 1.25')) snowZone = '2';
        else if (nameLower.includes('zone 3') || nameLower.includes('sk 1.6')) snowZone = '3'; // check exact values

        // 3. Subtype (Material)
        if (nameLower.includes('poly') || nameLower.includes('makrolon')) subtype = 'Polycarbonate';
        if (nameLower.includes('glas') || nameLower.includes('glass') || nameLower.includes('vsg')) subtype = 'Glass';

        // 4. Roof Type specific? (16mm, 8mm)
        // Usually implied by Poly (16mm) vs Glass (8mm/VSG)

        // 4. Detailed Preview for Addons
        let preview = [];
        const addonsSheets = ['topline polycarbonat z 1r'];

        const ws = workbook.Sheets[sheetName];
        // FIX: Define range here so it's available for both preview and return
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');

        if (addonsSheets.some(k => nameLower.includes(k))) {
            // Get first 20 rows as JSON to see structure
            preview = XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(0, 30);
        }

        return {
            sheetName,
            product,
            snowZone,
            subtype,
            rows: range.e.r + 1,
            cols: range.e.c + 1,
            preview: preview.length ? preview : undefined
        };
    });

    console.log(JSON.stringify(report, null, 2));
};

analyze();
