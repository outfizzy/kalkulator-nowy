const XLSX = require('xlsx');
const fs = require('fs');
const wb = XLSX.readFile('imports/Aluxe Preisliste UPE 2026_DE.xlsx');

// Sheet name mapping for Skyline/Carport freestanding
const SHEETS = {
    'Skyline Freestanding Zone 1': 'Skyline Freistand Zone 1R',
    'Skyline Freestanding Zone 2': 'Skyline Freistand Zone 1a +2R',
    'Skyline Freestanding Zone 3': 'Skyline Freistand Zone 2a +3R',
    'Carport Freestanding Zone 1': 'Carport Freistand Zone 1R',
    'Carport Freestanding Zone 2': 'Carport Freistand Zone 1a +2R',
    'Carport Freestanding Zone 3': 'Carport Freistand Zone 2a +3R',
    // Wall mounted tables
    'Skyline Zone 1': 'Skyline Zone 1R',
    'Skyline Zone 2': 'Skyline Zone 1a +2R',
    'Skyline Zone 3': 'Skyline Zone 2a +3R',
    'Carport Zone 1': 'Carport Zone 1R',
    'Carport Zone 2': 'Carport Zone 1a +2R',
    'Carport Zone 3': 'Carport Zone 2a +3R',
};

const sql = [];
sql.push('-- Skyline & Carport Freestanding Tables Import');
sql.push('-- Generated: ' + new Date().toISOString());
sql.push('');
sql.push('-- 1. Create product definition');
sql.push(`INSERT INTO product_definitions (code, name, category, provider, description)`);
sql.push(`VALUES ('aluxe_v2_skyline_carport', 'Aluxe V2 - Skyline & Carport', 'roof', 'Aluxe', 'Skyline and Carport roof systems')`);
sql.push(`ON CONFLICT (code) DO NOTHING;`);
sql.push('');

function getSheet(excelName) {
    if (wb.Sheets[excelName]) return wb.Sheets[excelName];
    // Try without trailing space
    for (const name of wb.SheetNames) {
        if (name.trim() === excelName.trim()) return wb.Sheets[name];
    }
    return null;
}

function parseSheet(sheet) {
    if (!sheet) return [];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const entries = [];

    for (let i = 8; i < data.length; i++) {
        const row = data[i];
        const dimStr = String(row[0]).replace(/\s+/g, '');
        const dim = dimStr.match(/(\d+)x(\d+)/);
        if (!dim) continue;

        const width = parseInt(dim[1]);
        const projection = parseInt(dim[2]);
        const price = parseFloat(row[3]); // Price in column D (index 3)

        if (!isNaN(price) && price > 0) {
            entries.push({ width, projection, price });
        }
    }
    return entries;
}

function generateTableSQL(tableName, entries) {
    if (entries.length === 0) return;

    sql.push(`-- ${tableName} (${entries.length} entries)`);
    sql.push(`INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)`);
    sql.push(`SELECT pd.id, '${tableName}', 'matrix', true, 'EUR'`);
    sql.push(`FROM product_definitions pd WHERE pd.code = 'aluxe_v2_skyline_carport'`);
    sql.push(`AND NOT EXISTS (SELECT 1 FROM price_tables WHERE name = '${tableName}');`);
    sql.push('');
    sql.push(`WITH table_id AS (SELECT id FROM price_tables WHERE name = '${tableName}')`);
    sql.push(`INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)`);
    sql.push(`SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES`);
    entries.forEach((e, idx) => {
        sql.push(`  (${e.width}, ${e.projection}, ${e.price.toFixed(2)})${idx === entries.length - 1 ? '' : ','}`);
    });
    sql.push(`) AS t(width_mm, projection_mm, price)`);
    sql.push(`WHERE NOT EXISTS (`);
    sql.push(`    SELECT 1 FROM price_matrix_entries pme`);
    sql.push(`    JOIN price_tables pt ON pme.price_table_id = pt.id`);
    sql.push(`    WHERE pt.name = '${tableName}' LIMIT 1`);
    sql.push(`);`);
    sql.push('');
}

let tableCount = 0;

// Process each model
for (const model of ['Skyline', 'Carport']) {
    sql.push(`-- ============= ${model.toUpperCase()} =============`);

    for (let zone = 1; zone <= 3; zone++) {
        // Wall mounted
        const wallKey = `${model} Zone ${zone}`;
        const wallSheet = getSheet(SHEETS[wallKey]);
        if (wallSheet) {
            const entries = parseSheet(wallSheet);
            if (entries.length > 0) {
                // The calculator builds: 'Aluxe V2 - Skyline (Zone 1)'
                generateTableSQL(`Aluxe V2 - ${model} (Zone ${zone})`, entries);
                tableCount++;
            }
        }

        // Freestanding
        const fsKey = `${model} Freestanding Zone ${zone}`;
        const fsSheet = getSheet(SHEETS[fsKey]);
        if (fsSheet) {
            const entries = parseSheet(fsSheet);
            if (entries.length > 0) {
                // The calculator builds: 'Aluxe V2 - Skyline Freestanding (Zone 1)'
                generateTableSQL(`Aluxe V2 - ${model} Freestanding (Zone ${zone})`, entries);
                tableCount++;
            }
        }
    }
    sql.push('');
}

sql.push('-- Verification');
sql.push(`SELECT 'Created' as status, name FROM price_tables WHERE name LIKE 'Aluxe V2 - Skyline%' OR name LIKE 'Aluxe V2 - Carport%' ORDER BY name;`);

fs.writeFileSync('scripts/import_skyline_carport.sql', sql.join('\n'));
console.log(`Generated: scripts/import_skyline_carport.sql`);
console.log(`Total tables: ${tableCount}`);
console.log(`Total lines: ${sql.length}`);
