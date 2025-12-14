import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { awningsData } from '../src/data/awnings';
import trendstyleFull from '../src/data/trendstyle_full.json';
import catalog from '../src/data/catalog.json';

dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
// Better to use service role if possible, but for RLS 'insert' we might need authentication or service role.
// I'll check if SERVICE_ROLE is available or just use ANON and hope policies allow or I'll ask user.
// WAIT: The SQL policies restrict INSERT to admins.
// Attempting to use SERVICE_ROLE_KEY if present, else warn.
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY. Cannot seed prices protected by RLS.');
    console.log('Please ensure .env has these values.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function seed() {
    console.log('🌱 Starting Price Seeding...');

    // 1. Seed Products from Catalog
    console.log('📦 Seeding Products...');
    const productsMap = new Map<string, string>(); // code -> uuid

    for (const model of catalog.models) {
        const code = model.id;
        // Check if exists
        const { data: existing } = await supabase.from('product_definitions').select('id').eq('code', code).single();

        let productId = existing?.id;

        if (!productId) {
            const { data, error } = await supabase.from('product_definitions').insert({
                code: code,
                name: model.name,
                category: code.includes('awning') || code.includes('markise') ? 'awning' : 'roof',
                provider: 'Aluxe', // Default
                description: model.description
            }).select().single();

            if (error) {
                console.error(`Failed to insert product ${code}:`, error);
                continue;
            }
            productId = data.id;
            console.log(`   + Created product: ${model.name}`);
        } else {
            console.log(`   = Product exists: ${model.name}`);
        }
        productsMap.set(code, productId);
    }

    // Manual add for Awnings if not in catalog
    const awningKeys = Object.keys(awningsData);
    for (const key of awningKeys) {
        if (!productsMap.has(key)) {
            const { data: existing } = await supabase.from('product_definitions').select('id').eq('code', key).single();
            let pid = existing?.id;
            if (!pid) {
                const { data, error } = await supabase.from('product_definitions').insert({
                    code: key,
                    name: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),
                    category: 'awning',
                    provider: 'Aluxe'
                }).select().single();
                if (error) console.error(error); else pid = data.id;
            }
            if (pid) productsMap.set(key, pid);
        }
    }

    // 2. Seed Pricing for Trendstyle (JSON)
    // Trendstyle is usually 'trendstyle' code
    if (productsMap.has('trendstyle')) {
        const pid = productsMap.get('trendstyle')!;
        console.log('💰 Seeding Trendstyle Prices...');

        // Create Price Table
        const { data: table, error: tErr } = await supabase.from('price_tables').insert({
            product_definition_id: pid,
            name: 'Cennik Trendstyle 2024 (Import)',
            type: 'matrix'
        }).select().single();

        if (table) {
            const entries = [];
            // Parse trendstyle_full.json which is flat list of products
            // convert to grid? actually trendstyle data is list of specific sizes.
            // My schema supports matrix. I'll store each specific size as a matrix point.

            // Allow casting json to any
            const products = (trendstyleFull as any).products;
            for (const p of products) {
                if (p.model === 'Trendstyle') {
                    entries.push({
                        price_table_id: table.id,
                        width_mm: p.width_mm,
                        projection_mm: p.depth_mm, // using depth as projection
                        price: p.price_eur
                    });
                }
            }

            // Batch insert
            if (entries.length > 0) {
                const { error } = await supabase.from('price_matrix_entries').insert(entries);
                if (error) console.error('Error inserting trendstyle entries:', error);
                else console.log(`   + Inserted ${entries.length} price entries for Trendstyle`);
            }
        }
    }

    // 3. Seed Pricing for Awnings (complex object)
    for (const key of awningKeys) {
        if (!productsMap.has(key)) continue;
        const pid = productsMap.get(key)!;
        const data = awningsData[key];

        console.log(`💰 Seeding ${key} Prices...`);

        // One field table
        if (data.one_field) {
            const { data: table } = await supabase.from('price_tables').insert({
                product_definition_id: pid,
                name: `Cennik ${key} (1 pole)`,
                type: 'matrix'
            }).select().single();

            if (table) {
                const entries = [];
                const pricesObj = data.one_field.prices;
                // pricesObj is { "width": [priceForProj1, priceForProj2...] }
                // projections are in data.one_field.projection_mm

                for (const [widthStr, priceArray] of Object.entries(pricesObj)) {
                    const width = parseInt(widthStr);
                    priceArray.forEach((price, idx) => {
                        const proj = data.one_field!.projection_mm[idx];
                        entries.push({
                            price_table_id: table.id,
                            width_mm: width,
                            projection_mm: proj,
                            price: price
                        });
                    });
                }

                if (entries.length > 0) {
                    await supabase.from('price_matrix_entries').insert(entries);
                    console.log(`   + Inserted ${entries.length} entries for 1-field`);
                }
            }
        }
    }

    console.log('✅ Seeding Completed!');
}

seed().catch(console.error);
