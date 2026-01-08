
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
const envLocalPath = path.resolve(__dirname, '../.env.local');

dotenv.config({ path: envPath });
if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath, override: true });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySystemAttribute() {
    console.log('--- Verifying "system" attribute in price_tables ---');

    // Check a few key models
    const modelsToCheck = ['topstyle', 'orangestyle', 'skystyle', 'ultrastyle'];

    for (const model of modelsToCheck) {
        const { data, error } = await supabase
            .from('price_tables')
            .select('name, attributes')
            .ilike('name', `%${model}%`) // Search by name including the model
            .limit(5);

        if (error) {
            console.error(`Error fetching tables for ${model}:`, error);
            continue;
        }

        if (!data || data.length === 0) {
            console.log(`[${model}] No tables found matching name!`);
            continue;
        }

        console.log(`[${model}] Checking ${data.length} tables:`);
        data.forEach(table => {
            const attrs = table.attributes as any;
            const system = attrs?.system;
            const subtype = attrs?.subtype;
            console.log(`  - Table: "${table.name}" | System: ${system ? `"${system}"` : 'MISSING'} | Subtype: ${subtype}`);
        });
    }
}

verifySystemAttribute();
