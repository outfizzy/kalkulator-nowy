/**
 * Generate SQL for structural metadata update
 * Parses Excel for posts_count, fields_count, rafter_type, area_m2
 * For ALL Aluxe V2 roof models
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '../imports/Aluxe Preisliste UPE 2026_DE.xlsx');

// Mapping of suffix symbols to rafter types
const RAFTER_MAP = {
    '*': 'M-Sparren',
    '**': 'L-Sparren',
    '***': 'XL-Sparren',
    '****': 'XL-Sparren + Stahl 70/50/3',
};

// Steel reinforcement note
const STEEL_NOTE = 'Stahlverstärkung 90x10mm Rinne';

// All sheets to process (roof models with structural data)
const SHEETS_TO_PROCESS = [
    // Orangeline
    { sheet: 'Orangeline  Polycarbonat Zone1R', model: 'Orangeline', cover: 'Poly', zone: 1 },
    { sheet: 'Orangeline Polycarbonat 1a&2R', model: 'Orangeline', cover: 'Poly', zone: 2 },
    { sheet: 'Orangeline Polycarbonat 2a&3R', model: 'Orangeline', cover: 'Poly', zone: 3 },
    { sheet: 'Orangeline Glas zone 1R', model: 'Orangeline', cover: 'Glass', zone: 1 },
    { sheet: 'Orangeline Glas zone 1a&2R', model: 'Orangeline', cover: 'Glass', zone: 2 },
    { sheet: 'Orangeline Glas zone 2a&3R', model: 'Orangeline', cover: 'Glass', zone: 3 },
    // Orangeline+
    { sheet: 'Orangeline+ Polycarbonat Zone1R', model: 'Orangeline+', cover: 'Poly', zone: 1 },
    { sheet: 'Orangeline+ Polycarbonat 1a&2R', model: 'Orangeline+', cover: 'Poly', zone: 2 },
    { sheet: 'Orangeline+ Polycarbonat 2a&3R', model: 'Orangeline+', cover: 'Poly', zone: 3 },
    { sheet: 'Orangeline+ Glas zone 1R', model: 'Orangeline+', cover: 'Glass', zone: 1 },
    { sheet: 'Orangeline+ Glas zone 1a&2R', model: 'Orangeline+', cover: 'Glass', zone: 2 },
    { sheet: 'Orangeline+ Glas zone 2a&3R', model: 'Orangeline+', cover: 'Glass', zone: 3 },
    // Trendline
    { sheet: 'Trendline Polycarbonat Zone1R', model: 'Trendline', cover: 'Poly', zone: 1 },
    { sheet: 'Trendline Polycarbonat 1a&2R', model: 'Trendline', cover: 'Poly', zone: 2 },
    { sheet: 'Trendline Polycarbonat 2a&3R ', model: 'Trendline', cover: 'Poly', zone: 3 },
    { sheet: 'Trendline Glas zone 1R', model: 'Trendline', cover: 'Glass', zone: 1 },
    { sheet: 'Trendline Glas 1a & 2R', model: 'Trendline', cover: 'Glass', zone: 2 },
    { sheet: 'Trendline Glas 2a & 3R', model: 'Trendline', cover: 'Glass', zone: 3 },
    // Trendline+
    { sheet: 'Trendline+ Polycarbonat Zone1R', model: 'Trendline+', cover: 'Poly', zone: 1 },
    { sheet: 'Trendline+ Polycarbonat 1a&2R', model: 'Trendline+', cover: 'Poly', zone: 2 },
    { sheet: 'Trendline+ Polycarbonat 2a&3R ', model: 'Trendline+', cover: 'Poly', zone: 3 },
    { sheet: 'Trendline+ Glas zone 1R', model: 'Trendline+', cover: 'Glass', zone: 1 },
    { sheet: 'Trendline+ Glas 1a & 2R', model: 'Trendline+', cover: 'Glass', zone: 2 },
    { sheet: 'Trendline+ Glas 2a & 3R', model: 'Trendline+', cover: 'Glass', zone: 3 },
    // Topline
    { sheet: 'Topline Polycarbonat Z 1R', model: 'Topline', cover: 'Poly', zone: 1 },
    { sheet: 'Topline Polycarbonat Z 1a +2R', model: 'Topline', cover: 'Poly', zone: 2 },
    { sheet: 'Topline Polycarbonat Z 2a + 3R', model: 'Topline', cover: 'Poly', zone: 3 },
    { sheet: 'Topline Glas zone 1R ', model: 'Topline', cover: 'Glass', zone: 1 },
    { sheet: 'Topline Glas zone 1a+2R', model: 'Topline', cover: 'Glass', zone: 2 },
    { sheet: 'Topline Glas zone 2a+3R', model: 'Topline', cover: 'Glass', zone: 3 },
    // Topline XL
    { sheet: 'Topline XL Polycarbonat Z 1R', model: 'Topline XL', cover: 'Poly', zone: 1 },
    { sheet: 'Topline XL Polycarbona Z1a + 2R', model: 'Topline XL', cover: 'Poly', zone: 2 },
    { sheet: 'Topline XL Poly Z 2a + 3R', model: 'Topline XL', cover: 'Poly', zone: 3 },
    { sheet: 'Topline XL Glas zone 1R', model: 'Topline XL', cover: 'Glass', zone: 1 },
    { sheet: 'Topline XL Glas zone 1a+2R', model: 'Topline XL', cover: 'Glass', zone: 2 },
    { sheet: 'Topline XL Glas zone 2a+3R', model: 'Topline XL', cover: 'Glass', zone: 3 },
    // Designline (Glass only)
    { sheet: 'Designline Zone 1R', model: 'Designline', cover: 'Glass', zone: 1 },
    { sheet: 'Designline Zone 1a+2R', model: 'Designline', cover: 'Glass', zone: 2 },
    { sheet: 'Designline Zone 2a+3R', model: 'Designline', cover: 'Glass', zone: 3 },
    // Ultraline (Glass only)
    { sheet: 'Ultraline Zone 1R', model: 'Ultraline', cover: 'Glass', zone: 1 },
    { sheet: 'Ultraline Zone 1a +2R', model: 'Ultraline', cover: 'Glass', zone: 2 },
    { sheet: 'Ultraline Zone 2a +3R', model: 'Ultraline', cover: 'Glass', zone: 3 },
    // Skyline (no cover type)
    { sheet: 'Skyline Zone 1R', model: 'Skyline', cover: null, zone: 1 },
    { sheet: 'Skyline Freistand Zone 1R', model: 'Skyline', cover: null, zone: 1, freestanding: true },
    { sheet: 'Skyline Zone 1a +2R', model: 'Skyline', cover: null, zone: 2 },
    { sheet: 'Skyline Freistand Zone 1a +2R', model: 'Skyline', cover: null, zone: 2, freestanding: true },
    { sheet: 'Skyline Zone 2a +3R', model: 'Skyline', cover: null, zone: 3 },
    { sheet: 'Skyline Freistand Zone 2a +3R', model: 'Skyline', cover: null, zone: 3, freestanding: true },
    // Carport
    { sheet: 'Carport Zone 1R', model: 'Carport', cover: null, zone: 1 },
    { sheet: 'Carport Freistand Zone 1R', model: 'Carport', cover: null, zone: 1, freestanding: true },
    { sheet: 'Carport Zone 1a +2R', model: 'Carport', cover: null, zone: 2 },
    { sheet: 'Carport Freistand Zone 1a +2R', model: 'Carport', cover: null, zone: 2, freestanding: true },
    { sheet: 'Carport Zone 2a +3R', model: 'Carport', cover: null, zone: 3 },
    { sheet: 'Carport Freistand Zone 2a +3R', model: 'Carport', cover: null, zone: 3, freestanding: true },
];

function buildTableName(model, cover, zone, freestanding) {
    const prefix = 'Aluxe V2 - ';
    if (model === 'Skyline' || model === 'Carport') {
        if (freestanding) {
            return `${prefix}${model} Freestanding (Zone ${zone})`;
        }
        return `${prefix}${model} (Zone ${zone})`;
    }
    const coverName = cover === 'Poly' ? 'Poly' : 'Glass';
    return `${prefix}${model} ${coverName} (Zone ${zone})`;
}

function parseDimension(dimStr) {
    // Parse dimension like "3000x4000**+" into { width, projection, rafterType, hasSteel }
    if (!dimStr || typeof dimStr !== 'string') return null;

    const clean = dimStr.trim();

    // Extract rafter symbols
    let rafterType = null;
    let hasSteel = false;

    if (clean.includes('+')) hasSteel = true;
    if (clean.includes('****')) rafterType = RAFTER_MAP['****'];
    else if (clean.includes('***')) rafterType = RAFTER_MAP['***'];
    else if (clean.includes('**')) rafterType = RAFTER_MAP['**'];
    else if (clean.includes('*')) rafterType = RAFTER_MAP['*'];

    // Parse dimensions (remove all suffix chars)
    const dimPart = clean.replace(/[\*\+]/g, '').trim();
    const match = dimPart.match(/(\d+)\s*[xX]\s*(\d+)/);
    if (!match) return null;

    return {
        width: parseInt(match[1]),
        projection: parseInt(match[2]),
        rafterType,
        hasSteel
    };
}

function processSheet(wb, sheetConfig) {
    const ws = wb.Sheets[sheetConfig.sheet];
    if (!ws) {
        console.warn(`Sheet not found: ${sheetConfig.sheet}`);
        return [];
    }

    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const tableName = buildTableName(sheetConfig.model, sheetConfig.cover, sheetConfig.zone, sheetConfig.freestanding);
    const updates = [];

    // Find header row (contains "Maß" or "mm (BXT)")
    let dataStartRow = 0;
    for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i];
        if (row[0] && (row[0].toString().includes('Maß') || row[0].toString().includes('mm'))) {
            dataStartRow = i + 1;
            break;
        }
    }

    // Skip header/legend rows (those starting with *)
    for (let r = dataStartRow; r < data.length; r++) {
        const row = data[r];
        if (!row[0] || row[0].toString().trim().startsWith('*')) continue;

        const dimStr = row[0].toString();
        const parsed = parseDimension(dimStr);
        if (!parsed) continue;

        // Get structural data (columns F=5, G=6, H=7)
        const fieldsCount = parseInt(row[5]) || null;
        const postsCount = parseInt(row[6]) || null;
        const areaM2 = parseFloat(row[7]) || null;

        if (postsCount || fieldsCount || areaM2 || parsed.rafterType) {
            updates.push({
                tableName,
                width: parsed.width,
                projection: parsed.projection,
                postsCount,
                fieldsCount,
                rafterType: parsed.rafterType,
                areaM2,
                structuralNote: parsed.hasSteel ? STEEL_NOTE : null
            });
        }
    }

    return updates;
}

function generateSQL(updates) {
    const lines = [
        '-- Structural Metadata Update for All Aluxe V2 Models',
        `-- Generated: ${new Date().toISOString()}`,
        '',
        '-- Update price_matrix_entries with structural data',
        ''
    ];

    // Group by table
    const byTable = {};
    for (const u of updates) {
        if (!byTable[u.tableName]) byTable[u.tableName] = [];
        byTable[u.tableName].push(u);
    }

    for (const [tableName, entries] of Object.entries(byTable)) {
        lines.push(`-- ${tableName}`);
        for (const e of entries) {
            const setClauses = [];
            if (e.postsCount) setClauses.push(`posts_count = ${e.postsCount}`);
            if (e.fieldsCount) setClauses.push(`fields_count = ${e.fieldsCount}`);
            if (e.rafterType) setClauses.push(`rafter_type = '${e.rafterType}'`);
            if (e.areaM2) setClauses.push(`area_m2 = ${e.areaM2}`);
            if (e.structuralNote) setClauses.push(`structural_note = '${e.structuralNote}'`);

            if (setClauses.length > 0) {
                lines.push(`UPDATE price_matrix_entries SET ${setClauses.join(', ')} WHERE price_table_id = (SELECT id FROM price_tables WHERE name = '${tableName}') AND width_mm = ${e.width} AND projection_mm = ${e.projection};`);
            }
        }
        lines.push('');
    }

    // Add verification query
    lines.push('-- Verification');
    lines.push("SELECT pt.name, pme.width_mm, pme.projection_mm, pme.posts_count, pme.fields_count, pme.rafter_type FROM price_matrix_entries pme JOIN price_tables pt ON pme.price_table_id = pt.id WHERE pme.posts_count IS NOT NULL LIMIT 20;");

    return lines.join('\n');
}

// Main execution
console.log('Reading Excel file...');
const wb = XLSX.readFile(EXCEL_PATH);

console.log('Processing sheets...');
let allUpdates = [];
for (const config of SHEETS_TO_PROCESS) {
    const updates = processSheet(wb, config);
    console.log(`  ${config.sheet}: ${updates.length} entries`);
    allUpdates = allUpdates.concat(updates);
}

console.log(`\nTotal entries with structural data: ${allUpdates.length}`);

const sql = generateSQL(allUpdates);
const outputPath = path.join(__dirname, 'update_structural_metadata.sql');
fs.writeFileSync(outputPath, sql, 'utf8');
console.log(`\nSQL written to: ${outputPath}`);
