
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Env Vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('Fetching latest price table...');
    const { data, error } = await supabase
        .from('price_tables')
        .select('name, rows')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Table Name:', data.name);
    if (data.rows && Array.isArray(data.rows) && data.rows.length > 0) {
        const firstRow = data.rows[0];
        console.log('First Row Keys:', Object.keys(firstRow));
        console.log('First Row Sample:', JSON.stringify(firstRow, null, 2));
    } else {
        console.log('Rows empty or invalid.');
    }
}

inspect();
