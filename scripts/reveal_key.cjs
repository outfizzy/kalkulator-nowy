
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
console.log('Keys:', Object.keys(process.env).filter(k => k.includes('VITE') || k.includes('NEXT') || k.includes('SUPABASE')));
console.log('ANON:', process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
console.log('SERVICE:', process.env.SUPABASE_SERVICE_ROLE_KEY);
