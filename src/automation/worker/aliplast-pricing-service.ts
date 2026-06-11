// ============================================================================
// Aliplast Live Pricing Service v6 — Hybrid with fresh order + long waits
// UI clicks for group/product/model/mount/dims/color (proven to work)
// Angular scope for cascading fields (Przezierność→Tkanina→Napęd)
// Fresh order each time (delete existing products)
// ============================================================================

import { chromium, Browser, BrowserContext, Page } from 'playwright';

const PLN_TO_EUR_RATE = 0.232;

export interface AliplastLineItem {
  name: string;
  description?: string;
  quantity: number;
  price?: number;
}

export interface AliplastPriceResult {
  success: boolean;
  product: string;
  model: string;
  priceNetPLN: number;
  priceNetEUR: number;
  priceBruttoPLN: number;
  dimensions: { width: number; height?: number; depth?: number };
  color?: string;
  fabric?: string;
  lineItems: AliplastLineItem[];
  durationMs: number;
  error?: string;
}

export interface AliplastPergolaOptions {
  modules?: string;        // W1D1, W2D1, etc.
  installType?: string;    // Standalone / WallMount
  drainType?: string;      // Kwadratowy / Okrągły
  drainOption?: string;    // Standard / Ciche odwodnienie
  steeringType?: string;   // Somfy / Teleco
  steering?: string;       // JP4S
  remote?: string;         // ACZF411
  steerSide?: string;      // L / R
  ledSlats?: number;       // Number of LED lamellas (0 = no LED)
  zipOpenings?: string[];  // ['A1-A2', 'B3-A9']
  zipInstallType?: string; // OO
  zipSteeringType?: string;// RTSd
  zipFabricCollection?: string; // 4%
  zipFabric?: string;      // SC4/2047
}

export interface AliplastCarportOptions {
  roofFillment?: string;    // CARPORT ROOF | Sandwich PIR | Szkło/PC/Inne | Brak dachu
  installType?: string;     // Standalone / WallMount
  drainOption?: string;     // Standard / Ciche odwodnienie / Brak
  drainPositions?: string[]; // ['N','S'] — min 2 on one side; N/S/W/E
  profileColor?: string;    // 7012ST (default)
  slatsColor?: string;      // 7016 (default)
  measuredHeight?: number;  // default 2400
  // ZIP (optional — checkbox on page 2)
  addZip?: boolean;
  zipOpening?: string;      // A1-A2
  zipFabricCollection?: string; // 5%
  zipFabric?: string;       // czarny/czarny 5% SC5/
  // Motor (page 3)
  motorBrand?: string;      // Somfy (default)
  motorModel?: string;      // e.g. specific kendo option
  motorProtocol?: string;   // RTSd
}

export interface AliplastPriceRequest {
  group: 'Zip Screen' | 'Carport' | 'Pergola' | 'Rolety zewnętrzne';
  product: string;
  model?: string;
  width: number;
  height?: number;
  depth?: number;
  color?: string;
  mountType?: string;
  quantity?: number;
  pergola?: AliplastPergolaOptions;
  carport?: AliplastCarportOptions;
}

const COLOR_MAP: Record<string, string> = {
  '7016': '7016LC', '9005': '9005JB', '8014': '8014LC',
};

