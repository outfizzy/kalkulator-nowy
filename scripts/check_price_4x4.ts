
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // or SERVICE_ROLE if available but anon should work with public RLS or if I have service key locally

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyPrice() {
    console.log('Verifying price for 4000x4000 Polycarbonate...');

    // 1. Find Price Tables for Trendline/Topline + Poly
    const { data: tables, error: tableError } = await supabase
        .from('price_tables')
        .select('id, name, attributes')
        .ilike('name', '%trend%') // Start with Trendline as it's the most common "standard"
        .contains('attributes', { roof_type: 'polycarbonate' }); // Filter by JSON attribute if possible, or just fetch and filter

    if (tableError) {
        console.error('Error fetching tables:', tableError);
        return;
    }

    // Filter client side to be sure about attributes if .contains didn't work perfectly on all flavors
    const relevantTables = tables.filter(t =>
        t.name.toLowerCase().includes('trend') &&
        (t.name.toLowerCase().includes('poly') || t.attributes?.roof_type === 'polycarbonate')
    );

    console.log(`Found ${relevantTables.length} relevant tables for Trendline Poly:`);

    for (const table of relevantTables) {
        console.log(`Checking Table: ${table.name} (ID: ${table.id})`);

        // Check Dimension List Entries (most likely for Main Product) or Matrix
        // Trendline usually uses dimension lists (width/projection)

        // Try Dimension List first
        const { data: dimEntries, error: dimError } = await supabase
            .from('dimension_list_entries')
            .select('*')
            .eq('price_table_id', table.id)
            .gte('width_mm', 3900)
            .lte('width_mm', 4100) // loose match
            .gte('projection_mm', 3900)
            .lte('projection_mm', 4100);

        if (dimEntries && dimEntries.length > 0) {
            console.log('  Found Dimension List Entries:');
            dimEntries.forEach(e => {
                console.log(`    ${e.width_mm}x${e.projection_mm} = ${e.price} EUR`);
            });
        }

        // Try Matrix (less likely for main roof but possible)
        const { data: matrixEntries, error: matrixError } = await supabase
            .from('price_matrix_entries')
            .select('*')
            .eq('price_table_id', table.id)
            .gte('width_mm', 3900)
            .lte('width_mm', 4100)
            .gte('height_mm', 3900) // Projection is often mapped to height/projection column depending on schema
            .lte('height_mm', 4100);

        // Check projection columns? matrix usually has one dimension in rows, one in cols?
        // Actually the matrix schema is typically width_mm + height_mm + price (normalized).

        if (matrixEntries && matrixEntries.length > 0) {
            console.log('  Found Matrix Entries:');
            matrixEntries.forEach(e => {
                console.log(`    ${e.width_mm}x${e.height_mm} = ${e.price} EUR`);
            });
        }
    }
}

verifyPrice();
