
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env vars from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking installations table columns...');
    // We can't query information_schema directly with supabase-js usually unless we have rpc or direct sql, 
    // but we can try to insert a dummy row or select and see what returns, knowing supabase-js types might be loose.
    // Better way: use RPC if available, or just inspect structure via a failed insert if permissions allow, but that's messy.
    // We will just try to select `customer_id` and see if it errors.

    const { data, error } = await supabase
        .from('installations')
        .select('id, customer_id')
        .limit(1);

    if (error) {
        console.error('Error selecting customer_id from installations:', error.message);
    } else {
        console.log('Successfully selected customer_id from installations. Column exists.');
    }
}

checkSchema();
