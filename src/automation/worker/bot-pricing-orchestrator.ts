// ============================================================================
// Bot Pricing Orchestrator v3 — FULL COMBO AGENT
// Prices ALL products from ALL suppliers, compares, builds 3 packages
// with cross-sell. Economy → Recommended → Premium.
// ============================================================================

import { AluxePricingService, type PriceRequest } from './aluxe-pricing-service';
import { TerandaPricingService, type TerandaRequest } from './teranda-pricing-service';
import { AliplastPricingService, type AliplastPriceRequest } from './aliplast-pricing-service';
import { calculateOfferPrice, type OfferPricingResult } from './pricing-engine';
import { getMbRoofPrice, getMbZipPrice, getMbSchiebewandPrice, getMbKeilPrice } from './mb-pricing-service';

// ---- Types ----

/** Dodatki, o które klient poprosił WPROST — muszą być w KAŻDYM pakiecie (od Basis). */
export type RequestedExtra =
  | 'led'
  | 'zip_sides'
  | 'zip_front'
  | 'markise'
  | 'heater'
  | 'panorama_front'
  | 'panorama_sides'
  | 'keilfenster';

export interface BotPricingRequest {
  leadId?: string;
  customerName: string;
  width: number;       // mm
  depth: number;       // mm (projection / Tiefe)
  height?: number;     // mm (post height, default 2500)
  postalCode?: string;
  roofType?: 'glass' | 'polycarbonate' | 'both';
  color?: string;      // Default: RAL 7016
  // Sides config for accessories
  sides?: {
    left?: boolean;    // default true
    right?: boolean;   // default true
    front?: boolean;   // default true
  };
  productCategory?: 'roof' | 'pergola' | 'carport';
  primaryModelId?: string;
  wantsWintergarten?: boolean; // Customer wants full glass enclosure (panorama sides + front)
  customerPreferredCover?: string; // What the customer actually asked for: 'glass', 'polycarbonate', etc.
  freestanding?: boolean; // Freistehend (no wall mount) — affects structural details
  /** Dodatki wymienione wprost przez klienta — trafiają do każdego pakietu (od Basis) */
  requestedExtras?: RequestedExtra[];
}

export interface LiveQuote {
  supplier: string;
  product: string;
  productLabel: string;
  category: 'roof' | 'panorama' | 'senkrechtmarkise' | 'markise' | 'led' | 'wall' | 'keilfenster';
  tier: 'economy' | 'mid' | 'mid_premium' | 'premium' | 'accessory' | 'value' | 'recommended';
  coverType?: string;  // 'poly' | 'glas'
  price: number | null;
  success: boolean;
  error?: string;
  durationMs: number;
  source: 'live_configurator' | 'estimated' | 'calculator';
  confidence: number;
  dimensions?: string;
  note?: string;
}

export interface PackageItem {
  name: string;
  category: string;
  supplier: string;
  purchaseNetto: number;
  quantity: number;
  dimensions?: string;
  source: string;
  confidence: number;
  note?: string;
  missingData?: boolean;
  alternativeSupplier?: string;
  alternativePrice?: number;
  savings?: number;  // How much cheaper vs alternative
}

export interface StructuralDetail {
  label: string;       // e.g. "Pfosten"
  value: string;       // e.g. "3 Stück à 2500mm"
  icon?: string;       // icon hint for frontend
}

export interface OfferPackage {
  id: 'economy' | 'recommended' | 'value' | 'premium';
  nameDE: string;
  subtitleDE: string;
  descriptionDE: string;
  badge?: string;
  highlights?: string[];       // 2-4 key selling points for the tier card
  upgradeReason?: string;      // Why this tier is better than the one below
  items: PackageItem[];
  structuralDetails?: StructuralDetail[];  // construction specs for customer
  purchaseNetto: number;
  customerNetto: number;
  customerBrutto: number;
  marginPercent: number;
  marginAmount: number;
  hasMissingPrices: boolean;
  overallConfidence: number;
}

export interface CrossSellItem {
  name: string;
  nameDE: string;
  category: string;
  supplier: string;
  purchaseNetto: number;
  customerBrutto: number;
  dimensions?: string;
  description: string;
  icon: string;
  confidence: number;
  source: string;
}

export interface SupplierOrderRef {
  supplier: string;
  product: string;
  label: string;
  url: string;
}

export interface BotPricingResult {
  leadId?: string;
  customerName: string;
  requestedDimensions: string;
  liveQuotes: LiveQuote[];
  packages: OfferPackage[];
  crossSell: CrossSellItem[];
  /** Linki do zapisanych ofert/zamowien u dostawcow (np. Aluxe Offerte) */
  supplierOrders: SupplierOrderRef[];
  totalDurationMs: number;
  suppliersQueried: string[];
  suppliersSuccessful: string[];
  suppliersFailed: string[];
  createdAt: string;
  // Price comparison data for internal use
  priceComparisons: {
    category: string;
    options: { supplier: string; product: string; price: number; cheapest: boolean }[];
  }[];
}

// ---- Constants ----

const PLN_TO_EUR = 4.30;
const PLN_TO_EUR_RATE = 0.232; // 1 PLN = 0.232 EUR
const ALIPLAST_ZIP_PER_M2_PLN = 432; // PLN brutto per m² (fallback estimation)

// Product display names — CUSTOMER-FACING! No supplier names!
// Aluxe = Trendstyle, Topstyle, Orangestyle (bez numeru)
// Teranda = Trendstyle 15, Topstyle 20, Orangestyle 10 (z numerem)
const DISPLAY_NAMES: Record<string, string> = {
  // Aluxe → NO numbers
  orangestyle_poly: 'Orangestyle mit Polycarbonat',
  orangestyle_glas: 'Orangestyle mit Glas',
  orangestyle_plus_poly: 'Orangestyle Plus mit Polycarbonat',
  orangestyle_plus_glas: 'Orangestyle Plus mit Glas',
  trendstyle_poly: 'Trendstyle mit Polycarbonat',
  trendstyle_glas: 'Trendstyle mit Glas',
  trendstyle_plus_poly: 'Trendstyle Plus mit Polycarbonat',
  trendstyle_plus_glas: 'Trendstyle Plus mit Glas',
  topstyle_poly: 'Topstyle mit Polycarbonat',
  topstyle_glas: 'Topstyle mit Glas',
  topstyle_xl_poly: 'Topstyle XL mit Polycarbonat',
  topstyle_xl_glas: 'Topstyle XL mit Glas',
  ultrastyle_classic: 'Ultrastyle Classic',
  ultrastyle_style: 'Ultrastyle Style',
  ultrastyle_compact: 'Ultrastyle Compact',
  skystyle: 'Skystyle (Flachdach)',
  designstyle: 'Designstyle',
  // Teranda → WITH numbers (10, 15, 20)
  teranda_tr15_poly: 'Trendstyle 15 mit Polycarbonat',
  teranda_tr15_glas: 'Trendstyle 15 mit Glas',
  teranda_tr10_poly: 'Orangestyle 10 mit Polycarbonat',
  teranda_tr10_glas: 'Orangestyle 10 mit Glas',
  teranda_tr20_poly: 'Topstyle 20 mit Polycarbonat',
  teranda_tr20_glas: 'Topstyle 20 mit Glas',
  panorama_al22: 'Panorama Schiebewand',
  panorama_al23: 'Panorama Schiebewand',
  senkrechtmarkise_aluxe: 'Senkrechtmarkise',
  senkrechtmarkise_aliplast: 'Senkrechtmarkise',
  markise: 'Markise (Sonnenschutz)',
};

// Tier mapping for roof products
const ROOF_TIERS: Record<string, 'economy' | 'mid' | 'premium'> = {
  orangestyle_poly: 'economy',
  orangestyle_glas: 'economy',
  orangestyle_plus_poly: 'economy',
  orangestyle_plus_glas: 'economy',
  trendstyle_poly: 'mid',
  trendstyle_glas: 'mid',
  trendstyle_plus_poly: 'mid',
  trendstyle_plus_glas: 'mid',
  topstyle_poly: 'mid',
  topstyle_glas: 'mid',
  topstyle_xl_poly: 'mid',
  topstyle_xl_glas: 'mid',
  teranda_tr15_poly: 'mid',
  teranda_tr15_glas: 'mid',
  ultrastyle_classic: 'premium',
  ultrastyle_style: 'premium',
  ultrastyle_compact: 'premium',
  skystyle: 'premium',
  designstyle: 'premium',
};

// ---- Main orchestrator ----

export class BotPricingOrchestrator {
  private aluxeService: AluxePricingService | null = null;
  private terandaService: TerandaPricingService | null = null;
  private aliplastService: AliplastPricingService | null = null;
  
  constructor(
    private credentials: {
      aluxe?: { username: string; password: string };
      teranda?: { email: string; password: string };
      aliplast?: { email: string; password: string };
    }
  ) {}
  
