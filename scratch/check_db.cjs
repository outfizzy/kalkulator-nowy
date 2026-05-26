const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  try {
    const { count: contractCount, error: errC } = await supabase.from('contracts').select('*', { count: 'exact', head: true });
    const { count: installationCount, error: errI } = await supabase.from('installations').select('*', { count: 'exact', head: true });
    const { count: realizationCount, error: errR } = await supabase.from('realizations').select('*', { count: 'exact', head: true });

    console.log("Contracts count:", contractCount, "Error:", errC);
    console.log("Installations count:", installationCount, "Error:", errI);
    console.log("Realizations count:", realizationCount, "Error:", errR);

    // Fetch up to 3 realizations to see their structure
    if (realizationCount > 0) {
      const { data: realizations, error: errR2 } = await supabase.from('realizations').select('*').limit(3);
      console.log("\nSample Realizations:", JSON.stringify(realizations, null, 2));
    }

    // Fetch up to 3 contracts to see their structure
    if (contractCount > 0) {
      const { data: contracts, error: errC2 } = await supabase.from('contracts').select('*').limit(3);
      console.log("\nSample Contracts (raw database rows):", JSON.stringify(contracts, null, 2));
    }
  } catch (error) {
    console.error("Connection failed:", error);
  }
}

check();
