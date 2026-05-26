// Debug & fix: Designline + Markise + Verticale Zonwering
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

interface Result {
  product: string; width: number; depth: number;
  aluxePrice: number | null; customerGross: number | null; error: string | null;
}

async function extractPrice(page: Page): Promise<number | null> {
  const prices = await page.evaluate(`(function() {
    var r = [];
    var cart = document.querySelector('#cart');
    if (cart) { cart.querySelectorAll('td.price').forEach(function(td) { r.push(td.textContent.trim()); }); }
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) { var t = walker.currentNode.textContent.trim(); if (t.indexOf('€') !== -1 && t.length < 50) r.push(t); }
    return r;
  })()`) as string[];
  for (const text of prices) {
    const c = text.replace(/[^0-9.,]/g, '');
    if (!c) continue;
    let v: number;
    if (c.includes(',') && c.includes('.')) v = parseFloat(c.replace(/\./g, '').replace(',', '.'));
    else if (c.includes(',')) v = parseFloat(c.replace(',', '.'));
    else v = parseFloat(c);
    if (v && v > 50) return v;
  }
  return null;
}

async function startOrder(page: Page, ck: string, ref: string) {
  await page.goto(`https://bestellen.aluxe.nl/dealer/?cookie_key=${ck}`, { waitUntil: 'networkidle', timeout: 12000 }).catch(() => {});
  await page.goto(`https://bestellen.aluxe.nl/dealer/dealer-order/informatie/?cookie_key=${ck}`, { waitUntil: 'networkidle', timeout: 12000 });
  const r = await page.$('#reference'); if (r) await r.fill(ref);
  await page.click('#next'); await page.waitForLoadState('networkidle');
}

