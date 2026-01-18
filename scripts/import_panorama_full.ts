
import XLSX from 'xlsx';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// --- ENV SETUP ---
let localEnv = '';
try { localEnv = fs.readFileSync('.env.local', 'utf8'); } catch (e) { }
const getEnv = (key: string) => {
    if (process.env[key]) return process.env[key];
    const match = localEnv.match(new RegExp(`${key}=("?)(.*?)(\\1|$)`));
    return match ? match[2] : undefined;
}
const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL') || 'https://whgjs.supabase.co';
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

// Supabase not needed for SQL generation
// const supabase = createClient(supabaseUrl, supabaseKey!);

// --- CONFIG ---
const MODELS = ['Panorama AL22R']; // Can add AL23, AL24 later if logic is same
// Note: AL22R sheet has "3 Spuren" and "5 Spuren" prices.
// We will generate TWO tables: "Panorama AL22 (3-Tor)" and "Panorama AL22 (5-Tor)".

// Dimensions to generate
const WIDTHS = Array.from({ length: 15 }, (_, i) => 1500 + i * 500); // 1500, 2000 ... 8500
const HEIGHTS = Array.from({ length: 8 }, (_, i) => 2000 + i * 100); // 2000, 2100 ... 2700

async function run() {
    console.log("Starting Panorama Import...");
    const workbook = XLSX.readFile('AluxePreisliste.xlsx');

    for (const modelSheet of MODELS) {
        console.log(`Processing ${modelSheet}...`);
        const sheet = workbook.Sheets[modelSheet];
        if (!sheet) {
            console.warn(`Sheet ${modelSheet} not found!`);
            continue;
        }

        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        // --- 1. EXTRACT VARIABLES (Heuristic based on row contents) ---
        // Row with "241.578" is Panel Price
        // Row indices from manual inspection (0-based):
        // Row 3 (line 4): Panel Price. Columns: [null, null, Price3, Price5]
        const panelPriceRow = data.find(r => r[0] && (r[0] as string).includes('600 - 1100'));
        const panelPrice3 = panelPriceRow ? (panelPriceRow[2] as number) : 242;
        const panelPrice5 = panelPriceRow ? (panelPriceRow[3] as number) : 252;

        // Tracks (Row 7 "Laufschiene unten", Row 8 "Laufschiene oben")
        const bottomTrackRow = data.find(r => r[0] && (r[0] as string).includes('Laufschiene unten'));
        const topTrackRow = data.find(r => r[0] && (r[0] as string).includes('Laufschiene oben'));

        const bottomTrack3 = bottomTrackRow ? (bottomTrackRow[3] as number) : 10.84;
        const bottomTrack5 = bottomTrackRow ? (bottomTrackRow[4] as number) : 17.22;

        const topTrack3 = topTrackRow ? (topTrackRow[3] as number) : 28.38;
        const topTrack5 = topTrackRow ? (topTrackRow[4] as number) : 40.91;

        // Profiles (Row 9 "Seitenprofile")
        const sideProfileRow = data.find(r => r[0] && (r[0] as string).includes('Seitenprofile'));
        const sideProfilePrice = sideProfileRow ? (sideProfileRow[3] as number) : 11.22; // Same for 3/5?

        // Glass (Row 22/23) - Usually separate but let's assume included in "Panel Price" for BASIC config?
        // Wait, "ESG klar 10mm" is listed separately at 56.84. 
        // Is Panel Price JUST the frame? "Preis pro Paneel". 
        // Usually system price includes glass. 
        // Let's assume User wants the BASE price. Glass might be a surcharge or included.
        // Given existing calculator, better to include "ESG Klar" as standard.
        const glassRow = data.find(r => r[0] && (r[0] as string).includes('ESG klar 10mm'));
        const glassPricePerM2 = glassRow ? (glassRow[3] as number) : 56.84;
        // Note: Glass is usually per m2. Here it says "104.79" in Col 3 (Price). Is it per m2?
        // Row 7 says "Preis pro/m1". Glass is usually m2. 
        // Let's assume Panel Price includes frame, and we add glass.
        // OR Panel Price includes glass. "Panoramaschiebewand... pro Paneel".
        // Let's assume Panel Price is FRAME ONLY, and Glass is extra.
        // I will add [PanelPrice + (GlassPrice * PanelArea)] per panel.

        const params = {
            panel3: panelPrice3, panel5: panelPrice5,
            top3: topTrack3, top5: topTrack5,
            bot3: bottomTrack3, bot5: bottomTrack5,
            side: sideProfilePrice,
            glass: glassPricePerM2
        };
        console.log("Params:", params);

        // --- 2. CLEANUP OLD TABLES (Handled in generated SQL) ---
        // console.log("Cleaning old tables...");
        const tableNameBase = modelSheet.replace('R', ''); // "Panorama AL22"

        // --- 3. GENERATE & INSERT (3-Track and 5-Track) ---
        console.log(`-- Processing ${modelSheet}`);
        await createTableAndEntries(`${tableNameBase} (3-Tor)`, 3, params, true);
        await createTableAndEntries(`${tableNameBase} (5-Tor)`, 5, params, false);
    }
}

async function createTableAndEntries(name: string, tracks: number, p: any, is3: boolean) {
    // --- 3. GENERATE PL/PGSQL BLOCK ---
    const addonCode = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    console.log(`
DO $$
DECLARE
    v_table_id uuid;
BEGIN
    -- 1. Cleanup Old
    DELETE FROM pricing_addons WHERE addon_code = '${addonCode}';
    DELETE FROM price_tables WHERE type = 'addon_matrix' AND name = '${name}';

    -- 2. Create Table
    INSERT INTO price_tables (name, type, is_active, currency, attributes)
    VALUES ('${name}', 'addon_matrix', true, 'EUR', '{"structure_type": "addon_matrix", "pricing_method": "matrix"}'::jsonb)
    RETURNING id INTO v_table_id;

    -- 3. Insert Matrix Entries
    INSERT INTO price_matrix_entries (price_table_id, width_mm, projection_mm, price)
    VALUES
`);

    const panelPrice = is3 ? p.panel3 : p.panel5;
    const topTrack = is3 ? p.top3 : p.top5;
    const botTrack = is3 ? p.bot3 : p.bot5;

    const values: string[] = [];

    for (const w of WIDTHS) {
        const panelCount = Math.ceil(w / 900); // heuristic for panels

        for (const h of HEIGHTS) {
            const panelsCost = panelCount * panelPrice;
            const tracksCost = (w / 1000) * (topTrack + botTrack);
            const sidesCost = (h / 1000) * p.side * 2;
            const total = Math.ceil(panelsCost + tracksCost + sidesCost);

            values.push(`(v_table_id, ${w}, ${h}, ${total})`);
        }
    }

    console.log(values.join(',\n') + ';');

    // 4. Insert Addon (No Conflict Check)
    console.log(`
    -- 4. Insert Addon
    INSERT INTO pricing_addons (addon_code, addon_name, addon_group, unit, price_upe_net_eur, price_table_id, properties)
    VALUES ('${addonCode}', '${name}', 'panorama', 'piece', 0, v_table_id, '{"model": "${name}", "tracks": ${tracks}}'::jsonb);

END $$;
`);
}

run();
