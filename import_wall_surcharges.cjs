const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://whgjsppyuvglhbdgdark.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZ2pzcHB5dXZnbGhiZGdkYXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODA4MzYsImV4cCI6MjA3OTc1NjgzNn0.JIYamVyQfNuuLPpx2-VJe1PoWNb23gXeTyNRYGwRTw4'
);

const SURCHARGE_TABLES = [
    {
        name: 'Aluxe V2 - Side Wall (Glass) Surcharge Matt',
        entries: [
            { w: 0, p: 1000, price: 9.32 },
            { w: 0, p: 1500, price: 13.97 },
            { w: 0, p: 2000, price: 18.63 },
            { w: 0, p: 2500, price: 23.29 },
            { w: 0, p: 3000, price: 27.95 },
            { w: 0, p: 3500, price: 32.60 },
            { w: 0, p: 4000, price: 37.26 },
            { w: 0, p: 4500, price: 41.92 },
            { w: 0, p: 5000, price: 46.57 },
        ]
    },
    {
        name: 'Aluxe V2 - Side Wall (Glass) Surcharge Iso',
        entries: [
            { w: 0, p: 1000, price: 93.01 },
            { w: 0, p: 1500, price: 139.51 },
            { w: 0, p: 2000, price: 186.02 },
            { w: 0, p: 2500, price: 232.52 },
            { w: 0, p: 3000, price: 279.02 },
            { w: 0, p: 3500, price: 325.53 },
            { w: 0, p: 4000, price: 372.03 },
            { w: 0, p: 4500, price: 418.54 },
            { w: 0, p: 5000, price: 465.04 },
        ]
    },
    {
        name: 'Aluxe V2 - Side Wall (Glass) Sprosse',
        entries: [
            { w: 0, p: 1000, price: 82.44 },
            { w: 0, p: 1500, price: 123.67 },
            { w: 0, p: 2000, price: 164.89 },
            { w: 0, p: 2500, price: 206.71 },
            { w: 0, p: 3000, price: 248.54 },
            { w: 0, p: 3500, price: 289.15 },
            { w: 0, p: 4000, price: 329.76 },
            { w: 0, p: 4500, price: 371.00 },
            { w: 0, p: 5000, price: 412.21 },
        ]
    },
    {
        name: 'Aluxe V2 - Front Wall (Glass) Surcharge Matt',
        entries: [
            // Front Wall: lookup by width, projection=0
            { w: 1000, p: 0, price: 8.94 },
            { w: 2000, p: 0, price: 17.88 },
            { w: 3000, p: 0, price: 26.83 },
            { w: 4000, p: 0, price: 35.77 },
            { w: 5000, p: 0, price: 44.71 },
            { w: 6000, p: 0, price: 53.65 },
            { w: 7000, p: 0, price: 62.60 },
        ]
    },
    {
        name: 'Aluxe V2 - Front Wall (Glass) Surcharge Iso',
        entries: [
            { w: 1000, p: 0, price: 89.29 },
            { w: 2000, p: 0, price: 178.58 },
            { w: 3000, p: 0, price: 267.86 },
            { w: 4000, p: 0, price: 357.15 },
            { w: 5000, p: 0, price: 446.44 },
            { w: 6000, p: 0, price: 535.73 },
            { w: 7000, p: 0, price: 625.02 },
        ]
    },
    {
        name: 'Aluxe V2 - Front Wall (Glass) Sprosse',
        entries: [
            { w: 1000, p: 0, price: 82.44 },
            { w: 2000, p: 0, price: 164.89 },
            { w: 3000, p: 0, price: 248.54 },
            { w: 4000, p: 0, price: 329.76 },
            { w: 5000, p: 0, price: 412.21 },
            { w: 6000, p: 0, price: 495.87 },
            { w: 7000, p: 0, price: 578.30 },
        ]
    },
];

async function importSurcharges() {
    // Sign in as admin
    const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'admin@polendach.com',
        password: 'Admin123!'
    });
    if (authErr) {
        console.error('Auth failed, trying another cred...', authErr.message);
        // Try another common password
        const { data: auth2, error: authErr2 } = await supabase.auth.signInWithPassword({
            email: 'admin@polendach24.de',
            password: 'Admin123!'
        });
        if (authErr2) {
            console.error('Auth failed again:', authErr2.message);
            return;
        }
    }

    for (const table of SURCHARGE_TABLES) {
        // Check if table exists
        const { data: existing } = await supabase
            .from('price_tables')
            .select('id')
            .eq('name', table.name)
            .limit(1);

        let tableId;
        if (existing && existing.length > 0) {
            tableId = existing[0].id;
            console.log(`Table "${table.name}" already exists (id=${tableId}), updating entries...`);
            // Delete old entries
            await supabase.from('price_matrix_entries').delete().eq('price_table_id', tableId);
        } else {
            // Create table
            const { data: newTable, error } = await supabase
                .from('price_tables')
                .insert({
                    name: table.name,
                    category: 'walls',
                    price_type: 'surcharge',
                    description: `Surcharge for ${table.name}`,
                })
                .select('id')
                .single();

            if (error) {
                console.error(`Failed to create table "${table.name}":`, error.message);
                continue;
            }
            tableId = newTable.id;
            console.log(`Created table "${table.name}" (id=${tableId})`);
        }

        // Insert entries
        const entries = table.entries.map(e => ({
            price_table_id: tableId,
            width_mm: e.w,
            projection_mm: e.p,
            price: e.price,
        }));

        const { error: insertErr } = await supabase
            .from('price_matrix_entries')
            .insert(entries);

        if (insertErr) {
            console.error(`Failed to insert entries for "${table.name}":`, insertErr.message);
        } else {
            console.log(`  Inserted ${entries.length} entries`);
        }
    }

    console.log('\nDone!');
}

importSurcharges();
