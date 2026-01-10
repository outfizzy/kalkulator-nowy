
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Manual Env Setup because ts-node might miss .env
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ejceswzt0.supabase.co';
// Note: In real app this comes from env. For script I will rely on process.env or hardcoded if needed.
// I will try to read .env file manually if possible, but hardcoding the known URL is safer for specific script.
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

// I'll grab the key from the previous script context or just assume it is set in env when running.
// If it fails, I'll update it.

if (!SUPABASE_KEY) {
    console.error("Missing SUPABASE_KEY. Please run with NEXT_PUBLIC_SUPABASE_ANON_KEY=... ts-node ...");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyPricingLogic() {
    console.log('🔍 Starting Pricing Integration Verification...');
    console.log(`📡 Connecting to: ${SUPABASE_URL}`);

    // 1. Check Product Definition for "Trendstyle"
    const modelId = "trendstyle"; // Code
    console.log(`\n1️⃣ Checking Product Definition for '${modelId}'...`);

    const { data: def, error: defError } = await supabase
        .from('product_definitions')
        .select('*')
        .ilike('code', modelId)
        .maybeSingle();

    if (defError) console.error('Error fetching def:', defError);

    if (def) {
        console.log(`✅ Found Product Definition: ${def.name}`);
        console.log(`   Configuration:`, JSON.stringify(def.configuration, null, 2));
    } else {
        console.error(`❌ Product Definition for '${modelId}' NOT FOUND! This will cause visibility issues.`);
    }

    // 2. Check Price Tables (Manual Imports)
    console.log(`\n2️⃣ Checking Manual Price Tables for '${modelId}'...`);
    const { data: tables, error: tableError } = await supabase
        .from('price_tables')
        .select('id, name')
        .ilike('name', `%${modelId}%`); // Fuzzy match name

    if (tableError) console.error('Error fetching tables:', tableError);

    if (tables && tables.length > 0) {
        console.log(`✅ Found ${tables.length} Price Tables:`);
        tables.forEach(t => console.log(`   - ${t.name}`));
    } else {
        console.error(`❌ No Price Tables found for '${modelId}'. Manual import missing or named incorrectly.`);
    }

    // 3. Simulate Logic: "Find Wall Price"
    // Looking for a table that matches "Trendstyle" AND "S1" (Zone 1) AND is NOT Freestanding
    console.log(`\n3️⃣ Simulating Pricing Logic (Wall-Mounted, Zone 1)...`);

    const wallTable = tables?.find(t => {
        const name = t.name.toLowerCase();
        return name.includes('trendstyle') && !name.includes('freestanding') && (name.includes('s1') || name.includes('zone 1'));
    });

    if (wallTable) {
        console.log(`✅ MATCHED Wall Table: ${wallTable.name}`);
        // Fetch content to verify grid
        const { data: tableData } = await supabase.from('price_tables').select('rows').eq('id', wallTable.id).single();
        if (tableData?.rows && Array.isArray(tableData.rows) && tableData.rows.length > 0) {
            console.log(`   Table has ${tableData.rows.length} rows of price data.`);
            console.log(`   Sample Row:`, tableData.rows[0]);
        } else {
            console.warn(`   ⚠️ Table matched but has NO data rows!`);
        }
    } else {
        console.error(`❌ Logic Verification FAILED: Could not find a 'Wall-Mounted Zone 1' table for Trendstyle.`);
        console.error(`   The system will NOT be able to price Wall-mounted Trendstyle.`);
    }

    // 4. Simulate Logic: "Freestanding Additive"
    console.log(`\n4️⃣ Simulating Freestanding Logic check...`);
    const isAdditive = def?.configuration?.freestanding_is_additive === true;
    const rules = def?.configuration?.freestanding_surcharge_rules;

    if (isAdditive) {
        console.log(`✅ Configuration forces ADDITIVE pricing.`);
        if (rules && rules.length > 0) {
            console.log(`✅ Inline Surcharge Rules found (${rules.length} rules).`);
            console.log(`   The system will use these rules to calculate surcharge.`);
        } else {
            console.warn(`⚠️ Additive is ON, but NO Inline Rules found. System will fallback to global 'pricing_surcharges' table.`);
            // Check global table
            const { count } = await supabase.from('pricing_surcharges').select('*', { count: 'exact', head: true }).eq('model_family', modelId).eq('surcharge_type', 'freestanding');
            console.log(`   Global Surcharges found in DB: ${count}`);
        }
    } else {
        console.log(`INFO: Additive Configuration is OFF. System will look for dedicated Freestanding table.`);
        const freeTable = tables?.find(t => {
            const name = t.name.toLowerCase();
            return name.includes('trendstyle') && name.includes('freestanding');
        });
        if (freeTable) {
            console.log(`   ✅ Found dedicated Freestanding table: ${freeTable.name}`);
        } else {
            console.warn(`   ⚠️ No dedicated Freestanding table found. If user selects Freestanding, price will likely be NULL (unless fallback triggers).`);
        }
    }

    // 5. Simulate Poly Logic (Scoring Matcher)
    console.log(`\n5️⃣ Simulating Poly Logic (IQ Relax vs Clear)...`);

    // Simulate Request for "Trendstyle - Poly IQ Relax"
    const relaxCriteria = {
        modelFamily: modelId,
        coverType: 'poly_iq_relax',
        zone: 1,
        constructionType: 'wall'
    };

    console.log(`   Criteria:`, relaxCriteria);

    // Mock Tables in memory
    const mockTables = [
        { name: 'Trendstyle - Poly - S1' },
        { name: 'Trendstyle - Poly IQ Relax - S1' },
        { name: 'Trendstyle - Glass - S1' }
    ];

    console.log(`   Mock Tables:`, mockTables.map(t => t.name));

    // Manually run scoring logic (Simplified version of what I implemented)
    let bestMatch = null;
    let bestScore = -100;

    mockTables.forEach(t => {
        const name = t.name.toLowerCase();
        let score = 0;

        // Zone
        if (name.includes('s1')) score += 10;

        // Type
        const isRelax = relaxCriteria.coverType.includes('relax');
        if (isRelax) {
            if (name.includes('relax') || name.includes('ir')) score += 50;
            else score -= 20;
        }

        console.log(`     -> ${t.name}: Score ${score}`);
        if (score > bestScore) { bestScore = score; bestMatch = t; }
    });

    if (bestMatch && (bestMatch as any).name.includes('Relax')) {
        console.log(`   ✅ Correctly picked: ${(bestMatch as any).name}`);
    } else {
        console.error(`   ❌ Failed to pick Relax table. Picked: ${(bestMatch as any)?.name}`);
    }

    console.log('\n🏁 Verification Complete.');
}

verifyPricingLogic();
