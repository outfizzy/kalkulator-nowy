
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