  async getQuotes(req: BotPricingRequest): Promise<BotPricingResult> {
    const startTime = Date.now();
    const dimString = `${req.width}×${req.depth}mm`;
    const liveQuotes: LiveQuote[] = [];
    const suppliersQueried: string[] = [];
    const suppliersSuccessful: string[] = [];
    const suppliersFailed: string[] = [];
    
    const productCategory = req.productCategory || (
      req.primaryModelId && ['pergola', 'pergola_deluxe'].includes(req.primaryModelId.toLowerCase()) ? 'pergola' :
      req.primaryModelId && ['carport'].includes(req.primaryModelId.toLowerCase()) ? 'carport' :
      'roof'
    );
    const primaryModelId = req.primaryModelId ? req.primaryModelId.toLowerCase() : '';
    const isFlatRoof = productCategory === 'roof' && [
      'skystyle', 'skyline', 'ultrastyle', 'ultrastyle_classic', 'ultrastyle_style', 'ultrastyle_compact', 'ultraline'
    ].includes(primaryModelId);

    // ═══ DIMENSION VALIDATION — clamp to product limits ═══
    const CATEGORY_LIMITS: Record<string, { maxW: number; maxD: number; minW: number; minD: number }> = {
      roof:    { maxW: 15000, maxD: 5000, minW: 2500, minD: 2000 },
      carport: { maxW: 6000, maxD: 5000, minW: 3000, minD: 2500 },
      pergola: { maxW: 7000, maxD: 5000, minW: 3000, minD: 3000 },
    };
    const catLimits = CATEGORY_LIMITS[productCategory] || CATEGORY_LIMITS.roof;
    
    const originalWidth = req.width;
    const originalDepth = req.depth;
    
    if (req.width > catLimits.maxW) {
      console.warn(`⚠️ Width ${req.width}mm exceeds max ${catLimits.maxW}mm for ${productCategory} — clamping!`);
      req.width = catLimits.maxW;
    }
    if (req.width < catLimits.minW) {
      console.warn(`⚠️ Width ${req.width}mm below min ${catLimits.minW}mm for ${productCategory} — clamping!`);
      req.width = catLimits.minW;
    }
    if (req.depth > catLimits.maxD) {
      console.warn(`⚠️ Depth ${req.depth}mm exceeds max ${catLimits.maxD}mm for ${productCategory} — clamping!`);
      req.depth = catLimits.maxD;
    }
    if (req.depth < catLimits.minD) {
      console.warn(`⚠️ Depth ${req.depth}mm below min ${catLimits.minD}mm for ${productCategory} — clamping!`);
      req.depth = catLimits.minD;
    }
    
    const wasClamped = originalWidth !== req.width || originalDepth !== req.depth;
    if (wasClamped) {
      console.warn(`⚠️ Dimensions clamped: ${originalWidth}×${originalDepth}mm → ${req.width}×${req.depth}mm`);
    }

    console.log('\n' + '═'.repeat(70));
    console.log(`  🤖 BOT PRICING v3 — FULL COMBO AGENT (Category: ${productCategory})`);
    console.log(`  👤 ${req.customerName}`);
    console.log(`  📐 ${dimString}${wasClamped ? ` → clamped to ${req.width}×${req.depth}mm` : ''}, Höhe: ${req.height || 2500}mm`);
    console.log('═'.repeat(70));
    
    // All individual prices keyed by product
    const prices: Record<string, number> = {};
    
    // ══════════════════════════════════════════════════════════════
    // PARALLEL SUPPLIER QUERIES — All 3 suppliers run simultaneously
    // ══════════════════════════════════════════════════════════════
    console.log('\n  ⚡ Running relevant suppliers in PARALLEL...\n');
    
    type SupplierResult = { quotes: LiveQuote[]; prices: Record<string, number>; supplier: string; success: boolean; orders?: SupplierOrderRef[] };
    
    // ── ALUXE task ──
    const aluxeTask = async (): Promise<SupplierResult> => {
      const result: SupplierResult = { quotes: [], prices: {}, supplier: 'aluxe', success: false };
      if (!this.credentials.aluxe) return result;
      
      const aluxeProducts: { key: string; label: string; category: LiveQuote['category']; tier: LiveQuote['tier']; cover?: string; priceMultiplier?: number; req: PriceRequest }[] = [];
      
      if (productCategory === 'carport') {
        aluxeProducts.push({
          key: 'carport',
          label: 'Carport (Wandmontage)',
          category: 'roof',
          tier: 'economy',
          req: { productLine: 'carport', width: req.width, depth: req.depth, color: req.color || '7016', postHeight: '3000' }
        });
        aluxeProducts.push({
          key: 'carport_frei',
          label: 'Carport Freistehend',
          category: 'roof',
          tier: 'value',
          req: { productLine: 'carport_frei', width: req.width, depth: req.depth, color: req.color || '7016', postHeight: '3000', freestanding: true }
        });
      } else if (productCategory === 'roof') {
        const roofTypes = req.roofType === 'glass' ? ['glas'] 
          : req.roofType === 'polycarbonate' ? ['poly']
          : ['poly', 'glas'];
        
        if (isFlatRoof) {
          aluxeProducts.push({ key: 'ultrastyle_classic', label: DISPLAY_NAMES['ultrastyle_classic'], category: 'roof', tier: 'premium', req: { productLine: 'ultrastyle_classic', width: req.width, depth: req.depth, color: req.color || '7016', postHeight: '3000' } });
          aluxeProducts.push({ key: 'skystyle', label: DISPLAY_NAMES['skystyle'], category: 'roof', tier: 'premium', req: { productLine: 'skystyle', width: req.width, depth: req.depth, color: req.color || '7016', postHeight: '3000' } });
          if (req.freestanding) {
            aluxeProducts.push({ key: 'skystyle_frei', label: 'Skystyle Freistehend (Flachdach)', category: 'roof', tier: 'premium', req: { productLine: 'skyline_frei', width: req.width, depth: req.depth, color: req.color || '7016', postHeight: '3000', freestanding: true } });
          }
        } else {
          for (const rt of roofTypes) {
            aluxeProducts.push({ key: `orangestyle_${rt}`, label: DISPLAY_NAMES[`orangestyle_${rt}`], category: 'roof', tier: 'economy', cover: rt, req: { productLine: rt === 'glas' ? 'orangeline_glas' : 'orangeline_poly', width: req.width, depth: req.depth, color: req.color || '7016', postHeight: '3000' } });
          }
          const wantsPlus = primaryModelId.includes('plus') || req.depth >= 4500;
          const wantsXL = primaryModelId.includes('xl') || req.width >= 6000;
          for (const rt of roofTypes) {
            aluxeProducts.push({ key: `trendstyle_${rt}`, label: DISPLAY_NAMES[`trendstyle_${rt}`], category: 'roof', tier: 'mid', cover: rt, req: { productLine: rt === 'glas' ? 'trendstyle_glas' : 'trendstyle_poly', width: req.width, depth: req.depth, color: req.color || '7016', postHeight: '3000' } });
            aluxeProducts.push({ key: `topstyle_${rt}`, label: DISPLAY_NAMES[`topstyle_${rt}`], category: 'roof', tier: 'mid_premium', cover: rt, req: { productLine: rt === 'glas' ? 'topstyle_glas' : 'topstyle_poly', width: req.width, depth: req.depth, color: req.color || '7016', postHeight: '3000' } });
            // Wzmocnione warianty: Plus (większe głębokości) i Topline XL (większe szerokości / na życzenie)
            if (wantsPlus) {
              aluxeProducts.push({ key: `trendstyle_plus_${rt}`, label: DISPLAY_NAMES[`trendstyle_plus_${rt}`], category: 'roof', tier: 'mid', cover: rt, req: { productLine: rt === 'glas' ? 'trendstyle_plus_glas' : 'trendstyle_plus_poly', width: req.width, depth: req.depth, color: req.color || '7016', postHeight: '3000' } });
            }
            if (wantsXL) {
              aluxeProducts.push({ key: `topstyle_xl_${rt}`, label: DISPLAY_NAMES[`topstyle_xl_${rt}`], category: 'roof', tier: 'mid_premium', cover: rt, req: { productLine: rt === 'glas' ? 'topstyle_xl_glas' : 'topstyle_xl_poly', width: req.width, depth: req.depth, color: req.color || '7016', postHeight: '3000' } });
            }
          }
          aluxeProducts.push({ key: 'ultrastyle_classic', label: DISPLAY_NAMES['ultrastyle_classic'], category: 'roof', tier: 'premium', req: { productLine: 'ultrastyle_classic', width: req.width, depth: req.depth, color: req.color || '7016', postHeight: '3000' } });
          aluxeProducts.push({ key: 'skystyle', label: DISPLAY_NAMES['skystyle'], category: 'roof', tier: 'premium', req: { productLine: 'skystyle', width: req.width, depth: req.depth, color: req.color || '7016', postHeight: '3000' } });
        }

        // Designstyle — wyceniany TYLKO gdy klient o niego prosi (wczesniej nigdy:
        // klient proszacy o Designline dostawal Trendstyle)
        if (primaryModelId.includes('design')) {
          aluxeProducts.push({ key: 'designstyle', label: DISPLAY_NAMES['designstyle'] || 'Designstyle', category: 'roof', tier: 'premium', req: { productLine: 'designstyle', width: req.width, depth: req.depth, color: req.color || '7016', postHeight: '3000' } });
        }

        aluxeProducts.push({ key: 'panorama_al23_front', label: 'Panorama AL23 — Front', category: 'panorama', tier: 'accessory', req: { productLine: 'panorama_al23', width: req.width, depth: 2200, color: req.color || '7016' } });
        aluxeProducts.push({ key: 'panorama_al23_side', label: 'Panorama AL23 — Seite', category: 'panorama', tier: 'accessory', req: { productLine: 'panorama_al23', width: req.depth, depth: 2200, color: req.color || '7016' } });
        if (!isFlatRoof) {
          aluxeProducts.push({ key: 'keilfenster', label: 'Keilfenster (Dreiecksfenster)', category: 'keilfenster', tier: 'accessory', req: { productLine: 'keilfenster', width: req.depth, depth: 2200, heightBack: 2600, color: req.color || '7016' } });
        }

        // Senkrechtmarkise: formularz Aluxe ma max 3500mm szerokosci (selecty skokowe).
        // Wieksze prześwity = konstrukcja MODULOWA: wyceniamy 1 modul i mnozymy.
        const senkH = Math.min(req.height || 2500, 3000);
        const senkPlan = (span: number) => {
          const units = Math.max(1, Math.ceil(span / 3500));
          const unitW = Math.min(3500, Math.max(1500, Math.round(span / units / 250) * 250));
          return { units, unitW };
        };
        const senkFront = senkPlan(req.width);
        const senkSide = senkPlan(req.depth);
        aluxeProducts.push({ key: 'senkrechtmarkise_front', label: `Senkrechtmarkise — Front${senkFront.units > 1 ? ` (${senkFront.units} Module)` : ''}`, category: 'senkrechtmarkise', tier: 'accessory', priceMultiplier: senkFront.units, req: { productLine: 'senkrechtmarkise', width: senkFront.unitW, depth: senkH, color: req.color || '7016' } });
        aluxeProducts.push({ key: 'senkrechtmarkise_side', label: `Senkrechtmarkise — Seite${senkSide.units > 1 ? ` (${senkSide.units} Module)` : ''}`, category: 'senkrechtmarkise', tier: 'accessory', priceMultiplier: senkSide.units, req: { productLine: 'senkrechtmarkise', width: senkSide.unitW, depth: senkH, color: req.color || '7016' } });

        // Markizy: NAD dachem i POD dachem — konfigurowane pod MODEL KLIENTA
        // (Skyline nie ma opcji markizy w formularzu — pomijamy)
        const markiseRoofCode = roofCodeForModel(primaryModelId);
        if (markiseRoofCode) {
          aluxeProducts.push({ key: 'markise_aufdach', label: 'Markise Aufdach (ZIP)', category: 'markise', tier: 'accessory', req: { productLine: 'markise', width: req.width, depth: req.depth, color: req.color || '7016', markiseType: 'aufdach', roofModelCode: markiseRoofCode } });
          aluxeProducts.push({ key: 'markise_unterdach', label: 'Markise Unterdach (ZIP)', category: 'markise', tier: 'accessory', req: { productLine: 'markise_unterdach', width: req.width, depth: req.depth, color: req.color || '7016', markiseType: 'unterdach', roofModelCode: markiseRoofCode } });
        }
      }

      if (aluxeProducts.length === 0) {
        return result;
      }

      console.log('  ┌──────────────────────────────────────────');
      console.log(`  │ 🏭 ALUXE — Live Konfigurator (${aluxeProducts.length} Produkte)`);
      console.log('  └──────────────────────────────────────────');
      
      const svc = new AluxePricingService(this.credentials.aluxe);
      this.aluxeService = svc;
      svc.setCustomerName(req.customerName);
      
      for (let pi = 0; pi < aluxeProducts.length; pi++) {
        const prod = aluxeProducts[pi];
        console.log(`\n    🔄 [${pi + 1}/${aluxeProducts.length}] ${prod.label} (${prod.req.width}×${prod.req.depth})...`);
        const t0 = Date.now();
        
        try {
          const priceResult = await svc.getPrice(prod.req);
          const dur = Date.now() - t0;
          
          if (priceResult.success) {
            const baseItemPrice = priceResult.lastItemPrice && priceResult.lastItemPrice > 0
              ? priceResult.lastItemPrice
              : priceResult.aluxeNetPrice;
            const multiplier = prod.priceMultiplier || 1;
            const itemPrice = baseItemPrice ? baseItemPrice * multiplier : baseItemPrice;

            if (itemPrice && itemPrice > 0) {
              result.prices[prod.key] = itemPrice;
              console.log(`    ✅ ${prod.label}: EK ${itemPrice.toFixed(2)}€${multiplier > 1 ? ` (${multiplier}× ${baseItemPrice!.toFixed(2)}€)` : ''} [${(dur/1000).toFixed(1)}s]`);
              result.quotes.push({ supplier: 'aluxe', product: prod.key, productLabel: prod.label, category: prod.category, tier: prod.tier, coverType: prod.cover, price: itemPrice, success: true, durationMs: dur, source: 'live_configurator', confidence: 1.0, dimensions: `${prod.req.width}×${prod.req.depth}mm`, note: multiplier > 1 ? `${multiplier} Module à ${baseItemPrice!.toFixed(0)}€` : undefined });

              // ═══ SAVE this model as separate order (link do oferty zakupowej w CRM) ═══
              try {
                const orderUrl = await svc.saveCurrentOrder();
                if (orderUrl) {
                  if (!result.orders) result.orders = [];
                  result.orders.push({ supplier: 'aluxe', product: prod.key, label: prod.label, url: orderUrl });
                }
                console.log(`    💾 Offerte #${pi + 1} gespeichert: ${prod.label}`);
              } catch (e) {
                console.log(`    ⚠️ Save #${pi + 1}: ${(e as Error).message}`);
              }
              
              // ═══ Start fresh order for next model ═══
              if (pi < aluxeProducts.length - 1) {
                try {
                  await svc.startFreshOrder();
                } catch (e) {
                  console.log(`    ⚠️ New order: ${(e as Error).message}`);
                }
              }
            } else {
              result.quotes.push({ supplier: 'aluxe', product: prod.key, productLabel: prod.label, category: prod.category, tier: prod.tier, coverType: prod.cover, price: null, success: false, error: 'Price is 0', durationMs: dur, source: 'live_configurator', confidence: 0 });
            }
          } else {
            result.quotes.push({ supplier: 'aluxe', product: prod.key, productLabel: prod.label, category: prod.category, tier: prod.tier, coverType: prod.cover, price: null, success: false, error: priceResult.error, durationMs: dur, source: 'live_configurator', confidence: 0 });
          }
        } catch (err) {
          result.quotes.push({ supplier: 'aluxe', product: prod.key, productLabel: prod.label, category: prod.category, tier: prod.tier, coverType: prod.cover, price: null, success: false, error: (err as Error).message, durationMs: Date.now() - t0, source: 'live_configurator', confidence: 0 });
        }
      }
      
      result.success = result.quotes.filter(q => q.success).length > 0;
      console.log(`\n    📊 Aluxe: ${result.quotes.filter(q => q.success).length}/${aluxeProducts.length} erfolgreich (${result.quotes.filter(q => q.success).length} osobnych ofert)`);
      
      return result;
    };
    
    // ── TERANDA task ──
    const terandaTask = async (): Promise<SupplierResult> => {
      const result: SupplierResult = { quotes: [], prices: {}, supplier: 'teranda', success: false };
      if (!this.credentials.teranda) return result;
      
      if (productCategory !== 'roof' || isFlatRoof) {
        console.log(`  🏭 TERANDA — Übersprungen (Kategorie: ${productCategory}, Flach: ${isFlatRoof})`);
        return result;
      }
      
      console.log('  ┌──────────────────────────────────────────');
      console.log('  │ 🌐 TERANDA — Live Konfigurator');
      console.log('  └──────────────────────────────────────────');
      
      const svc = new TerandaPricingService(this.credentials.teranda);
      this.terandaService = svc;
      const glazings = req.roofType === 'glass' ? ['glas'] 
        : req.roofType === 'polycarbonate' ? ['polycarbonat']
        : ['polycarbonat', 'glas'];

      // TR15 zawsze; TR10/TR20 warunkowo (rodzina modelu klienta) — kazde zapytanie
      // Teranda to ~30-60s SPA, wiec dokladamy tylko to, co potrzebne do trafienia
      // w model. Pokrycie: przy jawnym zyczeniu tylko ono (oszczednosc czasu).
      const trModels: { tr: 'tr10' | 'tr15' | 'tr20'; tier: LiveQuote['tier'] }[] = [{ tr: 'tr15', tier: 'mid' }];
      if (primaryModelId.includes('orange')) trModels.push({ tr: 'tr10', tier: 'economy' });
      if (primaryModelId.includes('top')) trModels.push({ tr: 'tr20', tier: 'mid_premium' });

      for (const tm of trModels)
      for (const g of glazings) {
        const key = `teranda_${tm.tr}_${g === 'glas' ? 'glas' : 'poly'}`;
        const label = DISPLAY_NAMES[key] || key;
        console.log(`\n    🔄 ${label}...`);
        const t0 = Date.now();
        
        try {
          const priceResult = await svc.getPrice({
            product: tm.tr, width: req.width, depth: req.depth,
            heightRinne: req.height || 2500, color: req.color || 'RAL7016st',
            glazingType: g as 'glas' | 'polycarbonat',
            roofCover: g === 'glas' ? '44.2 VSG KLAR' : 'Polycarbonat OPAL',
            postLength: '3000',
            customerName: req.customerName,
          });
          const dur = Date.now() - t0;
          
          if (priceResult.success && priceResult.netto && priceResult.netto > 0) {
            result.prices[key] = priceResult.netto;
            console.log(`    ✅ ${label}: EK ${priceResult.netto.toFixed(2)}€ [${(dur/1000).toFixed(1)}s]`);
            result.quotes.push({ supplier: 'teranda', product: key, productLabel: label, category: 'roof', tier: tm.tier, coverType: g === 'glas' ? 'glas' : 'poly', price: priceResult.netto, success: true, durationMs: dur, source: 'live_configurator', confidence: 1.0, dimensions: dimString });
          } else {
            result.quotes.push({ supplier: 'teranda', product: key, productLabel: label, category: 'roof', tier: tm.tier, coverType: g === 'glas' ? 'glas' : 'poly', price: null, success: false, error: priceResult.error, durationMs: dur, source: 'live_configurator', confidence: 0 });
          }
        } catch (err) {
          result.quotes.push({ supplier: 'teranda', product: key, productLabel: label, category: 'roof', tier: tm.tier, price: null, success: false, error: (err as Error).message, durationMs: Date.now() - t0, source: 'live_configurator', confidence: 0 });
        }
      }
      
      result.success = result.quotes.filter(q => q.success).length > 0;
      return result;
    };
    
    // ── ALIPLAST task ──
    const aliplastTask = async (): Promise<SupplierResult> => {
      const result: SupplierResult = { quotes: [], prices: {}, supplier: 'aliplast', success: false };
      
      const addEstimation = (pos: string, w: number) => {
        const h = req.height || 2500;
        const areaM2 = (w / 1000) * (h / 1000);
        const plnBrutto = areaM2 * ALIPLAST_ZIP_PER_M2_PLN;
        const eurNetto = (plnBrutto / 1.23) / PLN_TO_EUR;
        const key = `aliplast_zip_${pos}`;
        result.prices[key] = eurNetto;
        result.quotes.push({ supplier: 'aliplast', product: key, productLabel: `ZIP Screen C-Cube — ${pos === 'front' ? 'Front' : 'Seite'}`, category: 'senkrechtmarkise', tier: 'accessory', price: eurNetto, success: true, durationMs: 0, source: 'estimated', confidence: 0.6, dimensions: `${w}×${h}mm`, note: `Schätzung: ${plnBrutto.toFixed(0)} PLN brutto` });
      };
      
      if (!this.credentials.aliplast) {
        if (productCategory === 'roof' || productCategory === 'pergola') {
          for (const [pos, w] of [['front', req.width], ['side', req.depth]] as const) {
            addEstimation(pos, w);
            console.log(`    ≈ ZIP ${pos} (Schätzung — keine Credentials): ${result.prices[`aliplast_zip_${pos}`]?.toFixed(2)}€`);
          }
        }
        result.success = true;
        return result;
      }
      
      console.log('  ┌──────────────────────────────────────────');
      console.log('  │ 🇵🇱 ALIPLAST — Live Konfigurator');
      console.log('  └──────────────────────────────────────────');
      
      try {
        const svc = new AliplastPricingService(this.credentials.aliplast);
        this.aliplastService = svc;
        svc.setCustomerName(req.customerName);
        
        if (productCategory === 'pergola') {
          const qStart = Date.now();
          console.log(`\n    🔄 Pergola Nuun ECO (Base Configuration)...`);
          try {
            const priceResult = await svc.getPrice({
              group: 'Pergola',
              product: 'Pergola Nuun ECO Pojedyncza/Modułowa',
              width: req.width,
              depth: req.depth,
              height: req.height || 2400,
              color: req.color || '7016',
              pergola: {
                modules: 'Single',
                installType: 'WallMount',
                drainType: 'Okrągły',
                steeringType: 'Somfy',
                ledSlats: 0,
                zipOpenings: []
              }
            });
            const dur = Date.now() - qStart;
            if (priceResult.success && priceResult.priceNetEUR > 0) {
              result.prices['pergola_base'] = priceResult.priceNetEUR;
              console.log(`    ✅ Pergola Base: ${priceResult.priceNetEUR.toFixed(2)}€ (${dur}ms)`);
              // Customer-facing label is German — the Polish configurator name stays in the request only
              result.quotes.push({ supplier: 'aliplast', product: 'pergola_base', productLabel: 'Pergola-Lamellendach', category: 'roof', tier: 'economy', price: priceResult.priceNetEUR, success: true, durationMs: dur, source: 'live_configurator', confidence: 1.0, dimensions: `${req.width}×${req.depth}mm` });
            } else {
              throw new Error(priceResult.error || 'Price is 0');
            }
          } catch (err) {
            console.error(`    ❌ Pergola live query failed: ${(err as Error).message}`);
          }
          
          for (const [pos, w] of [['front', req.width], ['side', req.depth]] as const) {
            const h = req.height || 2500;
            const key = `aliplast_zip_${pos}`;
            const zipStart = Date.now();
            try {
              const priceResult = await svc.getPrice({ group: 'Zip Screen', product: 'ZipScreen', model: 'C - Cube', width: w, height: h, color: '7016', mountType: 'Fasada' });
              if (priceResult.success && priceResult.priceNetEUR > 0) {
                result.prices[key] = priceResult.priceNetEUR;
                console.log(`    ✅ ZIP ${pos}: ${priceResult.priceNetEUR.toFixed(2)}€`);
                result.quotes.push({ supplier: 'aliplast', product: key, productLabel: `ZIP Screen C-Cube — ${pos === 'front' ? 'Front' : 'Seite'}`, category: 'senkrechtmarkise', tier: 'accessory', price: priceResult.priceNetEUR, success: true, durationMs: Date.now() - zipStart, source: 'live_configurator', confidence: 1.0, dimensions: `${w}×${h}mm` });
              } else {
                throw new Error(priceResult.error || 'Price is 0');
              }
            } catch (err) {
              addEstimation(pos, w);
            }
          }
          result.success = true;
          
        } else if (productCategory === 'carport') {
          const cpStart1 = Date.now();
          console.log(`\n    🔄 Aliplast Carport (Montaż do elewacji)...`);
          try {
            const priceResult = await svc.getPrice({
              group: 'Carport',
              product: 'Carport',
              width: req.width,
              depth: req.depth,
              carport: {
                installType: 'WallMount',
                profileColor: '7012ST',
                slatsColor: '7016',
                measuredHeight: req.height || 2400,
              }
            });
            const dur = Date.now() - cpStart1;
            if (priceResult.success && priceResult.priceNetPLN > 0) {
              result.prices['aliplast_carport_wall'] = priceResult.priceNetEUR;
              console.log(`    ✅ Carport WallMount: ${priceResult.priceNetEUR.toFixed(2)}€ (${dur}ms)`);
              result.quotes.push({ supplier: 'aliplast', product: 'aliplast_carport_wall', productLabel: 'Carport (Wandmontage)', category: 'roof', tier: 'recommended', price: priceResult.priceNetEUR, success: true, durationMs: dur, source: 'live_configurator', confidence: 1.0, dimensions: `${req.width}×${req.depth}mm` });
            } else {
              throw new Error(priceResult.error || 'Price is 0');
            }
          } catch (err) {
            console.error(`    ❌ Aliplast Carport WallMount failed: ${(err as Error).message}`);
          }

          const cpStart2 = Date.now();
          console.log(`\n    🔄 Aliplast Carport (Wolnostojący)...`);
          try {
            const priceResult = await svc.getPrice({
              group: 'Carport',
              product: 'Carport',
              width: req.width,
              depth: req.depth,
              carport: {
                installType: 'Standalone',
                profileColor: '7012ST',
                slatsColor: '7016',
                measuredHeight: req.height || 2400,
              }
            });
            const dur = Date.now() - cpStart2;
            if (priceResult.success && priceResult.priceNetPLN > 0) {
              result.prices['aliplast_carport_free'] = priceResult.priceNetEUR;
              console.log(`    ✅ Carport Standalone: ${priceResult.priceNetEUR.toFixed(2)}€ (${dur}ms)`);
              result.quotes.push({ supplier: 'aliplast', product: 'aliplast_carport_free', productLabel: 'Carport Freistehend (Premium)', category: 'roof', tier: 'premium', price: priceResult.priceNetEUR, success: true, durationMs: dur, source: 'live_configurator', confidence: 1.0, dimensions: `${req.width}×${req.depth}mm` });
            } else {
              throw new Error(priceResult.error || 'Price is 0');
            }
          } catch (err) {
            console.error(`    ❌ Aliplast Carport Standalone failed: ${(err as Error).message}`);
          }
          result.success = true;

        } else {
          for (const [pos, w] of [['front', req.width], ['side', req.depth]] as const) {
            const h = req.height || 2500;
            const key = `aliplast_zip_${pos}`;
            const qStart = Date.now();
            
            try {
              const priceResult = await svc.getPrice({ group: 'Zip Screen', product: 'ZipScreen', model: 'C - Cube', width: w, height: h, color: '7016', mountType: 'Fasada' });
              if (priceResult.success && priceResult.priceNetEUR > 0) {
                result.prices[key] = priceResult.priceNetEUR;
                console.log(`    ✅ ZIP ${pos}: ${priceResult.priceNetPLN.toFixed(0)} PLN → ${priceResult.priceNetEUR.toFixed(2)}€ (${priceResult.durationMs}ms)`);
                result.quotes.push({ supplier: 'aliplast', product: key, productLabel: `ZIP Screen C-Cube — ${pos === 'front' ? 'Front' : 'Seite'}`, category: 'senkrechtmarkise', tier: 'accessory', price: priceResult.priceNetEUR, success: true, durationMs: priceResult.durationMs, source: 'live_configurator', confidence: 1.0, dimensions: `${w}×${h}mm`, note: `${priceResult.priceNetPLN.toFixed(0)} PLN netto → ${priceResult.priceNetEUR.toFixed(0)}€` });
              } else {
                throw new Error(priceResult.error || 'Price is 0');
              }
            } catch (err) {
              addEstimation(pos, w);
              console.log(`    ≈ ZIP ${pos} (Schätzung): ${result.prices[key]?.toFixed(2)}€ — live failed: ${(err as Error).message.substring(0,40)}`);
            }
          }
          result.success = true;
        }
      } catch (err) {
        console.log(`    ❌ Aliplast service error: ${(err as Error).message.substring(0,50)}`);
        if (productCategory === 'roof' || productCategory === 'pergola') {
          for (const [pos, w] of [['front', req.width], ['side', req.depth]] as const) addEstimation(pos, w);
        }
        result.success = true;
      }
      return result;
    };
    
    // ── MB ALUMINIUM task — czysty kalkulator z cennika (bez Chromium, ~0 ms) ──
    const mbTask = async (): Promise<SupplierResult> => {
      const result: SupplierResult = { quotes: [], prices: {}, supplier: 'mb', success: false };
      const mbQuote = (
        key: string, label: string, category: LiveQuote['category'], tier: LiveQuote['tier'],
        cover: string | undefined, calc: () => ReturnType<typeof getMbRoofPrice>, dims?: string,
      ) => {
        try {
          const r = calc();
          if (r.success && r.priceNetEur > 0) {
            result.prices[key] = r.priceNetEur;
            result.quotes.push({
              supplier: 'mb', product: key, productLabel: label, category, tier, coverType: cover,
              price: r.priceNetEur, success: true, durationMs: 0, source: 'calculator', confidence: 0.95,
              dimensions: dims || `${req.width}×${req.depth}mm`,
              note: `Abrechnungsmaß ${r.billedWidthCm}×${r.billedDepthCm}cm`,
            });
          }
        } catch { /* poza cennikiem — pomijamy po cichu */ }
      };

      console.log('  ┌──────────────────────────────────────────');
      console.log('  │ 🧮 MB ALUMINIUM — Kalkulator (Preisliste Mai 2026)');
      console.log('  └──────────────────────────────────────────');

      const isFree = req.freestanding === true;
      const h = req.height || 2500;

      if (productCategory === 'roof') {
        const roofTypes = req.roofType === 'glass' ? ['glas']
          : req.roofType === 'polycarbonate' ? ['poly']
          : ['poly', 'glas'];

        if (isFlatRoof) {
          mbQuote('mb_cube_glas', 'Skystyle (Flachdach) mit Glas', 'roof', 'premium', undefined,
            () => getMbRoofPrice({ model: 'cube', widthMm: req.width, depthMm: req.depth, coveringId: 'gk', freestanding: isFree }));
          mbQuote('mb_cubegrand_glas', 'Skystyle Grand (Flachdach) mit Glas', 'roof', 'premium', undefined,
            () => getMbRoofPrice({ model: 'cubegrand', widthMm: req.width, depthMm: req.depth, coveringId: 'gk', freestanding: isFree }));
        } else {
          for (const rt of roofTypes) {
            const cov = rt === 'glas' ? 'gk' : 'pc';
            mbQuote(`mb_solid_${rt}`, `Trendstyle mit ${rt === 'glas' ? 'Glas' : 'Polycarbonat'}`, 'roof', 'mid', rt,
              () => getMbRoofPrice({ model: 'solid', widthMm: req.width, depthMm: req.depth, coveringId: cov, freestanding: isFree }));
            mbQuote(`mb_bold_${rt}`, `Topstyle mit ${rt === 'glas' ? 'Glas' : 'Polycarbonat'}`, 'roof', 'mid_premium', rt,
              () => getMbRoofPrice({ model: 'bold', widthMm: req.width, depthMm: req.depth, coveringId: cov, freestanding: isFree }));
          }
          mbQuote('mb_cube_glas', 'Skystyle (Flachdach) mit Glas', 'roof', 'premium', undefined,
            () => getMbRoofPrice({ model: 'cube', widthMm: req.width, depthMm: req.depth, coveringId: 'gk', freestanding: isFree }));
        }

        // Akcesoria — konkurują z Aluxe/Aliplast o miejsce w pakiecie (wygrywa tańszy)
        mbQuote('mb_zip_front', 'Senkrechtmarkise — Front', 'senkrechtmarkise', 'accessory', undefined,
          () => getMbZipPrice({ widthMm: req.width, heightMm: h }) as any, `${req.width}×${h}mm`);
        mbQuote('mb_zip_side', 'Senkrechtmarkise — Seite', 'senkrechtmarkise', 'accessory', undefined,
          () => getMbZipPrice({ widthMm: req.depth, heightMm: h }) as any, `${req.depth}×${h}mm`);
        mbQuote('mb_panorama_front', 'Panorama Schiebewand — Front', 'panorama', 'accessory', undefined,
          () => getMbSchiebewandPrice({ openingWidthMm: req.width, heightMm: 2200 }) as any, `${req.width}×2200mm`);
        mbQuote('mb_panorama_side', 'Panorama Schiebewand — Seite', 'panorama', 'accessory', undefined,
          () => getMbSchiebewandPrice({ openingWidthMm: req.depth, heightMm: 2200 }) as any, `${req.depth}×2200mm`);
        if (!isFlatRoof) {
          mbQuote('mb_keilfenster', 'Keilfenster (Dreiecksfenster)', 'keilfenster', 'accessory', undefined,
            () => getMbKeilPrice({ widthMm: req.depth, type: 'glas' }) as any, `${req.depth}mm`);
        }
      } else if (productCategory === 'pergola') {
        mbQuote('mb_prime', 'Pergola-Lamellendach', 'roof', 'economy', undefined,
          () => getMbRoofPrice({ model: 'prime', widthMm: req.width, depthMm: req.depth }));
        mbQuote('mb_advanced', 'Pergola-Lamellendach Deluxe (Lamellen verschiebbar)', 'roof', 'mid', undefined,
          () => getMbRoofPrice({ model: 'advanced', widthMm: req.width, depthMm: req.depth }));
        mbQuote('mb_zip_front', 'Senkrechtmarkise — Front', 'senkrechtmarkise', 'accessory', undefined,
          () => getMbZipPrice({ widthMm: req.width, heightMm: h }) as any, `${req.width}×${h}mm`);
        mbQuote('mb_zip_side', 'Senkrechtmarkise — Seite', 'senkrechtmarkise', 'accessory', undefined,
          () => getMbZipPrice({ widthMm: req.depth, heightMm: h }) as any, `${req.depth}×${h}mm`);
      } else if (productCategory === 'carport') {
        mbQuote('mb_carport', 'Carport Freistehend (Trapezblech-Dach)', 'roof', 'value', undefined,
          () => getMbRoofPrice({ model: 'carport', widthMm: req.width, depthMm: req.depth, coveringId: 'tr' }));
      }

      for (const q of result.quotes) {
        console.log(`    🧮 ${q.productLabel.padEnd(45)} EK ${q.price!.toFixed(2)}€`);
      }
      result.success = result.quotes.length > 0;
      return result;
    };

    // ── RUN ALL IN PARALLEL ──
    const parallelStart = Date.now();
    const [aluxeResult, terandaResult, aliplastResult, mbResult] = await Promise.allSettled([
      aluxeTask(), terandaTask(), aliplastTask(), mbTask()
    ]);
    console.log(`\n  ⚡ Parallel pricing done in ${((Date.now() - parallelStart) / 1000).toFixed(1)}s`);

    // ── Merge results ──
    const supplierOrders: SupplierOrderRef[] = [];
    for (const settled of [aluxeResult, terandaResult, aliplastResult, mbResult]) {
      if (settled.status === 'fulfilled') {
        const r = settled.value;
        if (r.quotes.length > 0) {
          liveQuotes.push(...r.quotes);
          Object.assign(prices, r.prices);
          suppliersQueried.push(r.supplier);
          if (r.success) suppliersSuccessful.push(r.supplier);
          else suppliersFailed.push(r.supplier);
        }
        if (r.orders && r.orders.length > 0) supplierOrders.push(...r.orders);
      } else {
        console.error(`  ❌ Supplier task rejected: ${settled.reason}`);
      }
    }
    
    // ══════════════════════════════════════════════════════════════
    // 4. LED — Calculator
    // ══════════════════════════════════════════════════════════════
    const ledSpots = estimateLedPrice(req.width, req.depth, 'spots_only');
    const ledFull = estimateLedPrice(req.width, req.depth, 'spots_and_stripes');
    prices['led_spots'] = ledSpots.totalNetto;
    prices['led_full'] = ledFull.totalNetto;
    
    // ══════════════════════════════════════════════════════════════
    // 5. PRICE COMPARISONS
    // ══════════════════════════════════════════════════════════════
    console.log('\n  ┌──────────────────────────────────────────');
    console.log('  │ 🔍 PREISVERGLEICH');
    console.log('  └──────────────────────────────────────────');
    
    const priceComparisons: BotPricingResult['priceComparisons'] = [];
    
    // Compare Senkrechtmarkise: Aluxe vs Aliplast
    const zipCompFront: { supplier: string; product: string; price: number; cheapest: boolean }[] = [];
    if (prices['senkrechtmarkise_front']) zipCompFront.push({ supplier: 'Aluxe', product: 'Senkrechtmarkise', price: prices['senkrechtmarkise_front'], cheapest: false });
    if (prices['aliplast_zip_front']) zipCompFront.push({ supplier: 'Aliplast', product: 'ZIP Screen C-Cube', price: prices['aliplast_zip_front'], cheapest: false });
    if (zipCompFront.length > 0) {
      const cheapest = zipCompFront.reduce((a, b) => a.price < b.price ? a : b);
      cheapest.cheapest = true;
      priceComparisons.push({ category: 'Senkrechtmarkise Front', options: zipCompFront });
      console.log(`\n    🔽 ZIP/Senkrechtmarkise Front:`);
      for (const o of zipCompFront) {
        console.log(`       ${o.cheapest ? '✅' : '  '} ${o.supplier.padEnd(10)} ${o.product.padEnd(25)} ${o.price.toFixed(0)}€${o.cheapest ? ' ← GÜNSTIGSTE' : ''}`);
      }
    }
    
    const zipCompSide: typeof zipCompFront = [];
    if (prices['senkrechtmarkise_side']) zipCompSide.push({ supplier: 'Aluxe', product: 'Senkrechtmarkise', price: prices['senkrechtmarkise_side'], cheapest: false });
    if (prices['aliplast_zip_side']) zipCompSide.push({ supplier: 'Aliplast', product: 'ZIP Screen C-Cube', price: prices['aliplast_zip_side'], cheapest: false });
    if (zipCompSide.length > 0) {
      const cheapest = zipCompSide.reduce((a, b) => a.price < b.price ? a : b);
      cheapest.cheapest = true;
      priceComparisons.push({ category: 'Senkrechtmarkise Seite', options: zipCompSide });
      console.log(`    🔽 ZIP/Senkrechtmarkise Seite:`);
      for (const o of zipCompSide) {
        console.log(`       ${o.cheapest ? '✅' : '  '} ${o.supplier.padEnd(10)} ${o.product.padEnd(25)} ${o.price.toFixed(0)}€${o.cheapest ? ' ← GÜNSTIGSTE' : ''}`);
      }
    }
    
    // Compare roofs: Trendstyle vs TR15
    const roofCompPoly: typeof zipCompFront = [];
    if (prices['trendstyle_poly']) roofCompPoly.push({ supplier: 'Aluxe', product: 'Trendstyle 15 Poly', price: prices['trendstyle_poly'], cheapest: false });
    if (prices['teranda_tr15_poly']) roofCompPoly.push({ supplier: 'Teranda', product: 'TR15 Poly', price: prices['teranda_tr15_poly'], cheapest: false });
    if (roofCompPoly.length > 1) {
      const cheapest = roofCompPoly.reduce((a, b) => a.price < b.price ? a : b);
      cheapest.cheapest = true;
      priceComparisons.push({ category: 'Trendstyle vs TR15 (Poly)', options: roofCompPoly });
      console.log(`\n    🏠 Trendstyle vs TR15 (Poly):`);
      for (const o of roofCompPoly) {
        console.log(`       ${o.cheapest ? '✅' : '  '} ${o.supplier.padEnd(10)} ${o.product.padEnd(25)} ${o.price.toFixed(0)}€${o.cheapest ? ' ← GÜNSTIGSTE' : ''}`);
      }
    }
    
    // ══════════════════════════════════════════════════════════════
    // 6. BUILD 3 PACKAGES
    // ══════════════════════════════════════════════════════════════
    console.log('\n  ┌──────────────────────────────────────────');
    console.log('  │ 📦 PAKETAUFBAU');
    console.log('  └──────────────────────────────────────────');
    
    const packages: OfferPackage[] = [];
    
    // Helper: find cheapest in category — Aluxe vs Aliplast vs MB (wygrywa najtańszy)
    const cheapestZip = (pos: 'front' | 'side') => {
      const candidates = [
        { key: `senkrechtmarkise_${pos}`, supplier: 'aluxe', name: `Senkrechtmarkise — ${pos === 'front' ? 'Front' : 'Seite'}`, confidence: 1.0 },
        { key: `aliplast_zip_${pos}`, supplier: 'aliplast', name: `ZIP Screen C-Cube — ${pos === 'front' ? 'Front' : 'Seite'}`, confidence: liveQuotes.some(q => q.product === `aliplast_zip_${pos}` && q.source === 'live_configurator') ? 1.0 : 0.6 },
        { key: `mb_zip_${pos}`, supplier: 'mb', name: `Senkrechtmarkise — ${pos === 'front' ? 'Front' : 'Seite'}`, confidence: 0.95 },
      ].filter(c => prices[c.key] && prices[c.key] > 0)
        .map(c => ({ ...c, price: prices[c.key] }))
        .sort((a, b) => a.price - b.price);

      if (candidates.length === 0) return null;
      const best = candidates[0];
      const alt = candidates[1];
      return {
        name: best.name, supplier: best.supplier, price: best.price, confidence: best.confidence,
        ...(alt ? { altSupplier: alt.supplier, altPrice: alt.price } : {}),
      };
    };

    // Helper: cheapest panorama (Schiebewand) per position — Aluxe AL23 vs MB ESG
    const cheapestPanorama = (pos: 'front' | 'side') => {
      const candidates = [
        { key: `panorama_al23_${pos}`, supplier: 'aluxe', confidence: 1.0 },
        { key: `mb_panorama_${pos}`, supplier: 'mb', confidence: 0.95 },
      ].filter(c => prices[c.key] && prices[c.key] > 0)
        .map(c => ({ ...c, price: prices[c.key] }))
        .sort((a, b) => a.price - b.price);
      return candidates[0] || null;
    };

    // Helper: cheapest keilfenster — Aluxe vs MB
    const cheapestKeil = () => {
      const candidates = [
        { key: 'keilfenster', supplier: 'aluxe', confidence: 1.0 },
        { key: 'mb_keilfenster', supplier: 'mb', confidence: 0.95 },
      ].filter(c => prices[c.key] && prices[c.key] > 0)
        .map(c => ({ ...c, price: prices[c.key] }))
        .sort((a, b) => a.price - b.price);
      return candidates[0] || null;
    };
    
    // ══════════════════════════════════════════════════════════════
    // Smart package building — Empfohlen = what the customer asked for
    // ══════════════════════════════════════════════════════════════
    
    // Use customerPreferredCover if set (from AI analysis), else fall back to roofType
    const effectiveCoverPref = req.customerPreferredCover || req.roofType;
    const customerSpecifiedGlass = effectiveCoverPref === 'glass';
    const customerSpecifiedPoly = effectiveCoverPref === 'polycarbonate';
    const showBothRoofTypes = !effectiveCoverPref || effectiveCoverPref === 'both';
    
    // The customer's preferred cover type (default: glass for recommendation)
    const customerCover = customerSpecifiedPoly ? 'poly' : 'glas';
    
    // Helper: panorama front only — najtańszy dostawca (Aluxe AL23 vs MB ESG)
    const makePanoramaFrontItems = (): PackageItem[] => {
      const best = cheapestPanorama('front');
      if (!best) return [];
      return [{ name: 'Panorama Schiebewand — Front', category: 'panorama', supplier: best.supplier,
        purchaseNetto: best.price, quantity: 1, dimensions: `${req.width}×2200mm`,
        source: best.supplier === 'mb' ? 'calculator' : 'live_configurator', confidence: best.confidence,
        note: 'Schiebeverglasung, ESG-Sicherheitsglas' }];
    };

    // Helper: keilfenster — ALWAYS needed with panorama on sides for sloped roofs
    // (Aluxe & MB; Teranda hat eigene Keil-Seiten). 1× per side where panorama is installed
    const makeKeilfensterItems = (count: number, supplier?: string): PackageItem[] => {
      const best = cheapestKeil();
      if (!best) return [];
      const currentSupplier = supplier || 'aluxe';
      if (currentSupplier === 'teranda' || isFlatRoof) return [];
      return [{ name: `Keilfenster (Dreiecksfenster)${count > 1 ? ` — ${count}×` : ''}`, category: 'keilfenster', supplier: best.supplier,
        purchaseNetto: best.price * count, quantity: count, dimensions: `${req.depth}mm`,
        source: best.supplier === 'mb' ? 'calculator' : 'live_configurator', confidence: best.confidence,
        note: 'Dreiecksfenster für Dachschräge — Pflicht bei Panorama' }];
    };

    // Helper: panorama sides (2×) + keilfenster (2×)
    const makePanoramaSideItems = (supplier?: string): PackageItem[] => {
      const items: PackageItem[] = [];
      const currentSupplier = supplier || 'aluxe';
      const best = cheapestPanorama('side');
      if (best) {
        items.push({ name: 'Panorama Schiebewand — 2× Seiten', category: 'panorama', supplier: best.supplier,
          purchaseNetto: best.price * 2, quantity: 2, dimensions: `${req.depth}×2200mm`,
          source: best.supplier === 'mb' ? 'calculator' : 'live_configurator', confidence: best.confidence,
          note: 'Glas-Schiebewände beidseitig' });
        // Keilfenster required for EACH side with panorama on sloped roofs
        if (currentSupplier !== 'teranda' && !isFlatRoof) {
          items.push(...makeKeilfensterItems(2, currentSupplier));
        }
      }
      return items;
    };

    const makeZipSideItems = (): PackageItem[] => {
      const zipSide = cheapestZip('side');
      if (!zipSide) return [];
      return [{
        name: `${zipSide.name} — 2× Seiten`, category: 'senkrechtmarkise',
        supplier: zipSide.supplier, purchaseNetto: zipSide.price * 2, quantity: 2,
        dimensions: `${req.depth}×${req.height || 2500}mm`,
        source: zipSide.confidence >= 0.95 ? 'live_configurator' : 'estimated',
        confidence: zipSide.confidence, note: 'Senkrecht-Markise mit Motor',
        ...(zipSide.altSupplier ? { alternativeSupplier: zipSide.altSupplier, alternativePrice: (zipSide.altPrice || 0) * 2 } : {}),
      }];
    };

    const makeZipFrontItems = (): PackageItem[] => {
      const zipFront = cheapestZip('front');
      if (!zipFront) return [];
      return [{
        name: `${zipFront.name}`, category: 'senkrechtmarkise',
        supplier: zipFront.supplier, purchaseNetto: zipFront.price, quantity: 1,
        dimensions: `${req.width}×${req.height || 2500}mm`,
        source: zipFront.confidence >= 0.95 ? 'live_configurator' : 'estimated',
        confidence: zipFront.confidence, note: 'Senkrecht-Markise mit Motor — Front',
      }];
    };

    const makeMarkiseItems = (): PackageItem[] => {
      if (!prices['markise_aufdach']) return [];
      return [{
        name: 'Markise (Sonnenschutz, Aufdach)', category: 'markise', supplier: 'aluxe',
        purchaseNetto: prices['markise_aufdach'], quantity: 1, dimensions: dimString,
        source: 'live_configurator', confidence: 1.0, note: 'Aufdach-Markise mit Motor',
      }];
    };

    const makeHeaterItems = (): PackageItem[] => ([{
      name: 'Infrarot-Heizstrahler', category: 'heater', supplier: '-',
      purchaseNetto: 400, quantity: 1,
      source: 'estimated', confidence: 0.5, note: 'Dimmbar & fernsteuerbar — Richtpreis',
    }]);

    // ── Dodatki, o które klient poprosił WPROST → w KAŻDYM pakiecie (od Basis) ──
    const requestedSet = new Set<RequestedExtra>(req.requestedExtras || []);
    if (requestedSet.size > 0) {
      console.log(`\n  🎯 Kunden-Extras (in JEDEM Paket): ${Array.from(requestedSet).join(', ')}`);
    }
    /** Itemy z życzeń klienta, z pominięciem komponentów już zawartych w pakiecie. */
    const makeRequestedExtraItems = (roofSupplier: string, skip: Set<RequestedExtra>): PackageItem[] => {
      const items: PackageItem[] = [];
      for (const extra of requestedSet) {
        if (skip.has(extra)) continue;
        switch (extra) {
          case 'led': items.push(makeLedItem(ledSpots, 'LED Spots')); break;
          case 'zip_sides': items.push(...makeZipSideItems()); break;
          case 'zip_front': items.push(...makeZipFrontItems()); break;
          case 'markise': items.push(...makeMarkiseItems()); break;
          case 'heater': items.push(...makeHeaterItems()); break;
          case 'panorama_front': items.push(...makePanoramaFrontItems()); break;
          case 'panorama_sides': items.push(...makePanoramaSideItems(roofSupplier)); break;
          // panorama_sides dokłada keilfenster automatycznie — nie dublujemy
          case 'keilfenster': if (!requestedSet.has('panorama_sides')) items.push(...makeKeilfensterItems(2, roofSupplier)); break;
        }
      }
      return items;
    };

    if (productCategory === 'pergola') {
      // ══════════════════════════════════════════════════════════════
      // PERGOLA — kandydaci: Aliplast Nuun (live) + MB PRIME / MB ADVANCED.
      //   Basis = NAJTAŃSZA pergola · Empfohlen = model klienta
      //   (pergola_deluxe → lamele przesuwne = MB ADVANCED).
      // ══════════════════════════════════════════════════════════════
      const pergolaQuotes = liveQuotes.filter(q => q.category === 'roof' && q.success && q.price !== null && q.price > 0);
      const cheapestPergola = cheapestRoofOverall(liveQuotes);
      const wantsDeluxe = primaryModelId === 'pergola_deluxe';
      const customerPergola = (wantsDeluxe
        ? pergolaQuotes.find(q => q.product === 'mb_advanced')
        : (pergolaQuotes.find(q => q.product === 'pergola_base') || pergolaQuotes.find(q => q.product === 'mb_prime')))
        || cheapestPergola;
      const samePergola = !!(cheapestPergola && customerPergola
        && cheapestPergola.product === customerPergola.product && cheapestPergola.supplier === customerPergola.supplier);

      if (cheapestPergola && customerPergola) {
        console.log(`\n  🎯 Pergola-Auswahl: Basis=${cheapestPergola.productLabel} (${cheapestPergola.supplier}, ${cheapestPergola.price?.toFixed(0)}€) · Empfohlen=${customerPergola.productLabel} (${customerPergola.supplier}, ${customerPergola.price?.toFixed(0)}€)`);
      }

      const pergolaItem = (q: LiveQuote | null): PackageItem => q ? {
        name: q.productLabel, category: 'roof', supplier: q.supplier,
        purchaseNetto: q.price!, quantity: 1, dimensions: dimString,
        source: q.source, confidence: q.confidence,
        // Aliplast: baza wyceniana JUŻ z napędem Somfy (steeringType w żądaniu);
        // MB PRIME/ADVANCED: motor + LED w cenie cennikowej
        note: q.supplier === 'mb'
          ? 'Bioklimatische Lamellen-Pergola — Motorisierung & LED im Preis enthalten'
          : 'Bioklimatische Lamellen-Pergola — Somfy-Funkmotor im Preis, bei 0° regendicht',
      } : {
        name: 'Pergola-Lamellendach', category: 'roof', supplier: 'aliplast',
        purchaseNetto: 0, quantity: 1, dimensions: dimString,
        source: 'estimated', confidence: 0, missingData: true,
      };

      // LED lameli to opcja Aliplast (baza wyceniana z ledSlats: 0).
      // Somfy NIE doliczamy — silnik jest już w żywej cenie bazowej (steeringType: 'Somfy').
      // MB PRIME/ADVANCED ma LED w cenie.
      const pergolaComfortItems = (roof: LiveQuote | null, led: '4' | '8' | 'none'): PackageItem[] => {
        const items: PackageItem[] = [];
        if (roof && roof.supplier !== 'mb' && led !== 'none') {
          items.push({ name: `LED-Beleuchtung (${led} Lamellen)`, category: 'led', supplier: 'aliplast', purchaseNetto: led === '8' ? 800 : 400, quantity: 1, source: 'estimated', confidence: 0.9, note: led === '8' ? 'Volle Ausleuchtung' : 'Integrierte Beleuchtung' });
        }
        return items;
      };
      // Życzenia klienta (ZIP/Heizung) — w każdym pakiecie; LED obsługiwane per dostawca
      const pergolaRequested = (roof: LiveQuote | null, skip: Set<RequestedExtra>): PackageItem[] => {
        const items: PackageItem[] = [];
        if (requestedSet.has('led') && !skip.has('led') && roof && roof.supplier !== 'mb') {
          items.push({ name: 'LED-Beleuchtung (4 Lamellen)', category: 'led', supplier: 'aliplast', purchaseNetto: 400, quantity: 1, source: 'estimated', confidence: 0.9, note: 'Integrierte Beleuchtung' });
        }
        if (requestedSet.has('zip_sides') && !skip.has('zip_sides')) items.push(...makeZipSideItems());
        if (requestedSet.has('zip_front') && !skip.has('zip_front')) items.push(...makeZipFrontItems());
        if (requestedSet.has('heater') && !skip.has('heater')) items.push(...makeHeaterItems());
        return items;
      };

      // 1. BASIS — najtańsza pergola + tylko życzenia klienta.
      // Pomijamy, gdy = Empfohlen i nie ma czym różnicować (MB ma motor+LED w cenie).
      const basisWouldDiffer = !samePergola || (customerPergola && customerPergola.supplier !== 'mb');
      if (basisWouldDiffer) {
        const items: PackageItem[] = [pergolaItem(cheapestPergola)];
        items.push(...pergolaRequested(cheapestPergola, new Set()));
        const econPkg = buildPackage('economy', 'Basis', 'Günstigste Option',
          `${cheapestPergola?.productLabel || 'Pergola-Lamellendach'} — solides Lamellendach zum niedrigsten Preis.`,
          items);
        econPkg.highlights = buildHighlightsFromItems(econPkg, ['Regulierbare Aluminium-Lamellen', 'Wetterfester Sonnen- & Regenschutz', '10 Jahre Garantie']);
        packages.push(econPkg);
      }

      // 2. EMPFOHLEN ⭐ — model klienta; gdy = Basis → upgrade Somfy + LED
      {
        const items: PackageItem[] = [pergolaItem(customerPergola)];
        if (samePergola) {
          items.push(...pergolaComfortItems(customerPergola, requestedSet.has('led') ? 'none' : '4'));
        }
        items.push(...pergolaRequested(customerPergola, new Set()));
        const recPkg = buildPackage('recommended', 'Empfohlen ⭐', 'Ihr Wunsch-Lamellendach',
          `${customerPergola?.productLabel || 'Pergola-Lamellendach'} — genau wie angefragt${samePergola ? ', mit LED-Beleuchtung in 4 Lamellen' : ''}.`,
          items, '⭐ Empfohlen');
        recPkg.highlights = buildHighlightsFromItems(recPkg, ['Drehbare Lamellen', 'Wohnlicher Komfort auf Knopfdruck', '10 Jahre Garantie']);
        packages.push(recPkg);
      }

      // 3. KOMFORT — Empfohlen + Somfy/LED + ZIP-Seiten (Superset)
      {
        const items: PackageItem[] = [pergolaItem(customerPergola)];
        items.push(...pergolaComfortItems(customerPergola, requestedSet.has('led') ? 'none' : '4'));
        if (!requestedSet.has('zip_sides')) items.push(...makeZipSideItems());
        items.push(...pergolaRequested(customerPergola, new Set()));
        const comfPkg = buildPackage('value', 'Komfort', 'Pergola + Seitenschutz',
          'Lamellen-Pergola mit Funksteuerung, LED-Beleuchtung und ZIP-Screens an den Seiten.',
          items);
        comfPkg.highlights = buildHighlightsFromItems(comfPkg, ['Seitlicher Wind- & Blickschutz', '10 Jahre Garantie']);
        comfPkg.upgradeReason = 'ZIP-Screens an den Seiten schützen Sie vor tiefstehender Sonne, Wind und neugierigen Blicken.';
        packages.push(comfPkg);
      }

      // 4. PREMIUM 👑 — Komfort + ZIP-Front + LED 8 Lamellen (Superset)
      {
        const items: PackageItem[] = [pergolaItem(customerPergola)];
        items.push(...pergolaComfortItems(customerPergola, '8'));
        if (!requestedSet.has('zip_sides')) items.push(...makeZipSideItems());
        if (!requestedSet.has('zip_front')) items.push(...makeZipFrontItems());
        items.push(...pergolaRequested(customerPergola, new Set<RequestedExtra>(['led'])));
        const premPkg = buildPackage('premium', 'Premium 👑', 'Volle Ausstattung',
          'Bioklimatisches Pergola-Lamellendach mit vollem ZIP-Screen-Schutz rundum und erweiterter LED-Beleuchtung.',
          items);
        premPkg.highlights = buildHighlightsFromItems(premPkg, ['Voller Rundum-Sonnen- & Windschutz', 'Premium Smart-Steuerung']);
        premPkg.upgradeReason = '3-seitiger ZIP-Screen-Rundumschutz verwandelt Ihre Pergola in ein windgeschütztes Gartenzimmer.';
        packages.push(premPkg);
      }

    } else if (productCategory === 'carport') {
      // ══════════════════════════════════════════════════════════════
      // CARPORT — drabinka wybierana PO CENIE z deduplikacją:
      //   Basis     = najtańszy wyceniony carport
      //   Empfohlen = najtańszy pasujący do życzenia (wolnostojący/przyścienny)
      //   Komfort   = kolejna alternatywa (inny dostawca/wariant)
      //   Premium   = najdroższy (anchor)
      // ══════════════════════════════════════════════════════════════
      const wantsFree = req.freestanding === true;

      type CarportOption = { key: string; label: string; supplier: string; free: boolean; note: string; price: number };
      const carportOptions: CarportOption[] = [
        { key: 'carport', label: 'Aluminium-Carport mit Wandanschluss', supplier: 'aluxe', free: false, note: 'Wandmontierte Ausführung — pulverbeschichtetes Aluminium', price: prices['carport'] || 0 },
        { key: 'aliplast_carport_wall', label: 'Premium Aluminium-Carport mit Wandanschluss', supplier: 'aliplast', free: false, note: 'Premium-Carport mit verstärkten Profilen', price: prices['aliplast_carport_wall'] || 0 },
        { key: 'mb_carport', label: 'Carport Freistehend (Trapezblech-Dach)', supplier: 'mb', free: true, note: 'Freistehende Ausführung — Trapezblech mit Antikondensat-Vlies, Pfosten im Preis', price: prices['mb_carport'] || 0 },
        { key: 'carport_frei', label: 'Aluminium-Carport Freistehend', supplier: 'aluxe', free: true, note: 'Freistehender Carport — flexibel platzierbar', price: prices['carport_frei'] || 0 },
        { key: 'aliplast_carport_free', label: 'Premium Aluminium-Carport Freistehend', supplier: 'aliplast', free: true, note: 'Premium freistehender Carport — Spitzenklasse', price: prices['aliplast_carport_free'] || 0 },
      ].filter(c => c.price > 0).sort((a, b) => a.price - b.price);

      // Standard carport inclusions (added to every package)
      const carportIncludes: PackageItem[] = [
        { name: 'Integrierte Dachrinne & Entwässerung', category: 'montage', supplier: '-', purchaseNetto: 0, quantity: 1, source: 'included', confidence: 1.0, note: 'Regen wird kontrolliert abgeleitet' },
        { name: 'Statikberechnung nach DIN EN 1991', category: 'montage', supplier: '-', purchaseNetto: 0, quantity: 1, source: 'included', confidence: 1.0, note: 'Schneelast- und Windlastberechnung' },
        { name: 'Lieferung frei Haus', category: 'montage', supplier: '-', purchaseNetto: 0, quantity: 1, source: 'included', confidence: 1.0, note: 'Europaweit inkl. Transport' },
      ];

      const carportItem = (c: CarportOption | undefined): PackageItem => c ? {
        name: c.label, category: 'roof', supplier: c.supplier,
        purchaseNetto: c.price, quantity: 1, dimensions: dimString,
        source: c.supplier === 'mb' ? 'calculator' : 'live_configurator',
        confidence: c.supplier === 'mb' ? 0.95 : 1.0, note: c.note,
      } : {
        name: 'Aluminium-Carport', category: 'roof', supplier: 'aluxe',
        purchaseNetto: 0, quantity: 1, source: 'estimated', confidence: 0, missingData: true,
      };

      const basisCp = carportOptions[0];
      const matchingWish = carportOptions.filter(c => c.free === wantsFree);
      const recCp = matchingWish[0] || carportOptions[0];
      const comfCp = carportOptions.find(c => c.key !== basisCp?.key && c.key !== recCp?.key && c.free === wantsFree)
        || carportOptions.find(c => c.key !== basisCp?.key && c.key !== recCp?.key);
      const premCp = [...carportOptions].reverse().find(c => c.key !== basisCp?.key && c.key !== recCp?.key && c.key !== comfCp?.key);

      console.log(`\n  🎯 Carport-Auswahl (Wunsch: ${wantsFree ? 'freistehend' : 'Wandmontage'}): ${carportOptions.map(c => `${c.label}=${c.price.toFixed(0)}€`).join(' · ') || 'keine Preise'}`);

      // 1. BASIS — najtańszy carport (pomijamy, jeśli identyczny z Empfohlen)
      if (basisCp && basisCp.key !== recCp?.key) {
        const items = [carportItem(basisCp), ...carportIncludes];
        const econPkg = buildPackage('economy', 'Basis Carport', 'Günstigste Option',
          `${basisCp.label} — bewährter Schutz für Ihr Fahrzeug zum niedrigsten Preis.`, items);
        econPkg.highlights = [basisCp.free ? 'Freistehende Ausführung' : 'Wandmontierte Ausführung', 'Robuste Aluminium-Konstruktion', 'Integrierte Dachrinne & Entwässerung', 'Pulverbeschichtet in Wunschfarbe'];
        packages.push(econPkg);
      }

      // 2. EMPFOHLEN ⭐ — wariant zgodny z życzeniem klienta
      {
        const items = [carportItem(recCp), ...carportIncludes];
        const recPkg = buildPackage('recommended', 'Empfohlen ⭐', wantsFree ? 'Freistehend — wie gewünscht' : 'Wandmontage — wie gewünscht',
          `${recCp?.label || 'Aluminium-Carport'} — genau die Bauform, die Sie angefragt haben.`, items, '⭐ Empfohlen');
        recPkg.highlights = [recCp?.free ? 'Freistehend — flexibel platzierbar' : 'Wandmontage — platzsparend', 'Robuste Aluminium-Konstruktion', 'Integrierte Dachrinne & Entwässerung', 'Statik nach DIN EN 1991'];
        packages.push(recPkg);
      }

      // 3. KOMFORT — alternatywny wariant/dostawca
      if (comfCp) {
        const items = [carportItem(comfCp), ...carportIncludes];
        const comfPkg = buildPackage('value', 'Komfort Carport', comfCp.free ? 'Freistehend' : 'Wandmontage',
          `${comfCp.label} — hochwertige Alternative${comfCp.supplier === 'aliplast' ? ' mit verstärkten Profilen' : ''}.`, items);
        comfPkg.highlights = [comfCp.free ? 'Freistehende Ausführung' : 'Wandmontierte Ausführung', comfCp.supplier === 'aliplast' ? 'Premium-Profilstärke' : 'Bewährte Markenqualität', 'Integrierte Dachrinne & Entwässerung', 'Pulverbeschichtet in Wunschfarbe'];
        comfPkg.upgradeReason = 'Hochwertigere Profile und Ausstattung für anspruchsvollere Standorte.';
        packages.push(comfPkg);
      }

      // 4. PREMIUM 👑 — najdroższy wariant (anchor)
      if (premCp) {
        const items = [carportItem(premCp), ...carportIncludes];
        const premPkg = buildPackage('premium', 'Premium Carport 👑', premCp.free ? 'Freistehend Premium' : 'Wandmontage Premium',
          `${premCp.label} — die absolute Spitzenklasse für Langlebigkeit und Ästhetik.`, items);
        premPkg.highlights = [premCp.free ? 'Freistehende Premium-Ausführung' : 'Premium-Wandmontage', 'Höchste statische Stabilität', 'Besonders elegante Profilstrukturen', 'Premium-Beschichtung'];
        premPkg.upgradeReason = 'Die Premium-Version vereint edles Design mit höchster Profilstärke für extreme Wetterbedingungen.';
        packages.push(premPkg);
      }

    } else if (isFlatRoof) {
      // ══════════════════════════════════════════════════════════════
      // FLAT ROOF PACKAGES — kandydaci ze WSZYSTKICH quote'ów
      // (Aluxe Skystyle/Ultrastyle + MB CUBE/CUBE GRAND). Schemat:
      // Basis = najtańszy · Empfohlen = model klienta · Komfort/Premium = upgrade.
      // Kein Teranda, keine Keilfenster (Flachdach).
      // ══════════════════════════════════════════════════════════════
      const flatQuotes = liveQuotes
        .filter(q => q.category === 'roof' && q.success && q.price !== null && q.price > 0);
      const cheapestFlat = cheapestRoofOverall(liveQuotes);
      const wantsUltra = primaryModelId === 'ultrastyle' || primaryModelId === 'ultrastyle_classic' || primaryModelId === 'ultraline';
      const customerFlat = (wantsUltra
        ? flatQuotes.find(q => q.product === 'ultrastyle_classic')
        : flatQuotes.filter(q => q.product.includes('sky') || q.product.includes('cube'))
            .reduce((a: LiveQuote | null, b) => (!a || b.price! < a.price!) ? b : a, null))
        || cheapestFlat;
      // Premium: najdroższy wyceniony model płaski (anchor)
      const premierFlat = flatQuotes.length > 0
        ? flatQuotes.reduce((a, b) => (a.price! >= b.price!) ? a : b)
        : null;
      const flatExtrasSupplier = customerFlat?.supplier || 'aluxe';
      const sameFlat = !!(cheapestFlat && customerFlat
        && cheapestFlat.product === customerFlat.product && cheapestFlat.supplier === customerFlat.supplier);

      // 1. BASIS — najtańsze Flachdach + tylko życzenia klienta
      {
        const items: PackageItem[] = [];
        if (cheapestFlat) items.push(makeItem(cheapestFlat, 'roof', dimString));
        items.push(...makeRequestedExtraItems(flatExtrasSupplier, new Set()));
        const econPkg = buildPackage('economy', 'Basis Flachdach', 'Günstigste Option',
          `${cheapestFlat?.productLabel || 'Flachdach'} — modernes Flachdach-Design zum niedrigsten Preis.`, items);
        econPkg.highlights = buildHighlightsFromItems(econPkg, ['Modernes Flachdach-Design', 'Integrierte Entwässerung', '10 Jahre Garantie']);
        packages.push(econPkg);
      }

      // 2. EMPFOHLEN ⭐ — Wunschmodell des Kunden + seine Extras
      {
        const items: PackageItem[] = [];
        if (customerFlat) items.push(makeItem(customerFlat, 'roof', dimString));
        if (sameFlat && !requestedSet.has('led')) items.push(makeLedItem(ledSpots, 'LED Spots'));
        items.push(...makeRequestedExtraItems(flatExtrasSupplier, new Set()));
        const recPkg = buildPackage('recommended', 'Empfohlen ⭐', 'Ihr Wunsch-Flachdach',
          `${customerFlat?.productLabel || 'Flachdach'} — genau wie angefragt, die beste Wahl für Ihr Projekt.`, items, '⭐ Empfohlen');
        recPkg.highlights = buildHighlightsFromItems(recPkg, ['Flachdach wie gewünscht', 'Integrierte Entwässerung', 'RAL-Farbe nach Wunsch']);
        packages.push(recPkg);
      }

      // 3. KOMFORT — Empfohlen + ZIP-Seiten + LED (Superset)
      {
        const items: PackageItem[] = [];
        if (customerFlat) items.push(makeItem(customerFlat, 'roof', dimString));
        if (!requestedSet.has('zip_sides')) items.push(...makeZipSideItems());
        if (!requestedSet.has('led')) items.push(makeLedItem(ledSpots, 'LED Spots'));
        items.push(...makeRequestedExtraItems(flatExtrasSupplier, new Set()));
        const comfPkg = buildPackage('value', 'Komfort Flachdach', 'Flachdach + Seitenschutz + Licht',
          `${customerFlat?.productLabel || 'Flachdach'} mit Senkrechtmarkisen an den Seiten und LED-Beleuchtung.`, items);
        comfPkg.highlights = buildHighlightsFromItems(comfPkg, ['Windstabiler Seitenschutz', '10 Jahre Garantie']);
        comfPkg.upgradeReason = 'Senkrechtmarkisen schützen vor Sonne, Wind und Blicken — LED macht die Terrasse abends nutzbar.';
        packages.push(comfPkg);
      }

      // 4. PREMIUM 👑 — najdroższe Flachdach + Panorama rundum + ZIP + LED Komplett
      {
        const items: PackageItem[] = [];
        const premRoof = premierFlat || customerFlat;
        if (premRoof) items.push(makeItem(premRoof, 'roof', dimString));
        if (!requestedSet.has('zip_sides')) items.push(...makeZipSideItems());
        if (!requestedSet.has('zip_front')) items.push(...makeZipFrontItems());
        if (!requestedSet.has('panorama_front')) items.push(...makePanoramaFrontItems());
        if (!requestedSet.has('panorama_sides')) items.push(...makePanoramaSideItems(premRoof?.supplier || 'aluxe'));
        items.push(makeLedItem(ledFull, 'LED Komplett (Spots + Stripes + Somfy)'));
        items.push(...makeRequestedExtraItems(flatExtrasSupplier, new Set<RequestedExtra>(['led', 'keilfenster'])));
        const premPkg = buildPackage('premium', 'Premium Flachdach 👑', 'Wintergarten-Feeling — volle Ausstattung',
          `${premRoof?.productLabel || 'Flachdach'} mit Panorama rundum, komplettem Sonnenschutz und Smart-LED — Ihr Outdoor-Wohnzimmer.`, items);
        premPkg.highlights = buildHighlightsFromItems(premPkg, ['Somfy Smart-Steuerung', 'Kompletter Rundumschutz']);
        premPkg.upgradeReason = 'Panorama-Schiebewände rundum verwandeln Ihre Terrasse in einen lichtdurchfluteten Wintergarten.';
        packages.push(premPkg);
      }

    } else {
      // ══════════════════════════════════════════════════════════════
      // SMART SUPPLIER DISTRIBUTION — Teranda vs Aluxe side-by-side
      // When wantsWintergarten: ALL packages include panorama glass walls
      // ══════════════════════════════════════════════════════════════
      const isWintergarten = req.wantsWintergarten === true;
      if (isWintergarten) {
        console.log(`\n  🏠 WINTERGARTEN-Modus: Alle Pakete mit Panorama-Schiebewänden`);
      }
      
      // Find cheapest mid-tier roof for recommended
      const cheapestMid = findBestRoof(prices, liveQuotes, 'mid', customerCover)
        || findBestRoof(prices, liveQuotes, 'mid');
      
      // Find ALTERNATIVE mid-tier from different supplier for Komfort
      const altMidSupplier = cheapestMid?.supplier;
      const alternativeMid = altMidSupplier 
        ? (findBestRoof(prices, liveQuotes, 'mid', 'glas', altMidSupplier)
          || findBestRoof(prices, liveQuotes, 'mid', customerCover, altMidSupplier)
          || findBestRoof(prices, liveQuotes, 'mid', undefined, altMidSupplier))
        : null;
      
      // Log supplier distribution
      if (cheapestMid && alternativeMid) {
        console.log(`\n  📊 Supplier-Verteilung:`);
        console.log(`     Empfohlen: ${cheapestMid.productLabel} (${cheapestMid.supplier}) — ${cheapestMid.price?.toFixed(0)}€`);
        console.log(`     Komfort:   ${alternativeMid.productLabel} (${alternativeMid.supplier}) — ${alternativeMid.price?.toFixed(0)}€`);
      }
      
      if (isWintergarten) {
        // ══════════════════════════════════════════════════════════
        // WINTERGARTEN PACKAGES — Dach + Panorama-Schiebewände AL23
        // ══════════════════════════════════════════════════════════
        
        // ── PKG 1: ECONOMY — Dach + Panorama Front ──
        {
          const items: PackageItem[] = [];
          const econRoof = findBestRoof(prices, liveQuotes, 'economy', customerCover)
            || findBestRoof(prices, liveQuotes, 'mid', customerCover)
            || findBestRoof(prices, liveQuotes, 'economy')
            || findBestRoof(prices, liveQuotes, 'mid');
          if (econRoof) items.push(makeItem(econRoof, 'roof', dimString));
          items.push(...makePanoramaFrontItems());
          items.push(makeLedItem(ledSpots, 'LED Spots'));
          
          const econPkg = buildPackage('economy', 'Wintergarten Basis', 'Dach + Front-Verglasung',
            `${econRoof?.productLabel || 'Glasdach'} mit Panorama-Schiebewand an der Front — Ihr Einstieg in den Wintergarten.`,
            items);
          econPkg.highlights = buildHighlightsFromItems(econPkg, ['RAL-Farbe nach Wunsch', '10 Jahre Garantie']);
          packages.push(econPkg);
        }
        
        // ── PKG 2: EMPFOHLEN ⭐ — Dach + Panorama Front + 2× Seiten ──
        {
          const items: PackageItem[] = [];
          const recRoof = cheapestMid
            || findBestRoof(prices, liveQuotes, 'mid', 'glas')
            || findBestRoof(prices, liveQuotes, 'economy', 'glas')
            || cheapestRoofOverall(liveQuotes, 'glas')
            || cheapestRoofOverall(liveQuotes);
          if (recRoof) items.push(makeItem(recRoof, 'roof', dimString));
          items.push(...makePanoramaFrontItems());
          const currentSupplier = recRoof?.supplier || 'aluxe';
          items.push(...makePanoramaSideItems(currentSupplier));
          items.push(makeLedItem(ledSpots, 'LED Spots'));
          
          const recPkg = buildPackage('recommended', 'Wintergarten Empfohlen ⭐', 'Rundum-Verglasung',
            `${recRoof?.productLabel || 'Glasdach'} mit Panorama-Schiebewänden rundum — Ihr Kaltwintergarten.`,
            items, '⭐ Empfohlen');
          recPkg.highlights = buildHighlightsFromItems(recPkg, ['Rundum verglast', '10 Jahre Garantie']);
          packages.push(recPkg);
        }
        
        // ── PKG 3: KOMFORT — Alt-Supplier Dach + Panorama rundum + LED ──
        {
          const items: PackageItem[] = [];
          const comfRoof = alternativeMid 
            || findBestRoof(prices, liveQuotes, 'mid', 'glas')
            || findBestRoof(prices, liveQuotes, 'mid');
          if (comfRoof) items.push(makeItem(comfRoof, 'roof', dimString));
          items.push(...makePanoramaFrontItems());
          const currentSupplier = comfRoof?.supplier || 'aluxe';
          items.push(...makePanoramaSideItems(currentSupplier));
          items.push(...makeZipSideItems()); // Extra: Zip for shading
          items.push(makeLedItem(ledSpots, 'LED Spots'));
          
          const comfPkg = buildPackage('value', 'Wintergarten Komfort', 'Verglasung + Sonnenschutz',
            `${comfRoof?.productLabel || 'Glasdach'} mit Panorama-Schiebewänden und zusätzlichem Sonnenschutz.`,
            items);
          comfPkg.highlights = buildHighlightsFromItems(comfPkg, ['Sonnenschutz inklusive', '10 Jahre Garantie']);
          comfPkg.upgradeReason = 'ZIP-Screens schützen vor direkter Sonneneinstrahlung — angenehmes Klima im Wintergarten.';
          packages.push(comfPkg);
        }
        
        // ── PKG 4: PREMIUM 👑 — Premium Dach + Panorama rundum + Full LED ──
        {
          const items: PackageItem[] = [];
          const premRoof = findBestRoof(prices, liveQuotes, 'mid_premium', 'glas')
            || findBestRoof(prices, liveQuotes, 'premium', 'glas')
            || findBestRoof(prices, liveQuotes, 'premium')
            || findBestRoof(prices, liveQuotes, 'mid', 'glas');
          if (premRoof) items.push(makeItem(premRoof, 'roof', dimString));
          items.push(...makePanoramaFrontItems());
          const currentSupplier = premRoof?.supplier || 'aluxe';
          items.push(...makePanoramaSideItems(currentSupplier));
          items.push(makeLedItem(ledFull, 'LED Komplett (Spots + Stripes + Somfy)'));
          
          const premPkg = buildPackage('premium', 'Wintergarten Premium 👑', 'Luxus-Wintergarten',
            'Premium-Glasdach mit Panorama-Schiebewänden rundum und Smart-LED — Ihr Outdoor-Wohnzimmer.',
            items);
          premPkg.highlights = buildHighlightsFromItems(premPkg, ['LED Premium mit Somfy Smart', '10 Jahre Garantie']);
          premPkg.upgradeReason = 'Premium-Verglasung mit Smart-Beleuchtung — der ultimative Wintergarten.';
          packages.push(premPkg);
        }
        
      } else {
        // ══════════════════════════════════════════════════════════
        // STANDARD PACKAGES — Verkaufsschema:
        //   Basis     = absolut GÜNSTIGSTES Dach aller Live-Quotes (Preisanker)
        //   Empfohlen = EXAKT Modell + Eindeckung + Extras des Kunden
        //   Komfort   = Empfohlen + ZIP-Seiten + LED            (Superset)
        //   Premium   = Komfort + Panorama rundum + Keilfenster
        //               + ZIP-Front + LED Komplett               (Superset)
        // Extras, o które klient prosił wprost, są w KAŻDYM pakiecie.
        // ══════════════════════════════════════════════════════════

        // -- Dach "dokładnie jak klient chce" --
        // NAJPIERW dopasowanie po RODZINIE MODELU (Trendstyle/Topstyle/Designstyle...),
        // dopiero potem fallback po tierze — wczesniej tier-only matching potrafil
        // podstawic INNY model z tej samej polki cenowej.
        const customerModelTier = primaryModelId.includes('orange') ? 'economy'
          : primaryModelId.includes('top') ? 'mid_premium'
          : primaryModelId.includes('design') ? 'premium'
          : primaryModelId.includes('ultra') || primaryModelId.includes('sky') ? 'premium'
          : 'mid'; // default = trendstyle
        const customerRoof = findRoofByModel(liveQuotes, primaryModelId || 'trendstyle', customerCover)
          || findRoofByModel(liveQuotes, primaryModelId || 'trendstyle')
          || findBestRoof(prices, liveQuotes, customerModelTier, customerCover)
          || findBestRoof(prices, liveQuotes, customerModelTier)
          || cheapestMid
          || cheapestRoofOverall(liveQuotes);

        // -- Dach "najtańszy z możliwych" (kotwica cenowa) --
        // Jawne życzenie pokrycia ogranicza też Basis (Glas-Wunsch → günstigstes Glas).
        const basisCover = customerSpecifiedGlass ? 'glas' : customerSpecifiedPoly ? 'poly' : undefined;
        const basisRoof = cheapestRoofOverall(liveQuotes, basisCover)
          || cheapestRoofOverall(liveQuotes)
          || customerRoof;

        const roofSupplier = customerRoof?.supplier || 'aluxe';
        // Extras klienta liczone wg JEDNEGO dostawcy referencyjnego (dach Empfohlen)
        // we WSZYSTKICH pakietach — inaczej np. keilfenster pojawiałby się w Basis
        // (dach Aluxe), a znikał w Empfohlen (dach Teranda) → inwersja cen.
        const extrasSupplier = roofSupplier;
        const sameRoof = !!(basisRoof && customerRoof
          && basisRoof.product === customerRoof.product && basisRoof.supplier === customerRoof.supplier);

        if (customerRoof && basisRoof) {
          console.log(`\n  🎯 Dach-Auswahl:`);
          console.log(`     Basis (günstigste): ${basisRoof.productLabel} (${basisRoof.supplier}) — ${basisRoof.price?.toFixed(0)}€ EK`);
          console.log(`     Empfohlen (Wunsch): ${customerRoof.productLabel} (${customerRoof.supplier}) — ${customerRoof.price?.toFixed(0)}€ EK${sameRoof ? ' (= Basis → Upgrade-Differenzierung)' : ''}`);
        }

        // ── PACKAGE 1: BASIS — günstigstes Dach + NUR Kunden-Extras (kein LED-Zwang) ──
        {
          const items: PackageItem[] = [];
          if (basisRoof) items.push(makeItem(basisRoof, 'roof', dimString));
          items.push(...makeRequestedExtraItems(extrasSupplier, new Set()));

          const coverLabel = basisRoof?.coverType === 'glas' ? 'VSG-Glas' : 'Polycarbonat';
          const econPkg = buildPackage('economy', 'Basis', 'Günstigste Option',
            `${basisRoof?.productLabel || 'Terrassendach'} — solide Markenqualität zum niedrigsten Preis.`,
            items);
          econPkg.highlights = buildHighlightsFromItems(econPkg, [`${coverLabel}-Dach`, 'Statik & Entwässerung inklusive', '10 Jahre Garantie']);
          packages.push(econPkg);
        }

        // ── PACKAGE 2: EMPFOHLEN ⭐ — exakt das Wunsch-Dach des Kunden + seine Extras ──
        {
          const items: PackageItem[] = [];
          let recRoof = customerRoof;
          const recUpgradeItems: PackageItem[] = [];
          if (sameRoof) {
            // Kunde wünscht genau das günstigste Dach → Empfohlen differenziert sich
            // durch EIN Upgrade mit größtem Wert (spec §1): poly→VSG-Glas, sonst LED.
            const glasUpgrade = !customerSpecifiedPoly
              ? (findRoofByModel(liveQuotes, primaryModelId || 'trendstyle', 'glas')
                 || findBestRoof(prices, liveQuotes, customerModelTier, 'glas')) : null;
            if (glasUpgrade && glasUpgrade.product !== customerRoof?.product) {
              recRoof = glasUpgrade;
            } else if (!requestedSet.has('led')) {
              recUpgradeItems.push(makeLedItem(ledSpots, 'LED Spots'));
            }
          }
          if (recRoof) items.push(makeItem(recRoof, 'roof', dimString));
          items.push(...recUpgradeItems);
          items.push(...makeRequestedExtraItems(extrasSupplier, new Set()));

          const recPkg = buildPackage('recommended', 'Empfohlen ⭐', 'Ihr Wunsch-Terrassendach',
            `${recRoof?.productLabel || 'Terrassendach'} — genau wie angefragt, die beste Wahl für Ihr Projekt.`,
            items, '⭐ Empfohlen');
          recPkg.highlights = buildHighlightsFromItems(recPkg, ['Genau Ihre Konfiguration', 'RAL-Farbe nach Wunsch', '10 Jahre Garantie']);
          packages.push(recPkg);
        }

        // ── PACKAGE 3: KOMFORT — Empfohlen + ZIP-Seiten + LED (echtes Superset) ──
        {
          const items: PackageItem[] = [];
          const comfRoof = customerRoof;
          if (comfRoof) items.push(makeItem(comfRoof, 'roof', dimString));
          if (!requestedSet.has('zip_sides')) items.push(...makeZipSideItems());
          if (!requestedSet.has('led')) items.push(makeLedItem(ledSpots, 'LED Spots'));
          items.push(...makeRequestedExtraItems(extrasSupplier, new Set()));

          const comfPkg = buildPackage('value', 'Komfort', 'Dach + Seitenschutz + Licht',
            `${comfRoof?.productLabel || 'Terrassendach'} mit Senkrechtmarkisen an den Seiten und LED-Beleuchtung — mehr Schutz, mehr Nutzung.`,
            items);
          comfPkg.highlights = buildHighlightsFromItems(comfPkg, ['Windstabiler Seitenschutz', '10 Jahre Garantie']);
          comfPkg.upgradeReason = 'Senkrechtmarkisen schützen vor tiefstehender Sonne, Wind und Blicken — LED macht die Terrasse abends nutzbar.';
          packages.push(comfPkg);
        }

        // ── PACKAGE 4: PREMIUM 👑 — Komfort + Panorama rundum + Keilfenster + ZIP-Front + LED max ──
        {
          const items: PackageItem[] = [];
          // Glas-Version des Wunschmodells (sofern Kunde nicht explizit Poly verlangt hat)
          const premRoof = (customerSpecifiedPoly ? customerRoof
            : (findRoofByModel(liveQuotes, primaryModelId || 'trendstyle', 'glas')
               || findBestRoof(prices, liveQuotes, customerModelTier, 'glas')
               || customerRoof))
            || findBestRoof(prices, liveQuotes, 'mid', 'glas');
          if (premRoof) items.push(makeItem(premRoof, 'roof', dimString));
          const premSupplier = premRoof?.supplier || 'aluxe';
          if (!requestedSet.has('zip_sides')) items.push(...makeZipSideItems());
          if (!requestedSet.has('zip_front')) items.push(...makeZipFrontItems());
          if (!requestedSet.has('panorama_front')) items.push(...makePanoramaFrontItems());
          const premPanoSides = requestedSet.has('panorama_sides') ? [] : makePanoramaSideItems(premSupplier);
          items.push(...premPanoSides);
          items.push(makeLedItem(ledFull, 'LED Komplett (Spots + Stripes + Somfy)'));
          // 'led' i 'keilfenster' nie dublujemy: LED max już jest, keil przychodzi z panoramą boczną
          const premSkip = new Set<RequestedExtra>(['led']);
          if (premPanoSides.some(i => i.category === 'keilfenster')) premSkip.add('keilfenster');
          items.push(...makeRequestedExtraItems(extrasSupplier, premSkip));

          const premPkg = buildPackage('premium', 'Premium 👑', 'Wintergarten-Feeling — volle Ausstattung',
            'Glasdach mit Panorama-Schiebewänden rundum, komplettem Sonnenschutz und Smart-LED — Ihr Outdoor-Wohnzimmer.',
            items);
          premPkg.highlights = buildHighlightsFromItems(premPkg, ['Somfy Smart-Steuerung', '10 Jahre Garantie']);
          premPkg.upgradeReason = 'Panorama-Schiebewände + Rundum-Sonnenschutz verwandeln die Terrasse in einen ganzjährig nutzbaren Wintergarten.';
          packages.push(premPkg);
        }
      }
    }
    
    // ══════════════════════════════════════════════════════════════
    // 6b. DEDUPE — identyczne pakiety (np. życzenia klienta zrównały
    // Basis z Empfohlen albo Komfort z Empfohlen) nie mogą wisieć jako
    // dwie karty z tą samą ceną. Zwycięzca kolizji: recommended > premium > value > economy.
    // ══════════════════════════════════════════════════════════════
    {
      const priority: Record<string, number> = { recommended: 3, premium: 2, value: 1, economy: 0 };
      const sig = (p: OfferPackage) => p.items.filter(i => !i.missingData)
        .map(i => `${i.name}|${i.quantity}|${Math.round(i.purchaseNetto)}`).sort().join('//');
      const winnerBySig = new Map<string, OfferPackage>();
      for (const p of packages) {
        const k = sig(p);
        const existing = winnerBySig.get(k);
        if (!existing || (priority[p.id] ?? 0) > (priority[existing.id] ?? 0)) winnerBySig.set(k, p);
      }
      if (winnerBySig.size < packages.length) {
        const keep = new Set(winnerBySig.values());
        const removed = packages.filter(p => !keep.has(p)).map(p => p.nameDE);
        console.log(`  ♻️ Dedupe: usunięto identyczne pakiety: ${removed.join(', ')}`);
        const next = packages.filter(p => keep.has(p));
        packages.length = 0;
        packages.push(...next);
      }
    }

    // ══════════════════════════════════════════════════════════════
    // 7. CROSS-SELL
    // ══════════════════════════════════════════════════════════════
    const crossSell: CrossSellItem[] = [];

    // Markizy NAD i POD dachem — pomijamy, gdy klient o markize prosil (jest w pakietach)
    if (prices['markise_aufdach'] && !requestedSet.has('markise')) {
      const cs = calculateOfferPrice({ lineItems: [{ name: 'Markise', aluxeNetPrice: prices['markise_aufdach'], quantity: 1 }], skipMinimumMargin: true, transportAluxe: 0 });
      crossSell.push({
        name: 'markise', nameDE: 'Aufdach-Markise (ZIP)',
        category: 'markise', supplier: 'aluxe',
        purchaseNetto: prices['markise_aufdach'], customerBrutto: cs.customerGrossPrice,
        dimensions: dimString,
        description: 'Sonnenschutz AUF dem Dach — hält die Hitze ab, bevor sie unter das Dach kommt',
        icon: '☀️', confidence: 1.0, source: 'live_configurator',
      });
    }
    if (prices['markise_unterdach'] && !requestedSet.has('markise')) {
      const cs = calculateOfferPrice({ lineItems: [{ name: 'Markise', aluxeNetPrice: prices['markise_unterdach'], quantity: 1 }], skipMinimumMargin: true, transportAluxe: 0 });
      crossSell.push({
        name: 'markise_unterdach', nameDE: 'Unterdach-Markise (ZIP)',
        category: 'markise', supplier: 'aluxe',
        purchaseNetto: prices['markise_unterdach'], customerBrutto: cs.customerGrossPrice,
        dimensions: dimString,
        description: 'Sonnenschutz UNTER dem Dach — stufenlos regulierbarer Schatten auf der Terrasse',
        icon: '⛱️', confidence: 1.0, source: 'live_configurator',
      });
    }
    
    // Panorama side (najtańszy dostawca) — pomijamy gdy już w pakietach (życzenie/Wintergarten)
    const panoSideBest = cheapestPanorama('side');
    if (panoSideBest && !requestedSet.has('panorama_sides') && req.wantsWintergarten !== true) {
      const cs = calculateOfferPrice({ lineItems: [{ name: 'Panorama', aluxeNetPrice: panoSideBest.price, quantity: 1 }], skipMinimumMargin: true, transportAluxe: 0 });
      crossSell.push({
        name: 'panorama_side', nameDE: 'Panorama Schiebewand — Seite',
        category: 'panorama', supplier: panoSideBest.supplier,
        purchaseNetto: panoSideBest.price, customerBrutto: cs.customerGrossPrice,
        dimensions: `${req.depth}×2200mm`,
        description: 'Glas-Schiebewand für die Seite',
        icon: '🪟', confidence: panoSideBest.confidence, source: panoSideBest.supplier === 'mb' ? 'calculator' : 'live_configurator',
      });
    }
    
    // ZIP Screen front — pomijamy, gdy klient o niego prosił
    const zipFront = cheapestZip('front');
    if (zipFront && !requestedSet.has('zip_front')) {
      const cs = calculateOfferPrice({ lineItems: [{ name: 'ZIP', aluxeNetPrice: zipFront.price, quantity: 1 }], skipMinimumMargin: true, transportAluxe: 0 });
      crossSell.push({
        name: 'zip_front', nameDE: `Senkrechtmarkise — Front`,
        category: 'senkrechtmarkise', supplier: zipFront.supplier,
        purchaseNetto: zipFront.price, customerBrutto: cs.customerGrossPrice,
        dimensions: `${req.width}×${req.height || 2500}mm`,
        description: 'Wind- und Sonnenschutz vorne — windstabile Senkrechtmarkise mit Motor',
        icon: '🔽', confidence: zipFront.confidence, source: zipFront.confidence === 1 ? 'live_configurator' : 'estimated',
      });
    }
    
    // Additional roof upgrades (show alternatives not in packages).
    // Carport pomijamy — drabinka pakietów już pokazuje wszystkie warianty,
    // a etykiety pakietów ≠ etykiety quote'ów (dedupe po nazwie nie działa).
    const allRoofs = productCategory === 'carport' ? []
      : liveQuotes.filter(q => q.category === 'roof' && q.success && q.price);
    for (const roof of allRoofs) {
      const inPackage = packages.some(p => p.items.some(i => i.name === roof.productLabel));
      if (!inPackage && roof.price) {
        const cs = calculateOfferPrice({ lineItems: [{ name: roof.productLabel, aluxeNetPrice: roof.price, quantity: 1 }], skipMinimumMargin: true, transportAluxe: 0 });
        crossSell.push({
          name: roof.product, nameDE: `Upgrade: ${roof.productLabel}`,
          category: 'roof_upgrade', supplier: roof.supplier,
          purchaseNetto: roof.price, customerBrutto: cs.customerGrossPrice,
          dimensions: dimString,
          description: `Dach-Upgrade auf ${roof.productLabel}`,
          icon: '🏠', confidence: roof.confidence, source: roof.source,
        });
      }
    }
    
    // ── Fixed Richtpreis extras (spec §3) — always offered, no live query needed ──
    if (productCategory === 'roof' || productCategory === 'pergola') {
      if (!requestedSet.has('heater')) crossSell.push({
        name: 'heizstrahler', nameDE: 'Infrarot-Heizstrahler',
        category: 'heater', supplier: '-',
        purchaseNetto: 0, customerBrutto: 690,
        description: 'Dimmbar & fernsteuerbar — verlängert die Terrassensaison bis in den Winter',
        icon: '🔥', confidence: 0.5, source: 'estimated',
      });
      const areaM2 = (req.width / 1000) * (req.depth / 1000);
      crossSell.push({
        name: 'wpc_boden', nameDE: 'WPC-Terrassenboden',
        category: 'boden', supplier: '-',
        purchaseNetto: 0, customerBrutto: Math.round(areaM2 * 95 / 10) * 10,
        dimensions: `${areaM2.toFixed(1)} m²`,
        description: 'Holzoptik, rutschfest und splitterfrei — passend zu Ihrer Überdachung (ab 95 €/m²)',
        icon: '🪵', confidence: 0.5, source: 'estimated',
      });
    }
    crossSell.push({
      name: 'sonderfarbe', nameDE: 'Sonderfarbe (jede RAL)',
      category: 'farbe', supplier: '-',
      purchaseNetto: 0, customerBrutto: 350,
      description: 'Jede RAL-Farbe möglich. Ohne Aufpreis: 7016 Anthrazit, 9016 Weiß, 9005 Schwarz, DB 703',
      icon: '🎨', confidence: 0.5, source: 'estimated',
    });

    // ══════════════════════════════════════════════════════════════
    // 7b. ATTACH STRUCTURAL DETAILS to each package
    // ══════════════════════════════════════════════════════════════
    const isFreestanding = req.freestanding || false;
    const postHeight = req.height || 2500;
    for (const pkg of packages) {
      const roofItem = pkg.items.find(i => i.category === 'roof');
      const roofLabel = roofItem?.name || pkg.nameDE || '';
      pkg.structuralDetails = buildStructuralDetails(
        req.width, req.depth, postHeight,
        productCategory, isFreestanding, roofLabel,
      );
    }

    // ══════════════════════════════════════════════════════════════
    // 8. SUMMARY
    // ══════════════════════════════════════════════════════════════
    console.log('\n' + '─'.repeat(70));
    console.log('  📋 ANGEBOTS-ZUSAMMENFASSUNG');
    console.log('─'.repeat(70));
    console.log(`  Kunde: ${req.customerName} | Maße: ${dimString}`);
    console.log(`  Lieferanten: ${suppliersSuccessful.join(', ')} ✅  ${suppliersFailed.length > 0 ? `| ❌ ${suppliersFailed.join(', ')}` : ''}`);
    console.log(`  Live-Abfragen: ${liveQuotes.filter(q => q.success).length}/${liveQuotes.length}\n`);
    
    for (const pkg of packages) {
      const miss = pkg.hasMissingPrices ? ' ⚠️' : '';
      console.log(`  ${pkg.id.toUpperCase().padEnd(12)} ${pkg.nameDE.padEnd(20)} ${pkg.customerBrutto.toFixed(0).padStart(8)}€ brutto | EK: ${pkg.purchaseNetto.toFixed(0).padStart(6)}€ | Marge: ${pkg.marginAmount.toFixed(0).padStart(5)}€${miss}`);
      for (const item of pkg.items) {
        const flag = item.missingData ? ' ⚡' : (item.savings ? ` 💰 ${item.savings.toFixed(0)}€ gespart vs ${item.alternativeSupplier}` : '');
        console.log(`               └─ ${item.name.substring(0, 40).padEnd(40)} EK: ${item.purchaseNetto.toFixed(0).padStart(6)}€ (${item.supplier})${flag}`);
      }
    }
    
    if (crossSell.length > 0) {
      console.log(`\n  🛒 CROSS-SELL (${crossSell.length} Optionen):`);
      for (const cs of crossSell) {
        console.log(`     ${cs.icon} ${cs.nameDE.padEnd(40)} ${cs.customerBrutto.toFixed(0).padStart(7)}€ brutto`);
      }
    }
    
    console.log('\n' + '═'.repeat(70));
    
    return {
      leadId: req.leadId, customerName: req.customerName,
      requestedDimensions: dimString, liveQuotes, packages, crossSell,
      supplierOrders,
      totalDurationMs: Date.now() - startTime,
      suppliersQueried, suppliersSuccessful, suppliersFailed,
      priceComparisons,
      createdAt: new Date().toISOString(),
    };
  }
  
