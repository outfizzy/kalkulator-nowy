
import XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// Load Environment Variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const FILE_PATH = path.resolve(rootDir, 'imports', 'Aluxe Preisliste UPE 2026_DE.xlsx');

const run = async () => {
    console.log(`Auditing File: ${FILE_PATH}`);
    if (!fs.existsSync(FILE_PATH)) throw new Error('File not found');

    const workbook = XLSX.readFile(FILE_PATH);
    const sheets = workbook.SheetNames;

    console.log(`Found ${sheets.length} sheets total.`);

    let stats = {
        roof: 0,
        material: 0,
        awning: 0,
        lighting: 0,
        heating: 0,
        unknown: 0
    };

    sheets.forEach(sheet => {
        const lower = sheet.toLowerCase();
        let category = 'Unknown';

        if (lower.includes('trendstyle') || lower.includes('topstyle') || lower.includes('orangestyle') || lower.includes('skystyle') || lower.includes('ultrastyle') || lower.includes('topline') || lower.includes('orangeline') || lower.includes('carport')) {
            if (lower.includes('materialien')) {
                category = 'Material (Addons)';
                stats.material++;
            } else {
                category = 'Roof (Matrix)';
                stats.roof++;
            }
        } else if (lower.includes('markise') || lower.includes('screen') || lower.includes('zip')) {
            category = 'Awning (Markise)';
            stats.awning++;
        } else if (lower.includes('leuchten') || lower.includes('led') || lower.includes('beleuchtung')) {
            category = 'Lighting';
            stats.lighting++;
        } else if (lower.includes('heizung') || lower.includes('heat')) {
            category = 'Heating';
            stats.heating++;
        } else if (lower.includes('seitenwand') || lower.includes('schiebetür') || lower.includes('festelement')) {
            category = 'Wall/Door';
            stats.material++; // Usually treated as material list
        } else {
            stats.unknown++;
        }

        // Peek at data count
        const ws = workbook.Sheets[sheet];
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
        const rowCount = range.e.r + 1;

        console.log(`[${category.padEnd(15)}] ${sheet.padEnd(40)} (Rows: ${rowCount})`);
    });

    console.log('\n--- Summary ---');
    console.log(JSON.stringify(stats, null, 2));
};

run().catch(console.error);
