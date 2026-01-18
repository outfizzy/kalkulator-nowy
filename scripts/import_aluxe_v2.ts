
import XLSX from 'xlsx';
import * as fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const FILE_PATH = 'AluxePreisliste.xlsx';
const OUTPUT_SQL = 'scripts/batch5_import.sql';

// Width mappings for parsing standard Aluxe formatting
// We will parse the string "3000x2500" from Column A

function generateSQL() {
    console.log(`Reading ${FILE_PATH}...`);
    console.log(`CWD: ${process.cwd()}`);
    console.log(`Writing to: ${path.resolve(OUTPUT_SQL)}`);
    const workbook = XLSX.readFile(FILE_PATH);
    const sqlStatements: string[] = [];

    // --- HELPER: Base SQL Header ---
    sqlStatements.push(`
-- Aluxe V2 Import Script
-- Generated: ${new Date().toISOString()}

BEGIN;
    `);

    // =================================================================================================
    // 1. TRENDLINE & TOPLINE IMPORT (Batch 1 - All Zones)
    // =================================================================================================

    interface RoofSheetConfig {
        sheetName: string;
        modelFamily: string; // 'Trendline', 'Topline', 'Topline XL'
        coverType: string;   // 'poly_clear', 'poly_opal', 'glass_clear', 'glass_opal'
        zone: number;
    }

    // Mapping based on "AluxePreisliste.xlsx" sheet names
    const roofSheets: RoofSheetConfig[] = [
        // TRENDLINE POLY
        { sheetName: 'Trendline Polycarbonat Zone1R', modelFamily: 'Trendline', coverType: 'poly_clear', zone: 1 },
        { sheetName: 'Trendline Polycarbonat 1a&2R', modelFamily: 'Trendline', coverType: 'poly_clear', zone: 2 },
        { sheetName: 'Trendline Polycarbonat 2a&3R ', modelFamily: 'Trendline', coverType: 'poly_clear', zone: 3 },

        // TRENDLINE GLASS
        { sheetName: 'Trendline Glas zone 1R', modelFamily: 'Trendline', coverType: 'glass_clear', zone: 1 },
        { sheetName: 'Trendline Glas 1a & 2R', modelFamily: 'Trendline', coverType: 'glass_clear', zone: 2 },
        { sheetName: 'Trendline Glas 2a & 3R', modelFamily: 'Trendline', coverType: 'glass_clear', zone: 3 },

        // TOPLINE POLY
        { sheetName: 'Topline Polycarbonat Z 1R', modelFamily: 'Topline', coverType: 'poly_clear', zone: 1 },
        { sheetName: 'Topline Polycarbonat Z 1a +2R', modelFamily: 'Topline', coverType: 'poly_clear', zone: 2 },
        { sheetName: 'Topline Polycarbonat Z 2a + 3R', modelFamily: 'Topline', coverType: 'poly_clear', zone: 3 },

        // TOPLINE GLASS
        { sheetName: 'Topline Glas zone 1R ', modelFamily: 'Topline', coverType: 'glass_clear', zone: 1 },
        { sheetName: 'Topline Glas zone 1a+2R', modelFamily: 'Topline', coverType: 'glass_clear', zone: 2 },
        { sheetName: 'Topline Glas zone 2a+3R', modelFamily: 'Topline', coverType: 'glass_clear', zone: 3 },

        // TOPLINE XL POLY
        { sheetName: 'Topline XL Polycarbonat Z 1R', modelFamily: 'Topline XL', coverType: 'poly_clear', zone: 1 },
        { sheetName: 'Topline XL Polycarbona Z1a + 2R', modelFamily: 'Topline XL', coverType: 'poly_clear', zone: 2 },
        { sheetName: 'Topline XL Poly Z 2a + 3R', modelFamily: 'Topline XL', coverType: 'poly_clear', zone: 3 },

        // TOPLINE XL GLASS
        { sheetName: 'Topline XL Glas zone 1R', modelFamily: 'Topline XL', coverType: 'glass_clear', zone: 1 },
        { sheetName: 'Topline XL Glas zone 1a+2R', modelFamily: 'Topline XL', coverType: 'glass_clear', zone: 2 },
        { sheetName: 'Topline XL Glas zone 2a+3R', modelFamily: 'Topline XL', coverType: 'glass_clear', zone: 3 },

        // ULTRALINE (Optional for Batch 1, but let's include if simple)
        { sheetName: 'Ultraline Zone 1R', modelFamily: 'Ultraline', coverType: 'glass_clear', zone: 1 },
        { sheetName: 'Ultraline Zone 1a +2R', modelFamily: 'Ultraline', coverType: 'glass_clear', zone: 2 },
        { sheetName: 'Ultraline Zone 2a +3R', modelFamily: 'Ultraline', coverType: 'glass_clear', zone: 3 },
    ];

    roofSheets.forEach(config => {
        const sheet = workbook.Sheets[config.sheetName];
        if (!sheet) {
            console.warn(`Skipping missing sheet: ${config.sheetName}`);
            return;
        }

        console.log(`Processing ${config.modelFamily} (${config.coverType}) Zone ${config.zone}...`);

        // Name Format: "Aluxe V2 - Trendline Poly (Zone 1)"
        // Normalize cover type for name
        const coverLabel = config.coverType.includes('poly') ? 'Poly' : 'Glass';
        const tableName = `Aluxe V2 - ${config.modelFamily} ${coverLabel} (Zone ${config.zone})`;

        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 8 });

        const attributes = JSON.stringify({
            provider: 'Aluxe',
            model_family: config.modelFamily,
            cover_type: config.coverType,
            zone: config.zone,
            construction_type: 'wall',
            structure_type: 'matrix'
        });

        sqlStatements.push(`
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = '${tableName}';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('${tableName}', 'matrix', true, 'EUR', '${attributes}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        `);

        // Parse Rows
        const values: string[] = [];
        rows.forEach((row: any) => {
            const dimStr = row[0];
            const price = row[3]; // Col D (Total Price) for standard sheets
            // NOTE: Check if Columns Differs for Glass? usually similar structure.
            // Inspection of Trendline Poly Zone1R showed price at index 3.

            if (dimStr && typeof dimStr === 'string' && typeof price === 'number') {
                const match = dimStr.match(/(\d+)x(\d+)/);
                if (match) {
                    const width = parseInt(match[1]);
                    const projection = parseInt(match[2]);
                    values.push(`(v_table_id, ${width}, ${projection}, ${Math.ceil(price)})`);
                }
            }
        });

        if (values.length > 0) {
            sqlStatements.push(values.join(',\n'));
            sqlStatements.push(';');
            sqlStatements.push('END $$;');
        }
    });

    // Old single block removed

    // =================================================================================================
    // 2. PANORAMA IMPORT (Addon Matrix)
    // =================================================================================================
    const panoramaSheet = workbook.Sheets['Panorama AL22R'];
    if (panoramaSheet) {
        console.log('Processing Panorama AL22...');

        // Define variants to generate
        const variants = [3, 5]; // 3-rail, 5-rail

        // Parse Components from Sheet
        const data = XLSX.utils.sheet_to_json(panoramaSheet, { header: 1, defval: 0 }) as any[];

        // Map based on inspection (indices are 0-based)
        // Row 4 (index 3): Panel Prices -> Col C (2): 241.58, Col D (3): 251.05
        const p3_panel = data[3]?.[2] || 0;
        const p5_panel = data[3]?.[3] || 0;

        // Row 8 (index 7): Bot Track -> Col D (3): 10.84, Col E (4): 17.22
        const p3_bot = data[7]?.[3] || 0;
        const p5_bot = data[7]?.[4] || 0;

        // Row 9 (index 8): Top Track -> Col D (3): 28.38, Col E (4): 40.91
        const p3_top = data[8]?.[3] || 0;
        const p5_top = data[8]?.[4] || 0;

        // Row 10 (index 9): Side Profile -> Col D (3): 11.22
        const side_profile = data[9]?.[3] || 0;

        if (!p3_panel) console.warn('Warning: Could not read Panorama prices correctly!');

        variants.forEach(tracks => {
            const is3 = tracks === 3;
            const tableName = `Aluxe V2 - Panorama (${tracks}-Tor)`;
            const addonCode = `aluxe-v2-panorama-${tracks}`;

            // Attributes for Admin UI
            const attributes = JSON.stringify({
                provider: 'Aluxe',
                addon_group: 'panorama',
                model_family: 'Panorama',
                structure_type: 'addon_matrix',
                pricing_method: 'matrix'
            });

            const panelPrice = is3 ? p3_panel : p5_panel;
            const trackMeterPrice = (is3 ? p3_top : p5_top) + (is3 ? p3_bot : p5_bot);
            const sideMeterPrice = side_profile * 2; // Left + Right

            sqlStatements.push(`
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    -- Cleanup
    DELETE FROM pricing_addons WHERE addon_code = '${addonCode}';
    DELETE FROM price_tables WHERE name = '${tableName}';

    -- Create Table
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('${tableName}', 'addon_matrix', true, 'EUR', '${attributes}'::jsonb)
    RETURNING id INTO v_table_id;

    -- Insert Matrix Entries
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
            `);

            // Generate dense matrix
            const values: string[] = [];
            const WIDTHS = [];
            for (let w = 1500; w <= 8500; w += 500) WIDTHS.push(w);
            const HEIGHTS = [];
            for (let h = 2000; h <= 2700; h += 100) HEIGHTS.push(h);

            for (const w of WIDTHS) {
                const panelCount = Math.ceil(w / 900); // 900mm heuristic
                for (const h of HEIGHTS) {
                    const cost =
                        (panelCount * panelPrice) +
                        ((w / 1000) * trackMeterPrice) +
                        ((h / 1000) * sideMeterPrice);

                    values.push(`(v_table_id, ${w}, ${h}, ${Math.ceil(cost)})`);
                }
            }
            sqlStatements.push(values.join(',\n'));
            sqlStatements.push(';');

            // Insert Addon Definition
            sqlStatements.push(`
    INSERT INTO pricing_addons (addon_code, addon_name, addon_group, unit, price_upe_net_eur, price_table_id, properties)
    VALUES ('${addonCode}', 'Panorama V2 (${tracks}-Tor)', 'panorama', 'piece', 0, v_table_id, '{"provider": "Aluxe"}'::jsonb);
            `);

            sqlStatements.push('END $$;'); // End Block
        });
    }

    // =================================================================================================
    // 3. WALLS & ENCLOSURES IMPORT (Batch 2)
    // =================================================================================================

    interface LinearTableConfig {
        sheetName: string;
        tableName: string;
        modelFamily: string;
        coverType: string;
        priceColIndex: number;
        dimType: 'width' | 'projection'; // Which DB column to populate
        startRowIndex: number; // 0-based index in the 'rows' array (which starts at line 1 usually?)
        // Note: XLSX.utils.sheet_to_json with header:1 returns array of arrays.
    }

    const wallConfigs: LinearTableConfig[] = [
        // SIDE WALL (SeitenwandR) - Dimension is Height (Projection)
        {
            sheetName: 'SeitenwandR',
            tableName: 'Aluxe V2 - Side Wall (Glass)',
            modelFamily: 'Side Wall',
            coverType: 'Glass',
            priceColIndex: 1, // Index 1 is Base Price (Glass)
            dimType: 'projection',
            startRowIndex: 3
        },

        // FRONT WALL (FrontwandR) - Dimension is Width
        {
            sheetName: 'FrontwandR',
            tableName: 'Aluxe V2 - Front Wall (Glass)',
            modelFamily: 'Front Wall',
            coverType: 'Glass',
            priceColIndex: 2, // Index 2 is Base Price (Glass)
            dimType: 'width',
            startRowIndex: 3
        },

        // SLIDING DOOR (SchiebetürR) - Dimension is Width
        {
            sheetName: 'SchiebetürR',
            tableName: 'Aluxe V2 - Sliding Door',
            modelFamily: 'Sliding Door',
            coverType: 'Glass',
            priceColIndex: 1, // Index 1 is Base Price (Glass)
            dimType: 'width',
            startRowIndex: 3
        },

        // WEDGE (KeilfensterR) - Dimension is Projection
        {
            sheetName: 'KeilfensterR',
            tableName: 'Aluxe V2 - Wedge (Glass)',
            modelFamily: 'Wedge',
            coverType: 'Glass',
            priceColIndex: 1, // Index 1 is Base Price (Glass)
            dimType: 'projection',
            startRowIndex: 3
        }
    ];

    wallConfigs.forEach(config => {
        const sheet = workbook.Sheets[config.sheetName];
        if (!sheet) {
            console.warn(`[Batch 2] Missing sheet: ${config.sheetName}`);
            return;
        }

        console.log(`Processing Wall/Enclosure: ${config.tableName}...`);

        // Read all rows
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: 0 }) as any[];

        // Debug: Log headers
        if (config.tableName.includes('Wedge')) {
            console.log(`  > DEBUG ${config.tableName} HEADERS:`, rows.slice(0, 4));
        }

        const dataRows = rows.slice(config.startRowIndex);

        // Debug: Log first 3 rows to see columns
        if (config.tableName.includes('Wedge')) {
            console.log(`  > DEBUG ${config.tableName} first rows:`, dataRows.slice(0, 3));
        }

        const attributes = JSON.stringify({
            provider: 'Aluxe',
            model_family: config.modelFamily,
            cover_type: config.coverType,
            construction_type: 'wall', // Generic type for filtering
            structure_type: 'linear'   // 1D pricing
        });

        sqlStatements.push(`
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = '${config.tableName}';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('${config.tableName}', 'matrix', true, 'EUR', '${attributes}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        `);

        const values: string[] = [];

        dataRows.forEach(row => {
            const dimStr = row[0]; // "2000 mm"
            const price = row[config.priceColIndex];

            if (typeof dimStr === 'string' && typeof price === 'number' && price > 0) {
                const dimMatch = dimStr.match(/(\d+)/);
                if (dimMatch) {
                    const dimension = parseInt(dimMatch[1]);

                    const width = config.dimType === 'width' ? dimension : 0;
                    const projection = config.dimType === 'projection' ? dimension : 0;

                    values.push(`(v_table_id, ${width}, ${projection}, ${Math.ceil(price)})`);
                }
            }
        });

        if (values.length > 0) {
            sqlStatements.push(values.join(',\n'));
            sqlStatements.push(';');
            sqlStatements.push('END $$;');
        } else {
            // Values empty, remove the header we just pushed
            sqlStatements.pop();
            console.warn(`  > No valid data entries found for ${config.tableName}`);
        }
    });

    // =================================================================================================
    // 4. AWNINGS & SCREENS IMPORT (Batch 3 - Matrix)
    // =================================================================================================

    interface MatrixTableConfig {
        sheetName: string;
        tableName: string;
        modelFamily: string;
        type: 'Awning' | 'Screen';
        startRowIndex: number;
        projectionRowIndex: number; // Row containing the projection/height headers
    }

    const awningConfigs: MatrixTableConfig[] = [
        {
            sheetName: 'Markisen - Aufdach ZIP',
            tableName: 'Aluxe V2 - On-Roof Awning',
            modelFamily: 'On-Roof Awning',
            type: 'Awning',
            startRowIndex: 7,
            projectionRowIndex: 6 // Row 6 contains projections [null, 2500, 3000...]
        },
        {
            sheetName: 'Markisen - Unterdach ZIP ', // Note the space
            tableName: 'Aluxe V2 - Under-Roof Awning',
            modelFamily: 'Under-Roof Awning',
            type: 'Awning',
            startRowIndex: 7,
            projectionRowIndex: 6 // Row 6 contains projections [null, 1500, 2000...]
        },
        {
            sheetName: 'Markisen - Senkrecht',
            tableName: 'Aluxe V2 - ZIP Screen',
            modelFamily: 'ZIP Screen',
            type: 'Screen',
            startRowIndex: 5,
            projectionRowIndex: 4 // Row 4 contains heights [null, 1000, 1250...]
        }
    ];

    awningConfigs.forEach(config => {
        const sheet = workbook.Sheets[config.sheetName];
        if (!sheet) {
            console.warn(`[Batch 3] Missing sheet: ${config.sheetName}`);
            return;
        }

        console.log(`Processing Accessory Matrix: ${config.tableName}...`);

        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: 0 }) as any[];

        // 1. Parse Projections/Heights
        const projectionRow = rows[config.projectionRowIndex];
        const projections: number[] = [];
        // Iterate starting from Col 1 (Col 0 is Width header)
        for (let i = 1; i < projectionRow.length; i++) {
            const val = projectionRow[i];
            if (typeof val === 'number') {
                projections.push(val);
            } else {
                // Determine if we stop? usually nulls end the sequence.
                // Assuming contiguous numbers
            }
        }

        // Map projections to column indices
        // projections[0] corresponds to column 1, etc.

        // 2. Prepare Attributes
        const isScreen = config.type === 'Screen';
        const attributes = JSON.stringify({
            provider: 'Aluxe',
            model_family: config.modelFamily,
            addon_group: isScreen ? 'zip_screen' : 'awning',
            structure_type: 'addon_matrix', // It acts as an addon matrix
            pricing_method: 'matrix',
            match_type: isScreen ? 'height' : 'projection' // Screens usually match by height
        });

        // 3. SQL Block
        sqlStatements.push(`
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = '${config.tableName}';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('${config.tableName}', 'addon_matrix', true, 'EUR', '${attributes}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        `);

        const values: string[] = [];

        // 4. Iterate Data Rows
        const dataRows = rows.slice(config.startRowIndex);
        dataRows.forEach(row => {
            const widthVal = row[0];
            if (typeof widthVal === 'number' && widthVal > 0) {
                // Loop through projections
                projections.forEach((proj, projIdx) => {
                    const colIndex = projIdx + 1; // +1 because Col 0 is Width
                    const price = row[colIndex];

                    if (typeof price === 'number' && price > 0) {
                        // For Screens, the matrix is Width x Height (mapped to projection_mm column usually)
                        // For Awnings, the matrix is Width x Projection
                        values.push(`(v_table_id, ${widthVal}, ${proj}, ${Math.ceil(price)})`);
                    }
                });
            }
        });

        if (values.length > 0) {
            sqlStatements.push(values.join(',\n'));
            sqlStatements.push(';');
            sqlStatements.push('END $$;');
        } else {
            // Remove header
            sqlStatements.pop();
            console.warn(`  > No valid data entries found for ${config.tableName}`);
        }
    });

    // =================================================================================================
    // 4. BATCH 4: SKYLINE & CARPORT (Lamella & Carports)
    // =================================================================================================
    console.log('Processing Batch 4: Skyline & Carports...');

    interface AdditionalRoofConfig {
        sheetName: string;
        model: string;
        zone: number;
        constructionType: 'attached' | 'freestanding';
    }

    const batch4Configs: AdditionalRoofConfig[] = [
        // Skyline (Lamella)
        { sheetName: 'Skyline Zone 1R', model: 'Skyline', zone: 1, constructionType: 'attached' },
        { sheetName: 'Skyline Zone 1a +2R', model: 'Skyline', zone: 2, constructionType: 'attached' },
        { sheetName: 'Skyline Zone 2a +3R', model: 'Skyline', zone: 3, constructionType: 'attached' },

        { sheetName: 'Skyline Freistand Zone 1R', model: 'Skyline', zone: 1, constructionType: 'freestanding' },
        { sheetName: 'Skyline Freistand Zone 1a +2R', model: 'Skyline', zone: 2, constructionType: 'freestanding' },
        { sheetName: 'Skyline Freistand Zone 2a +3R', model: 'Skyline', zone: 3, constructionType: 'freestanding' },

        // Carport
        { sheetName: 'Carport Zone 1R', model: 'Carport', zone: 1, constructionType: 'attached' },
        { sheetName: 'Carport Zone 1a +2R', model: 'Carport', zone: 2, constructionType: 'attached' },
        { sheetName: 'Carport Zone 2a +3R', model: 'Carport', zone: 3, constructionType: 'attached' },

        { sheetName: 'Carport Freistand Zone 1R', model: 'Carport', zone: 1, constructionType: 'freestanding' },
        { sheetName: 'Carport Freistand Zone 1a +2R', model: 'Carport', zone: 2, constructionType: 'freestanding' },
        { sheetName: 'Carport Freistand Zone 2a +3R', model: 'Carport', zone: 3, constructionType: 'freestanding' },
    ];

    batch4Configs.forEach(config => {
        const sheet = workbook.Sheets[config.sheetName];
        if (!sheet) {
            console.warn(`Skipping missing sheet: ${config.sheetName}`);
            return;
        }
        console.log(`Processing: ${config.model} (${config.constructionType}) Zone ${config.zone}...`);

        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: null }) as any[][];

        // Header Row for Projections (Row 7 -> Index 6 for Skyline/Carport based on inspection)
        // Inspection showed: [6] [null,2500,3000,3500,...] for standard matrix
        const projectionRowIndex = 6;
        const startRowIndex = 7; // Data starts at Row 8 (Index 7)

        const projectionRow = rows[projectionRowIndex];
        const projections: number[] = [];
        // Parse columns
        for (let i = 1; i < projectionRow.length; i++) {
            const val = projectionRow[i];
            if (typeof val === 'number') {
                projections.push(val);
            }
        }

        const tableName = `Aluxe V2 - ${config.model} ${config.constructionType === 'freestanding' ? 'Freestanding ' : ''}(Zone ${config.zone})`;

        // Attributes
        const attributes = {
            provider: 'Aluxe',
            model_family: config.model,
            zone: config.zone,
            construction_type: config.constructionType,
            cover_type: 'Aluminum', // Skyline/Carport effectively opaque/aluminum
            pricing_method: 'matrix',
            structure_type: 'linear' // Standard matrix
        };

        sqlStatements.push(`
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = '${tableName}';

    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('${tableName}', 'matrix', true, 'EUR', '${JSON.stringify(attributes)}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
        `);

        // Iterate Rows
        const values: string[] = [];
        const dataRows = rows.slice(startRowIndex);

        dataRows.forEach(row => {
            const widthRaw = row[0];
            if (typeof widthRaw === 'string') {
                // Format "3000 mm" -> 3000
                const widthVal = parseInt(widthRaw.replace(/\D/g, ''));

                if (widthVal > 0) {
                    projections.forEach((proj, projIdx) => {
                        const colIndex = projIdx + 1;
                        const price = row[colIndex];
                        if (typeof price === 'number' && price > 0) {
                            values.push(`(v_table_id, ${widthVal}, ${proj}, ${Math.ceil(price)})`);
                        }
                    });
                }
            }
        });

        if (values.length > 0) {
            sqlStatements.push(values.join(',\n'));
            sqlStatements.push(';');
            sqlStatements.push('END $$;');
        } else {
            // Remove header if no values
            sqlStatements.pop();
            console.warn(`No entries found for ${config.sheetName}`);
        }
    });

    // =================================================================================================
    // 5. BATCH 5: SURCHARGES, FENCES, ACCESSORIES
    // =================================================================================================
    console.log('Processing Batch 5: Freestanding Surcharge, Fences & Accessories...');

    // 5.1 Freestanding Surcharge (Sheet 65)
    // Table 1: Aluxe V2 - Freestanding Surcharge (No Foundation)
    // Table 2: Aluxe V2 - Freestanding Surcharge (With Foundation)
    const fsSheetName = 'Freistehende TerrassendächerR';
    const fsSheet = workbook.Sheets[fsSheetName];
    if (fsSheet) {
        const rows = XLSX.utils.sheet_to_json(fsSheet, { header: 1, range: 0, defval: null }) as any[][];
        // Data starts at row 3 (index 3). Col 0=Width, Col 1=Price(NoFound), Col 2=Price(Found)
        const startRow = 3;
        const dataRows = rows.slice(startRow);

        const fsTables = [
            { name: 'Aluxe V2 - Freestanding Surcharge', colIndex: 1, foundation: false },
            { name: 'Aluxe V2 - Freestanding Surcharge (Foundation)', colIndex: 2, foundation: true }
        ];

        fsTables.forEach(t => {
            const values: string[] = [];
            dataRows.forEach(row => {
                const wRaw = row[0];
                const price = row[t.colIndex];
                if (typeof wRaw === 'string' && typeof price === 'number') {
                    const widthVal = parseInt(wRaw.replace(/\D/g, ''));
                    if (widthVal > 0 && price > 0) {
                        // Width x 0
                        values.push(`(v_table_id, ${widthVal}, 0, ${Math.ceil(price)})`);
                    }
                }
            });

            if (values.length > 0) {
                const jsonAttr = JSON.stringify({
                    provider: 'Aluxe',
                    type: 'surcharge',
                    category: 'freestanding_construction',
                    foundation: t.foundation,
                    pricing_method: 'simple'
                });

                sqlStatements.push(`
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = '${t.name}';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('${t.name}', 'simple', true, 'EUR', '${jsonAttr}'::jsonb)
    RETURNING id INTO v_table_id;

    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
${values.join(',\n')};
END $$;`);
            }
        });
    }

    // 5.2 Zonweringspaneel (Sheet 78)
    // Height -> Price (Width 600-1100)
    const zpSheetName = 'Zonweringspaneel';
    const zpSheet = workbook.Sheets[zpSheetName];
    if (zpSheet) {
        const rows = XLSX.utils.sheet_to_json(zpSheet, { header: 1, range: 0, defval: null }) as any[][];
        // Data starts at row 5 (index 5)
        const startRow = 5;
        const values: string[] = [];
        rows.slice(startRow).forEach(row => {
            const hRaw = row[0]; // Height
            const price = row[1];
            if (typeof hRaw === 'string' && typeof price === 'number') {
                const hVal = parseInt(hRaw.replace(/\D/g, ''));
                if (hVal > 0 && price > 0) {
                    // 0 x Height
                    values.push(`(v_table_id, 0, ${hVal}, ${Math.ceil(price)})`);
                }
            }
        });

        if (values.length > 0) {
            const jsonAttr = JSON.stringify({
                provider: 'Aluxe',
                type: 'fence_panel',
                model: 'Zonweringspaneel',
                pricing_method: 'matrix', // Height driven
            });
            sqlStatements.push(`
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = 'Aluxe V2 - Zonweringspaneel';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('Aluxe V2 - Zonweringspaneel', 'matrix', true, 'EUR', '${jsonAttr}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
${values.join(',\n')};
END $$;`);
        }
    }

    // 5.3 Fences (Sheet 79: Planken,ZäuneR)
    // Width x Height
    const fenceSheetName = 'Planken,ZäuneR';
    const fenceSheet = workbook.Sheets[fenceSheetName];
    if (fenceSheet) {
        const rows = XLSX.utils.sheet_to_json(fenceSheet, { header: 1, range: 0, defval: null }) as any[][];
        const startRow = 4; // Data rows
        const valuesAlu: string[] = [];
        const valuesDoor: string[] = [];

        rows.slice(startRow).forEach(row => {
            const wRaw = row[0]; // "1000mm"
            const hRaw = row[1]; // 1800
            const priceAlu = row[2];
            const priceDoor = row[3];

            if (typeof wRaw === 'string' && typeof hRaw === 'number') {
                const wVal = parseInt(wRaw.replace(/\D/g, ''));

                if (wVal > 0) {
                    if (typeof priceAlu === 'number' && priceAlu > 0) {
                        valuesAlu.push(`(v_table_id, ${wVal}, ${hRaw}, ${Math.ceil(priceAlu)})`);
                    }
                    if (typeof priceDoor === 'number' && priceDoor > 0) {
                        valuesDoor.push(`(v_table_id, ${wVal}, ${hRaw}, ${Math.ceil(priceDoor)})`);
                    }
                }
            }
        });

        const fences = [
            { name: 'Aluxe V2 - Fence Element (Aluminium)', vals: valuesAlu, type: 'fence_element' },
            { name: 'Aluxe V2 - Fence Element (Door)', vals: valuesDoor, type: 'fence_door' }
        ];

        fences.forEach(f => {
            if (f.vals.length > 0) {
                const jsonAttr = JSON.stringify({
                    provider: 'Aluxe',
                    type: f.type,
                    pricing_method: 'matrix'
                });
                sqlStatements.push(`
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = '${f.name}';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('${f.name}', 'matrix', true, 'EUR', '${jsonAttr}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
${f.vals.join(',\n')};
END $$;`);
            }
        });
    }

    // 5.4 Loose Materials (Sheet 80: 'Loses Material allgemein ')
    const accSheetName = 'Loses Material allgemein ';
    const accSheet = workbook.Sheets[accSheetName];
    if (accSheet) {
        const rows = XLSX.utils.sheet_to_json(accSheet, { header: 1, range: 0, defval: null }) as any[][];
        const startRow = 3;
        rows.slice(startRow).forEach(row => {
            const desc = row[0];
            const dimension = row[1];
            const unit = row[2];
            const price = row[3];

            if (typeof desc === 'string' && desc.trim().length > 0 && typeof price === 'number' && price > 0) {
                const tableName = `Aluxe V2 - ${desc.trim()}`; // E.g. "Aluxe V2 - Rahmenprofil..."
                const jsonAttr = JSON.stringify({
                    provider: 'Aluxe',
                    type: 'accessory',
                    unit: unit || 'pcs',
                    dimension: dimension, // store dimension string in metadata
                    pricing_method: 'fixed'
                });

                // 0x0 matrix entry for fixed price
                sqlStatements.push(`
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    DELETE FROM price_tables WHERE name = '${tableName}';
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('${tableName}', 'fixed', true, 'EUR', '${jsonAttr}'::jsonb)
    RETURNING id INTO v_table_id;
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES (v_table_id, 0, 0, ${Math.ceil(price)});
END $$;`);
            }
        });
    }
    try {
        const outPath = path.resolve(process.cwd(), OUTPUT_SQL);
        console.log(`Writing ${sqlStatements.length} statements to: ${outPath}`);
        fs.writeFileSync(outPath, sqlStatements.join('\n'));
        console.log(`SUCCESS: File written.`);
    } catch (e) {
        console.error(`ERROR WRITING FILE:`, e);
    }
    console.log(`\n--- GENERATION COMPLETE (${sqlStatements.length} statements) ---`);
}

generateSQL();