  async close() {
    await this.aluxeService?.close();
    await this.terandaService?.close();
    await this.aliplastService?.close();
  }
}

// ── Helpers ──

/**
 * Rodziny modeli — klucze quote'ow nalezace do modelu, o ktory prosil klient.
 * findRoofByModel dopasowuje NAJPIERW po rodzinie (a dopiero potem fallback
 * po tierze) — wczesniej klient proszacy o konkretny model dostawal najtanszy
 * dach z tego samego TIERU, czyli potrafil dostac zupelnie inny model.
 */
const MODEL_FAMILIES: Record<string, string[]> = {
  orangestyle: ['orangestyle_', 'teranda_tr10_'],
  trendstyle: ['trendstyle_', 'teranda_tr15_', 'mb_solid_'],
  topstyle: ['topstyle_', 'teranda_tr20_', 'mb_bold_'],
  designstyle: ['designstyle'],
  designline: ['designstyle'],
  ultrastyle: ['ultrastyle_'],
  skystyle: ['skystyle', 'mb_cube'],
  skyline: ['skystyle', 'mb_cube'],
};

export function findRoofByModel(
  quotes: LiveQuote[],
  primaryModelId: string,
  coverType?: string,
): LiveQuote | null {
  const family = Object.keys(MODEL_FAMILIES).find(f => primaryModelId.includes(f.replace('style', '').replace('line', '')) || primaryModelId.includes(f));
  const prefixes = family ? MODEL_FAMILIES[family] : null;
  if (!prefixes) return null;
  const candidates = quotes
    .filter(q => q.category === 'roof' && q.success && q.price !== null && q.price > 0)
    .filter(q => prefixes.some(pre => q.product.startsWith(pre)))
    .filter(q => !coverType || q.coverType === coverType || !q.coverType);
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (a.price! < b.price!) ? a : b);
}

