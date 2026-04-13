#!/usr/bin/env node
/**
 * Import Teranda price matrices (TR10, TR15, TR20 + FW + SW450) into Supabase.
 * Naming: "Teranda - {Model} {Cover} (Zone 1)" — no snow zones for Teranda.
 * Usage: node scripts/import_teranda.mjs
 */
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=["']?(.+?)["']?\s*$/);
    if (match) envVars[match[1].trim()] = match[2].trim();
});
const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['VITE_SUPABASE_ANON_KEY'];
if (!supabaseUrl || !supabaseKey) { console.error('Missing Supabase creds'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);
const wb = XLSX.readFile(path.join(__dirname, '..', 'teranda.xlsx'));
const ZONE = 1;

// ===== Helpers =====
function tblName(model, cover, variant) {
    if (variant === 'klar') return `Teranda - ${model} ${cover} (Zone ${ZONE})`;
    const m = { matt: 'Matt', reflex_pearl: 'Reflex Pearl' };
    return `Teranda - ${model} ${cover} ${m[variant] || variant} (Zone ${ZONE})`;
}

async function upsertTable(name, modelFamily, coverType) {
    const { data: ex } = await supabase.from('price_tables').select('id').eq('name', name).limit(1);
    if (ex && ex.length > 0) {
        await supabase.from('price_matrix_entries').delete().eq('price_table_id', ex[0].id);
        console.log(`  ♻️  Cleared: ${name}`);
        return ex[0].id;
    }
    const { data: n, error } = await supabase.from('price_tables').insert({
        name, model_family: modelFamily, cover_type: coverType, zone: ZONE,
        construction_type: 'wall', type: 'matrix', is_active: true,
    }).select('id').single();
    if (error) { console.error(`  ❌ ${name}:`, error.message); return null; }
    console.log(`  ✅ Created: ${name}`);
    return n.id;
}

async function insertRows(tableId, entries) {
    const rows = entries.map(e => ({
        price_table_id: tableId, width_mm: e.w, projection_mm: e.d,
        price: e.p, fields_count: e.f, posts_count: e.f ? e.f - 1 : null,
    }));
    for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase.from('price_matrix_entries').insert(rows.slice(i, i + 500));
        if (error) { console.error(`  ❌ Insert:`, error.message); return; }
    }
    console.log(`  📊 ${rows.length} price points`);
}

// Standard matrix: widths in col A, felder in col B, depths in header row
function parseMatrix(data, headerIdx, dataStart, wCol = 0, fCol = 1, pStart = 2) {
    const hdr = data[headerIdx];
    const depths = [];
    for (let c = pStart; c < hdr.length; c++) {
        const v = Number(hdr[c]); if (v > 0) depths.push({ c, d: v });
    }
    const out = [];
    for (let r = dataStart; r < data.length; r++) {
        const row = data[r];
        const w = Number(row?.[wCol]); if (isNaN(w) || w <= 0) break;
        const f = Number(row?.[fCol]) || null;
        for (const { c, d } of depths) {
            const p = Number(row?.[c]);
            if (!isNaN(p) && p > 0) out.push({ w, d, p: Math.round(p * 100) / 100, f });
        }
    }
    return out;
}

// Interleaved: price, V(felder), price, V, ... (used by TR20 GLAS)
function parseInterleaved(data, headerIdx, dataStart, wCol, pStart, pEnd) {
    const hdr = data[headerIdx];
    const depths = [];
    for (let c = pStart; c < pEnd; c += 2) {
        const d = Number(hdr?.[c]); if (d > 0) depths.push({ pc: c, fc: c + 1, d });
    }
    const out = [];
    for (let r = dataStart; r < data.length; r++) {
        const row = data[r];
        const w = Number(row?.[wCol]); if (isNaN(w) || w <= 0) break;
        for (const { pc, fc, d } of depths) {
            const p = Number(row?.[pc]);
            const f = Number(row?.[fc]) || null;
            if (!isNaN(p) && p > 0) out.push({ w, d, p: Math.round(p * 100) / 100, f });
        }
    }
    return out;
}

async function doImport(name, model, cover, entries) {
    console.log(`\n📋 ${name} (${entries.length} entries)`);
    if (entries.length === 0) { console.log('  ⚠️ No data'); return; }
    const ct = cover === 'Poly' ? 'polycarbonate' : 'glass';
    const id = await upsertTable(name, model, ct);
    if (id) await insertRows(id, entries);
}

