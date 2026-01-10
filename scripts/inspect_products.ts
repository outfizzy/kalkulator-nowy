
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Hardcoded for verification as local env might be flaky
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hg7rliblo-tomaszs-projects-358bcf85.supabase.co'; // Fallback if env missing
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'MISSING_KEY';

if (SUPABASE_KEY === 'MISSING_KEY') {
    console.error('❌ Missing SUPABASE_KEY. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in .env or hardcode.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectProducts() {
    console.log('🔍 Inspecting Product Definitions...');

    const { data: products, error } = await supabase
        .from('product_definitions')
        .select('id, name, code, configuration, standard_colors, updated_at')
        .order('name');

    if (error) {
        console.error('❌ Error fetching products:', error);
        return;
    }

    if (!products || products.length === 0) {
        console.log('⚠️ No products found in DB.');
        return;
    }

    console.log(`✅ Found ${products.length} products.`);

    // Check for Duplicates
    const seen = new Map();
    products.forEach(p => {
        const key = (p.name || '').trim().toLowerCase();
        if (seen.has(key)) {
            console.warn(`🚨 DUPLICATE FOUND: "${p.name}" (Code: ${p.code})`);
            console.log('   - Existing:', seen.get(key));
            console.log('   - Duplicate:', p);
        } else {
            seen.set(key, p);
        }

        // Log Configuration Status
        const hasConfig = p.configuration?.freestanding_is_additive ? 'YES' : 'NO';
        const rules = p.configuration?.freestanding_surcharge_rules?.length || 0;
        console.log(`   - [${p.id}] ${p.name} | Additive: ${hasConfig} | Rules: ${rules} | Colors: ${p.standard_colors?.length || 0}`);
    });
}

inspectProducts();