/** Kod modelu dachu dla formularza markizy Aluxe (#rooftype) */
export function roofCodeForModel(primaryModelId: string): string | null {
  const id = (primaryModelId || '').toLowerCase();
  if (id.includes('orange')) return 'OL';
  if (id.includes('top')) return 'TLXL';
  if (id.includes('design')) return 'DL';
  if (id.includes('ultra')) return 'UL classic';
  if (id.includes('sky')) return null; // Skyline: markise niedostepna (brak opcji w #rooftype)
  return 'TR'; // default = Trendline
}

/**
 * Absolutnie najtańszy dach ze WSZYSTKICH udanych wycen (kotwica pakietu Basis).
 * Z filtrem pokrycia wymagamy JAWNEGO coverType (quoty bez coverType — np.
 * Ultrastyle/Skystyle — nie przechodzą, żeby nie udawały taniego poly/glas).
 */
export function cheapestRoofOverall(quotes: LiveQuote[], coverType?: string): LiveQuote | null {
  const candidates = quotes
    .filter(q => q.category === 'roof' && q.success && q.price !== null && q.price > 0)
    .filter(q => !coverType || q.coverType === coverType);
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (a.price! < b.price!) ? a : b);
}

/** Highlights generowane Z ITEMÓW pakietu (nigdy nie kłamią o zawartości). */
function buildHighlightsFromItems(pkg: OfferPackage, fillers: string[] = []): string[] {
  const hs: string[] = [];
  const items = pkg.items.filter(i => !i.missingData);
  const count = (cat: string) => items.filter(i => i.category === cat).reduce((s, i) => s + (i.quantity || 1), 0);

  const roof = items.find(i => i.category === 'roof');
  if (roof) hs.push(sanitizeLabel(roof.name));
  const pano = count('panorama');
  if (pano > 0) hs.push(pano > 1 ? 'Panorama-Schiebewände rundum' : 'Panorama-Schiebewand Front');
  const zips = count('senkrechtmarkise');
  if (zips > 0) hs.push(`${zips}× Senkrechtmarkise (ZIP)`);
  const keil = count('keilfenster');
  if (keil > 0) hs.push(`${keil}× Keilfenster`);
  const led = items.find(i => i.category === 'led');
  if (led) hs.push(led.name.includes('Komplett') || led.name.includes('Stripes') ? 'LED Komplett mit Smart-Steuerung' : 'LED-Beleuchtung');
  if (count('markise') > 0) hs.push('Aufdach-Markise');
  if (count('heater') > 0) hs.push('Infrarot-Heizstrahler');

  for (const f of fillers) {
    if (hs.length >= 5) break;
    if (!hs.includes(f)) hs.push(f);
  }
  return hs.slice(0, 5);
}

