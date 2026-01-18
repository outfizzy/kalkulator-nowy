
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Check for .env.local first, then .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envDefaultPath = path.resolve(process.cwd(), '.env');
const envPath = fs.existsSync(envLocalPath) ? envLocalPath : envDefaultPath;

console.log(`Loading env from: ${envPath}`);
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Manual merge into process.env so createClient can use it if needed, or pass directly
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials (VITE_SUPABASE_URL or keys)');
    console.log('Available Keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const filePath = process.argv[2];
if (!filePath) {
    console.error('Please provide migration file path');
    process.exit(1);
}

const sql = fs.readFileSync(filePath, 'utf8');

async function run() {
    console.log(`Applying migration: ${filePath}`);
    const { error } = await supabase.rpc('exec_sql', { sql });

    // Fallback if exec_sql RPC doesn't exist (it usually doesn't by default unless added)
    // Actually, Supabase JS client doesn't support raw SQL query execution without an RPC.
    // If exec_sql is missing, this will fail.
    // Let's assume user has tool for SQL or we check if we can add it.
    // Wait, I can't add RPC if I can't execute SQL.
    // But I am an agent. I might not be able to run migrations this way if RPC missing.

    if (error) {
        console.error('RPC exec_sql Failed:', error);
        console.log('Attempting alternative: REST API raw query is not supported.');
        // If this fails, I'll need to ask user or use a different method (e.g. pg driver).
        // But I don't have pg credentials, only supabase URL/Key.
        // Assuming exec_sql exists or I'll see error.
    } else {
        console.log('Migration applied successfully.');
    }
}

run();
