
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const run = async () => {
    console.log("--- Clearing Stale Awning Data ---");

    // 1. Find Products to delete
    const { data: products } = await supabase
        .from('product_definitions')
        .select('id, name')
        .or('name.ilike.%markise%,name.ilike.%zip%,name.ilike.%screen%');

    if (products && products.length > 0) {
        const ids = products.map(p => p.id);
        console.log(`Deleting ${ids.length} products:`, products.map(p => p.name));

        // Delete Tables first (Cascade should handle it but safer to be explicit if no cascade)
        const { error: tableErr } = await supabase.from('price_tables').delete().in('product_definition_id', ids);
        if (tableErr) console.error("Table delete error:", tableErr);

        const { error: prodErr } = await supabase.from('product_definitions').delete().in('id', ids);
        if (prodErr) console.error("Product delete error:", prodErr);
        else console.log("Products deleted.");
    } else {
        console.log("No stale products found.");
    }

    // Also check for orphaned 'markisen' tables
    const { data: tables } = await supabase
        .from('price_tables')
        .select('id, name')
        .name.ilike('%markise%');

    if (tables && tables.length > 0) {
        console.log(`Found ${tables.length} potentially orphaned tables.`);
        // Don't delete yet blindly, just log
    }
};

run();
