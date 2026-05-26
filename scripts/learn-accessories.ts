// ============================================================================
// Learn Panorama Schiebewand + Accessories pricing
// ============================================================================

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium, Page } from 'playwright';
import fs from 'fs';
import { ALUXE_PRODUCTS } from '../src/automation/worker/aluxe-automator';
import { calculateCustomerPrice, formatEUR } from '../src/automation/worker/pricing-engine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Panorama widths/heights to test
const PANORAMA_SIZES = [
  { width: 2000, height: 2200 },
  { width: 2500, height: 2200 },
  { width: 3000, height: 2200 },
  { width: 4000, height: 2200 },
  { width: 5000, height: 2200 },
  { width: 3000, height: 2500 },
];

const PANORAMA_PRODUCTS = [
  { key: 'panorama_al25_hoch', name: 'Panorama AL25 hoch', productId: ALUXE_PRODUCTS.panorama_al25_hoch },
  { key: 'panorama_al24', name: 'Panorama AL24', productId: ALUXE_PRODUCTS.panorama_al24 },
  { key: 'panorama_al23_hoch', name: 'Panorama AL23 hoch', productId: ALUXE_PRODUCTS.panorama_al23_hoch },
];

// Seitenwand sizes  
const WALL_SIZES = [
  { width: 2000, height1: 2200, height2: 2600 },
  { width: 3000, height1: 2200, height2: 2600 },
  { width: 4000, height1: 2200, height2: 2600 },
  { width: 5000, height1: 2200, height2: 2600 },
];

const WALL_PRODUCTS = [
  { key: 'feste_seitenelemente', name: 'Feste Seitenelemente', productId: ALUXE_PRODUCTS.feste_seitenelemente },
  { key: 'keilfenster', name: 'Keilfenster', productId: ALUXE_PRODUCTS.keilfenster },
  { key: 'rahmen_schiebeturen', name: 'Rahmen mit Schiebetüren', productId: ALUXE_PRODUCTS.rahmen_schiebeturen },
  { key: 'frontwand', name: 'Frontwand', productId: ALUXE_PRODUCTS.frontwand },
];

interface Result {
  product: string;
  productId: string;
  width: number;
  height: number;
  height2?: number;
  color: string;
  aluxePrice: number | null;
  customerGross: number | null;
  error: string | null;
}

async function extractPrice(page: Page): Promise<number | null> {
  const price = await page.evaluate(`(function() {
    function parseEU(text) {
      var cleaned = text.replace(/[^\\d.,]/g, '');
      if (!cleaned) return null;
      if (cleaned.indexOf(',') !== -1 && cleaned.indexOf('.') !== -1) {
        if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
          return parseFloat(cleaned.replace(/\\./g, '').replace(',', '.'));
        }
      }
      if (cleaned.indexOf(',') !== -1) {
        var parts = cleaned.split(',');
        if (parts.length === 2 && parts[1].length <= 2) return parseFloat(cleaned.replace(',', '.'));
      }
      return parseFloat(cleaned) || null;
    }
    var cart = document.querySelector('#cart');
    if (!cart) return null;
    var tds = cart.querySelectorAll('table:first-child td');
    for (var i = 0; i < tds.length; i++) {
      var text = (tds[i].textContent || '').trim();
      if (text.indexOf('€') !== -1) {
        var val = parseEU(text);
        if (val && val > 50) return val;
      }
    }
    return null;
  })()`);
  return price as number | null;
}

async function startFreshOrder(page: Page, cookieKey: string, ref: string) {
  await page.goto(`https://bestellen.aluxe.nl/dealer/?cookie_key=${cookieKey}`, {
    waitUntil: 'networkidle', timeout: 15000
  }).catch(() => {});
  await page.goto(`https://bestellen.aluxe.nl/dealer/dealer-order/informatie/?cookie_key=${cookieKey}`, {
    waitUntil: 'networkidle', timeout: 15000
  });
  const refField = await page.$('#reference, [name="reference"]');
  if (refField) await refField.fill(ref);
  const next = await page.$('#next');
  if (next) { await next.click(); await page.waitForLoadState('networkidle'); }
}

