// ============================================================================
// Auto-explore Aluxe configurator
// 1. Login
// 2. Discover all available products
// 3. Run price tests with different configurations
// 4. Save results to JSON
// ============================================================================

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import fs from 'fs';
import { AluxeAutomator, AluxeConfig } from '../src/automation/worker/aluxe-automator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Test configurations - systematically varying parameters
const TEST_CONFIGS: AluxeConfig[] = [
  // Basic small: 3000x2000, anthracite
  {
    width: 3000, depth: 2000, color: '7016',
    height: '2400', staanderType: '0',
    heightFront: 2200,
  },
  // Medium: 4000x3000, white
  {
    width: 4000, depth: 3000, color: '9010',
    height: '2400', staanderType: '0',
    heightFront: 2200,
  },
  // Large: 5000x4000, grey aluminum
  {
    width: 5000, depth: 4000, color: '9007',
    height: '2400', staanderType: '0',
    heightFront: 2200,
  },
  // XL: 6000x4500, black
  {
    width: 6000, depth: 4500, color: '9005',
    height: '2400', staanderType: '0',
    heightFront: 2200,
  },
  // Max: 7000x5000, anthracite, taller posts
  {
    width: 7000, depth: 5000, color: '7016',
    height: '3000', staanderType: '0',
    heightFront: 2500,
  },
  // With extras: 4000x3000, with LED
  {
    width: 4000, depth: 3000, color: '7016',
    height: '2400', staanderType: '1', // Klassik
    verlichting: 'd8fa7e4ed2c6116', // 10er LED set
    heightFront: 2200,
  },
  // Freestanding: 5000x3500
  {
    width: 5000, depth: 3500, color: '7016',
    height: '2400', staanderType: '0',
    freestanding: '1',
    heightFront: 2200,
  },
];

async function main() {
  const resultsDir = path.resolve(__dirname, '../recordings/auto');
  fs.mkdirSync(resultsDir, { recursive: true });

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     🤖 Aluxe Auto-Explorer & Price Tester              ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
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

  try {
    // Step 1: Login
    await automator.login();

    // Step 2: Discover products
    console.log('\n📦 Phase 1: Product Discovery');
    console.log('─'.repeat(50));
    const products = await automator.discoverProducts();
    
    // Save product catalog
    const catalogPath = path.join(resultsDir, 'product_catalog.json');
    fs.writeFileSync(catalogPath, JSON.stringify(products, null, 2));
    console.log(`  💾 Saved product catalog: ${products.length} products → ${catalogPath}`);
    
    // Print product summary
    products.forEach(p => {
      console.log(`  📦 ${p.category} → ${p.name} (${p.productId})`);
      console.log(`     Fields: ${p.fields.length}, Sections: ${p.sections.join(', ')}`);
    });

    // Step 3: Run price tests
    console.log('\n💰 Phase 2: Price Tests');
    console.log('─'.repeat(50));
    
    const results = await automator.runPriceTest(TEST_CONFIGS);
    
    // Save results
    const resultsPath = path.join(resultsDir, 'price_test_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n  💾 Saved price results → ${resultsPath}`);
    
    // Print summary
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                    RESULTS SUMMARY                      ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log();
    
    console.log('  Width  | Depth  | Color | Posts   | Product    | Total');
    console.log('  -------|--------|-------|---------|------------|-------');
    
    results.forEach((r, i) => {
      const c = TEST_CONFIGS[i];
      const productStr = r.productPrice ? `€ ${r.productPrice.toFixed(2)}` : 'ERROR';
      const totalStr = r.totalPrice ? `€ ${r.totalPrice.toFixed(2)}` : 'ERROR';
      console.log(`  ${String(c.width).padStart(5)}  | ${String(c.depth).padStart(5)}  | ${c.color}  | ${c.height}mm | ${productStr.padStart(10)} | ${totalStr}`);
    });
    
    console.log();
    console.log(`  ✅ ${results.filter(r => r.totalPrice).length}/${results.length} tests produced prices`);
    
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
