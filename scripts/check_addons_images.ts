
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

async function checkAddonsAndImages() {
    console.log('--- Checking for Addons (non-matrix tables) & Images ---');

    // 1. Check Product Images
    const { data: products, error: prodError } = await supabase
        .from('product_definitions')
        .select('code, name, image_url')
        .not('image_url', 'is', null);

    if (prodError) console.error('Error fetching products:', prodError);

    console.log(`\nFound ${products?.length || 0} products with images:`);
    products?.forEach(p => console.log(` - ${p.name} (${p.code}): ${p.image_url}`));

    // 2. Check Price Table Images
    const { data: tables, error: tableError } = await supabase
        .from('price_tables')
        .select('name, attributes, type')
        .eq('is_active', true);

    if (tableError) console.error('Error fetching tables:', tableError);

    if (tables) {
        const listTables = tables.filter(t => t.type === 'component_list' || t.type === 'simple');
        console.log(`\nFound ${listTables.length} 'Component List' / 'Simple' Tables (Addons):`);
        listTables.slice(0, 10).forEach(t => console.log(` - ${t.name}`));
        if (listTables.length > 10) console.log(`   ... and ${listTables.length - 10} more.`);

        // Check images in table attributes
        const tablesWithImages = tables.filter(t => (t.attributes as any)?.image_url || (t.attributes as any)?.cover_image);
        console.log(`\nFound ${tablesWithImages.length} tables with images in attributes.`);
    }

    // 3. Check for specific "Materialien" tables that might be addons
    const { data: matTables } = await supabase
        .from('price_tables')
        .select('name')
        .ilike('name', '%materialien%');

    console.log(`\nFound ${matTables?.length || 0} tables with 'Materialien' in name.`);
}

checkAddonsAndImages();
