// Debug: trace exact flow for a single non-Trendline product
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import fs from 'fs';
import { ALUXE_PRODUCTS } from '../src/automation/worker/aluxe-automator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }, locale: 'de-DE', ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // Login
  console.log('1. Login...');
  await page.goto('https://bestellen.aluxe.nl', { waitUntil: 'networkidle' });
  await page.fill('#login_username', process.env.ALUXE_USERNAME!);
  await page.fill('#login_password', process.env.ALUXE_PASSWORD!);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }).catch(() => {}),
    page.click('input[type=submit]'),
  ]);
  await page.waitForTimeout(2000);
  const ck = page.url().match(/cookie_key=(\d+)/)?.[1] || '';
  console.log(`   Cookie: ${ck}, URL: ${page.url()}`);

  // New order
  console.log('\n2. New order → informatie...');
  await page.goto(`https://bestellen.aluxe.nl/dealer/dealer-order/informatie/?cookie_key=${ck}`, { waitUntil: 'networkidle' });
  console.log(`   URL: ${page.url()}`);
  
  const ref = await page.$('#reference');
  if (ref) await ref.fill('Debug-Test-123');
  
  console.log('\n3. Click next...');
  await page.click('#next');
  await page.waitForLoadState('networkidle');
  console.log(`   URL: ${page.url()}`);

  // Try to go directly to Trendline Glas
  const productId = ALUXE_PRODUCTS.trendline_glas; // 1f1d836c3cd094c
  console.log(`\n4. Navigate to product: Trendline Glas (${productId})...`);
  const productUrl = `https://bestellen.aluxe.nl/dealer/dealer-order/product/?product_id=${productId}&cookie_key=${ck}`;
  console.log(`   URL: ${productUrl}`);
  await page.goto(productUrl, { waitUntil: 'networkidle', timeout: 20000 });
  console.log(`   Landed on: ${page.url()}`);
  
  // Check for #width
  const hasWidth = await page.$('#width');
  console.log(`   Has #width: ${!!hasWidth}`);
  
  // Check page title
  const title = await page.title();
  console.log(`   Title: ${title}`);
  
  // Get page text (first 500 chars)
  const bodyText = await page.textContent('body');
  console.log(`   Body text (first 300): ${bodyText?.substring(0, 300)}`);
  
  // Get all fieldset legends
  const legends = await page.evaluate(`(function() {
    return Array.from(document.querySelectorAll('fieldset legend')).map(function(l) { return l.textContent.trim(); });
  })()`);
  console.log(`   Fieldsets: ${JSON.stringify(legends)}`);

  // Get all form fields
  const fields = await page.evaluate(`(function() {
    var result = [];
    document.querySelectorAll('input:not([type=hidden]):not([type=submit]), select').forEach(function(el) {
      result.push({ tag: el.tagName, id: el.id, name: el.name, type: el.type, visible: el.offsetParent !== null });
    });
    return result;
  })()`);
  console.log(`   Form fields: ${JSON.stringify(fields).substring(0, 500)}`);

  // Try filling width + depth
  if (hasWidth) {
    console.log('\n5. Filling width=4000, depth=3000, color=7016...');
    await page.fill('#width', '4000');
    const depthField = await page.$('#depth');
    if (depthField) await page.fill('#depth', '3000');
    const colorField = await page.$('#color');
    if (colorField) await page.selectOption('#color', '7016');
    const hf = await page.$('#height_front');
    if (hf) await page.fill('#height_front', '2200');
    
    console.log('\n6. Click next...');
    await page.click('#next');
    await page.waitForLoadState('networkidle');
    console.log(`   URL after next: ${page.url()}`);
    
    // Check for validation errors
    const errors = await page.evaluate(`(function() {
      var errs = [];
      document.querySelectorAll('.error, .warning, .message, .alert, [class*=error], [class*=warning]').forEach(function(el) {
        var t = el.textContent.trim();
        if (t) errs.push(t.substring(0, 100));
      });
      return errs;
    })()`);
    console.log(`   Errors: ${JSON.stringify(errors)}`);
    
    // Check if we moved past product page
    if (page.url().includes('/materialen')) {
      console.log('   ✅ On materialen page!');
    } else if (page.url().includes('/product')) {
      console.log('   ⚠️ Still on product page (validation failed?)');
      
      // Screenshot
      await page.screenshot({ path: 'recordings/auto/debug_product_page.png', fullPage: true });
      console.log('   📸 Screenshot saved');
    }

    // Check cart for price
    const cartHtml = await page.evaluate(`(function() {
      var cart = document.querySelector('#cart');
      return cart ? cart.innerHTML.substring(0, 500) : 'NO CART';
    })()`);
    console.log(`\n7. Cart HTML: ${cartHtml.substring(0, 400)}`);
    
    // Try navigating to materialen
    console.log('\n8. Navigate to materialen...');
    const matLink = await page.$('.rel-materialen');
    if (matLink) {
      await matLink.click();
      await page.waitForLoadState('networkidle');
      console.log(`   URL: ${page.url()}`);
    } else {
      console.log('   ⚠️ No .rel-materialen link found');
      // Try direct URL
      await page.goto(`https://bestellen.aluxe.nl/dealer/dealer-order/materialen/?cookie_key=${ck}`, { waitUntil: 'networkidle' });
      console.log(`   Direct URL: ${page.url()}`);
    }

    // Check cart again
    const cartHtml2 = await page.evaluate(`(function() {
      var cart = document.querySelector('#cart');
      return cart ? cart.innerHTML : 'NO CART';
    })()`);
    console.log(`\n9. Cart after materialen: ${cartHtml2.substring(0, 500)}`);
    
    // Extract ALL text with € sign
    const priceTexts = await page.evaluate(`(function() {
      var results = [];
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        var text = walker.currentNode.textContent.trim();
        if (text.indexOf('€') !== -1 && text.length < 50) results.push(text);
      }
      return results;
    })()`);
    console.log(`   All € texts on page: ${JSON.stringify(priceTexts)}`);
  }

  await page.screenshot({ path: 'recordings/auto/debug_final.png', fullPage: true });
  await context.close();
  await browser.close();
  console.log('\nDone.');
}

main().catch(console.error);
