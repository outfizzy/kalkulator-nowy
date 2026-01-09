
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';


// Load .env.local
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const envPath = path.resolve(__dirname, '../.env.local');
console.log('Loading env from:', envPath);
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing credentials. Check .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);


async function run() {
    console.log('--- Auditing Snow Zone Coverage ---');

    // 1. Get All Products
    const { data: products } = await supabase.from('product_definitions').select('id, code, name');

    if (!products) return;

    for (const p of products) {
        // 2. Count Tables per Zone
        const { data: tables } = await supabase.from('price_tables')
            .select('attributes')
            .eq('product_definition_id', p.id)
            .eq('is_active', true);

        const zoneCounts = { '1': 0, '2': 0, '3': 0, 'other': 0 };
        const subtypes = new Set();

        tables?.forEach(t => {
            const z = t.attributes?.snow_zone ? String(t.attributes.snow_zone) : 'other';
            if (zoneCounts[z] !== undefined) zoneCounts[z]++;
            else zoneCounts.other++;

            if (t.attributes?.subtype) subtypes.add(t.attributes.subtype);
        });

        const hasZone2 = zoneCounts['2'] > 0;
        const hasZone3 = zoneCounts['3'] > 0;

        console.log(`[${p.code}] ${p.name}`);
        console.log(`   Zones: Z1(${zoneCounts['1']})  Z2(${zoneCounts['2']})  Z3(${zoneCounts['3']})`);
        console.log(`   Subtypes: ${Array.from(subtypes).join(', ')}`);

        if (!hasZone2 && !p.code.includes('carport')) { // Carports might be simple
            console.warn(`   ⚠️  WARNING: No Zone 2 tables for ${p.code}`);
        }
    }
}

run().catch(console.error);
