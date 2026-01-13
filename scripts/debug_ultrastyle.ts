
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config(); // Also load .env just in case

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://evc8tu5hx.supabase.co'; // Fallback to provided prod URL logic if known, or just use ENV
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing ENV variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('--- Product Definitions ---');
    const { data: products } = await supabase
        .from('product_definitions')
        .select('id, code, name')
        .or('name.ilike.%ultra%,name.ilike.%top%');
    console.table(products);

    console.log('\n--- Price Tables ---');
    const { data: tables } = await supabase
        .from('price_tables')
        .select('id, name, type, product_definition_id')
        .or('name.ilike.%ultra%,name.ilike.%top%');
    console.table(tables);
}

main();
