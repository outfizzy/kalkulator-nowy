import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCustomersTable() {
    console.log('🔍 Checking customers table schema and RLS policies...\n');

    // Test 1: Check if we can read from customers table
    console.log('1️⃣ Testing SELECT permission...');
    const { data: customers, error: selectError } = await supabase
        .from('customers')
        .select('*')
        .limit(1);

    if (selectError) {
        console.error('❌ SELECT Error:', selectError);
    } else {
        console.log('✅ SELECT works. Sample columns:', customers?.[0] ? Object.keys(customers[0]) : 'No data');
    }

    // Test 2: Try to insert a test customer
    console.log('\n2️⃣ Testing INSERT permission...');
    const testCustomer = {
        firstName: 'Test',
        lastName: 'Customer',
        email: `test-${Date.now()}@example.com`,
        phone: '+48123456789',
        postalCode: '12345',
        city: 'Berlin',
        street: 'Test Street',
        houseNumber: '1',
        country: 'Deutschland',
        salutation: 'Herr'
    };

    const { data: insertedCustomer, error: insertError } = await supabase
        .from('customers')
        .insert([testCustomer])
        .select()
        .single();

    if (insertError) {
        console.error('❌ INSERT Error:', insertError);
        console.error('Error details:', {
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            code: insertError.code
        });
    } else {
        console.log('✅ INSERT works. Created customer ID:', insertedCustomer?.id);

        // Clean up
        if (insertedCustomer?.id) {
            await supabase.from('customers').delete().eq('id', insertedCustomer.id);
            console.log('🧹 Cleaned up test customer');
        }
    }

    // Test 3: Check current user authentication
    console.log('\n3️⃣ Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
        console.error('❌ Auth Error:', authError);
    } else if (!user) {
        console.error('❌ No authenticated user found!');
    } else {
        console.log('✅ Authenticated as:', user.email);
        console.log('User ID:', user.id);
    }

    // Test 4: Check user profile and role
    if (user) {
        console.log('\n4️⃣ Checking user profile and role...');
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('❌ Profile Error:', profileError);
        } else {
            console.log('✅ User profile:', {
                role: profile?.role,
                full_name: profile?.full_name,
                status: profile?.status
            });
        }
    }
}

checkCustomersTable().catch(console.error);
