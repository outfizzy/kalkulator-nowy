
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();


const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://whgjs.supabase.co'; // Fallback or read from file
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing ENV vars. Ensure .env exists or vars passed.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('Checking Panorama Data...');

    // 1. Check Addons
    const { data: addons, error: addonError } = await supabase
        .from('pricing_addons')
        .select('*')
        .eq('addon_group', 'panorama');

    if (addonError) console.error('AddonError:', addonError);
    console.log(`Found ${addons?.length || 0} Panorama Addons:`, addons?.map(a => `${a.addon_name} (TableID: ${a.price_table_id})`));

    // 2. Check Tables
    const { data: tables, error: tableError } = await supabase
        .from('price_tables')
        .select('*')
        .eq('type', 'addon_matrix')
        .ilike('name', '%Panorama%');

    if (tableError) console.error('TableError:', tableError);
    console.log(`Found ${tables?.length || 0} Panorama Tables:`, tables?.map(t => `${t.name} (ID: ${t.id})`));

    if (addons?.length > 0 && tables?.length > 0) {
        // Check Matrix Entries for first table
        const tableId = tables[0].id;
        const { count } = await supabase
            .from('price_matrix_entries')
            .select('*', { count: 'exact', head: true })
            .eq('price_table_id', tableId);
        console.log(`Table ${tables[0].name} has ${count} matrix entries.`);
    }
}

checkData();
