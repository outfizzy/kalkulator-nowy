
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.resolve(rootDir, '.env.local') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verify() {
    console.log('--- Spot Check Verification ---');

    const tablesToCheck = [
        'Trendstyle - Zone 1 - glass',
        'Trendstyle - Zone 1 - glass - surcharge_matt',
        'Trendstyle - Zone 1 - glass - surcharge_sun_protection'
    ];

    for (const tableName of tablesToCheck) {
        // 1. Get Table ID
        const { data: table } = await supabase
            .from('price_tables')
            .select('id, name')
            .eq('name', tableName)
            .single();

        if (!table) {
            console.error(`❌ Table NOT found: ${tableName}`);
            continue;
        }

        // 2. Get Price for 3000x2000
        const { data: entry } = await supabase
            .from('price_matrix_entries')
            .select('price, width_mm, projection_mm')
            .eq('price_table_id', table.id)
            .eq('width_mm', 3000)
            .eq('projection_mm', 2000)
            .single();

        if (entry) {
            console.log(`✅ ${tableName}: 3000x2000 -> ${entry.price} (Expected: matches Excel)`);
        } else {
            console.error(`❌ Price NOT found for ${tableName} 3000x2000`);
        }
    }
}

verify().catch(console.error);
