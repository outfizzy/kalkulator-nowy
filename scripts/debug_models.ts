
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.resolve(rootDir, '.env') });
dotenv.config({ path: path.resolve(rootDir, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugModels() {
    console.log("--- Debugging Product Models in DB ---");

    const { data: products, error } = await supabase
        .from('product_definitions')
        .select('id, name, code, category');

    if (error) {
        console.error("Error fetching products:", error);
        return;
    }

    console.log(`Found ${products.length} products:`);

    for (const p of products) {
        const { count } = await supabase
            .from('price_tables')
            .select('*', { count: 'exact', head: true })
            .eq('product_definition_id', p.id)
            .eq('is_active', true);

        console.log(`- [${p.code}] "${p.name}" (Cat: ${p.category}) -> ${count} active tables`);
    }
}

debugModels();
