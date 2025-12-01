
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

async function checkData() {
    console.log('Checking installations...');
    const { data: installations, error: instError } = await supabase
        .from('installations')
        .select('*');

    if (instError) console.error('Error fetching installations:', instError);
    else console.log(`Found ${installations?.length} installations`);

    console.log('Checking assignments...');
    const { data: assignments, error: assignError } = await supabase
        .from('installation_assignments')
        .select('*');

    if (assignError) console.error('Error fetching assignments:', assignError);
    else console.log(`Found ${assignments?.length} assignments`, assignments);

    console.log('Checking profiles (installers)...');
    const { data: installers, error: profError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('role', 'installer');

    if (profError) console.error('Error fetching installers:', profError);
    else console.log(`Found ${installers?.length} installers`, installers);
}

checkData();
