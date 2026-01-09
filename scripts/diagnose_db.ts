
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env vars
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env.local');
console.log(`Checking env file at: ${envPath}`);

if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    console.log('--- RAW FILE CONTENT START ---');
    console.log(content);
    console.log('--- RAW FILE CONTENT END ---');
} else {
    console.error('File .env.local NOT FOUND at ' + envPath);
}

// Re-load manually if needed
dotenv.config({ path: envPath });

console.log('Environment process.env keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));

const url = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log(`URL: ${url}`);
console.log(`Key: ${key ? 'PRESENT' : 'MISSING'}`);

if (!url || !key) {
    console.error('ERROR: Missing Credentials');
    process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
    try {
        console.log('1. Fetching product_definitions...');
        const { data, error } = await supabase.from('product_definitions').select('*');

        if (error) {
            console.error('ERROR fetching products:', error);
        } else {
            console.log(`SUCCESS: Found ${data?.length} products`);
            if (data && data.length > 0) {
                console.log('Sample products:', data.map(p => `${p.name} (${p.code})`).join(', '));
            } else {
                console.log('WARNING: Table is empty!');
            }
        }

        console.log('\n2. Trying to INSERT "Diagnostic Product"...');
        const testCode = 'diagnostic_' + Date.now();
        const { data: insertData, error: insertError } = await supabase
            .from('product_definitions')
            .insert({
                name: 'Diagnostic Probe',
                code: testCode,
                category: 'roof',
                provider: 'Aluxe'
            })
            .select()
            .single();

        if (insertError) {
            console.error('INSERT ERROR:', insertError);
            // Check RLS policies if insert fails
            if (insertError.code === '42501') {
                console.log(' -> This is a PERMISSION_DENIED (RLS) error.');
            }
        } else {
            console.log('INSERT SUCCESS:', insertData);
            console.log(' -> We HAVE write access.');

            // Clean up
            console.log('3. Cleaning up diagnostic product...');
            await supabase.from('product_definitions').delete().eq('code', testCode);
        }

    } catch (err) {
        console.error('UNEXPECTED ERROR:', err);
    }
    console.log('--- DIAGNOSTIC END ---');
}

run();
