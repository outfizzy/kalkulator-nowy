#!/usr/bin/env npx tsx
/**
 * Aliplast Comprehensive Price Scraper v3
 * 
 * Scrapes ALL price-affecting configuration variants from the Aliplast calculator:
 * - All module configs (W1D1, W2D1, W3D1, etc.)
 * - All drive types (Teleco, Somfy, various motors)
 * - Lighting options (LED in slats, LED in gutter)
 * - All ZIP Screen models (Cube, Quadro, Round, Hide)
 * - All drive motors per product
 * - Roof types for CarPort
 * - Fabric collections
 * 
 * Real API endpoint: POST /Product/ProductConfigJson/{ProductID}
 * Auth: ASP.NET session cookies
 * 
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/aliplast-scraper.ts
 *   SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/aliplast-scraper.ts CarPort
 *   SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/aliplast-scraper.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = 'https://whgjsppyuvglhbdgdark.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ALIPLAST_API_BASE = 'https://rolety.aliplast.pl';
const DELAY_MS = 600; // ms between requests

// ============================================================================
// Types
// ============================================================================

interface ConfigVariant {
  label: string;           // Human-readable label for logging
  configOverrides: Record<string, any>;  // Fields to merge into base config
  configKeySuffix: string; // Appended to config_key for uniqueness
}

interface ProductDef {
  id: string;
  name: string;
  category: string;
  baseConfig: Record<string, any>;
  widths: number[];
  secondDims: number[];
  widthKey: string;
  secondDimKey: string;
  profileColors: string[];
  variants: ConfigVariant[];  // All price-affecting option combos
}

// ============================================================================
// Helper: generate cross-product of variant arrays
// ============================================================================

function crossProduct(variantSets: ConfigVariant[][]): ConfigVariant[] {
  if (variantSets.length === 0) return [{ label: '', configOverrides: {}, configKeySuffix: '' }];
  
  return variantSets.reduce((acc, set) => {
    const result: ConfigVariant[] = [];
    for (const a of acc) {
      for (const b of set) {
        result.push({
          label: [a.label, b.label].filter(Boolean).join(' / '),
          configOverrides: { ...a.configOverrides, ...b.configOverrides },
          configKeySuffix: [a.configKeySuffix, b.configKeySuffix].filter(Boolean).join('_'),
        });
      }
    }
    return result;
  });
}

// ============================================================================
// Product Definitions with ALL variants
// ============================================================================

// --- Pergola ECO variants ---
const pergolaEcoSteeringVariants: ConfigVariant[] = [
  { label: 'Teleco', configOverrides: { SteeringType: 'Teleco', Remote: 'ACNN362B' }, configKeySuffix: 'Teleco' },
  { label: 'Somfy', configOverrides: { SteeringType: 'Somfy', Remote: 'ACNN362B' }, configKeySuffix: 'Somfy' },
];

const pergolaEcoLightingVariants: ConfigVariant[] = [
  { label: 'noLED', configOverrides: { Lighting: false, SideLighting: false }, configKeySuffix: 'noLED' },
  { label: 'LED-slats', configOverrides: { Lighting: true, SideLighting: false }, configKeySuffix: 'LEDslats' },
  { label: 'LED-gutter', configOverrides: { Lighting: false, SideLighting: true }, configKeySuffix: 'LEDgutter' },
  { label: 'LED-both', configOverrides: { Lighting: true, SideLighting: true }, configKeySuffix: 'LEDboth' },
];

const pergolaEcoSensorVariants: ConfigVariant[] = [
  { label: 'noSensors', configOverrides: { RainSensor: false, TempSensor: false, SmartphoneControl: false }, configKeySuffix: 'noSens' },
  { label: 'rain+temp+smart', configOverrides: { RainSensor: true, TempSensor: true, SmartphoneControl: true }, configKeySuffix: 'allSens' },
];

const pergolaEcoInstallVariants: ConfigVariant[] = [
  { label: 'Standalone', configOverrides: { InstallType: 'Standalone' }, configKeySuffix: 'SA' },
  { label: 'Wall', configOverrides: { InstallType: 'Wall' }, configKeySuffix: 'Wall' },
];

const pergolaEcoVariants = crossProduct([
  pergolaEcoSteeringVariants,
  pergolaEcoLightingVariants,
  pergolaEcoSensorVariants,
  pergolaEcoInstallVariants,
]);

// --- CarPort variants ---
const carportRoofVariants: ConfigVariant[] = [
  { label: 'DACH', configOverrides: { RoofFillment: 'DACH', RoofFillmentCost: false }, configKeySuffix: 'DACH' },
  { label: 'PIR', configOverrides: { RoofFillment: 'PIR', RoofFillmentCost: false }, configKeySuffix: 'PIR' },
  { label: 'INNE', configOverrides: { RoofFillment: 'INNE', RoofFillmentCost: false }, configKeySuffix: 'INNE' },
  { label: 'NONE', configOverrides: { RoofFillment: 'NONE', RoofFillmentCost: false }, configKeySuffix: 'NONE' },
];

const carportLightingVariants: ConfigVariant[] = [
  { label: 'noLED', configOverrides: { SideLighting: false }, configKeySuffix: 'noLED' },
  { label: 'LED-gutter', configOverrides: { SideLighting: true }, configKeySuffix: 'LEDgutter' },
];

const carportDrainVariants: ConfigVariant[] = [
  { label: 'Standard', configOverrides: { DrainTypeOption: 'Standard' }, configKeySuffix: 'StdDrain' },
  { label: 'Quiet', configOverrides: { DrainTypeOption: 'Quiet' }, configKeySuffix: 'QuietDrain' },
];

const carportVariants = crossProduct([
  carportRoofVariants,
  carportLightingVariants,
  carportDrainVariants,
]);

// --- ZipScreen variants ---
const zipModelVariants: ConfigVariant[] = [
  { label: 'Cube', configOverrides: { Model: 'C' }, configKeySuffix: 'C' },
  { label: 'Quadro', configOverrides: { Model: 'Q' }, configKeySuffix: 'Q' },
  { label: 'Round', configOverrides: { Model: 'R' }, configKeySuffix: 'R' },
  { label: 'Hide', configOverrides: { Model: 'H' }, configKeySuffix: 'H' },
];

const zipInstallVariants: ConfigVariant[] = [
  { label: 'Fasade', configOverrides: { InstallType: 'Fasade' }, configKeySuffix: 'Fas' },
  { label: 'Pergola', configOverrides: { InstallType: 'Pergola' }, configKeySuffix: 'Perg' },
];

const zipSteeringVariants: ConfigVariant[] = [
  { label: 'ACSCR110-std', configOverrides: { SteeringType: 'SW', Steering: 'ACSCR110' }, configKeySuffix: 'SCR110' },
  { label: 'ACSCR131-prem', configOverrides: { SteeringType: 'SW', Steering: 'ACSCR131' }, configKeySuffix: 'SCR131' },
  { label: 'ACRL525-RTS', configOverrides: { SteeringType: 'RTS', Steering: 'ACRL525' }, configKeySuffix: 'RL525' },
];

const zipFabricVariants: ConfigVariant[] = [
  { label: '1%', configOverrides: { FabricCollection: '1%', Fabric: 'SC1/10010' }, configKeySuffix: 'F1' },
  { label: '4%', configOverrides: { FabricCollection: '4%', Fabric: 'SC4/1001' }, configKeySuffix: 'F4' },
  { label: '5%', configOverrides: { FabricCollection: '5%', Fabric: 'SC5/1001' }, configKeySuffix: 'F5' },
];

const zipVariants = crossProduct([
  zipModelVariants,
  zipInstallVariants,
  zipSteeringVariants,
  zipFabricVariants,
]);

// --- Pergola Fabric variants ---
const fabricCollectionVariants: ConfigVariant[] = [
  { label: 'Soltis', configOverrides: { FabricCollection: 'Soltis', Fabric: 'J402/140' }, configKeySuffix: 'Soltis' },
  { label: 'Techprotect', configOverrides: { FabricCollection: 'Techprotect', Fabric: 'F407/014' }, configKeySuffix: 'Techprot' },
];

const fabricCoverVariants: ConfigVariant[] = [
  { label: 'noCover', configOverrides: { FabricCover: false, LowerSupportCovers: false }, configKeySuffix: 'noCov' },
  { label: 'withCovers', configOverrides: { FabricCover: true, LowerSupportCovers: true }, configKeySuffix: 'wCov' },
];

const fabricVariants = crossProduct([
  fabricCollectionVariants,
  fabricCoverVariants,
]);


// ============================================================================
// Dimension grids per module config
// ============================================================================

// Pergola ECO max single module width is ~4000mm.
// For wider structures, use multi-module configs.
// IMPORTANT: API requires individual module Width1/Width2/Depth1/Depth2 params!
const PERGOLA_MODULE_DIMS: { module: string; widths: number[]; depths: number[] }[] = [
  // Single module (width up to ~4000)
  { module: 'W1D1', widths: [2000, 2500, 3000, 3500, 4000], depths: [2510, 3000, 3590, 4130, 4500, 5000] },
  // 2 modules wide (total width, will be split evenly into Width1+Width2)
  { module: 'W2D1', widths: [4500, 5000, 5500, 6000, 7000, 8000], depths: [2510, 3000, 3590, 4130, 4500, 5000] },
  // 3 modules wide
  { module: 'W3D1', widths: [6000, 7500, 9000, 10000, 12000], depths: [3000, 4000, 5000] },
  // 2 modules deep
  { module: 'W1D2', widths: [2500, 3000, 3500, 4000], depths: [5000, 6000, 7000, 8000, 9000, 10000] },
  // NOTE: W2D2 is NOT available in Aliplast configurator
];

/**
 * Parse WxDy module string and add individual Width1..WidthX / Depth1..DepthY params.
 * The API requires individual module dims, not just totals!
 * E.g. W2D1 with totalWidth=5000 → Width1=2500, Width2=2500, Width=5000, Depth1=3000, Depth=3000
 */