function findBestRoof(
  prices: Record<string, number>, 
  quotes: LiveQuote[], 
  tier: string, 
  coverType?: string,
  excludeSupplier?: string
): LiveQuote | null {
  const candidates = quotes
    .filter(q => q.category === 'roof' && q.tier === tier && q.success && q.price && q.price > 0)
    .filter(q => !coverType || q.coverType === coverType || !q.coverType)
    .filter(q => !excludeSupplier || q.supplier !== excludeSupplier);
  
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (a.price! < b.price!) ? a : b);
}

function makeItem(quote: LiveQuote, category: string, dimensions?: string): PackageItem {
  // Sanitize label for customer display (no supplier names!)
  const customerLabel = sanitizeLabel(quote.productLabel);
  
  // Generate category-specific notes with key specs
  const notes: Record<string, string> = {
    roof: 'Inkl. Pfosten 3000mm, Rinne, HWA-Bohrung',
    panorama: 'Schiebeverglasung, ESG-Sicherheitsglas',
    keilfenster: 'Dreiecksfenster für Dachschräge',
    led: 'Inkl. Trafo & Fernbedienung',
    senkrechtmarkise: 'Senkrecht-Markise mit Motor',
    markise: 'Aufdach-Markise mit Motor',
    montage: 'Professionelle Montage',
  };
  
  return {
    name: customerLabel, category, supplier: quote.supplier,
    purchaseNetto: quote.price!, quantity: 1, dimensions,
    source: quote.source, confidence: quote.confidence,
    note: notes[category] || undefined,
  };
}

