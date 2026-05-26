// ============================================================================
// Aluxe On-Demand Pricing Service
// Persistent browser session, accepts config → returns customer price in ~10s
// ============================================================================

import { Browser, Page, BrowserContext, chromium } from 'playwright';
import { ALUXE_PRODUCTS } from './aluxe-automator';
import { calculateCustomerPrice, formatEUR, type PricingResult } from './pricing-engine';

export interface PriceRequest {
  // Product
  productLine: keyof typeof PRODUCT_LINE_MAP;  // 'trendstyle_poly', 'topstyle_xl_glas', etc.
  
  // Dimensions
  width: number;        // mm (3000-7950)
  depth: number;        // mm (2000-5000) — or height for walls/panorama
  
  // Options
  color?: string;       // '7016' (default), '9010', '9005', '9007'
  postHeight?: string;  // '2400' (default) or '3000'
  postType?: string;    // '0'=Standard, '1'=Klassik, '2'=Rund
  roofType?: string;    // Dakplaten product ID (default = polycarbonat opal)
  freestanding?: boolean;
  
  // Walls/Panorama specific
  glassType?: string;   // Glass product ID
  slideDirection?: string; // 'left', 'right', 'center'
  doorConfig?: string;    // '2-r-l', '3-l-r-r', etc.
  side?: string;          // 'left' or 'right'
  heightFront?: number;   // mm
  heightBack?: number;    // mm
  
  // Extras
  led?: string;           // LED product ID
  ledQty?: number;
}

export interface PriceResponse {
  success: boolean;
  
  // Aluxe data
  aluxeNetPrice: number | null;
  aluxeTransport: number;
  
  // Polendach24 pricing
  pricing: PricingResult | null;
  
  // Meta
  productLine: string;
  productId: string;
  dimensions: string;
  configurationUsed: Record<string, string>;
  timestamp: string;
  durationMs: number;
  
  error?: string;
}

// Map user-friendly product names to Aluxe product IDs
const PRODUCT_LINE_MAP = {
  // Trendstyle (= Trendline)
  trendstyle_poly: ALUXE_PRODUCTS.trendline_platten,
  trendstyle_glas: ALUXE_PRODUCTS.trendline_glas,
  trendstyle_plus_poly: ALUXE_PRODUCTS.trendline_plus_platten,
  trendstyle_plus_glas: ALUXE_PRODUCTS.trendline_plus_glas,
  // Topstyle (= Topline)
  topstyle_poly: ALUXE_PRODUCTS.topline_platten,
  topstyle_glas: ALUXE_PRODUCTS.topline_glas,
  topstyle_xl_poly: ALUXE_PRODUCTS.topline_xl_platten,
  topstyle_xl_glas: ALUXE_PRODUCTS.topline_xl_glas,
  // Premium (Designstyle, Ultrastyle, Skystyle)
  designstyle: ALUXE_PRODUCTS.designline,
  designline: ALUXE_PRODUCTS.designline, // alias
  ultrastyle: ALUXE_PRODUCTS.ultraline, // default = classic
  ultrastyle_classic: ALUXE_PRODUCTS.ultraline,
  ultrastyle_style: ALUXE_PRODUCTS.ultraline,
  ultrastyle_compact: ALUXE_PRODUCTS.ultraline,
  ultraline: ALUXE_PRODUCTS.ultraline, // alias
  skystyle: ALUXE_PRODUCTS.skyline,
  skyline: ALUXE_PRODUCTS.skyline, // alias
  // Carport
  carport: ALUXE_PRODUCTS.carport,
  carport_frei: ALUXE_PRODUCTS.carport_frei,
  // Panorama
  panorama_al22: ALUXE_PRODUCTS.panorama_al22_tief,
  panorama_al23: ALUXE_PRODUCTS.panorama_al23_hoch,
  panorama_al24: ALUXE_PRODUCTS.panorama_al24,
  panorama_al25: ALUXE_PRODUCTS.panorama_al25_hoch,
  panorama_al26: ALUXE_PRODUCTS.panorama_al26,
  // Walls
  feste_seitenelemente: ALUXE_PRODUCTS.feste_seitenelemente,
  keilfenster: ALUXE_PRODUCTS.keilfenster,
  schiebeturen: ALUXE_PRODUCTS.rahmen_schiebeturen,
  frontwand: ALUXE_PRODUCTS.frontwand,
  // Other
  markise: ALUXE_PRODUCTS.markise,
  senkrechtmarkise: ALUXE_PRODUCTS.verticale_zonwering,
  orangeline_poly: ALUXE_PRODUCTS.orangeline_poly,
  orangeline_glas: ALUXE_PRODUCTS.orangeline_glas,
  orangeline_plus_poly: ALUXE_PRODUCTS.orangeline_plus_poly,
  orangeline_plus_glas: ALUXE_PRODUCTS.orangeline_plus_glas,
  skyline_frei: ALUXE_PRODUCTS.skyline_frei,
} as const;