async function main() {
  const resultsDir = path.resolve(__dirname, '../recordings/auto');
  fs.mkdirSync(resultsDir, { recursive: true });

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🧠 Learning: Panorama + Seitenwände + Zubehör           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }, locale: 'de-DE', ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // Login
  console.log('  🔑 Logging in...');
  await page.goto('https://bestellen.aluxe.nl', { waitUntil: 'networkidle' });
  await page.fill('#login_username', process.env.ALUXE_USERNAME || 'Polendach24');
  await page.fill('#login_password', process.env.ALUXE_PASSWORD || '');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }).catch(() => {}),
    page.click('input[type=submit]'),
  ]);
  await page.waitForTimeout(2000);
  const loginUrl = page.url();
  const ckMatch = loginUrl.match(/cookie_key=(\d+)/);
  const cookieKey = ckMatch ? ckMatch[1] : '';
  if (!cookieKey) { console.error('❌ Login failed'); await browser.close(); return; }
  console.log(`  ✅ Logged in\n`);

  const allResults: Result[] = [];

  // === PANORAMA SCHIEBEWAND ===
  for (const product of PANORAMA_PRODUCTS) {
    console.log(`\n  📦 ${product.name}`);
    console.log(`  ${'─'.repeat(50)}`);

    for (const size of PANORAMA_SIZES) {
      process.stdout.write(`    ${size.width}×${size.height}... `);
      try {
        await startFreshOrder(page, cookieKey, `Panorama-${product.key}-${size.width}`);
        
        const url = `https://bestellen.aluxe.nl/dealer/dealer-order/product/?product_id=${product.productId}&cookie_key=${cookieKey}`;
        await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });

        // Panorama fields: #width, #height (or #height_1), #color, #tracks
        const widthField = await page.$('#width');
        if (widthField) await page.fill('#width', String(size.width));
        
        const h1 = await page.$('#height_1');
        const h = await page.$('#height');
        if (h1) await page.fill('#height_1', String(size.height));
        else if (h) {
          // height might be a select
          const isSelect = await page.evaluate(`document.querySelector('#height')?.tagName === 'SELECT'`);
          if (isSelect) await page.selectOption('#height', String(size.height)).catch(() => {});
          else await page.fill('#height', String(size.height));
        }

        const colorField = await page.$('#color');
        if (colorField) await page.selectOption('#color', '7016').catch(() => {});

        // Click next
        const next = await page.$('#next');
        if (next) { await next.click(); await page.waitForLoadState('networkidle'); }

        // Go to materialen
        const matLink = await page.$('.rel-materialen');
        if (matLink) { await matLink.click(); await page.waitForLoadState('networkidle'); }

        const aluxePrice = await extractPrice(page);
        if (aluxePrice) {
          const pricing = calculateCustomerPrice({ aluxeNetPrice: aluxePrice });
          console.log(`${formatEUR(aluxePrice).padStart(12)} → ${formatEUR(pricing.customerGrossPrice).padStart(12)}`);
          allResults.push({ product: product.name, productId: product.productId, width: size.width, height: size.height, color: '7016', aluxePrice, customerGross: pricing.customerGrossPrice, error: null });
        } else {
          console.log('❌');
          allResults.push({ product: product.name, productId: product.productId, width: size.width, height: size.height, color: '7016', aluxePrice: null, customerGross: null, error: 'No price' });
        }
      } catch (err) {
        console.log(`❌ ${(err as Error).message.substring(0, 50)}`);
        allResults.push({ product: product.name, productId: product.productId, width: size.width, height: size.height, color: '7016', aluxePrice: null, customerGross: null, error: (err as Error).message });
      }
    }
  }

  // === SEITENWÄNDE ===
  for (const product of WALL_PRODUCTS) {
    console.log(`\n  📦 ${product.name}`);
    console.log(`  ${'─'.repeat(50)}`);

    for (const size of WALL_SIZES) {
      process.stdout.write(`    ${size.width}×${size.height1}... `);
      try {
        await startFreshOrder(page, cookieKey, `Wall-${product.key}-${size.width}`);

        const url = `https://bestellen.aluxe.nl/dealer/dealer-order/product/?product_id=${product.productId}&cookie_key=${cookieKey}`;
        await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });

        // Wall fields: #width, #height_1, #height_2, #color
        await page.fill('#width', String(size.width)).catch(() => {});
        const h1 = await page.$('#height_1');
        if (h1) await page.fill('#height_1', String(size.height1));
        const h2 = await page.$('#height_2');
        if (h2) await page.fill('#height_2', String(size.height2));

        const colorField = await page.$('#color');
        if (colorField) await page.selectOption('#color', '7016').catch(() => {});

        const next = await page.$('#next');
        if (next) { await next.click(); await page.waitForLoadState('networkidle'); }

        const matLink = await page.$('.rel-materialen');
        if (matLink) { await matLink.click(); await page.waitForLoadState('networkidle'); }

        const aluxePrice = await extractPrice(page);
        if (aluxePrice) {
          const pricing = calculateCustomerPrice({ aluxeNetPrice: aluxePrice });
          console.log(`${formatEUR(aluxePrice).padStart(12)} → ${formatEUR(pricing.customerGrossPrice).padStart(12)}`);
          allResults.push({ product: product.name, productId: product.productId, width: size.width, height: size.height1, height2: size.height2, color: '7016', aluxePrice, customerGross: pricing.customerGrossPrice, error: null });
        } else {
          console.log('❌');
          allResults.push({ product: product.name, productId: product.productId, width: size.width, height: size.height1, height2: size.height2, color: '7016', aluxePrice: null, customerGross: null, error: 'No price' });
        }
      } catch (err) {
        console.log(`❌ ${(err as Error).message.substring(0, 50)}`);
        allResults.push({ product: product.name, productId: product.productId, width: size.width, height: size.height1, height2: size.height2, color: '7016', aluxePrice: null, customerGross: null, error: (err as Error).message });
      }
    }
  }

  // Save
  const resultsPath = path.join(resultsDir, 'accessories_pricing.json');
  fs.writeFileSync(resultsPath, JSON.stringify(allResults, null, 2));

  // Summary
  console.log('\n\n  ══════════════════════════════════════════');
  const valid = allResults.filter(r => r.aluxePrice);
  console.log(`  📊 ${valid.length}/${allResults.length} cen pobranych`);
  
  // Group by product
  const grouped = new Map<string, Result[]>();
  for (const r of allResults) {
    if (!grouped.has(r.product)) grouped.set(r.product, []);
    grouped.get(r.product)!.push(r);
  }
  for (const [name, results] of grouped) {
    const v = results.filter(r => r.aluxePrice);
    if (v.length === 0) { console.log(`  ${name}: ❌`); continue; }
    console.log(`  ${name}: ${formatEUR(Math.min(...v.map(r=>r.aluxePrice!)))} — ${formatEUR(Math.max(...v.map(r=>r.aluxePrice!)))}`);
  }

  await context.close();
  await browser.close();
  console.log('\n  🏁 Done.');
}

main().catch(console.error);
