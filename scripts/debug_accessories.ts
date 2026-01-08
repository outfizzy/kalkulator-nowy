
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDebug() {
    console.log("--- DEBUG ACCESSORIES DATA ---\n");

    // 1. Search for Awnings (Markizy)
    console.log("Searching for 'markise' or 'screen' tables...");
    const { data: awnings } = await supabase
        .from('price_tables')
        .select('id, name, attributes, variant_config')
        .or('name.ilike.%markise%,name.ilike.%screen%,name.ilike.%zip%')
        .limit(20);

    if (awnings && awnings.length > 0) {
        console.log(`Found ${awnings.length} AWNING tables (sample):`);
        awnings.forEach(t => console.log(`- ${t.name}`));
    } else {
        console.log("❌ No Awning tables found.");
    }

    // 2. Search for Walls (Ściany/Side Elements)
    console.log("\nSearching for 'wall', 'wand', 'side' tables...");
    const { data: walls } = await supabase
        .from('price_tables')
        .select('id, name, attributes')
        .or('name.ilike.%wand%,name.ilike.%wall%,name.ilike.%side%,name.ilike.%keil%')
        .limit(20);

    if (walls && walls.length > 0) {
        console.log(`Found ${walls.length} WALL tables (sample):`);
        walls.forEach(t => console.log(`- ${t.name}`));
    } else {
        console.log("❌ No Wall tables found.");
    }

    // 3. Search for Lighting (LED) - Broader Search
    console.log("\nSearching for 'led', 'light', 'beleuchtung', 'set', 'dimm' accounts...");
    const { data: leds } = await supabase
        .from('price_tables')
        .select('id, name, attributes')
        .or('name.ilike.%led%,name.ilike.%licht%,name.ilike.%beleuc%,name.ilike.%set%,name.ilike.%dimm%')
        .limit(20);

    if (leds && leds.length > 0) {
        console.log(`Found ${leds.length} LED tables (sample):`);
        leds.forEach(t => console.log(`- ${t.name}`));
    } else {
        console.log("❌ No LED tables found (tried broad search).");
    }

    // 4. Inspect Awning Structure
    if (awnings && awnings.length > 0) {
        console.log("\n--- INSPECTING AWNING STRUCTURE ---");
        const { data: firstAwning } = await supabase
            .from('price_tables')
            .select('*')
            .eq('id', awnings[0].id)
            .single();

        if (firstAwning) {
            console.log(`Table: ${firstAwning.name} (ID: ${firstAwning.id})`);
            console.log(`Product Definition ID: ${(firstAwning as any).product_definition_id}`);

            // Fetch product name
            const { data: pDef } = await supabase
                .from('product_definitions')
                .select('name, code')
                .eq('id', (firstAwning as any).product_definition_id)
                .single();
            console.log(`Linked Product: ${pDef?.name} (${pDef?.code})`);

            console.log(`Attributes: ${JSON.stringify(firstAwning.attributes)}`);

            // Fetch Matrix Entries
            const { data: entries, error } = await supabase
                .from('price_matrix_entries')
                .select('*')
                .eq('price_table_id', firstAwning.id)
                .limit(5);

            if (entries) {
                console.log(`Found ${entries.length} entries (Sample):`);
                entries.forEach(e => console.log(`- ${e.width_mm}x${e.projection_mm}: ${e.price}`));
            } else {
                console.log("No entries found or error:", error);
            }
        }
    }
}

runDebug();
