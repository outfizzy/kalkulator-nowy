#!/usr/bin/env node
/**
 * Import Awning (Markise) prices from Aluxe Excel into Supabase
 * 
 * Creates tables for:
 * - Aufdach ZIP (1 Motor)
 * - Aufdach ZIP (2 Motors)
 * - Unterdach ZIP (1 Motor)
 * - Unterdach ZIP (2 Motors)
 */

import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';

// Current Supabase project - Kalkulator
const SUPABASE_URL = 'https://whgjsppyuvglhbdgdark.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZ2pzcHB5dXZnbGhiZGdkYXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyNDg2ODMsImV4cCI6MjA1MTgyNDY4M30.C_OwNDHNy5FPkVVVF8KMGxpdFWBZQnpDgVoNUgMy-Ek';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Awning configurations
const AWNING_CONFIGS = [
    {
        sheetName: 'Markisen - Aufdach ZIP',
        type: 'Aufdach',
        oneMotor: {
            tableName: 'Aluxe V2 - Markise Aufdach ZIP (1 Motor)',
            startRow: 7,
            endRow: 13,
            widthCol: 0,
            priceStartCol: 1
        },
        twoMotor: {
            tableName: 'Aluxe V2 - Markise Aufdach ZIP (2 Motors)',
            startRow: 21,
            endRow: 27,
            widthCol: 0,
            priceStartCol: 1
        }
    },
    {
        sheetName: 'Markisen - Unterdach ZIP ',
        type: 'Unterdach',
        oneMotor: {
            tableName: 'Aluxe V2 - Markise Unterdach ZIP (1 Motor)',
            startRow: 7,
            endRow: 13,
            widthCol: 0,
            priceStartCol: 2  // Unterdach has Montagekonsolen column
        },
        twoMotor: {
            tableName: 'Aluxe V2 - Markise Unterdach ZIP (2 Motors)',
            startRow: 21,
            endRow: 27,
            widthCol: 0,
            priceStartCol: 2
        }
    }
];

// Projections (Ausfall) in mm
const PROJECTIONS = [2500, 3000, 3500, 4000, 4500, 5000];

async function createAwningTable(tableName, entries, motorCount, type) {
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
                category: 'awning',
                awning_type: type,
                motor_count: motorCount
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

function parseAwningPrices(data, config, projections) {
    const entries = [];
    const priceStartCol = config.priceStartCol;

    for (let rowIdx = config.startRow; rowIdx <= config.endRow; rowIdx++) {
        const row = data[rowIdx];
        if (!row || !row[config.widthCol]) continue;

        const width = Number(row[config.widthCol]);
        if (isNaN(width) || width <= 0) continue;

        for (let i = 0; i < projections.length; i++) {
            const price = Number(row[priceStartCol + i]);
            if (!isNaN(price) && price > 0) {
                entries.push({
                    width: width,
                    projection: projections[i],
                    price: Math.round(price * 100) / 100
                });
            }
        }
    }

    return entries;
}

async function importAwningPrices() {
    console.log('📥 Reading Excel file...');
    const wb = XLSX.readFile('imports/Aluxe Preisliste UPE 2026_DE.xlsx');

    let tablesCreated = 0;
    let totalEntries = 0;

    for (const awningConfig of AWNING_CONFIGS) {
        console.log(`\n📦 Processing ${awningConfig.type}...`);

        const sheet = wb.Sheets[awningConfig.sheetName];
        if (!sheet) {
            console.log(`  ⚠️  Sheet not found: ${awningConfig.sheetName}`);
            continue;
        }

        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        // 1 Motor prices
        console.log(`  Processing 1 Motor...`);
        const oneMotorEntries = parseAwningPrices(data, awningConfig.oneMotor, PROJECTIONS);
        if (oneMotorEntries.length > 0) {
            await createAwningTable(awningConfig.oneMotor.tableName, oneMotorEntries, 1, awningConfig.type);
            tablesCreated++;
            totalEntries += oneMotorEntries.length;
        }

        // 2 Motor prices
        console.log(`  Processing 2 Motors...`);
        const twoMotorEntries = parseAwningPrices(data, awningConfig.twoMotor, PROJECTIONS);
        if (twoMotorEntries.length > 0) {
            await createAwningTable(awningConfig.twoMotor.tableName, twoMotorEntries, 2, awningConfig.type);
            tablesCreated++;
            totalEntries += twoMotorEntries.length;
        }
    }

    console.log('\n✅ Import completed!');
    console.log(`   Tables created: ${tablesCreated}`);
    console.log(`   Total entries: ${totalEntries}`);
}

// Run the import
importAwningPrices().catch(console.error);
