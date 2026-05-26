// ============================================================================
// Aluxe Automator - Automated configurator for bestellen.aluxe.nl
// Handles: login, product selection, configuration, price extraction
// ============================================================================

import { Browser, Page, BrowserContext } from 'playwright';
import path from 'path';
import fs from 'fs';

// Known product IDs discovered from recording analysis
export const ALUXE_PRODUCTS: Record<string, string> = {
  // ---- Trendline (= "Trendstyle" in Polendach24) ----
  trendline_platten: '2908b3841950ae6',
  trendline_glas: '1f1d836c3cd094c',
  trendline_plus_platten: '52832c55097922c',
  trendline_plus_glas: 'fe9c1a9c9ba700e',
  
  // ---- Topline ----
  topline_xl_platten: '78f60e9bef64493',
  topline_xl_glas: 'b49e5992a83fa62',
  topline_platten: 'debe45b27eed176',
  topline_glas: 'd17713bc222de6d',
  
  // ---- Designline ----
  designline: 'a64f6479443b84e',
  
  // ---- Ultraline ----
  ultraline: '27b0ad19ba6ad08',
  
  // ---- Carport ----
  carport: '8376d76d0b05843',
  carport_frei: '0fd2e99d14d28fb',
  
  // ---- Panorama Schiebewand ----
  panorama_al25_hoch: '1b10c45a15a241c',
  panorama_al24: '2960ab840c58084',
  panorama_al26: 'b380e0897cbdc62',
  panorama_al23_hoch: '505157f4638687f',
  panorama_al22_tief: '505157f4638687e',
  
  // ---- Seitenwände & Fenster ----
  keilfenster: '4b388c1d11993a8',
  feste_seitenelemente: 'ca5707a0c10bf91',
  frontwand: '1103a716fd08b8e',
  rahmen_schiebeturen: 'ed9ad01b6234f2a',
  
  // ---- Sonstiges ----
  masszuschnitt: 'c18fcbae55b0a31',
  verticale_zonwering: 'fd60d47d74592d4',
  markise: '85c0f928be1771c',
  
  // ---- Orangeline ----
  orangeline_plus_poly: '46080ea024ed90c',
  orangeline_plus_glas: '7f29b6efcd8923b',
  orangeline_poly: '635f3b79d4f1ca4',
  orangeline_glas: '633d1f3970384c7',
  
  // ---- Skyline ----
  skyline: '81ba1579ee8d633',
  skyline_frei: 'f06d1e432fc087e',
} as const;

export interface AluxeConfig {
  // Core dimensions
  width?: number;       // Breite in mm (3000-7950)
  depth?: number;       // Tiefe in mm (2000-5000)
  color?: string;       // RAL code: 7016, 9007, 9010, 9005
  height?: string;      // Pfosten height: 2400, 3000
  
  // Pfosten/Ständer
  staanderType?: string; // 0=Standard, 1=Klassik, 2=Rund
  staanderCount?: number; // Number of posts
  
  // Dachfüllung
  dakplaten?: string;   // Product ID for roof type
  dakplaten980Qty?: number; // Number of 980 fields
  liggerType?: string;  // standard, medium, large, extra-large, extra-large-plus
  
  // Options
  freestanding?: string; // 0=No, 1=Freestanding, 2=with steel
  gootVersteviging?: string; // 0=excl, 1=incl, 2=incl+mounted
  sierlijst?: string;   // Zierleiste product ID
  verlichting?: string;  // LED product ID
  verlichtingQty?: number;
  standardKit?: string;  // 0=No, 1=Yes
  holeDrill?: string;   // 0=No, 1=Yes
  heightFront?: number; // mm, default 2200
  heightBack?: number;  // mm
}

export interface AluxePriceResult {
  productPrice: number | null;
  transportPrice: number | null;
  totalPrice: number | null;
  currency: string;
  allPrices: { selector: string; text: string; value: number }[];
  configuration: Record<string, string>;
  screenshotPath: string | null;
  url: string;
  timestamp: string;
}

export interface AluxeProductDiscovery {
  productId: string;
  name: string;
  category: string;
  fields: {
    id: string;
    name: string | null;
    type: string;
    label: string | null;
    options?: { value: string; text: string }[];
    defaultValue?: string;
    visible: boolean;
  }[];
  sections: string[];
}

export class AluxeAutomator {
  private page: Page | null = null;
  private context: BrowserContext | null = null;
  private cookieKey: string = '';
  private isLoggedIn: boolean = false;
  private screenshotDir: string;

