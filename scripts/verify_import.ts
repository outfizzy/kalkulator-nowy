
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
    console.log('--- Verification ---');

    // Check Categories
    const categories = ['Markisen', 'Lighting', 'Orangestyle', 'Topstyle', 'Designline', 'Seitenwand'];

    for (const cat of categories) {
        const { count, error } = await supabase
            .from('price_tables')
            .select('*', { count: 'exact', head: true })
            .ilike('name', `%${cat}%`);

        console.log(`Category [${cat}]: ${count} tables found.`);
    }

    // Check Image URLs
    const { data: entries, error } = await supabase
        .from('price_matrix_entries')
        .select('properties')
        .not('properties', 'is', null)
        .limit(1000);

    let imageCount = 0;
    let totalChecked = 0;

    if (entries) {
        entries.forEach(e => {
            totalChecked++;
            if (e.properties && e.properties.image_url) {
                imageCount++;
            }
        });
    }

    console.log(`Checked ${totalChecked} random entries.`);
    console.log(`Found ${imageCount} entries with 'image_url'.`);

    if (imageCount === 0) {
        console.error('WARNING: No images found in sample!');
    } else {
        console.log('SUCCESS: Images are being linked.');
    }
}

run();
