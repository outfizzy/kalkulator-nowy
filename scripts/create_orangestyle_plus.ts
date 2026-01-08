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

async function createOrangestylePlus() {
    console.log('Creating/Checking Orangestyle+ ...');

    // 1. Get Orangestyle for cloning
    const { data: orangestyle, error: osError } = await supabase
        .from('product_definitions')
        .select('*')
        .eq('name', 'Orangestyle')
        .single();

    if (osError || !orangestyle) {
        console.error('Orangestyle base not found!', osError);
        return;
    }

    // 2. Check if Orangestyle+ exists
    const { data: existing, error: existError } = await supabase
        .from('product_definitions')
        .select('*')
        .eq('name', 'Orangestyle+')
        .single();

    if (existing) {
        console.log('Orangestyle+ already exists. ID:', existing.id);
        return;
    }

    // 3. Clone
    const newProduct = {
        ...orangestyle,
        id: undefined, // Let DB gen ID
        name: 'Orangestyle+',
        code: 'orangestyle_plus', // Unique code
        created_at: undefined,
        updated_at: undefined
    };

    const { data: created, error: createError } = await supabase
        .from('product_definitions')
        .insert(newProduct)
        .select()
        .single();

    if (createError) {
        console.error('Error creating Orangestyle+:', createError);
    } else {
        console.log('Created Orangestyle+ successfully! ID:', created.id);
    }
}

createOrangestylePlus();
