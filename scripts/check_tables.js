
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    const { data, error } = await supabase
        .from('price_tables')
        .select('name')
        .like('name', 'Aluxe V2%') // Only Aluxe V2 tables
        .order('name');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('--- FOUND TABLES ---');
    data.forEach(t => console.log(t.name));
    console.log('--------------------');
}

listTables();
