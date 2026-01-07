
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.resolve(rootDir, '.env') });
dotenv.config({ path: path.resolve(rootDir, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

console.log("Debug - Supabase Env Keys:", Object.keys(process.env).filter(k => k.includes('SUPABASE')));

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials:");
    console.error("- URL:", supabaseUrl ? "OK" : "MISSING");
    console.error("- KEY:", supabaseServiceKey ? "OK" : "MISSING");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyTables() {
    console.log("Fetching active price tables...");
    const { data: tables, error } = await supabase
        .from('price_tables')
        .select('*, product:product_definitions(name, code)')
        .eq('is_active', true);

    if (error) {
        console.error("Error fetching tables:", error);
        return;
    }

    console.log(`Found ${tables.length} active tables.`);

    // Verify Categories
    const slidingDoorTables = tables.filter(t => t.name.toLowerCase().includes('schiebetür'));
    const sideTables = tables.filter(t => t.name.toLowerCase().includes('seitenwand'));
    const frontTables = tables.filter(t => t.name.toLowerCase().includes('frontwand'));
    const keilTables = tables.filter(t => t.name.toLowerCase().includes('keilfenster'));

    console.log(`\n--- Sliding Doors (Schiebetür) ---`);
    console.log(`Count: ${slidingDoorTables.length}`);
    slidingDoorTables.forEach(t => console.log(` - [${t.id}] ${t.name} (Subtype: ${t.attributes?.subtype})`));

    console.log(`\n--- Side Walls (Seitenwand) ---`);
    console.log(`Count: ${sideTables.length}`);
    sideTables.forEach(t => console.log(` - [${t.id}] ${t.name} (Subtype: ${t.attributes?.subtype})`));

    console.log(`\n--- Front Walls (Frontwand) ---`);
    console.log(`Count: ${frontTables.length}`);
    frontTables.forEach(t => console.log(` - [${t.id}] ${t.name} (Subtype: ${t.attributes?.subtype})`));

    console.log(`\n--- Keilfenster ---`);
    console.log(`Count: ${keilTables.length}`);
    keilTables.forEach(t => console.log(` - [${t.id}] ${t.name} (Subtype: ${t.attributes?.subtype})`));

    // Check for any entries in one of them
    if (slidingDoorTables.length > 0) {
        const { data: entries } = await supabase.from('price_matrix_entries').select('*').eq('price_table_id', slidingDoorTables[0].id).limit(2);
        console.log(`\nSample Entries for ${slidingDoorTables[0].name}:`, entries);
    }
}

verifyTables();
