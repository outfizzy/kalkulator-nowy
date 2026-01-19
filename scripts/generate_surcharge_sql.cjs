const XLSX = require('xlsx');
const fs = require('fs');
const wb = XLSX.readFile('imports/Aluxe Preisliste UPE 2026_DE.xlsx');

// Map model names to their sheet patterns
const MODELS = [
    { name: 'Trendline', glassSheet: 'Trendline Glas zone 1R', polySheet: 'Trendline Polycarbonat Zone1R' },
];

// Output SQL statements
const sql = [];

// Create tables first
sql.push(`-- Variant Surcharge Tables Import`);
sql.push(`-- Run this in Supabase SQL Editor`);
sql.push(``);

for (const model of MODELS) {
    // Glass sheet
    const glassSheet = wb.Sheets[model.glassSheet];
    if (glassSheet) {
        const data = XLSX.utils.sheet_to_json(glassSheet, { header: 1, defval: '' });

        const mattEntries = [];
        const stopsolEntries = [];

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
                mattEntries.push({ width, projection, price: mattPrice });
            }
            if (!isNaN(stopsolPrice) && stopsolPrice > 0) {
                stopsolEntries.push({ width, projection, price: stopsolPrice });
            }
        }

        // Generate SQL for Matt
        if (mattEntries.length > 0) {
            const tableName = `Aluxe V2 - ${model.name} Glass Matt Surcharge (Zone 1)`;
            sql.push(`-- ${tableName} (${mattEntries.length} entries)`);
            sql.push(`INSERT INTO price_tables (name, type, pricing_base, is_active) VALUES`);
            sql.push(`  ('${tableName}', 'manufacturer', 'MATRIX', true)`);
            sql.push(`ON CONFLICT (name) DO NOTHING;`);
            sql.push(``);
            sql.push(`WITH table_id AS (SELECT id FROM price_tables WHERE name = '${tableName}')`);
            sql.push(`INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)`);
            sql.push(`SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES`);
            mattEntries.forEach((e, idx) => {
                sql.push(`  (${e.width}, ${e.projection}, ${e.price.toFixed(2)})${idx === mattEntries.length - 1 ? '' : ','}`);
            });
            sql.push(`) AS t(width_mm, projection_mm, price)`);
            sql.push(`ON CONFLICT DO NOTHING;`);
            sql.push(``);
        }

        // Generate SQL for Stopsol
        if (stopsolEntries.length > 0) {
            const tableName = `Aluxe V2 - ${model.name} Glass Stopsol Surcharge (Zone 1)`;
            sql.push(`-- ${tableName} (${stopsolEntries.length} entries)`);
            sql.push(`INSERT INTO price_tables (name, type, pricing_base, is_active) VALUES`);
            sql.push(`  ('${tableName}', 'manufacturer', 'MATRIX', true)`);
            sql.push(`ON CONFLICT (name) DO NOTHING;`);
            sql.push(``);
            sql.push(`WITH table_id AS (SELECT id FROM price_tables WHERE name = '${tableName}')`);
            sql.push(`INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)`);
            sql.push(`SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES`);
            stopsolEntries.forEach((e, idx) => {
                sql.push(`  (${e.width}, ${e.projection}, ${e.price.toFixed(2)})${idx === stopsolEntries.length - 1 ? '' : ','}`);
            });
            sql.push(`) AS t(width_mm, projection_mm, price)`);
            sql.push(`ON CONFLICT DO NOTHING;`);
            sql.push(``);
        }
    }

    // Poly sheet for IR Gold
    const polySheet = wb.Sheets[model.polySheet];
    if (polySheet) {
        const data = XLSX.utils.sheet_to_json(polySheet, { header: 1, defval: '' });

        const irGoldEntries = [];

        for (let i = 8; i < data.length; i++) {
            const row = data[i];
            const dimStr = String(row[0]).replace(/\s+/g, '');
            const dim = dimStr.match(/(\d+)x(\d+)/);
            if (!dim) continue;

            const width = parseInt(dim[1]);
            const projection = parseInt(dim[2]);
            const irGoldPrice = parseFloat(row[4]);

            if (!isNaN(irGoldPrice) && irGoldPrice > 0) {
                irGoldEntries.push({ width, projection, price: irGoldPrice });
            }
        }

        if (irGoldEntries.length > 0) {
            const tableName = `Aluxe V2 - ${model.name} Poly IR Gold Surcharge (Zone 1)`;
            sql.push(`-- ${tableName} (${irGoldEntries.length} entries)`);
            sql.push(`INSERT INTO price_tables (name, type, pricing_base, is_active) VALUES`);
            sql.push(`  ('${tableName}', 'manufacturer', 'MATRIX', true)`);
            sql.push(`ON CONFLICT (name) DO NOTHING;`);
            sql.push(``);
            sql.push(`WITH table_id AS (SELECT id FROM price_tables WHERE name = '${tableName}')`);
            sql.push(`INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)`);
            sql.push(`SELECT table_id.id, t.width_mm, t.projection_mm, t.price FROM table_id, (VALUES`);
            irGoldEntries.forEach((e, idx) => {
                sql.push(`  (${e.width}, ${e.projection}, ${e.price.toFixed(2)})${idx === irGoldEntries.length - 1 ? '' : ','}`);
            });
            sql.push(`) AS t(width_mm, projection_mm, price)`);
            sql.push(`ON CONFLICT DO NOTHING;`);
            sql.push(``);
        }
    }
}

// Write SQL file
fs.writeFileSync('scripts/import_trendline_surcharges.sql', sql.join('\n'));
console.log('Generated SQL file: scripts/import_trendline_surcharges.sql');
console.log('Lines:', sql.length);
