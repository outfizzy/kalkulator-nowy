import topstyleData from './topstyle_full.json';

export interface TopstyleProduct {
    model: string;
    variant: string;
    cover_type: string;
    snow_load_zone: string;
    snow_load_limit_kN_m2: number;
    wind_load_zone: string;
    wind_load_factor: number;
    width_mm: number;
    depth_mm: number;
    price_frame_only_eur: number;
    price_polycarbonate_area_eur: number;
    price_total_polycarbonate_clear_eur: number;
    ir_gold_surcharge_eur: number;
    glass_44_2_surcharge_eur?: number;
    glass_55_2_surcharge_eur?: number;
    fields: number;
    posts: number;
    area_m2: number;
    markers: string;
}

export interface TopstyleData {
    system: string;
    currency: string;
    products: TopstyleProduct[];
}

// Export the data with proper typing
export const topstylePricing: TopstyleData = topstyleData as TopstyleData;

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

// Map Topstyle data - use total polycarbonate price as base
export const topstylePricingEntries: PricingEntry[] = topstylePricing.products.map(p => ({
    snowZone: p.snow_load_zone,
    width: p.width_mm,
    depth: p.depth_mm,
    price: p.price_total_polycarbonate_clear_eur,
    coverType: p.cover_type,
    irGoldSurcharge: p.ir_gold_surcharge_eur,
    glass_44_2_surcharge_eur: p.glass_44_2_surcharge_eur,
    glass_55_2_surcharge_eur: p.glass_55_2_surcharge_eur,
    fields: p.fields,
    posts: p.posts
}));

// Debug: log data size on module load
console.log('[TOPSTYLE_PRICING] Loaded', topstylePricingEntries.length, 'pricing entries');
if (topstylePricingEntries.length > 0) {
    console.log('[TOPSTYLE_PRICING] Sample entry:', topstylePricingEntries[0]);
}
