const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('imports/Aluxe Preisliste UPE 2026_DE.xlsx');

// Helper to extract pricing data
function extractPrices(sheetName) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return null;
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const prices = [];
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row[0] && typeof row[0] === 'string' && row[0].match(/^\d+x\d+/)) {
            const dim = row[0].replace(/[*+\s]/g, '');
            const parts = dim.split('x');
            const w = parseInt(parts[0]);
            const p = parseInt(parts[1]);
            const price = row[3]; // inkl. Dacheindeckung
            if (w && p && price) {
                prices.push({ w, p, price: Math.round(price * 100) / 100 });
            }
        }
    }
    return prices;
}

// Sheet mappings for missing models
const modelSheets = {
    'Orangeline Poly Zone 1': 'Orangeline  Polycarbonat Zone1R',
    'Orangeline Poly Zone 2': 'Orangeline Polycarbonat 1a&2R',
    'Orangeline Poly Zone 3': 'Orangeline Polycarbonat 2a&3R',
    'Orangeline Glass Zone 1': 'Orangeline Glas zone 1R',
    'Orangeline Glass Zone 2': 'Orangeline Glas zone 1a&2R',
    'Orangeline Glass Zone 3': 'Orangeline Glas zone 2a&3R',
    'Orangeline+ Poly Zone 1': 'Orangeline+ Polycarbonat Zone1R',
    'Orangeline+ Poly Zone 2': 'Orangeline+ Polycarbonat 1a&2R',
    'Orangeline+ Poly Zone 3': 'Orangeline+ Polycarbonat 2a&3R',
    'Orangeline+ Glass Zone 1': 'Orangeline+ Glas zone 1R',
    'Orangeline+ Glass Zone 2': 'Orangeline+ Glas zone 1a&2R',
    'Orangeline+ Glass Zone 3': 'Orangeline+ Glas zone 2a&3R',
    'Trendline+ Poly Zone 1': 'Trendline+ Polycarbonat Zone1R',
    'Trendline+ Poly Zone 2': 'Trendline+ Polycarbonat 1a&2R',
    'Trendline+ Poly Zone 3': 'Trendline+ Polycarbonat 2a&3R ',
    'Trendline+ Glass Zone 1': 'Trendline+ Glas zone 1R',
    'Trendline+ Glass Zone 2': 'Trendline+ Glas 1a & 2R',
    'Trendline+ Glass Zone 3': 'Trendline+ Glas 2a & 3R',
    'Designline Zone 1': 'Designline Zone 1R',
    'Designline Zone 2': 'Designline Zone 1a+2R',
    'Designline Zone 3': 'Designline Zone 2a+3R',
};

const results = {};

for (const [key, sheetName] of Object.entries(modelSheets)) {
    const prices = extractPrices(sheetName);
    if (prices && prices.length > 0) {
        results[key] = prices;
    } else {
        results[key] = { error: 'Sheet not found or empty', sheet: sheetName };
    }
}

console.log(JSON.stringify(results, null, 2));
