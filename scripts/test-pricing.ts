// ============================================================================
// Full pricing test: Aluxe → Polendach24 customer price
// Tests multiple products and dimensions, applies pricing rules
// ============================================================================

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import fs from 'fs';
import { AluxeAutomator, ALUXE_PRODUCTS, AluxeConfig } from '../src/automation/worker/aluxe-automator';
import { calculateCustomerPrice, formatEUR } from '../src/automation/worker/pricing-engine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// ============================================================================
// Test matrix: different sizes for Trendstyle (= Trendline) mit Platten
// ============================================================================
const TRENDSTYLE_TESTS: AluxeConfig[] = [
  // Small
  { width: 3000, depth: 2000, color: '7016', height: '2400', heightFront: 2200 },
  { width: 3000, depth: 2500, color: '7016', height: '2400', heightFront: 2200 },
  { width: 3000, depth: 3000, color: '7016', height: '2400', heightFront: 2200 },
  // Medium
  { width: 4000, depth: 2500, color: '7016', height: '2400', heightFront: 2200 },
  { width: 4000, depth: 3000, color: '7016', height: '2400', heightFront: 2200 },
  { width: 4000, depth: 3500, color: '7016', height: '2400', heightFront: 2200 },
  { width: 4000, depth: 4000, color: '7016', height: '2400', heightFront: 2200 },
  // Large
  { width: 5000, depth: 3000, color: '7016', height: '2400', heightFront: 2200 },
  { width: 5000, depth: 4000, color: '7016', height: '2400', heightFront: 2200 },
  { width: 5000, depth: 5000, color: '7016', height: '2400', heightFront: 2200 },
  // XL
  { width: 6000, depth: 3500, color: '7016', height: '2400', heightFront: 2200 },
  { width: 6000, depth: 5000, color: '7016', height: '2400', heightFront: 2200 },
  // XXL
  { width: 7000, depth: 4000, color: '7016', height: '2400', heightFront: 2200 },
  { width: 7000, depth: 5000, color: '7016', height: '3000', heightFront: 2500 },
  // Color variations at 5000x3000
  { width: 5000, depth: 3000, color: '9010', height: '2400', heightFront: 2200 },  // white
  { width: 5000, depth: 3000, color: '9005', height: '2400', heightFront: 2200 },  // black
  { width: 5000, depth: 3000, color: '9007', height: '2400', heightFront: 2200 },  // grey alu
];

async function main() {
  const resultsDir = path.resolve(__dirname, '../recordings/auto');
  fs.mkdirSync(resultsDir, { recursive: true });

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  🏗️  Polendach24 Price Calculator — Aluxe Trendstyle   ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log();
  console.log('  Reguły cenowe:');
  console.log('  • Marża: 40% na cenę Aluxe netto');
  console.log('  • Minimum: €2.000 marży na małych dachach');
  console.log('  • Montaż: nie wliczany (do dodania później)');
  console.log('  • MwSt: 19%');
  console.log();

  const browser = await chromium.launch({ headless: true });
  const automator = new AluxeAutomator(
    browser,
    {
      username: process.env.ALUXE_USERNAME || 'Polendach24',
      password: process.env.ALUXE_PASSWORD || '',
    },
    resultsDir
  );

  const results: { config: AluxeConfig; aluxePrice: number | null; customerPrice: any }[] = [];

  try {
    // Login
    await automator.login();

    console.log(`\n  📦 Testing: Trendstyle mit Platten (${TRENDSTYLE_TESTS.length} configurations)`);
    console.log('─'.repeat(60));

    for (let i = 0; i < TRENDSTYLE_TESTS.length; i++) {
      const config = TRENDSTYLE_TESTS[i];
      console.log(`\n  [${i + 1}/${TRENDSTYLE_TESTS.length}] ${config.width}×${config.depth} ${config.color}...`);

      try {
        // Start fresh order for each test to avoid cart accumulation
        await automator.startNewOrder();
        
        const priceResult = await automator.configureTrendline(config);
        const aluxePrice = priceResult.productPrice;

        if (aluxePrice && aluxePrice > 0) {
          const pricing = calculateCustomerPrice({ aluxeNetPrice: aluxePrice });
          results.push({ config, aluxePrice, customerPrice: pricing });
          
          const minFlag = pricing.minimumMarginApplied ? '⚠️ MIN €2k' : '✅ 40%';
          console.log(`    Aluxe: ${formatEUR(aluxePrice)} → Klient netto: ${formatEUR(pricing.customerNetPrice)} → brutto: ${formatEUR(pricing.customerGrossPrice)} [${minFlag}]`);
        } else {
          results.push({ config, aluxePrice: null, customerPrice: null });
          console.log(`    ❌ No price detected`);
        }
      } catch (err) {
        console.error(`    ❌ Error: ${(err as Error).message}`);
        results.push({ config, aluxePrice: null, customerPrice: null });
      }
    }

    // Save results
    const resultsPath = path.join(resultsDir, 'trendstyle_pricing.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

    // Print summary table
    console.log('\n\n╔══════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    TRENDSTYLE MIT PLATTEN — CENNIK                                  ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝');
    console.log();
    console.log('  Breite | Tiefe  | Farbe | Aluxe netto  | Marża        | Klient netto | Klient brutto');
    console.log('  -------|--------|-------|------------- |------------- |------------- |--------------');

    for (const r of results) {
      if (!r.aluxePrice || !r.customerPrice) {
        console.log(`  ${String(r.config.width).padStart(5)}  | ${String(r.config.depth).padStart(5)}  | ${r.config.color}  |    ERROR     |     ---      |     ---      |     ---`);
        continue;
      }
      const p = r.customerPrice;
      const minFlag = p.minimumMarginApplied ? '(MIN)' : ' 40% ';
      console.log(
        `  ${String(r.config.width).padStart(5)}  | ${String(r.config.depth).padStart(5)}  | ${r.config.color}  | ${formatEUR(r.aluxePrice).padStart(12)} | ${formatEUR(p.marginAmount).padStart(8)} ${minFlag} | ${formatEUR(p.customerNetPrice).padStart(12)} | ${formatEUR(p.customerGrossPrice).padStart(13)}`
      );
    }

    // Summary stats
    const validResults = results.filter(r => r.aluxePrice);
    const minCount = validResults.filter(r => r.customerPrice?.minimumMarginApplied).length;
    console.log(`\n  📊 ${validResults.length}/${results.length} cen pobrane pomyślnie`);
    console.log(`  📊 ${minCount} konfiguracji z minimum €2.000 marży`);
    console.log(`  📊 ${validResults.length - minCount} konfiguracji z 40% marżą`);

    if (validResults.length > 0) {
      const prices = validResults.map(r => r.customerPrice.customerGrossPrice);
      console.log(`\n  💰 Zakres cenowy (brutto): ${formatEUR(Math.min(...prices))} — ${formatEUR(Math.max(...prices))}`);
    }

  } catch (err) {
    console.error('❌ Fatal error:', (err as Error).message);
    console.error((err as Error).stack);
  } finally {
    await automator.close();
    await browser.close();
    console.log('\n  🏁 Done.');
  }
}

main().catch(console.error);
