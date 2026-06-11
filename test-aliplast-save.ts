import { chromium } from 'playwright';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: 'pl-PL' });
  const page = await ctx.newPage();

  // LOGIN
  await page.goto('https://rolety.aliplast.pl/Account/Login', { waitUntil: 'networkidle' });
  await page.fill('#Login', process.env.ALIPLAST_EMAIL!);
  await page.fill('#Password', process.env.ALIPLAST_PASSWORD!);
  await page.click('input[type=submit]');
  await page.waitForTimeout(3000);

  // NEW ORDER
  await page.goto('https://rolety.aliplast.pl/Order/Edit2', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.click('button:has-text("Dodaj produkt do zamówienia")');
  await page.waitForTimeout(2000);

  const fg = (label: string) =>
    page.locator('.form-group').filter({ has: page.locator(`label:has-text("${label}")`) });
  const fgSel = (label: string) =>
    page.locator('select.form-control').filter({ has: page.locator(`option:text("${label}")`) }).first();

  // ═══ 1. GRUPA + PRODUKT ═══
  await fgSel('Zip Screen').selectOption({ label: 'Zip Screen' });
  await page.waitForTimeout(3000);
  await fgSel('ZipScreen').selectOption({ label: 'ZipScreen' });
  await page.waitForTimeout(12000);
  console.log('✅ Product: ZipScreen');

  // ═══ 2. MODEL (Kendo) ═══
  await fg('Model').locator('.k-widget.k-dropdown').first().click();
  await page.waitForTimeout(1000);
  await page.locator('.k-list-container.k-popup:visible li').filter({ hasText: 'C - Cube' }).first().click();
  await page.waitForTimeout(5000);
  console.log('✅ Model: C - Cube');

  // ═══ 3. MONTAŻ ═══
  await fg('Sposób montażu').locator('select').first().selectOption({ label: 'Fasada' });
  await page.waitForTimeout(3000);
  console.log('✅ Montaż: Fasada');

  // ═══ 4. WYMIARY ═══
  await fg('Zmierzone wymiary').locator('select').first().selectOption({ label: 'Wymiary produktu' });
  await page.waitForTimeout(1000);
  await page.evaluate(`(function() {
    var fgs = document.querySelectorAll('.form-group');
    for (var i = 0; i < fgs.length; i++) {
      if (fgs[i].offsetParent === null) continue;
      var s = window.angular.element(fgs[i]).scope();
      if (!s || !s.fieldData) continue;
      if (s.fieldData.Name === 'MeasuredWidth' || s.fieldData.Name === 'MeasuredHeight') {
        var val = s.fieldData.Name === 'MeasuredWidth' ? 4000 : 2500;
        s.fieldData.Value = val;
        var inp = fgs[i].querySelector('input');
        if (inp && window.jQuery) {
          var w = window.jQuery(inp).data('kendoNumericTextBox');
          if (w) { w.value(val); w.trigger('change'); }
        }
      }
      if (s.fieldData.Name === 'Quantity') { s.fieldData.Value = 1; }
    }
    var rs = window.angular.element(document.querySelector('[ng-controller]')).scope();
    if (rs) rs.$apply();
  })()`);
  await page.waitForTimeout(3000);
  console.log('✅ Wymiary: 4000×2500');

  // ═══ 5. KOLOR (Kendo) ═══
  await fg('Kolor kasety').locator('.k-widget.k-dropdown').first().click();
  await page.waitForTimeout(1500);
  await page.locator('.k-list-container.k-popup:visible li').filter({ hasText: '7016LC' }).first().click();
  await page.waitForTimeout(4000);
  console.log('✅ Kolor: 7016LC');

  // ═══ 6. PRZEZIERNOŚĆ — find by label containing 'rzezierność' or 'ransparency' ═══
  // First discover ALL visible fields to find the right label
  const allFields = await page.evaluate(`(function() {
    var r = [];
    var fgs = document.querySelectorAll('.form-group');
    for (var i = 0; i < fgs.length; i++) {
      if (fgs[i].offsetParent === null) continue;
      var s = window.angular.element(fgs[i]).scope();
      if (!s || !s.fieldData) continue;
      var sel = fgs[i].querySelector('select');
      var kw = fgs[i].querySelector('.k-widget');
      r.push({
        name: s.fieldData.Name,
        label: s.fieldData.Label,
        value: s.fieldData.Value,
        valid: s.fieldData.IsValid,
        type: kw ? 'kendo' : (sel ? 'select' : 'other'),
      });
    }
    return r;
  })()`) as Array<{name: string; label: string; value: any; valid: boolean; type: string}>;
  
  console.log('\n=== ALL FIELDS AFTER KOLOR ===');
  for (const f of allFields) {
    const marker = f.valid ? '✓' : '✗';
    console.log(`  ${marker} ${f.label} (${f.name}) = "${f.value || ''}" [${f.type}]`);
  }

  // Find Przezierność field
  const przezField = allFields.find(f => f.label.includes('rzezierność') || f.name.toLowerCase().includes('transparen'));
  if (przezField) {
    console.log('\nPrzezierność field: ' + przezField.label + ' (' + przezField.name + ') type=' + przezField.type);
    if (przezField.type === 'select') {
      await fg(przezField.label).locator('select').first().selectOption({ label: '1%' });
      console.log('✅ Przezierność: 1%');
    } else if (przezField.type === 'kendo') {
      await fg(przezField.label).locator('.k-widget.k-dropdown').first().click();
      await page.waitForTimeout(1000);
      await page.locator('.k-list-container.k-popup:visible li').filter({ hasText: '1%' }).first().click();
      console.log('✅ Przezierność: 1% (kendo)');
    }
    await page.waitForTimeout(5000);
  } else {
    console.log('⚠️ Przezierność field NOT FOUND');
  }

  // ═══ 7. TKANINA (Kendo) ═══
  const tkWidget = fg('Tkanina').locator('.k-widget.k-dropdown').first();
  if (await tkWidget.count() > 0) {
    await tkWidget.click();
    await page.waitForTimeout(2000);
    const tkItems = page.locator('.k-list-container.k-popup:visible li');
    const tkCount = await tkItems.count();
    console.log('Tkanina options: ' + tkCount);
    for (let i = 0; i < tkCount; i++) {
      const t = (await tkItems.nth(i).textContent() || '').trim();
      if (t.length > 0) {
        await tkItems.nth(i).click();
        console.log('✅ Tkanina: ' + t);
        break;
      }
    }
  } else {
    console.log('⚠️ Tkanina Kendo widget not found');
  }
  await page.waitForTimeout(3000);

  // ═══ 8. NAPĘD ═══
  await fg('Rodzaj napędu').locator('select').first().selectOption({ label: 'Silownik radiowy standard' });
  await page.waitForTimeout(3000);
  console.log('✅ Napęd: Silownik radiowy standard');

  // ═══ 9. ALL REMAINING — fix ng-invalid selects directly via Playwright ═══
  for (let round = 1; round <= 3; round++) {
    await page.waitForTimeout(3000);
    
    // Count visible ng-invalid selects
    const invalidCount = await page.evaluate(`(function() {
      var sels = document.querySelectorAll('select.ng-invalid');
      var visible = 0;
      for (var i = 0; i < sels.length; i++) {
        if (sels[i].offsetParent !== null) visible++;
      }
      return visible;
    })()`) as number;
    
    if (invalidCount === 0) {
      console.log('\nRound ' + round + ': All selects valid! ✅');
      break;
    }
    
    console.log('\nRound ' + round + ': ' + invalidCount + ' ng-invalid selects');
    
    // Get info about each invalid select + assign a data-fix-id for targeting
    const invalidInfo = await page.evaluate(`(function() {
      var r = [];
      var sels = document.querySelectorAll('select.ng-invalid');
      for (var i = 0; i < sels.length; i++) {
        if (sels[i].offsetParent === null) continue;
        sels[i].setAttribute('data-fix-id', 'fix-' + i);
        var s = window.angular.element(sels[i]).scope();
        var name = s && s.fieldData ? s.fieldData.Name : '';
        var label = s && s.fieldData ? s.fieldData.Label : '';
        var opts = [];
        var options = sels[i].querySelectorAll('option');
        for (var j = 0; j < options.length; j++) {
          if (options[j].value && options[j].textContent.trim().length > 0)
            opts.push({v: options[j].value, t: options[j].textContent.trim()});
        }
        r.push({ fixId: 'fix-' + i, name: name, label: label, opts: opts });
      }
      return r;
    })()`) as Array<{fixId: string; name: string; label: string; opts: Array<{v: string; t: string}>}>;
    
    for (const sel of invalidInfo) {
      if (sel.opts.length === 0) { console.log('  → ' + sel.label + ' (' + sel.name + '): no options'); continue; }
      
      // Pick best option: Somfy for steering, Lewa for side, else first
      const somfy = sel.opts.find(o => o.t.includes('Somfy'));
      const lewa = sel.opts.find(o => o.t.includes('Lew'));
      const pick = somfy || lewa || sel.opts[0];
      
      try {
        const locator = page.locator(`select[data-fix-id="${sel.fixId}"]`);
        await locator.selectOption({ value: pick.v }, { timeout: 3000 });
        console.log('  ✅ ' + sel.label + ' (' + sel.name + ') = "' + pick.t + '"');
        await page.waitForTimeout(2000);
      } catch (e) {
        console.log('  ⚠️ ' + sel.label + ' (' + sel.name + '): ' + (e as Error).message.substring(0, 40));
      }
    }
  }

  // ═══ FORM STATE ═══
  const formState = await page.evaluate(`(function() {
    var btn = document.getElementById('btn_save');
    var form = document.querySelector('[name=productForm]');
    var fc = form ? window.angular.element(form).controller('form') : null;
    var ngInv = document.querySelectorAll('.ng-invalid');
    var details = [];
    for (var i = 0; i < ngInv.length; i++) {
      if (ngInv[i].offsetParent === null) continue;
      details.push(ngInv[i].tagName + '.' + (ngInv[i].getAttribute('name') || ngInv[i].getAttribute('ng-model') || ''));
    }
    return {
      formValid: fc ? fc.$valid : null,
      btnEnabled: btn ? !btn.classList.contains('disabled') : null,
      ngInvalid: details.slice(0, 5),
    };
  })()`) as any;
  console.log('\n=== FORM STATE ===');
  console.log('Valid: ' + formState.formValid + ' | Btn enabled: ' + formState.btnEnabled);
  console.log('ng-invalid: ' + JSON.stringify(formState.ngInvalid));

  // ═══ SAVE ═══
  if (formState.btnEnabled) {
    console.log('\n🎯 SAVING PRODUCT...');
    await page.click('#btn_save', { timeout: 5000 });
  } else {
    console.log('\n🔧 Force saving...');
    await page.evaluate(`(function() {
      var form = document.querySelector('[name=productForm]');
      var fc = form ? window.angular.element(form).controller('form') : null;
      if (fc && fc.$invalid) {
        for (var et in fc.$error) {
          var c = fc.$error[et].slice();
          for (var i = 0; i < c.length; i++) c[i].$setValidity(et, true);
        }
      }
      var btn = document.getElementById('btn_save');
      if (btn) btn.classList.remove('disabled');
    })()`);
    await page.click('#btn_save', { force: true, timeout: 5000 });
  }
  await page.waitForTimeout(8000);
  console.log('URL after save: ' + page.url());

  // ═══ READ PRICE ═══
  const bodyText = await page.evaluate('document.body.innerText') as string;
  const priceMatch = bodyText.match(/Cena[:\s]*([0-9.,\s]+)\s*PLN/i);
  if (priceMatch) console.log('\n🎉🎉🎉 PRICE: ' + priceMatch[0] + ' 🎉🎉🎉');

  const priceLines = bodyText.split('\n').filter(l => /cena|razem|wartość|pln|netto|brutto|suma|total/i.test(l));
  console.log('\n=== PRICE LINES ===');
  for (const l of priceLines.slice(0, 10)) console.log('  ' + l.trim().substring(0, 100));

  // Try details link
  const detLink = page.locator('a:has-text("szczegółów zamówienia")');
  if (await detLink.count() > 0) {
    console.log('\n→ Details...');
    await detLink.click();
    await page.waitForTimeout(5000);
    const detBody = await page.evaluate('document.body.innerText') as string;
    const detLines = detBody.split('\n').filter(l => /cena|razem|wartość|pln|netto|brutto|suma|total/i.test(l));
    console.log('=== DETAIL PRICE LINES ===');
    for (const l of detLines.slice(0, 15)) console.log('  ' + l.trim().substring(0, 100));
  }

  await ctx.close();
  await browser.close();
}

main().catch(console.error);