function addModuleDimensions(config: Record<string, any>, module: string, totalWidth: number, totalDepth: number): void {
  const match = module.match(/W(\d+)D(\d+)/);
  if (!match) return;

  const wModules = parseInt(match[1]);
  const dModules = parseInt(match[2]);

  // Split width across modules
  const moduleWidth = Math.round(totalWidth / wModules);
  for (let i = 1; i <= wModules; i++) {
    config[`Width${i}`] = moduleWidth;
  }
  config.Width = totalWidth;

  // Split depth across modules
  const moduleDepth = Math.round(totalDepth / dModules);
  for (let i = 1; i <= dModules; i++) {
    config[`Depth${i}`] = moduleDepth;
  }
  config.Depth = totalDepth;
}

const PRODUCTS: ProductDef[] = [
  // --- Pergola ECO (multiple module configs) ---
  ...PERGOLA_MODULE_DIMS.map(md => ({
    id: 'PergolaECO_1',
    name: `Pergola ECO ${md.module}`,
    category: 'pergola',
    baseConfig: {
      Quantity: 1,
      Modules: md.module,
      Measure: 'Product',
      MeasuredHeight: 2500,
      Height: 2500,
      AllowOversize: false,
      Remote: 'ACNN362B',
      SteerSide: 'L',
      RotationDir: 'S',
      DrainType: 'Type1_Square',
      DrainTypeOption: 'Standard',
      ElectricBoxLeg: 'roof',
    },
    widths: md.widths,
    secondDims: md.depths,
    widthKey: 'Width1',
    secondDimKey: 'Depth1',
    profileColors: ['7016ST'],
    variants: pergolaEcoVariants,
  })),

  // --- Pergola Fabric (single module only) ---
  {
    id: 'PergolaNUUNFabric',
    name: 'Pergola Nuun Fabric',
    category: 'pergola',
    baseConfig: {
      Quantity: 1,
      Modules: 'W1D1',
      InstallType: 'Standalone',
      Measure: 'Product',
      MeasuredHeight: 2500,
      Height: 2500,
      AllowOversize: false,
      SteeringType: 'Manual',
      SteeringColor: 'Antracite',
      SteerSide: 'L',
      DrainType: 'Type1_Square',
      DrainTypeOption: 'Standard',
      ElectricBoxLeg: 'roof',
    },
    widths: [2000, 2500, 3000, 3500, 4000],
    secondDims: [2510, 3000, 3590, 4130, 4500, 5000],
    widthKey: 'Width1',
    secondDimKey: 'Depth1',
    profileColors: ['7016ST'],
    variants: fabricVariants,
  },

  // --- CarPort ---
  {
    id: 'CarPort',
    name: 'Carport v2',
    category: 'carport',
    baseConfig: {
      Quantity: 1,
      InstallType: 'Standalone',
      Measure: 'Product',
      MeasuredHeight: 2500,
      Height: 2500,
      AllowOversize: false,
      DrainType: 'Type1_Square',
      AlternativeAnchors: 'ACNE113',
    },
    widths: [2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000],
    secondDims: [3000, 3590, 4130, 4500, 5000, 5500, 6000],
    widthKey: 'Width',
    secondDimKey: 'Depth',
    profileColors: ['7016ST'],
    variants: carportVariants,
  },

  // --- ZIP Screen Eco ---
  {
    id: 'ZipScreenEco',
    name: 'ZIP Screen Eco',
    category: 'zip_screen',
    baseConfig: {
      Quantity: 1,
      Measure: 'Product',
      CassetteColor: '7016ST',
      BottomBarColor: '7016ST',
      GuideCapsColor: 'ACSCR062Z',
      BottomBar: 'NN032',
      SideRailLeft: 'std',
      SideRailRight: 'std',
      SteerSide: 'L',
      Remote: 'none',
      CableOut: 'A',
    },
    widths: [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000],
    secondDims: [1000, 1500, 2000, 2500, 3000, 3500],
    widthKey: 'Width',
    secondDimKey: 'Height',
    profileColors: ['7016ST'],
    variants: zipVariants,
  },

  // --- ZIP Screen ---
  {
    id: 'ZipScreen',
    name: 'ZIP Screen',
    category: 'zip_screen',
    baseConfig: {
      Quantity: 1,
      Measure: 'Product',
      CassetteColor: '7016ST',
      BottomBarColor: '7016ST',
      GuideCapsColor: 'ACSCR062Z',
      BottomBar: 'NN032',
      SideRailLeft: 'std',
      SideRailRight: 'std',
      SteerSide: 'L',
      Remote: 'none',
      CableOut: 'A',
    },
    widths: [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000],
    secondDims: [1000, 1500, 2000, 2500, 3000, 3500],
    widthKey: 'Width',
    secondDimKey: 'Height',
    profileColors: ['7016ST'],
    variants: zipVariants,
  },
];

