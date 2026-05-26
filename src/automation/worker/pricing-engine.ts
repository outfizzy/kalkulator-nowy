// ============================================================================
// Polendach24 Pricing Engine for Aluxe Products
// Rules: 40% margin, minimum €2,000 margin on small roofs
// Assembly (Montage) excluded for now — will be added later
// ============================================================================

// Name mapping: Aluxe → Polendach24 (pattern: "line" → "style")
export const ALUXE_TO_POLENDACH: Record<string, string> = {
  // Trendline → Trendstyle
  'Trendline veranda - mit Platten': 'Trendstyle mit Polycarbonat',
  'Trendline Veranda - mit Glas': 'Trendstyle mit Glas',
  'Trendline plus veranda - Trendline plus mit Platten': 'Trendstyle Plus mit Polycarbonat',
  'Trendline plus Veranda - Trendline Plus mit Glas': 'Trendstyle Plus mit Glas',
  // Topline → Topstyle
  'Topline XL Veranda - XL mit Platten': 'Topstyle XL mit Polycarbonat',
  'Topline XL Veranda - XL mit Glas': 'Topstyle XL mit Glas',
  'Topline Veranda - mit Platten': 'Topstyle mit Polycarbonat',
  'Topline Veranda - mit Glas': 'Topstyle mit Glas',
  // Ultraline → Ultrastyle (3 variants: Classic, Style, Compact)
  'Ultraline veranda': 'Ultrastyle',
  'Ultraline Classic': 'Ultrastyle Classic',
  'Ultraline Style': 'Ultrastyle Style',
  'Ultraline Compact': 'Ultrastyle Compact',
  // Designline → Designstyle
  'Designline veranda': 'Designstyle',
  // Skyline → Skystyle
  'Skyline veranda': 'Skystyle',
  'Skyline freistehend': 'Skystyle Freistehend',
  // Orangeline → Orangestyle
  'Orangeline plus veranda - Orangeline plus mit polycarbonat': 'Orangestyle Plus Poly',
  'Orangeline plus veranda - Orangeline plus mit Glas': 'Orangestyle Plus Glas',
  'Orangeline veranda - für polycarbonat': 'Orangestyle Poly',
  'Orangeline veranda - mit Glas': 'Orangestyle Glas',
  // Carport
  'Carport mit Wandanschluß': 'Carport',
  'Carport freistehend': 'Carport Freistehend',
  // Panorama
  'Panorama Schiebewand AL25 hoch': 'System szyb przesuwnych AL25',
  'Panorama Schiebewand AL24': 'System szyb przesuwnych AL24',
  'Panorama Schiebewand AL26': 'System szyb przesuwnych AL26',
  'Panorama Schiebewand AL23 hoch': 'System szyb przesuwnych AL23',
  'Panorama Schiebewand AL22 flach': 'System szyb przesuwnych AL22',
  // Ściany
  'Aluminum Seiten-Wand': 'Feste Seitenelemente',
  'Keilfenster': 'Keilfenster',
  'Frontwand': 'Frontwand',
  'Rahmen mit Schiebetüren': 'Rahmen mit Schiebetüren',
  // Markise / ZIP
  'Markise': 'Markise ZIP',
  'Verticale zonwering': 'Senkrechtmarkise',
};

// ============================================================================
// BUSINESS RULES — Polendach24 defaults & logic
// ============================================================================

export const BUSINESS_RULES = {
  // Panorama: always default to AL23 (standard for Polendach24)
  panorama: {
    defaultModel: 'panorama_al23',
    note: 'W podstawie zawsze liczymy AL23 — chyba że klient wymaga innego modelu',
  },
  
  // Designline: only available in 9005, 9010, db703 (NO 7016!)
  designline: {
    availableColors: ['9005', '9010', 'db703'],
    defaultColor: '9005',
    note: 'Designline nie ma 7016 Anthrazitgrau — domyślnie 9005 mat schwarz',
  },
  
  // Senkrechtmarkise = Verticale Zonwering = ZIP Screen Vertikal
  zipScreen: {
    aluxeName: 'Verticale zonwering',
    polendachName: 'Senkrechtmarkise / ZIP Screen',
    productId: 'fd60d47d74592d4',
  },
  
  // Markise = Aufdach/Unterdach ZIP
  markise: {
    roofTypes: {
      'TR': 'Trendline (Trendstyle)',
      'TR+': 'Trendline+ (Trendstyle Plus)',
      'TL': 'Topline (Topstyle)',
      'TLXL': 'Topline XL (Topstyle XL)',
      'OL': 'Orangeline (Orangestyle)',
      'OL+': 'Orangeline+ (Orangestyle Plus)',
    },
  },
  
  // Ultraline has 3 variants via #ultra_type select
  ultraline: {
    variants: {
      'classic': 'Ultrastyle Classic',
      'style': 'Ultrastyle Style', 
      'compact': 'Ultrastyle Compact',
    },
    defaultVariant: 'classic',
    selectId: '#ultra_type',
    note: 'Ultraline/Ultrastyle ma 3 warianty: Classic, Style, Compact',
  },
  
  // Name mapping summary: ALWAYS "line" → "style"
  naming: {
    'Trendline': 'Trendstyle',
    'Topline': 'Topstyle',
    'Designline': 'Designstyle',
    'Ultraline': 'Ultrastyle',
    'Skyline': 'Skystyle',
    'Orangeline': 'Orangestyle',
    'Panorama Schiebewand': 'System szyb przesuwnych',
    'Verticale zonwering': 'Senkrechtmarkise',
    'Bovendak/Onderdak zonwering': 'Markise ZIP',
  },
};