/** Map internal/supplier names to customer-friendly Polendach24 brand names */
function sanitizeLabel(label: string): string {
  return label
    // Polish configurator names → German (must never reach the customer)
    .replace(/\bPergola\s*Nuun\s*ECO\b/gi, 'Pergola-Lamellendach')
    .replace(/\bPojedyncza\s*\/\s*Modułowa\b/gi, '')
    .replace(/\b(Pojedyncz[aye]|Modułow[aye]|Modulow[aye])\b/gi, '')
    .replace(/\bWolnostojąc[aye]?\b/gi, 'Freistehend')
    .replace(/\bWolnostojacy\b/gi, 'Freistehend')
    // Teranda → WITH numbers
    .replace(/\bTeranda TR15\b/gi, 'Trendstyle 15')
    .replace(/\bTeranda TR20\b/gi, 'Topstyle 20')
    .replace(/\bTeranda TR10\b/gi, 'Orangestyle 10')
    // Aluxe → WITHOUT numbers
    .replace(/\bTrendline plus\b/gi, 'Trendstyle Plus')
    .replace(/\bTrendline\b/gi, 'Trendstyle')
    .replace(/\bTopline XL\b/gi, 'Topstyle XL')
    .replace(/\bTopline\b/gi, 'Topstyle')
    .replace(/\bOrangeline plus\b/gi, 'Orangestyle Plus')
    .replace(/\bOrangeline\b/gi, 'Orangestyle')
    .replace(/\bUltraline\b/gi, 'Ultrastyle')
    .replace(/\bSkyline\b/gi, 'Skystyle')
    .replace(/\bPanorama AL\d+\b/gi, 'Panorama Schiebewand')
    .replace(/\bZIP Screen C-Cube\b/gi, 'Senkrechtmarkise')
    .replace(/\bPolycarbonat\b/gi, 'Polycarbonat')
    .replace(/\bPlatten\b/gi, 'Polycarbonat')
    .replace(/\s{2,}/g, ' ').trim();
}

