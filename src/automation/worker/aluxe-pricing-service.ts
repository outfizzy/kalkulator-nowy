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

  // Markise (Bovendak/Onderdak zonwering — jeden produkt, wybór selectem #markise)
  markiseType?: 'aufdach' | 'unterdach';
  /** Kod modelu dachu dla markizy (#rooftype): OL, OL+, TR, TR+, TL, TLXL, DL, UL classic/style/compact */
  roofModelCode?: string;
}

export interface PriceResponse {
  success: boolean;
  
  // Aluxe data (transport wliczony w cenę)
  aluxeNetPrice: number | null;       // Gesamtpreis (cumulative cart total)
  lastItemPrice: number | null;       // Price of the LAST added item (individual)
  cartItems: { name: string; price: number }[];  // All items currently in cart
  
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
  markise_unterdach: ALUXE_PRODUCTS.markise, // ten sam produkt — wariant wybiera markiseType
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
  private customerLabel: string = '';  // e.g. 'BOT - Ralf Büchner'

  constructor(
    private credentials: { username: string; password: string },
  ) {}

  /** Set customer label for order naming — call BEFORE getPrice */
  setCustomerName(name: string): void {
    this.customerLabel = name ? `BOT - ${name}` : '';
    console.log(`[AluxePricing] 👤 Customer label: ${this.customerLabel}`);
  }

