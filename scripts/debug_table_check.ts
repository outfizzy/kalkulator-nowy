
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    console.log('Checking entries for Orangestyle+ - Zone 1 - polycarbonate...');

    // 1. Get Table ID
    const { data: tables, error: tableError } = await supabase
        .from('price_tables')
        .select('id')
        .eq('name', 'Orangestyle+ - Zone 1 - polycarbonate')
        .single();

    if (tableError || !tables) {
        console.error('Table not found:', tableError);
        return;
    }

    console.log(`Table ID: ${tables.id}`);

    // 2. Get Entries
    const { data: entries, error: entryError } = await supabase
        .from('price_matrix_entries')
        .select('width_mm, projection_mm, price, structure_price, glass_price')
        .eq('price_table_id', tables.id)
        .order('width_mm', { ascending: true })
        .limit(20);

    if (entryError) {
        console.error('Entry error:', entryError);
    } else {
        console.log(`Found entries (showing ${entries.length}):`);
        console.table(entries);
    }
}

check();
