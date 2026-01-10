
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual Env Load
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.error('Failed to load manual env', e);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPricing() {
    console.log('--- Debugging Pricing Data ---');

    // 1. Check Product Definitions (Trendstyle/Skystyle/Trendline)
    const { data: products, error: prodError } = await supabase
        .from('product_definitions')
        .select('id, name, code, configuration, custom_color_surcharge_percentage')
        .ilike('name', '%Trend%'); // Searching for Trendstyle/Trendline

    if (prodError) console.error('Product Error:', prodError);
    else {
        console.log(`Found ${products?.length} products matching "Trend":`);
        products?.forEach(p => {
            console.log(`[${p.code}] ${p.name}`);
            console.log(`  - Config:`, JSON.stringify(p.configuration, null, 2));
        });
    }

    // 2. Check Surcharges for 'poly_iq_relax' or similar
    const { data: surcharges, error: surchError } = await supabase
        .from('pricing_surcharges')
        .select('*')
        .or('surcharge_type.ilike.%relax%,surcharge_type.ilike.%ir%,surcharge_type.ilike.%gold%')
        .limit(10);

    if (surchError) console.error('Surcharge Error:', surchError);
    else {
        console.log(`\nFound ${surcharges?.length} matching surcharges (IR/Relax/Gold):`);
        surcharges?.forEach(s => {
            console.log(`  - ${s.model_family} | ${s.surcharge_type} | ${s.width_mm}mm | ${s.price_eur} EUR`);
        });
    }

    // 3. Check Price Tables config
    const { data: tables, error: tableError } = await supabase
        .from('price_tables')
        .select('id, name, product_definition_id, configuration')
        .order('created_at', { ascending: false })
        .limit(5);

    console.log(`\nRecent Price Tables:`);
    tables?.forEach(t => {
        console.log(`[${t.name}] Config keys: ${Object.keys(t.configuration || {}).join(', ')}`);
    });
}

debugPricing();
