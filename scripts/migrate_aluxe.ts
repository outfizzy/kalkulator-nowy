
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load Environment Variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.resolve(rootDir, '.env.local') });

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing Supabase Credentials!');
    console.error('URL:', SUPABASE_URL ? 'OK' : 'MISSING');
    console.error('KEY:', SERVICE_KEY ? 'OK' : 'MISSING');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false }
});

const FILE_PATH = path.resolve(rootDir, 'imports', 'Aluxe Preisliste UPE 2026_DE.xlsx');

// --- Helper Functions ---

const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const upsertProduct = async (name: string, category = 'roof') => {
    const code = slugify(name);
    // console.log(`Upserting Product: ${name} (${code})`);

    // Check existing
    const { data: existing } = await supabase.from('product_definitions').select('id').eq('code', code).single();
    if (existing) return existing.id;

    const { data, error } = await supabase.from('product_definitions').insert({
        name,
        code,
        category,
        provider: 'Aluxe',
        description: `Imported from 2026 Price List: ${name}`
    }).select('id').single();

    if (error) throw new Error(`Product Insert Error (${name}): ${error.message}`);
    return data.id;
};

const upsertPriceTable = async (productId: string, name: string, attributes: object) => {
    // We check via name AND product_id to allow updates
    const { data: existing } = await supabase.from('price_tables')
        .select('id')
        .eq('product_definition_id', productId)
        .eq('name', name)
        .maybeSingle();

    if (existing) {
        // Update attributes just in case
        await supabase.from('price_tables').update({
            attributes,
            is_active: true
        }).eq('id', existing.id);
        return existing.id;
    }

    const { data, error } = await supabase.from('price_tables').insert({
        name,
        product_definition_id: productId,
        attributes,
        is_active: true,
        configuration: {}
    }).select('id').single();

    if (error) throw new Error(`Price Table Insert Error (${name}): ${error.message}`);
    return data.id;
};

// --- Parsers ---

// Detect Matrix in a sheet (finds numeric grid)
const parseMatrixSheet = (ws: XLSX.WorkSheet) => {
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    if (json.length < 5) return null;

    // Heuristic: Find a row that starts with empty/text and has numbers (Widths)
    let headerRowIdx = -1;
    let widthCols = [] as { idx: number, val: number }[];

    // Increased scan depth to 40
    for (let r = 0; r < Math.min(40, json.length); r++) {
        const row = json[r];
        if (!row) continue;
        const numbers = row.map((val, idx) => {
            if (typeof val === 'number') return { idx, val };
            if (typeof val === 'string' && val.match(/^\d+\s*mm$/)) return { idx, val: parseInt(val) };
            return null;
        }).filter(x => x !== null && x.val >= 500); // Relaxed > 500 (inclusive)

        if (numbers.length >= 2) { // Relaxed > 3 to >= 2
            headerRowIdx = r;
            widthCols = numbers;
            break;
        }
    }

    if (headerRowIdx === -1) return null;

    // Scan rows below for Projections (leftmost numeric col)
    const prices = [];
    for (let r = headerRowIdx + 1; r < json.length; r++) {
        const row = json[r];
        if (!row || row.length === 0) continue;

        // Find projection (First numeric-ish cell)
        const projCell = row[0] || row[1]; // Sometimes col 0 is empty
        let projection = 0;
        if (typeof projCell === 'number') projection = projCell;
        else if (typeof projCell === 'string') {
            const m = projCell.match(/(\d+)/);
            if (m) projection = parseInt(m[1]);
        }

        if (projection > 500 && projection < 10000) {
            // Valid Row
            widthCols.forEach(({ idx, val: width }) => {
                const priceVal = row[idx];
                let price = 0;
                if (typeof priceVal === 'number') price = priceVal;
                // Handle currency strings? Usually xlsx parses to number.

                if (price > 0) {
                    prices.push({
                        width_mm: width,
                        projection_mm: projection,
                        price
                    });
                }
            });
        }
    }

    return prices;
};

// Parse Accessories List (Width | Price1 | Price2...)
const parseAccessorySheet = (ws: XLSX.WorkSheet) => {
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    // console.log("Parsing Accessory Sheet...");

    // Find Header "Breite"
    let headerRowIdx = -1;
    for (let r = 0; r < 20; r++) {
        if (json[r] && json[r].some(c => typeof c === 'string' && c.toLowerCase().includes('breite'))) {
            headerRowIdx = r;
            break;
        }
    }
    if (headerRowIdx === -1) return null;

    // Identify Variant Columns (e.g., "44.2 VSG klar") in the row BELOW or SAME?
    // In preview: Row 2 is headers "Price inkl", Row 3 is "44.2 VSG".
    // Or sometimes strict header row.

    // Assuming Row `headerRowIdx + 1` contains specific names IF headerRow has generic "Price".
    // Heuristic: Use non-empty strings in header + 1 as Variant Names.

    const variantRow = json[headerRowIdx + 1]; // "D1", "44.2 VSG..."
    const variants = [] as { idx: number, name: string }[];

    if (variantRow) {
        variantRow.forEach((val, idx) => {
            if (typeof val === 'string' && val.trim().length > 1 && !val.includes('D1')) {
                // exclude "D1" or "Breite"
                variants.push({ idx, name: val.trim() });
            }
        });
    }

    if (variants.length === 0) return null; // No variants found?

    const results = [] as { variant: string, prices: any[] }[];
    variants.forEach(v => results.push({ variant: v.name, prices: [] }));

    // Scan Data Rows
    for (let r = headerRowIdx + 2; r < json.length; r++) {
        const row = json[r];
        if (!row) continue;

        // Width is usually col 0
        let width = 0;
        const widthCell = row[0];
        if (typeof widthCell === 'number') width = widthCell;
        else if (typeof widthCell === 'string') width = parseInt(widthCell); // Fixed Typo

        if (!width || width < 100) continue; // Skip non-data

        variants.forEach((v, vIdx) => {
            const price = row[v.idx];
            if (typeof price === 'number' && price > 0) {
                results[vIdx].prices.push({
                    width_mm: width,
                    projection_mm: 0, // Accessory = 0 proj usually
                    price
                });
            }
        });
    }

    return results;
};


