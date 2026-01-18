
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from parent directory
const result = dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

if (result.error) {
    console.error("Error loading .env.local", result.error);
}

// Helper to strip quotes if dotenv doesn't do it automatically for some formats or if there's confusion
const cleanEnv = (val: string | undefined) => val ? val.replace(/^"|"$/g, '') : '';

const supabaseUrl = cleanEnv(process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseKey = cleanEnv(process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key Length:", supabaseKey.length);

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    // process.exit(1); // Proceed to see what was loaded
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc() {
    console.log("Testing get_or_create_customer_v2 against:", supabaseUrl);


    const testData = {
        p_email: 'test_rpc_' + Date.now() + '@example.com',
        p_phone: '123456789',
        p_first_name: 'Test',
        p_last_name: 'User',
        p_company_name: 'Test Company',
        p_street: 'Test St',
        p_house_number: '1',
        p_postal_code: '00-000',
        p_city: 'Test City',
        p_country: 'Deutschland',
        p_representative_id: null, // Allow null for test
        p_source: 'manual_test'
    };

    try {
        const { data, error } = await supabase.rpc('get_or_create_customer_v2', testData);
        if (error) {
            console.error("RPC Failed:", error);
        } else {
            console.log("RPC Success. Customer ID:", data.id);
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}

testRpc();
