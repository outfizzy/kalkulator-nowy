// ============================================================================
// Teranda On-Demand Pricing Service
// Elfsquad CPQ iframe automation — configure products, read live prices
// ============================================================================

import { Browser, Page, BrowserContext, chromium, Frame } from 'playwright';
import { calculateOfferPrice, formatEUR, type OfferPricingResult } from './pricing-engine';

// ---- Product UUID mapping (from Elfsquad) ----
const TERANDA_PRODUCTS: Record<string, string> = {
  // Roofs
  'tr10': 'TR10 - Terrassendach',
  'tr15': 'TR15 - Terrassendach',
  'tr20': 'TR20 - Terrassendach',
  // Sliding walls
  'sw150': 'SW150 - Schiebewand',
  'sw450': 'SW450 - Schiebewand',
  // Fixed walls
  'fw200': 'FW200 - Festwand',
  'fw300': 'FW300 - Festwand',
  // Sun protection
  'pl15': 'PL15 - Plissee',
  'sh30': 'SH30 - Shutter',
};

export interface TerandaRequest {
  product: keyof typeof TERANDA_PRODUCTS;
  
  // Dimensions (mm)
  width: number;
  depth?: number;      // Tiefe (roofs)
  height?: number;     // Höhe (walls/SW)
  heightRinne?: number; // Höhe Unterkante Rinnenprofil (roofs)
  heightWand?: number;  // Höhe Unterkante Wandprofil (roofs)
  heightH1?: number;    // FW300: Höhe Wandseite
  heightH2?: number;    // FW300: Höhe Rinnenseite
  
  // Common options
  color?: string;       // 'RAL7016st', 'RAL9005st', 'DB703', etc. (default: RAL7016st)
  construction?: 'wall' | 'freestanding';  // Wandmontage / Freistehend
  
  // Roof options
  glazingType?: 'glas' | 'polycarbonat';
  roofCover?: string;   // '44.2 VSG KLAR', 'Polycarbonat OPAL', etc.
  postLength?: string;  // '2500', '3000', '3500'
  postCount?: number;   // Override default
  fieldCount?: number;  // Override default
  ledType?: string;     // 'Ohne', 'Aluminiumfarbe', 'schwarz'
  blende?: string;      // 'Gerade', 'Runde', 'Klassische'
  delivery?: 'vormontage' | 'bausatz';
  
  // Sides (for roof products) 
  sideLeft?: string;    // 'ohne', 'keil', 'wand', 'keil+sw450', 'keil+sw150'
  sideRight?: string;   
  front?: string;       // 'ohne', 'sw450', 'sw150', 'fw200'
  
  // Plissee
  plisseeCount?: number;  // Anzahl Felder
  tuchdessin?: string;    // 'Light Grey', 'Dark-Grey', etc.
  
  // SW450 specifics
  swType?: string;      // '3/3', '4/4', '2/4'
  openDirection?: string; // 'links', 'rechts'
  
  // Quantity (SH30)
  quantity?: number;
}