// --- Main ---

const run = async () => {
    console.log(`Starting Migration using ${FILE_PATH}`);
    if (!fs.existsSync(FILE_PATH)) throw new Error('File not found');

    const workbook = XLSX.readFile(FILE_PATH);
    const sheets = workbook.SheetNames;

    console.log(`Found ${sheets.length} sheets. Processing...`);

    for (const sheet of sheets) {
        const nameLower = sheet.toLowerCase();

        // --- 1. Identify Product ---
        let productCandidate = '';
        let category = 'roof';

        if (nameLower.includes('trendstyle')) productCandidate = 'Trendstyle';
        else if (nameLower.includes('topstyle') || nameLower.includes('topline')) productCandidate = 'Topline';
        else if (nameLower.includes('designline')) productCandidate = 'Designline';
        else if (nameLower.includes('ultraline')) productCandidate = 'Ultraline';
        else if (nameLower.includes('skyline')) productCandidate = 'Skyline';
        else if (nameLower.includes('carport')) { productCandidate = 'Carport'; category = 'carport'; }
        else if (nameLower.includes('seitenwand')) { productCandidate = 'Seitenwand'; category = 'sliding_wall'; } // Fixed Category
        else if (nameLower.includes('frontwand')) { productCandidate = 'Frontwand'; category = 'sliding_wall'; } // Fixed Category
        else if (nameLower.includes('schiebetür')) { productCandidate = 'Schiebetür'; category = 'sliding_wall'; } // Fixed Category
        else if (nameLower.includes('keilfenster')) { productCandidate = 'Keilfenster'; category = 'accessory'; }
        else continue; // Skip others for now

        // --- 2. Identify Type (Addon vs Matrix) ---
        const isAddon = ['screen', 'sliding_wall', 'accessory'].includes(category);

        const productId = await upsertProduct(productCandidate, category);

        if (!isAddon) {
            // --- Standard Matrix (Roof) ---
            const snowZone = nameLower.match(/zone\s?(\d)/)?.[1] || '1';
            const subtype = (nameLower.includes('poly') || nameLower.includes('makrolon')) ? 'polycarbonate'
                : (nameLower.includes('glas') || nameLower.includes('glass')) ? 'glass' : 'standard';

            const prices = parseMatrixSheet(workbook.Sheets[sheet]);
            if (prices && prices.length > 0) {
                // Create Table
                const tableName = `${productCandidate} - Zone ${snowZone} - ${subtype}`;
                const tableId = await upsertPriceTable(productId, tableName, {
                    snow_zone: snowZone,
                    subtype,
                    sheet_source: sheet
                });

                // Bulk Delete old & Insert new
                await supabase.from('price_matrix_entries').delete().eq('price_table_id', tableId);

                // Batch Insert mapping
                const rows = prices.map(p => ({
                    price_table_id: tableId,
                    width_mm: p.width_mm,
                    projection_mm: p.projection_mm,
                    price: p.price
                }));

                // Chunking
                for (let i = 0; i < rows.length; i += 1000) {
                    await supabase.from('price_matrix_entries').insert(rows.slice(i, i + 1000));
                }
                console.log(`[${sheet}] Inserted ${rows.length} prices for ${tableName}`);
            } else {
                console.warn(`[${sheet}] No Matrix Data found!`);
            }

        } else {
            // --- Accessory List ---
            // "SeitenwandR" -> Parse variants
            const results = parseAccessorySheet(workbook.Sheets[sheet]);
            if (results && results.length > 0) {
                for (const res of results) {
                    const variantName = res.variant;
                    const tableName = `${productCandidate} - ${variantName}`;

                    const tableId = await upsertPriceTable(productId, tableName, {
                        subtype: variantName,
                        sheet_source: sheet
                    });

                    await supabase.from('price_matrix_entries').delete().eq('price_table_id', tableId);

                    const rows = res.prices.map(p => ({
                        price_table_id: tableId,
                        width_mm: p.width_mm,
                        projection_mm: p.projection_mm,
                        price: p.price
                    }));

                    await supabase.from('price_matrix_entries').insert(rows);
                    console.log(`[${sheet}] Inserted ${rows.length} prices for ${tableName}`);
                }
            } else {
                console.warn(`[${sheet}] No Accessory Data found!`);
            }
        }
    }

    console.log('Migration Complete.');
};

run().catch(e => console.error(e));
