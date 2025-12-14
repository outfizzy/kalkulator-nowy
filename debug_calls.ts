
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Manually parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
let envContent = '';
try {
    envContent = fs.readFileSync(envPath, 'utf-8');
} catch (e) {
    console.error('Could not read .env.local');
    process.exit(1);
}

const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest) {
        env[key.trim()] = rest.join('=').trim().replace(/"/g, '');
    }
});


console.log('Found env keys:', Object.keys(env));
const supabaseUrl = env['VITE_SUPABASE_URL'] || env['NEXT_PUBLIC_SUPABASE_URL'];

const supabaseKey = env['VITE_SUPABASE_SERVICE_ROLE_KEY'] || env['SUPABASE_SERVICE_ROLE_KEY'] || env['VITE_SUPABASE_ANON_KEY'];

console.log('Connecting to:', supabaseUrl ? 'Found URL' : 'Missing URL');
console.log('Using Key:', supabaseKey ? (supabaseKey.substring(0, 5) + '...') : 'Missing Key');

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase keys in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatestCalls() {
    console.log('\n--- Checking Latest Customer Communications ---');
    const { data: comms, error } = await supabase
        .from('customer_communications')
        .select('id, type, direction, subject, content, created_at, metadata')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching communications:', error);
    } else {
        console.log(JSON.stringify(comms, null, 2));
    }

    console.log('\n--- Checking Latest System Notes ---');
    const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', 'vapi-bot')
        .order('created_at', { ascending: false })
        .limit(3);

    if (notesError) {
        console.error('Error fetching notes:', notesError);
    } else {
        console.log(JSON.stringify(notes, null, 2));
    }
}

checkLatestCalls();