function makeLedItem(led: { totalNetto: number; spotCount: number; stripeCount: number }, name: string): PackageItem {
  return {
    name: `${name} (${led.spotCount}× Spots${led.stripeCount > 0 ? ` + ${led.stripeCount}× Stripes` : ''})`,
    category: 'led', supplier: 'aluxe', purchaseNetto: led.totalNetto,
    quantity: 1, source: 'calculator', confidence: 0.9,
    note: led.stripeCount > 0 ? 'Mit Somfy iO Smart-Steuerung' : 'Standard-Fernbedienung',
  };
}

/**
 * Generate structural construction details based on dimensions and product type.
 * These help the customer understand exactly what physical components they get.
 */
function buildStructuralDetails(
  width: number, depth: number, height: number,
  productCategory: string, isFreestanding: boolean, roofLabel: string,
): StructuralDetail[] {
  const details: StructuralDetail[] = [];
  const widthM = (width / 1000).toFixed(1).replace('.0', '');
  const depthM = (depth / 1000).toFixed(1).replace('.0', '');
  const heightM = (height / 1000).toFixed(1).replace('.0', '');
  const areaM2 = ((width * depth) / 1000000).toFixed(1);

  // 1. Overall dimensions
  details.push({ label: 'Maße (B×T×H)', value: `${widthM} × ${depthM} × ${heightM} m (${areaM2} m²)`, icon: 'ruler' });

  if (productCategory === 'carport') {
    // Carport specifics
    const posts = isFreestanding ? (width > 6000 ? 6 : 4) : (width > 6000 ? 4 : 2);
    details.push({ label: 'Pfosten', value: `${posts} Stück — Aluminium ${(height)}mm`, icon: 'structure' });
    details.push({ label: 'Dachkonstruktion', value: `Aluminium-Tragwerk mit ${isFreestanding ? '4-seitiger' : 'Wand-'} Auflage`, icon: 'home' });
    const panelCount = Math.ceil(width / 1000);
    details.push({ label: 'Dacheindeckung', value: `${panelCount} Polycarbonat-Paneele (16mm Stegplatten)`, icon: 'shield' });
    details.push({ label: 'Regenrinne', value: `Integriert, ${widthM}m — mit Fallrohr`, icon: 'droplet' });
    details.push({ label: 'Befestigung', value: isFreestanding ? 'Fundamentanker für Freistehend-Montage' : 'Wandanschluss + Fundamentanker', icon: 'wrench' });
  } else if (productCategory === 'pergola') {
    const posts = isFreestanding ? 4 : 2;
    details.push({ label: 'Pfosten', value: `${posts} Stück — Aluminium verstärkt`, icon: 'structure' });
    details.push({ label: 'Lamellen', value: `Drehbare Aluminium-Lamellen — motorisiert`, icon: 'sun' });
    details.push({ label: 'Motor', value: 'Somfy io — inkl. Fernbedienung', icon: 'bolt' });
    details.push({ label: 'Entwässerung', value: 'Integriertes Entwässerungssystem in Pfosten', icon: 'droplet' });
  } else {
    // Roof (Terrassenüberdachung)
    const isFlat = roofLabel.toLowerCase().includes('flach') || roofLabel.toLowerCase().includes('sky');
    const isMultiModule = width > 7000;
    const moduleCount = isMultiModule ? Math.ceil(width / 5000) : 1;

    // Posts: wall-mounted = front posts only, freestanding = front + back
    const frontPosts = moduleCount + 1; // 1 post per module boundary + 1
    const totalPosts = isFreestanding ? frontPosts * 2 : frontPosts;
    details.push({ label: 'Pfosten', value: `${totalPosts} Stück — Aluminium ${heightM}m${isMultiModule ? ` (${moduleCount}-Feld-Anlage)` : ''}`, icon: 'structure' });

    // Rafters (Sparren): ca. every 1000mm
    const rafterCount = Math.max(2, Math.ceil(width / 1000) + 1);
    details.push({ label: 'Sparren', value: `${rafterCount} Stück — Aluminium-Hohlkammerprofil ${depthM}m`, icon: 'home' });

    // Beams (Träger)
    details.push({ label: 'Rinnenträger', value: `${moduleCount} Stück — ${widthM}m Aluminium-Profil`, icon: 'expand' });
    if (!isFreestanding) {
      details.push({ label: 'Wandprofil', value: `${moduleCount} Stück — ${widthM}m mit Wandanschluss`, icon: 'home' });
    }

    // Roof cover
    const isGlass = roofLabel.toLowerCase().includes('glas');
    if (isGlass) {
      details.push({ label: 'Dacheindeckung', value: `VSG-Sicherheitsglas 8mm — ${rafterCount - 1} Felder`, icon: 'shield' });
    } else {
      details.push({ label: 'Dacheindeckung', value: `Polycarbonat 16mm Stegplatten — ${rafterCount - 1} Felder`, icon: 'shield' });
    }

    // Gutter
    details.push({ label: 'Regenrinne', value: `Integriert in Rinnenträger, ${widthM}m — inkl. Fallrohr`, icon: 'droplet' });

    // Roof slope
    if (!isFlat) {
      details.push({ label: 'Dachneigung', value: 'ca. 8° (Mindestneigung für Wasserablauf)', icon: 'triangle' });
    } else {
      details.push({ label: 'Dachneigung', value: 'ca. 3° (Flachdach-Optik)', icon: 'triangle' });
    }

    // Mounting
    details.push({ label: 'Befestigung', value: isFreestanding ? 'Fundamentverankerung (4-seitig)' : 'Wandanschluss mit EPDM-Dichtung + Fundamentanker', icon: 'wrench' });
  }

  // Common for all
  details.push({ label: 'Statik', value: 'Berechnet nach DIN EN 1991 (Schnee- & Windlast)', icon: 'snowflake' });

  return details;
}

