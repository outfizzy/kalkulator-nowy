
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env vars from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCustomers() {
    console.log('Checking customers table...');
    const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('*');

    if (custError) {
        console.error('Error fetching customers:', custError);
    } else {
        console.log(`Found ${customers?.length} customers.`);
        if (customers && customers.length > 0) {
            console.log('Sample customer:', customers[0]);
        }
    }

    console.log('Checking offers for customer_id column...');
    const { data: offers, error: offerError } = await supabase
        .from('offers')
        .select('id, customer_id, customer_data')
        .limit(5);

    if (offerError) {
        console.error('Error fetching offers:', offerError);
    } else {
        console.log(`Checked sample offers.`);
        if (offers && offers.length > 0) {
            console.log('Sample offer:', offers[0]);
            console.log(`Offers with customer_id set: ${offers.filter(o => o.customer_id).length} / ${offers.length}`);
        } else {
            console.log('No offers found.');
        }
    }
}

checkCustomers();