  /** Save current order in Aluxe (click Offerte Speichern) — call AFTER all getPrice calls */
  async saveCurrentOrder(): Promise<string | null> {
    if (!this.page || !this.cookieKey) return null;
    try {
      // Navigate to Übersicht (cart overview) — same as getMultiProductPrice
      const overzichtLink = await this.page.$('.rel-overzicht');
      if (overzichtLink) {
        await overzichtLink.click();
        await this.page.waitForLoadState('networkidle').catch(() => {});
        await this.page.waitForTimeout(1000);
      } else {
        // Fallback: try direct navigation
        await this.page.goto(
          `https://bestellen.aluxe.nl/dealer/dealer-order/overzicht/?cookie_key=${this.cookieKey}`,
          { waitUntil: 'networkidle', timeout: 15000 }
        );
      }
      
      // Click save (#save) — matches the working getMultiProductPrice flow
      const saveBtn = await this.page.$('#save');
      if (saveBtn) {
        await saveBtn.click();
        await this.page.waitForLoadState('networkidle').catch(() => {});
        await this.page.waitForTimeout(2000);
        console.log('[AluxePricing] 💾 Offerte gespeichert');
      } else {
        // Fallback selectors
        const altBtn = await this.page.$('button:has-text("Opslaan"), input[value="Opslaan"], a:has-text("Offerte opslaan"), button:has-text("Speichern")');
        if (altBtn) {
          await altBtn.click();
          await this.page.waitForLoadState('networkidle').catch(() => {});
          console.log('[AluxePricing] 💾 Offerte gespeichert (alt)');
        } else {
          console.log('[AluxePricing] ⚠️ No save button found');
        }
      }
      
      // Capture order URL for linking
      const orderUrl = this.page.url();
      console.log(`[AluxePricing] 🔗 Order URL: ${orderUrl}`);
      return orderUrl;
    } catch (err) {
      console.log(`[AluxePricing] ⚠️ Save order failed: ${(err as Error).message}`);
      return null;
    }
  }
  // ---- Initialize persistent session ----
  async init(): Promise<void> {
    if (this.isReady && this.page && (Date.now() - this.lastActivity < this.sessionTimeout)) {
      return; // Session still valid
    }
    
    // Close old session
    await this.close();
    
    console.log('[AluxePricing] 🔑 Initializing browser session...');
    this.browser = await chromium.launch({ 
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    });
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

  /** Create a brand new order with a fresh cookie_key.
   *  Call AFTER saveCurrentOrder() to start clean for the next model. */
  async startFreshOrder(): Promise<void> {
    if (!this.page) return;
    
    // Navigate to dealer main page — clicking "Neue Bestellung" or finding the new order link
    await this.page.goto('https://bestellen.aluxe.nl/dealer/', {
      waitUntil: 'networkidle', timeout: 15000,
    });
    await this.page.waitForTimeout(1000);
    
    // Look for "new order" link — Aluxe uses various labels
    const newOrderBtn = await this.page.$('a:has-text("Neue Bestellung"), a:has-text("Nieuwe bestelling"), a:has-text("New order"), a.new-order, a[href*="informatie"]');
    if (newOrderBtn) {
      await newOrderBtn.click();
      await this.page.waitForLoadState('networkidle').catch(() => {});
      await this.page.waitForTimeout(1000);
    } else {
      // Fallback: navigate to informatie WITHOUT cookie_key — should create new order
      await this.page.goto('https://bestellen.aluxe.nl/dealer/dealer-order/informatie/', {
        waitUntil: 'networkidle', timeout: 15000,
      });
      await this.page.waitForTimeout(1000);
    }
    
    // Capture new cookie_key from URL
    const url = this.page.url();
    const match = url.match(/cookie_key=(\d+)/);
    if (match) {
      const oldKey = this.cookieKey;
      this.cookieKey = match[1];
      console.log(`[AluxePricing] 🔄 New order (cookie: ${oldKey} → ${this.cookieKey})`);
    } else {
      console.log(`[AluxePricing] ⚠️ No cookie_key in URL after new order: ${url}`);
    }
    
    this.lastActivity = Date.now();
  }

  // ---- Start a fresh order ----
  private async startOrder(customerName: string): Promise<void> {
    await this.page!.goto(`https://bestellen.aluxe.nl/dealer/dealer-order/informatie/?cookie_key=${this.cookieKey}`, {
      waitUntil: 'networkidle', timeout: 12000,
    });
    
    // Fill customer name as order description (saved in Aluxe system)
    const refField = await this.page!.$('#reference');
    const descField = await this.page!.$('#description');
    if (refField) await refField.fill(customerName);
    if (descField) await descField.fill(customerName);
    
    // Fill delivery contact with customer name
    const deliveryContact = await this.page!.$('#address-delivery--contact-');
    if (deliveryContact) await deliveryContact.fill(customerName);
    
    // Click next or submit
    const nextBtn = await this.page!.$('#next');
    const submitBtn = await this.page!.$('input[type=submit]');
    if (nextBtn) await nextBtn.click();
    else if (submitBtn) await submitBtn.click();
    
    await this.page!.waitForLoadState('networkidle').catch(() => {});
    await this.page!.waitForTimeout(500);
  }

  // ═══ DIMENSION LIMITS per product line (from Aluxe configurator) ═══
  private static readonly DIMENSION_LIMITS: Record<string, { minW: number; maxW: number; minD: number; maxD: number }> = {
    // Trendline / Trendstyle
    trendstyle_poly:       { minW: 3000, maxW: 7950, minD: 2000, maxD: 5000 },
    trendstyle_glas:       { minW: 3000, maxW: 7950, minD: 2000, maxD: 5000 },
    trendstyle_plus_poly:  { minW: 3000, maxW: 7950, minD: 2500, maxD: 5000 },
    trendstyle_plus_glas:  { minW: 3000, maxW: 7950, minD: 2500, maxD: 5000 },
    // Topline / Topstyle
    topstyle_poly:         { minW: 3000, maxW: 7950, minD: 2500, maxD: 5000 },
    topstyle_glas:         { minW: 3000, maxW: 7950, minD: 2500, maxD: 5000 },
    topstyle_xl_poly:      { minW: 3000, maxW: 7950, minD: 2500, maxD: 5000 },
    topstyle_xl_glas:      { minW: 3000, maxW: 7950, minD: 2500, maxD: 5000 },
    // Orangeline / Orangestyle
    orangestyle_poly:      { minW: 3000, maxW: 6000, minD: 2000, maxD: 4000 },
    orangestyle_glas:      { minW: 3000, maxW: 6000, minD: 2000, maxD: 4000 },
    orangeline_poly:       { minW: 3000, maxW: 6000, minD: 2000, maxD: 4000 },
    orangeline_glas:       { minW: 3000, maxW: 6000, minD: 2000, maxD: 4000 },
    orangeline_plus_poly:  { minW: 3000, maxW: 6000, minD: 2000, maxD: 4000 },
    orangeline_plus_glas:  { minW: 3000, maxW: 6000, minD: 2000, maxD: 4000 },
    // Premium
    designstyle:           { minW: 3000, maxW: 6000, minD: 2000, maxD: 4500 },
    designline:            { minW: 3000, maxW: 6000, minD: 2000, maxD: 4500 },
    ultrastyle:            { minW: 3000, maxW: 7000, minD: 2000, maxD: 6000 }, // snapowane do progow 5000/6000/7000 × 3000-6000
    ultrastyle_classic:    { minW: 3000, maxW: 7000, minD: 2000, maxD: 6000 }, // snapowane do progow 5000/6000/7000 × 3000-6000
    ultrastyle_style:      { minW: 3000, maxW: 7000, minD: 2000, maxD: 6000 }, // snapowane do progow 5000/6000/7000 × 3000-6000
    ultrastyle_compact:    { minW: 3000, maxW: 7000, minD: 2000, maxD: 6000 }, // snapowane do progow 5000/6000/7000 × 3000-6000
    ultraline:             { minW: 3000, maxW: 7000, minD: 2000, maxD: 6000 }, // snapowane do progow 5000/6000/7000 × 3000-6000
    skystyle:              { minW: 3000, maxW: 6000, minD: 3000, maxD: 5000 },
    skyline:               { minW: 3000, maxW: 6000, minD: 3000, maxD: 5000 },
    skyline_frei:          { minW: 3000, maxW: 6000, minD: 3000, maxD: 5000 },
    // Carport — Aluxe max width 6000, max depth 5000
    carport:               { minW: 3000, maxW: 6000, minD: 2500, maxD: 5000 },
    carport_frei:          { minW: 3000, maxW: 6000, minD: 2500, maxD: 5000 },
    // Accessories (walls, panorama) — use parent product limits
    panorama_al22:         { minW: 1000, maxW: 7000, minD: 500,  maxD: 3000 },
    panorama_al23:         { minW: 1000, maxW: 7000, minD: 500,  maxD: 3000 },
    panorama_al24:         { minW: 1000, maxW: 7000, minD: 500,  maxD: 3000 },
    panorama_al25:         { minW: 1000, maxW: 7000, minD: 500,  maxD: 3000 },
    panorama_al26:         { minW: 1000, maxW: 7000, minD: 500,  maxD: 3000 },
    keilfenster:           { minW: 500,  maxW: 5000, minD: 500,  maxD: 3000 },
    feste_seitenelemente:  { minW: 500,  maxW: 5000, minD: 500,  maxD: 3000 },
    senkrechtmarkise:      { minW: 1500, maxW: 3500, minD: 1000, maxD: 3000 }, // selecty skokowe co 250mm (zmierzone)
    markise:               { minW: 2000, maxW: 7000, minD: 1500, maxD: 4000 },
    markise_unterdach:     { minW: 2000, maxW: 7000, minD: 1500, maxD: 4000 },
  };

  /** Validate dimensions against product limits */
  private validateDimensions(request: PriceRequest): string | null {
    const limits = AluxePricingService.DIMENSION_LIMITS[request.productLine];
    if (!limits) return null; // No limits known → allow
    
    const w = request.width;
    const d = request.depth;
    
    if (w && (w < limits.minW || w > limits.maxW)) {
      return `Breite ${w}mm außerhalb des Bereichs für ${request.productLine} (${limits.minW}–${limits.maxW}mm)`;
    }
    if (d && (d < limits.minD || d > limits.maxD)) {
      return `Tiefe ${d}mm außerhalb des Bereichs für ${request.productLine} (${limits.minD}–${limits.maxD}mm)`;
    }
    return null;
  }

  // ---- Add a single product to current cart ----
  private async addProductToCart(request: PriceRequest): Promise<{ success: boolean; error?: string }> {
    const productId = PRODUCT_LINE_MAP[request.productLine];
    if (!productId) return { success: false, error: `Unknown product: ${request.productLine}` };

    // ═══ VALIDATE DIMENSIONS before sending to configurator ═══
    const dimError = this.validateDimensions(request);
    if (dimError) {
      console.warn(`[AluxePricing] ⚠️ Dimension validation failed: ${dimError}`);
      return { success: false, error: dimError };
    }
    
    // Navigate to product
    await this.page!.goto(
      `https://bestellen.aluxe.nl/dealer/dealer-order/product/?product_id=${productId}&cookie_key=${this.cookieKey}`,
      { waitUntil: 'networkidle', timeout: 15000 }
    );
    
    // Fill configuration
    const configUsed: Record<string, string> = {};
    
    if (WALL_PRODUCTS.has(request.productLine)) {
      await this.fillWallConfig(request, configUsed);
    } else if (PANORAMA_PRODUCTS.has(request.productLine)) {
      await this.fillPanoramaConfig(request, configUsed);
    } else if (request.productLine === 'markise' || request.productLine === 'markise_unterdach') {
      if (request.productLine === 'markise_unterdach' && !request.markiseType) request.markiseType = 'unterdach';
      await this.fillMarkiseConfig(request, configUsed);
    } else if (SENKRECHTMARKISE_PRODUCTS.has(request.productLine)) {
      await this.fillSenkrechtmarkiseConfig(request, configUsed);
    } else {
      if (DESIGNLINE_PRODUCTS.has(request.productLine) && (!request.color || request.color === '7016')) {
        request.color = '9005';
      }
      await this.fillRoofConfig(request, configUsed);
    }
    
    // Submit product
    await this.page!.click('#next');
    await this.page!.waitForLoadState('networkidle');
    await this.page!.waitForTimeout(300);
    
    // Go to materialen to register in cart
    const matLink = await this.page!.$('.rel-materialen');
    if (matLink) {
      await matLink.click();
      await this.page!.waitForLoadState('networkidle');
    }
    
    return { success: true };
  }

  // ---- Get price for a single configuration ----
  // Uses CART DIFF approach: snapshots Gesamtpreis before and after adding
  // the product to get the exact cost of this individual item.
  async getPrice(request: PriceRequest): Promise<PriceResponse> {
    const startTime = Date.now();
    
    try {
      await this.init();
      
      const productId = PRODUCT_LINE_MAP[request.productLine];
      if (!productId) {
        return this.errorResponse(request, `Unknown product: ${request.productLine}`, startTime);
      }
      
      // 1. Start fresh order with customer name (falls back to timestamp)
      const orderName = this.customerLabel || `BOT - ${Date.now()}`;
      await this.startOrder(orderName);
      
      // 2. Snapshot cart BEFORE adding product
      const beforeCart = await this.extractCartItems();
      const beforeTotal = beforeCart.gesamtpreis || 0;
      const beforeCount = beforeCart.items.length;
      
      // 3. Add product to cart
      const addResult = await this.addProductToCart(request);
      if (!addResult.success) {
        return this.errorResponse(request, addResult.error || 'Failed to add product', startTime);
      }
      
      // 4. Snapshot cart AFTER adding product
      const afterCart = await this.extractCartItems();
      const afterTotal = afterCart.gesamtpreis || 0;
      const afterCount = afterCart.items.length;
      this.lastActivity = Date.now();
      
      // 5. Compute this product's price as the DELTA
      const deltaPrice = afterTotal - beforeTotal;
      
      // 6. Also check for new cart item (if count increased)
      let newItemPrice: number | null = null;
      if (afterCount > beforeCount) {
        // A new item appeared — find it by comparing item lists
        const beforeNames = new Set(beforeCart.items.map(i => `${i.name}|${i.price}`));
        const newItems = afterCart.items.filter(i => !beforeNames.has(`${i.name}|${i.price}`));
        if (newItems.length > 0) {
          newItemPrice = newItems[newItems.length - 1].price;
        }
      }
      
      // 7. Pick best price: prefer new item price, then delta, then last item
      const lastItem = afterCart.items.length > 0 ? afterCart.items[afterCart.items.length - 1] : null;
      const bestPrice = newItemPrice && newItemPrice > 0 ? newItemPrice
        : deltaPrice > 0 ? deltaPrice
        : lastItem?.price && lastItem.price > 0 ? lastItem.price
        : afterTotal;
      
      if (!bestPrice || bestPrice <= 0) {
        return this.errorResponse(request, 'No price returned from Aluxe', startTime);
      }
      
      // 8. Calculate customer price
      const pricing = calculateCustomerPrice({ aluxeNetPrice: bestPrice });
      
      return {
        success: true,
        aluxeNetPrice: afterTotal,    // Cumulative Gesamtpreis
        lastItemPrice: bestPrice,     // This product's individual price
        cartItems: afterCart.items,
        pricing,
        productLine: request.productLine,
        productId,
        dimensions: `${request.width}×${request.depth}`,
        configurationUsed: {},
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };
      
    } catch (err) {
      this.isReady = false;
      return this.errorResponse(request, (err as Error).message, startTime);
    }
  }

  // ---- Get price for MULTIPLE products in one order ----
  async getMultiProductPrice(requests: PriceRequest[], customerName?: string): Promise<{
    success: boolean;
    items: { name: string; price: number }[];              // Cart summary
    details: { name: string; unitPrice: number | null; qty: number; total: number | null }[];  // Full breakdown
    gesamtpreis: number | null;
    pricing: import('./pricing-engine').OfferPricingResult | null;
    durationMs: number;
    errors: string[];
  }> {
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      await this.init();
      
      // 1. Start fresh order — saved under customer name
      await this.startOrder(customerName ? `BOT - ${customerName}` : `BOT - Angebot-${Date.now()}`);
      
      // 2. Add each product to cart
      for (let i = 0; i < requests.length; i++) {
        const req = requests[i];
        console.log(`[MultiProduct] Adding ${i + 1}/${requests.length}: ${req.productLine} ${req.width}×${req.depth}`);
        
        const result = await this.addProductToCart(req);
        if (!result.success) {
          errors.push(`${req.productLine}: ${result.error}`);
        }
      }
      
      // 3. Go to Übersicht page for full breakdown
      const overzichtLink = await this.page!.$('.rel-overzicht');
      if (overzichtLink) {
        await overzichtLink.click();
        await this.page!.waitForLoadState('networkidle');
      }
      
      // 4. Extract full itemized breakdown from Übersicht
      const overviewData = await this.page!.evaluate(`(function() {
        var details = [];
        var gesamtpreis = null;
        var transportValue = null;
        var pfandValue = null;
        
        var tables = document.querySelectorAll('table');
        tables.forEach(function(table) {
          table.querySelectorAll('tr').forEach(function(tr) {
            var cells = [];
            tr.querySelectorAll('td, th').forEach(function(td) {
              cells.push(td.textContent.replace(/\\s+/g, ' ').trim());
            });
            
            if (cells.length >= 2) {
              // Skip header row
              if (cells[0] === 'Produkt' || cells[0] === 'Product') return;
              
              // Check for Gesamt/Total row
              if (cells[0] === 'Gesamt' || cells[0] === 'Totaal') {
                var gp = cells[cells.length - 1];
                if (gp && gp.indexOf('€') !== -1) gesamtpreis = gp;
                return;
              }
              
              // Capture Transport value
              if (cells[0] === 'Transport') {
                transportValue = cells[cells.length - 1];
                return;
              }
              // Capture Pfand value
              if (cells[0].indexOf('Pfand') !== -1 || cells[0].indexOf('Statiegeld') !== -1) {
                pfandValue = cells[cells.length - 1];
                return;
              }
              // Skip Zwischensumme
              if (cells[0] === 'Zwischensumme' || cells[0] === 'Subtotaal') return;
              
              // Product detail row
              if (cells[0].length > 2) {
                details.push({
                  name: cells[0],
                  unitPrice: cells.length >= 4 ? cells[1] : null,
                  qty: cells.length >= 4 ? cells[2] : (cells.length >= 3 ? cells[1] : '1'),
                  total: cells[cells.length - 1]
                });
              }
            }
          });
        });
        
        return { details: details, gesamtpreis: gesamtpreis, transportValue: transportValue, pfandValue: pfandValue };
      })()`) as { details: { name: string; unitPrice: string | null; qty: string; total: string }[]; gesamtpreis: string | null; transportValue: string | null; pfandValue: string | null };
      
      // 5. Parse breakdown into structured data
      const details = overviewData.details.map(d => ({
        name: this.translateToGerman(d.name),
        unitPrice: d.unitPrice ? this.parseEurPrice(d.unitPrice) : null,
        qty: parseInt(d.qty) || 1,
        total: d.total ? this.parseEurPrice(d.total) : null,
      }));
      
      const gesamtpreis = overviewData.gesamtpreis ? this.parseEurPrice(overviewData.gesamtpreis) : null;
      
      // 6. Extract cart items for pricing
      const { items } = await this.extractCartItems();
      
      // 7. SAVE the offer — "Offerte speichern"
      const saveBtn = await this.page!.$('#save');
      if (saveBtn) {
        await saveBtn.click();
        await this.page!.waitForLoadState('networkidle').catch(() => {});
        console.log('[MultiProduct] ✅ Offerte gespeichert');
      }
      
      this.lastActivity = Date.now();
      
      if (!gesamtpreis || gesamtpreis <= 0) {
        return { success: false, items, details, gesamtpreis: null, pricing: null, durationMs: Date.now() - startTime, errors: [...errors, 'No Gesamtpreis'] };
      }
      
      // 8. Parse Transport & Pfand — exclude from customer pricing
      const aluxeTransport = overviewData.transportValue ? this.parseEurPrice(overviewData.transportValue) : 0;
      const aluxePfand = overviewData.pfandValue ? this.parseEurPrice(overviewData.pfandValue) : 0;
      
      // Clean Gesamtpreis: subtract Aluxe transport & pfand (we add our own 25€ transport)
      const cleanGesamtpreis = gesamtpreis - aluxeTransport - aluxePfand;
      
      console.log(`[MultiProduct] 💰 Gesamtpreis: ${gesamtpreis}€ (Transport: ${aluxeTransport}€, Pfand: ${aluxePfand}€ → Clean: ${cleanGesamtpreis}€)`);
      
      // 9. Calculate offer price from CLEAN Gesamtpreis (without Aluxe transport/pfand)
      const { calculateOfferPrice } = await import('./pricing-engine');
      
      // Filter out Pfand/Transport from cart items (they sometimes appear as line items)
      const cleanItems = items.filter(item => {
        const lc = item.name.toLowerCase();
        return !lc.includes('pfand') && !lc.includes('statiegeld') && !lc.includes('transport') && !lc.includes('verzend');
      });
      
      const lineItems = cleanItems.map(item => ({
        name: this.translateToGerman(item.name),
        aluxeNetPrice: item.price,
        quantity: 1,
      }));
      
      const pricing = calculateOfferPrice({ lineItems, transportAluxe: 25 });
      
      return {
        success: true,
        items: cleanItems.map(i => ({ ...i, name: this.translateToGerman(i.name) })),
        details,
        gesamtpreis: cleanGesamtpreis,  // Return CLEAN price (without Aluxe Pfand & Transport)
        pricing,
        durationMs: Date.now() - startTime,
        errors,
      };
      
    } catch (err) {
      this.isReady = false;
      return { success: false, items: [], details: [], gesamtpreis: null, pricing: null, durationMs: Date.now() - startTime, errors: [(err as Error).message] };
    }
  };

