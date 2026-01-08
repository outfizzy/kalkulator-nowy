import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

console.log('ALL Env Keys:', Object.keys(process.env).sort());

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY; // Fallback to service role for now to check data

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing URL or Key');
    process.exit(1);
}

console.log(`Using Key: ${supabaseKey.substring(0, 10)}...`);
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Checking product categories...");
    const { data, error } = await supabase
        .from('product_definitions')
        .select('id, code, name, category, created_at')
        .order('category')
        .order('name');

    if (error) {
        console.error("Fetch Failed:", error);
    } else {
        console.log(`Found ${data.length} products.`);
        data.forEach(p => console.log(`[${p.category}] ${p.name} (${p.code})`));
    }
}

run();
