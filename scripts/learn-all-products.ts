// ============================================================================
// Comprehensive Aluxe price learning — all product lines — FIXED price extraction
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

// Parse European price format: "€ 1.746,15" → 1746.15
function parseEurPrice(text: string): number | null {
  const cleaned = text.replace(/[^0-9.,]/g, '');
  if (!cleaned) return null;
  // Handle "1.746,15" format (German)
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    }
  }
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      return parseFloat(cleaned.replace(',', '.'));
    }
  }
  return parseFloat(cleaned) || null;
}

// Robust price extraction - searches everywhere on the page for € amounts
async function extractAllPrices(page: Page): Promise<{ product: number | null; total: number | null }> {
  const priceTexts = await page.evaluate(`(function() {
    var results = [];
    // Method 1: td.price in #cart
    var cart = document.querySelector('#cart');
    if (cart) {
      cart.querySelectorAll('td.price').forEach(function(td) {
        results.push({ source: 'cart-td-price', text: td.textContent.trim() });
      });
      cart.querySelectorAll('.total, .grandtotal').forEach(function(el) {
        results.push({ source: 'cart-total', text: el.textContent.trim() });
      });
      // Fallback: any td with €
      cart.querySelectorAll('td').forEach(function(td) {
        var t = td.textContent.trim();
        if (t.indexOf('€') !== -1) results.push({ source: 'cart-td', text: t });
      });
    }
    // Method 2: all text nodes with €
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      var text = walker.currentNode.textContent.trim();
      if (text.indexOf('€') !== -1 && text.length < 50) {
        results.push({ source: 'text-node', text: text });
      }
    }
    return results;
  })()`) as { source: string; text: string }[];
  
  // Find product price (first td.price in cart)
  let productPrice: number | null = null;
  let totalPrice: number | null = null;
  
  for (const p of priceTexts) {
    const val = parseEurPrice(p.text);
    if (!val || val <= 0) continue;
    
    if (p.source === 'cart-td-price' && !productPrice) {
      productPrice = val;
    }
    if (p.source === 'cart-total' || p.source === 'cart-td') {
      // Last € value is typically total
      totalPrice = val;
    }
  }
  
  // Fallback: if no td.price found, use first € text > 100
  if (!productPrice) {
    for (const p of priceTexts) {
      const val = parseEurPrice(p.text);
      if (val && val > 100) {
        productPrice = val;
        break;
      }
    }
  }
  
  return { product: productPrice, total: totalPrice };
}

// Standard test dimensions
const STANDARD_SIZES = [
  { width: 3000, depth: 2500 },
  { width: 4000, depth: 3000 },
  { width: 5000, depth: 3500 },
  { width: 6000, depth: 4000 },
  { width: 7000, depth: 5000 },
];

// ALL product lines
const ALL_PRODUCTS = [
  // Main roofs
  { key: 'trendline_glas', name: 'Trendstyle mit Glas', productId: ALUXE_PRODUCTS.trendline_glas },
  { key: 'trendline_plus_platten', name: 'Trendstyle Plus Poly', productId: ALUXE_PRODUCTS.trendline_plus_platten },
  { key: 'trendline_plus_glas', name: 'Trendstyle Plus Glas', productId: ALUXE_PRODUCTS.trendline_plus_glas },
  { key: 'topline_platten', name: 'Topstyle Poly', productId: ALUXE_PRODUCTS.topline_platten },
  { key: 'topline_glas', name: 'Topstyle Glas', productId: ALUXE_PRODUCTS.topline_glas },
  { key: 'topline_xl_platten', name: 'Topstyle XL Poly', productId: ALUXE_PRODUCTS.topline_xl_platten },
  { key: 'topline_xl_glas', name: 'Topstyle XL Glas', productId: ALUXE_PRODUCTS.topline_xl_glas },
  { key: 'designline', name: 'Designline', productId: ALUXE_PRODUCTS.designline },
  { key: 'ultraline', name: 'Ultraline', productId: ALUXE_PRODUCTS.ultraline },
  { key: 'skyline', name: 'Skyline', productId: ALUXE_PRODUCTS.skyline },
  { key: 'carport', name: 'Carport', productId: ALUXE_PRODUCTS.carport },
  { key: 'carport_frei', name: 'Carport Frei', productId: ALUXE_PRODUCTS.carport_frei },
  // Panorama
  { key: 'panorama_al25', name: 'Panorama AL25', productId: ALUXE_PRODUCTS.panorama_al25_hoch },
  { key: 'panorama_al24', name: 'Panorama AL24', productId: ALUXE_PRODUCTS.panorama_al24 },
  // Walls
  { key: 'feste_seiten', name: 'Feste Seitenelemente', productId: ALUXE_PRODUCTS.feste_seitenelemente },
  { key: 'keilfenster', name: 'Keilfenster', productId: ALUXE_PRODUCTS.keilfenster },
  { key: 'schiebeturen', name: 'Schiebetüren', productId: ALUXE_PRODUCTS.rahmen_schiebeturen },
];

