// ============================================================================
// Polendach24 Pricing Engine for Aluxe Products
// Rules: 40% margin, minimum €2,000 margin on small roofs
// Assembly (Montage) excluded for now — will be added later
// ============================================================================

// Name mapping: Aluxe → Polendach24
export const ALUXE_TO_POLENDACH: Record<string, string> = {
  // Pattern: "line" → "style" for main product lines
  'Trendline veranda - mit Platten': 'Trendstyle mit Polycarbonat',
  'Trendline Veranda - mit Glas': 'Trendstyle mit Glas',
  'Trendline plus veranda - Trendline plus mit Platten': 'Trendstyle Plus mit Polycarbonat',
  'Trendline plus Veranda - Trendline Plus mit Glas': 'Trendstyle Plus mit Glas',
  'Topline XL Veranda - XL mit Platten': 'Topstyle XL mit Polycarbonat',
  'Topline XL Veranda - XL mit Glas': 'Topstyle XL mit Glas',
  'Topline Veranda - mit Platten': 'Topstyle mit Polycarbonat',
  'Topline Veranda - mit Glas': 'Topstyle mit Glas',
  'Designline veranda': 'Designline',
  'Ultraline veranda': 'Ultraline',
  'Carport mit Wandanschluß': 'Carport',
  'Carport freistehend': 'Carport Freistehend',
  'Panorama Schiebewand AL25 hoch': 'Panorama Schiebewand AL25',
  'Panorama Schiebewand AL24': 'Panorama Schiebewand AL24',
  'Panorama Schiebewand AL26': 'Panorama Schiebewand AL26',
  'Panorama Schiebewand AL23 hoch': 'Panorama Schiebewand AL23',
  'Panorama Schiebewand AL22 flach': 'Panorama Schiebewand AL22',
  'Aluminum Seiten-Wand': 'Feste Seitenelemente',
  'Keilfenster': 'Keilfenster',
  'Frontwand': 'Frontwand',
  'Rahmen mit Schiebetüren': 'Rahmen mit Schiebetüren',
  'Markise': 'Markise / ZIP Screen',
  'Verticale zonwering': 'ZIP Screen Vertikal',
  'Skyline veranda': 'Skyline',
  'Skyline freistehend': 'Skyline Freistehend',
  'Orangeline plus veranda - Orangeline plus mit polycarbonat': 'Orangeline Plus Poly',
  'Orangeline plus veranda - Orangeline plus mit Glas': 'Orangeline Plus Glas',
  'Orangeline veranda - für polycarbonat': 'Orangeline Poly',
  'Orangeline veranda - mit Glas': 'Orangeline Glas',
};

// ============================================================================
// PRICING RULES
// ============================================================================

export interface PricingInput {
  aluxeNetPrice: number;      // Cena netto z konfiguratora Aluxe (EUR)
  transportAluxe?: number;    // Transport Aluxe (default ~€200)
  productType?: string;       // Typ produktu (dla przyszłych reguł per-produkt)
}

export interface PricingResult {
  // Aluxe side
  aluxeNetPrice: number;
  aluxeTransport: number;
  aluxeTotal: number;
  
  // Margin calculation
  marginPercent: number;      // 40% standard
  marginAmount: number;       // Actual margin applied (may be > 40% if minimum kicks in)
  minimumMarginApplied: boolean; // true if €2,000 minimum was used
  
  // Customer price (without assembly)
  customerNetPrice: number;   // Price for customer (excl. VAT, excl. assembly)
  customerVAT: number;        // 19% MwSt (German VAT)
  customerGrossPrice: number; // Incl. VAT
  
  // Assembly placeholder
  assemblyPrice: null;        // To be added later
  
  // Summary
  totalCustomerPrice: number; // Final price for offer
}

const MARGIN_PERCENT = 0.40;        // 40% markup
const MINIMUM_MARGIN_EUR = 2000;    // €2,000 minimum on small roofs
const GERMAN_VAT = 0.19;            // 19% MwSt
const DEFAULT_TRANSPORT = 200;       // Aluxe default transport

/**
 * Calculate customer price from Aluxe net price.
 * 
 * Rules:
 * 1. Standard margin: 40% on Aluxe net price
 * 2. Minimum margin: €2,000 (if 40% < €2,000, use flat €2,000)
 * 3. Transport: passed through at cost
 * 4. Assembly: NOT included (added later)
 * 5. VAT: 19% German MwSt
 * 
 * Breakeven: Aluxe price = €2,000 / 0.40 = €5,000
 * - Below €5,000: flat €2,000 margin
 * - Above €5,000: 40% margin
 */
export function calculateCustomerPrice(input: PricingInput): PricingResult {
  const aluxeNet = input.aluxeNetPrice;
  const transport = input.transportAluxe ?? DEFAULT_TRANSPORT;
  const aluxeTotal = aluxeNet + transport;
  
  // Calculate margin
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
