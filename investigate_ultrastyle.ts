
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function investigate() {
    console.log("Investigating Ultrastyle products...");

    // 1. Find Product
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, name, slug')
        .ilike('name', '%ultra%');

    if (prodError) {
        console.error("Error fetching products:", prodError);
        return;
    }

    console.log(`Found ${products.length} products with 'ultra':`);
    products.forEach(p => console.log(`- ${p.name} (${p.id})`));

    if (products.length === 0) return;

    // 2. Check Price Lists for these products
    for (const p of products) {
        const { data: lists, error: listError } = await supabase
            .from('price_lists')
            .select('id, name, product_id, is_active')
            .eq('product_id', p.id);

        if (listError) console.error(`Error fetching lists for ${p.name}:`, listError);
        else {
            console.log(`Price Lists for ${p.name}:`, lists);

            // 3. Check items for the first list found
            if (lists && lists.length > 0) {
                const listId = lists[0].id;
                const { count, error: countError } = await supabase
                    .from('price_list_items')
                    .select('*', { count: 'exact', head: true })
                    .eq('price_list_id', listId);

                console.log(`- List '${lists[0].name}' (${listId}) has ${count} items.`);
            }
        }
    }
}

investigate();
