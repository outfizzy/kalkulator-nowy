const XLSX = require('xlsx');
const fs = require('fs');
const wb = XLSX.readFile('imports/Aluxe Preisliste UPE 2026_DE.xlsx');

const sql = [];
sql.push('-- Walls & Panorama V2 Import (FIXED)');
sql.push('-- Generated: ' + new Date().toISOString());
sql.push('');

// Create product definitions
sql.push('-- 1. Product definitions');
sql.push(`INSERT INTO product_definitions (code, name, category, provider, description) VALUES`);
sql.push(`  ('aluxe_v2_walls', 'Aluxe V2 - Walls', 'sliding_wall', 'Aluxe', 'Wall enclosures and doors')`);
sql.push(`ON CONFLICT (code) DO NOTHING;`);
sql.push('');

function generateTableSQL(tableName, entries, productCode = 'aluxe_v2_walls') {
    if (entries.length === 0) return;

    sql.push(`-- ${tableName} (${entries.length} entries)`);
    sql.push(`INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)`);
    sql.push(`SELECT pd.id, '${tableName}', 'matrix', true, 'EUR'`);
    sql.push(`FROM product_definitions pd WHERE pd.code = '${productCode}'`);
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

function parseDimension(str) {
    const cleaned = String(str).replace(/\s+/g, '').replace('mm', '').replace('*', '');
    return parseInt(cleaned);
}

let tableCount = 0;

// ========== SEITENWAND (Side Wall) ==========
sql.push('-- ============= SIDE WALL (SEITENWAND) =============');
const swSheet = wb.Sheets['SeitenwandR'];
if (swSheet) {
    const data = XLSX.utils.sheet_to_json(swSheet, { header: 1, defval: '' });
    const entries = [];

    // Rows 7-11: 3000-5000mm, price in col 1
    for (let i = 7; i <= 11; i++) {
        const row = data[i];
        if (!row) continue;
        const dim = parseDimension(row[0]);
        const price = parseFloat(row[1]);
        if (!isNaN(dim) && dim >= 3000 && !isNaN(price) && price > 0) {
            entries.push({ width: 0, projection: dim, price });
        }
    }

    if (entries.length > 0) {
        generateTableSQL('Aluxe V2 - Side Wall (Glass)', entries);
        tableCount++;
    }
}

// ========== FRONTWAND (Front Wall) ==========
sql.push('-- ============= FRONT WALL (FRONTWAND) =============');
const fwSheet = wb.Sheets['FrontwandR'];
if (fwSheet) {
    const data = XLSX.utils.sheet_to_json(fwSheet, { header: 1, defval: '' });
    const entries = [];

    // Rows 7-9: 5000-7000mm, price in col 2
    for (let i = 7; i <= 9; i++) {
        const row = data[i];
        if (!row) continue;
        const dim = parseDimension(row[0]);
        const price = parseFloat(row[2]);
        if (!isNaN(dim) && dim >= 5000 && !isNaN(price) && price > 0) {
            entries.push({ width: dim, projection: 0, price });
        }
    }

    if (entries.length > 0) {
        generateTableSQL('Aluxe V2 - Front Wall (Glass)', entries);
        tableCount++;
    }
}

// ========== KEILFENSTER (Wedge Window) ==========
sql.push('-- ============= WEDGE WINDOW (KEILFENSTER) =============');
const kfSheet = wb.Sheets['KeilfensterR'];
if (kfSheet) {
    const data = XLSX.utils.sheet_to_json(kfSheet, { header: 1, defval: '' });
    const entries = [];

    // Rows 7-9: 4000-5000mm, price in col 1
    for (let i = 7; i <= 9; i++) {
        const row = data[i];
        if (!row) continue;
        const dim = parseDimension(row[0]);
        const price = parseFloat(row[1]);
        if (!isNaN(dim) && dim >= 4000 && !isNaN(price) && price > 0) {
            entries.push({ width: 0, projection: dim, price });
        }
    }

    if (entries.length > 0) {
        generateTableSQL('Aluxe V2 - Wedge (Glass)', entries);
        tableCount++;
    }
}

// ========== SCHIEBETÜR (Sliding Door) ==========
sql.push('-- ============= SLIDING DOOR (SCHIEBETÜR) =============');
const stSheet = wb.Sheets['SchiebetürR'];
if (stSheet) {
    const data = XLSX.utils.sheet_to_json(stSheet, { header: 1, defval: '' });

    // Rows 3-11: 2000-6000mm
    // Col 1: VSG klar price
    // Col 2: Aufpreis VSG matt
    // Col 3: Aufpreis Isolierglas
    const entriesKlar = [];
    const entriesMatt = [];
    const entriesIso = [];

    for (let i = 3; i <= 11; i++) {
        const row = data[i];
        if (!row) continue;
        const dim = parseDimension(row[0]);
        const priceKlar = parseFloat(row[1]);
        const aufpreisMatt = parseFloat(row[2]);
        const aufpreisIso = parseFloat(row[3]);

        if (!isNaN(dim) && dim >= 2000 && !isNaN(priceKlar) && priceKlar > 0) {
            entriesKlar.push({ width: dim, projection: 0, price: priceKlar });

            // Matt = base + surcharge
            if (!isNaN(aufpreisMatt) && aufpreisMatt > 0) {
                entriesMatt.push({ width: dim, projection: 0, price: priceKlar + aufpreisMatt });
            }

            // Isolierglas = base + surcharge
            if (!isNaN(aufpreisIso) && aufpreisIso > 0) {
                entriesIso.push({ width: dim, projection: 0, price: priceKlar + aufpreisIso });
            }
        }
    }

    if (entriesKlar.length > 0) {
        generateTableSQL('Aluxe V2 - Schiebetür (VSG klar)', entriesKlar);
        tableCount++;
    }
    if (entriesMatt.length > 0) {
        generateTableSQL('Aluxe V2 - Schiebetür (VSG matt)', entriesMatt);
        tableCount++;
    }
    if (entriesIso.length > 0) {
        generateTableSQL('Aluxe V2 - Schiebetür (Isolierglas)', entriesIso);
        tableCount++;
    }
}

// ========== PANORAMA ==========
sql.push('-- ============= PANORAMA SLIDING WALLS =============');

// For Panorama, row 3 has the panel price for width range 600-1100mm
// We'll use 850mm (midpoint) as the representative width
// Col 2: 3-Tor price, Col 3: 5-Tor price

const PANORAMA_CONFIG = [
    { sheet: 'Panorama AL22R', model: 'AL22', tracks: [3, 5], priceCols: [2, 3], dataRow: 3 },
    { sheet: 'Panorama AL 23R', model: 'AL23', tracks: [3, 5, 7], priceCols: [2, 3, 4], dataRow: 3 },
    { sheet: 'Panorama AL24R', model: 'AL24', tracks: [3, 5], priceCols: [2, 3], dataRow: 3 },
    { sheet: 'Panorama AL 25R', model: 'AL25', tracks: [3, 5], priceCols: [2, 3], dataRow: 3 },
    { sheet: 'Panorama AL26R', model: 'AL26', tracks: [3, 5], priceCols: [2, 3], dataRow: 3 },
];

for (const pano of PANORAMA_CONFIG) {
    const sheet = wb.Sheets[pano.sheet];
    if (!sheet) continue;

    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const row = data[pano.dataRow];
    if (!row) continue;

    for (let i = 0; i < pano.tracks.length; i++) {
        const trackCount = pano.tracks[i];
        const priceCol = pano.priceCols[i];
        const price = parseFloat(row[priceCol]);

        if (!isNaN(price) && price > 0) {
            // Using 850mm as representative panel width (range is 600-1100mm)
            const entries = [{ width: 850, projection: 0, price }];
            const tableName = `Aluxe V2 - Panorama ${pano.model} (${trackCount}-Tor)`;
            generateTableSQL(tableName, entries);
            tableCount++;
        }
    }
}

sql.push('-- Verification');
sql.push(`SELECT 'Created' as status, name FROM price_tables WHERE name LIKE 'Aluxe V2 - Side Wall%' OR name LIKE 'Aluxe V2 - Front Wall%' OR name LIKE 'Aluxe V2 - Wedge%' OR name LIKE 'Aluxe V2 - Schiebetür%' OR name LIKE 'Aluxe V2 - Panorama%' ORDER BY name;`);

fs.writeFileSync('scripts/import_walls_panorama.sql', sql.join('\n'));
console.log(`Generated: scripts/import_walls_panorama.sql`);
console.log(`Total tables: ${tableCount}`);
console.log(`Total lines: ${sql.length}`);