interface TestResult {
  product: string;
  productId: string;
  width: number;
  depth: number;
  aluxePrice: number | null;
  customerGross: number | null;
  minMargin: boolean;
  error: string | null;
}

async function main() {
  const resultsDir = path.resolve(__dirname, '../recordings/auto');
  fs.mkdirSync(resultsDir, { recursive: true });

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🧠 Aluxe Learning v2 — Fixed Price Extraction           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }, locale: 'de-DE', ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // Login
  console.log('  🔑 Logging in...');
  await page.goto('https://bestellen.aluxe.nl', { waitUntil: 'networkidle' });
  await page.fill('#login_username', process.env.ALUXE_USERNAME!);
  await page.fill('#login_password', process.env.ALUXE_PASSWORD!);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }).catch(() => {}),
    page.click('input[type=submit]'),
  ]);
  await page.waitForTimeout(2000);
  const ck = page.url().match(/cookie_key=(\d+)/)?.[1] || '';
  if (!ck) { console.error('❌ Login failed'); await browser.close(); return; }
  console.log(`  ✅ Logged in (${ck})\n`);

  const results: TestResult[] = [];
  let successCount = 0;
  let totalTests = ALL_PRODUCTS.length * STANDARD_SIZES.length;

  for (const product of ALL_PRODUCTS) {
    console.log(`\n  ═══ ${product.name} ═══`);

    for (const size of STANDARD_SIZES) {
      process.stdout.write(`    ${size.width}×${size.depth}... `);
      
      try {
        // 1. Go to dashboard (clean state)
        await page.goto(`https://bestellen.aluxe.nl/dealer/?cookie_key=${ck}`, {
          waitUntil: 'networkidle', timeout: 12000 
        }).catch(() => {});

        // 2. Start new order
        await page.goto(`https://bestellen.aluxe.nl/dealer/dealer-order/informatie/?cookie_key=${ck}`, {
          waitUntil: 'networkidle', timeout: 12000
        });
        
        const ref = await page.$('#reference');
        if (ref) await ref.fill(`L-${product.key}-${size.width}x${size.depth}`);
        await page.click('#next');
        await page.waitForLoadState('networkidle');

        // 3. Navigate to product
        await page.goto(
          `https://bestellen.aluxe.nl/dealer/dealer-order/product/?product_id=${product.productId}&cookie_key=${ck}`,
          { waitUntil: 'networkidle', timeout: 15000 }
        );

        // 4. Fill configuration
        const widthField = await page.$('#width');
        if (!widthField) {
          console.log('⚠️ no #width');
          results.push({ product: product.name, productId: product.productId, width: size.width, depth: size.depth, aluxePrice: null, customerGross: null, minMargin: false, error: 'no #width' });
          continue;
        }

        await page.fill('#width', String(size.width));
        
        // Depth (not all products have it — walls use height instead)
        const depthField = await page.$('#depth');
        if (depthField) {
          await page.fill('#depth', String(size.depth));
        } else {
          // For walls/panorama: fill height_1 with depth value
          const h1 = await page.$('#height_1');
          if (h1) await page.fill('#height_1', String(size.depth));
        }
        
        // Color
        const colorSel = await page.$('#color');
        if (colorSel) {
          await page.selectOption('#color', '7016').catch(() => {});
          await page.waitForTimeout(200);
        }
        
        // Height front (if exists)
        const hf = await page.$('#height_front');
        if (hf) await page.fill('#height_front', '2200').catch(() => {});
        
        // 5. Click next
        await page.click('#next');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        // 6. Try to go to materialen for better price display
        const matLink = await page.$('.rel-materialen');
        if (matLink) {
          await matLink.click();
          await page.waitForLoadState('networkidle');
        }

        // 7. Extract price
        const prices = await extractAllPrices(page);
        
        if (prices.product && prices.product > 0) {
          const pricing = calculateCustomerPrice({ aluxeNetPrice: prices.product });
          const flag = pricing.minimumMarginApplied ? '⚠️MIN' : ' 40%';
          console.log(`${formatEUR(prices.product).padStart(12)} → ${formatEUR(pricing.customerGrossPrice).padStart(12)} [${flag}]`);
          results.push({
            product: product.name, productId: product.productId,
            width: size.width, depth: size.depth,
            aluxePrice: prices.product,
            customerGross: pricing.customerGrossPrice,
            minMargin: pricing.minimumMarginApplied,
            error: null,
          });
          successCount++;
        } else {
          console.log('❌');
          results.push({
            product: product.name, productId: product.productId,
            width: size.width, depth: size.depth,
            aluxePrice: null, customerGross: null, minMargin: false, error: 'no price',
          });
        }
      } catch (err) {
        console.log(`❌ ${(err as Error).message.substring(0, 50)}`);
        results.push({
          product: product.name, productId: product.productId,
          width: size.width, depth: size.depth,
          aluxePrice: null, customerGross: null, minMargin: false, error: (err as Error).message,
        });
      }
    }
  }

  // Save
  const savePath = path.join(resultsDir, 'all_products_v2.json');
  fs.writeFileSync(savePath, JSON.stringify(results, null, 2));

  // === SUMMARY ===
  console.log('\n\n╔══════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    KOMPLETNY CENNIK POLENDACH24                                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════════╝\n');

  const grouped = new Map<string, TestResult[]>();
  for (const r of results) {
    if (!grouped.has(r.product)) grouped.set(r.product, []);
    grouped.get(r.product)!.push(r);
  }

  for (const [name, items] of grouped) {
    const valid = items.filter(i => i.aluxePrice);
    if (valid.length === 0) {
      console.log(`  ❌ ${name}: brak cen (${items[0]?.error || 'unknown'})`);
      continue;
    }
    
    console.log(`\n  📦 ${name}`);
    console.log(`  ${'─'.repeat(65)}`);
    console.log(`  Breite | Tiefe  | Aluxe netto  | Marża       | Klient brutto`);
    
    for (const r of items) {
      if (!r.aluxePrice) {
        console.log(`  ${String(r.width).padStart(5)}  | ${String(r.depth).padStart(5)}  | ❌ ${(r.error || '').substring(0, 30)}`);
      } else {
        const pricing = calculateCustomerPrice({ aluxeNetPrice: r.aluxePrice });
        const flag = r.minMargin ? '(MIN)' : ' 40% ';
        console.log(`  ${String(r.width).padStart(5)}  | ${String(r.depth).padStart(5)}  | ${formatEUR(r.aluxePrice).padStart(12)} | ${formatEUR(pricing.marginAmount).padStart(8)} ${flag} | ${formatEUR(r.customerGross!).padStart(13)}`);
      }
    }
  }

  console.log(`\n  ══════════════════════════════════════════`);
  console.log(`  📊 ${successCount}/${totalTests} cen pobranych pomyślnie`);
  console.log(`  📊 Min €2k: ${results.filter(r => r.minMargin).length} | 40%: ${results.filter(r => r.aluxePrice && !r.minMargin).length}`);

  await context.close();
  await browser.close();
  console.log('\n  🏁 Done.');
}

main().catch(console.error);
