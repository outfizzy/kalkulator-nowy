const XLSX = require('xlsx');
const fs = require('fs');
const wb = XLSX.readFile('imports/Aluxe Preisliste UPE 2026_DE.xlsx');

// Exact sheet names from Excel (verified from listing)
const SHEET_MAP = {
    // Orangeline
    'Orangeline Glass Zone 1': 'Orangeline Glas zone 1R',
    'Orangeline Glass Zone 2': 'Orangeline Glas zone 1a&2R',
    'Orangeline Glass Zone 3': 'Orangeline Glas zone 2a&3R',
    'Orangeline Poly Zone 1': 'Orangeline  Polycarbonat Zone1R',
    'Orangeline Poly Zone 2': 'Orangeline Polycarbonat 1a&2R',
    'Orangeline Poly Zone 3': 'Orangeline Polycarbonat 2a&3R',

    // Orangeline+
    'Orangeline+ Glass Zone 1': 'Orangeline+ Glas zone 1R',
    'Orangeline+ Glass Zone 2': 'Orangeline+ Glas zone 1a&2R',
    'Orangeline+ Glass Zone 3': 'Orangeline+ Glas zone 2a&3R',
    'Orangeline+ Poly Zone 1': 'Orangeline+ Polycarbonat Zone1R',
    'Orangeline+ Poly Zone 2': 'Orangeline+ Polycarbonat 1a&2R',
    'Orangeline+ Poly Zone 3': 'Orangeline+ Polycarbonat 2a&3R',

    // Trendline
    'Trendline Glass Zone 1': 'Trendline Glas zone 1R',
    'Trendline Glass Zone 2': 'Trendline Glas 1a & 2R',
    'Trendline Glass Zone 3': 'Trendline Glas 2a & 3R',
    'Trendline Poly Zone 1': 'Trendline Polycarbonat Zone1R',
    'Trendline Poly Zone 2': 'Trendline Polycarbonat 1a&2R',
    'Trendline Poly Zone 3': 'Trendline Polycarbonat 2a&3R ',

    // Trendline+
    'Trendline+ Glass Zone 1': 'Trendline+ Glas zone 1R',
    'Trendline+ Glass Zone 2': 'Trendline+ Glas 1a & 2R',
    'Trendline+ Glass Zone 3': 'Trendline+ Glas 2a & 3R',
    'Trendline+ Poly Zone 1': 'Trendline+ Polycarbonat Zone1R',
    'Trendline+ Poly Zone 2': 'Trendline+ Polycarbonat 1a&2R',
    'Trendline+ Poly Zone 3': 'Trendline+ Polycarbonat 2a&3R ',

    // Topline
    'Topline Glass Zone 1': 'Topline Glas zone 1R ',
    'Topline Glass Zone 2': 'Topline Glas zone 1a+2R',
    'Topline Glass Zone 3': 'Topline Glas zone 2a+3R',
    'Topline Poly Zone 1': 'Topline Polycarbonat Z 1R',
    'Topline Poly Zone 2': 'Topline Polycarbonat Z 1a +2R',
    'Topline Poly Zone 3': 'Topline Polycarbonat Z 2a + 3R',

    // Topline XL
    'Topline XL Glass Zone 1': 'Topline XL Glas zone 1R',
    'Topline XL Glass Zone 2': 'Topline XL Glas zone 1a+2R',
    'Topline XL Glass Zone 3': 'Topline XL Glas zone 2a+3R',
    'Topline XL Poly Zone 1': 'Topline XL Polycarbonat Z 1R',
    'Topline XL Poly Zone 2': 'Topline XL Polycarbona Z1a + 2R',
    'Topline XL Poly Zone 3': 'Topline XL Poly Z 2a + 3R',
};

const MODELS = [
    { name: 'Orangeline', hasPoly: true },
    { name: 'Orangeline+', hasPoly: true },
    { name: 'Trendline', hasPoly: true },
    { name: 'Trendline+', hasPoly: true },
    { name: 'Topline', hasPoly: true },
    { name: 'Topline XL', hasPoly: true },
];

const ZONES = [1, 2, 3];
const sql = [];

sql.push('-- Complete Variant Surcharge Tables Import for ALL Models & Zones');
sql.push('-- Generated: ' + new Date().toISOString());
sql.push('-- Total models: 6, Zones: 3, Variants: Matt, Stopsol, IR Gold');
sql.push('');
sql.push('-- 1. Create product definition for surcharges');
sql.push(`INSERT INTO product_definitions (code, name, category, provider, description)`);
sql.push(`VALUES ('aluxe_v2_surcharge', 'Aluxe V2 - Variant Surcharges', 'other', 'Aluxe', 'Surcharges for glass/poly variants')`);
sql.push(`ON CONFLICT (code) DO NOTHING;`);
sql.push('');

