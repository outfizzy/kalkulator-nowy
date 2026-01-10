// scripts/cleanup_duplicates.js
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Load Environment Variables using dotenv (Robust)
// We try loading .env.local first, then .env as fallback
try {
    const dotenv = require('dotenv');
    const localEnvPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(localEnvPath)) {
        console.log('Loading .env.local via dotenv...');
        dotenv.config({ path: localEnvPath });
    } else {
        console.log('Loading .env via dotenv (fallback)...');
        dotenv.config();
    }
} catch (e) {
    console.warn('⚠️ dotenv module not found or failed. Ensure `npm install` is run if relying on local .env');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Using URL:', supabaseUrl ? 'Found' : 'MISSING');
console.log('Using Key:', supabaseKey ? 'Found' : 'MISSING');

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Credentials. Ensure .env.local exists or vars are set.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    // CHECK FOR exec_sql RPC
    const { data: rpcList, error: rpcError } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
    let canRunSql = !rpcError;
    if (rpcError && rpcError.message.includes('function "exec_sql" does not exist')) {
        console.log('⚠️ exec_sql RPC not found. Cannot run DDL directly.');
        canRunSql = false;
    } else if (canRunSql) {
        console.log('✅ exec_sql RPC available. Ensuring column exists...');
        // Add column if missing
        await supabase.rpc('exec_sql', {
            sql: `
            ALTER TABLE product_definitions 
            ADD COLUMN IF NOT EXISTS configuration JSONB DEFAULT '{}'::jsonb;
        `});
        console.log('✅ Column `configuration` ensured.');
    } else {
        console.log('⚠️ RPC Error check:', rpcError);
    }

    console.log('🔍 inspecting duplicates...');

    // 1. Fetch all products (Handle missing column gracefully if RPC failed)
    let selectQuery = 'id, code, name, standard_colors, created_at';
    // Only select configuration if we think it exists or we want to test
    // If we failed to add it, we might crash here.
    // Let's try selecting it. If it fails, we know we can't clean based on it.

    let products = [];
    try {
        const { data, error } = await supabase
            .from('product_definitions')
            .select(selectQuery + ', configuration');

        if (error) {
            if (error.message.includes('column "configuration" does not exist')) {
                console.error('❌ Column configuration MISSING. RPC failed or not present.');
                console.error('   Please run: ALTER TABLE product_definitions ADD COLUMN configuration JSONB DEFAULT \'{}\'::jsonb;');
                return;
            }
            throw error;
        }
        products = data;
    } catch (e) {
        console.error('Fetch error:', e);
        return;
    }

    console.log(`Found ${products.length} products total.`);

    // Group by Code
    const groups = {};
    products.forEach(p => {
        const key = (p.code || p.name).trim().toLowerCase();
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
    });

    let deleteIds = [];

    // Identify duplicates
    Object.keys(groups).forEach(key => {
        const group = groups[key];
        if (group.length > 1) {
            console.log(`Found ${group.length} records for "${key}"`);

            // Sort: Configured First
            group.sort((a, b) => {
                const hasConfigA = (a.configuration && JSON.stringify(a.configuration) !== '{}') || (a.standard_colors && a.standard_colors.length > 0);
                const hasConfigB = (b.configuration && JSON.stringify(b.configuration) !== '{}') || (b.standard_colors && b.standard_colors.length > 0);

                if (hasConfigA && !hasConfigB) return -1; // A comes first
                if (!hasConfigA && hasConfigB) return 1; // B comes first
                // If tie, prefer newer? Or older? Usually newer is better edit.
                return new Date(b.created_at) - new Date(a.created_at); // Newer first
            });

            // Keep index 0, delete others
            const toDelete = group.slice(1);
            toDelete.forEach(d => {
                console.log(`❌ MARK TO DELETE: ID ${d.id} (Config: ${JSON.stringify(d.configuration)}, Colors: ${d.standard_colors?.length})`);
                deleteIds.push(d.id);
            });
            console.log(`✅ KEEPING: ID ${group[0].id} (Config: ${JSON.stringify(group[0].configuration)})`);
        }
    });

    if (deleteIds.length > 0) {
        console.log(`Deleting ${deleteIds.length} duplicate records...`);
        const { error: delError } = await supabase
            .from('product_definitions')
            .delete()
            .in('id', deleteIds);

        if (delError) console.error('Delete failed:', delError);
        else console.log('✅ Cleanup Successful!');
    } else {
        console.log('No duplicates found needing deletion (or script logic mismatch).');
    }
}

cleanup();