  // ---- Polendach24 naming + Dutch → German translation ----
  private translateToGerman(text: string): string {
    const translations: [RegExp, string][] = [
      // ═══ POLENDACH24 BRAND NAMES — Aluxe: NO numbers ═══
      [/\bTrendline plus\b/gi, 'Trendstyle Plus'],
      [/\bTrendline\b/gi, 'Trendstyle'],
      [/\bTopline XL\b/gi, 'Topstyle XL'],
      [/\bTopline\b/gi, 'Topstyle'],
      [/\bOrangeline plus\b/gi, 'Orangestyle Plus'],
      [/\bOrangeline\b/gi, 'Orangestyle'],
      [/\bUltraline\b/gi, 'Ultrastyle'],
      [/\bSkyline\b/gi, 'Skystyle'],
      [/\bDesignline\b/gi, 'Designstyle'],
      // ═══ DUTCH → GERMAN ═══
      [/\bmet\b/gi, 'mit'],
      [/\bplaten\b/gi, 'Platten'],
      [/\bglas\b/gi, 'Glas'],
      [/\bveranda\b/gi, 'Veranda'],
      [/\bschuifwand\b/gi, 'Schiebewand'],
      [/\bvrijstaand\b/gi, 'freistehend'],
      [/\bvaste\b/gi, 'feste'],
      [/\bzij-element(?:en)?\b/gi, 'Seitenelemente'],
      [/\bschuifdeur(?:en)?\b/gi, 'Schiebetüren'],
      [/\bwigvormig raam\b/gi, 'Keilfenster'],
      [/\bvoorwand\b/gi, 'Frontwand'],
      [/\bpolycarbonaat\b/gi, 'Polycarbonat'],
      [/\bverlichting\b/gi, 'Beleuchtung'],
      [/\bzonwering\b/gi, 'Sonnenschutz'],
      [/\bkoppelgoot\b/gi, 'Koppelrinne'],
      [/\bgootversteviging\b/gi, 'Rinnenverstärkung'],
      [/\bpalen?\b/gi, 'Pfosten'],
      [/\bstaander\b/gi, 'Ständer'],
      [/\bligger\b/gi, 'Dachträger'],
      [/\bdak\b/gi, 'Dach'],
      [/\bkleur\b/gi, 'Farbe'],
      [/\bspant(?:en)?\b/gi, 'Sparren'],
      [/\bhelder\b/gi, 'klar'],
      [/\bmelk(?:wit)?\b/gi, 'matt/milch'],
      [/\bstandaard\b/gi, 'Standard'],
      [/\bhoekstuk\b/gi, 'Eckstück'],
      [/\bafvoer\b/gi, 'Abfluss'],
      [/\bhoog\b/gi, 'hoch'],
      [/\blaag\b/gi, 'niedrig'],
      [/\blinks\b/gi, 'links'],
      [/\brechts\b/gi, 'rechts'],
      [/\baantal\b/gi, 'Anzahl'],
      [/\bstuk(?:s)?\b/gi, 'Stück'],
      [/\bbreedte\b/gi, 'Breite'],
      [/\bdiepte\b/gi, 'Tiefe'],
      [/\bhoogte\b/gi, 'Höhe'],
      [/\bkit\b/gi, 'Kit'],
      [/\btransparant\b/gi, 'transparent'],
      [/\bbocht\b/gi, 'Bogen'],
      [/\bsierlijst\b/gi, 'Zierleiste'],
      [/\bafstandsprofiel(?:en)?\b/gi, 'Distanzprofile'],
    ];
    
    let result = text;
    for (const [pattern, replacement] of translations) {
      result = result.replace(pattern, replacement);
    }
    return result;
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

      // Ultraline przyjmuje WYLACZNIE wymiary z progow (zmierzone skanem formularza):
      // szerokosc {5000, 6000, 7000}, glebokosc {3000, 3500, 4000, 4500, 5000, 6000}.
      // Wpisanie wartosci spoza progow = walidacja odrzuca (stad bylo ~20% skutecznosci).
      const snapTo = (v: number, steps: number[]) => {
        const up = steps.find(st => st >= v);
        return String(up ?? steps[steps.length - 1]);
      };
      req = { ...req,
        width: parseInt(snapTo(req.width, [5000, 6000, 7000])),
        depth: parseInt(snapTo(req.depth, [3000, 3500, 4000, 4500, 5000, 6000])),
      };
      // formularz ma tez pomocnicze selecty progow — ustaw oba zrodla
      const stepSelects = await p.$$('select:not([id])');
      if (stepSelects.length >= 2) {
        await stepSelects[0].selectOption(String(req.width)).catch(() => {});
        await p.waitForTimeout(200);
        await stepSelects[1].selectOption(String(req.depth)).catch(() => {});
        await p.waitForTimeout(200);
      }
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
    
    // ═══ POLENDACH24 STANDARDS — zawsze dodawane ═══
    
    // Słupy ZAWSZE 3000mm (nie 2400 default!)
    const heightField = await p.$('#height');
    if (heightField) {
      const tag = await p.evaluate(`document.querySelector('#height')?.tagName`);
      if (tag === 'SELECT') {
        await p.selectOption('#height', req.postHeight || '3000').catch(() => {});
      } else {
        await p.fill('#height', req.postHeight || '3000').catch(() => {});
      }
      cfg.postHeight = req.postHeight || '3000';
    }
    
    // Silikon kit (HWA) — ZAWSZE Ja
    await p.selectOption('#standard_kit', '1').catch(() => {});
    cfg.standard_kit = 'Ja';
    
    // HWA Bohr 83mm — ZAWSZE Ja
    await p.selectOption('#hole_drill', '1').catch(() => {});
    cfg.hole_drill = 'Ja';
    
    // Bocht 90 — ZAWSZE Ja
    await p.selectOption('#bocht_90', '1').catch(() => {});
    cfg.bocht_90 = 'Ja';
    
    // ═══ END STANDARDS ═══
    
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

    // Model dachu, pod ktory robiona jest markiza — wczesniej hardcode 'TR'
    // (Trendline), przez co markiza byla wyceniana pod NIEWLASCIWY model.
    const roofCode = req.roofModelCode || 'TR';
    const rooftype = await p.$('#rooftype');
    if (rooftype) { await p.selectOption('#rooftype', roofCode).catch(() => {}); cfg.rooftype = roofCode; }

    // Aufdach / Unterdach — jeden produkt Aluxe, wybor selectem #markise
    // (opcje: 'Aufdachmarkise W350' / 'Unterdachmarkise T350')
    const variant = req.markiseType === 'unterdach' ? 'Unterdachmarkise' : 'Aufdachmarkise';
    const markiseSel = await p.$('#markise');
    if (markiseSel) {
      await p.selectOption('#markise', { label: `${variant} ZIP` }).catch(async () => {
        // fallback: dopasuj po prefiksie wartosci
        const val = await p.evaluate(`(function(){
          var s = document.querySelector('#markise');
          if (!s) return '';
          for (var o of s.options) if (o.value.indexOf('${variant}') === 0) return o.value;
          return '';
        })()`);
        if (val) await p.selectOption('#markise', String(val)).catch(() => {});
      });
      cfg.markise = variant;
      await p.waitForTimeout(300);
    }

    await p.fill('#roofwidth', String(req.width)).catch(() => {});
    await p.fill('#roofdepth', String(req.depth)).catch(() => {});
    cfg.roofwidth = String(req.width);
    cfg.roofdepth = String(req.depth);

    // Number of fields (required!)
    const nf = await p.$('#numberoffields');
    if (nf) { await p.fill('#numberoffields', '1'); cfg.numberoffields = '1'; }

    // Motor + sterowanie (iO) — bez czujnikow i pilota w wycenie bazowej
    await p.selectOption('#motor', 'links').catch(() => {});
    cfg.motor = 'links';
    await p.selectOption('#motortype', 'iO').catch(() => {});
    await p.selectOption('#panoramaanlage', '0').catch(() => {});
    await p.selectOption('#remotecontrol', '0').catch(() => {});
    await p.selectOption('#sensor', '2').catch(() => {});

    // Cloth color (required text field)
    await p.fill('#colorcloth', 'grau').catch(() => {});
    cfg.colorcloth = 'grau';

    await p.selectOption('#color', req.color || '7016').catch(() => {});
    cfg.color = req.color || '7016';
  }

