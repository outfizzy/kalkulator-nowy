
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function getMainProducts() {
    const { data } = await supabase
        .from('product_definitions')
        .select('id, code, name, description, category')
        .in('category', ['roof', 'carport'])
        .order('name');

    if (!data) return [];

    // STRICT WHITELIST
    const whitelistMap: Record<string, string> = {
        'orangestyle': 'Orangestyle (Orangeline)',
        'trendstyle': 'Trendstyle (Trendline)',
        'topstyle': 'Topstyle',
        'ultrastyle': 'Ultrastyle (Ultraline)',
        'skystyle': 'Skystyle (Skyline)',
        'carport': 'Carport'
    };

    const filtered = data.filter(p => {
        if (p.code.includes('markise') || p.code.includes('screen')) return false;
        return Object.keys(whitelistMap).some(key => p.code.startsWith(key));
    });

    // Map Names
    const mapped = filtered.map(p => {
        const key = Object.keys(whitelistMap).find(k => p.code.startsWith(k));
        if (!key) return p;

        let displayName = whitelistMap[key];

        // If it's a "Plus" variant, adjust the name
        if (p.code.includes('_plus') || p.name.includes('+')) {
            displayName = displayName.replace(/\)/, '+)').replace(/ \(/, '+ (');
        }

        if (p.code.includes('_xl') || p.name.includes('XL')) {
            displayName += ' XL';
        }

        return { ...p, name: displayName };
    });

    const priority = ['orangestyle', 'trendstyle', 'topstyle', 'ultrastyle', 'skystyle', 'carport'];

    return mapped.sort((a, b) => {
        const idxA = priority.findIndex(p => a.code.startsWith(p));
        const idxB = priority.findIndex(p => b.code.startsWith(p));

        if (idxA !== -1 && idxB !== -1) {
            if (idxA === idxB) return a.code.length - b.code.length;
            return idxA - idxB;
        }
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.name.localeCompare(b.name);
    });
}

getMainProducts().then(res => {
    console.log("--- Main Products List ---");
    res.forEach(p => console.log(`[${p.code}] ${p.name}`));
});