export class TerandaPricingService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private isReady = false;
  private lastActivity = Date.now();

  constructor(
    private credentials: { email: string; password: string }
  ) {}

  // ---- Initialize browser + login ----
  async init(): Promise<void> {
    if (this.isReady && this.page && Date.now() - this.lastActivity < 5 * 60 * 1000) return;
    await this.close();

    console.log('[Teranda] 🔑 Initializing browser session...');
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext({
      viewport: { width: 1400, height: 900 },
      locale: 'de-DE',
      ignoreHTTPSErrors: true,
    });
    this.page = await this.context.newPage();

    // 2-step Elfsquad login
    await this.page.goto('https://www.teranda.com/de/portal/configure', {
      waitUntil: 'networkidle', timeout: 30000,
    });
    await this.page.waitForSelector('#UserName', { timeout: 10000 });
    await this.page.fill('#UserName', this.credentials.email);
    await this.page.press('#UserName', 'Enter');
    await this.page.waitForTimeout(3000);
    await this.page.waitForLoadState('networkidle').catch(() => {});

    const passField = await this.page.$('input[type=password]');
    if (passField) {
      await passField.fill(this.credentials.password);
      await this.page.press('input[type=password]', 'Enter');
    }
    await this.page.waitForURL('**/teranda.com/**', { timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(3000);

    this.isReady = true;
    this.lastActivity = Date.now();
    console.log('[Teranda] ✅ Session ready');
  }

  // ---- Find the Elfsquad v3 product-selection frame ----
  private getV3Frame(): Frame | null {
    if (!this.page) return null;
    return this.page.frames().find(f => 
      f.url().match(/\/v3\/?$/) && !f.url().includes('header')
    ) || null;
  }

  // ---- Find the config frame (after product selected) ----
  private getConfigFrame(): Frame | null {
    if (!this.page) return null;
    return this.page.frames().find(f => 
      f.url().includes('/v3/configure/')
    ) || null;
  }

  // ---- Navigate to product selection ----
  private async goToProductSelection(): Promise<Frame | null> {
    await this.page!.goto('https://www.teranda.com/de/portal/configure', {
      waitUntil: 'networkidle', timeout: 15000,
    });
    await this.page!.waitForTimeout(10000); // Wait for SPA
    return this.getV3Frame();
  }

  // ---- Select a product and wait for config frame ----
  private async selectProduct(productKey: string): Promise<Frame | null> {
    const productName = TERANDA_PRODUCTS[productKey];
    if (!productName) return null;

    const v3 = await this.goToProductSelection();
    if (!v3) { console.log('[Teranda] ❌ No v3 frame'); return null; }

    const link = await v3.$(`text=${productName}`);
    if (!link) { console.log(`[Teranda] ❌ Product not found: ${productName}`); return null; }

    await link.click();
    await this.page!.waitForTimeout(10000); // Wait for config to load

    return this.getConfigFrame();
  }

  // ---- Fill a dimension input by finding the label text ----
  private async fillDimension(frame: Frame, label: string, value: number): Promise<boolean> {
    try {
      // Find the input associated with the label using Angular DOM structure
      const filled = await frame.evaluate(`(function() {
        var labels = document.querySelectorAll('label, p');
        for (var i = 0; i < labels.length; i++) {
          if (labels[i].textContent.trim() === '${label}') {
            // Traverse up to find the feature container, then find the input
            var container = labels[i].closest('.feature-value, .d-flex, [class*=feature]');
            for (var j = 0; j < 5; j++) {
              if (!container) break;
              var input = container.querySelector('input[type=number]');
              if (input) {
                // Use Angular's approach: set value and dispatch events
                var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeInputValueSetter.call(input, '${value}');
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.dispatchEvent(new Event('blur', { bubbles: true }));
                return true;
              }
              container = container.parentElement;
            }
          }
        }
        return false;
      })()`);
      
      if (!filled) {
        // Fallback: try clicking near the label and typing
        const labelEl = await frame.$(`text=${label}`);
        if (labelEl) {
          // Find nearest input
          const bbox = await labelEl.boundingBox();
          if (bbox) {
            // Look for input below/right of label
            const inputs = await frame.$$('input[type=number]');
            for (const input of inputs) {
              const ib = await input.boundingBox();
              if (ib && Math.abs(ib.y - bbox.y) < 50) {
                await input.click({ clickCount: 3 }); // Select all
                await input.fill(String(value));
                await input.dispatchEvent('change');
                console.log(`  [Teranda] ✅ Filled ${label} = ${value} (fallback)`);
                return true;
              }
            }
          }
        }
      } else {
        console.log(`  [Teranda] ✅ Filled ${label} = ${value}`);
      }
      return !!filled;
    } catch (e) {
      console.log(`  [Teranda] ⚠️ Could not fill ${label}: ${(e as Error).message}`);
      return false;
    }
  }

  // ---- Click an option by its visible text ----
  private async clickOption(frame: Frame, text: string): Promise<boolean> {
    try {
      const el = await frame.$(`text=${text}`);
      if (el) {
        await el.click();
        await this.page!.waitForTimeout(1500); // Wait for price update
        console.log(`  [Teranda] ✅ Selected: ${text}`);
        return true;
      }
      console.log(`  [Teranda] ⚠️ Option not found: ${text}`);
      return false;
    } catch (e) {
      return false;
    }
  }

  // ---- Read current price from config frame ----
  private async readPrice(frame: Frame): Promise<{ brutto: number; netto: number; rabatt: number } | null> {
    const pricing = await frame.evaluate(`(function() {
      var text = document.body?.innerText || '';
      var bm = text.match(/Bruttopreis[\\s\\n]*€\\s*([\\d.,]+)/);
      var nm = text.match(/Nettopreis[\\s\\n]*€\\s*([\\d.,]+)/);
      var rm = text.match(/Händlerrabatt\\s*(\\d+)%/);
      if (!nm) return null;
      return {
        brutto: bm ? bm[1] : '0',
        netto: nm[1],
        rabatt: rm ? rm[1] : '37'
      };
    })()`);

    if (!pricing) return null;
    return {
      brutto: this.parsePrice((pricing as any).brutto),
      netto: this.parsePrice((pricing as any).netto),
      rabatt: parseInt((pricing as any).rabatt),
    };
  }

  private parsePrice(str: string): number {
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  }

  // ---- Configure a roof product (TR10/TR15/TR20) ----
  private async configureRoof(frame: Frame, req: TerandaRequest): Promise<void> {
    // Construction type
    if (req.construction === 'freestanding') {
      await this.clickOption(frame, 'Freistehend');
    }

    // Dimensions
    await this.fillDimension(frame, 'Breite', req.width);
    if (req.depth) await this.fillDimension(frame, 'Tiefe', req.depth);
    if (req.heightRinne) await this.fillDimension(frame, 'Höhe Unterkante Rinnenprofil', req.heightRinne);
    
    // Wait for price recalculation
    await this.page!.waitForTimeout(3000);

    // Color
    if (req.color && req.color !== 'RAL7016st') {
      await this.clickOption(frame, req.color);
    }

    // Glazing type
    if (req.glazingType === 'polycarbonat') {
      await this.clickOption(frame, 'Polycarbonat');
    }

    // Roof cover
    if (req.roofCover) {
      await this.clickOption(frame, req.roofCover);
    }

    // Post length (Polendach24 standard: 3000mm)
    if (req.postLength || true) {
      const length = req.postLength || '3000';
      await this.clickOption(frame, `${length} mm Pfosten (Rinnenseite)`);
    }

    // LED
    if (req.ledType && req.ledType !== 'Ohne') {
      await this.clickOption(frame, `Einbaustrahler (${req.ledType})`);
    }

    // Blende (TR15/TR20)
    if (req.blende) {
      await this.clickOption(frame, `${req.blende} Blende Rinnenprofil`);
    }

    // Delivery
    if (req.delivery === 'bausatz') {
      await this.clickOption(frame, 'Lieferung als Heimwerkerbausatz');
    }

    // Side LEFT
    if (req.sideLeft && req.sideLeft !== 'ohne') {
      const sideMap: Record<string, string> = {
        'keil': 'Seitenkeil (FW300 | LINKS)',
        'wand': 'Seitenwand (FW300 | LINKS)',
        'keil+sw450': 'Seitenkeil + Schiebewand (FW300 + SW450 | LINKS)',
        'keil+sw150': 'Seitenkeil + Schiebewand (FW300 + SW150 | LINKS)',
      };
      if (sideMap[req.sideLeft]) await this.clickOption(frame, sideMap[req.sideLeft]);
    }

    // Side RIGHT
    if (req.sideRight && req.sideRight !== 'ohne') {
      const sideMap: Record<string, string> = {
        'keil': 'Seitenkeil (FW300 | RECHTS)',
        'wand': 'Seitenwand (FW300 | RECHTS)',
        'keil+sw450': 'Seitenkeil + Seitenwand (FW300 + SW450 | RECHTS)',
        'keil+sw150': 'Seitenkeil + Schiebewand (FW300 + SW150 | RECHTS)',
      };
      if (sideMap[req.sideRight]) await this.clickOption(frame, sideMap[req.sideRight]);
    }

    // Front
    if (req.front && req.front !== 'ohne') {
      const frontMap: Record<string, string> = {
        'sw450': 'Schiebewand (SW450)',
        'sw150': 'Schiebewand (SW150)',
        'fw200': 'Festwand (FW200)',
      };
      if (frontMap[req.front]) await this.clickOption(frame, frontMap[req.front]);
    }

    // Sonnenschutz / Plissee
    if (req.plisseeCount && req.plisseeCount > 0) {
      await this.clickOption(frame, 'PL15 Plissee');
    }

    await this.page!.waitForTimeout(2000); // Final price calc
  }

  // ---- Configure a wall/sliding wall ----
  private async configureWall(frame: Frame, req: TerandaRequest): Promise<void> {
    // Dimensions
    await this.fillDimension(frame, req.product === 'sw150' ? 'Bestellbreite' : 'Breite', req.width);
    if (req.height) {
      const heightLabel = req.product === 'sw150' ? 'Bestellhöhe' : 
                          req.product === 'fw300' ? 'Höhe Wandseite (H1)' : 'Höhe';
      await this.fillDimension(frame, heightLabel, req.height);
    }
    if (req.heightH2 && req.product === 'fw300') {
      await this.fillDimension(frame, 'Höhe Rinnenseite (H2)', req.heightH2);
    }

    await this.page!.waitForTimeout(2000);

    // Color
    if (req.color && req.color !== 'RAL7016st') {
      await this.clickOption(frame, req.color);
    }

    // SW type
    if (req.swType) {
      const typeMap: Record<string, string> = {
        '3/3': 'Typ 3/3 (3 Schienen / 3 Elemente)',
        '4/4': 'Typ 4/4 (4 Schienen / 4 Elemente)',
        '2/4': 'Typ 2/4 (2 Schienen / 4 Elemente)',
        '2/2': 'Typ 2/2 (2 Schienen / 2 Elemente)',
      };
      if (typeMap[req.swType]) await this.clickOption(frame, typeMap[req.swType]);
    }

    // Open direction
    if (req.openDirection) {
      const dir = req.openDirection === 'links' ? 'Links' : 'Rechts';
      await this.clickOption(frame, `${dir} - Hauptelement`);
    }

    await this.page!.waitForTimeout(2000);
  }

  // ---- Add current config to cart ----
  private async addToCart(frame: Frame): Promise<boolean> {
    try {
      const cartBtn = await frame.$('button:has-text("Im Warenkorb")');
      if (cartBtn) {
        await cartBtn.click();
        await this.page!.waitForTimeout(3000);
        console.log('[Teranda] 🛒 Added to cart');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // ════════════════════════════════════════════════════
  //  PUBLIC API: Get price for a Teranda product
  // ════════════════════════════════════════════════════
  async getPrice(req: TerandaRequest): Promise<{
    success: boolean;
    product: string;
    brutto: number | null;
    netto: number | null;
    rabatt: number;
    pricing: OfferPricingResult | null;
    durationMs: number;
    error?: string;
  }> {
    const startTime = Date.now();
    const productName = TERANDA_PRODUCTS[req.product] || req.product;

    try {
      await this.init();

      // 1. Select product
      console.log(`[Teranda] Configuring: ${productName} ${req.width}×${req.depth || req.height || ''}mm`);
      const configFrame = await this.selectProduct(req.product);
      if (!configFrame) {
        return { success: false, product: productName, brutto: null, netto: null, rabatt: 37, pricing: null, durationMs: Date.now() - startTime, error: 'Could not load configurator' };
      }

      // 2. Fill configuration
      const isRoof = ['tr10', 'tr15', 'tr20'].includes(req.product);
      if (isRoof) {
        await this.configureRoof(configFrame, req);
      } else {
        await this.configureWall(configFrame, req);
      }

      // 3. Read price
      const price = await this.readPrice(configFrame);
      if (!price) {
        return { success: false, product: productName, brutto: null, netto: null, rabatt: 37, pricing: null, durationMs: Date.now() - startTime, error: 'Could not read price' };
      }

      // 4. Add to cart
      await this.addToCart(configFrame);

      // 5. Calculate customer price (margin from netto = our purchase price)
      const pricing = calculateOfferPrice({
        lineItems: [{ name: productName, aluxeNetPrice: price.netto, quantity: 1 }],
      });

      this.lastActivity = Date.now();

      return {
        success: true,
        product: productName,
        brutto: price.brutto,
        netto: price.netto,
        rabatt: price.rabatt,
        pricing,
        durationMs: Date.now() - startTime,
      };

    } catch (err) {
      this.isReady = false;
      return { success: false, product: productName, brutto: null, netto: null, rabatt: 37, pricing: null, durationMs: Date.now() - startTime, error: (err as Error).message };
    }
  }

  // ════════════════════════════════════════════════════
  //  PUBLIC API: Get multi-product price (roof + walls + plissee)
  // ════════════════════════════════════════════════════
  async getMultiProductPrice(requests: TerandaRequest[], customerName?: string): Promise<{
    success: boolean;
    items: { product: string; brutto: number; netto: number }[];
    totalBrutto: number;
    totalNetto: number;
    pricing: OfferPricingResult | null;
    durationMs: number;
    errors: string[];
  }> {
    const startTime = Date.now();
    const items: { product: string; brutto: number; netto: number }[] = [];
    const errors: string[] = [];

    try {
      // Each product needs a fresh login (Elfsquad frame detach issue)
      for (let i = 0; i < requests.length; i++) {
        const req = requests[i];
        console.log(`\n[Teranda] Product ${i + 1}/${requests.length}: ${req.product} ${req.width}mm`);
        
        const result = await this.getPrice(req);
        if (result.success && result.netto) {
          items.push({
            product: result.product,
            brutto: result.brutto!,
            netto: result.netto,
          });
        } else {
          errors.push(`${req.product}: ${result.error}`);
        }
        
        // Close and re-init for next product (avoid frame detach)
        if (i < requests.length - 1) {
          await this.close();
          this.isReady = false;
        }
      }

      const totalBrutto = items.reduce((sum, i) => sum + i.brutto, 0);
      const totalNetto = items.reduce((sum, i) => sum + i.netto, 0);

      // Calculate offer price from total netto
      const pricing = totalNetto > 0 ? calculateOfferPrice({
        lineItems: items.map(i => ({
          name: i.product,
          aluxeNetPrice: i.netto,
          quantity: 1,
        })),
      }) : null;

      return {
        success: items.length > 0,
        items,
        totalBrutto,
        totalNetto,
        pricing,
        durationMs: Date.now() - startTime,
        errors,
      };

    } catch (err) {
      return { success: false, items, totalBrutto: 0, totalNetto: 0, pricing: null, durationMs: Date.now() - startTime, errors: [(err as Error).message] };
    }
  }

  async close() {
    try { await this.context?.close(); } catch {}
    try { await this.browser?.close(); } catch {}
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isReady = false;
  }
}
