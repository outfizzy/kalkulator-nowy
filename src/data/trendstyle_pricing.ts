import trendstyleData from './trendstyle_full.json';

export interface TrendstyleProduct {
    model: string;
    variant: string;
    cover_type: string;
    snow_load_zone: string;
    snow_load_limit_kN_m2: number;
    wind_load_zone: string;
    wind_load_factor: number;
    width_mm: number;
    depth_mm: number;
    price_eur: number;
    ir_gold_surcharge_eur: number;
    glass_44_2_surcharge_eur?: number;
    glass_55_2_surcharge_eur?: number;
    fields: number;
    posts: number;
    area_m2: number;
    markers: string;
}

export interface TrendstyleData {
    system: string;
    currency: string;
    products: TrendstyleProduct[];
}

// Export the data with proper typing
export const trendstylePricing: TrendstyleData = trendstyleData as TrendstyleData;

// Export for backward compatibility with existing code
export interface PricingEntry {
    snowZone: string;
    width: number;
    depth: number;
    price: number;
    coverType: string;
    irGoldSurcharge?: number;
    glass_44_2_surcharge_eur?: number;
    glass_55_2_surcharge_eur?: number;
    fields: number;
    posts: number;
}

// Filter for standard Trendstyle (model: "Trendstyle")
export const trendstylePricingEntries: PricingEntry[] = trendstylePricing.products
    .filter(p => p.model === 'Trendstyle')
    .map(p => ({
        snowZone: p.snow_load_zone,  // Keep original: "1", "1a&2", "2a&3"
        width: p.width_mm,
        depth: p.depth_mm,
        price: p.price_eur,
        coverType: p.cover_type,
        irGoldSurcharge: p.ir_gold_surcharge_eur,
        glass_44_2_surcharge_eur: p.glass_44_2_surcharge_eur,
        glass_55_2_surcharge_eur: p.glass_55_2_surcharge_eur,
        fields: p.fields,
        posts: p.posts
    }));

// Filter for Trendstyle+ (model: "Trendstyle+")
export const trendstylePlusPricingEntries: PricingEntry[] = trendstylePricing.products
    .filter(p => p.model === 'Trendstyle+')
    .map(p => ({
        snowZone: p.snow_load_zone,
        width: p.width_mm,
        depth: p.depth_mm,
        price: p.price_eur,
        coverType: p.cover_type,
        irGoldSurcharge: p.ir_gold_surcharge_eur,
        glass_44_2_surcharge_eur: p.glass_44_2_surcharge_eur,
        glass_55_2_surcharge_eur: p.glass_55_2_surcharge_eur,
        fields: p.fields,
        posts: p.posts
    }));

// Debug: log data size on module load
console.log('[TRENDSTYLE_PRICING] Loaded', trendstylePricingEntries.length, 'standard pricing entries');
console.log('[TRENDSTYLE_PRICING] Loaded', trendstylePlusPricingEntries.length, 'plus pricing entries');
if (trendstylePricingEntries.length > 0) {
    console.log('[TRENDSTYLE_PRICING] Sample standard entry:', trendstylePricingEntries[0]);
}
if (trendstylePlusPricingEntries.length > 0) {
    console.log('[TRENDSTYLE_PRICING] Sample plus entry:', trendstylePlusPricingEntries[0]);
}
