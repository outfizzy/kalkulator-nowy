const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase configuration in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: contracts, error } = await supabase
    .from('contracts')
    .select('*')
    .limit(3);

  if (error) {
    console.error("Error fetching contracts:", error);
    return;
  }

  console.log("CONTRACTS FETCHED:");
  contracts.forEach((c, idx) => {
    console.log(`\n--- Contract ${idx + 1} (id: ${c.id}) ---`);
    console.log("contract_data:", JSON.stringify(c.contract_data, null, 2));
  });
}

test();