export { PRODUCT_LINE_MAP };

// Products that are "walls" (different form fields)
const WALL_PRODUCTS = new Set([
  'feste_seitenelemente', 'keilfenster', 'schiebeturen', 'frontwand',
]);
const PANORAMA_PRODUCTS = new Set([
  'panorama_al22', 'panorama_al23', 'panorama_al24', 'panorama_al25', 'panorama_al26',
]);
// Designline only has 9005, 9010, db703 (NO 7016)
const DESIGNLINE_PRODUCTS = new Set(['designline']);
const SENKRECHTMARKISE_PRODUCTS = new Set(['senkrechtmarkise']);

export class AluxePricingService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private cookieKey: string = '';
  private isReady: boolean = false;
  private lastActivity: number = 0;
  private sessionTimeout = 30 * 60 * 1000; // 30 min session

  constructor(
    private credentials: { username: string; password: string },
  ) {}

  // ---- Initialize persistent session ----
  async init(): Promise<void> {
    if (this.isReady && this.page && (Date.now() - this.lastActivity < this.sessionTimeout)) {
      return; // Session still valid
    }
    
    // Close old session
    await this.close();
    
    console.log('[AluxePricing] 🔑 Initializing browser session...');
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: 'de-DE',
      ignoreHTTPSErrors: true,
    });
    this.page = await this.context.newPage();
    
    // Login
    await this.page.goto('https://bestellen.aluxe.nl', { waitUntil: 'networkidle', timeout: 30000 });
    await this.page.fill('#login_username', this.credentials.username);
    await this.page.fill('#login_password', this.credentials.password);
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }).catch(() => {}),
      this.page.click('input[type=submit]'),
    ]);
    await this.page.waitForTimeout(2000);
    
    const url = this.page.url();
    const match = url.match(/cookie_key=(\d+)/);
    if (!match || !url.includes('/dealer')) {
      throw new Error(`Login failed. URL: ${url}`);
    }
    
    this.cookieKey = match[1];
    this.isReady = true;
    this.lastActivity = Date.now();
    console.log(`[AluxePricing] ✅ Session ready (cookie: ${this.cookieKey})`);
  }

  // ---- Get price for a configuration ----
  async getPrice(request: PriceRequest): Promise<PriceResponse> {
    const startTime = Date.now();
    
    try {
      await this.init();
      
      const productId = PRODUCT_LINE_MAP[request.productLine];
      if (!productId) {
        return this.errorResponse(request, `Unknown product: ${request.productLine}`, startTime);
      }
      
      // 1. Start fresh order
      await this.page!.goto(`https://bestellen.aluxe.nl/dealer/?cookie_key=${this.cookieKey}`, {
        waitUntil: 'networkidle', timeout: 12000,
      }).catch(() => {});
      
      await this.page!.goto(`https://bestellen.aluxe.nl/dealer/dealer-order/informatie/?cookie_key=${this.cookieKey}`, {
        waitUntil: 'networkidle', timeout: 12000,
      });
      
      const ref = await this.page!.$('#reference');
      if (ref) await ref.fill(`OnDemand-${Date.now()}`);
      await this.page!.click('#next');
      await this.page!.waitForLoadState('networkidle');
      
      // 2. Navigate to product
      await this.page!.goto(
        `https://bestellen.aluxe.nl/dealer/dealer-order/product/?product_id=${productId}&cookie_key=${this.cookieKey}`,
        { waitUntil: 'networkidle', timeout: 15000 }
      );
      
      // 3. Fill configuration based on product type
      const configUsed: Record<string, string> = {};
      
      if (WALL_PRODUCTS.has(request.productLine)) {
        await this.fillWallConfig(request, configUsed);
      } else if (PANORAMA_PRODUCTS.has(request.productLine)) {
        await this.fillPanoramaConfig(request, configUsed);
      } else if (request.productLine === 'markise') {
        await this.fillMarkiseConfig(request, configUsed);
      } else if (SENKRECHTMARKISE_PRODUCTS.has(request.productLine)) {
        await this.fillSenkrechtmarkiseConfig(request, configUsed);
      } else {
        // For Designline: override color to 9005 (no 7016 available)
        if (DESIGNLINE_PRODUCTS.has(request.productLine) && (!request.color || request.color === '7016')) {
          request.color = '9005';
        }
        await this.fillRoofConfig(request, configUsed);
      }
      
      // 4. Submit and get price
      await this.page!.click('#next');
      await this.page!.waitForLoadState('networkidle');
      await this.page!.waitForTimeout(300);
      
      // Navigate to materialen if needed
      const matLink = await this.page!.$('.rel-materialen');
      if (matLink) {
        await matLink.click();
        await this.page!.waitForLoadState('networkidle');
      }
      
      // 5. Extract price
      const aluxePrice = await this.extractPrice();
      this.lastActivity = Date.now();
      
      if (!aluxePrice || aluxePrice <= 0) {
        return this.errorResponse(request, 'No price returned from Aluxe', startTime);
      }
      
      // 6. Calculate customer price
      const pricing = calculateCustomerPrice({ aluxeNetPrice: aluxePrice });
      
      return {
        success: true,
        aluxeNetPrice: aluxePrice,
        aluxeTransport: 200,
        pricing,
        productLine: request.productLine,
        productId,
        dimensions: `${request.width}×${request.depth}`,
        configurationUsed: configUsed,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };
      
    } catch (err) {
      this.isReady = false; // Force re-login on next request
      return this.errorResponse(request, (err as Error).message, startTime);
    }
  }

  // ---- Fill roof product config (Trendstyle, Topstyle, Ultrastyle, etc.) ----
  private async fillRoofConfig(req: PriceRequest, cfg: Record<string, string>) {
    const p = this.page!;
    
    // Ultrastyle variant selection (Classic/Style/Compact)
    const ultraType = await p.$('#ultra_type');
    if (ultraType) {
      let variant = 'classic'; // default
      if (req.productLine === 'ultrastyle_style') variant = 'style';
      else if (req.productLine === 'ultrastyle_compact') variant = 'compact';
      await p.selectOption('#ultra_type', variant).catch(() => {});
      cfg.ultra_type = variant;
      await p.waitForTimeout(300); // Wait for form update
    }
    
    await p.fill('#width', String(req.width));
    cfg.width = String(req.width);
    
    const depthField = await p.$('#depth');
    if (depthField) {
      await p.fill('#depth', String(req.depth));
      cfg.depth = String(req.depth);
    }
    
    if (req.color) {
      await p.selectOption('#color', req.color).catch(() => {});
      cfg.color = req.color;
    } else {
      await p.selectOption('#color', '7016').catch(() => {});
      cfg.color = '7016';
    }
    
    if (req.postHeight) {
      await p.selectOption('#height', req.postHeight).catch(() => {});
      cfg.postHeight = req.postHeight;
    }
    
    if (req.postType) {
      await p.selectOption('#staander_type', req.postType).catch(() => {});
      cfg.postType = req.postType;
    }
    
    if (req.freestanding) {
      await p.selectOption('#freestanding', '1').catch(() => {});
      cfg.freestanding = '1';
    }
    
    const hf = await p.$('#height_front');
    if (hf) {
      await p.fill('#height_front', String(req.heightFront || 2200));
      cfg.heightFront = String(req.heightFront || 2200);
    }
    
    if (req.led) {
      await p.selectOption('#verlichting-id-', req.led).catch(() => {});
      cfg.led = req.led;
    }
  }

  // ---- Fill wall config (Seitenelemente, Keilfenster, Schiebetüren) ----
  private async fillWallConfig(req: PriceRequest, cfg: Record<string, string>) {
    const p = this.page!;
    
    await p.fill('#width', String(req.width)).catch(() => {});
    cfg.width = String(req.width);
    
    const h1 = await p.$('#height_1');
    if (h1) { await p.fill('#height_1', String(req.depth || 2200)); cfg.height_1 = String(req.depth || 2200); }
    
    const h2 = await p.$('#height_2');
    if (h2) { await p.fill('#height_2', String(req.heightBack || 2600)); cfg.height_2 = String(req.heightBack || 2600); }
    
    await p.selectOption('#color', req.color || '7016').catch(() => {});
    cfg.color = req.color || '7016';
    
    const glass = await p.$('#dakplaten_custom');
    if (glass) {
      await p.selectOption('#dakplaten_custom', req.glassType || '4715dc6ccf4dff9').catch(() => {});
      cfg.glassType = req.glassType || 'VSG 8mm klar';
    }
    
    const side = await p.$('#side');
    if (side) { await p.selectOption('#side', req.side || 'left').catch(() => {}); cfg.side = req.side || 'left'; }
    
    const doors = await p.$('#sdoors');
    if (doors) { await p.selectOption('#sdoors', req.doorConfig || '2-r-l').catch(() => {}); cfg.doors = req.doorConfig || '2-r-l'; }
  }

  // ---- Fill panorama config ----
  private async fillPanoramaConfig(req: PriceRequest, cfg: Record<string, string>) {
    const p = this.page!;
    
    await p.fill('#width', String(req.width)).catch(() => {});
    cfg.width = String(req.width);
    
    const h = await p.$('#height');
    const h1 = await p.$('#height_1');
    if (h) {
      const tag = await p.evaluate(`document.querySelector('#height')?.tagName`);
      if (tag === 'SELECT') await p.selectOption('#height', String(req.depth || 2200)).catch(() => {});
      else await p.fill('#height', String(req.depth || 2200)).catch(() => {});
    }
    if (h1) await p.fill('#height_1', String(req.depth || 2200)).catch(() => {});
    cfg.height = String(req.depth || 2200);
    
    await p.selectOption('#color', req.color || '7016').catch(() => {});
    cfg.color = req.color || '7016';
    
    const slide = await p.$('#slide');
    if (slide) { await p.selectOption('#slide', req.slideDirection || 'right').catch(() => {}); cfg.slide = req.slideDirection || 'right'; }
    
    const glass = await p.$('#dakplaten_custom');
    if (glass) { await p.selectOption('#dakplaten_custom', req.glassType || '6b89385110fae4d').catch(() => {}); cfg.glass = 'ESG 10mm'; }
  }

  // ---- Fill markise config ----
  private async fillMarkiseConfig(req: PriceRequest, cfg: Record<string, string>) {
    const p = this.page!;
    
    const rooftype = await p.$('#rooftype');
    if (rooftype) { await p.selectOption('#rooftype', 'TR').catch(() => {}); cfg.rooftype = 'TR'; }
    
    await p.fill('#roofwidth', String(req.width)).catch(() => {});
    await p.fill('#roofdepth', String(req.depth)).catch(() => {});
    cfg.roofwidth = String(req.width);
    cfg.roofdepth = String(req.depth);
    
    // Number of fields (required!)
    const nf = await p.$('#numberoffields');
    if (nf) { await p.fill('#numberoffields', '1'); cfg.numberoffields = '1'; }
    
    // Motor
    await p.selectOption('#motor', 'links').catch(() => {});
    cfg.motor = 'links';
    
    // Cloth color (required text field)
    await p.fill('#colorcloth', 'grau').catch(() => {});
    cfg.colorcloth = 'grau';
    
    await p.selectOption('#color', req.color || '7016').catch(() => {});
    cfg.color = req.color || '7016';
  }

  // ---- Fill Senkrechtmarkise / ZIP Screen config ----
  private async fillSenkrechtmarkiseConfig(req: PriceRequest, cfg: Record<string, string>) {
    const p = this.page!;
    
    await p.fill('#width', String(req.width)).catch(() => {});
    cfg.width = String(req.width);
    
    // depth = height for ZIP screen
    await p.fill('#depth', String(req.depth)).catch(() => {});
    cfg.height = String(req.depth);
    
    await p.selectOption('#color', req.color || '7016').catch(() => {});
    cfg.color = req.color || '7016';
    
    // Tuchfarbe (cloth color) — required! "x" as placeholder
    await p.fill('#sun_color', 'x').catch(() => {});
    cfg.sun_color = 'x';
  }

  // ---- Extract ALL prices from cart (line items + Gesamtpreis) ----
  private async extractCartItems(): Promise<{ items: { name: string; price: number }[]; gesamtpreis: number | null }> {
    const cartData = await this.page!.evaluate(`(function() {
      var items = [];
      var gesamtpreis = null;
      var cart = document.querySelector('#cart');
      if (!cart) return { items: items, gesamtpreis: null };
      
      // Extract individual product rows
      var rows = cart.querySelectorAll('table.products tr');
      rows.forEach(function(tr) {
        var nameEl = tr.querySelector('td.name a');
        var priceEl = tr.querySelector('td.price');
        if (nameEl && priceEl) {
          items.push({
            name: nameEl.textContent.replace(/\\s+/g, ' ').trim(),
            priceText: priceEl.textContent.trim()
          });
        }
      });
      
      // Extract Gesamtpreis (usually in table.totals or last row)
      var totalRows = cart.querySelectorAll('table.totals tr, tr.total, tr.grandtotal');
      totalRows.forEach(function(tr) {
        var cells = tr.querySelectorAll('td');
        cells.forEach(function(td) {
          var t = td.textContent.trim();
          if (t.indexOf('€') !== -1) {
            gesamtpreis = t;
          }
        });
      });
      
      // Fallback: get all € texts on page
      if (!gesamtpreis) {
        var allPrices = [];
        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          var t = walker.currentNode.textContent.trim();
          if (t.indexOf('€') !== -1 && t.length < 50) allPrices.push(t);
        }
        if (allPrices.length > 0) gesamtpreis = allPrices[allPrices.length - 1]; // Last € = total
      }
      
      return { items: items, gesamtpreis: gesamtpreis };
    })()`) as { items: { name: string; priceText: string }[]; gesamtpreis: string | null };
    
    const items = cartData.items.map(item => ({
      name: item.name,
      price: this.parseEurPrice(item.priceText),
    })).filter(item => item.price > 0);
    
    const gesamtpreis = cartData.gesamtpreis ? this.parseEurPrice(cartData.gesamtpreis) : null;
    
    return { items, gesamtpreis };
  }

  // ---- Extract single price (backward compat, returns Gesamtpreis) ----
  private async extractPrice(): Promise<number | null> {
    const { items, gesamtpreis } = await this.extractCartItems();
    // Return Gesamtpreis first, fallback to first item
    if (gesamtpreis && gesamtpreis > 0) return gesamtpreis;
    if (items.length > 0) return items[0].price;
    return null;
  }

  // ---- Parse European price: "€ 1.746,15" → 1746.15 ----
  private parseEurPrice(text: string): number {
    const cleaned = text.replace(/[^0-9.,]/g, '');
    if (!cleaned) return 0;
    if (cleaned.includes(',') && cleaned.includes('.')) {
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
    }
    if (cleaned.includes(',')) {
      return parseFloat(cleaned.replace(',', '.')) || 0;
    }
    return parseFloat(cleaned) || 0;
  }

  // ---- Error response helper ----
  private errorResponse(req: PriceRequest, error: string, startTime: number): PriceResponse {
    return {
      success: false,
      aluxeNetPrice: null,
      aluxeTransport: 200,
      pricing: null,
      productLine: req.productLine,
      productId: PRODUCT_LINE_MAP[req.productLine] || '',
      dimensions: `${req.width}×${req.depth}`,
      configurationUsed: {},
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      error,
    };
  }

  // ---- Cleanup ----
  async close(): Promise<void> {
    if (this.context) await this.context.close().catch(() => {});
    if (this.browser) await this.browser.close().catch(() => {});
    this.page = null;
    this.context = null;
    this.browser = null;
    this.isReady = false;
  }
  
  // ---- Health check ----
  isSessionActive(): boolean {
    return this.isReady && (Date.now() - this.lastActivity < this.sessionTimeout);
  }
}
