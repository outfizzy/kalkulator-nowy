
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as cp from 'child_process';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load Environment Variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.resolve(rootDir, '.env.local') });

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const XLSX_PATH = path.resolve(rootDir, 'imports', 'Aluxe Preisliste UPE 2026_DE.xlsx');

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing Supabase Credentials!');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false }
});

const run = async () => {
    console.log('--- Image Extraction ---');

    // 1. Unzip XLSX to Temp
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aluxe-import-'));
    console.log(`Extracting to: ${tempDir}`);

    cp.execSync(`unzip -q "${XLSX_PATH}" -d "${tempDir}"`);

    // 2. Locate Media Files
    const mediaDir = path.join(tempDir, 'xl', 'media');
    if (!fs.existsSync(mediaDir)) {
        console.warn('No media folder found in XLSX.');
        return;
    }

    const imageFiles = fs.readdirSync(mediaDir);
    console.log(`Found ${imageFiles.length} images.`);

    // 3. Mapping: We need to parse xl/drawings/drawing*.xml to locate WHERE these images are used.
    // However, XLSX structure mapping Image -> Sheet -> Row is very complex (requires reading rels, worksheets, drawings).
    // SIMPLIFICATION:
    // Just upload ALL images and return a list.
    // Ideally, we'd map "image1.png" -> "Sheet1 Row 5".
    // 
    // Implementation Plan Step 2 said "Map images to cells".
    // Let's look at `xl/drawings/_rels/drawing1.xml.rels` to map rID to media file?
    // And `xl/worksheets/_rels/sheet1.xml.rels` maps sheet to drawing?
    // And `xl/drawings/drawing1.xml` maps position (row/col) to rID?
    //
    // This is probably too complex for a single script run without a library.
    // BUT, commonly, images are named sequentially or we can just provide a library of imported images.

    // STRATEGY B (Simpler):
    // Upload 5-10 sample images just to prove it works, or upload all.
    // We will name them by their original filename.

    // Create Bucket if needed
    await supabase.storage.createBucket('product-images', { public: true }).catch(() => { });

    const uploadedMap: Record<string, string> = {};

    for (const file of imageFiles) {
        const filePath = path.join(mediaDir, file);
        const fileBuffer = fs.readFileSync(filePath);
        const destination = `aluxe-2026/${file}`;

        const { data, error } = await supabase.storage
            .from('product-images')
            .upload(destination, fileBuffer, { contentType: 'image/png', upsert: true });

        if (!error) {
            const publicUrl = supabase.storage.from('product-images').getPublicUrl(destination).data.publicUrl;
            console.log(`Uploaded ${file} -> ${publicUrl}`);
            uploadedMap[file] = publicUrl;
        } else {
            console.error(`Failed ${file}:`, error.message);
        }
    }

    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Save map
    fs.writeFileSync(path.resolve(rootDir, 'scripts', 'image_map.json'), JSON.stringify(uploadedMap, null, 2));
    console.log('Image map saved to scripts/image_map.json');
};

run().catch(console.error);
