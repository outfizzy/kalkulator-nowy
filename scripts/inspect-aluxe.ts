// Diagnostic script: opens Aluxe login page and finds all form fields
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  console.log('🔍 Launching browser to inspect Aluxe login page...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://bestellen.aluxe.nl', { waitUntil: 'networkidle' });
  
  console.log(`📄 Page title: ${await page.title()}`);
  console.log(`📄 Page URL: ${page.url()}`);
  
  // Find all input fields
  const inputs = await page.evaluate(() => {
    const results: any[] = [];
    document.querySelectorAll('input, select, textarea, button').forEach((el: any) => {
      results.push({
        tag: el.tagName.toLowerCase(),
        type: el.type || '',
        id: el.id || '',
        name: el.name || '',
        className: el.className || '',
        placeholder: el.placeholder || '',
        value: el.value || '',
        visible: el.offsetParent !== null,
        text: el.textContent?.trim()?.substring(0, 50) || '',
      });
    });
    return results;
  });
  
  console.log('\n📋 All form elements found:');
  inputs.forEach((inp, i) => {
    console.log(`  ${i+1}. <${inp.tag}> type="${inp.type}" id="${inp.id}" name="${inp.name}" class="${inp.className}" placeholder="${inp.placeholder}" visible=${inp.visible} text="${inp.text}"`);
  });
  
  // Find labels
  const labels = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('label')).map(l => ({
      for: l.getAttribute('for') || '',
      text: l.textContent?.trim() || '',
    }));
  });
  
  console.log('\n🏷️ Labels:');
  labels.forEach((l, i) => {
    console.log(`  ${i+1}. for="${l.for}" text="${l.text}"`);
  });
  
  // Get full HTML of the form
  const formHtml = await page.evaluate(() => {
    const form = document.querySelector('form');
    return form ? form.outerHTML : 'No <form> found';
  });
  
  console.log('\n📝 Form HTML:');
  console.log(formHtml.substring(0, 2000));
  
  await browser.close();
  console.log('\n✅ Done');
}

main().catch(console.error);
