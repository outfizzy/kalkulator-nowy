// Fix remaining products: Designline, Panorama, Seitenwände
// These have different form structures that need specific handling

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

const SIZES = [
  { width: 2000 }, { width: 2500 }, { width: 3000 }, { width: 4000 }, { width: 5000 },
];

interface Result {
  product: string; width: number; height?: number;
  aluxePrice: number | null; customerGross: number | null; minMargin: boolean; error: string | null;
}

async function extractPrice(page: Page): Promise<number | null> {
  const prices = await page.evaluate(`(function() {
    var results = [];
    var cart = document.querySelector('#cart');
    if (cart) {
      cart.querySelectorAll('td.price').forEach(function(td) {
        results.push(td.textContent.trim());
      });
      cart.querySelectorAll('td').forEach(function(td) {
        var t = td.textContent.trim();
        if (t.indexOf('€') !== -1) results.push(t);
      });
    }
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      var text = walker.currentNode.textContent.trim();
      if (text.indexOf('€') !== -1 && text.length < 50) results.push(text);
    }
    return results;
  })()`) as string[];
  
  for (const text of prices) {
    const cleaned = text.replace(/[^0-9.,]/g, '');
    if (!cleaned) continue;
    let val: number;
    if (cleaned.includes(',') && cleaned.includes('.')) {
      val = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    } else if (cleaned.includes(',')) {
      val = parseFloat(cleaned.replace(',', '.'));
    } else {
      val = parseFloat(cleaned);
    }
    if (val && val > 50) return val;
  }
  return null;
}

async function startOrder(page: Page, ck: string, ref: string) {
  await page.goto(`https://bestellen.aluxe.nl/dealer/?cookie_key=${ck}`, { waitUntil: 'networkidle', timeout: 12000 }).catch(() => {});
  await page.goto(`https://bestellen.aluxe.nl/dealer/dealer-order/informatie/?cookie_key=${ck}`, { waitUntil: 'networkidle', timeout: 12000 });
  const refEl = await page.$('#reference');
  if (refEl) await refEl.fill(ref);
  await page.click('#next');
  await page.waitForLoadState('networkidle');
}

async function submitAndGetPrice(page: Page): Promise<number | null> {
  await page.click('#next');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  const matLink = await page.$('.rel-materialen');
  if (matLink) { await matLink.click(); await page.waitForLoadState('networkidle'); }
  return extractPrice(page);
}

