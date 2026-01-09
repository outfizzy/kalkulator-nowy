
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// Ideally use service_role for migrations, but anon might work if RLS allows or we use valid auth.
// Actually, RLS usually blocks anon inserts. I need SERVICE_ROLE or existing valid user token.
// Checking .env for SERVICE_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function run() {
    const sqlPath = process.argv[2];
    if (!sqlPath) {
        console.error('Please provide SQL file path');
        process.exit(1);
    }

    const sqlCtx = fs.readFileSync(sqlPath, 'utf8');

    // We can't run raw SQL via client directly unless we have an RPC or use the rest interface carefully if supported.
    // Standard supabase-js doesn't have .sql(). 
    // However, we can use the `pg` library if we had connection string, or rely on a known RPC `exec_sql`.

    // Let's check if we have `exec_sql` rpc.
    const { error } = await supabase.rpc('exec_sql', { sql_query: sqlCtx });

    if (error) {
        console.error('Error executing SQL:', error);
        // Fallback: If exec_sql is missing, we might be stuck. 
        // But usually I have access to psql or similar in these environments? 
        // Wait, the USER's instructions say "Use run_command". I don't have psql installed typically?
        // I see previous logs used `supabase/migrations`.
        // Let's try to assume `exec_sql` exists from previous sessions or KIs.
        // If it fails, I'll have to ask user to run or try another way.
        process.exit(1);
    } else {
        console.log('Migration applied successfully.');
    }
}

run();