// ============================================================================
// PRICING RULES
// ============================================================================

// --- Single item input (backward compat) ---
export interface PricingInput {
  aluxeNetPrice: number;      // Cena netto z konfiguratora Aluxe (EUR) — GESAMTPREIS
  transportAluxe?: number;    // Transport Aluxe (default ~€200)
  productType?: string;       // Typ produktu (dla przyszłych reguł per-produkt)
}

// --- Multi-item offer input ---
export interface OfferLineItem {
  name: string;               // "Trendstyle Poly 5000×3500"
  aluxeNetPrice: number;      // Cena Aluxe netto tej pozycji
  quantity: number;            // Ilość (zazwyczaj 1)
}

export interface OfferPricingInput {
  lineItems: OfferLineItem[];  // Pozycje w ofercie
  transportAluxe?: number;     // Transport (default €200)
}

export interface OfferPricingResult {
  // Pozycje
  lineItems: OfferLineItem[];
  
  // Aluxe side — GESAMTPREIS (suma wszystkich pozycji)
  aluxeGesamtpreis: number;    // Suma netto wszystkich pozycji
  aluxeTransport: number;
  aluxeTotal: number;          // Gesamtpreis + transport
  
  // Margin — ZAWSZE od Gesamtpreis
  marginPercent: number;
  marginAmount: number;
  minimumMarginApplied: boolean;
  
  // Customer price
  customerNetPrice: number;
  customerVAT: number;
  customerGrossPrice: number;
  
  // Assembly placeholder
  assemblyPrice: null;
  
  totalCustomerPrice: number;
}

export interface PricingResult {
  // Aluxe side
  aluxeNetPrice: number;
  aluxeTransport: number;
  aluxeTotal: number;
  
  // Margin calculation — od Gesamtpreis
  marginPercent: number;
  marginAmount: number;
  minimumMarginApplied: boolean;
  
  // Customer price (without assembly)
  customerNetPrice: number;
  customerVAT: number;
  customerGrossPrice: number;
  
  // Assembly placeholder
  assemblyPrice: null;
  
  // Summary
  totalCustomerPrice: number;
}

const MARGIN_PERCENT = 0.40;        // 40% markup
const MINIMUM_MARGIN_EUR = 2000;    // €2,000 minimum
const GERMAN_VAT = 0.19;            // 19% MwSt
const DEFAULT_TRANSPORT = 200;       // Aluxe default transport

/**
 * Calculate customer price from Aluxe GESAMTPREIS.
 * 
 * WAŻNE: Marża ZAWSZE od Gesamtpreis (łączna cena koszyka), nie per pozycja!
 * 
 * Rules:
 * 1. Standard margin: 40% on Aluxe Gesamtpreis (total)
 * 2. Minimum margin: €2,000 (if 40% < €2,000, use flat €2,000)
 * 3. Transport: passed through at cost
 * 4. Assembly: NOT included (added later)
 * 5. VAT: 19% German MwSt
 * 
 * Breakeven: Gesamtpreis = €2,000 / 0.40 = €5,000
 * - Below €5,000: flat €2,000 margin
 * - Above €5,000: 40% margin
 */
