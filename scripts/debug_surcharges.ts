
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDebug() {
    console.log("--- Starting Surcharge Debug ---\n");

    const productCode = 'trendstyle'; // Target product
    console.log(`fetching product: ${productCode}...`);

    const { data: product } = await supabase
        .from('product_definitions')
        .select('id, name')
        .eq('code', productCode)
        .single();

    if (!product) {
        console.error("Product not found");
        return;
    }
    console.log(`Product ID: ${product.id} (${product.name})`);

    // Fetch all tables
    const { data: tables } = await supabase
        .from('price_tables')
        .select('*')
        .eq('product_definition_id', product.id)
        .eq('is_active', true);

    if (!tables) {
        console.log("No tables found.");
        return;
    }

    console.log(`\nFound ${tables.length} total tables.`);

    // Filter for surcharges
    const surchargeTables = tables.filter(t => t.name.toLowerCase().includes('surcharge'));

    console.log(`Found ${surchargeTables.length} SURCHARGE tables:`);
    surchargeTables.forEach(t => {
        console.log(`- [${t.name}] (Attributes: ${JSON.stringify(t.attributes)}) (VariantConfig: ${JSON.stringify(t.variant_config)})`);
    });

    console.log("\n--- Simulating Availability Check ---");

    const checkAvailability = (context: Record<string, string>, label: string) => {
        console.log(`\nContext: ${label} (${JSON.stringify(context)})`);

        const available = surchargeTables.filter(t => {
            const vc = t.variant_config;
            if (!vc) return true; // No config = always available?

            // Strict checking against PricingService logic
            if (vc.roofType && vc.roofType !== context.roofType) return false;
            if (vc.snowZone && context.snowZone && vc.snowZone !== context.snowZone) return false;

            // Note: PricingService also checks Subtype but let's stick to basics first
            return true;
        });

        if (available.length === 0) {
            console.log("  -> No surcharges available.");
        } else {
            available.forEach(t => console.log(`  -> [AVAILABLE] ${t.name}`));
        }
    };

    // Scenario 1: Polycarbonate, Zone 1
    checkAvailability({ roofType: 'polycarbonate', snowZone: '1' }, "Poly / Zone 1");

    // Scenario 2: Glass, Zone 1
    checkAvailability({ roofType: 'glass', snowZone: '1' }, "Glass / Zone 1");

    // Scenario 3: Glass, Zone 3
    checkAvailability({ roofType: 'glass', snowZone: '3' }, "Glass / Zone 3");

    console.log("\n--- Simulating CALCULATE LOOKUP (Bug Check) ---");
    // Simulate what calculateOfferPrice currently does
    // product.selectedSurcharges = ['ir_gold']
    const surchargeKey = 'ir_gold';
    const context = { roofType: 'polycarbonate', snowZone: '3' };

    console.log(`Context: ${JSON.stringify(context)}, Key: ${surchargeKey}`);

    const allCandidates = surchargeTables.filter(t => t.name.includes(`surcharge_${surchargeKey}`));
    console.log(`\nCandidates for '${surchargeKey}':`);
    allCandidates.forEach(c => {
        console.log(`- [${c.name}] VC: ${JSON.stringify(c.variant_config)} | ATTR: ${JSON.stringify(c.attributes)}`);
    });

    // FIXED LOGIC: Strict Context Matching
    const strictMatch = surchargeTables.find(t => {
        const nameMatch = t.name.includes(`surcharge_${surchargeKey}`);
        if (!nameMatch) return false;

        const attrs = t.attributes || {};
        const vc = t.variant_config || {};

        // Check Roof Type (Subtype)
        const tableSubtype = attrs.subtype || vc.roofType;
        if (tableSubtype && tableSubtype !== context.roofType) return false;

        // Check Snow Zone
        const tableZone = attrs.snow_zone || vc.snowZone;
        if (tableZone && context.snowZone && String(tableZone) !== String(context.snowZone)) return false;

        return true;
    });

    if (strictMatch) {
        console.log(`[FIXED LOGIC] Selected: ${strictMatch.name}`);
        console.log(`            -> Config: ${JSON.stringify(strictMatch.variant_config)} | Attr: ${JSON.stringify(strictMatch.attributes)}`);

        const attrs = strictMatch.attributes || {};
        if (String(attrs.snow_zone) === String(context.snowZone)) {
            console.log("  ✅ SUCCESS: Correct table selected.");
        } else {
            console.error("  ❌ FAILURE: Still selected wrong zone.");
        }
    } else {
        console.log("No table found with strict match.");
    }
}

runDebug();
