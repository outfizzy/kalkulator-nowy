import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Supabase credentials (using anon key - RLS must allow inserts)
const SUPABASE_URL = 'https://eqjnqsswpfzgppjdtqjz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxam5xc3N3cGZ6Z3BwamR0cWp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI4ODYxNzUsImV4cCI6MjA0ODQ2MjE3NX0.rDXpdIVdKLSVIh4-6CLqBqZqOFPzVTyS6FmDCunqZyA';

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false }
});


const FILE_PATH = path.resolve(rootDir, 'imports', 'Aluxe Preisliste UPE 2026_DE.xlsx');

const run = async () => {
    console.log('=== Importing Zonweringspaneel (Sun Shading Panels) ===');

    if (!fs.existsSync(FILE_PATH)) {
        throw new Error('Excel file not found: ' + FILE_PATH);
    }

    const workbook = XLSX.readFile(FILE_PATH);
    const sheet = workbook.Sheets['Zonweringspaneel'];

    if (!sheet) {
        throw new Error('Sheet "Zonweringspaneel" not found');
    }

    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

    // 1. Create or get product definition
    const productName = 'Sonnenschutzpaneel';
    const productCode = 'sonnenschutzpaneel';

    let { data: existingProduct } = await supabase
        .from('product_definitions')
        .select('id')
        .eq('code', productCode)
        .single();

    let productId: string;

    if (existingProduct) {
        productId = existingProduct.id;
        console.log(`Found existing product: ${productName} (${productId})`);
    } else {
        const { data: newProduct, error } = await supabase
            .from('product_definitions')
            .insert({
                name: productName,
                code: productCode,
                category: 'accessory',
                provider: 'Aluxe',
                description: 'Sonnenschutzpaneel für Panorama-Systeme (AL22-AL26). Paneelbreite: 600-1100mm auf Maß.'
            })
            .select('id')
            .single();

        if (error) throw new Error(`Failed to create product: ${error.message}`);
        productId = newProduct.id;
        console.log(`Created product: ${productName} (${productId})`);
    }

    // 2. Create price table
    const tableName = 'Aluxe V2 - Sonnenschutzpaneel';

    let { data: existingTable } = await supabase
        .from('price_tables')
        .select('id')
        .eq('name', tableName)
        .single();

    let tableId: string;

    if (existingTable) {
        tableId = existingTable.id;
        // Clear existing entries
        await supabase.from('price_matrix_entries').delete().eq('price_table_id', tableId);
        console.log(`Found existing table, cleared entries: ${tableName}`);
    } else {
        const { data: newTable, error } = await supabase
            .from('price_tables')
            .insert({
                name: tableName,
                product_definition_id: productId,
                is_active: true,
                attributes: {
                    type: 'height_list',
                    panel_width_min: 600,
                    panel_width_max: 1100,
                    compatible_systems: ['AL22', 'AL23', 'AL24', 'AL25', 'AL26'],
                    sheet_source: 'Zonweringspaneel'
                },
                configuration: {}
            })
            .select('id')
            .single();

        if (error) throw new Error(`Failed to create table: ${error.message}`);
        tableId = newTable.id;
        console.log(`Created table: ${tableName} (${tableId})`);
    }

    // 3. Parse and insert prices
    const prices: { height: number; price: number }[] = [];

    // Data starts at row 6 (index 5) based on analysis
    for (let r = 5; r < data.length; r++) {
        const row = data[r];
        if (!row || !row[0]) continue;

        const heightCell = String(row[0]).trim();
        const priceCell = row[1];

        // Parse height (e.g., "2000 mm" or just "2000")
        const heightMatch = heightCell.match(/(\d+)/);
        if (!heightMatch) continue;

        const height = parseInt(heightMatch[1]);
        const price = typeof priceCell === 'number' ? priceCell : parseFloat(priceCell);

        if (height >= 2000 && height <= 2650 && price > 0) {
            prices.push({ height, price });
        }
    }

    if (prices.length === 0) {
        console.warn('No valid price entries found!');
        return;
    }

    // Insert entries
    const entries = prices.map(p => ({
        price_table_id: tableId,
        width_mm: p.height, // Using width_mm for height (single dimension lookup)
        projection_mm: 0,
        price: p.price,
        structure_price: p.price,
        properties: { height_mm: p.height }
    }));

    const { error: insertError } = await supabase
        .from('price_matrix_entries')
        .insert(entries);

    if (insertError) {
        throw new Error(`Failed to insert entries: ${insertError.message}`);
    }

    console.log(`✅ Imported ${entries.length} price entries for Sonnenschutzpaneel`);
    console.log('Price range: ' + prices.map(p => `${p.height}mm = ${p.price.toFixed(2)}€`).slice(0, 3).join(', ') + '...');
};

run().catch(e => console.error('Error:', e));
