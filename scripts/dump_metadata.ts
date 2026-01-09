
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

const __dirname = path.resolve();
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function dumpMetadata() {
    const { data: product } = await supabase.from('product_definitions').select('id').eq('code', 'trendstyle').single();
    if (!product) return;

    const { data: tables } = await supabase
        .from('price_tables')
        .select('id, name, attributes, variant_config, is_active')
        .eq('product_definition_id', product.id);

    console.log(JSON.stringify(tables, null, 2));
}

dumpMetadata();