  // ---- Fill Senkrechtmarkise / ZIP Screen config ----
  private async fillSenkrechtmarkiseConfig(req: PriceRequest, cfg: Record<string, string>) {
    const p = this.page!;

    // Formularz ma DWA bezimienne selecty skokowe (szer. 1500-3500, wys. 1000-3000,
    // krok 250mm), ktore synchronizuja sie z #width/#depth. Wczesniejszy kod
    // wpisywal tylko inputy tekstowe i nie ustawial koloru ('raw' to jedyna
    // opcja) — walidacja 'Farbe noch nicht eingefuegt' blokowala KAZDA wycene.
    const snap = (v: number, min: number, max: number) =>
      String(Math.min(max, Math.max(min, Math.round(v / 250) * 250)));
    const w = snap(req.width, 1500, 3500);
    const h = snap(req.depth, 1000, 3000);

    // UWAGA: kazda zmiana selecta moze PRZELADOWAC strone (uchwyty staja sie
    // nieaktualne — 'Execution context was destroyed'). Dlatego: selektory
    // tekstowe + waitForLoadState po kazdym kroku, bez trzymania uchwytow.
    const safeStep = async (fn: () => Promise<unknown>) => {
      await fn().catch(() => {});
      await p.waitForLoadState('networkidle').catch(() => {});
      await p.waitForTimeout(400);
    };
    await safeStep(() => p.selectOption('select:not([id]) >> nth=0', w));
    await safeStep(() => p.selectOption('select:not([id]) >> nth=1', h));
    cfg.width = w;
    cfg.height = h;

    // Kolor: jedyna opcja to 'raw' (RAL Strukturfarbe) → pojawia sie select #ral_color
    await safeStep(() => p.selectOption('#color', 'raw'));
    const ralSel = await p.$('#ral_color');
    if (ralSel) {
      const ralValue = await p.evaluate(`(function(){
        var s = document.querySelector('#ral_color');
        if (!s) return '';
        var want = '${(req.color || '7016').replace(/[^0-9]/g, '')}';
        for (var o of s.options) if (o.value.indexOf(want) === 0 || o.textContent.indexOf(want) !== -1) return o.value;
        return s.options.length > 1 ? s.options[1].value : '';
      })()`);
      if (ralValue) await p.selectOption('#ral_color', String(ralValue)).catch(() => {});
      cfg.ral_color = String(ralValue || 'default');
    }
    // dodatkowe pole tekstowe RAL (pojawia sie w niektorych wersjach formularza)
    const colorRaw = await p.$('#color_raw');
    if (colorRaw) await colorRaw.fill((req.color || '7016').replace(/[^0-9]/g, '')).catch(() => {});
    cfg.color = 'raw/' + (req.color || '7016');

    // Tuchfarbe (required)
    await p.fill('#sun_color', 'Grau (Standard)').catch(() => {});
    cfg.sun_color = 'Grau (Standard)';
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
      lastItemPrice: null,
      cartItems: [],
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