  constructor(
    private browser: Browser,
    private credentials: { username: string; password: string },
    screenshotDir?: string
  ) {
    this.screenshotDir = screenshotDir || path.join(process.cwd(), 'recordings', 'auto');
    fs.mkdirSync(this.screenshotDir, { recursive: true });
  }

  // ---- Login ----

  async login(): Promise<void> {
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: 'de-DE',
      ignoreHTTPSErrors: true,
    });

    this.page = await this.context.newPage();
    console.log('  🔑 Logging into Aluxe...');
    
    await this.page.goto('https://bestellen.aluxe.nl', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Fill login form
    await this.page.fill('#login_username', this.credentials.username);
    await this.page.fill('#login_password', this.credentials.password);
    
    // Click submit and wait for page to settle
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }).catch(() => {}),
      this.page.click('input[type=submit]'),
    ]);
    
    // Give extra time for redirect
    await this.page.waitForTimeout(2000);
    
    // Check if we landed on dealer page
    const url = this.page.url();
    console.log(`  📄 Post-login URL: ${url}`);
    
    if (!url.includes('/dealer')) {
      // Maybe there's a redirect or we need to navigate manually
      await this.page.goto('https://bestellen.aluxe.nl/dealer/', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    }
    
    // Extract cookie_key from URL
    const finalUrl = this.page.url();
    const match = finalUrl.match(/cookie_key=(\d+)/);
    if (match) {
      this.cookieKey = match[1];
    }
    
    // Verify we're logged in by checking for logout button
    const logoutBtn = await this.page.$('.logout, a[href*="logout"]');
    if (logoutBtn) {
      this.isLoggedIn = true;
      console.log(`  ✅ Logged in. Cookie key: ${this.cookieKey}`);
    } else {
      // Try one more time - check page content
      const pageText = await this.page.textContent('body').catch(() => '');
      if (pageText && (pageText.includes('Abmelden') || pageText.includes('POLENDACH'))) {
        this.isLoggedIn = true;
        console.log(`  ✅ Logged in (verified via page text). Cookie key: ${this.cookieKey}`);
      } else {
        throw new Error(`Login failed. Current URL: ${finalUrl}`);
      }
    }
  }

  // ---- Start new order ----

  async startNewOrder(): Promise<void> {
    if (!this.page || !this.isLoggedIn) throw new Error('Not logged in');
    
    // Always go back to dashboard first for clean state
    await this.page.goto(`https://bestellen.aluxe.nl/dealer/?cookie_key=${this.cookieKey}`, { 
      waitUntil: 'networkidle', timeout: 15000 
    }).catch(() => {});
    
    // Navigate directly to new order information page
    await this.page.goto(`https://bestellen.aluxe.nl/dealer/dealer-order/informatie/?cookie_key=${this.cookieKey}`, { 
      waitUntil: 'networkidle', timeout: 15000 
    });
    
    const url = this.page.url();
    
    // If on Information page, fill reference and click next
    if (url.includes('/informatie')) {
      const refField = await this.page.$('#reference, [name="reference"]');
      if (refField) {
        await refField.fill(`AutoTest-${Date.now()}`);
      }
      
      const nextBtn = await this.page.$('#next');
      if (nextBtn) {
        await nextBtn.click();
        await this.page.waitForLoadState('networkidle');
      }
    }
  }

  // ---- Discover all products ----

  async discoverProducts(): Promise<AluxeProductDiscovery[]> {
    if (!this.page || !this.isLoggedIn) throw new Error('Not logged in');
    
    console.log('  🔍 Discovering all products...');
    
    // We need to be in an order context first
    await this.startNewOrder();
    
    // Navigate to product selection page
    const productUrl = `https://bestellen.aluxe.nl/dealer/dealer-order/product/?cookie_key=${this.cookieKey}`;
    await this.page.goto(productUrl, { waitUntil: 'networkidle', timeout: 20000 });
    
    // Find all product links
    const products = await this.page.evaluate(`(function() {
      var results = [];
      var links = document.querySelectorAll('a[href*="product_id="]');
      links.forEach(function(link) {
        var href = link.getAttribute('href') || '';
        var match = href.match(/product_id=([a-f0-9]+)/);
        if (match) {
          var category = '';
          var fieldset = link.closest('fieldset');
          if (fieldset) {
            var legend = fieldset.querySelector('legend');
            if (legend) category = (legend.textContent || '').trim();
          }
          var img = link.querySelector('img');
          results.push({
            productId: match[1],
            name: (link.textContent || '').trim(),
            category: category,
            imgSrc: img ? img.getAttribute('src') : null,
            href: href
          });
        }
      });
      return results;
    })()`);
    
    console.log(`  📦 Found ${(products as any[]).length} products`);
    
    // For each product, visit its config page and extract fields
    const discoveries: AluxeProductDiscovery[] = [];
    
    for (const product of products as any[]) {
      console.log(`  🔍 Inspecting: ${product.name} (${product.category})`);
      
      try {
        // Navigate to product config
        const productUrl = `https://bestellen.aluxe.nl/dealer/dealer-order/product/?product_id=${product.productId}&cookie_key=${this.cookieKey}`;
        await this.page.goto(productUrl, { waitUntil: 'networkidle', timeout: 20000 });
        
        // Extract all fields
        const pageData = await this.page.evaluate(`(function() {
          var fields = [];
          document.querySelectorAll('input, select, textarea').forEach(function(el) {
            if (el.type === 'hidden' || el.type === 'submit') return;
            
            var label = null;
            if (el.id) {
              var lbl = document.querySelector('label[for="' + el.id + '"]');
              if (lbl) label = (lbl.textContent || '').trim();
            }
            if (!label && el.closest('label')) {
              label = (el.closest('label').textContent || '').trim();
            }
            
            var field = {
              id: el.id || null,
              name: el.name || null,
              type: el.tagName === 'SELECT' ? 'select' : el.type || 'text',
              label: label,
              visible: el.offsetParent !== null,
              defaultValue: el.value || ''
            };
            
            if (el.tagName === 'SELECT') {
              field.options = Array.from(el.options).map(function(opt) {
                return { value: opt.value, text: (opt.textContent || '').trim() };
              });
            }
            
            fields.push(field);
          });
          
          var sections = [];
          document.querySelectorAll('fieldset').forEach(function(fs) {
            var legend = fs.querySelector('legend');
            if (legend) sections.push((legend.textContent || '').trim());
          });
          
          return { fields: fields, sections: sections };
        })()`);
        
        discoveries.push({
          productId: product.productId,
          name: product.name,
          category: product.category,
          fields: (pageData as any).fields,
          sections: (pageData as any).sections,
        });
        
        // Take screenshot
        const screenshotPath = path.join(this.screenshotDir, `product_${product.productId}.png`);
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        
      } catch (err) {
        console.warn(`  ⚠️ Failed to inspect ${product.name}:`, (err as Error).message);
      }
    }
    
    return discoveries;
  }

  // ---- Configure a Trendline product and get price ----

  async configureTrendline(config: AluxeConfig): Promise<AluxePriceResult> {
    if (!this.page || !this.isLoggedIn) throw new Error('Not logged in');
    
    console.log('  🏗️ Configuring Trendline veranda...');
    
    // Navigate directly to Trendline product page
    const productUrl = `https://bestellen.aluxe.nl/dealer/dealer-order/product/?product_id=${ALUXE_PRODUCTS.trendline_platten}&cookie_key=${this.cookieKey}`;
    await this.page.goto(productUrl, { waitUntil: 'networkidle', timeout: 20000 });
    
    // Fill in width
    if (config.width) {
      // Use the select dropdown for standard widths
      const widthSelect = await this.page.$('#width-div > select');
      if (widthSelect) {
        const hasOption = await this.page.evaluate(`(function() {
          var sel = document.querySelector('#width-div > select');
          return sel ? Array.from(sel.options).some(function(o) { return o.value === '${config.width}'; }) : false;
        })()`);
        
        if (hasOption) {
          await this.page.selectOption('#width-div > select', String(config.width));
          await this.page.waitForTimeout(500);
        } else {
          await this.page.fill('#width', String(config.width));
        }
      }
    }
    
    // Fill in depth
    if (config.depth) {
      const depthSelect = await this.page.$('#depth-div > select');
      if (depthSelect) {
        const hasOption = await this.page.evaluate(`(function() {
          var sel = document.querySelector('#depth-div > select');
          return sel ? Array.from(sel.options).some(function(o) { return o.value === '${config.depth}'; }) : false;
        })()`);
        
        if (hasOption) {
          await this.page.selectOption('#depth-div > select', String(config.depth));
          await this.page.waitForTimeout(500);
        } else {
          await this.page.fill('#depth', String(config.depth));
        }
      }
    }
    
    // Color
    if (config.color) {
      await this.page.selectOption('#color', config.color);
      await this.page.waitForTimeout(300);
    }
    
    // Post height
    if (config.height) {
      await this.page.selectOption('#height', config.height);
    }
    
    // Post type
    if (config.staanderType) {
      await this.page.selectOption('#staander_type', config.staanderType);
    }
    
    // Post count
    if (config.staanderCount) {
      await this.page.fill('#staander', String(config.staanderCount));
    }
    
    // Roof type
    if (config.dakplaten) {
      await this.page.selectOption('#dakplaten', config.dakplaten);
      await this.page.waitForTimeout(300);
    }
    
    // Ligger type
    if (config.liggerType) {
      await this.page.selectOption('#ligger_type', config.liggerType);
    }
    
    // Goot versteviging
    if (config.gootVersteviging) {
      await this.page.selectOption('#goot_versteviging', config.gootVersteviging);
    }
    
    // Freestanding
    if (config.freestanding) {
      await this.page.selectOption('#freestanding', config.freestanding);
    }
    
    // Zierleiste
    if (config.sierlijst) {
      await this.page.selectOption('#sierlijst', config.sierlijst);
    }
    
    // LED
    if (config.verlichting) {
      await this.page.selectOption('#verlichting-id-', config.verlichting);
    }
    
    // Silicon kit
    if (config.standardKit) {
      await this.page.selectOption('#standard_kit', config.standardKit);
    }
    
    // Hole drill
    if (config.holeDrill) {
      await this.page.selectOption('#hole_drill', config.holeDrill);
    }
    
    // Height front/back
    if (config.heightFront) {
      await this.page.fill('#height_front', String(config.heightFront));
    }
    if (config.heightBack) {
      await this.page.fill('#height_back', String(config.heightBack));
    }
    
    // Take screenshot of configuration
    const configScreenshot = path.join(this.screenshotDir, `config_${Date.now()}.png`);
    await this.page.screenshot({ path: configScreenshot, fullPage: true });
    
    // Read current form values
    const formValues = await this.page.evaluate(`(function() {
      var vals = {};
      document.querySelectorAll('input, select').forEach(function(el) {
        var key = el.name || el.id;
        if (!key || el.type === 'hidden' || el.type === 'submit') return;
        vals[key] = el.value || '';
      });
      return vals;
    })()`);
    
    console.log('  💾 Configuration filled. Clicking Weiter...');
    
    // Click "Weiter" (next) to go to Materialen page
    await this.page.click('#next');
    await this.page.waitForLoadState('networkidle');
    
    // We might be on Materialen page now - click through to Übersicht
    // But first check if we're still on product page (validation error)
    const currentUrl = this.page.url();
    
    if (currentUrl.includes('/product/') || currentUrl.includes('/product?')) {
      // Check for errors
      const errorText = await this.page.evaluate(`(function() {
        var err = document.querySelector('.error, .warning, .alert');
        return err ? err.textContent.trim() : null;
      })()`);
      
      if (errorText) {
        console.warn(`  ⚠️ Validation error: ${errorText}`);
      }
    }
    
    // Navigate to Materialen if not already there
    if (!currentUrl.includes('/materialen/')) {
      await this.page.click('.rel-materialen').catch(() => {});
      await this.page.waitForLoadState('networkidle');
    }
    
    // Extract prices from the sidebar cart
    const priceData = await this.extractPrices();
    
    // Take price screenshot
    const priceScreenshot = path.join(this.screenshotDir, `price_${Date.now()}.png`);
    await this.page.screenshot({ path: priceScreenshot, fullPage: true });
    
    return {
      ...priceData,
      configuration: formValues as Record<string, string>,
      screenshotPath: priceScreenshot,
      url: this.page.url(),
      timestamp: new Date().toISOString(),
    };
  }

  // ---- Extract prices from current page ----

  async extractPrices(): Promise<Omit<AluxePriceResult, 'configuration' | 'screenshotPath' | 'url' | 'timestamp'>> {
    if (!this.page) throw new Error('No page');
    
    const prices = await this.page.evaluate(`(function() {
      var results = [];
      
      // Price patterns
      var pricePatterns = [/[\\d.,]+\\s*€/, /€\\s*[\\d.,]+/, /[\\d.,]+\\s*EUR/i];
      
      function parseEU(text) {
        var cleaned = text.replace(/[^\\d.,]/g, '');
        if (!cleaned) return null;
        if (cleaned.indexOf(',') !== -1 && cleaned.indexOf('.') !== -1) {
          if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
            return parseFloat(cleaned.replace(/\\./g, '').replace(',', '.'));
          }
          return parseFloat(cleaned.replace(/,/g, ''));
        }
        if (cleaned.indexOf(',') !== -1) {
          var parts = cleaned.split(',');
          if (parts.length === 2 && parts[1].length <= 2) return parseFloat(cleaned.replace(',', '.'));
          return parseFloat(cleaned.replace(/,/g, ''));
        }
        return parseFloat(cleaned) || null;
      }
      
      // Check sidebar cart
      var cart = document.querySelector('#cart');
      if (cart) {
        cart.querySelectorAll('td').forEach(function(td) {
          var text = (td.textContent || '').trim();
          if (text.indexOf('€') !== -1) {
            var val = parseEU(text);
            if (val && val > 0) {
              results.push({
                selector: '#cart td',
                text: text,
                value: val
              });
            }
          }
        });
      }
      
      // Check .grandtotal
      var grandTotal = document.querySelector('.grandtotal');
      if (grandTotal) {
        var text = (grandTotal.textContent || '').trim();
        var val = parseEU(text);
        if (val) results.push({ selector: '.grandtotal', text: text, value: val });
      }
      
      // Check all price-like elements
      ['.price', '.total', '.amount', '[class*="price"]', '[class*="total"]'].forEach(function(sel) {
        try {
          document.querySelectorAll(sel).forEach(function(el) {
            var text = (el.textContent || '').trim();
            if (text.indexOf('€') !== -1) {
              var val = parseEU(text);
              if (val && val > 0) {
                results.push({ selector: sel, text: text, value: val });
              }
            }
          });
        } catch(e) {}
      });
      
      return results;
    })()`);
    
    const allPrices = prices as { selector: string; text: string; value: number }[];
    
    // Find product price (largest non-transport, non-total)
    let productPrice: number | null = null;
    let transportPrice: number | null = null;
    let totalPrice: number | null = null;
    
    // Grand total is typically marked with .grandtotal
    const grandTotal = allPrices.find(p => p.selector === '.grandtotal');
    if (grandTotal) totalPrice = grandTotal.value;
    
    // Transport is typically 200 EUR
    const transport = allPrices.find(p => p.text.toLowerCase().includes('transport'));
    if (transport) transportPrice = transport.value;
    
    // Product price = total - transport (or first large price)
    if (totalPrice && transportPrice) {
      productPrice = totalPrice - transportPrice;
    } else {
      // First price in cart that's not transport/total
      const cartPrices = allPrices
        .filter(p => p.selector.includes('#cart') && !p.text.toLowerCase().includes('transport') && !p.text.toLowerCase().includes('gesamt'))
        .sort((a, b) => b.value - a.value);
      if (cartPrices.length > 0) productPrice = cartPrices[0].value;
    }
    
    return {
      productPrice,
      transportPrice,
      totalPrice,
      currency: 'EUR',
      allPrices,
    };
  }

  // ---- Run automated price test ----

  async runPriceTest(configs: AluxeConfig[]): Promise<AluxePriceResult[]> {
    const results: AluxePriceResult[] = [];
    
    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      console.log(`\n  === Test ${i + 1}/${configs.length} ===`);
      console.log(`  Width: ${config.width}, Depth: ${config.depth}, Color: ${config.color}`);
      
      try {
        const result = await this.configureTrendline(config);
        results.push(result);
        
        console.log(`  💰 Product: €${result.productPrice?.toFixed(2) || 'N/A'}`);
        console.log(`  💰 Total:   €${result.totalPrice?.toFixed(2) || 'N/A'}`);
        
        // Go back to product page for next config
        await this.page!.click('.rel-product').catch(() => {});
        await this.page!.waitForLoadState('networkidle');
        
      } catch (err) {
        console.error(`  ❌ Test ${i + 1} failed:`, (err as Error).message);
        results.push({
          productPrice: null,
          transportPrice: null,
          totalPrice: null,
          currency: 'EUR',
          allPrices: [],
          configuration: config as any,
          screenshotPath: null,
          url: this.page?.url() || '',
          timestamp: new Date().toISOString(),
        });
      }
    }
    
    return results;
  }

  // ---- Cleanup ----

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close().catch(() => {});
    }
    this.page = null;
    this.context = null;
    this.isLoggedIn = false;
  }
}