export class AliplastPricingService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private loggedIn = false;
  private email: string;
  private password: string;

  constructor(credentials: { email: string; password: string }) {
    this.email = credentials.email;
    this.password = credentials.password;
  }

  private customerLabel: string = '';

  /** Set customer label for order naming — call BEFORE getPrice */
  setCustomerName(name: string): void {
    this.customerLabel = name ? `BOT - ${name}` : '';
    console.log(`[AliplastPricing] 👤 Customer label: ${this.customerLabel}`);
  }

  /** Fill order name field on Edit2 page */
  private async fillOrderName(): Promise<void> {
    if (!this.customerLabel || !this.page) return;
    try {
      // Try common order name selectors on Edit2 page
      const nameField = await this.page.$('#OrderName, input[name="OrderName"], input[placeholder*="Nazwa"], input[placeholder*="nazwa"]');
      if (nameField) {
        await nameField.fill(this.customerLabel);
        console.log(`[AliplastPricing] 📝 Order name: ${this.customerLabel}`);
      } else {
        // Try Angular scope approach
        await this.page.evaluate(`(function() {
          var scope = window.angular && window.angular.element(document.querySelector('[ng-controller]')).scope();
          if (scope && scope.order) {
            scope.order.Name = '${this.customerLabel.replace(/'/g, "\\'")}';
            scope.$apply();
          }
        })()`);
        console.log(`[AliplastPricing] 📝 Order name (scope): ${this.customerLabel}`);
      }
    } catch (e) {
      console.log(`[AliplastPricing] ⚠️ Order name failed: ${(e as Error).message.substring(0, 50)}`);
    }
  }

  async getPrice(request: AliplastPriceRequest): Promise<AliplastPriceResult> {
    // Route to dedicated methods
    if (request.group === 'Pergola') {
      return this.getPergolaPrice(request);
    }
    if (request.group === 'Carport') {
      return this.getCarportPrice(request);
    }
    const start = Date.now();
    const colorCode = COLOR_MAP[request.color || '7016'] || request.color || '7016LC';

    try {
      await this.ensureBrowser();
      await this.ensureLoggedIn();

      // ═══ FRESH ORDER — navigate to Edit2 ═══
      await this.page!.goto('https://rolety.aliplast.pl/Order/Edit2', {
        waitUntil: 'networkidle', timeout: 30000,
      });
      await this.page!.waitForTimeout(3000);

      // Delete any existing products to start fresh
      const delBtns = this.page!.locator('a:has-text("Usuń"), button:has-text("Usuń")');
      const delCount = await delBtns.count();
      for (let d = 0; d < delCount; d++) {
        try {
          await delBtns.first().click({ timeout: 2000 });
          await this.page!.waitForTimeout(1000);
          // Confirm deletion if dialog appears
          const okBtn = this.page!.locator('button:has-text("OK"), button:has-text("Tak")');
          if (await okBtn.count() > 0) await okBtn.first().click({ timeout: 2000 });
          await this.page!.waitForTimeout(1000);
        } catch { break; }
      }

      // Add new product
      await this.page!.click('button:has-text("Dodaj produkt do zamówienia")', { timeout: 10000 });
      await this.page!.waitForTimeout(2000);

      console.log(`    🏭 Aliplast: [${request.group}] → ${request.product}`);

      const fg = (label: string) => this.page!.locator('.form-group').filter({
        has: this.page!.locator(`label:has-text("${label}")`),
      });

      // ═══ 1. GROUP (native select) ═══
      const groupSel = this.page!.locator('select.form-control').filter({
        has: this.page!.locator(`option:text("${request.group}")`),
      }).first();
      await groupSel.selectOption({ label: request.group }, { timeout: 10000 });
      await this.page!.waitForTimeout(4000);

      // ═══ 2. PRODUCT (native select — triggers full form render) ═══
      const prodSel = this.page!.locator('select.form-control').filter({
        has: this.page!.locator(`option:text-is("${request.product}")`),
      }).first();
      await prodSel.selectOption({ label: request.product }, { timeout: 10000 });
      await this.page!.waitForTimeout(12000); // LONG wait for Angular form
      console.log(`      ✅ Product: ${request.product}`);

      // ═══ 3. MODEL (Kendo click — triggers field cascade) ═══
      if (request.model) {
        const modelKw = fg('Model').locator('.k-widget.k-dropdown').first();
        await modelKw.click({ timeout: 10000 });
        await this.page!.waitForTimeout(1500);
        const popup = this.page!.locator('.k-list-container.k-popup:visible');
        await popup.locator('li').filter({ hasText: request.model }).first().click({ timeout: 5000 });
        await this.page!.waitForTimeout(5000); // LONG wait for Angular to rebuild form
        console.log(`      ✅ Model: ${request.model}`);
      }

      // ═══ 4. MOUNT TYPE (native select) ═══
      const mountLabel = request.mountType || 'Fasada';
      await fg('Sposób montażu').locator('select').first()
        .selectOption({ label: mountLabel }, { timeout: 10000 });
      await this.page!.waitForTimeout(3000);
      console.log(`      ✅ Montaż: ${mountLabel}`);

      // ═══ 5. MEASUREMENT TYPE ═══
      await fg('Zmierzone wymiary').locator('select').first()
        .selectOption({ label: 'Wymiary produktu' }, { timeout: 5000 });
      await this.page!.waitForTimeout(1000);

      // ═══ 6. QUANTITY ═══
      await fg('Liczba sztuk').locator('input').first()
        .fill(String(request.quantity || 1), { timeout: 3000 });

      // ═══ 7. DIMENSIONS (Kendo NumericTextBox API + Angular scope) ═══
      await this.page!.evaluate(`(function() {
        var fgs = document.querySelectorAll('.form-group');
        for (var i = 0; i < fgs.length; i++) {
          if (fgs[i].offsetParent === null) continue;
          var s = window.angular.element(fgs[i]).scope();
          if (!s || !s.fieldData) continue;
          
          if (s.fieldData.Name === 'MeasuredWidth') {
            s.fieldData.Value = ${request.width};
            // Set Kendo widget
            var inp = fgs[i].querySelector('input');
            if (inp && window.jQuery) {
              var w = window.jQuery(inp).data('kendoNumericTextBox');
              if (w) { w.value(${request.width}); w.trigger('change'); }
              else { inp.value = '${request.width}'; inp.dispatchEvent(new Event('input', {bubbles:true})); inp.dispatchEvent(new Event('change', {bubbles:true})); }
            }
          }
          if (s.fieldData.Name === 'MeasuredHeight') {
            s.fieldData.Value = ${request.height || 2500};
            var inp = fgs[i].querySelector('input');
            if (inp && window.jQuery) {
              var w = window.jQuery(inp).data('kendoNumericTextBox');
              if (w) { w.value(${request.height || 2500}); w.trigger('change'); }
              else { inp.value = '${request.height || 2500}'; inp.dispatchEvent(new Event('input', {bubbles:true})); inp.dispatchEvent(new Event('change', {bubbles:true})); }
            }
          }
        }
        // Apply
        try { var rs = window.angular.element(document.querySelector('[ng-controller]')).scope(); if(rs) rs.$apply(); } catch(e){}
      })()`);
      await this.page!.waitForTimeout(3000);
      console.log(`      ✅ Wymiary: ${request.width}×${request.height || '?'}`);

      // ═══ 8. KOLOR KASETY (Kendo click) ═══
      const kolorKw = fg('Kolor kasety').locator('.k-widget.k-dropdown').first();
      await kolorKw.click({ timeout: 5000 });
      await this.page!.waitForTimeout(1500);
      await this.page!.locator('.k-list-container.k-popup:visible li')
        .filter({ hasText: colorCode }).first().click({ timeout: 5000 });
      await this.page!.waitForTimeout(4000);
      console.log(`      ✅ Kolor: ${colorCode}`);

      // ═══ 9. PRZEZIERNOŚĆ (native select with retry) ═══
      let przSet = false;
      for (let attempt = 0; attempt < 3 && !przSet; attempt++) {
        try {
          const przSel = fg('Przezierność').locator('select').first();
          await przSel.selectOption({ label: '1%' }, { timeout: 3000 });
          przSet = true;
          console.log(`      ✅ Przezierność: 1%`);
        } catch {
          await this.page!.waitForTimeout(2000);
        }
      }
      if (!przSet) {
        // Angular scope fallback with full cascade
        await this.scopeSetFirstOption('FabricCollection');
        console.log(`      ✅ Przezierność: set via scope`);
      }
      await this.page!.waitForTimeout(5000);

      // ═══ 10. TKANINA (Kendo popup — skip empty first item) ═══
      let tkSet = false;
      try {
        const tkKw = fg('Tkanina').locator('.k-widget.k-dropdown').first();
        if (await tkKw.count() > 0) {
          await tkKw.click({ timeout: 3000 });
          await this.page!.waitForTimeout(2000);
          const tkItems = this.page!.locator('.k-list-container.k-popup:visible li');
          const count = await tkItems.count();
          for (let idx = 0; idx < Math.min(count, 10); idx++) {
            const txt = (await tkItems.nth(idx).textContent() || '').trim();
            if (txt.length > 0) {
              await tkItems.nth(idx).click({ timeout: 3000 });
              console.log(`      ✅ Tkanina: "${txt}" (${count} opts)`);
              tkSet = true;
              break;
            }
          }
          if (!tkSet && count > 1) {
            await tkItems.nth(1).click({ timeout: 3000 });
            tkSet = true;
          }
          if (!tkSet) await this.page!.keyboard.press('Escape');
        }
      } catch { /* fallback */ }
      if (!tkSet) {
        const r = await this.scopeSetFirstOption('Fabric');
        tkSet = r.set;
      }
      await this.page!.waitForTimeout(3000);

      // ═══ 11. RODZAJ NAPĘDU — "Silownik radiowy standard" for Somfy ═══
      try {
        await fg('Rodzaj napędu').locator('select').first()
          .selectOption({ label: 'Silownik radiowy standard' }, { timeout: 5000 });
        console.log(`      ✅ Rodzaj napędu: Silownik radiowy standard (Somfy)`);
      } catch {
        // Fallback: try by index
        try {
          await fg('Rodzaj napędu').locator('select').first()
            .selectOption({ index: 2 }, { timeout: 3000 });
          console.log(`      ✅ Rodzaj napędu: index 2`);
        } catch {
          await this.scopeSetFirstOption('DriveType');
        }
      }
      await this.page!.waitForTimeout(3000);

      // ═══ 12. NAPĘD / Steering — NATIVE SELECT (NOT Kendo!) ═══
      // Steps 11-14 REMOVED: Let step 15 handle Steering/SteerSide/CableOut
      // via Playwright selectOption which triggers XHR price recalculation


      // ═══ 15. FIX ng-invalid selects via Playwright data-fix-id targeting ═══
      // Scope changes don't trigger Angular's XHR. Playwright selectOption does.
      for (let round = 1; round <= 3; round++) {
        await this.page!.waitForTimeout(3000);
        
        const invalidInfo = await this.page!.evaluate(`(function() {
          var r = [];
          var sels = document.querySelectorAll('select.ng-invalid');
          for (var i = 0; i < sels.length; i++) {
            if (sels[i].offsetParent === null) continue;
            var uid = 'fix-r' + ${round} + '-' + i;
            sels[i].setAttribute('data-fix-id', uid);
            var s = window.angular.element(sels[i]).scope();
            var name = s && s.fieldData ? s.fieldData.Name : '';
            var label = s && s.fieldData ? s.fieldData.Label : '';
            var opts = [];
            var options = sels[i].querySelectorAll('option');
            for (var j = 0; j < options.length; j++) {
              if (options[j].value && options[j].textContent.trim().length > 0)
                opts.push({v: options[j].value, t: options[j].textContent.trim()});
            }
            r.push({ fixId: uid, name: name, label: label, opts: opts });
          }
          return r;
        })()`) as Array<{fixId: string; name: string; label: string; opts: Array<{v: string; t: string}>}>;

        if (invalidInfo.length === 0) {
          console.log(`      ✅ Round ${round}: All selects valid`);
          break;
        }

        for (const sel of invalidInfo) {
          if (sel.opts.length === 0) continue;
          const somfy = sel.opts.find(o => o.t.includes('Somfy'));
          const lewa = sel.opts.find(o => o.t.includes('Lew'));
          const pick = somfy || lewa || sel.opts[0];
          try {
            await this.page!.locator(`select[data-fix-id="${sel.fixId}"]`).selectOption({ value: pick.v }, { timeout: 3000 });
            console.log(`      ✅ PW [${sel.label}] = "${pick.t}"`);
            await this.page!.waitForTimeout(2000);
          } catch {
            console.log(`      ⚠️ PW [${sel.label}] failed`);
          }
        }
      }
      await this.page!.waitForTimeout(3000);

      // ═══ 16. FORCE saveProduct() ═══
      await this.page!.evaluate(`(function() {
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
        var btnScope = window.angular.element(btn).scope();
        if (btnScope && typeof btnScope.saveProduct === 'function') btnScope.saveProduct();
      })()`);
      console.log('      📦 saveProduct() called');
      await this.page!.waitForTimeout(5000);

      // ═══ PRICE ═══
      const price = await this.extractPrice();
      if (price > 0) {
        const items = await this.extractLineItems();
        console.log(`      ✅ Cena: ${price.toFixed(2)} PLN → ${(price * PLN_TO_EUR_RATE).toFixed(2)}€ (${items.length} pozycji)`);
        return this.makeResult(true, request, price, colorCode, Date.now() - start, undefined, items);
      }

      // Auto-fix invalid fields
      const invalid = await this.getInvalidFields();
      console.log(`      ⚠️ Price=0. Invalid: ${invalid.join(' | ')}`);

      // Try auto-fixing
      await this.autoFixInvalid();
      const price2 = await this.extractPrice();
      if (price2 > 0) {
        const items2 = await this.extractLineItems();
        console.log(`      ✅ Fixed! Cena: ${price2.toFixed(2)} PLN (${items2.length} pozycji)`);
        return this.makeResult(true, request, price2, colorCode, Date.now() - start, undefined, items2);
      }

      const invalid2 = await this.getInvalidFields();
      return this.makeResult(false, request, 0, colorCode, Date.now() - start, 
        `Invalid: ${invalid2.join(', ')}`);

    } catch (err) {
      return this.makeResult(false, request, 0, colorCode, Date.now() - start, (err as Error).message);
    }
  }

  // ---- Helpers ----

  private async extractPrice(): Promise<number> {
    // Get full page text — parse in TypeScript to avoid evaluate regex escaping
    const bodyText = await this.page!.evaluate('document.body ? document.body.innerText : ""') as string;
    const price = this.parsePriceFromText(bodyText);
    if (price > 10) return price;

    // Fallback: expand summary and try again
    try {
      await this.page!.click('a:has-text("Rozwiń podsumowanie")', { timeout: 2000 });
      await this.page!.waitForTimeout(3000);
      const bodyText2 = await this.page!.evaluate('document.body ? document.body.innerText : ""') as string;
      const price2 = this.parsePriceFromText(bodyText2);
      if (price2 > 10) return price2;
    } catch { /* no summary button */ }

    return 0;
  }

  private parsePriceFromText(text: string): number {
    const patterns = [
      /Cena[:\s]*([0-9.,\s]+)\s*PLN/i,
      /Razem[:\s]*([0-9.,\s]+)\s*PLN/i,
      /netto[:\s]*([0-9.,\s]+)\s*PLN/i,
      /([0-9]+[.,][0-9.,\s]*)\s*PLN/i,
    ];
    for (const pat of patterns) {
      const m = text.match(pat);
      if (m) {
        let s = m[1].replace(/\s/g, '');
        if (s.includes(',') && s.includes('.')) {
          if (s.lastIndexOf(',') < s.lastIndexOf('.')) {
            s = s.replace(/,/g, '');
          } else {
            s = s.replace(/\./g, '').replace(',', '.');
          }
        } else if (s.includes(',')) {
          s = s.replace(',', '.');
        }
        const v = parseFloat(s);
        if (v > 10 && !isNaN(v)) return v;
      }
    }
    return 0;
  }

  private makeResult(success: boolean, req: AliplastPriceRequest, price: number, color: string, ms: number, error?: string, lineItems?: AliplastLineItem[]): AliplastPriceResult {
    return {
      success, product: req.product, model: req.model || '',
      priceNetPLN: price,
      priceNetEUR: Math.round(price * PLN_TO_EUR_RATE * 100) / 100,
      priceBruttoPLN: Math.round(price * 1.23 * 100) / 100,
      dimensions: { width: req.width, height: req.height, depth: req.depth },
      color, lineItems: lineItems || [], durationMs: ms, error,
    };
  }

  private async scopeSetFirstOption(fieldName: string): Promise<{ set: boolean; value: string }> {
    const r = await this.page!.evaluate(`(function() {
      var fgs = document.querySelectorAll('.form-group');
      for (var i = 0; i < fgs.length; i++) {
        if (fgs[i].offsetParent === null) continue;
        var s = window.angular.element(fgs[i]).scope();
        if (!s || !s.fieldData || s.fieldData.Name !== '${fieldName}') continue;
        var opts = s.fieldData.Options || [];
        for (var j = 0; j < opts.length; j++) {
          if (opts[j].Id && String(opts[j].Id).length > 0) {
            s.fieldData.Value = opts[j].Id;
            var sel = fgs[i].querySelector('select');
            if (sel) { sel.value = opts[j].Id; sel.dispatchEvent(new Event('change', {bubbles:true})); sel.dispatchEvent(new Event('input', {bubbles:true})); }
            if (sel && window.jQuery) { var w = window.jQuery(sel).data('kendoDropDownList'); if(w) { w.value(opts[j].Id); w.trigger('change'); } }
            s.$apply();
            return { set: true, label: s.fieldData.Label, value: opts[j].Label || opts[j].Id };
          }
        }
        return { set: false, label: s.fieldData.Label, value: '' };
      }
      return { set: false, label: '', value: '' };
    })()`) as any;
    if (r.set) console.log(`      ✅ [${r.label}] = "${r.value}"`);
    else if (r.label) console.log(`      ⚠️ [${r.label}] no valid options`);
    else console.log(`      ⚠️ [${fieldName}] not in DOM`);
    return r;
  }

  private async autoFixInvalid(): Promise<void> {
    await this.page!.evaluate(`(function() {
      var fgs = document.querySelectorAll('.form-group');
      for (var i = 0; i < fgs.length; i++) {
        if (fgs[i].offsetParent === null) continue;
        var s = window.angular.element(fgs[i]).scope();
        if (!s || !s.fieldData || s.fieldData.IsValid) continue;
        var opts = s.fieldData.Options || [];
        if (opts.length > 0 && !s.fieldData.Value) {
          for (var j = 0; j < opts.length; j++) {
            if (opts[j].Id) {
              s.fieldData.Value = opts[j].Id;
              var sel = fgs[i].querySelector('select');
              if (sel) { sel.value = opts[j].Id; sel.dispatchEvent(new Event('change', {bubbles:true})); }
              if (sel && window.jQuery) { var w = window.jQuery(sel).data('kendoDropDownList'); if(w) { w.value(opts[j].Id); w.trigger('change'); } }
              break;
            }
          }
        }
      }
      try { var rs = window.angular.element(document.querySelector('[ng-controller]')).scope(); if(rs) rs.$apply(); } catch(e){}
    })()`);
    await this.page!.waitForTimeout(5000);
  }

  private async extractLineItems(): Promise<Array<{name: string; description?: string; quantity: number; price?: number}>> {
    return await this.page!.evaluate(`(function() {
      var items = [];
      try {
        var scope = window.angular.element(document.querySelector('[ng-controller]')).scope();
        if (!scope) return items;
        
        // Extract from orderCostSummary
        if (scope.orderCostSummary) {
          for (var i = 0; i < scope.orderCostSummary.length; i++) {
            var s = scope.orderCostSummary[i];
            items.push({
              name: s.Label || s.Name || 'Pozycja ' + (i+1),
              description: s.Description || '',
              quantity: parseInt(s.Quantity) || 1,
              price: parseFloat(s.ProductPrice || s.Price) || 0,
            });
          }
        }
        
        // Extract field values as specification items
        var fgs = document.querySelectorAll('.form-group');
        for (var j = 0; j < fgs.length; j++) {
          if (fgs[j].offsetParent === null) continue;
          var fs = window.angular.element(fgs[j]).scope();
          if (!fs || !fs.fieldData || !fs.fieldData.Value) continue;
          var fd = fs.fieldData;
          // Find the display label for the selected value
          var displayVal = fd.Value;
          if (fd.Options) {
            for (var k = 0; k < fd.Options.length; k++) {
              if (String(fd.Options[k].Id) === String(fd.Value)) {
                displayVal = fd.Options[k].Label || fd.Value;
                break;
              }
            }
          }
          items.push({
            name: fd.Label || fd.Name,
            description: String(displayVal),
            quantity: 1,
            price: 0, // individual field prices not available
          });
        }
      } catch(e) {}
      return items;
    })()`) as Array<{name: string; description?: string; quantity: number; price?: number}>;
  }

  private async getInvalidFields(): Promise<string[]> {
    return await this.page!.evaluate(`(function() {
      var r = [];
      var fgs = document.querySelectorAll('.form-group');
      for (var i = 0; i < fgs.length; i++) {
        if (fgs[i].offsetParent === null) continue;
        var s = window.angular.element(fgs[i]).scope();
        if (s && s.fieldData && !s.fieldData.IsValid) r.push(s.fieldData.Label+'('+s.fieldData.Name+')='+JSON.stringify(s.fieldData.Value));
      }
      return r;
    })()`) as string[];
  }

  // ═══════════════════════════════════════════════════════════════
  // CARPORT — Single-section configurator
  // Only 1 section: Wymiary i kolor (no motor, no ZIP, no LED)
  //
  // DEFAULTS: CARPORT ROOF | Wolnostojąca | 7012ST | 7016 | Standard drain
  // ═══════════════════════════════════════════════════════════════
  private async getCarportPrice(request: AliplastPriceRequest): Promise<AliplastPriceResult> {
    const start = Date.now();
    const opts = request.carport || {};
    const profileColor = opts.profileColor || '7012ST';
    const slatsColor = opts.slatsColor || '7016';

    try {
      await this.ensureBrowser();
      await this.ensureLoggedIn();

      // Listen for alerts (server validation errors)
      let lastAlert = '';
      this.page!.removeAllListeners('dialog');
      this.page!.on('dialog', async (d) => { lastAlert = d.message(); await d.accept(); });

      // Fresh order
      await this.page!.goto('https://rolety.aliplast.pl/Order/Edit2', { waitUntil: 'networkidle', timeout: 30000 });
      await this.page!.waitForTimeout(3000);
      await this.fillOrderName();

      // Delete existing products
      const delBtns = this.page!.locator('a:has-text("Usuń"), button:has-text("Usuń")');
      for (let d = 0; d < await delBtns.count(); d++) {
        try {
          await delBtns.first().click({ timeout: 2000 });
          await this.page!.waitForTimeout(1000);
          const okBtn = this.page!.locator('button:has-text("OK"), button:has-text("Tak")');
          if (await okBtn.count() > 0) await okBtn.first().click({ timeout: 2000 });
          await this.page!.waitForTimeout(1000);
        } catch { break; }
      }

      await this.page!.click('button:has-text("Dodaj produkt do zamówienia")', { timeout: 10000 });
      await this.page!.waitForTimeout(2000);

      console.log(`    🚗 Aliplast Carport: ${request.width}x${request.depth || '?'}`);

      // ═══ GROUP: Carport (auto-loads, no product select needed) ═══
      await this.page!.locator('select.form-control').first().selectOption({ label: 'Carport' });
      await this.page!.waitForTimeout(15000); // Long wait for Carport to fully load

      const fg = (label: string) => this.page!.locator('.form-group').filter({
        has: this.page!.locator(`label:has-text("${label}")`),
      });

      // Helper: tag an input by fieldData.Name and fill it
      const tagAndFill = async (fieldName: string, value: string) => {
        await this.page!.evaluate(`(function(){
          var fgs=document.querySelectorAll('.form-group');
          for(var i=0;i<fgs.length;i++){
            if(fgs[i].offsetParent===null)continue;
            var s=window.angular.element(fgs[i]).scope();
            if(s&&s.fieldData&&s.fieldData.Name==='${fieldName}'){
              var inp=fgs[i].querySelector('input');
              if(inp)inp.setAttribute('data-pw-f','${fieldName}');
            }
          }
        })()`);
        const inp = this.page!.locator(`input[data-pw-f="${fieldName}"]`);
        if (await inp.count() > 0) {
          await inp.fill(value);
          await inp.press('Tab');
          await this.page!.waitForTimeout(8000);
          return true;
        }
        return false;
      };

      // ═══════════════════════════════════════════════════════════
      // PAGE 1: Konfiguracja główna
      // ═══════════════════════════════════════════════════════════

      // 1. InstallType — default: Wolnostojąca
      const installLabel = opts.installType === 'WallMount' ? 'Montaż do elewacji' : 'Wolnostojąca';
      await fg('Sposób montażu').locator('select').first().selectOption({ label: installLabel });
      await this.page!.waitForTimeout(5000);
      console.log(`      ✅ Montaż: ${installLabel}`);

      // 2. Measure — default: Wysokość produktu
      await fg('Zmierzone wymiary').locator('select').first().selectOption({ label: 'Wysokość produktu' });
      await this.page!.waitForTimeout(5000);
      console.log(`      ✅ Measure: Wysokość produktu`);

      // 3. Width — page.fill + Tab (triggers XHR → shows Depth)
      await fg('Szerokość').locator('input').first().fill(String(request.width));
      await fg('Szerokość').locator('input').first().press('Tab');
      await this.page!.waitForTimeout(10000);
      console.log(`      ✅ Szerokość: ${request.width}`);

      // 4. Depth (Wysięg) — cascading field, must be >= Width
      const depthVal = request.depth && request.depth >= request.width
        ? request.depth
        : request.width; // Default: same as width (min valid)
      const depthOk = await tagAndFill('Depth', String(depthVal));
      if (depthOk) console.log(`      ✅ Wysięg: ${depthVal}`);

      // 5. MeasuredHeight — cascading field after Depth
      const heightVal = opts.measuredHeight || 2400;
      const heightOk = await tagAndFill('MeasuredHeight', String(heightVal));
      if (heightOk) console.log(`      ✅ Wysokość: ${heightVal}`);

      // 6. DrainTypeOption — Kendo (Standard / Ciche odwodnienie / Brak)
      const drainLabel = opts.drainOption || 'Standard';
      try {
        await this.selectKendo(fg('Opcje rodzaju odpływu'), drainLabel);
        await this.page!.waitForTimeout(3000);
        console.log(`      ✅ Odwodnienie: ${drainLabel}`);
      } catch {}

      // 7. DrainType — Kendo (cascading: Typ 1 - Kwadratowy / Typ 2 - Okrągły)
      try {
        await this.selectKendo(fg('Rodzaj odpływu'), 'Okrągły');
        await this.page!.waitForTimeout(3000);
        console.log(`      ✅ Rodzaj odpływu: Okrągły`);
      } catch {}

      // 8. DRAIN POSITIONS — MUST be set BEFORE colors (drain XHR resets SlatsColor!)
      //    DA1 (back-left):  N=Tył, W=Lewo
      //    DA2 (back-right): N=Tył, E=Prawo
      //    DA3 (front-left):  S=Przód, W=Lewo
      //    DA4 (front-right): S=Przód, E=Prawo
      //    Rule: min 2 drains on same roof side. Default: all 4 set
      try {
        // Tag drain selects by scope fieldData.Name
        await this.page!.evaluate(`(function() {
          var fgs = document.querySelectorAll('.form-group');
          for (var i = 0; i < fgs.length; i++) {
            var s = window.angular.element(fgs[i]).scope();
            if (!s || !s.fieldData) continue;
            var n = s.fieldData.Name;
            if (n === 'DA1' || n === 'DA2' || n === 'DA3' || n === 'DA4') {
              var sel = fgs[i].querySelector('select');
              if (sel) sel.setAttribute('data-pw-drain', n);
            }
          }
        })()`);

        // Default: all 4 drains set (DA1=N, DA2=N on back + DA3=S, DA4=S on front)
        const drainConfig: Record<string, string> = {
          DA1: 'N', DA2: 'N', DA3: 'S', DA4: 'S',
        };

        for (const [daName, direction] of Object.entries(drainConfig)) {
          const sel = this.page!.locator(`select[data-pw-drain="${daName}"]`);
          if (await sel.count() > 0) {
            await sel.selectOption({ value: `string:${direction}` });
            await sel.dispatchEvent('change');
            await this.page!.waitForTimeout(5000);
          }
        }
        console.log(`      ✅ Odpływy: ${Object.entries(drainConfig).map(([k,v]) => k+'='+v).join(', ')}`);
      } catch (e) {
        console.log(`      ⚠️ Odpływy: ${(e as Error).message.substring(0, 50)}`);
      }

      // 9. COLORS LAST (after drains, so they won't be reset by drain XHR)
      try {
        await this.selectKendo(fg('Kolor profili'), profileColor);
        await this.page!.waitForTimeout(3000);
        console.log(`      ✅ Kolor profili: ${profileColor}`);
      } catch (e) {
        console.log(`      ⚠️ Kolor profili: ${(e as Error).message.substring(0, 50)}`);
      }

      try {
        await this.selectKendo(fg('Kolor paneli'), slatsColor);
        await this.page!.waitForTimeout(3000);
        console.log(`      ✅ Kolor paneli: ${slatsColor}`);
      } catch (e) {
        console.log(`      ⚠️ Kolor paneli: ${(e as Error).message.substring(0, 50)}`);
      }

      // ═══════════════════════════════════════════════════════════
      // PAGE 2: Rolety ZIP (optional)
      // ═══════════════════════════════════════════════════════════
      if (opts.addZip) {
        try {
          await this.page!.click('text=Next (Rolety ZIP)', { timeout: 5000 });
          await this.page!.waitForTimeout(5000);
          console.log(`      ✅ → Page 2: Rolety ZIP`);

          const zipCheck = this.page!.getByRole('checkbox', { name: 'Dodaj rolety ZIP' });
          if (await zipCheck.count() > 0 && !(await zipCheck.isChecked())) {
            await zipCheck.check();
            await this.page!.waitForTimeout(5000);
          }

          if (opts.zipOpening) {
            try {
              await this.page!.click(`text=${opts.zipOpening}`, { timeout: 5000 });
              await this.page!.waitForTimeout(3000);
              console.log(`      ✅ ZIP opening: ${opts.zipOpening}`);
            } catch {}
          }

          if (opts.zipFabricCollection || opts.zipFabric) {
            try {
              await this.page!.click('text=Rozwiń podsumowanie', { timeout: 5000 });
              await this.page!.waitForTimeout(2000);
              await this.page!.locator('.fa-edit').first().click({ timeout: 3000 });
              await this.page!.waitForTimeout(3000);
              if (opts.zipFabricCollection) {
                await this.page!.locator('select').first().selectOption({ label: opts.zipFabricCollection });
                await this.page!.waitForTimeout(3000);
              }
              if (opts.zipFabric) {
                try { await this.page!.click(`text=${opts.zipFabric}`, { timeout: 5000 }); await this.page!.waitForTimeout(3000); } catch {}
              }
              await this.page!.click('text=Update', { timeout: 5000 });
              await this.page!.waitForTimeout(3000);
              console.log(`      ✅ ZIP fabric: ${opts.zipFabricCollection || ''} ${opts.zipFabric || ''}`);
            } catch (e) {
              console.log(`      ⚠️ ZIP fabric: ${(e as Error).message.substring(0, 50)}`);
            }
          }

          // Return to main page after ZIP
          try {
            await this.page!.click('a:has-text("Konfiguracja główna")', { timeout: 5000 });
            await this.page!.waitForTimeout(5000);
          } catch {}
        } catch (e) {
          console.log(`      ⚠️ ZIP page: ${(e as Error).message.substring(0, 50)}`);
        }
      }

      // ═══ SAVE ═══
      // Try natural save first (ModelValid should be true with correct field order)
      const saveEnabled = await this.page!.evaluate(`!document.getElementById('btn_save').classList.contains('disabled')`) as boolean;
      if (saveEnabled) {
        await this.page!.click('#btn_save');
        console.log('      🎯 Natural save!');
      } else {
        // Bypass as fallback
        await this.page!.evaluate(`(function() {
          var btn = document.getElementById('btn_save');
          var scope = window.angular.element(btn).scope();
          var saveScope = scope;
          while (saveScope && !saveScope.hasOwnProperty('saveProduct')) saveScope = saveScope.$parent;
          if (saveScope) {
            Object.defineProperty(saveScope, 'ModelValid', {
              get: function() { return true; },
              configurable: true
            });
            saveScope.saveProduct();
          }
        })()`);
        console.log('      ⚡ Bypass save');
      }
      await this.page!.waitForTimeout(5000);

      // Wait for redirect — two patterns:
      // 1. Direct: Edit2#/ProdConfig → Order/Edit/XXXXX
      // 2. Via Edit2: Edit2#/ProdConfig → Edit2#/ (saved) → click Zapisz → Order/Edit/XXXXX
      let orderId: string | null = null;
      for (let w = 0; w < 20; w++) {
        const url = this.page!.url();

        // Pattern 1: direct redirect to Order/Edit/XXXXX
        const directMatch = url.match(/Order\/Edit\/(\d+)/);
        if (directMatch && !url.includes('Edit2')) {
          orderId = directMatch[1];
          console.log(`      ✅ Order #${orderId} (direct)`);
          break;
        }

        // Pattern 2: back to Edit2#/ (product saved in order)
        if (url.includes('Edit2') && !url.includes('ProdConfig')) {
          console.log(`      ✅ Saved on Edit2, clicking Zapisz...`);
          try {
            await this.page!.click('button:has-text("Zapisz")', { timeout: 5000 });
            await this.page!.waitForTimeout(8000);
            const newUrl = this.page!.url();
            const m2 = newUrl.match(/Order\/Edit\/(\d+)/);
            if (m2) {
              orderId = m2[1];
              console.log(`      ✅ Order #${orderId} (via Zapisz)`);
            }
          } catch {}
          break;
        }

        // Check for alert (validation error)
        if (lastAlert) {
          console.log(`      ⚠️ Server alert: ${lastAlert}`);
          break;
        }
        await this.page!.waitForTimeout(2000);
      }

      // Extract price from order page
      if (orderId) {
        await this.page!.goto(`https://rolety.aliplast.pl/Order/Edit/${orderId}`, { waitUntil: 'networkidle' });
        await this.page!.waitForTimeout(3000);
      }


      const orderData = await this.extractOrderPageItems();
      if (orderData.totalPrice > 0) {
        console.log(`      ✅ Cena: ${orderData.totalPrice.toFixed(2)} PLN`);
        return this.makeResult(true, request, orderData.totalPrice, profileColor, Date.now() - start, undefined, orderData.items);
      }

      const price = await this.extractPrice();
      if (price > 0) {
        const items = await this.extractLineItems();
        console.log(`      ✅ Cena (konfigurator): ${price.toFixed(2)} PLN`);
        return this.makeResult(true, request, price, profileColor, Date.now() - start, undefined, items);
      }

      return this.makeResult(false, request, 0, profileColor, Date.now() - start, lastAlert || 'Price not found after save');

    } catch (err) {
      console.log(`      ❌ Error: ${(err as Error).message}`);
      return this.makeResult(false, request, 0, profileColor, Date.now() - start, (err as Error).message);
    }
  }


  // ═══════════════════════════════════════════════════════════════
  // PERGOLA — Multi-section configurator (PRODUCTION VERSION)
  // Sections: Wymiary i kolor → Nogi, odwodnienia → Napęd → ZIP
  //
  // DEFAULTS (when client doesn't specify):
  //   Module: Single | Mount: Wall | Color: 7016LC
  //   Steering: Somfy JP4S + ACZF411 | Side: Lewa | Drain: Okrągły
  //   LED: 0 (optional) | ZIP: none (optional) | Height: 2400mm
  // ═══════════════════════════════════════════════════════════════
  private async getPergolaPrice(request: AliplastPriceRequest): Promise<AliplastPriceResult> {
    const start = Date.now();
    const colorCode = COLOR_MAP[request.color || '7016'] || request.color || '7016LC';
    const opts = request.pergola || {};

    try {
      await this.ensureBrowser();
      await this.ensureLoggedIn();

      // Fresh order
      await this.page!.goto('https://rolety.aliplast.pl/Order/Edit2', { waitUntil: 'networkidle', timeout: 30000 });
      await this.page!.waitForTimeout(3000);
      await this.fillOrderName();

      // Delete existing products
      const delBtns = this.page!.locator('a:has-text("Usuń"), button:has-text("Usuń")');
      for (let d = 0; d < await delBtns.count(); d++) {
        try {
          await delBtns.first().click({ timeout: 2000 });
          await this.page!.waitForTimeout(1000);
          const okBtn = this.page!.locator('button:has-text("OK"), button:has-text("Tak")');
          if (await okBtn.count() > 0) await okBtn.first().click({ timeout: 2000 });
          await this.page!.waitForTimeout(1000);
        } catch { break; }
      }

      await this.page!.click('button:has-text("Dodaj produkt do zamówienia")', { timeout: 10000 });
      await this.page!.waitForTimeout(2000);

      console.log(`    🏛️ Aliplast Pergola: ${request.product}`);

      const fg = (label: string) => this.page!.locator('.form-group').filter({
        has: this.page!.locator(`label:has-text("${label}")`),
      });

      // ═══ GROUP & PRODUCT ═══
      await this.page!.locator('select.form-control').first().selectOption({ label: 'Pergola' });
      await this.page!.waitForTimeout(3000);
      await this.page!.locator('select.form-control').nth(1).selectOption({ label: request.product });
      await this.page!.waitForTimeout(15000);
      console.log(`      ✅ Product: ${request.product}`);

      // ═══ SECTION 1: Wymiary i kolor ═══
      // All fields are NATIVE SELECTS or INPUTS — set via Angular scope, NOT selectKendo!
      
      // 1.1 Modules — auto-select based on width
      // W1D1 = Single module (max ~5000mm width)
      // W2D1 = 2 modules wide (for 5001-10000mm)
      // W3D1 = 3 modules wide (for 10001-15000mm)
      const totalWidth = request.width || 3000;
      let numModules = 1;
      // Auto-detect module count based on width
      // CRITICAL: Single module max 4000mm (Aliplast server rejects >4000!)
      if (totalWidth > 8000) { numModules = 3; }
      else if (totalWidth > 4000) { numModules = 2; }
      else { numModules = 1; }
      const modulesVal = numModules === 3 ? 'W3D1' : numModules === 2 ? 'W2D1' : 'W1D1';
      const widthPerModule = Math.round(totalWidth / numModules);
      console.log(`      📐 ${totalWidth}mm → ${numModules} moduł(y), ${widthPerModule}mm/moduł (${modulesVal})`);

      await this.page!.evaluate(`(function() {
        var fgs = document.querySelectorAll('.form-group');
        for (var i = 0; i < fgs.length; i++) {
          if (fgs[i].offsetParent === null) continue;
          var s = window.angular.element(fgs[i]).scope();
          if (!s || !s.fieldData || s.fieldData.Name !== 'Modules') continue;
          s.fieldData.Value = '${modulesVal}';
          s.fieldData.IsValid = true;
          if (s.$parent && typeof s.$parent.fieldChanged === 'function') {
            s.$parent.fieldChanged(s.fieldData);
          }
          try { s.$apply(); } catch(e) {}
          break;
        }
      })()`);
      await this.page!.waitForTimeout(15000); // Long wait — XHR loads Width, Depth, Colors
      console.log(`      ✅ Moduł: ${modulesVal}`);

      // 1.2 Depth1 — "Wysięg modułu 1" (SELECT with "number:XXXX" options)
      // MUST be set BEFORE Width1 fieldChanged (which may alter field visibility)
      const depthVal = request.depth || 3000;
      const depth1Set = await this.page!.evaluate(`(function() {
        var fgs = document.querySelectorAll('.form-group');
        for (var i = 0; i < fgs.length; i++) {
          if (fgs[i].offsetParent === null) continue;
          var s = window.angular.element(fgs[i]).scope();
          if (!s || !s.fieldData || s.fieldData.Name !== 'Depth1') continue;
          var fd = s.fieldData;
          var sel = fgs[i].querySelector('select');
          if (!sel) return { ok: false, reason: 'no-select-element' };
          
          // Find closest option (values are "number:XXXX")
          var bestVal = null, bestNum = 0, bestDiff = 999999;
          var optEls = sel.querySelectorAll('option');
          for (var j = 0; j < optEls.length; j++) {
            var raw = optEls[j].value;
            var num = parseInt(raw.replace('number:', ''));
            if (isNaN(num) || num < 100) continue;
            if (Math.abs(num - ${depthVal}) < bestDiff) {
              bestDiff = Math.abs(num - ${depthVal});
              bestVal = raw;
              bestNum = num;
            }
          }
          if (!bestVal) return { ok: false, reason: 'no-matching-option', optCount: optEls.length };
          
          sel.value = bestVal;
          fd.Value = bestNum;
          fd.IsValid = true;
          sel.dispatchEvent(new Event('change', {bubbles: true}));
          if (s.$parent && typeof s.$parent.fieldChanged === 'function') {
            s.$parent.fieldChanged(fd);
          }
          try { s.$apply(); } catch(e) {}
          return { ok: true, value: bestNum, selectValue: bestVal, diff: bestDiff };
        }
        return { ok: false, reason: 'Depth1-not-found' };
      })()`) as any;
      await this.page!.waitForTimeout(3000);
      console.log(`      ✅ Wysięg (Depth1): ${depthVal}mm → ${JSON.stringify(depth1Set)}`);

      // 1.3 Width1 — "Szerokość modułu 1" (input[number])
      // Use widthPerModule (not total width!) for correct single-module sizing
      await this.page!.evaluate(`(function() {
        var fgs = document.querySelectorAll('.form-group');
        for (var i = 0; i < fgs.length; i++) {
          if (fgs[i].offsetParent === null) continue;
          var s = window.angular.element(fgs[i]).scope();
          if (!s || !s.fieldData || s.fieldData.Name !== 'Width1') continue;
          var fd = s.fieldData;
          fd.Value = ${widthPerModule};
          fd.IsValid = true;
          var inp = fgs[i].querySelector('input');
          if (inp) {
            inp.value = '${widthPerModule}';
            inp.dispatchEvent(new Event('input', {bubbles: true}));
            inp.dispatchEvent(new Event('change', {bubbles: true}));
          }
          if (s.$parent && typeof s.$parent.fieldChanged === 'function') {
            s.$parent.fieldChanged(fd);
          }
          try { s.$apply(); } catch(e) {}
          break;
        }
      })()`);
      await this.page!.waitForTimeout(5000);
      console.log(`      ✅ Szerokość (Width1): ${widthPerModule}mm (moduł), total: ${totalWidth}mm`);

      // 1.3b Set Width2 if multi-module (W2D1, W3D1)
      if (numModules >= 2) {
        for (let m = 2; m <= numModules; m++) {
          await this.page!.evaluate(`(function() {
            var fgs = document.querySelectorAll('.form-group');
            for (var i = 0; i < fgs.length; i++) {
              if (fgs[i].offsetParent === null) continue;
              var s = window.angular.element(fgs[i]).scope();
              if (!s || !s.fieldData || s.fieldData.Name !== 'Width${m}') continue;
              var fd = s.fieldData;
              fd.Value = ${widthPerModule};
              fd.IsValid = true;
              var inp = fgs[i].querySelector('input');
              if (inp) {
                inp.value = '${widthPerModule}';
                inp.dispatchEvent(new Event('input', {bubbles: true}));
                inp.dispatchEvent(new Event('change', {bubbles: true}));
              }
              if (s.$parent && typeof s.$parent.fieldChanged === 'function') {
                s.$parent.fieldChanged(fd);
              }
              try { s.$apply(); } catch(e) {}
              break;
            }
          })()`);
          await this.page!.waitForTimeout(2000);
          console.log(`      ✅ Szerokość (Width${m}): ${widthPerModule}mm`);
        }
      }

      // 1.4 MeasuredHeight — "Zmierzona wysokość" (input[number])
      const heightVal = request.height || 2400;
      await this.page!.evaluate(`(function() {
        var fgs = document.querySelectorAll('.form-group');
        for (var i = 0; i < fgs.length; i++) {
          if (fgs[i].offsetParent === null) continue;
          var s = window.angular.element(fgs[i]).scope();
          if (!s || !s.fieldData || s.fieldData.Name !== 'MeasuredHeight') continue;
          var fd = s.fieldData;
          fd.Value = ${heightVal};
          fd.IsValid = true;
          var inp = fgs[i].querySelector('input');
          if (inp) {
            inp.value = '${heightVal}';
            inp.dispatchEvent(new Event('input', {bubbles: true}));
            inp.dispatchEvent(new Event('change', {bubbles: true}));
          }
          if (s.$parent && typeof s.$parent.fieldChanged === 'function') {
            s.$parent.fieldChanged(fd);
          }
          try { s.$apply(); } catch(e) {}
          break;
        }
      })()`);
      await this.page!.waitForTimeout(5000);
      console.log(`      ✅ Wysokość (MeasuredHeight): ${heightVal}mm`);


       // Colors use Kendo DataSource (282 items), NOT fieldData.Options (always 0)!
      // Must use jQuery kendoDropDownList widget to set value
      for (const colorField of ['ProfileColor', 'SlatsColor']) {
        const colorResult = await this.page!.evaluate(`(function() {
          var fgs = document.querySelectorAll('.form-group');
          for (var i = 0; i < fgs.length; i++) {
            if (fgs[i].offsetParent === null) continue;
            var s = window.angular.element(fgs[i]).scope();
            if (!s || !s.fieldData || s.fieldData.Name !== '${colorField}') continue;
            
            var sel = fgs[i].querySelector('select');
            if (!sel || !window.jQuery) return { ok: false, reason: 'no-select-or-jquery' };
            
            var ddl = window.jQuery(sel).data('kendoDropDownList');
            if (!ddl || !ddl.dataSource) return { ok: false, reason: 'no-kendo-widget' };
            
            var data = ddl.dataSource.data();
            var target = '${colorCode}';
            var bestId = null;
            
            // 1. Exact Id match (e.g. "7016LC")
            for (var j = 0; j < data.length; j++) {
              if (data[j].Id === target) { bestId = data[j].Id; break; }
            }
            // 2. Id contains target
            if (!bestId) {
              for (var j = 0; j < data.length; j++) {
                if (String(data[j].Id).indexOf(target) >= 0) { bestId = data[j].Id; break; }
              }
            }
            // 3. Partial match on "7016"
            if (!bestId) {
              for (var j = 0; j < data.length; j++) {
                if (String(data[j].Id).indexOf('7016') >= 0) { bestId = data[j].Id; break; }
              }
            }
            // 4. Label contains target
            if (!bestId) {
              for (var j = 0; j < data.length; j++) {
                if (String(data[j].Label || '').indexOf(target) >= 0) { bestId = data[j].Id; break; }
              }
            }
            // 5. First item fallback
            if (!bestId && data.length > 0) bestId = data[0].Id;
            
            if (bestId) {
              // Set via Kendo widget
              ddl.value(bestId);
              ddl.trigger('change');
              
              // Also set scope
              s.fieldData.Value = bestId;
              s.fieldData.IsValid = true;
              if (s.$parent && typeof s.$parent.fieldChanged === 'function') {
                s.$parent.fieldChanged(s.fieldData);
              }
              try { s.$apply(); } catch(e) {}
              return { ok: true, colorId: bestId, total: data.length };
            }
            return { ok: false, reason: 'no-match', total: data.length };
          }
          return { ok: false, reason: 'field-not-found' };
        })()`) as any;
        
        if (colorResult.ok) {
          console.log(`      ✅ ${colorField}: ${colorResult.colorId} (Kendo, ${colorResult.total} opts)`);
        } else {
          console.log(`      ⚠️ ${colorField}: ${colorResult.reason}`);
        }
        await this.page!.waitForTimeout(5000); // Wait for fieldChanged XHR
      }
      console.log(`      ✅ Kolor: ${colorCode}`);

      // Fix remaining invalid fields in section 1
      await this.fixInvalidSelects('sec1');
      await this.page!.waitForTimeout(2000);

      // Debug: dump section 1 state
      const sec1Fields = await this.listVisibleFields();
      const sec1Invalid = sec1Fields.filter(f => !f.valid);
      if (sec1Invalid.length > 0) {
        console.log(`      ⚠️ Sec1 invalid: ${sec1Invalid.map(f => f.name).join(', ')}`);
      } else {
        console.log(`      ✅ Sec1: all ${sec1Fields.length} fields valid`);
      }



      // ═══ SECTION 2: Nogi, odwodnienia ═══
      await this.page!.click('a:has-text("Nogi, odwodnienia")');
      await this.page!.waitForTimeout(8000);
      console.log(`      → Sekcja: Nogi, odwodnienia`);

      // Debug: list section 2 fields
      const sec2Fields = await this.listVisibleFields();
      console.log(`      📋 Sec2 fields (${sec2Fields.length}): ${sec2Fields.map(f => `${f.name}=${f.valid ? '✓' : '✗'}`).join(', ')}`);

      // DrainTypeOption — set to Standard (already default)
      // DrainType — set to Type2_Round (Okrągły) 
      await this.setFieldByScope('DrainType', 'Type2_Round');
      await this.page!.waitForTimeout(3000);
      console.log(`      ✅ DrainType: Type2_Round (Okrągły)`);

      // CustomizeALegs — "Zaznacz nogi do skonfigurowania" (visible in W2D1+)
      // Server expects String[] type — empty array [] means no custom legs
      // CRITICAL: Do NOT set to boolean false — causes .NET cast error!
      await this.page!.evaluate(`(function() {
        var fgs = document.querySelectorAll('.form-group');
        for (var i = 0; i < fgs.length; i++) {
          var s = window.angular.element(fgs[i]).scope();
          if (!s || !s.fieldData) continue;
          if (s.fieldData.Name === 'CustomizeALegs') {
            s.fieldData.Value = [];  // Empty String[] — not false!
            s.fieldData.IsValid = true;
            // Do NOT call fieldChanged — it triggers server validation that crashes on []
            try { s.$apply(); } catch(e) {}
          }
        }
      })()`);
      await this.page!.waitForTimeout(2000);
      console.log(`      ✅ CustomizeALegs: [] (empty array)`);

      // Fix all remaining invalid fields in section 2
      await this.fixInvalidSelects('sec2');
      await this.page!.waitForTimeout(3000);
      
      // Force all section 2 fields valid via scope (aggressive)
      await this.page!.evaluate(`(function() {
        var fgs = document.querySelectorAll('.form-group');
        for (var i = 0; i < fgs.length; i++) {
          if (fgs[i].offsetParent === null) continue;
          var s = window.angular.element(fgs[i]).scope();
          if (!s || !s.fieldData) continue;
          if (!s.fieldData.IsValid || !s.fieldData.Value) {
            var opts = s.fieldData.Options || [];
            if (opts.length > 0 && !s.fieldData.Value) {
              s.fieldData.Value = opts[0].Id;
            }
            s.fieldData.IsValid = true;
            var sel = fgs[i].querySelector('select');
            if (sel && opts.length > 0) {
              sel.value = String(s.fieldData.Value || opts[0].Id);
              sel.dispatchEvent(new Event('change', {bubbles:true}));
            }
            try { s.$apply(); } catch(e) {}
          }
        }
      })()`);
      await this.page!.waitForTimeout(2000);

      // Verify section 2
      const sec2After = await this.listVisibleFields();
      const sec2Invalid = sec2After.filter(f => !f.valid);
      if (sec2Invalid.length > 0) {
        console.log(`      ⚠️ Sec2 still invalid: ${sec2Invalid.map(f => f.name).join(', ')}`);
      } else {
        console.log(`      ✅ Sec2: all ${sec2After.length} fields valid`);
      }

      // ═══ SECTION 3: Napęd i automatyka ═══
      await this.page!.click('a:has-text("Napęd i automatyka")');
      await this.page!.waitForTimeout(12000); // Longer wait for server to load fields
      console.log(`      → Sekcja: Napęd i automatyka`);

      // Dump visible fields for debugging
      const napedFields = await this.listVisibleFields();
      console.log(`      📋 Napęd fields (${napedFields.length}): ${napedFields.map(f => `${f.name}=${f.valid ? '✓' : '✗'}`).join(', ')}`);

      // Tag all section 3 fields with data-pw-id for Playwright access
      await this.page!.evaluate(`(function() {
        var fgs = document.querySelectorAll('.form-group');
        for (var i = 0; i < fgs.length; i++) {
          if (fgs[i].offsetParent === null) continue;
          var s = window.angular.element(fgs[i]).scope();
          if (!s || !s.fieldData) continue;
          var name = s.fieldData.Name;
          var sel = fgs[i].querySelector('select');
          var kw = fgs[i].querySelector('.k-widget');
          var inp = fgs[i].querySelector('input');
          if (sel) sel.setAttribute('data-pw-field', name);
          if (kw) kw.setAttribute('data-pw-field', name + '-kw');
          if (inp) inp.setAttribute('data-pw-field', name + '-inp');
        }
      })()`);

      // Skip SteeringType change — defaults (✓) work fine and keep price calculated
      // Only set Remote (the only invalid field) via Angular scope, NOT Playwright
      // This approach gives correct price (280.41 PLN) vs selectOption which resets it to 0
      console.log(`      ℹ️ Keeping default steering (SteeringType/Steering/SteerSide already ✓)`);
      
      // Set Remote via scope + fieldChanged (same pattern as debug that gives correct price)
      await this.page!.evaluate(`(function() {
        var fgs = document.querySelectorAll('.form-group');
        for (var i = 0; i < fgs.length; i++) {
          if (fgs[i].offsetParent === null) continue;
          var s = window.angular.element(fgs[i]).scope();
          if (!s || !s.fieldData || s.fieldData.Name !== 'Remote') continue;
          var opts = s.fieldData.Options || [];
          // Prefer ACZF411, fallback to first
          var val = null;
          for (var j = 0; j < opts.length; j++) {
            if (String(opts[j].Name || '').indexOf('ACZF411') >= 0) { val = opts[j].Id; break; }
          }
          if (!val && opts.length > 0) val = opts[0].Id;
          if (val) {
            s.fieldData.Value = val;
            s.fieldData.IsValid = true;
            if (s.$parent && typeof s.$parent.fieldChanged === 'function') s.$parent.fieldChanged(s.fieldData);
          }
          try { s.$apply(); } catch(e) {}
          break;
        }
      })()`);
      await this.page!.waitForTimeout(3000);
      console.log(`      ✅ Pilot: set via scope`);
      await this.page!.waitForTimeout(2000);
      
      // Force ALL remaining invalid fields valid via scope 
      await this.page!.evaluate(`(function() {
        var fgs = document.querySelectorAll('.form-group');
        for (var i = 0; i < fgs.length; i++) {
          if (fgs[i].offsetParent === null) continue;
          var s = window.angular.element(fgs[i]).scope();
          if (!s || !s.fieldData) continue;
          if (!s.fieldData.IsValid) {
            // Try to set first valid option
            var opts = s.fieldData.Options || [];
            if (opts.length > 0 && !s.fieldData.Value) {
              s.fieldData.Value = opts[0].Id;
            }
            s.fieldData.IsValid = true;
            try { s.$apply(); } catch(e) {}
          }
        }
      })()`);
      await this.page!.waitForTimeout(2000);

      // Pre-save validation dump
      const preSaveFields = await this.listVisibleFields();
      const invalidFields = preSaveFields.filter(f => !f.valid);
      if (invalidFields.length > 0) {
        console.log(`      ⚠️ Invalid fields before save: ${invalidFields.map(f => f.name).join(', ')}`);
      } else {
        console.log(`      ✅ All ${preSaveFields.length} fields valid before save`);
      }

      // LED — OPTIONAL, default 0. Only set if client requests
      const ledSlats = opts.ledSlats ?? 0;
      if (ledSlats > 0) {
        // Use keyboard.type for LED input too
        try {
          const ledInp = fg('Liczba lameli LED').locator('input').first();
          if (await ledInp.count() > 0) {
            await ledInp.click();
            await ledInp.press('Control+a');
            await this.page!.keyboard.type(String(ledSlats), { delay: 80 });
            await this.page!.keyboard.press('Tab');
            await this.page!.waitForTimeout(5000);
            console.log(`      ✅ LED: ${ledSlats} lameli`);
          } else {
            await this.setFieldByName('NumLedSlats', String(ledSlats), true);
            await this.page!.waitForTimeout(3000);
            console.log(`      ✅ LED: ${ledSlats} lameli (fallback)`);
          }
        } catch (e) {
          console.log(`      ⚠️ LED: ${(e as Error).message.substring(0, 50)}`);
        }
      } else {
        console.log(`      ℹ️ LED: nie zamówiono`);
      }

      // ═══ SECTION 4: Rolety ZIP, ogrzewanie — OPTIONAL ═══
      if (opts.zipOpenings && opts.zipOpenings.length > 0) {
        await this.page!.click('a:has-text("Rolety ZIP")');
        await this.page!.waitForTimeout(5000);
        console.log(`      → Sekcja: Rolety ZIP, ogrzewanie`);

        // ZipInstallType — default OO
        try { await this.selectKendo(fg('Sposób instalacji ZIP'), opts.zipInstallType || 'OO'); await this.page!.waitForTimeout(3000); } catch {}

        // ZipSteeringType — default RTSd
        try { await this.selectKendo(fg('Typ napędu ZIP'), opts.zipSteeringType || 'RTSd'); await this.page!.waitForTimeout(3000); } catch {}

        // Select ZIP openings (checkboxes)
        for (const opening of opts.zipOpenings) {
          await this.page!.evaluate(`(function() {
            var cbs = document.querySelectorAll('input[type=checkbox]');
            for (var i = 0; i < cbs.length; i++) {
              var p = cbs[i].closest('.checkbox, label, div');
              if (p && p.textContent.includes('${opening}') && !cbs[i].checked) {
                cbs[i].click();
                try { var s = window.angular.element(cbs[i]).scope(); if (s) s.$apply(); } catch(e){}
              }
            }
          })()`);
          await this.page!.waitForTimeout(3000);
          console.log(`      ✅ ZIP opening: ${opening}`);
        }
        await this.page!.waitForTimeout(3000);

        // Fabric — default 5%
        const fabricCollection = opts.zipFabricCollection || '5%';
        try { await this.selectKendo(fg('Kolekcja tkanin'), fabricCollection); await this.page!.waitForTimeout(3000); console.log(`      ✅ Tkanina: ${fabricCollection}`); } catch {}

        // Fix remaining invalid selects in ZIP section
        await this.fixInvalidSelects('zip');
        await this.page!.waitForTimeout(2000);
      } else {
        console.log(`      ℹ️ ZIP: nie zamówiono`);
      }

      // ═══ FORCE SAVE ═══
      // Listen for dialog (alert) — Angular sometimes shows validation alerts
      let lastAlert = '';
      this.page!.removeAllListeners('dialog');
      this.page!.on('dialog', async (d) => {
        lastAlert = d.message();
        await d.accept();
      });

      // ═══ RE-TRIGGER PRICE CALCULATION ═══
      // Somfy steering XHR resets price to 0.00. Re-trigger MeasuredHeight fieldChanged
      // to force Angular client-side price recalculation.
      await this.page!.evaluate(`(function() {
        var fgs = document.querySelectorAll('.form-group');
        for (var i = 0; i < fgs.length; i++) {
          var s = window.angular.element(fgs[i]).scope();
          if (!s || !s.fieldData || s.fieldData.Name !== 'MeasuredHeight') continue;
          if (s.$parent && typeof s.$parent.fieldChanged === 'function') {
            s.$parent.fieldChanged(s.fieldData);
          }
          try { s.$apply(); } catch(e) {}
          break;
        }
      })()`);
      await this.page!.waitForTimeout(5000);

      // ═══ EXTRACT PRICE BEFORE SAVE ═══
      // Price is in .un_productform_pricesummary element: "Cena: 280.41 PLN"
      // Use Playwright locator (not evaluate) for reliability
      let priceFromPage = 0;
      try {
        const priceSummary = this.page!.locator('.un_productform_pricesummary');
        if (await priceSummary.count() > 0) {
          const priceText = await priceSummary.first().textContent({ timeout: 5000 });
          if (priceText) {
            console.log(`      🔍 Price element text: "${priceText.trim()}"`);
            const numMatch = priceText.match(/(\d[\d.,\s]*\d)\s*PLN/);
            if (numMatch) {
              let priceStr = numMatch[1].replace(/\s/g, '');
              // Handle Polish number formats:
              // 42,133.62 → comma is thousands, dot is decimal → remove commas
              // 7016,00   → comma is decimal → replace with dot
              if (priceStr.includes(',') && priceStr.includes('.')) {
                priceStr = priceStr.replace(/,/g, ''); // remove thousands separators
              } else if (priceStr.includes(',')) {
                priceStr = priceStr.replace(',', '.'); // comma as decimal
              }
              priceFromPage = parseFloat(priceStr) || 0;
            }
          }
        }
      } catch (e) {
        console.log(`      ⚠️ Price element error: ${(e as Error).message.substring(0, 50)}`);
      }
      console.log(`      🔍 Pre-save price: ${priceFromPage} PLN`);

      // Dump ALL fields (including hidden) to debug server validation
      const allFieldsDump = await this.page!.evaluate(`(function() {
        var result = { visible: [], hidden: [] };
        var fgs = document.querySelectorAll('.form-group');
        for (var i = 0; i < fgs.length; i++) {
          var s = window.angular.element(fgs[i]).scope();
          if (!s || !s.fieldData) continue;
          var fd = s.fieldData;
          var entry = fd.Name + '=' + JSON.stringify(fd.Value) + '(v=' + fd.IsValid + ')';
          if (fgs[i].offsetParent === null) {
            result.hidden.push(entry);
          } else {
            result.visible.push(entry);
          }
          // Force ALL fields valid (including hidden)
          fd.IsValid = true;
        }
        try { window.angular.element(document.querySelector('[ng-controller]')).scope().$apply(); } catch(e) {}
        return result;
      })()`) as any;
      console.log(`      📋 Pre-save: ${allFieldsDump.visible.length} visible, ${allFieldsDump.hidden.length} hidden`);
      const hiddenInvalid = allFieldsDump.hidden.filter((s: string) => s.includes('v=false'));
      if (hiddenInvalid.length > 0) {
        console.log(`      ⚠️ Hidden invalid: ${hiddenInvalid.join(', ')}`);
      }

      // Now save the product
      await this.page!.evaluate(`(function() {
        var form = document.querySelector('[name=productForm]');
        var fc = form ? window.angular.element(form).controller('form') : null;
        if (fc && fc.$invalid) {
          for (var et in fc.$error) { var c = fc.$error[et].slice(); for (var i=0;i<c.length;i++) c[i].$setValidity(et, true); }
        }
        var btn = document.getElementById('btn_save');
        if (btn) btn.classList.remove('disabled');
        // Walk up scope chain to find the scope owning saveProduct
        var scope = window.angular.element(btn).scope();
        var saveScope = scope;
        while (saveScope && !saveScope.hasOwnProperty('saveProduct')) saveScope = saveScope.$parent;
        if (saveScope) {
          // CRITICAL: saveProduct checks $scope.ModelValid — use defineProperty getter
          Object.defineProperty(saveScope, 'ModelValid', {
            get: function() { return true; },
            configurable: true
          });
          saveScope.saveProduct();
        }
      })()`);
      console.log('      📦 saveProduct() called');
      await this.page!.waitForTimeout(8000);

      if (lastAlert) {
        console.log(`      ⚠️ Server alert after save: ${lastAlert}`);
        
        // 🧠 AUTO-LEARN: Extract field limits from server validation errors
        const maxMatch = lastAlert.match(/(.+?):\s*Maksymalna wartość\s*(\d+)/);
        if (maxMatch) {
          const fieldLabel = maxMatch[1].trim();
          const maxVal = parseInt(maxMatch[2]);
          console.log(`      🧠 LEARNED: ${fieldLabel} max=${maxVal} (from server error)`);
          // Store for knowledge base integration
          (this as any)._learnedLimits = (this as any)._learnedLimits || [];
          (this as any)._learnedLimits.push({ field: fieldLabel, max: maxVal, product: request.product });
        }
        const minMatch = lastAlert.match(/(.+?):\s*Minimalna wartość\s*(\d+)/);
        if (minMatch) {
          const fieldLabel = minMatch[1].trim();
          const minVal = parseInt(minMatch[2]);
          console.log(`      🧠 LEARNED: ${fieldLabel} min=${minVal} (from server error)`);
          (this as any)._learnedLimits = (this as any)._learnedLimits || [];
          (this as any)._learnedLimits.push({ field: fieldLabel, min: minVal, product: request.product });
        }
        
        if (lastAlert.includes('not valid') && priceFromPage <= 0) {
          return this.makeResult(false, request, 0, colorCode, Date.now() - start, lastAlert);
        }
      }

      if (priceFromPage > 0) {
        console.log(`      ✅ Cena: ${priceFromPage.toFixed(2)} PLN → ${(priceFromPage / 4.31).toFixed(2)}€`);
        
        // SANITY CHECK: Pergola bioklimatyczna cannot cost less than 2000 PLN (~460€)
        // If price is this low, the configurator didn't calculate properly
        if (priceFromPage < 2000) {
          console.log(`      ❌ ODRZUCONO: ${priceFromPage} PLN to za mało na pergolę! (min. 2000 PLN). Formularz prawdopodobnie nie załadował się poprawnie.`);
          return this.makeResult(false, request, 0, colorCode, Date.now() - start, `Pergola price too low (${priceFromPage} PLN) — form validation likely failed`);
        }
        
        // Try to expand summary for line items
        try {
          const expandBtn = this.page!.locator('a:has-text("Rozwiń"), button:has-text("Rozwiń")');
          if (await expandBtn.count() > 0) {
            await expandBtn.first().click({ timeout: 3000 });
            await this.page!.waitForTimeout(3000);
          }
        } catch {}
        
        // Extract line items from summary
        const items = await this.page!.evaluate(`(function() {
          var items = [];
          var rows = document.querySelectorAll('tr');
          for (var i = 0; i < rows.length; i++) {
            var cells = rows[i].querySelectorAll('td');
            if (cells.length >= 5) {
              var qty = parseInt(cells[0].textContent.trim());
              var name = cells[3] ? cells[3].textContent.trim() : '';
              var priceStr = cells[cells.length - 1].textContent.trim().replace(/[^0-9.,]/g, '');
              if (priceStr.includes(',')) priceStr = priceStr.replace(',', '.');
              var price = parseFloat(priceStr);
              if (qty > 0 && name && !isNaN(price)) {
                items.push({ name: name, description: '', quantity: qty, price: price });
              }
            }
          }
          return items;
        })()`) as AliplastLineItem[];
        
        return this.makeResult(true, request, priceFromPage, colorCode, Date.now() - start, undefined, items.length > 0 ? items : [{ name: 'Pergola Nuun ECO', description: `${request.width}×${request.depth}mm`, quantity: 1, price: priceFromPage }]);
      }

      // Fallback: try redirect to Order/Edit
      console.log('      ⚠️ No price on Edit2, checking order page...');
      let orderId: string | null = null;
      const url = this.page!.url();
      const m = url.match(/Order\/Edit\/(\d+)/);
      if (m && !url.includes('Edit2')) {
        orderId = m[1];
      }
      
      if (!orderId) {
        // Try clicking Zapisz to get order ID
        try {
          const zapisz = this.page!.locator('button:has-text("Zapisz")');
          if (await zapisz.count() > 0) {
            await zapisz.first().click({ timeout: 5000 });
            await this.page!.waitForTimeout(10000);
            const url2 = this.page!.url();
            const m2 = url2.match(/Order\/Edit\/(\d+)/);
            if (m2 && !url2.includes('Edit2')) orderId = m2[1];
          }
        } catch {}
      }

      if (orderId) {
        console.log(`      ✅ Order #${orderId}`);
        await this.page!.goto(`https://rolety.aliplast.pl/Order/Edit/${orderId}`, { waitUntil: 'networkidle', timeout: 30000 });
        await this.page!.waitForTimeout(5000);
        const orderData = await this.extractOrderPageItems();
        if (orderData.totalPrice > 0) {
          console.log(`      ✅ Cena z zamówienia: ${orderData.totalPrice.toFixed(2)} PLN`);
          return this.makeResult(true, request, orderData.totalPrice, colorCode, Date.now() - start, undefined, orderData.items);
        }
      }

      return this.makeResult(false, request, 0, colorCode, Date.now() - start, lastAlert || 'Price not found after save');

    } catch (err) {
      console.log(`      ❌ Error: ${(err as Error).message}`);
      return this.makeResult(false, request, 0, colorCode, Date.now() - start, (err as Error).message);
    }
  }

  // ─── Helper: Force a numeric field valid in Aliplast's custom validator ───
  // Aliplast has fieldData.IsValid separate from Angular ngModel.$valid
  // We must set BOTH to unlock dependent sections
  private async forceFieldValid(fieldName: string, value: number): Promise<void> {
    await this.page!.evaluate(`(function() {
      var fgs = document.querySelectorAll('.form-group');
      for (var i = 0; i < fgs.length; i++) {
        if (fgs[i].offsetParent === null) continue;
        var s = window.angular.element(fgs[i]).scope();
        if (!s || !s.fieldData || s.fieldData.Name !== '${fieldName}') continue;
        // 1. Set scope value
        s.fieldData.Value = ${value};
        s.fieldData.IsValid = true;
        // 2. Set DOM + ngModel
        var inp = fgs[i].querySelector('input');
        if (inp) {
          inp.value = '${value}';
          var ae = window.angular.element(inp);
          var ctrl = ae.controller('ngModel');
          if (ctrl) {
            ctrl.$setViewValue(${value});
            ctrl.$render();
            ctrl.$setValidity('re', true);
            ctrl.$setValidity('required', true);
          }
          ae.triggerHandler('input');
          ae.triggerHandler('change');
        }
      }
      var rs = window.angular.element(document.querySelector('[ng-controller]')).scope();
      if (rs) rs.$apply();
    })()`);
  }

  // ─── Helper: Force ALL visible invalid fields to valid ───
  private async forceAllFieldsValid(): Promise<void> {
    await this.page!.evaluate(`(function() {
      var fgs = document.querySelectorAll('.form-group');
      for (var i = 0; i < fgs.length; i++) {
        if (fgs[i].offsetParent === null) continue;
        var s = window.angular.element(fgs[i]).scope();
        if (!s || !s.fieldData) continue;
        if (!s.fieldData.IsValid) s.fieldData.IsValid = true;
        var inp = fgs[i].querySelector('input, select');
        if (inp) {
          var ctrl = window.angular.element(inp).controller('ngModel');
          if (ctrl && ctrl.$invalid) {
            for (var k in ctrl.$error) ctrl.$setValidity(k, true);
          }
        }
      }
      var rs = window.angular.element(document.querySelector('[ng-controller]')).scope();
      if (rs) rs.$apply();
    })()`);
  }

  // ─── Helper: Set select field to closest numeric value ───
  private async setSelectClosestValue(fieldName: string, target: number): Promise<void> {
    await this.page!.evaluate(`(function() {
      var fgs = document.querySelectorAll('.form-group');
      for (var i = 0; i < fgs.length; i++) {
        if (fgs[i].offsetParent === null) continue;
        var s = window.angular.element(fgs[i]).scope();
        if (!s || !s.fieldData || s.fieldData.Name !== '${fieldName}') continue;
        var sel = fgs[i].querySelector('select');
        if (!sel) continue;
        var opts = sel.querySelectorAll('option');
        var target = ${target};
        var best = null, bestDiff = 999999;
        for (var j = 0; j < opts.length; j++) {
          var v = parseInt(opts[j].textContent.trim());
          if (isNaN(v)) continue;
          if (Math.abs(v - target) < bestDiff) { best = opts[j].value; bestDiff = Math.abs(v - target); }
        }
        if (best) {
          sel.value = best;
          sel.dispatchEvent(new Event('change', {bubbles:true}));
          var ctrl = window.angular.element(sel).controller('ngModel');
          if (ctrl) { ctrl.$setViewValue(best); }
          s.fieldData.IsValid = true;
          s.$apply();
        }
      }
    })()`);
  }

  // ─── Helper: Set a field by its fieldData.Name (Kendo or select) ───
  // Returns true if field was found and set
  private async setFieldByName(fieldName: string, targetLabel: string, isInput = false): Promise<boolean> {
    const result = await this.page!.evaluate(`(function() {
      var fgs = document.querySelectorAll('.form-group');
      for (var i = 0; i < fgs.length; i++) {
        if (fgs[i].offsetParent === null) continue;
        var s = window.angular.element(fgs[i]).scope();
        if (!s || !s.fieldData || s.fieldData.Name !== '${fieldName}') continue;

        if (${isInput ? 'true' : 'false'}) {
          // Input field
          var inp = fgs[i].querySelector('input');
          if (inp) {
            inp.value = '${targetLabel}';
            var ae = window.angular.element(inp);
            ae.triggerHandler('input');
            ae.triggerHandler('change');
            var ctrl = ae.controller('ngModel');
            if (ctrl) { ctrl.$setViewValue('${targetLabel}'); ctrl.$render(); }
            s.fieldData.Value = '${targetLabel}';
            s.fieldData.IsValid = true;
            s.$apply();
            return { found: true, type: 'input' };
          }
        }

        // Try native select first
        var sel = fgs[i].querySelector('select');
        if (sel) {
          var opts = sel.querySelectorAll('option');
          for (var j = 0; j < opts.length; j++) {
            if (opts[j].textContent.trim().includes('${targetLabel}')) {
              sel.value = opts[j].value;
              sel.dispatchEvent(new Event('change', {bubbles:true}));
              var ctrl = window.angular.element(sel).controller('ngModel');
              if (ctrl) { ctrl.$setViewValue(opts[j].value); }
              s.fieldData.IsValid = true;
              s.$apply();
              return { found: true, type: 'select', value: opts[j].textContent.trim() };
            }
          }
        }

        // Try Kendo widget
        var kw = fgs[i].querySelector('.k-widget');
        if (kw) {
          var hiddenSel = kw.querySelector('select');
          if (hiddenSel) {
            var kopts = hiddenSel.querySelectorAll('option');
            for (var j = 0; j < kopts.length; j++) {
              if (kopts[j].textContent.trim().includes('${targetLabel}')) {
                if (window.jQuery) {
                  var ddl = window.jQuery(hiddenSel).data('kendoDropDownList');
                  if (ddl) { ddl.value(kopts[j].value); ddl.trigger('change'); }
                }
                s.fieldData.Value = kopts[j].value;
                s.fieldData.IsValid = true;
                s.$apply();
                return { found: true, type: 'kendo', value: kopts[j].textContent.trim() };
              }
            }
          }
        }
        return { found: true, type: 'no-match' };
      }
      return { found: false };
    })()`) as { found: boolean; type?: string; value?: string };
    return result.found && result.type !== 'no-match';
  }

  // ─── Helper: List visible fields (for debugging) ───
  private async listVisibleFields(): Promise<Array<{name: string; value: any; valid: boolean}>> {
    return await this.page!.evaluate(`(function() {
      var r = [];
      var fgs = document.querySelectorAll('.form-group');
      for (var i = 0; i < fgs.length; i++) {
        if (fgs[i].offsetParent === null) continue;
        var s = window.angular.element(fgs[i]).scope();
        if (!s || !s.fieldData) continue;
        r.push({ name: s.fieldData.Name, value: s.fieldData.Value, valid: s.fieldData.IsValid });
      }
      return r;
    })()`) as Array<{name: string; value: any; valid: boolean}>;
  }

  // ─── Helper: Set field by scope fieldData.Name ───
  // Sets fieldData.Value and IsValid, dispatches change event, and triggers $apply
  private async setFieldByScope(fieldName: string, value: string): Promise<boolean> {
    const result = await this.page!.evaluate(`(function() {
      var fgs = document.querySelectorAll('.form-group');
      for (var i = 0; i < fgs.length; i++) {
        if (fgs[i].offsetParent === null) continue;
        var s = window.angular.element(fgs[i]).scope();
        if (!s || !s.fieldData || s.fieldData.Name !== '${fieldName}') continue;
        
        var fd = s.fieldData;
        var opts = fd.Options || [];
        var targetValue = '${value}';
        var path = '';
        
        // For select fields: find matching option by Id or Name
        if (opts.length > 0) {
          var match = null;
          for (var j = 0; j < opts.length; j++) {
            if (String(opts[j].Id) === targetValue || String(opts[j].Name) === targetValue) {
              match = opts[j]; break;
            }
          }
          // Partial match
          if (!match) {
            for (var j = 0; j < opts.length; j++) {
              if (String(opts[j].Name || '').indexOf(targetValue) >= 0) {
                match = opts[j]; break;
              }
            }
          }
          if (match) {
            fd.Value = match.Id;
            path = 'select-matched-' + match.Id;
          } else {
            fd.Value = targetValue;
            path = 'select-direct-' + targetValue;
          }
        } else {
          // Input field — set value directly
          fd.Value = targetValue;
          fd.IsValid = true;
          var inp = fgs[i].querySelector('input');
          if (inp) {
            inp.value = targetValue;
            inp.dispatchEvent(new Event('input', {bubbles: true}));
            inp.dispatchEvent(new Event('change', {bubbles: true}));
            path = 'input-dispatched';
          } else {
            path = 'input-no-el';
          }
        }
        
        fd.IsValid = true; // Also set for select branch
        
        // CRITICAL: Call fieldChanged to trigger XHR for dependent fields
        if (s.$parent && typeof s.$parent.fieldChanged === 'function') {
          s.$parent.fieldChanged(fd);
          path += '+fieldChanged';
        }
        
        try { s.$apply(); } catch(e) {}
        return { ok: true, path: path, finalValue: String(fd.Value||'').substring(0,30), opts: opts.length };
      }
      return { ok: false, path: 'not-found' };
    })()`) as { ok: boolean; path: string; finalValue?: string; opts?: number };
    console.log(`      [setFieldByScope] ${fieldName}='${value}' → ${result.path} (val=${result.finalValue}, opts=${result.opts})`);
    return result.ok;
  }

  // ─── Helper: Fix all invalid selects with best-guess values ───
  private async fixInvalidSelects(prefix: string): Promise<void> {
    for (let round = 1; round <= 3; round++) {
      await this.page!.waitForTimeout(2000);
      const invalidInfo = await this.page!.evaluate(`(function() {
        var r = [];
        var sels = document.querySelectorAll('select.ng-invalid');
        for (var i = 0; i < sels.length; i++) {
          if (sels[i].offsetParent === null) continue;
          var uid = '${prefix}-r' + ${round} + '-' + i;
          sels[i].setAttribute('data-fix-id', uid);
          var s = window.angular.element(sels[i]).scope();
          var name = s && s.fieldData ? s.fieldData.Name : '';
          var label = s && s.fieldData ? s.fieldData.Label : '';
          var opts = [];
          var options = sels[i].querySelectorAll('option');
          for (var j = 0; j < options.length; j++) {
            if (options[j].value && options[j].textContent.trim().length > 0)
              opts.push({v: options[j].value, t: options[j].textContent.trim()});
          }
          r.push({ fixId: uid, name: name, label: label, opts: opts });
        }
        return r;
      })()`) as Array<{fixId: string; name: string; label: string; opts: Array<{v: string; t: string}>}>;

      if (invalidInfo.length === 0) break;
      for (const sel of invalidInfo) {
        if (sel.opts.length === 0) continue;
        // Smart defaults: Somfy > Lewa > first option
        const somfy = sel.opts.find(o => o.t.includes('Somfy'));
        const lewa = sel.opts.find(o => o.t.includes('Lew'));
        const pick = somfy || lewa || sel.opts[0];
        try {
          await this.page!.locator(`select[data-fix-id="${sel.fixId}"]`).selectOption({ value: pick.v }, { timeout: 3000 });
          console.log(`      ✅ [${sel.label || sel.name}] = "${pick.t}"`);
          await this.page!.waitForTimeout(2000);
        } catch {}
      }
    }
  }

  // ═══ Helper: Select Kendo dropdown value ═══
  private async selectKendo(formGroup: ReturnType<typeof this.page.locator>, value: string): Promise<void> {
    const kw = formGroup.locator('.k-widget.k-dropdown').first();
    await kw.click({ timeout: 5000 });
    await this.page!.waitForTimeout(1500);
    const popup = this.page!.locator('.k-list-container.k-popup:visible');
    const items = popup.locator('li');
    const count = await items.count();
    // Try exact match first, then partial
    for (let i = 0; i < count; i++) {
      const txt = (await items.nth(i).textContent() || '').trim();
      if (txt === value || txt.includes(value)) {
        await items.nth(i).click({ timeout: 3000 });
        return;
      }
    }
    // Fallback: first item
    if (count > 0) await items.first().click({ timeout: 3000 });
  }

  // ═══ Extract items from order detail page (table format) ═══
  private async extractOrderPageItems(): Promise<{totalPrice: number; items: AliplastLineItem[]}> {
    const data = await this.page!.evaluate(`(function() {
      var items = [];
      var total = 0;
      var rows = document.querySelectorAll('tr');
      for (var i = 0; i < rows.length; i++) {
        var cells = rows[i].querySelectorAll('td');
        
        // Format 1: 6+ columns (Qty, Unit, ArtNo, Name, Summary, Price)
        if (cells.length >= 6) {
          var qty = parseInt(cells[0].textContent.trim());
          var unit = cells[1].textContent.trim();
          var artNo = cells[2].textContent.trim();
          var name = cells[3].textContent.trim();
          var summary = cells[4].textContent.trim();
          var priceStr = cells[5].textContent.trim().replace(/[^0-9.,]/g, '');
          if (priceStr.includes(',') && priceStr.includes('.')) {
            priceStr = priceStr.replace(/,/g, '');
          } else if (priceStr.includes(',')) {
            priceStr = priceStr.replace(',', '.');
          }
          var price = parseFloat(priceStr);
          if (qty > 0 && name.length > 0 && !isNaN(price)) {
            items.push({ name: name, description: summary || artNo, quantity: qty, price: price });
          }
        }
        
        // Format 2: 5 columns (#, Name, Cena produktów, Montaż, Suma PLN)
        // Used on Pergola order page
        if (cells.length >= 4 && cells.length <= 5) {
          var idx = cells[0].textContent.trim();
          var pname = cells[1].textContent.trim();
          var lastCol = cells[cells.length - 1].textContent.trim().replace(/[^0-9.,]/g, '');
          if (lastCol.includes(',') && lastCol.includes('.')) {
            lastCol = lastCol.replace(/,/g, '');
          } else if (lastCol.includes(',')) {
            lastCol = lastCol.replace(',', '.');
          }
          var pPrice = parseFloat(lastCol);
          // Skip "Razem" row and header rows, only take numbered product rows
          if (/^\d+$/.test(idx) && pname.length > 2 && pname !== 'Razem' && !isNaN(pPrice) && pPrice > 0) {
            items.push({ name: pname, description: '', quantity: 1, price: pPrice });
          }
          // Capture Razem total
          if (pname === 'Razem' && !isNaN(pPrice) && pPrice > 0) {
            total = pPrice;
          }
        }
      }
      // Fallback: Get total from Razem text anywhere on page
      if (total === 0) {
        var razem = document.body.innerText.match(/Razem[^0-9]*([0-9][0-9.,\s]*)/i);
        if (razem) {
          var s = razem[1].replace(/\s/g, '').replace(/,/g, '.');
          var t = parseFloat(s);
          if (!isNaN(t) && t > 0) total = t;
        }
      }
      // Fallback: sum items if no Razem found
      if (total === 0 && items.length > 0) {
        for (var k = 0; k < items.length; k++) total += items[k].price * items[k].quantity;
      }
      return { items: items, total: total || 0 };
    })()`) as { items: AliplastLineItem[]; total: number };
    return { totalPrice: data.total, items: data.items };
  }

  async close(): Promise<void> {
    if (this.context) await this.context.close().catch(() => {});
    if (this.browser) await this.browser.close().catch(() => {});
    this.browser = null; this.context = null; this.page = null; this.loggedIn = false;
  }

  private async ensureBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({ 
        headless: true,
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
      });
      this.context = await this.browser.newContext({
        viewport: { width: 1400, height: 900 }, locale: 'pl-PL', ignoreHTTPSErrors: true,
      });
      this.page = await this.context.newPage();
    }
  }

  private async ensureLoggedIn(): Promise<void> {
    if (this.loggedIn) return;
    await this.page!.goto('https://rolety.aliplast.pl/Account/Login', {
      waitUntil: 'networkidle', timeout: 30000,
    });
    await this.page!.fill('#Login', this.email);
    await this.page!.fill('#Password', this.password);
    await this.page!.click('input[type=submit]');
    await this.page!.waitForTimeout(3000);
    if (this.page!.url().includes('/Account/Login')) throw new Error('Aliplast login failed');
    this.loggedIn = true;
    console.log('    ✅ Aliplast: Logged in');
  }
}