async function submitAndGetPrice(page: Page): Promise<number | null> {
  await page.click('#next'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(500);
  const m = await page.$('.rel-materialen'); if (m) { await m.click(); await page.waitForLoadState('networkidle'); }
  return extractPrice(page);
}

async function main() {
  const resultsDir = path.resolve(__dirname, '../recordings/auto');
  fs.mkdirSync(resultsDir, { recursive: true });

  console.log('  🔧 Fixing: Designline, Markise, ZIP Screen\n');

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'de-DE', ignoreHTTPSErrors: true });
  const page = await ctx.newPage();

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
  console.log('  ✅ Logged in\n');

  const results: Result[] = [];

  // === DESIGNLINE ===
  // Key differences: color must be 9005/9010/db703 (no 7016!), has glass roof
  console.log('  ═══ Designline ═══');
  const designSizes = [
    { w: 3000, d: 2500 }, { w: 4000, d: 3000 }, { w: 5000, d: 3500 }, { w: 6000, d: 4000 }, { w: 7000, d: 5000 },
  ];
  for (const s of designSizes) {
    process.stdout.write(`    ${s.w}×${s.d}... `);
    try {
      await startOrder(page, ck, `DL-${s.w}x${s.d}`);
      await page.goto(`https://bestellen.aluxe.nl/dealer/dealer-order/product/?product_id=${ALUXE_PRODUCTS.designline}&cookie_key=${ck}`, { waitUntil: 'networkidle', timeout: 15000 });

      // Fill width (text input + suggestor select)
      await page.fill('#width', String(s.w));
      await page.waitForTimeout(200);
      
      // Fill depth
      await page.fill('#depth', String(s.d));
      await page.waitForTimeout(200);

      // Color: Designline only has 9010, 9005, db703 (NO 7016!)
      await page.selectOption('#color', '9005').catch(() => {});
      await page.waitForTimeout(200);

      // Height front
      const hf = await page.$('#height_front');
      if (hf) await page.fill('#height_front', '2200').catch(() => {});

      // Roof type (VSG 8mm klar = default, already selected)
      // dakplaten already has default: 4715dc6ccf4dff9

      // Checkbox goot_warning — needs to be checked/accepted
      const gootWarn = await page.$('#goot_warning');
      if (gootWarn) {
        const isChecked = await page.evaluate(`document.querySelector('#goot_warning')?.checked`);
        if (!isChecked) await page.check('#goot_warning').catch(() => {});
      }

      const price = await submitAndGetPrice(page);
      if (price) {
        const p = calculateCustomerPrice({ aluxeNetPrice: price });
        console.log(`${formatEUR(price).padStart(12)} → ${formatEUR(p.customerGrossPrice).padStart(12)}`);
        results.push({ product: 'Designline', width: s.w, depth: s.d, aluxePrice: price, customerGross: p.customerGrossPrice, error: null });
      } else {
        // Debug: take screenshot
        await page.screenshot({ path: path.join(resultsDir, `debug_designline_${s.w}.png`), fullPage: true });
        
        // Check for validation errors
        const errors = await page.evaluate(`(function() {
          var e = []; document.querySelectorAll('.error, .warning, .message, [class*=error]').forEach(function(el) {
            var t = el.textContent.trim(); if (t && t.length < 200) e.push(t);
          }); return e;
        })()`);
        console.log(`❌ (errors: ${JSON.stringify(errors).substring(0, 100)})`);
        
        // Also check current URL
        console.log(`    URL: ${page.url()}`);
        results.push({ product: 'Designline', width: s.w, depth: s.d, aluxePrice: null, customerGross: null, error: JSON.stringify(errors) });
      }
    } catch (err) {
      console.log(`❌ ${(err as Error).message.substring(0, 60)}`);
      results.push({ product: 'Designline', width: s.w, depth: s.d, aluxePrice: null, customerGross: null, error: (err as Error).message });
    }
  }

  // === MARKISE ===
  console.log('\n  ═══ Markise (Aufdach ZIP) ═══');
  const markiseSizes = [
    { w: 3000, d: 2500, fields: 1 }, { w: 4000, d: 3000, fields: 1 }, { w: 5000, d: 3500, fields: 2 },
    { w: 6000, d: 4000, fields: 2 }, { w: 7000, d: 5000, fields: 2 },
  ];
  for (const s of markiseSizes) {
    process.stdout.write(`    ${s.w}×${s.d}... `);
    try {
      await startOrder(page, ck, `Mark-${s.w}x${s.d}`);
      await page.goto(`https://bestellen.aluxe.nl/dealer/dealer-order/product/?product_id=${ALUXE_PRODUCTS.markise}&cookie_key=${ck}`, { waitUntil: 'networkidle', timeout: 15000 });

      // Roof type (Trendline = TR)
      await page.selectOption('#rooftype', 'TR').catch(() => {});
      await page.waitForTimeout(300);

      // Roof dimensions
      await page.fill('#roofwidth', String(s.w));
      await page.fill('#roofdepth', String(s.d));
      
      // Number of fields (required!)
      await page.fill('#numberoffields', String(s.fields));

      // Markise type (Aufdachmarkise ZIP)
      // Default is already "Aufdachmarkise W350" = ZIP

      // Motor
      await page.selectOption('#motor', 'links').catch(() => {});

      // Color
      await page.selectOption('#color', '7016').catch(() => {});
      
      // Cloth color (required text field)
      await page.fill('#colorcloth', 'grau').catch(() => {});

      const price = await submitAndGetPrice(page);
      if (price) {
        const p = calculateCustomerPrice({ aluxeNetPrice: price });
        console.log(`${formatEUR(price).padStart(12)} → ${formatEUR(p.customerGrossPrice).padStart(12)}`);
        results.push({ product: 'Markise ZIP', width: s.w, depth: s.d, aluxePrice: price, customerGross: p.customerGrossPrice, error: null });
      } else {
        await page.screenshot({ path: path.join(resultsDir, `debug_markise_${s.w}.png`), fullPage: true });
        const errors = await page.evaluate(`(function() {
          var e = []; document.querySelectorAll('.error, .warning, .message, [class*=error]').forEach(function(el) {
            var t = el.textContent.trim(); if (t && t.length < 200) e.push(t);
          }); return e;
        })()`);
        console.log(`❌ (errors: ${JSON.stringify(errors).substring(0, 100)}) URL: ${page.url()}`);
        results.push({ product: 'Markise ZIP', width: s.w, depth: s.d, aluxePrice: null, customerGross: null, error: JSON.stringify(errors) });
      }
    } catch (err) {
      console.log(`❌ ${(err as Error).message.substring(0, 60)}`);
      results.push({ product: 'Markise ZIP', width: s.w, depth: s.d, aluxePrice: null, customerGross: null, error: (err as Error).message });
    }
  }

  // === VERTICALE ZONWERING (ZIP Screen) ===
  console.log('\n  ═══ ZIP Screen (Verticale Zonwering) ═══');
  const zipSizes = [
    { w: 1500, d: 2000 }, { w: 2000, d: 2000 }, { w: 2500, d: 2500 }, { w: 3000, d: 2500 },
  ];
  for (const s of zipSizes) {
    process.stdout.write(`    ${s.w}×${s.d}... `);
    try {
      await startOrder(page, ck, `ZIP-${s.w}x${s.d}`);
      await page.goto(`https://bestellen.aluxe.nl/dealer/dealer-order/product/?product_id=${ALUXE_PRODUCTS.verticale_zonwering}&cookie_key=${ck}`, { waitUntil: 'networkidle', timeout: 15000 });

      await page.fill('#width', String(s.w));
      await page.fill('#depth', String(s.d)); // depth = height for ZIP
      await page.selectOption('#color', '7016').catch(() => {});
      await page.fill('#sun_color', '').catch(() => {}); // cloth color, optional

      const price = await submitAndGetPrice(page);
      if (price) {
        const p = calculateCustomerPrice({ aluxeNetPrice: price });
        console.log(`${formatEUR(price).padStart(12)} → ${formatEUR(p.customerGrossPrice).padStart(12)}`);
        results.push({ product: 'ZIP Screen', width: s.w, depth: s.d, aluxePrice: price, customerGross: p.customerGrossPrice, error: null });
      } else {
        await page.screenshot({ path: path.join(resultsDir, `debug_zip_${s.w}.png`), fullPage: true });
        console.log('❌');
        results.push({ product: 'ZIP Screen', width: s.w, depth: s.d, aluxePrice: null, customerGross: null, error: 'no price' });
      }
    } catch (err) {
      console.log(`❌ ${(err as Error).message.substring(0, 60)}`);
      results.push({ product: 'ZIP Screen', width: s.w, depth: s.d, aluxePrice: null, customerGross: null, error: (err as Error).message });
    }
  }

  // Save
  fs.writeFileSync(path.join(resultsDir, 'fixed_products.json'), JSON.stringify(results, null, 2));

  // Summary
  console.log('\n  ══════════════════════════════════════════');
  const valid = results.filter(r => r.aluxePrice);
  console.log(`  📊 ${valid.length}/${results.length} cen pobranych`);
  const grouped = new Map<string, Result[]>();
  for (const r of results) { if (!grouped.has(r.product)) grouped.set(r.product, []); grouped.get(r.product)!.push(r); }
  for (const [name, items] of grouped) {
    const v = items.filter(r => r.aluxePrice);
    if (v.length === 0) { console.log(`  ❌ ${name}`); continue; }
    console.log(`  ✅ ${name}: ${formatEUR(Math.min(...v.map(r=>r.aluxePrice!)))} — ${formatEUR(Math.max(...v.map(r=>r.aluxePrice!)))}`);
  }

  await ctx.close();
  await browser.close();
  console.log('\n  🏁 Done.');
}

main().catch(console.error);
