#!/usr/bin/env npx tsx
// ============================================================================
// On-demand price query CLI
// Usage: npx tsx scripts/get-price.ts trendstyle_poly 5000 3500
//        npx tsx scripts/get-price.ts ultraline 6000 4000 --color 9010
// ============================================================================

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { AluxePricingService, PRODUCT_LINE_MAP, type PriceRequest } from '../src/automation/worker/aluxe-pricing-service';
import { formatEUR } from '../src/automation/worker/pricing-engine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3 || args[0] === '--help') {
    console.log(`
  🏗️  Polendach24 On-Demand Pricing

  Usage: npx tsx scripts/get-price.ts <product> <width> <depth> [options]

  Products:
    Zadaszenia:   trendstyle_poly, trendstyle_glas, trendstyle_plus_poly, trendstyle_plus_glas
                  topstyle_poly, topstyle_glas, topstyle_xl_poly, topstyle_xl_glas
                  designline, ultraline, skyline, carport, carport_frei
    Panorama:     panorama_al22, panorama_al23, panorama_al24, panorama_al25, panorama_al26
    Ściany:       feste_seitenelemente, keilfenster, schiebeturen, frontwand
    Inne:         markise

  Options:
    --color <RAL>     Color code (7016, 9010, 9005, 9007) [default: 7016]
    --posts <height>  Post height (2400, 3000) [default: 2400]
    --freestanding    Freestanding construction
    --glass <id>      Glass type product ID

  Example:
    npx tsx scripts/get-price.ts trendstyle_poly 5000 3500
    npx tsx scripts/get-price.ts ultraline 6000 4000 --color 9010
    npx tsx scripts/get-price.ts panorama_al25 3000 2200
    `);
    return;
  }

  const productLine = args[0] as keyof typeof PRODUCT_LINE_MAP;
  const width = parseInt(args[1]);
  const depth = parseInt(args[2]);
  
  // Parse options
  const color = args.includes('--color') ? args[args.indexOf('--color') + 1] : '7016';
  const postHeight = args.includes('--posts') ? args[args.indexOf('--posts') + 1] : '2400';
  const freestanding = args.includes('--freestanding');

  if (!PRODUCT_LINE_MAP[productLine]) {
    console.error(`❌ Unknown product: ${productLine}`);
    console.error(`   Available: ${Object.keys(PRODUCT_LINE_MAP).join(', ')}`);
    return;
  }

  const request: PriceRequest = {
    productLine,
    width,
    depth,
    color,
    postHeight,
    freestanding,
  };

  console.log(`\n  🏗️  Polendach24 On-Demand Pricing`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  Produkt:  ${productLine}`);
  console.log(`  Wymiary:  ${width} × ${depth} mm`);
  console.log(`  Kolor:    ${color}`);
  console.log(`  Słupki:   ${postHeight} mm`);
  if (freestanding) console.log(`  Typ:      Freistehend`);
  console.log(`\n  ⏳ Querying Aluxe...`);

  const service = new AluxePricingService({
    username: process.env.ALUXE_USERNAME || 'Polendach24',
    password: process.env.ALUXE_PASSWORD || '',
  });

  try {
    const result = await service.getPrice(request);

    if (result.success && result.pricing) {
      const p = result.pricing;
      console.log(`\n  ✅ Cena pobrana w ${(result.durationMs / 1000).toFixed(1)}s`);
      console.log(`  ═══════════════════════════════════════`);
      console.log(`  Aluxe netto:        ${formatEUR(result.aluxeNetPrice!).padStart(12)}`);
      console.log(`  Transport:          ${formatEUR(result.aluxeTransport).padStart(12)}`);
      console.log(`  ─────────────────────────────────────`);
      console.log(`  Aluxe razem:        ${formatEUR(p.aluxeTotal).padStart(12)}`);
      console.log(`  Marża (${p.minimumMarginApplied ? 'MIN €2k' : '40%    '}):   ${formatEUR(p.marginAmount).padStart(12)}`);
      console.log(`  ─────────────────────────────────────`);
      console.log(`  Klient netto:       ${formatEUR(p.customerNetPrice).padStart(12)}`);
      console.log(`  MwSt 19%:           ${formatEUR(p.customerVAT).padStart(12)}`);
      console.log(`  ═══════════════════════════════════════`);
      console.log(`  KLIENT BRUTTO:      ${formatEUR(p.customerGrossPrice).padStart(12)}`);
      console.log(`  ═══════════════════════════════════════`);
      console.log(`  Montaż:             nicht inbegriffen`);
    } else {
      console.error(`\n  ❌ Error: ${result.error}`);
    }
    
    // Test multiple queries on same session (should be fast!)
    if (args.includes('--multi')) {
      console.log(`\n  📊 Testing session reuse...`);
      const sizes = [
        { width: 3000, depth: 2500 },
        { width: 5000, depth: 3500 },
        { width: 7000, depth: 5000 },
      ];
      for (const s of sizes) {
        const r2 = await service.getPrice({ ...request, width: s.width, depth: s.depth });
        if (r2.success) {
          console.log(`    ${s.width}×${s.depth}: ${formatEUR(r2.aluxeNetPrice!)} → ${formatEUR(r2.pricing!.customerGrossPrice)} (${(r2.durationMs/1000).toFixed(1)}s)`);
        } else {
          console.log(`    ${s.width}×${s.depth}: ❌ ${r2.error}`);
        }
      }
    }
    
  } finally {
    await service.close();
  }
}

main().catch(console.error);
