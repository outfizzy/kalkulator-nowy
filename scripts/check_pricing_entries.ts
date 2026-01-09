
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

import fs from 'fs';

// Load env vars from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
let envConfig: Record<string, string> = {};

if (fs.existsSync(envPath)) {
    envConfig = dotenv.parse(fs.readFileSync(envPath));
}

const supabaseUrl = envConfig.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPricing() {
    console.log('Checking recent pricing_base entries...');

    const { data, error } = await supabase
        .from('pricing_base')
        .select('*')
        .eq('model_family', 'trendstyle')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching pricing:', error);
        return;
    }

    console.log(`Found ${data.length} entries for 'trendstyle'.`);
    if (data.length > 0) {
        console.log('Most recent entry:', JSON.stringify(data[0], null, 2));
    } else {
        // Check total count to see if table is empty
        const { count } = await supabase.from('pricing_base').select('*', { count: 'exact', head: true });
        console.log('Total rows in pricing_base:', count);
    }
}

checkPricing();