// ============================================================================
// Helpers
// ============================================================================

function getCookies(): string {
  const envCookies = process.env.ALIPLAST_COOKIES;
  if (envCookies) return envCookies;

  const cookieFile = path.join(__dirname, 'aliplast-cookies.txt');
  if (fs.existsSync(cookieFile)) {
    return fs.readFileSync(cookieFile, 'utf-8').trim();
  }

  throw new Error(
    'No Aliplast cookies found!\n' +
    'Set ALIPLAST_COOKIES env var or create scripts/aliplast-cookies.txt'
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractPrice(data: any): number | null {
  // Primary: Aliplast uses CurrentPrice field
  if (data.CurrentPrice != null) {
    const val = parseFloat(data.CurrentPrice);
    if (!isNaN(val) && val > 0) return Math.round(val * 100) / 100;
  }
  // Fallback
  if (data.Price != null) { const v = parseFloat(data.Price); if (!isNaN(v) && v > 0) return v; }
  if (data.TotalPrice != null) { const v = parseFloat(data.TotalPrice); if (!isNaN(v) && v > 0) return v; }
  if (data.NetPrice != null) { const v = parseFloat(data.NetPrice); if (!isNaN(v) && v > 0) return v; }
  return null;
}

// ============================================================================
// API Client
// ============================================================================

async function fetchAliplastPrice(
  cookies: string,
  productId: string,
  config: Record<string, any>,
  revision: number = 1
): Promise<{ priceNet: number | null; response: any; error?: string }> {
  const url = `${ALIPLAST_API_BASE}/Product/ProductConfigJson/${productId}?_revision=${revision}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Cookie': cookies,
        'Accept': 'application/json, text/plain, */*',
        'Origin': ALIPLAST_API_BASE,
        'Referer': `${ALIPLAST_API_BASE}/Order/Edit2`,
      },
      body: JSON.stringify(config),
    });

    const rawText = await res.text();

    if (!res.ok) {
      return { priceNet: null, response: null, error: `HTTP ${res.status}` };
    }

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      if (rawText.includes('login') || rawText.includes('Login')) {
        return { priceNet: null, response: null, error: 'Session expired' };
      }
      return { priceNet: null, response: null, error: 'Invalid JSON' };
    }

    const priceNet = extractPrice(data);
    return { priceNet, response: data };
  } catch (err: any) {
    return { priceNet: null, response: null, error: err.message };
  }
}

// ============================================================================
// Main Scraper
// ============================================================================

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const filterProduct = process.argv.find(a => a !== '--dry-run' && !a.includes('/') && !a.includes('.') && process.argv.indexOf(a) > 1);

  console.log('🔧 Aliplast Comprehensive Price Scraper v3');
  console.log('═'.repeat(60));
  console.log(`  API: ${ALIPLAST_API_BASE}/Product/ProductConfigJson/{id}`);
  if (isDryRun) console.log('  MODE: DRY RUN (no API calls, just counting)');
  console.log('');

  const cookies = isDryRun ? 'dry-run' : getCookies();
  if (!isDryRun) console.log('✅ Cookies loaded');

  // Initialize Supabase
  if (!isDryRun && !SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set!');
    process.exit(1);
  }
  const supabase = isDryRun ? null : createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  if (!isDryRun) console.log('✅ Supabase connected\n');

  // Filter products
  const productsToScrape = filterProduct
    ? PRODUCTS.filter(p => p.id === filterProduct)
    : PRODUCTS;

  if (filterProduct && productsToScrape.length === 0) {
    console.error(`❌ Unknown product: "${filterProduct}"`);
    console.error(`   Available: ${[...new Set(PRODUCTS.map(p => p.id))].join(', ')}`);
    process.exit(1);
  }

  // Calculate totals
  let totalCombinations = 0;
  for (const product of productsToScrape) {
    const combos = product.widths.length * product.secondDims.length * product.profileColors.length * product.variants.length;
    totalCombinations += combos;
    console.log(`📦 ${product.name} (${product.id}): ${product.variants.length} variants × ${product.widths.length}×${product.secondDims.length} dims = ${combos} combinations`);
  }
  console.log(`\n📊 TOTAL: ${totalCombinations} combinations`);
  console.log(`⏱️  Estimated time: ${Math.ceil(totalCombinations * DELAY_MS / 60000)} minutes\n`);

  if (isDryRun) {
    console.log('Dry run complete. Run without --dry-run to scrape.');
    return;
  }

  // Test API connectivity
  console.log('🧪 Testing API connectivity...');
  const testProduct = productsToScrape[0];
  const testVariant = testProduct.variants[0];
  const testConfig = {
    ...testProduct.baseConfig,
    ...testVariant.configOverrides,
    [testProduct.widthKey]: testProduct.widths[Math.floor(testProduct.widths.length / 2)],
    [testProduct.secondDimKey]: testProduct.secondDims[Math.floor(testProduct.secondDims.length / 2)],
    ProfileColor: testProduct.profileColors[0],
    SlatsColor: testProduct.profileColors[0],
  };
  if (testProduct.category === 'zip_screen') {
    testConfig.MeasuredWidth = testConfig[testProduct.widthKey];
    testConfig.MeasuredHeight = testConfig[testProduct.secondDimKey];
  }

  const testResult = await fetchAliplastPrice(cookies, testProduct.id, testConfig);
  if (testResult.priceNet === null || testResult.priceNet < 100) {
    console.error(`❌ API test failed! Price: ${testResult.priceNet}, Error: ${testResult.error}`);
    if (testResult.error === 'Session expired') {
      console.error('   Re-login to rolety.aliplast.pl and update cookies!');
      process.exit(1);
    }
    console.log('⚠️  Continuing anyway...\n');
  } else {
    console.log(`✅ API OK — ${testProduct.name} [${testVariant.label}] = ${testResult.priceNet.toFixed(2)} PLN\n`);
  }

  // Scrape
  let totalScraped = 0;
  let totalErrors = 0;
  let totalSkipped = 0;
  let revision = 1;
  let sessionExpired = false;
  const startTime = Date.now();

  for (const product of productsToScrape) {
    if (sessionExpired) break;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📦 ${product.name} (${product.id})`);
    console.log(`   ${product.variants.length} variants × ${product.widths.length}w × ${product.secondDims.length}d = ${product.variants.length * product.widths.length * product.secondDims.length} combos`);
    console.log('─'.repeat(60));

    // Upsert product
    await supabase!.from('aliplast_products').upsert({
      id: product.id,
      name: product.name,
      category: product.category,
      metadata: {
        baseConfig: product.baseConfig,
        colors: product.profileColors,
        variants: product.variants.map(v => v.label),
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    for (const variant of product.variants) {
      let variantScraped = 0;
      let variantErrors = 0;

      for (const color of product.profileColors) {
        for (const w of product.widths) {
          for (const d of product.secondDims) {
            if (sessionExpired) break;

            const modulePrefix = product.baseConfig.Modules || 'STD';
            const configKey = `${modulePrefix}_${w}x${d}_${color}_${variant.configKeySuffix}`;

            // Check if already scraped with valid price
            const { data: existing } = await supabase!
              .from('aliplast_prices')
              .select('id, price_net')
              .eq('product_id', product.id)
              .eq('config_key', configKey)
              .single();

            if (existing?.price_net && existing.price_net > 100) {
              totalSkipped++;
              continue;
            }

            // Build config
            const config: Record<string, any> = {
              ...product.baseConfig,
              ...variant.configOverrides,
              ProfileColor: color,
              SlatsColor: color,
            };

            // Handle multi-module pergola dimensions
            const moduleStr = product.baseConfig.Modules || 'W1D1';
            if (product.category === 'pergola' && moduleStr !== 'W1D1') {
              // Multi-module: need Width1/Width2/.../WidthN + Depth1/.../DepthN
              addModuleDimensions(config, moduleStr, w, d);
            } else {
              // Single module or non-pergola: use direct keys
              config[product.widthKey] = w;
              config[product.secondDimKey] = d;
            }

            // ZipScreen also needs MeasuredWidth/MeasuredHeight
            if (product.category === 'zip_screen') {
              config.MeasuredWidth = w;
              config.MeasuredHeight = d;
            }

            // Make API call
            const { priceNet, response, error } = await fetchAliplastPrice(cookies, product.id, config, revision++);

            if (error === 'Session expired') {
              console.error('\n\n🚨 SESSION EXPIRED! Re-login and re-run.');
              sessionExpired = true;
              break;
            }

            if (priceNet !== null && priceNet > 100) {
              totalScraped++;
              variantScraped++;
              // Print every 10th success to avoid flooding
              if (variantScraped <= 3 || variantScraped % 10 === 0) {
                console.log(`  ✅ ${w}×${d} [${variant.label}] = ${priceNet.toFixed(2)} PLN`);
              }
            } else {
              totalErrors++;
              variantErrors++;
              if (variantErrors <= 2) {
                console.log(`  ⚠️  ${w}×${d} [${variant.label}] = no valid price (${priceNet || error || 'null'})`);
              }
            }

            // Build dimensions object
            const dimensions: Record<string, number> = { width: w };
            if (product.secondDimKey === 'Depth' || product.secondDimKey === 'Depth1') {
              dimensions.depth = d;
              dimensions.height = product.baseConfig.MeasuredHeight || product.baseConfig.Height || 2500;
            } else {
              dimensions.height = d;
            }

            // Upsert price
            await supabase!.from('aliplast_prices').upsert({
              product_id: product.id,
              config_key: configKey,
              config: config,
              dimensions: dimensions,
              color_profile: color,
              color_slat: color,
              module_config: modulePrefix,
              price_net: priceNet,
              price_details: {
                variant: variant.label,
                configKeySuffix: variant.configKeySuffix,
                priceValid: response?.PriceValid || false,
              },
              currency: 'PLN',
              scraped_at: new Date().toISOString(),
            }, { onConflict: 'product_id,config_key' });

            await sleep(DELAY_MS);
          }
        }
      }

      console.log(`  📊 ${variant.label}: ${variantScraped} scraped, ${variantErrors} errors`);
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n\n${'═'.repeat(60)}`);
  console.log(`✅ Scraping complete! (${Math.floor(elapsed / 60)}m ${elapsed % 60}s)`);
  console.log(`   Scraped:  ${totalScraped} prices`);
  console.log(`   Skipped:  ${totalSkipped} (already in DB)`);
  console.log(`   Errors:   ${totalErrors}`);
  if (sessionExpired) console.log(`   ⚠️ SESSION EXPIRED — re-run to continue!`);
  console.log('═'.repeat(60));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
