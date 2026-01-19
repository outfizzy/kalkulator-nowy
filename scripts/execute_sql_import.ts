/**
 * Execute batch SQL import via Supabase
 * Reads batch5_import.sql and executes each DO $$ block separately
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Read env
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://whgjsppyuvglhbdgdark.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable required');
    console.error('Run: export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    const sqlPath = path.join(process.cwd(), 'scripts', 'batch5_import.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Split by "DO $$" blocks - each is a separate transaction
    const blocks = sql.split(/(?=DO \$\$)/g).filter(b => b.trim().startsWith('DO $$'));

    console.log(`Found ${blocks.length} blocks to execute`);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i].trim();
        // Extract table name from first DELETE statement for logging
        const tableMatch = block.match(/DELETE FROM price_tables WHERE name = '([^']+)'/);
        const tableName = tableMatch ? tableMatch[1] : `Block ${i + 1}`;

        try {
            // Execute via RPC if available, otherwise direct query
            const { error } = await supabase.rpc('exec_sql', { sql: block }).single();

            if (error) {
                // Fallback: try direct REST API call
                const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ sql: block })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
                }
            }

            success++;
            if (success % 10 === 0) {
                console.log(`Progress: ${success}/${blocks.length} (${tableName})`);
            }
        } catch (err: any) {
            console.error(`Failed: ${tableName}`);
            console.error(err.message);
            failed++;
        }
    }

    console.log(`\nComplete: ${success} succeeded, ${failed} failed`);
}

main().catch(console.error);
