/**
 * productLabel.ts — Customer-facing product label sanitizer
 *
 * 🔴 BUG FIX: Internal / Polish product names (e.g. from the pricing worker or
 * supplier configurators) must NEVER reach the German-speaking customer on the
 * public offer page.
 *
 * `toCustomerLabel(raw)` maps internal / Polish / supplier-coded names to clean
 * German marketing labels. It is intentionally conservative: known roots are
 * mapped explicitly; everything else falls through a generic cleanup that strips
 * Polish words, supplier brand names and numeric codes like "(11364)".
 *
 * Use this EVERYWHERE a variant/product/position name is rendered on the public
 * offer (BotOfferView, TierComparisonSection, OfferSpecification).
 *
 * Note: this only affects DISPLAY. Internal IDs / logic stay untouched.
 */

/** Polish words / tokens that must be removed from any customer-facing label. */
const POLISH_TOKENS = [
  'pojedyncza',
  'pojedynczy',
  'pojedyncze',
  'modułowa',
  'modulowa',
  'modułowa',
  'modułowy',
  'modulowy',
  'modułowe',
  'modulowe',
  'wolnostojący',
  'wolnostojaca',
  'wolnostojąca',
  'wolnostojace',
  'wolnostojące',
  'naścienny',
  'nascienny',
  'naścienna',
  'nascienna',
  'przyścienny',
  'przyscienny',
];

/**
 * Explicit root mappings — checked (case-insensitive) as "contains".
 * Order matters: the FIRST match wins, so list more specific roots first.
 */
const ROOT_MAP: { match: RegExp; label: string }[] = [
  // Bioclimatic louvered pergola (the main offender: "Pergola Nuun ECO …")
  { match: /pergola\s*nuun/i, label: 'Pergola-Lamellendach' },
  { match: /\bpergola\b/i, label: 'Pergola-Lamellendach' },
];

/**
 * Supplier / brand / internal code replacements applied to the FALLBACK path
 * (when no explicit root matched). Each higher tier (e.g. "Topline XL") must
 * come before its shorter sibling ("Topline").
 */
const BRAND_REPLACEMENTS: { match: RegExp; replace: string }[] = [
  // Teranda codes → marketing names
  { match: /\bTeranda\s*TR\s*15\b/gi, replace: 'Trendstyle 15' },
  { match: /\bTeranda\s*TR\s*20\b/gi, replace: 'Topstyle 20' },
  { match: /\bTeranda\s*TR\s*10\b/gi, replace: 'Orangestyle 10' },
  { match: /\bTR\s*15\b/gi, replace: 'Trendstyle 15' },
  { match: /\bTR\s*20\b/gi, replace: 'Topstyle 20' },
  { match: /\bTR\s*10\b/gi, replace: 'Orangestyle 10' },
  // Aluxe "…line" → "…style"
  { match: /\bTrendline\s*plus\b/gi, replace: 'Trendstyle+' },
  { match: /\bTrendline\b/gi, replace: 'Trendstyle' },
  { match: /\bTopline\s*XL\b/gi, replace: 'Topstyle XL' },
  { match: /\bTopline\b/gi, replace: 'Topstyle' },
  { match: /\bOrangeline\s*plus\b/gi, replace: 'Orangestyle+' },
  { match: /\bOrangeline\b/gi, replace: 'Orangestyle' },
  { match: /\bUltraline\b/gi, replace: 'Ultrastyle' },
  { match: /\bSkyline\b/gi, replace: 'Skystyle' },
  { match: /\bDesignline\b/gi, replace: 'Designline' },
  // Supplier component brand names → neutral German terms
  { match: /\bPanorama\s*AL\s*\d+\b/gi, replace: 'Panorama Schiebewand' },
  { match: /\bZIP\s*Screen\s*C-?Cube\b/gi, replace: 'Senkrechtmarkise' },
  { match: /\bZipScreen\b/gi, replace: 'Senkrechtmarkise' },
  { match: /\bVerticale\s*Zonwering\b/gi, replace: 'Senkrechtmarkise' },
  { match: /\bPlatten\b/gi, replace: 'Polycarbonat' },
  { match: /\bfür\s*polycarbonat\b/gi, replace: 'mit Polycarbonat' },
];

/** Bare supplier brand tokens to delete entirely (after the replacements above). */
const SUPPLIER_TOKENS = /\b(aluxe|teranda|deponti|aliplast|c-cube|nuun)\b/gi;

/**
 * Convert any raw internal / Polish / supplier name into a clean German label.
 */
export function toCustomerLabel(raw: string | null | undefined): string {
  if (!raw) return '';
  let s = String(raw);

  // 1) Explicit root mapping — strongest signal, returns immediately.
  for (const { match, label } of ROOT_MAP) {
    if (match.test(s)) return label;
  }

  // 2) Brand / code → marketing-name replacements.
  for (const { match, replace } of BRAND_REPLACEMENTS) {
    s = s.replace(match, replace);
  }

  // 3) Remove bare supplier brand tokens.
  s = s.replace(SUPPLIER_TOKENS, ' ');

  // 4) Strip numeric supplier codes like "(11364)" or trailing "11364".
  s = s.replace(/\(\s*\d{3,6}\s*\)/g, ' ');

  // 5) Remove Polish words / suffixes (handles "A/B" forms too, e.g.
  //    "Pojedyncza/Modułowa" → both tokens removed, then dangling "/" cleaned).
  const polishRe = new RegExp(`\\b(${POLISH_TOKENS.join('|')})\\b`, 'gi');
  s = s.replace(polishRe, ' ');

  // 6) Tidy: leftover slashes/dashes from removed tokens, doubled separators,
  //    duplicate "— —", and collapse whitespace.
  s = s
    .replace(/\s*\/\s*/g, ' ')          // dangling separators from "A/B"
    .replace(/\s*—\s*—\s*/g, ' — ')      // doubled em-dashes
    .replace(/[\s—-]+$/g, '')            // trailing separators
    .replace(/^[\s—-]+/g, '')            // leading separators
    .replace(/\s{2,}/g, ' ')
    .trim();

  return s;
}

export default toCustomerLabel;
