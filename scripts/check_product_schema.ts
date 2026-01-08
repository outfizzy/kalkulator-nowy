
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    const { data, error } = await supabase
        .from('product_definitions')
        .select('*')
        .limit(1);

    if (error) {
        console.error(error);
        return;
    }
    console.log(data);
}

run();
