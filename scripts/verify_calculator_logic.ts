
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';



// Load .env.local
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const envPath = path.resolve(__dirname, '../.env.local');
console.log('Loading env from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('Error loading .env.local', result.error);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('Supabase Key:', supabaseKey ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing credentials. Check .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);


async function run() {
    console.log('--- Verifying Trendstyle Data ---');

    // 1. Get Product ID
    const { data: product } = await supabase.from('product_definitions').select('id, code').eq('code', 'trendstyle').single();
    if (!product) { console.error('Product Trendstyle not found'); return; }

    console.log(`Product ID: ${product.id} Code: ${product.code}`);

    // 2. List All Tables
    const { data: tables } = await supabase.from('price_tables')
        .select('*')
        .eq('product_definition_id', product.id)
        .eq('is_active', true);

    console.log(`Found ${tables?.length} tables.`);
    tables?.forEach(t => console.log(` - [${t.attributes?.snow_zone || '?'}] ${t.name} (Subtype: ${t.attributes?.subtype})`));

    // 3. Simulate Logic: Input 3100x2600, Zone 2, Polycarbonate
    console.log('\n--- Simulation: 3100x2600, Zone 2, Poly ---');

    // Find Table
    const table = tables?.find(t =>
        String(t.attributes?.snow_zone) === '2' &&
        (t.attributes?.subtype === 'polycarbonate' || t.attributes?.subtype === 'standard') &&
        !t.name.includes('surcharge')
    );

    if (!table) {
        console.error('❌ Table for Zone 2 Polycarbonate NOT FOUND.');
    } else {
        console.log(`✅ Using Table: ${table.name}`);

        // Find Entry
        // Logic: Min(Area) where w >= 3100 and p >= 2600
        const { data: entries } = await supabase.from('price_matrix_entries')
            .select('*')
            .eq('price_table_id', table.id)
            .gte('width_mm', 3100)
            .gte('projection_mm', 2600);

        if (!entries || entries.length === 0) {
            console.error('❌ No entries found for >= 3100x2600');
        } else {
            console.log(`Found ${entries.length} candidate entries.`);
            // Client-side sort
            entries.sort((a, b) => (a.width_mm * a.projection_mm) - (b.width_mm * b.projection_mm));
            const best = entries[0];
            console.log(`✅ Selected Entry: ${best.width_mm} x ${best.projection_mm} = ${best.price} EUR`);
        }
    }
}

run().catch(console.error);
