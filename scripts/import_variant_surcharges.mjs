/**
 * Import Glass Matt/Stopsol and Poly IR Gold surcharges from Aluxe Excel
 * Run with: node --experimental-specifier-resolution=node scripts/import_variant_surcharges.mjs
 */

import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://pvltqxjpqkkswlmwfbbr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2bHRxeGpwcWtrc3dsbXdmYmJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3NjgyNzAsImV4cCI6MjA0NzM0NDI3MH0.s9fLihnH5n7UzExBBEv3LrJqj7qLVLdTBMFnKUl6lVw'
);

// Glass sheets have Matt surcharge in column E, Stopsol in column F
// Poly sheets have IR Gold surcharge in column E
const MODELS = [
    { name: 'Orangeline', hasGlass: true, hasPoly: true },
    { name: 'Orangeline+', hasGlass: true, hasPoly: true },
    { name: 'Trendline', hasGlass: true, hasPoly: true },
    { name: 'Trendline+', hasGlass: true, hasPoly: true },
    { name: 'Topline', hasGlass: true, hasPoly: true },
    { name: 'Topline XL', hasGlass: true, hasPoly: true },
    { name: 'Designline', hasGlass: true, hasPoly: false },
    { name: 'Ultraline', hasGlass: true, hasPoly: false },
];

const ZONES = [
    { num: 1, suffix: 'Zone1R', alsoCheck: ['zone 1R', 'Zone1R', 'zone1R'] },
    { num: 2, suffix: 'Zone 1a+2R', alsoCheck: ['1a&2R', '1a+2R', 'zone 1a+2R'] },
    { num: 3, suffix: 'Zone 2a+3R', alsoCheck: ['2a&3R', '2a+3R', 'zone 2a+3R'] },
];

function findSheet(wb, model, type, zone) {
    const search = `${model} ${type}`;
    for (const name of wb.SheetNames) {
        const lower = name.toLowerCase();
        const searchLower = search.toLowerCase();

        if (lower.includes(searchLower.split(' ')[0]) &&
            lower.includes(type.toLowerCase().substring(0, 4))) {

            // Check zone
            for (const check of zone.alsoCheck) {
                if (lower.includes(check.toLowerCase())) {
                    return wb.Sheets[name];
                }
            }
        }
    }
    return null;
}

function parseDimension(dim) {
    if (!dim || typeof dim !== 'string') return null;
    const match = dim.replace(/\s+/g, '').match(/(\d+)x(\d+)/);
    if (match) {
        return { width: parseInt(match[1]), projection: parseInt(match[2]) };
    }
    const single = dim.match(/(\d+)/);
    if (single) {
        return { width: parseInt(single[1]), projection: 0 };
    }
    return null;
}

async function createSurchargeTable(tableName, entries) {
    // Check if exists
    const { data: existing } = await supabase
        .from('price_tables')
        .select('id')
        .eq('name', tableName)
        .limit(1);

    if (existing && existing.length > 0) {
        console.log(`  ⏭️  Table exists: ${tableName}`);
        return existing[0].id;
    }

    // Create table
    const { data: newTable, error: tableError } = await supabase
        .from('price_tables')
        .insert({
            name: tableName,
            type: 'manufacturer',
            pricing_base: 'MATRIX',
            is_active: true,
            attributes: {
                provider: 'Aluxe',
                version: 'V2',
                category: 'surcharge'
            }
        })
        .select()
        .single();

    if (tableError) {
        console.error(`  ❌ Error creating table ${tableName}:`, tableError.message);
        return null;
    }

    // Insert entries
    const matrixEntries = entries.map(e => ({
        price_table_id: newTable.id,
        width_mm: e.width,
        projection_mm: e.projection,
        price: e.price
    }));

    const { error: entriesError } = await supabase
        .from('price_matrix_entries')
        .insert(matrixEntries);

    if (entriesError) {
        console.error(`  ❌ Error inserting entries for ${tableName}:`, entriesError.message);
    } else {
        console.log(`  ✅ Created: ${tableName} (${entries.length} entries)`);
    }

    return newTable.id;
}

async function importVariantSurcharges() {
    console.log('📥 Reading Excel file...');
    const wb = XLSX.readFile('imports/Aluxe Preisliste UPE 2026_DE.xlsx');

    let glassMattCount = 0;
    let glassStopsolCount = 0;
    let polyIRGoldCount = 0;

    for (const model of MODELS) {
        console.log(`\n📦 Processing ${model.name}...`);

        for (const zone of ZONES) {
            // Glass sheets
            if (model.hasGlass) {
                const glassSheet = findSheet(wb, model.name, 'Glas', zone);
                if (glassSheet) {
                    const data = XLSX.utils.sheet_to_json(glassSheet, { header: 1, defval: '' });

                    // Find header row (look for 'matt' or 'milch' in columns)
                    let mattCol = 4; // Default E
                    let stopsolCol = 5; // Default F
                    let dataStartRow = 8; // Usually row 9 in Excel (0-indexed: 8)

                    // Parse entries
                    const mattEntries = [];
                    const stopsolEntries = [];

                    for (let i = dataStartRow; i < data.length; i++) {
                        const row = data[i];
                        const dim = parseDimension(String(row[0]));
                        if (!dim) continue;

                        const mattPrice = parseFloat(row[mattCol]);
                        const stopsolPrice = parseFloat(row[stopsolCol]);

                        if (!isNaN(mattPrice) && mattPrice > 0) {
                            mattEntries.push({ ...dim, price: mattPrice });
                        }
                        if (!isNaN(stopsolPrice) && stopsolPrice > 0) {
                            stopsolEntries.push({ ...dim, price: stopsolPrice });
                        }
                    }

                    // Create tables
                    if (mattEntries.length > 0) {
                        await createSurchargeTable(
                            `Aluxe V2 - ${model.name} Glass Matt Surcharge (Zone ${zone.num})`,
                            mattEntries
                        );
                        glassMattCount++;
                    }

                    if (stopsolEntries.length > 0) {
                        await createSurchargeTable(
                            `Aluxe V2 - ${model.name} Glass Stopsol Surcharge (Zone ${zone.num})`,
                            stopsolEntries
                        );
                        glassStopsolCount++;
                    }
                }
            }

            // Poly sheets
            if (model.hasPoly) {
                const polySheet = findSheet(wb, model.name, 'Polycarbonat', zone);
                if (polySheet) {
                    const data = XLSX.utils.sheet_to_json(polySheet, { header: 1, defval: '' });

                    let irGoldCol = 4; // Default E
                    let dataStartRow = 8;

                    const irGoldEntries = [];

                    for (let i = dataStartRow; i < data.length; i++) {
                        const row = data[i];
                        const dim = parseDimension(String(row[0]));
                        if (!dim) continue;

                        const irGoldPrice = parseFloat(row[irGoldCol]);

                        if (!isNaN(irGoldPrice) && irGoldPrice > 0) {
                            irGoldEntries.push({ ...dim, price: irGoldPrice });
                        }
                    }

                    if (irGoldEntries.length > 0) {
                        await createSurchargeTable(
                            `Aluxe V2 - ${model.name} Poly IR Gold Surcharge (Zone ${zone.num})`,
                            irGoldEntries
                        );
                        polyIRGoldCount++;
                    }
                }
            }
        }
    }

    console.log('\n✅ Import completed!');
    console.log(`   Glass Matt: ${glassMattCount} tables`);
    console.log(`   Glass Stopsol: ${glassStopsolCount} tables`);
    console.log(`   Poly IR Gold: ${polyIRGoldCount} tables`);
}

importVariantSurcharges().catch(console.error);
