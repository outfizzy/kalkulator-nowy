// Quick debug script to understand the exact login flow
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const browser = await chromium.launch({ headless: false }); // visible!
  const page = await browser.newPage();
  
  // Track all navigations
  page.on('response', resp => {
    if (resp.status() >= 300 && resp.status() < 400) {
      console.log(`  ↪ REDIRECT ${resp.status()}: ${resp.url()} → ${resp.headers()['location'] || 'N/A'}`);
    }
  });
  
  console.log('1. Going to bestellen.aluxe.nl...');
  await page.goto('https://bestellen.aluxe.nl', { waitUntil: 'networkidle' });
  console.log(`   URL after load: ${page.url()}`);
  console.log(`   Title: ${await page.title()}`);
  
  console.log('\n2. Filling login...');
  await page.fill('#login_username', process.env.ALUXE_USERNAME || 'Polendach24');
  await page.fill('#login_password', process.env.ALUXE_PASSWORD || '');
  
  console.log(`   Username: ${process.env.ALUXE_USERNAME}`);
  console.log(`   Password set: ${!!process.env.ALUXE_PASSWORD} (length: ${(process.env.ALUXE_PASSWORD || '').length})`);
  
  console.log('\n3. Clicking submit...');
  await page.click('input[type=submit]');
  
  // Wait and track what happens
  await page.waitForTimeout(5000);
  console.log(`\n4. After submit:`);
  console.log(`   URL: ${page.url()}`);
  console.log(`   Title: ${await page.title()}`);
  
  // Check for error messages
  const bodyText = await page.textContent('body');
  if (bodyText && bodyText.includes('foutief') || bodyText?.includes('error') || bodyText?.includes('incorrect')) {
    console.log(`   ⚠️ Error detected in page text`);
  }
  
  // Check if there's an error message displayed
  const errorEls = await page.$$('.error, .warning, .alert, .message');
  for (const el of errorEls) {
    const text = await el.textContent();
    console.log(`   ⚠️ Error element: "${text?.trim()}"`);
  }
  
  // Check for login form still present
  const loginForm = await page.$('#login');
  if (loginForm) {
    console.log('   ⚠️ Login form still visible = login FAILED');
    
    // Check all text for hints
    const formText = await loginForm.textContent();
    console.log(`   Form text: ${formText?.trim().substring(0, 200)}`);
  }
  
  // Check page HTML for clues
  const html = await page.content();
  if (html.includes('POLENDACH')) {
    console.log('   ✅ POLENDACH text found - we ARE logged in');
  }
  if (html.includes('Abmelden')) {
    console.log('   ✅ Abmelden button found - we ARE logged in');
  }
  if (html.includes('cookie_key')) {
    const ckMatch = html.match(/cookie_key=(\d+)/);
    console.log(`   ✅ Cookie key found: ${ckMatch?.[1]}`);
  }
  
  await page.waitForTimeout(3000);
  console.log(`\n5. Final URL: ${page.url()}`);
  
  // Take screenshot
  await page.screenshot({ path: 'recordings/auto/debug_login.png' });
  console.log('   Screenshot saved to recordings/auto/debug_login.png');
  
  await browser.close();
}

main().catch(console.error);