// ===== MAIN =====
async function importAll() {
    console.log('🚀 Teranda Import\n');

    // TR10 POLY
    let data = XLSX.utils.sheet_to_json(wb.Sheets['TR10 POLY'], { header: 1, defval: '' });
    await doImport(tblName('TR10', 'Poly', 'klar'), 'TR10', 'Poly', parseMatrix(data, 11, 13));    // Row 12=header(idx11), data starts R14(idx13)
    await doImport(tblName('TR10', 'Poly', 'reflex_pearl'), 'TR10', 'Poly', parseMatrix(data, 21, 23)); // R22=header(idx21), R24(idx23)

    // TR10 GLAS
    data = XLSX.utils.sheet_to_json(wb.Sheets['TR10 GLAS'], { header: 1, defval: '' });
    await doImport(tblName('TR10', 'Glass', 'klar'), 'TR10', 'Glass', parseMatrix(data, 25, 26)); // R26=header(idx25), R27(idx26)
    await doImport(tblName('TR10', 'Glass', 'matt'), 'TR10', 'Glass', parseMatrix(data, 49, 50));

    // TR15 POLY
    data = XLSX.utils.sheet_to_json(wb.Sheets['TR15 POLY'], { header: 1, defval: '' });
    await doImport(tblName('TR15', 'Poly', 'klar'), 'TR15', 'Poly', parseMatrix(data, 16, 18)); // R17=header(idx16), R19(idx18)
    await doImport(tblName('TR15', 'Poly', 'reflex_pearl'), 'TR15', 'Poly', parseMatrix(data, 31, 33));

    // TR15 GLAS (side-by-side: KLAR cols 10-18, MATT cols 20-28, header row 1=idx1)
    data = XLSX.utils.sheet_to_json(wb.Sheets['TR15 GLAS'], { header: 1, defval: '' });
    await doImport(tblName('TR15', 'Glass', 'klar'), 'TR15', 'Glass', parseMatrix(data, 1, 2, 10, 11, 12));
    await doImport(tblName('TR15', 'Glass', 'matt'), 'TR15', 'Glass', parseMatrix(data, 1, 2, 20, 21, 22));

    // TR20 POLY
    data = XLSX.utils.sheet_to_json(wb.Sheets['TR20 POLY'], { header: 1, defval: '' });
    await doImport(tblName('TR20', 'Poly', 'klar'), 'TR20', 'Poly', parseMatrix(data, 15, 17)); // R16=header(idx15), R18(idx17)
    await doImport(tblName('TR20', 'Poly', 'reflex_pearl'), 'TR20', 'Poly', parseMatrix(data, 29, 31));

    // TR20 GLAS (side-by-side interleaved: KLAR cols 21-36, MATT cols 38-53, header idx1)
    data = XLSX.utils.sheet_to_json(wb.Sheets['TR20 GLAS'], { header: 1, defval: '' });
    await doImport(tblName('TR20', 'Glass', 'klar'), 'TR20', 'Glass', parseInterleaved(data, 1, 2, 21, 23, 37));
    await doImport(tblName('TR20', 'Glass', 'matt'), 'TR20', 'Glass', parseInterleaved(data, 1, 2, 38, 40, 54));

    // FW (Fixed Walls) — parse INKL sections
    data = XLSX.utils.sheet_to_json(wb.Sheets['FW'], { header: 1, defval: '' });
    const fwSections = [];
    data.forEach((r, i) => { const l = String(r?.[0] || ''); if (l.includes('INKL')) fwSections.push({ r: i, l }); });
    for (const s of fwSections) {
        const isFW300 = s.l.includes('FW300');
        const model = isFW300 ? 'FW300' : 'FW200';
        const variant = s.l.includes('MATT') ? 'matt' : 'klar';
        // Walls: height(col0) × width(header), but stored as width_mm=width, projection_mm=height
        const hdr = data[s.r + 2]; // width headers
        const widths = [];
        for (let c = 1; c < hdr.length; c++) { const v = Number(hdr[c]); if (v > 0) widths.push({ c, w: v }); }
        const entries = [];
        for (let r = s.r + 3; r < data.length; r++) {
            const row = data[r];
            const h = Number(row?.[0]); if (isNaN(h) || h <= 0 || String(row?.[0]).includes('FW')) break;
            for (const { c, w } of widths) {
                const p = Number(row?.[c]);
                if (!isNaN(p) && p > 0) entries.push({ w, d: h, p: Math.round(p * 100) / 100, f: null });
            }
        }
        const name = `Teranda - ${model} Glass${variant === 'matt' ? ' Matt' : ''} (Zone ${ZONE})`;
        await doImport(name, model, 'Glass', entries);
    }

    // SW450 (Sliding Walls)
    data = XLSX.utils.sheet_to_json(wb.Sheets['SW450'], { header: 1, defval: '' });
    const swSections = [];
    data.forEach((r, i) => { if (String(r?.[0] || '').startsWith('TYP')) swSections.push({ r: i, l: String(r[0]).replace(/\s+/g, '') }); });
    for (const s of swSections) {
        const hdr = data[s.r + 1];
        const heights = [];
        for (let c = 2; c < hdr.length; c++) { const h = Number(hdr[c]); if (h > 0) heights.push({ c, h }); }
        const entries = [];
        for (let r = s.r + 2; r < data.length; r++) {
            const row = data[r]; const w = Number(row?.[0]);
            if (isNaN(w) || w <= 0 || String(row?.[0]).includes('TYP')) break;
            for (const { c, h } of heights) {
                const p = Number(row?.[c]);
                if (!isNaN(p) && p > 0) entries.push({ w, d: h, p: Math.round(p * 100) / 100, f: null });
            }
        }
        await doImport(`Teranda - SW450 ${s.l} (Zone ${ZONE})`, 'SW450', 'Glass', entries);
    }

    console.log('\n✅ Teranda import complete!');
}

importAll().catch(console.error);
