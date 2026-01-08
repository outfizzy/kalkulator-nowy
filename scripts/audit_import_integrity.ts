
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

// --- Setup ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FILE_PATH = path.resolve(__dirname, '../imports/Aluxe Preisliste UPE 2026_DE.xlsx');

// --- Helper: Slugify (Same as Migration) ---
const slugify = (text: string) => {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

// --- Parsers (Copied from migrate_aluxe.ts) ---

const parseDimensionListSheet = (ws: any) => {
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

    // Secondary fix
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

const parseAccessoryList = (ws: any) => {
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    if (json.length < 3) return null;
    const variants: any[] = [];
    for (let r = 2; r < json.length; r++) {
        const row = json[r];
        if (!row) continue;
        const name = row[0];
        const price = row[3];
        if (!name || typeof price !== 'number') continue;
        let width = 0;
        if (typeof row[1] === 'string' && row[1].includes('mm')) {
            const widthMatch = row[1].match(/(\d+)/);
            if (widthMatch) width = parseInt(widthMatch[1]);
        }
        if (price <= 0.1) continue;
        variants.push({ variant: name, price });
    }
    return variants;
};

const parseMatrixSheet = (ws: any) => {
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    if (json.length < 5) return null;
    const prices: any[] = [];
    let projectionHeaderRowIndex = -1;
    let projectionColumns: number[] = [];
    let projections: number[] = [];

    for (let r = 0; r < Math.min(json.length, 20); r++) {
        const row = json[r];
        if (!row || row.length < 2) continue;
        const potentialProjections = [];
        const potentialProjectionColumns = [];
        for (let c = 1; c < row.length; c++) {
            if (typeof row[c] === 'number' && row[c] > 0) {
                potentialProjections.push(row[c]);
                potentialProjectionColumns.push(c);
            }
        }
        if (potentialProjections.length >= 3) {
            projectionHeaderRowIndex = r;
            projections = potentialProjections;
            projectionColumns = potentialProjectionColumns;
            break;
        }
    }
    if (projectionHeaderRowIndex === -1) return null;

    for (let r = projectionHeaderRowIndex + 1; r < json.length; r++) {
        const row = json[r];
        if (!row || row.length === 0) continue;
        const widthCell = row[0];
        if (typeof widthCell === 'number' && widthCell > 0) {
            const width = widthCell;
            for (let i = 0; i < projections.length; i++) {
                const projection = projections[i];
                const priceCol = projectionColumns[i];
                const price = typeof row[priceCol] === 'number' ? row[priceCol] : 0;
                if (price > 0) {
                    prices.push({ width, projection, price });
                }
            }
        }
    }
    return prices;
};

const parseWidthList = (ws: any) => {
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    if (json.length < 5) return null;
    const prices: any[] = [];
    for (let r = 3; r < json.length; r++) {
        const row = json[r];
        if (!row || row.length < 2) continue;
        const widthCell = row[0];
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

const parseMultiColumnList = (ws: any) => {
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    if (json.length < 3) return null;
    const variants: any[] = [];
    let headerRowIndex = -1;
    for (let r = 0; r < Math.min(20, json.length); r++) {
        const rowStr = JSON.stringify(json[r] || []);
        if (rowStr.includes('Preis') || rowStr.includes('Spuren') || rowStr.includes('Aufpreis') || rowStr.includes('hhe')) {
            headerRowIndex = r;
            break;
        }
    }
    if (headerRowIndex === -1) headerRowIndex = 0;
    const header = json[headerRowIndex] || [];
    for (let r = headerRowIndex + 1; r < json.length; r++) {
        const row = json[r];
        if (!row || !row[0]) continue;
        const baseName = String(row[0]).trim();
        if (baseName.includes('Lieferumfang') || baseName.includes('Info')) continue;
        for (let c = 1; c < row.length; c++) {
            const cell = row[c];
            if (typeof cell === 'number' && cell > 0.1) {
                variants.push({ variant: baseName, price: cell });
            }
        }
    }
    return variants;
};

// --- Main Audit Logic ---
async function audit() {
    console.log("--- Starting Integrity Audit ---");
    const workbook = XLSX.readFile(FILE_PATH);
    const sheets = workbook.SheetNames;

    // Map Target Table Name -> Expected Row Count
    const expectedCounts = new Map<string, number>();
    const sheetToTableMap = new Map<string, string>(); // For detailed logging

    console.log(`Scanning ${sheets.length} sheets...`);

    for (const sheet of sheets) {
        if (sheet === 'Titelblatt' || sheet === 'Vorwort' || sheet === 'Einteilung (fertig)' || sheet === 'Sprache' || sheet === 'Algemene voorwaarden') continue;

        const nameLower = sheet.toLowerCase();
        let items: any[] | null = null;
        let productCandidate = 'Unknown';
        let category = 'roof';

        // --- Detection Logic (Mirrors migrate_aluxe.ts) ---
        if (nameLower.includes('material') || nameLower.includes('zubehör') || nameLower.includes('accessories')) {
            if (nameLower.includes('orangeline')) productCandidate = 'Orangestyle';
            else if (nameLower.includes('trendline')) productCandidate = 'Trendstyle';
            else if (nameLower.includes('topline xl')) productCandidate = 'Topstyle XL';
            else if (nameLower.includes('topline')) productCandidate = 'Topstyle';
            else if (nameLower.includes('ultraline')) productCandidate = 'Accessories';
            else if (nameLower.includes('skyline')) productCandidate = 'Accessories';
            else if (nameLower.includes('designline')) productCandidate = 'Designline';
            else productCandidate = 'Accessories';
            category = 'component_list';
            items = parseAccessoryList(workbook.Sheets[sheet]);
        }
        else if (nameLower.includes('seitenwand') || nameLower.includes('schiebetur') || nameLower.includes('frontwand') || nameLower.includes('keilfenster') || nameLower.includes('panorama') || nameLower.includes('zonweringspaneel')) {
            productCandidate = 'SideElements';
            if (nameLower.includes('frontwand')) productCandidate = 'Frontwand';
            if (nameLower.includes('keilfenster')) productCandidate = 'Keilfenster';
            if (nameLower.includes('panorama')) productCandidate = 'Panorama';
            if (nameLower.includes('zonweringspaneel')) productCandidate = 'Zonweringspaneel';
            if (nameLower.includes('schiebetur')) productCandidate = 'Schiebetuer';
            if (nameLower.includes('seitenwand')) productCandidate = 'Seitenwand';
            category = 'multicolumn_list';
            items = parseMultiColumnList(workbook.Sheets[sheet]);
        }
        else if (nameLower.includes('schiebetür')) { productCandidate = 'Schiebetür'; category = 'width_list'; }
        else if (nameLower.includes('markisen')) {
            category = 'matrix';
            if (nameLower.includes('aufdach')) productCandidate = 'Aufdachmarkise zip';
            else if (nameLower.includes('unterdach')) productCandidate = 'Unterdachmarkise zip';
            else if (nameLower.includes('senkrecht')) productCandidate = 'Zip screen';
            else productCandidate = 'Markisen';
            items = parseMatrixSheet(workbook.Sheets[sheet]);
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
        else if (nameLower.includes('freistehende')) { productCandidate = 'Freestanding Construction'; category = 'width_list'; } // Map generic freestanding to Width List

        // Parsing for standard lists
        if (!items && (category === 'roof' || category === 'carport')) {
            if (nameLower.includes('markisen')) {
                items = parseMatrixSheet(workbook.Sheets[sheet]);
            } else {
                items = parseDimensionListSheet(workbook.Sheets[sheet]);
            }
        } else if (!items && category === 'width_list') {
            items = parseWidthList(workbook.Sheets[sheet]);
        }

        // --- Naming & Counting Logic ---

        // 1. Calculate Base Table Name (Common for both)
        let baseTableName = 'Unknown';

        if (category === 'roof' || category === 'carport' || category === 'matrix' || category === 'width_list') {
            // New Robust Regex for Snow Zone
            let snowZone = '1';
            // Prioritize explicit range matches
            const rangeMatch = nameLower.match(/(\d)[a-z]?\s?[&|]\s?(\d)/) || nameLower.match(/(\d)[a-z]?\s?[\+]\s?(\d)/);
            if (rangeMatch) {
                snowZone = rangeMatch[2];
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

            baseTableName = `${productCandidate} - Zone ${snowZone} - ${subtype}`;
        }
        else if (category === 'component_list' || category === 'multicolumn_list') {
            if (productCandidate === 'SideElements') baseTableName = 'SideElements - Accessories';
            else baseTableName = `${productCandidate} - Accessories`;
        }

        // 2. Split Items
        const standardItems = items ? items.filter((i: any) => !i.type || i.type === 'standard') : [];
        const surchargeItems = items ? items.filter((i: any) => i.type === 'surcharge') : [];

        // 3. Register Standard Items
        if (standardItems.length > 0) {
            const current = expectedCounts.get(baseTableName) || 0;
            expectedCounts.set(baseTableName, current + standardItems.length);
            sheetToTableMap.set(sheet, baseTableName);
            console.log(`Sheet: ${sheet} -> Table: ${baseTableName} (Items: ${standardItems.length})`);
        } else if (items && items.length === 0) {
            // Log empty valid sheets
            console.log(`Sheet: ${sheet} -> Table: ${baseTableName} (Items: 0)`);
        }

        // 4. Register Surcharge Items
        if (surchargeItems.length > 0) {
            const surchargesByVariant = surchargeItems.reduce((acc: any, item: any) => {
                const v = item.variant || 'misc';
                if (!acc[v]) acc[v] = [];
                acc[v].push(item);
                return acc;
            }, {} as Record<string, any[]>);

            for (const [variant, sItems] of Object.entries(surchargesByVariant)) {
                const sName = `${baseTableName} - surcharge_${variant}`;
                const current = expectedCounts.get(sName) || 0;
                expectedCounts.set(sName, current + (sItems as any[]).length);
                console.log(`Sheet: ${sheet} -> Table: ${sName} (Items: ${(sItems as any[]).length})`);
            }
        }
    }

    console.log(`\n--- Verification Phase (${expectedCounts.size} Tables) ---`);
    let totalErrors = 0;

    for (const [tableName, expected] of expectedCounts) {
        // Query DB by Name
        const { data: tables, error } = await supabase
            .from('price_tables')
            .select('id')
            .eq('name', tableName);

        if (!tables || tables.length === 0) {
            console.error(`[MISSING] Table '${tableName}' not found in DB! Expected ${expected} items.`);
            totalErrors++;
            continue;
        }

        // Assume unique names now? Duplicate names might exist if manual runs happened? 
        // We merged, so should be 1.
        const tableId = tables[0].id;

        const { count } = await supabase
            .from('price_matrix_entries')
            .select('*', { count: 'exact', head: true })
            .eq('price_table_id', tableId);

        const actual = count || 0;

        if (actual !== expected) {
            // Allow small diff if unused image rows logic skipped something?
            // Actually, my image logic ADDS properties, doesn't remove rows.
            // But verify_import mentioned 8,400 items.
            console.error(`[MISMATCH] '${tableName}': Expected ${expected} | Actual ${actual} | Diff: ${actual - expected}`);
            totalErrors++;
        } else {
            console.log(`[OK] '${tableName}': ${actual} items.`);
        }
    }

    if (totalErrors === 0) {
        console.log("\n✅ INTEGRITY CHECK PASSED: All aggregated counts match exactly.");
    } else {
        console.log(`\n❌ INTEGRITY CHECK FAILED: ${totalErrors} tables have discrepancies.`);
    }
}

audit().catch(console.error);
