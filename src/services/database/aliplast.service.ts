import { supabase } from '../../lib/supabase';

// ============================================================================
// Types
// ============================================================================

export interface AliplastProduct {
  id: string;
  name: string;
  category: 'pergola' | 'carport' | 'zip_screen';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AliplastPrice {
  id: string;
  product_id: string;
  config_key: string;
  config: Record<string, any>;
  dimensions: {
    width: number;
    depth?: number;
    height?: number;
  };
  color_profile: string | null;
  color_slat: string | null;
  module_config: string | null;
  price_net: number | null;
  price_details: Record<string, any>;
  currency: string;
  scraped_at: string;
}

export interface AliplastPriceLookupParams {
  productId: string;
  width: number;
  depth?: number;
  height?: number;
  colorProfile?: string;
  variantSuffix?: string;  // e.g. 'Teleco_LEDslats_noSens_SA'
  moduleConfig?: string;   // e.g. 'W1D1', 'W2D1'
}

// ============================================================================
// Product Operations
// ============================================================================

export async function getAliplastProducts(): Promise<AliplastProduct[]> {
  const { data, error } = await supabase
    .from('aliplast_products')
    .select('*')
    .order('category', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getAliplastProductById(id: string): Promise<AliplastProduct | null> {
  const { data, error } = await supabase
    .from('aliplast_products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

// ============================================================================
// Price Operations
// ============================================================================

export async function getAliplastPrices(
  productId: string,
  filters?: { moduleConfig?: string; variantSuffix?: string }
): Promise<AliplastPrice[]> {
  let query = supabase
    .from('aliplast_prices')
    .select('*')
    .eq('product_id', productId)
    .not('price_net', 'is', null)
    .gt('price_net', 100);  // Filter out invalid low prices

  if (filters?.moduleConfig) {
    query = query.eq('module_config', filters.moduleConfig);
  }

  const { data, error } = await query.order('config_key', { ascending: true });
  if (error) throw error;

  let results = data || [];

  // Filter by variant suffix if provided (config_key pattern matching)
  if (filters?.variantSuffix) {
    const suffix = filters.variantSuffix;
    results = results.filter(p => p.config_key.includes(suffix));
  }

  return results;
}

/**
 * Get available variant options from scraped data for a product.
 * Extracts unique variant labels from price_details.
 */
export async function getAvailableVariants(productId: string): Promise<{
  variants: string[];
  moduleConfigs: string[];
}> {
  const { data, error } = await supabase
    .from('aliplast_prices')
    .select('config_key, module_config, price_details')
    .eq('product_id', productId)
    .not('price_net', 'is', null)
    .gt('price_net', 100);

  if (error) throw error;

  const variants = new Set<string>();
  const moduleConfigs = new Set<string>();

  (data || []).forEach((row: any) => {
    if (row.price_details?.variant) variants.add(row.price_details.variant);
    if (row.module_config) moduleConfigs.add(row.module_config);
  });

  return {
    variants: [...variants].sort(),
    moduleConfigs: [...moduleConfigs].sort(),
  };
}

/**
 * Look up price for given dimensions + variant.
 */
export async function lookupAliplastPrice(
  params: AliplastPriceLookupParams
): Promise<AliplastPrice | null> {
  const { productId, width, depth, height, colorProfile, variantSuffix, moduleConfig } = params;

  let query = supabase
    .from('aliplast_prices')
    .select('*')
    .eq('product_id', productId)
    .not('price_net', 'is', null)
    .gt('price_net', 100);

  if (colorProfile) {
    query = query.eq('color_profile', colorProfile);
  }
  if (moduleConfig) {
    query = query.eq('module_config', moduleConfig);
  }

  const { data: allPrices, error } = await query;
  if (error) throw error;
  if (!allPrices || allPrices.length === 0) return null;

  // Filter by variant suffix
  let filtered = allPrices;
  if (variantSuffix) {
    filtered = allPrices.filter(p => p.config_key.endsWith(variantSuffix));
    if (filtered.length === 0) {
      // fallback: partial match
      filtered = allPrices.filter(p => p.config_key.includes(variantSuffix));
    }
    if (filtered.length === 0) filtered = allPrices;
  }

  // Find exact match
  const exactMatch = filtered.find((p: AliplastPrice) => {
    const d = p.dimensions;
    if (!d) return false;
    const widthMatch = d.width === width;
    const depthMatch = depth ? d.depth === depth : true;
    const heightMatch = height ? d.height === height : true;
    return widthMatch && depthMatch && heightMatch;
  });

  if (exactMatch) return exactMatch;

  // Find closest match by Euclidean distance
  let closest: AliplastPrice | null = null;
  let minDistance = Infinity;

  for (const price of filtered) {
    const d = price.dimensions;
    if (!d || !d.width) continue;
    
    let dist = Math.pow(d.width - width, 2);
    if (depth && d.depth) dist += Math.pow(d.depth - depth, 2);
    if (height && d.height) dist += Math.pow(d.height - height, 2);
    
    if (dist < minDistance) {
      minDistance = dist;
      closest = price;
    }
  }

  return closest;
}

/**
 * Get unique dimension combinations for a product (optionally filtered by variant)
 */
export async function getAvailableDimensions(productId: string, filters?: { moduleConfig?: string; variantSuffix?: string }): Promise<{
  widths: number[];
  depths: number[];
  heights: number[];
}> {
  let query = supabase
    .from('aliplast_prices')
    .select('dimensions, config_key, module_config')
    .eq('product_id', productId)
    .not('price_net', 'is', null)
    .gt('price_net', 100);

  if (filters?.moduleConfig) {
    query = query.eq('module_config', filters.moduleConfig);
  }

  const { data, error } = await query;
  if (error) throw error;

  let items = data || [];
  if (filters?.variantSuffix) {
    items = items.filter((r: any) => r.config_key?.includes(filters.variantSuffix));
  }

  const widths = new Set<number>();
  const depths = new Set<number>();
  const heights = new Set<number>();

  items.forEach((row: any) => {
    const d = row.dimensions;
    if (!d) return;
    if (d.width) widths.add(d.width);
    if (d.depth) depths.add(d.depth);
    if (d.height) heights.add(d.height);
  });

  return {
    widths: [...widths].sort((a, b) => a - b),
    depths: [...depths].sort((a, b) => a - b),
    heights: [...heights].sort((a, b) => a - b),
  };
}

/**
 * Get available colors for a product
 */
export async function getAvailableColors(productId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('aliplast_prices')
    .select('color_profile')
    .eq('product_id', productId)
    .not('price_net', 'is', null)
    .not('color_profile', 'is', null);

  if (error) throw error;

  const colors = new Set<string>();
  (data || []).forEach((row: any) => {
    if (row.color_profile) colors.add(row.color_profile);
  });

  return [...colors].sort();
}

/**
 * Get price statistics for a product
 */
export async function getProductPriceStats(productId: string, filters?: { moduleConfig?: string; variantSuffix?: string }): Promise<{
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  totalEntries: number;
} | null> {
  let query = supabase
    .from('aliplast_prices')
    .select('price_net, config_key, module_config')
    .eq('product_id', productId)
    .not('price_net', 'is', null)
    .gt('price_net', 100);

  if (filters?.moduleConfig) {
    query = query.eq('module_config', filters.moduleConfig);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return null;

  let items = data;
  if (filters?.variantSuffix) {
    items = data.filter((r: any) => r.config_key?.includes(filters.variantSuffix));
  }
  if (items.length === 0) return null;

  const prices = items.map((r: any) => parseFloat(r.price_net));
  return {
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    avgPrice: prices.reduce((s, p) => s + p, 0) / prices.length,
    totalEntries: prices.length,
  };
}
