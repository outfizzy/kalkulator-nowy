import { chromium } from 'playwright';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: 'pl-PL' });
  const page = await ctx.newPage();

  await page.goto('https://rolety.aliplast.pl/Account/Login', { waitUntil: 'networkidle' });
  await page.fill('#Login', process.env.ALIPLAST_EMAIL!);
  await page.fill('#Password', process.env.ALIPLAST_PASSWORD!);
  await page.click('input[type=submit]');
  await page.waitForTimeout(3000);

  await page.goto('https://rolety.aliplast.pl/Order/Edit2', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.click('button:has-text("Dodaj produkt do zamówienia")');
  await page.waitForTimeout(2000);

  const fg = (label: string) =>
    page.locator('.form-group').filter({ has: page.locator(`label:has-text("${label}")`) });

  // Helper: dump visible fields
  const dumpFields = async (section: string) => {
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
        var type = kw ? 'kendo' : sel ? 'select' : cb ? 'checkbox' : 'input';
        var opts = [];
        if (sel) { var o = sel.querySelectorAll('option'); for (var j=0;j<o.length;j++) if(o[j].value&&o[j].textContent.trim().length>0) opts.push(o[j].textContent.trim()); }
        if (fd.Options) { for (var k=0;k<fd.Options.length;k++) if(fd.Options[k].Label&&opts.indexOf(fd.Options[k].Label)===-1) opts.push(fd.Options[k].Label); }
        r.push({ name: fd.Name, label: fd.Label, value: fd.Value, valid: fd.IsValid, type, opts: opts.slice(0,10), checked: cb?cb.checked:undefined });
      }
      return r;
    })()`) as any[];
    console.log(`\n=== ${section} (${fields.length} fields) ===`);
    for (const f of fields) {
      const m = f.valid ? '✓' : '✗';
      const val = f.value != null && f.value !== '' ? ` = "${f.value}"` : '';
      const chk = f.checked !== undefined ? ` [${f.checked ? '☑' : '☐'}]` : '';
      console.log(`  ${m} ${f.label} (${f.name}) [${f.type}]${val}${chk}`);
      if (f.opts.length > 0) console.log(`      ${f.opts.join(' | ')}`);
    }
    return fields;
  };

  // ═══════════════════════════════════════
  // SECTION 1: Wymiary i kolor
  // ═══════════════════════════════════════
  await page.locator('select.form-control').first().selectOption({ label: 'Pergola' });
  await page.waitForTimeout(3000);
  await page.locator('select.form-control').nth(1).selectOption({ label: 'Pergola Nuun ECO Pojedyncza/Modułowa' });
  await page.waitForTimeout(15000);
  console.log('✅ Pergola Nuun ECO');

  // Module: Single
  await fg('Konfiguracja modułów').locator('.k-widget.k-dropdown').first().click();
  await page.waitForTimeout(1000);
  await page.locator('.k-list-container.k-popup:visible li').filter({ hasText: 'Single' }).first().click();
  await page.waitForTimeout(8000);

  // Width: 7000
  const wInp = fg('Szerokość modułu').locator('input').first();
  await wInp.fill('7000'); await wInp.press('Tab'); await page.waitForTimeout(3000);

  // Depth: 3770 (closest to 3800)
  await fg('Wysięg modułu').locator('select').first().selectOption({ label: '3770' });
  await page.waitForTimeout(3000);

  // Height: 2500
  const hInp = fg('Zmierzona wysokość').locator('input').first();
  await hInp.fill('2500'); await hInp.press('Tab'); await page.waitForTimeout(3000);

  // Color: 7016LC
  await fg('Kolor profili').locator('.k-widget.k-dropdown').first().click();
  await page.waitForTimeout(1000);
  await page.locator('.k-list-container.k-popup:visible li').filter({ hasText: '7016LC' }).first().click();
  await page.waitForTimeout(3000);
  await fg('Kolor lameli').locator('.k-widget.k-dropdown').first().click();
  await page.waitForTimeout(1000);
  await page.locator('.k-list-container.k-popup:visible li').filter({ hasText: '7016LC' }).first().click();
  await page.waitForTimeout(3000);

  // LED will be set on Akcesoria dodatkowe section

  await dumpFields('SECTION 1: Wymiary i kolor');

  // ═══════════════════════════════════════
  // NAVIGATE: Click "Next (Nogi, odwodnienia)"
  // ═══════════════════════════════════════
  console.log('\n→ Navigating to: Nogi, odwodnienia...');
  await page.click('a:has-text("Nogi, odwodnienia")');
  await page.waitForTimeout(5000);
  await dumpFields('SECTION 2: Nogi, odwodnienia');

  // ═══════════════════════════════════════
  // NAVIGATE: Napęd i automatyka
  // ═══════════════════════════════════════
  console.log('\n→ Navigating to: Napęd i automatyka...');
  await page.click('a:has-text("Napęd i automatyka")');
  await page.waitForTimeout(5000);
  await dumpFields('SECTION 3: Napęd i automatyka');

  // ═══════════════════════════════════════
  // NAVIGATE: Rolety ZIP, ogrzewanie
  // ═══════════════════════════════════════
  console.log('\n→ Navigating to: Rolety ZIP, ogrzewanie...');
  await page.click('a:has-text("Rolety ZIP")');
  await page.waitForTimeout(5000);
  await dumpFields('SECTION 4: Rolety ZIP, ogrzewanie');

  // ═══════════════════════════════════════
  // NAVIGATE: Akcesoria dodatkowe
  // ═══════════════════════════════════════
  console.log('\n→ Navigating to: Akcesoria dodatkowe...');
  await page.click('a:has-text("Akcesoria dodatkowe")');
  await page.waitForTimeout(5000);
  await dumpFields('SECTION 5: Akcesoria dodatkowe');

  // ☑ LED: Oświetlenie w rynnie
  const ledResult = await page.evaluate(`(function() {
    var cbs = document.querySelectorAll('input[type=checkbox]');
    for (var i = 0; i < cbs.length; i++) {
      if (cbs[i].offsetParent === null) continue;
      var p = cbs[i].closest('.form-group, .checkbox, div');
      if (p && p.textContent.includes('wietlenie')) {
        cbs[i].click();
        var s = window.angular.element(cbs[i]).scope();
        if (s && s.fieldData) { s.fieldData.Value = true; s.$apply(); }
        return 'clicked: ' + p.textContent.trim().substring(0, 50);
      }
    }
    return 'LED not found';
  })()`) as string;
  console.log('✅ LED: ' + ledResult);
  await page.waitForTimeout(3000);

  // ═══════════════════════════════════════
  // CHECK PRICE
  // ═══════════════════════════════════════
  const bodyText = await page.evaluate('document.body.innerText') as string;
  const priceMatch = bodyText.match(/Cena[:\s]*([0-9.,\s]+)\s*PLN/i);
  console.log('\n=== CURRENT PRICE ===');
  if (priceMatch) console.log('🎯 ' + priceMatch[0]);
  else console.log('⚠️ No price found');

  // Check form state
  const formState = await page.evaluate(`(function() {
    var btn = document.getElementById('btn_save');
    return {
      btnEnabled: btn ? !btn.classList.contains('disabled') : null,
      ngInvalid: document.querySelectorAll('select.ng-invalid, input.ng-invalid').length,
    };
  })()`) as any;
  console.log('Btn enabled: ' + formState.btnEnabled + ' | ng-invalid: ' + formState.ngInvalid);

  await ctx.close();
  await browser.close();
}

main().catch(console.error);
