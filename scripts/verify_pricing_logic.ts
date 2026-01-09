
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Fix for ESM/dotenv (as seen in previous scripts)
const __dirname = path.resolve();
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPrice(model: string, name: string, attrs: Record<string, string>) {
    console.log(`\n--- Checking ${name} ---`);
    console.log(`Attributes:`, JSON.stringify(attrs));

    // 1. Get Product ID
    const { data: product } = await supabase.from('product_definitions').select('id').eq('code', model).single();
    if (!product) {
        console.error('Product not found:', model);
        return;
    }

    // 2. Simulate logic from PricingService.getPriceMatrix
    // Fetch all active tables
    const { data: tables } = await supabase
        .from('price_tables')
        .select('*')
        .eq('product_definition_id', product.id)
        .eq('is_active', true);

    if (!tables || tables.length === 0) {
        console.log('No tables found.');
        return;
    }

    // Filter out components (matches PricingService fix)
    const filteredTables = tables.filter(t =>
        t.type !== 'component' &&
        t.type !== 'simple' &&
        t.attributes?.type !== 'component_list' &&
        t.attributes?.table_type !== 'component_list'
    );

    if (filteredTables.length === 0) {
        console.log('No non-component tables found after filtering.');
        return;
    }

    // Reuse Logic from Service (Simplified for debug)
    const bestMatch = filteredTables.find(table => {
        // A. Check Variant Config (If present and NOT empty)
        if (table.variant_config && Object.keys(table.variant_config).length > 0) {
            const vc = table.variant_config;
            const contextAttributes = attrs;
            if (vc.roofType && vc.roofType !== contextAttributes.roofType) return false;
            if (vc.snowZone && contextAttributes.snowZone && String(vc.snowZone) !== String(contextAttributes.snowZone)) return false;
            if (vc.subtype && contextAttributes.subtype) {
                const tSub = vc.subtype.toLowerCase();
                const cSub = contextAttributes.subtype.toLowerCase();
                if (!tSub.includes(cSub) && !cSub.includes(tSub)) return false;
            }
            return true;
        }

        // B. Fallback: Check Attributes (Robust "Smart Match" Logic)
        const tableAttrs = table.attributes || {};
        const contextAttributes = attrs;
        const checkKeys = ['snow_zone', 'roof_type', 'subtype', 'mounting'];

        for (const key of checkKeys) {
            const tv = tableAttrs[key] ? String(tableAttrs[key]).toLowerCase() : null;
            const cv = contextAttributes[key] ? String(contextAttributes[key]).toLowerCase() : null;

            if (key === 'subtype') {
                if (tv && cv && tv === cv) continue;
                const cRoof = contextAttributes['roofType'] ? String(contextAttributes['roofType']).toLowerCase() : '';
                if (tv && cRoof && tv === cRoof) continue; // Match Table Subtype with Context Roof
                if (tv && cv && (tv.includes(cv) || cv.includes(tv))) continue;
                if (tv) return false;
                continue;
            }

            if (tv) {
                if (!cv) return false;
                if (tv !== cv) return false;
            }
        }
        return true;
    });

    if (bestMatch) {
        console.log(`MATCHED TABLE: "${bestMatch.name}" (ID: ${bestMatch.id})`);
        console.log(`Table Config:`, JSON.stringify(bestMatch.configuration?.free_standing_surcharge ? "Has FS Surcharge" : "No FS Surcharge"));
        // Check Price for 4x3
        let price = 0;
        if (bestMatch.data?.rows) {
            console.log('Table has JSON data');
        } else {
            // Check DB entries
            const { data: entries } = await supabase
                .from('price_matrix_entries')
                .select('*')
                .eq('price_table_id', bestMatch.id)
                .gte('width_mm', 4000)
                .gte('projection_mm', 3000)
                .limit(1);
            if (entries && entries.length > 0) {
                console.log(`Sample Price (4x3): ${entries[0].price} (Struct: ${entries[0].structure_price}, Glass: ${entries[0].glass_price})`);
            } else {
                console.log('No matching entry found for 4x3m');
            }
        }
    } else {
        console.log('NO MATCHING TABLE FOUND');
    }

    // 3. Simulate getTableConfig logic (CURRENT IMPLEMENTATION IS FLAWED?)
    const configMatch = tables.find(table => {
        // CURRENT FLAWED LOGIC: Only checks attributes
        const tableAttrs = table.attributes || {};
        const keys = Object.keys(tableAttrs);
        return keys.every(key => attrs[key] == tableAttrs[key]);
    });

    if (configMatch) {
        console.log(`[getTableConfig] MATCHED: "${configMatch.name}"`);
        console.log(`[getTableConfig] FS Surcharge:`, configMatch.configuration?.free_standing_surcharge);
    } else {
        console.log(`[getTableConfig] NO MATCH (using current logic)`);
    }
}

async function run() {
    // Scenario 1: Trendstyle, Zone 1, Poly
    await checkPrice('trendstyle', 'Trendstyle Z1 Poly', {
        snow_zone: '1',
        snowZone: '1', // Code uses both? Service normalize? config.snowZone is string '1'
        roof_type: 'polycarbonate',
        roofType: 'polycarbonate',
        subtype: 'polycarbonate'
    });

    // Scenario 2: Trendstyle, Zone 2, Poly (Should include increase)
    await checkPrice('trendstyle', 'Trendstyle Z2 Poly', {
        snow_zone: '2',
        snowZone: '2',
        roof_type: 'polycarbonate',
        roofType: 'polycarbonate',
        subtype: 'polycarbonate'
    });

    // Scenario 3: Trendstyle, Zone 1, Glass
    await checkPrice('trendstyle', 'Trendstyle Z1 Glass', {
        snow_zone: '1',
        snowZone: '1',
        roof_type: 'glass',
        roofType: 'glass',
        subtype: 'glass'
    });
}

run();
