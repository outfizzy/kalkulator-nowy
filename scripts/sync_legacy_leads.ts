
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncLeads() {
    console.log('Starting Lead -> Customer Sync...');

    // 1. Fetch orphaned leads (customer_id is null, but has data)
    const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .is('customer_id', null)
        .not('customer_data', 'is', null);

    if (error) {
        console.error('Error fetching leads:', error);
        return;
    }

    console.log(`Found ${leads.length} leads to process.`);

    let successCount = 0;
    let failCount = 0;

    for (const lead of leads) {
        const cData = lead.customer_data;
        if (!cData || (!cData.email && !cData.phone && !cData.lastName)) {
            console.log(`Skipping Lead ${lead.id} - insufficient data.`);
            continue;
        }

        try {
            console.log(`Processing Lead ${lead.id} (${cData.email || cData.phone || cData.lastName})...`);

            // Map to RPC parameters
            const fullAddress = cData.address || '';
            let street = fullAddress;
            let houseNumber = '';
            const match = fullAddress.match(/^(.+)\s+(\d+[a-zA-Z-\/]*)$/);
            if (match) {
                street = match[1];
                houseNumber = match[2];
            }

            // Call RPC to get/create customer
            const { data: customer, error: rpcError } = await supabase.rpc('get_or_create_customer_v2', {
                p_email: cData.email?.trim() || null,
                p_phone: cData.phone?.replace(/\s/g, '') || null,
                p_first_name: cData.firstName || '',
                p_last_name: cData.lastName || '',
                p_company_name: cData.companyName || null,
                p_street: street || null,
                p_house_number: houseNumber || null,
                p_postal_code: cData.postalCode || null,
                p_city: cData.city || null,
                p_country: 'Deutschland'
            });

            if (rpcError) throw rpcError;

            // Update Lead
            if (customer && customer.id) {
                const { error: updateError } = await supabase
                    .from('leads')
                    .update({ customer_id: customer.id })
                    .eq('id', lead.id);

                if (updateError) throw updateError;
                console.log(`-> Linked to Customer ${customer.id}`);
                successCount++;
            } else {
                throw new Error('RPC returned no customer ID');
            }

        } catch (err: any) {
            console.error(`-> Failed Lead ${lead.id}:`, err.message);
            failCount++;
        }
    }

    console.log('--- Sync Complete ---');
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
}

syncLeads();
