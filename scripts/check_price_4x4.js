
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = 'https://whgjsppyuvglhbdgdark.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZ2pzcHB5dXZnbGhiZGdkYXJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE4MDgzNiwiZXhwIjoyMDc5NzU2ODM2fQ._uAboPtqv0CAm8kiGXER--0XuOXaBZEvXazXbZIxb2g';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyPrice() {
    console.log('Checking Trendstyle - Zone 1 - polycarbonate details...');
    const { data: targetTable } = await supabase.from('price_tables').select('id').eq('name', 'Trendstyle - Zone 1 - polycarbonate').single();

    if (!targetTable) {
        console.error('Target table not found');
        return;
    }

    const { data: entries } = await supabase
        .from('dimension_list_entries')
        .select('*')
        .eq('price_table_id', targetTable.id)
        .limit(20);

    console.log(`Table ${targetTable.id} has ${entries?.length} entries (sample):`);
    entries?.forEach(e => console.log(`${e.width_mm}x${e.projection_mm} = ${e.price}`));
}

verifyPrice();