export function calculateCustomerPrice(input: PricingInput): PricingResult {
  const aluxeNet = input.aluxeNetPrice; // This should be GESAMTPREIS
  const transport = input.transportAluxe ?? DEFAULT_TRANSPORT;
  const aluxeTotal = aluxeNet + transport;
  
  // Margin from GESAMTPREIS
  const percentMargin = aluxeNet * MARGIN_PERCENT;
  const minimumMarginApplied = percentMargin < MINIMUM_MARGIN_EUR;
  const marginAmount = Math.max(percentMargin, MINIMUM_MARGIN_EUR);
  const effectiveMarginPercent = marginAmount / aluxeNet;
  
  // Customer price (net, without VAT, without assembly)
  const customerNet = aluxeTotal + marginAmount;
  const vat = customerNet * GERMAN_VAT;
  const customerGross = customerNet + vat;
  
  return {
    aluxeNetPrice: round2(aluxeNet),
    aluxeTransport: round2(transport),
    aluxeTotal: round2(aluxeTotal),
    
    marginPercent: round2(effectiveMarginPercent * 100),
    marginAmount: round2(marginAmount),
    minimumMarginApplied,
    
    customerNetPrice: round2(customerNet),
    customerVAT: round2(vat),
    customerGrossPrice: round2(customerGross),
    
    assemblyPrice: null,
    
    totalCustomerPrice: round2(customerGross),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calculate offer price from multiple line items.
 * 
 * WAŻNE: Marża 40% / min €2.000 od GESAMTPREIS (sumy wszystkich pozycji),
 * NIE per pozycja!
 * 
 * Wyjątek: jeśli ktoś zamawia TYLKO sam ZIP lub sam system szyb przesuwnych,
 * to marża od tego jednego produktu.
 * 
 * Przykład:
 *   Dach €2.500 + Panorama AL23 €800 + LEDy €471 = Gesamtpreis €3.771
 *   Marża: max(€3.771 × 40%, €2.000) = €2.000 (minimum)
 *   Klient netto: €3.771 + €200 (transport) + €2.000 = €5.971
 *   Klient brutto: €5.971 × 1.19 = €7.105,49
 */
export function calculateOfferPrice(input: OfferPricingInput): OfferPricingResult {
  const transport = input.transportAluxe ?? DEFAULT_TRANSPORT;
  
  // Sum all line items = Gesamtpreis
  const gesamtpreis = input.lineItems.reduce(
    (sum, item) => sum + (item.aluxeNetPrice * item.quantity), 0
  );
  
  const aluxeTotal = gesamtpreis + transport;
  
  // Margin from GESAMTPREIS
  const percentMargin = gesamtpreis * MARGIN_PERCENT;
  const minimumMarginApplied = percentMargin < MINIMUM_MARGIN_EUR;
  const marginAmount = Math.max(percentMargin, MINIMUM_MARGIN_EUR);
  const effectiveMarginPercent = gesamtpreis > 0 ? (marginAmount / gesamtpreis) : 0;
  
  // Customer price
  const customerNet = aluxeTotal + marginAmount;
  const vat = customerNet * GERMAN_VAT;
  const customerGross = customerNet + vat;
  
  return {
    lineItems: input.lineItems,
    
    aluxeGesamtpreis: round2(gesamtpreis),
    aluxeTransport: round2(transport),
    aluxeTotal: round2(aluxeTotal),
    
    marginPercent: round2(effectiveMarginPercent * 100),
    marginAmount: round2(marginAmount),
    minimumMarginApplied,
    
    customerNetPrice: round2(customerNet),
    customerVAT: round2(vat),
    customerGrossPrice: round2(customerGross),
    
    assemblyPrice: null,
    totalCustomerPrice: round2(customerGross),
  };
}

/**
 * Format price for German display: 1.234,56 €
 */
export function formatEUR(amount: number): string {
  return amount.toLocaleString('de-DE', { 
    style: 'currency', 
    currency: 'EUR',
    minimumFractionDigits: 2,
  });
}

/**
 * Generate a pricing summary table for display
 */
export function generatePricingSummary(
  productName: string,
  configs: { width: number; depth: number; color: string; aluxePrice: number }[]
): string {
  const lines: string[] = [
    `\n  === ${productName} — Kalkulation ===\n`,
    '  Breite | Tiefe  | Farbe | Aluxe netto | Marża   | Min? | Kunden netto | Kunden brutto',
    '  -------|--------|-------|-------------|---------|------|--------------|-------------',
  ];
  
  for (const c of configs) {
    const result = calculateCustomerPrice({ aluxeNetPrice: c.aluxePrice });
    const minFlag = result.minimumMarginApplied ? '✓ MIN' : '  40%';
    lines.push(
      `  ${String(c.width).padStart(5)}  | ${String(c.depth).padStart(5)}  | ${c.color.padEnd(5)} | ${formatEUR(result.aluxeNetPrice).padStart(11)} | ${formatEUR(result.marginAmount).padStart(7)} | ${minFlag} | ${formatEUR(result.customerNetPrice).padStart(12)} | ${formatEUR(result.customerGrossPrice)}`
    );
  }
  
  return lines.join('\n');
}