function getSheet(key) {
    const exactName = SHEET_MAP[key];
    if (!exactName) return null;
    // Try exact match
    if (wb.Sheets[exactName]) return wb.Sheets[exactName];
    // Try trimmed
    if (wb.Sheets[exactName.trim()]) return wb.Sheets[exactName.trim()];
    // Try fuzzy
    for (const name of wb.SheetNames) {
        if (name.trim().toLowerCase() === exactName.trim().toLowerCase()) {
            return wb.Sheets[name];
        }
    }
    return null;
}

function parseGlassSheet(sheet) {
    if (!sheet) return { matt: [], stopsol: [] };
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const matt = [], stopsol = [];

    for (let i = 8; i < data.length; i++) {
        const row = data[i];
        const dimStr = String(row[0]).replace(/\s+/g, '');
        const dim = dimStr.match(/(\d+)x(\d+)/);
        if (!dim) continue;

        const width = parseInt(dim[1]);
        const projection = parseInt(dim[2]);
        const mattPrice = parseFloat(row[4]);
        const stopsolPrice = parseFloat(row[5]);

        if (!isNaN(mattPrice) && mattPrice > 0) {
            matt.push({ width, projection, price: mattPrice });
        }
        if (!isNaN(stopsolPrice) && stopsolPrice > 0) {
            stopsol.push({ width, projection, price: stopsolPrice });
        }
    }
    return { matt, stopsol };
}

function parsePolySheet(sheet) {
    if (!sheet) return [];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const irGold = [];

    for (let i = 8; i < data.length; i++) {
        const row = data[i];
        const dimStr = String(row[0]).replace(/\s+/g, '');
        const dim = dimStr.match(/(\d+)x(\d+)/);
        if (!dim) continue;

        const width = parseInt(dim[1]);
        const projection = parseInt(dim[2]);
        const price = parseFloat(row[4]); // IR Gold in column E

        if (!isNaN(price) && price > 0) {
            irGold.push({ width, projection, price });
        }
    }
    return irGold;
}

function generateTableSQL(tableName, entries) {
    if (entries.length === 0) return;

    sql.push(`-- ${tableName} (${entries.length} entries)`);
    sql.push(`INSERT INTO price_tables (product_definition_id, name, type, is_active, currency)`);
    sql.push(`SELECT pd.id, '${tableName}', 'matrix', true, 'EUR'`);
    sql.push(`FROM product_definitions pd WHERE pd.code = 'aluxe_v2_surcharge'`);
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
let missingSheets = [];

for (const model of MODELS) {
    sql.push(`-- ============= ${model.name.toUpperCase()} =============`);

    for (const zone of ZONES) {
        // Glass
        const glassKey = `${model.name} Glass Zone ${zone}`;
        const glassSheet = getSheet(glassKey);
        if (glassSheet) {
            const data = parseGlassSheet(glassSheet);
            if (data.matt.length > 0) {
                generateTableSQL(`Aluxe V2 - ${model.name} Glass Matt Surcharge (Zone ${zone})`, data.matt);
                tableCount++;
            }
            if (data.stopsol.length > 0) {
                generateTableSQL(`Aluxe V2 - ${model.name} Glass Stopsol Surcharge (Zone ${zone})`, data.stopsol);
                tableCount++;
            }
        } else {
            missingSheets.push(glassKey);
        }

        // Poly
        if (model.hasPoly) {
            const polyKey = `${model.name} Poly Zone ${zone}`;
            const polySheet = getSheet(polyKey);
            if (polySheet) {
                const irGold = parsePolySheet(polySheet);
                if (irGold.length > 0) {
                    generateTableSQL(`Aluxe V2 - ${model.name} Poly IR Gold Surcharge (Zone ${zone})`, irGold);
                    tableCount++;
                }
            } else {
                missingSheets.push(polyKey);
            }
        }
    }
    sql.push('');
}

sql.push('-- Verification');
sql.push(`SELECT 'Created' as status, name FROM price_tables WHERE name LIKE 'Aluxe V2 - %Surcharge%' ORDER BY name;`);

fs.writeFileSync('scripts/import_all_surcharges.sql', sql.join('\n'));
console.log(`Generated: scripts/import_all_surcharges.sql`);
console.log(`Total tables: ${tableCount}`);
console.log(`Total lines: ${sql.length}`);
if (missingSheets.length > 0) {
    console.log(`Missing sheets: ${missingSheets.join(', ')}`);
}
