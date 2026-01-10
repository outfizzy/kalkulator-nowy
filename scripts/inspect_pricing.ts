
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load env 
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = 'https://whgjsppyuvglhbdgdark.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZ2pzcHB5dXZnbGhiZGdkYXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODA4MzYsImV4cCI6MjA3OTc1NjgzNn0.JIYamVyQfNuuLPpx2-VJe1PoWNb23gXeTyNRYGwRTw4';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('--- INSPECTING PRICING DATA ---');

    // 1. Product Definitions
    const { data: products, error: prodError } = await supabase.from('product_definitions').select('id, name, code');
    if (prodError) console.error('Error fetching definitions:', prodError);
    console.log('\n[Product Definitions] (Formal Products):');
    products?.forEach(p => console.log(` - ${p.name} (${p.code})`));

    // 2. Pricing Base
    const { data: base, error: baseError } = await supabase.from('pricing_base').select('model_family').limit(50000);
    if (baseError) console.error('Error fetching base:', baseError);
    const uniqueBase = Array.from(new Set((base || []).map(b => b.model_family))).filter(x => x).sort();
    console.log('\n[Pricing Base] (Legacy Cennik):');
    uniqueBase.forEach(m => console.log(` - ${m}`));

    // 3. Price Tables
    const { data: tables, error: tableError } = await supabase.from('price_tables').select('name');
    if (tableError) console.error('Error fetching tables:', tableError);
    console.log('\n[Price Tables] (New Cennik):');
    tables?.forEach(t => console.log(` - ${t.name}`));

    // 4. Simulated Logic
    const activeModelNames = new Set<string>();
    uniqueBase.forEach(m => activeModelNames.add(m.trim().toLowerCase()));
    tables?.forEach(t => {
        const modelName = t.name.split(' - ')[0].trim().toLowerCase();
        if (modelName) activeModelNames.add(modelName);
    });

    console.log('\n--- CALCULATOR LOGIC (PREVIEW) ---');
    console.log('These products WOULD be shown:');
    Array.from(activeModelNames).sort().forEach(m => console.log(` - ${m}`));
}

inspect();
