
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

// --- Pricing Logic Simulation (Copied from PricingService to be sure) ---

async function getPriceMatrix(productCode: string, contextAttributes: Record<string, string>) {
    console.log(`\n🔍 Lookup: Model="${productCode}", Attrs=${JSON.stringify(contextAttributes)}`);

    // 1. Get Product
    const { data: product } = await supabase
        .from('product_definitions')
        .select('id')
        .eq('code', productCode)
        .single();

    if (!product) { console.error('Product not found'); return []; }

    // 2. Get Tables
    const { data: tables } = await supabase
        .from('price_tables')
        .select('*')
        .eq('product_definition_id', product.id)
        .eq('is_active', true);

    if (!tables || tables.length === 0) { console.error('No active tables'); return []; }

    console.log(`   Found ${tables.length} candidate tables.`);
    tables.forEach(t => console.log(`   - Table: "${t.name}" | System: ${(t.attributes as any)?.system} | Subtype: ${(t.attributes as any)?.subtype}`));

    // 3. Match Logic (Simulate Service)
    const bestMatch = tables.find(table => {
        const vc = table.variant_config as any || {};
        const attrs = table.attributes as any || {};

        // Subtype Check
        if (contextAttributes.subtype) {
            // Check variant_config
            if (vc.subtype && !vc.subtype.toLowerCase().includes(contextAttributes.subtype.toLowerCase())) return false;
            // Check direct attribute if NOT in variant_config (fallback)
            if (!vc.subtype && attrs.subtype && !attrs.subtype.toLowerCase().includes(contextAttributes.subtype.toLowerCase())) return false;
        }

        // Snow Zone Check
        if (contextAttributes.snow_zone) {
            if (vc.snowZone && String(vc.snowZone) !== String(contextAttributes.snow_zone)) return false;
            // IMPORTANT: Check attribute mapping if not in variant_config
            if (!vc.snowZone && attrs.snow_zone && String(attrs.snow_zone) !== String(contextAttributes.snow_zone)) return false;
        }

        // System Check (Implicit)
        if (attrs.system && attrs.system !== productCode) return false;

        return true;
    });

    if (!bestMatch) {
        console.error('❌ NO MATCHING TABLE FOUND!');
        return [];
    }
    console.log(`✅ Selected Table: "${bestMatch.name}" (ID: ${bestMatch.id})`);

    // 4. Fetch Entries
    const { data: entries } = await supabase
        .from('price_matrix_entries')
        .select('*')
        .eq('price_table_id', bestMatch.id);

    console.log(`   Loaded ${entries?.length || 0} matrix entries.`);
    return entries || [];
}

async function calculateMatrixPrice(matrix: any[], width: number, projection: number) {
    // Find next size up
    const validWidths = [...new Set(matrix.map(e => e.width_mm))].sort((a, b) => a - b);
    const validProjections = [...new Set(matrix.map(e => e.projection_mm))].sort((a, b) => a - b);

    const matchWidth = validWidths.find(w => w >= width) || validWidths[validWidths.length - 1];
    const matchProjection = validProjections.find(p => p >= projection) || validProjections[validProjections.length - 1];

    console.log(`   Calc: Input ${width}x${projection} -> Match ${matchWidth}x${matchProjection}`);

    const entry = matrix.find(e => e.width_mm === matchWidth && e.projection_mm === matchProjection);
    return entry ? entry.price : 0;
}

async function runTest() {
    // TEST CASE 1: Topstyle, Standard Dimensions, Poly
    console.log('--- Test 1: Topstyle 4000x3000, Poly, Zone 1 ---');
    let matrix = await getPriceMatrix('topstyle', { subtype: 'polycarbonate', snow_zone: '1', roof_type: 'polycarbonate' });
    let price = await calculateMatrixPrice(matrix, 4000, 3000);
    console.log(`💰 Price: ${price} EUR`);

    // TEST CASE 2: Topstyle, Different Dimensions
    console.log('\n--- Test 2: Topstyle 5000x3500, Poly, Zone 1 ---');
    price = await calculateMatrixPrice(matrix, 5000, 3500);
    console.log(`💰 Price: ${price} EUR`);

    // TEST CASE 3: Topstyle, Glass
    console.log('\n--- Test 3: Topstyle 4000x3000, Glass, Zone 1 ---');
    matrix = await getPriceMatrix('topstyle', { subtype: 'glass', snow_zone: '1', roof_type: 'glass' });
    price = await calculateMatrixPrice(matrix, 4000, 3000);
    console.log(`💰 Price: ${price} EUR`);

    // TEST CASE 4: Orangestyle, Poly
    console.log('\n--- Test 4: Orangestyle 4000x3000, Poly ---');
    matrix = await getPriceMatrix('orangestyle', { subtype: 'polycarbonate', snow_zone: '1', roof_type: 'polycarbonate' });
    price = await calculateMatrixPrice(matrix, 4000, 3000);
    console.log(`💰 Price: ${price} EUR`);
}

runTest();
