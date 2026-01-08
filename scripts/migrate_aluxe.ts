
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

    // Check existing
    const { data: existing } = await supabase.from('product_definitions').select('id').eq('code', code).single();
    if (existing) return existing.id; // Correctly return existing ID

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
    const { data: existing } = await supabase.from('price_tables')
        .select('id')
        .eq('product_definition_id', productId)
        .eq('name', name)
        .maybeSingle();

    if (existing) {
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

// 1. Parsing Roof Sheets (Format: "3000x2000" in Col A)
const parseDimensionListSheet = (ws: XLSX.WorkSheet) => {
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    if (json.length < 5) return null;

    const prices = [];
    let dimColIdx = 0;
    let structureColIdx = 1;
    let totalColIdx = 3;
    let irGoldColIdx = -1;
    let mattColIdx = -1;
    let sunColIdx = -1;
    let startRow = 0;

    // Scan for Header
    for (let r = 0; r < Math.min(20, json.length); r++) {
        const row = json[r];
        if (!row) continue;
        const rowStr = JSON.stringify(row).toLowerCase();
        if (rowStr.includes('maß') || rowStr.includes('bxt')) {
            startRow = r + 1;
            // Find columns
            row.forEach((cell, idx) => {
                const c = String(cell).toLowerCase();
                if (c.includes('exkl. dacheindeckung')) structureColIdx = idx;
                else if (c.includes('inkl. dacheindeckung')) totalColIdx = idx;
                else if (c.includes('ir-gold') || c.includes('ir gold')) irGoldColIdx = idx;
                else if (c.includes('matt') || c.includes('milch')) mattColIdx = idx;
                else if (c.includes('sonnenschutz')) sunColIdx = idx;
            });
            break;
        }
    }

    // Secondary fix: if header scan failed or row 2 contains specific headers (Common in Aluxe sheets)
    if (json.length > 2) {
        const r2 = json[2];
        if (r2) {
            r2.forEach((cell, idx) => {
                const c = String(cell).toLowerCase();
                if (irGoldColIdx === -1 && (c.includes('ir-gold') || c.includes('ir gold'))) irGoldColIdx = idx;
                if (mattColIdx === -1 && (c.includes('matt') || c.includes('milch'))) mattColIdx = idx;
                if (sunColIdx === -1 && c.includes('sonnenschutz')) sunColIdx = idx;
            });
        }
    }

    for (let r = startRow; r < json.length; r++) {
        const row = json[r];
        if (!row || row.length === 0) continue;

        const dimCell = row[dimColIdx];
        if (typeof dimCell === 'string') {
            const cleanDim = dimCell.replace(/\*/g, '').replace(/\+/g, '').replace(/\s/g, '').trim();
            const match = cleanDim.match(/^(\d+)x(\d+)$/);

            if (match) {
                const width = parseInt(match[1]);
                const depth = parseInt(match[2]);

                const structurePrice = typeof row[structureColIdx] === 'number' ? row[structureColIdx] : 0;
                const totalPrice = typeof row[totalColIdx] === 'number' ? row[totalColIdx] : structurePrice;

                if (totalPrice > 0) {
                    // Standard Price
                    prices.push({
                        width_mm: width,
                        projection_mm: depth,
                        price: totalPrice,
                        structure_price: structurePrice,
                        _rowIndex: r,
                        type: 'standard'
                    });

                    // IR Gold
                    if (irGoldColIdx > -1 && typeof row[irGoldColIdx] === 'number') {
                        prices.push({ width_mm: width, projection_mm: depth, price: row[irGoldColIdx], _rowIndex: r, type: 'surcharge', variant: 'ir_gold' });
                    }
                    // Matt / Milch
                    if (mattColIdx > -1 && typeof row[mattColIdx] === 'number') {
                        prices.push({ width_mm: width, projection_mm: depth, price: row[mattColIdx], _rowIndex: r, type: 'surcharge', variant: 'matt' });
                    }
                    // Sonnenschutz
                    if (sunColIdx > -1 && typeof row[sunColIdx] === 'number') {
                        prices.push({ width_mm: width, projection_mm: depth, price: row[sunColIdx], _rowIndex: r, type: 'surcharge', variant: 'sun_protection' });
                    }
                }
            }
        }
    }
    return prices;
};

// 2. Parsing Material Sheets (Format: Name | Dim | Unit | Price)
const parseAccessoryList = (ws: XLSX.WorkSheet) => {
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    if (json.length < 5) return null;

    const variants = [];

    // Find Header "Produktbeschreibung"
    let startRow = -1;
    for (let r = 0; r < 20; r++) {
        if (json[r] && json[r][0] && String(json[r][0]).includes('Produktbeschreibung')) {
            startRow = r + 1;
            break;
        }
    }

    if (startRow === -1) startRow = 5; // Fallback

    for (let r = startRow; r < json.length; r++) {
        const row = json[r];
        if (!row || !row[0]) continue; // Skip empty name

        const name = String(row[0]).trim();
        const dimRaw = row[1] ? String(row[1]) : '';
        const price = typeof row[3] === 'number' ? row[3] : 0;

        // Parse Dimension if possible (e.g. "4000 mm")
        let width = 0;
        const widthMatch = dimRaw.match(/(\d+)\s*mm/);
        if (widthMatch) width = parseInt(widthMatch[1]);

        if (price <= 0.1) continue;

        variants.push({
            variant: name,
            prices: [{
                width_mm: width,
                projection_mm: 0,
                price
            }],
            _rowIndex: r
        });
    }
    return variants;
};

// 3. Parsing Matrix Sheets (Format: Width in Col A, Projections in Row X, Prices in Matrix)
const parseMatrixSheet = (ws: XLSX.WorkSheet) => {
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    if (json.length < 5) return null;

    const prices = [];
    let projectionHeaderRowIndex = -1;
    let projectionColumns: number[] = [];
    let projections: number[] = [];

    // Find the header row for projections (row with multiple numbers)
    for (let r = 0; r < Math.min(json.length, 20); r++) { // Search in first 20 rows
        const row = json[r];
        if (!row || row.length < 2) continue;

        const potentialProjections = [];
        const potentialProjectionColumns = [];
        // Start checking from column 1 or 2, assuming column 0 is for width/name
        for (let c = 1; c < row.length; c++) {
            if (typeof row[c] === 'number' && row[c] > 0) {
                potentialProjections.push(row[c]);
                potentialProjectionColumns.push(c);
            }
        }

        // A header row for projections should have at least 3 projection values
        if (potentialProjections.length >= 3) {
            projectionHeaderRowIndex = r;
            projections = potentialProjections;
            projectionColumns = potentialProjectionColumns;
            break;
        }
    }

    if (projectionHeaderRowIndex === -1) {
        console.warn('Could not find projection header row in matrix sheet.');
        return null;
    }

    // Iterate through rows after the projection header
    for (let r = projectionHeaderRowIndex + 1; r < json.length; r++) {
        const row = json[r];
        if (!row || row.length === 0) continue;

        const widthCell = row[0];
        if (typeof widthCell === 'number' && widthCell > 0) { // Assuming width is in the first column
            const width = widthCell;

            for (let i = 0; i < projections.length; i++) {
                const projection = projections[i];
                const priceCol = projectionColumns[i];
                const price = typeof row[priceCol] === 'number' ? row[priceCol] : 0;

                if (price > 0) {
                    prices.push({
                        width_mm: width,
                        projection_mm: projection,
                        price: price,
                        structure_price: price,
                        _rowIndex: r
                    });
                }
            }
        }
    }
    return prices;
};

// 4. Parsing Multi-Column Lists (Width/Name in Col 0, Variants/Prices in Cols > 0)
const parseMultiColumnList = (ws: XLSX.WorkSheet) => {
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    if (json.length < 3) return null;

    const variants = [];
    let headerRowIndex = -1;

    // Find Header Row: Contains "Preis", "Spuren", "Aufpreis"
    for (let r = 0; r < Math.min(20, json.length); r++) {
        const rowStr = JSON.stringify(json[r] || []);
        if (rowStr.includes('Preis') || rowStr.includes('Spuren') || rowStr.includes('Aufpreis') || rowStr.includes('hhe')) {
            headerRowIndex = r;
            break;
        }
    }
    if (headerRowIndex === -1) headerRowIndex = 0; // Fallback

    const header = json[headerRowIndex] || [];

    for (let r = headerRowIndex + 1; r < json.length; r++) {
        const row = json[r];
        if (!row || !row[0]) continue;
        const baseName = String(row[0]).trim();
        if (baseName.includes('Lieferumfang') || baseName.includes('Info')) continue;

        // Iterate columns starting from 1
        for (let c = 1; c < row.length; c++) {
            const cell = row[c];
            if (typeof cell === 'number' && cell > 0.1) {
                const colHeader = header[c] ? String(header[c]).trim() : '';
                // Clean header: remove "Preis", "pro Platte". Keep relevant discriminator.
                let suffix = colHeader.replace(/Preis/g, '').replace(/pro/g, '').replace(/Platte/g, '').replace(/Paneel/g, '').replace(/\(|\)/g, '').trim();

                const fullName = suffix ? `${baseName} - ${suffix}` : baseName;

                variants.push({
                    variant: fullName,
                    prices: [{ width_mm: 0, projection_mm: 0, price: cell }],
                    _rowIndex: r
                });
            }
        }
    }
    return variants;
    return variants;
};

const parseWidthList = (ws: XLSX.WorkSheet) => {
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    if (json.length < 5) return null;
    const prices = [];
    for (let r = 3; r < json.length; r++) { // Start row 3 based on inspection
        const row = json[r];
        if (!row || row.length < 2) continue;
        const widthCell = row[0]; // e.g., "2000 mm"
        if (typeof widthCell !== 'string' || !widthCell.includes('mm')) continue;

        const width = parseInt(widthCell.replace(/[^\d]/g, ''));
        const priceStandard = typeof row[1] === 'number' ? row[1] : 0;
        const priceWithFoundation = typeof row[2] === 'number' ? row[2] : 0;

        if (priceStandard > 0) {
            prices.push({
                width_mm: width,
                projection_mm: 0,
                price: priceStandard,
                _rowIndex: r,
                type: 'standard'
            });

            // Foundation Surcharge
            if (priceWithFoundation > priceStandard) {
                prices.push({
                    width_mm: width,
                    projection_mm: 0,
                    price: priceWithFoundation - priceStandard,
                    _rowIndex: r,
                    type: 'surcharge',
                    variant: 'foundation'
                });
            }
        }
    }
    return prices;
};

// --- Main ---

const run = async () => {
    console.log(`Starting Migration using ${FILE_PATH}`);
    if (!fs.existsSync(FILE_PATH)) throw new Error('File not found');

    const workbook = XLSX.readFile(FILE_PATH);
    const sheets = workbook.SheetNames;

    console.log(`Found ${sheets.length} sheets. Processing...`);

    let imageMap: Record<string, Record<string, string>> = {};
    const imageMapPath = path.resolve(rootDir, 'scripts', 'sheet_image_map.json');
    if (fs.existsSync(imageMapPath)) {
        imageMap = JSON.parse(fs.readFileSync(imageMapPath, 'utf8'));
        console.log('Loaded image map.');
    } else {
        console.warn('Image map file not found. Proceeding without image URLs.');
    }

    const { data: { session } } = await supabase.auth.getSession();
    console.log('Starting Migration using', FILE_PATH);
    console.log(`Found ${workbook.SheetNames.length} sheets. Processing...`);

    // Track which tables we have already cleared in this run to support merging multiple sheets into one table
    const processedTableIds = new Set<string>();

    for (const sheet of workbook.SheetNames) {
        if (sheet === 'Titelblatt' || sheet === 'Vorwort' || sheet === 'Einteilung (fertig)' || sheet === 'Sprache' || sheet === 'Algemene voorwaarden') continue;

        const nameLower = sheet.toLowerCase();
        let productCandidate = 'Unknown';
        let category = 'roof';
        let items: any[] = [];


        // --- 1. Product & Category Detection ---
        if (nameLower.includes('material') || nameLower.includes('zubehör') || nameLower.includes('accessories')) {
            if (nameLower.includes('orangeline')) productCandidate = 'Orangestyle';
            else if (nameLower.includes('trendline')) productCandidate = 'Trendstyle';
            else if (nameLower.match(/topline\s*xl/)) productCandidate = 'Topstyle XL';
            else if (nameLower.includes('topline')) productCandidate = 'Topstyle';
            else if (nameLower.includes('ultraline')) productCandidate = 'Accessories';
            else if (nameLower.includes('skyline')) productCandidate = 'Accessories';
            else if (nameLower.includes('designline')) productCandidate = 'Designline';
            else productCandidate = 'Accessories';
            category = 'component_list';
        }
        else if (nameLower.includes('seitenwand') || nameLower.includes('frontwand') || nameLower.includes('keilfenster') || nameLower.includes('panorama') || nameLower.includes('zonweringspaneel')) {
            productCandidate = 'SideElements';
            if (nameLower.includes('frontwand')) productCandidate = 'Frontwand';
            if (nameLower.includes('keilfenster')) productCandidate = 'Keilfenster';
            if (nameLower.includes('panorama')) productCandidate = 'Panorama';
            if (nameLower.includes('zonweringspaneel')) productCandidate = 'Zonweringspaneel';
            if (nameLower.includes('seitenwand')) productCandidate = 'Seitenwand';
            category = 'multicolumn_list';
        }
        else if (nameLower.includes('beleuchtung') || nameLower.includes('lighting') || nameLower.includes('led') || nameLower.includes('heizung') || nameLower.includes('heating')) {
            productCandidate = 'Lighting';
            category = 'component_list';
        }
        else if (nameLower.includes('schiebetür')) { productCandidate = 'Schiebetür'; category = 'width_list'; }
        else if (nameLower.includes('freistehende')) { productCandidate = 'Freestanding Construction'; category = 'width_list'; }
        else if (nameLower.includes('markisen')) {
            console.log(`[DEBUG] Found Markisen Sheet: "${sheet}"`);
            category = 'matrix';
            if (nameLower.includes('aufdach')) {
                productCandidate = 'Aufdachmarkise zip';
                console.log('  -> Mapped to: Aufdachmarkise zip');
            }
            else if (nameLower.includes('unterdach')) {
                productCandidate = 'Unterdachmarkise zip';
                console.log('  -> Mapped to: Unterdachmarkise zip');
            }
            else if (nameLower.includes('senkrecht')) {
                productCandidate = 'Zip screen';
                console.log('  -> Mapped to: Zip screen');
            }
            else {
                productCandidate = 'Markisen';
                console.log(`  -> Basic Mapping: Markisen (Reason: No subtype match in "${nameLower}")`);
            }
            console.log(`  -> SystemCode: ${slugify(productCandidate)}`);
            items = parseMatrixSheet(workbook.Sheets[sheet]) || [];
        }
        else if (nameLower.includes('designline')) { productCandidate = 'Designline'; }
        else if (nameLower.includes('trendline+') || nameLower.includes('trendstyle+')) { productCandidate = 'Trendstyle+'; }
        else if (nameLower.includes('trendstyle') || nameLower.includes('trendline')) { productCandidate = 'Trendstyle'; }
        else if (nameLower.includes('topline xl') || nameLower.includes('topstyle xl')) { productCandidate = 'Topstyle XL'; } // XL First
        else if (nameLower.includes('topstyle') || nameLower.includes('topline')) { productCandidate = 'Topstyle'; }
        else if (nameLower.includes('orangeline+') || nameLower.includes('orangestyle+')) { productCandidate = 'Orangestyle+'; }
        else if (nameLower.includes('orangeline') || nameLower.includes('orangestyle')) { productCandidate = 'Orangestyle'; }
        else if (nameLower.includes('ultraline') || nameLower.includes('ultrastyle')) { productCandidate = 'Ultrastyle'; }
        else if (nameLower.includes('skyline') || nameLower.includes('skystyle')) { productCandidate = 'Skystyle'; }
        else if (nameLower.includes('carport')) { productCandidate = 'Carport'; category = 'carport'; }
        else if (nameLower.includes('freistehende')) { productCandidate = 'Skystyle'; } // Map generic freestanding to Skystyle
        else continue;

        const systemCode = slugify(productCandidate);

        let dbCategory = 'roof';
        if (category === 'carport') dbCategory = 'carport';
        else if (category === 'matrix') dbCategory = 'awning';
        else if (category === 'multicolumn_list' || category === 'width_list') dbCategory = 'accessory';
        else if (category === 'component_list') {
            // If it's a generic accessory sheet (Lighting, etc), mark as accessory. 
            // If it's a system material list (Orangestyle), keep as roof to merge with system.
            if (productCandidate === 'Accessories' || productCandidate === 'Lighting' || productCandidate === 'Heating') dbCategory = 'accessory';
            else dbCategory = 'roof';
        }

        const productId = await upsertProduct(productCandidate, dbCategory);

        // --- 2. Process Sheet ---
        if (category === 'roof' || category === 'carport' || category === 'matrix') {
            let snowZone = '1';
            // Prioritize explicit range matches (e.g. "1a&2" -> 2, "2a&3" -> 3)
            const rangeMatch = nameLower.match(/(\d)[a-z]?\s?[&|]\s?(\d)/) || nameLower.match(/(\d)[a-z]?\s?[\+]\s?(\d)/);
            if (rangeMatch) {
                snowZone = rangeMatch[2]; // Use upper bound
            } else {
                const zoneMatch = nameLower.match(/(?:zone|z)\s?(\d)/);
                if (zoneMatch) {
                    snowZone = zoneMatch[1];
                } else {
                    const simpleMatch = nameLower.match(/\s(\d)[a-z]/);
                    if (simpleMatch) snowZone = simpleMatch[1];
                }
            }
            const isFreestanding = nameLower.includes('freistand') || nameLower.includes('freistehende') || nameLower.includes('freistehend');
            let subtype = (nameLower.includes('poly') || nameLower.includes('makrolon')) ? 'polycarbonate'
                : (nameLower.includes('glas') || nameLower.includes('glass')) ? 'glass' : 'standard';

            if (isFreestanding) subtype += '_freestanding';

            let items;
            if (category === 'matrix') {
                items = parseMatrixSheet(workbook.Sheets[sheet]);
            } else {
                items = parseDimensionListSheet(workbook.Sheets[sheet]);
            }

            if (items && items.length > 0) {
                const baseTableName = `${productCandidate} - Zone ${snowZone} - ${subtype}`;

                // --- SPLIT ITEMS: Standard vs Surcharges ---
                const standardItems = items.filter((i: any) => !i.type || i.type === 'standard');
                const surchargeItems = items.filter((i: any) => i.type === 'surcharge');

                // 1. Process Standard Items
                if (standardItems.length > 0) {
                    const tableId = await upsertPriceTable(productId, baseTableName, {
                        snow_zone: snowZone,
                        subtype,
                        sheet_source: sheet,
                        system: systemCode
                    });

                    if (!processedTableIds.has(tableId)) {
                        await supabase.from('price_matrix_entries').delete().eq('price_table_id', tableId);
                        processedTableIds.add(tableId);
                    } else {
                        console.log(`[${sheet}] Appending to existing table ${baseTableName}`);
                    }

                    const rows = standardItems.map((p: any) => {
                        const row: any = {
                            price_table_id: tableId,
                            width_mm: p.width_mm,
                            projection_mm: p.projection_mm,
                            price: p.price,
                            structure_price: p.structure_price || p.price
                        };
                        const imageUrl = imageMap[sheet]?.[p._rowIndex];
                        if (imageUrl) {
                            row.properties = { image_url: imageUrl };
                        }
                        return row;
                    });

                    for (let i = 0; i < rows.length; i += 1000) {
                        await supabase.from('price_matrix_entries').insert(rows.slice(i, i + 1000));
                    }
                    console.log(`[${sheet}] Inserted ${rows.length} prices for ${baseTableName}`);

                    // Collect used rows for standard items only to avoid double counting images
                    const usedRowIndices = new Set<number>();
                    standardItems.forEach((p: any) => { if (p._rowIndex !== undefined) usedRowIndices.add(p._rowIndex); });
                    handleUnusedImages(sheet, tableId, baseTableName, usedRowIndices, imageMap);
                }

                // 2. Process Surcharge Items (Grouped by Variant)
                if (surchargeItems.length > 0) {
                    const surchargesByVariant = surchargeItems.reduce((acc: any, item: any) => {
                        const v = item.variant || 'misc';
                        if (!acc[v]) acc[v] = [];
                        acc[v].push(item);
                        return acc;
                    }, {} as Record<string, typeof items>);

                    for (const [variant, sItems] of Object.entries(surchargesByVariant)) {
                        const surchargeTableName = `${baseTableName} - surcharge_${variant}`;
                        const sTableId = await upsertPriceTable(productId, surchargeTableName, {
                            snow_zone: snowZone,
                            subtype,
                            system: systemCode,
                            type: 'surcharge',
                            variant,
                            sheet_source: sheet
                        });

                        if (!processedTableIds.has(sTableId)) {
                            await supabase.from('price_matrix_entries').delete().eq('price_table_id', sTableId);
                            processedTableIds.add(sTableId);
                        }

                        const sRows = (sItems as any[]).map(p => ({
                            price_table_id: sTableId,
                            width_mm: p.width_mm,
                            projection_mm: p.projection_mm,
                            price: p.price,
                            structure_price: p.price
                        }));

                        for (let i = 0; i < sRows.length; i += 1000) {
                            await supabase.from('price_matrix_entries').insert(sRows.slice(i, i + 1000));
                        }
                        console.log(`[${sheet}] Inserted ${sRows.length} items for ${surchargeTableName}`);
                    }
                }

            } else {
                console.warn(`[${sheet}] No pricing data found.`);
            }

        } else if (category === 'width_list') {
            items = parseWidthList(workbook.Sheets[sheet]) || [];
            if (items && items.length > 0) {
                const tableName = `${productCandidate} - Zone 1 - standard`;
                const tableId = await upsertPriceTable(productId, tableName, {
                    system: systemCode,
                    type: 'simple_list'
                });

                if (!processedTableIds.has(tableId)) {
                    await supabase.from('price_matrix_entries').delete().eq('price_table_id', tableId);
                    processedTableIds.add(tableId);
                }

                const rows = items.map(i => ({
                    price_table_id: tableId,
                    width_mm: i.width_mm,
                    projection_mm: 0,
                    price: i.price,
                    structure_price: i.price
                }));

                for (let i = 0; i < rows.length; i += 1000) {
                    await supabase.from('price_matrix_entries').insert(rows.slice(i, i + 1000));
                }
                console.log(`[${sheet}] Inserted ${rows.length} items for ${tableName}`);

                // Table Images
                const usedRowIndices = new Set<number>();
                items.forEach(i => { if (i._rowIndex) usedRowIndices.add(i._rowIndex); });
                handleUnusedImages(sheet, tableId, tableName, usedRowIndices, imageMap);
            }
        } else if (category === 'component_list' || category === 'multicolumn_list') {
            // --- VARIANT LISTS ---
            let variants;
            if (category === 'multicolumn_list') {
                variants = parseMultiColumnList(workbook.Sheets[sheet]);
            } else {
                variants = parseAccessoryList(workbook.Sheets[sheet]);
            }

            if (variants && variants.length > 0) {
                const tableName = `${productCandidate} - Accessories`;
                const tableId = await upsertPriceTable(productId, tableName, {
                    system: systemCode,
                    type: 'component_list'
                });

                if (!processedTableIds.has(tableId)) {
                    await supabase.from('price_matrix_entries').delete().eq('price_table_id', tableId);
                    processedTableIds.add(tableId);
                } else {
                    console.log(`[${sheet}] Appending to existing table ${tableName}`);
                }

                const usedRowIndices = new Set<number>();
                const rows = variants.map(v => {
                    const row: any = {
                        price_table_id: tableId,
                        width_mm: v.prices[0].width_mm,
                        projection_mm: 0,
                        price: v.prices[0].price,
                        properties: { name: v.variant }
                    };
                    const imageUrl = imageMap[sheet]?.[v._rowIndex];
                    if (imageUrl) {
                        row.properties.image_url = imageUrl;
                        usedRowIndices.add(v._rowIndex);
                    }
                    return row;
                });

                await supabase.from('price_matrix_entries').insert(rows);
                console.log(`[${sheet}] Inserted ${rows.length} items for ${tableName}`);

                await supabase.from('price_tables').update({ type: 'component_list' }).eq('id', tableId);

                handleUnusedImages(sheet, tableId, tableName, usedRowIndices, imageMap);

            } else {
                console.warn(`[${sheet}] No Item Data found!`);
            }
        }
    }
    console.log('Migration Complete.');
};

const handleUnusedImages = async (sheet: string, tableId: string, tableName: string, usedRowIndices: Set<number>, imageMap: any) => {
    const sheetImageMap = imageMap[sheet] || {};
    const allImageRowIndices = Object.keys(sheetImageMap).map(Number);
    const unusedImages = allImageRowIndices.filter(idx => !usedRowIndices.has(idx) && sheetImageMap[idx]);

    if (unusedImages.length > 0) {
        // Collect first few or all? For now, first.
        const firstUnusedImageUrl = sheetImageMap[unusedImages[0]];
        const { data: currentTable, error: fetchError } = await supabase.from('price_tables').select('attributes').eq('id', tableId).single();

        if (fetchError) throw new Error(`Failed to fetch price table attributes for ID ${tableId}: ${fetchError.message}`);

        const existingAttributes = currentTable?.attributes || {};
        const updatedAttributes = {
            ...existingAttributes,
            component_images: {
                "Product Image": firstUnusedImageUrl
            }
        };
        const { error: updateError } = await supabase.from('price_tables').update({ attributes: updatedAttributes }).eq('id', tableId);
        if (updateError) throw new Error(`Failed to update price table attributes for ID ${tableId}: ${updateError.message}`);
        console.log(`[${sheet}] Linked unused image to Table ${tableName}.`);
    }
};

run().catch(e => console.error(e));
