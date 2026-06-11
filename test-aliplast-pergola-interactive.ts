import { chromium, Page } from 'playwright';
import dotenv from 'dotenv';
import * as readline from 'readline';
dotenv.config({ path: '.env.local' });

let page: Page;

async function dumpAllFields() {
  const fields = await page.evaluate(`(function() {
    var r = [];
    var fgs = document.querySelectorAll('.form-group');
    for (var i = 0; i < fgs.length; i++) {
      if (fgs[i].offsetParent === null) continue;
      var s = window.angular.element(fgs[i]).scope();
      if (!s || !s.fieldData) continue;
      var fd = s.fieldData;
      var sel = fgs[i].querySelector('select');
      var kw = fgs[i].querySelector('.k-widget');
      var cb = fgs[i].querySelector('input[type=checkbox]');
      var inp = fgs[i].querySelector('input');
      var type = kw ? 'kendo' : sel ? 'select' : cb ? 'checkbox' : inp ? 'input' : 'other';
      var opts = [];
      if (sel) { var o = sel.querySelectorAll('option'); for (var j=0;j<o.length;j++) if(o[j].value&&o[j].textContent.trim().length>0) opts.push(o[j].textContent.trim()); }
      if (fd.Options) { for (var k=0;k<fd.Options.length;k++) if(fd.Options[k].Label) opts.push('OPT:'+fd.Options[k].Label); }
      r.push({
        name: fd.Name, label: fd.Label, value: fd.Value, valid: fd.IsValid,
        type, opts: opts.slice(0,20), checked: cb?cb.checked:undefined
      });
    }
    return r;
  })()`) as any[];
  console.log('\n--- VISIBLE FIELDS (' + fields.length + ') ---');
  for (const f of fields) {
    const m = f.valid ? '✓' : '✗';
    const val = f.value != null && f.value !== '' ? ` = "${f.value}"` : '';
    const chk = f.checked !== undefined ? ` [${f.checked?'☑':'☐'}]` : '';
    console.log(`  ${m} ${f.label} (${f.name}) [${f.type}]${val}${chk}`);
    if (f.opts.length > 0) console.log(`    → ${f.opts.join(' | ')}`);
  }
  // Checkboxes
  const cbs = await page.evaluate(`(function() {
    var r = [];
    var cbs = document.querySelectorAll('input[type=checkbox]');
    for (var i = 0; i < cbs.length; i++) {
      if (cbs[i].offsetParent === null) continue;
      var p = cbs[i].closest('.form-group, .checkbox, label, div');
      r.push({ label: p ? p.textContent.trim().substring(0, 60) : '', checked: cbs[i].checked });
    }
    return r;
  })()`) as any[];
  if (cbs.length > 0) {
    console.log('\n--- CHECKBOXES ---');
    for (const cb of cbs) console.log(`  ${cb.checked?'☑':'☐'} ${cb.label}`);
  }
  // Sections/buttons
  const sections = await page.evaluate(`(function() {
    var r = [];
    var btns = document.querySelectorAll('a.un_productform_pagetab');
    for (var i = 0; i < btns.length; i++) {
      r.push({ text: btns[i].textContent.trim(), visible: btns[i].offsetParent !== null, active: btns[i].classList.contains('btn-primary'), valid: btns[i].classList.contains('pagetab_valid') });
    }
    return r;
  })()`) as any[];
  console.log('\n--- SECTIONS ---');
  for (const s of sections) console.log(`  ${s.active?'►':' '} ${s.valid?'✓':'✗'} ${s.text} ${s.visible?'':'[hidden]'}`);
  
  // Price
  const bodyText = await page.evaluate('document.body.innerText') as string;
  const pm = bodyText.match(/Cena[:\s]*([0-9.,\s]+)\s*PLN/i);
  if (pm) console.log('\n🎯 PRICE: ' + pm[0]);
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: 'pl-PL' });
  page = await ctx.newPage();

  // Login
  await page.goto('https://rolety.aliplast.pl/Account/Login', { waitUntil: 'networkidle' });
  await page.fill('#Login', process.env.ALIPLAST_EMAIL!);
  await page.fill('#Password', process.env.ALIPLAST_PASSWORD!);
  await page.click('input[type=submit]');
  await page.waitForTimeout(3000);

  // New order → Pergola
  await page.goto('https://rolety.aliplast.pl/Order/Edit2', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.click('button:has-text("Dodaj produkt do zamówienia")');
  await page.waitForTimeout(2000);

  await page.locator('select.form-control').first().selectOption({ label: 'Pergola' });
  await page.waitForTimeout(3000);
  await page.locator('select.form-control').nth(1).selectOption({ label: 'Pergola Nuun ECO Pojedyncza/Modułowa' });
  await page.waitForTimeout(15000);

  console.log('\n🏛️ PERGOLA NUUN ECO — Ready!\n');
  console.log('Browser is open. You can see the configurator.');
  console.log('I will dump all fields now.\n');
  
  await dumpAllFields();

  console.log('\n\n💡 Browser is open — guide me!\n');
  console.log('Press Ctrl+C when done. I will read the final state.\n');
  
  // Keep browser open, dump fields every 30 seconds
  for (let i = 0; i < 120; i++) {  // 60 minutes max
    await page.waitForTimeout(30000);
    console.log('\n=== AUTO REFRESH ' + (i+1) + ' ===');
    await dumpAllFields();
  }
}

main().catch(console.error);
