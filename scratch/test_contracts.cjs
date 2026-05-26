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
  const { data: installations, error } = await supabase
    .from('installations')
    .select('*')
    .limit(5);

  if (error) {
    console.error("Error fetching installations:", error);
    return;
  }

  console.log("INSTALLATIONS FETCHED:", installations.length);
  installations.forEach((r, idx) => {
    console.log(`\n--- Installation ${idx + 1} (id: ${r.id}) ---`);
    console.log("installation_data:", JSON.stringify(r.installation_data, null, 2));
  });
}

test();
