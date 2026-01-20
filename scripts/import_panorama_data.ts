// Import Panorama Walls Pricing Data to Supabase
// Run with: npx tsx scripts/import_panorama_data.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load .env.local file (Vite uses .env.local for local development)
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fwliufwqmpvujsyrnqei.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
    console.error('VITE_SUPABASE_ANON_KEY is not set in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface PanoramaProduct {
    name: string;
    pricePerMeter: number;
}

const PANORAMA_PRODUCTS: PanoramaProduct[] = [
    { name: 'Aluxe V2 - Panorama AL22 (3-Tor)', pricePerMeter: 241.58 },
    { name: 'Aluxe V2 - Panorama AL22 (5-Tor)', pricePerMeter: 251.05 },
    { name: 'Aluxe V2 - Panorama AL23 (3-Tor)', pricePerMeter: 260.52 },
    { name: 'Aluxe V2 - Panorama AL23 (5-Tor)', pricePerMeter: 265.27 },
    { name: 'Aluxe V2 - Panorama AL23 (7-Tor)', pricePerMeter: 270.00 },
    { name: 'Aluxe V2 - Panorama AL24 (3-Tor)', pricePerMeter: 241.58 },
    { name: 'Aluxe V2 - Panorama AL24 (5-Tor)', pricePerMeter: 246.31 },
    { name: 'Aluxe V2 - Panorama AL25 (3-Tor)', pricePerMeter: 279.48 },
    { name: 'Aluxe V2 - Panorama AL25 (5-Tor)', pricePerMeter: 288.95 },
    { name: 'Aluxe V2 - Panorama AL26 (3-Tor)', pricePerMeter: 260.52 },
    { name: 'Aluxe V2 - Panorama AL26 (5-Tor)', pricePerMeter: 265.27 },
];

async function importPanoramaData() {
    console.log('Starting Panorama data import...');

    // First, get or create the product definition
    const { data: productDef, error: pdError } = await supabase
        .from('product_definitions')
        .select('id')
        .eq('code', 'aluxe_v2_walls')
        .single();

    if (pdError) {
        console.error('Error fetching product definition:', pdError);

        // Try to create it
        const { data: newPd, error: createError } = await supabase
            .from('product_definitions')
            .insert({
                code: 'aluxe_v2_walls',
                name: 'Aluxe V2 - Walls',
                category: 'sliding_wall',
                provider: 'Aluxe',
                description: 'Wall enclosures and doors'
            })
            .select('id')
            .single();

        if (createError) {
            console.error('Failed to create product definition:', createError);
            return;
        }
        console.log('Created product definition:', newPd.id);
    }

    const pdId = productDef?.id;
    console.log('Product definition ID:', pdId);

    for (const product of PANORAMA_PRODUCTS) {
        console.log(`Processing: ${product.name}`);

        // Check if table exists
        let { data: table, error: tableError } = await supabase
            .from('price_tables')
            .select('id')
            .eq('name', product.name)
            .single();

        if (tableError || !table) {
            // Create the price table
            const { data: newTable, error: createTableError } = await supabase
                .from('price_tables')
                .insert({
                    product_definition_id: pdId,
                    name: product.name,
                    type: 'matrix',
                    is_active: true,
                    currency: 'EUR'
                })
                .select('id')
                .single();

            if (createTableError) {
                console.error(`Failed to create table for ${product.name}:`, createTableError);
                continue;
            }
            table = newTable;
            console.log(`  Created price table: ${table.id}`);
        } else {
            console.log(`  Table already exists: ${table.id}`);
        }

        // Check if entry exists
        const { data: existingEntry } = await supabase
            .from('price_matrix_entries')
            .select('id')
            .eq('price_table_id', table.id)
            .eq('width_mm', 850)
            .eq('projection_mm', 0)
            .single();

        if (existingEntry) {
            // Update existing entry
            const { error: updateError } = await supabase
                .from('price_matrix_entries')
                .update({ price: product.pricePerMeter })
                .eq('id', existingEntry.id);

            if (updateError) {
                console.error(`  Failed to update entry:`, updateError);
            } else {
                console.log(`  Updated entry with price: ${product.pricePerMeter}`);
            }
        } else {
            // Insert new entry
            const { error: insertError } = await supabase
                .from('price_matrix_entries')
                .insert({
                    price_table_id: table.id,
                    width_mm: 850,
                    projection_mm: 0,
                    price: product.pricePerMeter
                });

            if (insertError) {
                console.error(`  Failed to insert entry:`, insertError);
            } else {
                console.log(`  Inserted entry with price: ${product.pricePerMeter}`);
            }
        }
    }

    console.log('Import complete!');
}

importPanoramaData().catch(console.error);