async function main() {
  const resultsDir = path.resolve(__dirname, '../recordings/auto');
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🧠 Learning: Panorama + Wände + Designline (FIXED)      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'de-DE', ignoreHTTPSErrors: true });
  const page = await ctx.newPage();

  // Login
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
  console.log(`  ✅ Logged in\n`);

  const results: Result[] = [];

  // === DESIGNLINE ===
  // Designline uses #ultra_type select (classic/style/compact) — check fields
  console.log('  ═══ Designline ═══');
  for (const s of [{ w: 3000, d: 2500 }, { w: 4000, d: 3000 }, { w: 5000, d: 3500 }, { w: 6000, d: 4000 }, { w: 7000, d: 5000 }]) {
    process.stdout.write(`    ${s.w}×${s.d}... `);
    try {
      await startOrder(page, ck, `DL-${s.w}x${s.d}`);
      await page.goto(`https://bestellen.aluxe.nl/dealer/dealer-order/product/?product_id=${ALUXE_PRODUCTS.designline}&cookie_key=${ck}`, { waitUntil: 'networkidle', timeout: 15000 });
      
      // Designline: width, depth, color, height_front + special fields
      await page.fill('#width', String(s.w));
      await page.fill('#depth', String(s.d)).catch(() => {});
      await page.selectOption('#color', '7016').catch(() => {});
      await page.fill('#height_front', '2200').catch(() => {});
      
      // Check for ultra_type
      const ultraType = await page.$('#ultra_type');
      if (ultraType) await page.selectOption('#ultra_type', 'classic').catch(() => {});
      
      const price = await submitAndGetPrice(page);
      if (price) {
        const p = calculateCustomerPrice({ aluxeNetPrice: price });
        console.log(`${formatEUR(price).padStart(12)} → ${formatEUR(p.customerGrossPrice).padStart(12)}`);
        results.push({ product: 'Designline', width: s.w, aluxePrice: price, customerGross: p.customerGrossPrice, minMargin: p.minimumMarginApplied, error: null });
      } else { console.log('❌'); results.push({ product: 'Designline', width: s.w, aluxePrice: null, customerGross: null, minMargin: false, error: 'no price' }); }
    } catch (err) { console.log(`❌ ${(err as Error).message.substring(0, 50)}`); results.push({ product: 'Designline', width: s.w, aluxePrice: null, customerGross: null, minMargin: false, error: (err as Error).message }); }
  }

  // === PANORAMA SCHIEBEWAND ===
  const panoramaProducts = [
    { name: 'Panorama AL25', id: ALUXE_PRODUCTS.panorama_al25_hoch },
    { name: 'Panorama AL24', id: ALUXE_PRODUCTS.panorama_al24 },
    { name: 'Panorama AL23', id: ALUXE_PRODUCTS.panorama_al23_hoch },
  ];

  for (const prod of panoramaProducts) {
    console.log(`\n  ═══ ${prod.name} ═══`);
    for (const s of SIZES) {
      process.stdout.write(`    ${s.width}mm × h2200... `);
      try {
        await startOrder(page, ck, `Pan-${prod.name}-${s.width}`);
        await page.goto(`https://bestellen.aluxe.nl/dealer/dealer-order/product/?product_id=${prod.id}&cookie_key=${ck}`, { waitUntil: 'networkidle', timeout: 15000 });

        // Panorama fields: #width (veranda width), #height (text = wall height)
        await page.fill('#width', String(s.width)).catch(() => {});
        
        // Height can be text or hidden
        const heightField = await page.$('#height');
        if (heightField) {
          const tag = await page.evaluate(`document.querySelector('#height')?.tagName`);
          if (tag === 'SELECT') await page.selectOption('#height', '2200').catch(() => {});
          else await page.fill('#height', '2200').catch(() => {});
        }
        const h1 = await page.$('#height_1');
        if (h1) await page.fill('#height_1', '2200').catch(() => {});

        // Color
        await page.selectOption('#color', '7016').catch(() => {});
        
        // Slide direction (mandatory for Panorama)
        const slide = await page.$('#slide');
        if (slide) await page.selectOption('#slide', 'right').catch(() => {});
        
        // Glass type (mandatory)
        const glass = await page.$('#dakplaten_custom');
        if (glass) await page.selectOption('#dakplaten_custom', '6b89385110fae4d').catch(() => {}); // ESG 10mm
        
        const price = await submitAndGetPrice(page);
        if (price) {
          const p = calculateCustomerPrice({ aluxeNetPrice: price });
          console.log(`${formatEUR(price).padStart(12)} → ${formatEUR(p.customerGrossPrice).padStart(12)}`);
          results.push({ product: prod.name, width: s.width, height: 2200, aluxePrice: price, customerGross: p.customerGrossPrice, minMargin: p.minimumMarginApplied, error: null });
        } else { console.log('❌'); results.push({ product: prod.name, width: s.width, height: 2200, aluxePrice: null, customerGross: null, minMargin: false, error: 'no price' }); }
      } catch (err) { console.log(`❌ ${(err as Error).message.substring(0, 50)}`); results.push({ product: prod.name, width: s.width, height: 2200, aluxePrice: null, customerGross: null, minMargin: false, error: (err as Error).message }); }
    }
  }

  // === SEITENWÄNDE / FENSTER ===
  const wallProducts = [
    { name: 'Feste Seitenelemente', id: ALUXE_PRODUCTS.feste_seitenelemente },
    { name: 'Keilfenster', id: ALUXE_PRODUCTS.keilfenster },
    { name: 'Schiebetüren', id: ALUXE_PRODUCTS.rahmen_schiebeturen },
    { name: 'Frontwand', id: ALUXE_PRODUCTS.frontwand },
  ];

  for (const prod of wallProducts) {
    console.log(`\n  ═══ ${prod.name} ═══`);
    for (const s of SIZES) {
      process.stdout.write(`    ${s.width}mm × h2200... `);
      try {
        await startOrder(page, ck, `W-${prod.name.substring(0,5)}-${s.width}`);
        await page.goto(`https://bestellen.aluxe.nl/dealer/dealer-order/product/?product_id=${prod.id}&cookie_key=${ck}`, { waitUntil: 'networkidle', timeout: 15000 });

        // Width
        await page.fill('#width', String(s.width)).catch(() => {});
        
        // Heights (front/back for wedge shapes)
        const h1 = await page.$('#height_1');
        if (h1) await page.fill('#height_1', '2200').catch(() => {});
        const h2 = await page.$('#height_2');
        if (h2) await page.fill('#height_2', '2600').catch(() => {});
        
        // Color
        await page.selectOption('#color', '7016').catch(() => {});
        
        // Glass type (VSG 8mm klar = standard)
        const glass = await page.$('#dakplaten_custom');
        if (glass) await page.selectOption('#dakplaten_custom', '4715dc6ccf4dff9').catch(() => {}); // VSG 8mm klar
        
        // Side (left/right for Seitenwand)
        const side = await page.$('#side');
        if (side) await page.selectOption('#side', 'left').catch(() => {});
        
        // Doors for Schiebetüren
        const doors = await page.$('#sdoors');
        if (doors) await page.selectOption('#sdoors', '2-r-l').catch(() => {});
        
        const price = await submitAndGetPrice(page);
        if (price) {
          const p = calculateCustomerPrice({ aluxeNetPrice: price });
          console.log(`${formatEUR(price).padStart(12)} → ${formatEUR(p.customerGrossPrice).padStart(12)}`);
          results.push({ product: prod.name, width: s.width, height: 2200, aluxePrice: price, customerGross: p.customerGrossPrice, minMargin: p.minimumMarginApplied, error: null });
        } else { console.log('❌'); results.push({ product: prod.name, width: s.width, height: 2200, aluxePrice: null, customerGross: null, minMargin: false, error: 'no price' }); }
      } catch (err) { console.log(`❌ ${(err as Error).message.substring(0, 50)}`); results.push({ product: prod.name, width: s.width, height: 2200, aluxePrice: null, customerGross: null, minMargin: false, error: (err as Error).message }); }
    }
  }

  // === MARKISE ===
  console.log(`\n  ═══ Markise ═══`);
  for (const s of [{ w: 3000, d: 2500 }, { w: 4000, d: 3000 }, { w: 5000, d: 3500 }]) {
    process.stdout.write(`    ${s.w}×${s.d}... `);
    try {
      await startOrder(page, ck, `Mark-${s.w}`);
      await page.goto(`https://bestellen.aluxe.nl/dealer/dealer-order/product/?product_id=${ALUXE_PRODUCTS.markise}&cookie_key=${ck}`, { waitUntil: 'networkidle', timeout: 15000 });
      
      // Markise: rooftype, roofwidth, roofdepth, markise type, motor, color
      const rooftype = await page.$('#rooftype');
      if (rooftype) await page.selectOption('#rooftype', 'TR').catch(() => {}); // Trendline roof
      await page.fill('#roofwidth', String(s.w)).catch(() => {});
      await page.fill('#roofdepth', String(s.d)).catch(() => {});
      await page.selectOption('#color', '7016').catch(() => {});
      
      const price = await submitAndGetPrice(page);
      if (price) {
        const p = calculateCustomerPrice({ aluxeNetPrice: price });
        console.log(`${formatEUR(price).padStart(12)} → ${formatEUR(p.customerGrossPrice).padStart(12)}`);
        results.push({ product: 'Markise', width: s.w, aluxePrice: price, customerGross: p.customerGrossPrice, minMargin: p.minimumMarginApplied, error: null });
      } else { console.log('❌'); results.push({ product: 'Markise', width: s.w, aluxePrice: null, customerGross: null, minMargin: false, error: 'no price' }); }
    } catch (err) { console.log(`❌ ${(err as Error).message.substring(0, 50)}`); results.push({ product: 'Markise', width: s.w, aluxePrice: null, customerGross: null, minMargin: false, error: (err as Error).message }); }
  }

  // Save
  fs.writeFileSync(path.join(resultsDir, 'remaining_products.json'), JSON.stringify(results, null, 2));

  // Summary
  console.log('\n\n  ══════════════════════════════════════════');
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