function buildPackage(
  id: 'economy' | 'value' | 'recommended' | 'premium',
  nameDE: string, subtitleDE: string, descriptionDE: string,
  items: PackageItem[], badge?: string,
): OfferPackage {
  const validItems = items.filter(i => !i.missingData);
  const purchaseNetto = validItems.reduce((s, i) => s + i.purchaseNetto, 0);
  
  const pricing = calculateOfferPrice({
    lineItems: validItems.map(i => ({ name: i.name, aluxeNetPrice: i.purchaseNetto, quantity: 1 })),
    transportAluxe: 25,
  });
  
  const confidences = validItems.map(i => i.confidence);
  const avgConf = confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
  
  return {
    id, nameDE, subtitleDE, descriptionDE, badge,
    items, purchaseNetto,
    customerNetto: pricing.customerNetPrice,
    customerBrutto: pricing.customerGrossPrice,
    marginPercent: pricing.marginPercent,
    marginAmount: pricing.marginAmount,
    hasMissingPrices: items.some(i => i.missingData),
    overallConfidence: avgConf,
  };
}

function estimateLedPrice(width: number, depth: number, mode: 'spots_only' | 'spots_and_stripes') {
  const spotsRinne = Math.max(2, Math.round(width / 750));
  let totalNetto = spotsRinne * 13.56; // Spots
  totalNetto += spotsRinne <= 6 ? 46.82 : 65.11; // Trafo
  totalNetto += 24.74; // Y-cables
  
  if (mode === 'spots_and_stripes') {
    totalNetto += 149.99 + 54.44 + 44.95; // Somfy
    const stripeLen = width - 234;
    const stripeCount = stripeLen <= 5000 ? 1 : 2;
    totalNetto += stripeCount * (stripeLen <= 5000 ? 65.59 : 104.98);
    totalNetto += Math.ceil(stripeLen / 1000) * 5.48;
    return { totalNetto: Math.round(totalNetto * 100) / 100, spotCount: spotsRinne, stripeCount };
  } else {
    totalNetto += 12.38 + 23.55; // Standard remote
    return { totalNetto: Math.round(totalNetto * 100) / 100, spotCount: spotsRinne, stripeCount: 0 };
  }
}
