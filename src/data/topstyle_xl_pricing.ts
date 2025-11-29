import topstyleXlData from './topstyle_xl_full.json';

export interface TopstyleXlProduct {
    model: string;
    variant: string;
    cover_type: string;
    snow_load_zone: string;
    snow_load_limit_kN_m2: number;
    wind_load_zone: string;
    wind_load_factor: number;
    width_mm: number;
    depth_mm: number;
    price_frame_only_eur: number | null;
    price_polycarbonate_area_eur?: number | null;
    price_total_polycarbonate_clear_eur?: number | null;
    ir_gold_surcharge_eur?: number | null;
    glass_44_2_area_price_eur?: number | null;
    glass_44_2_total_price_eur?: number | null;
    glass_44_2_matt_surcharge_eur?: number | null;
    glass_55_2_surcharge_eur?: number | null;
    fields: number | null;
    posts: number | null;
    area_m2: number | null;
    markers: string;
}

export interface TopstyleXlData {
    system: string;
    currency: string;
    products: TopstyleXlProduct[];
}

// Export the data with proper typing
export const topstyleXlPricing: TopstyleXlData = topstyleXlData as TopstyleXlData;

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

// Map Topstyle XL data
export const topstyleXlPricingEntries: PricingEntry[] = topstyleXlPricing.products
    .filter(p => p.width_mm && p.depth_mm) // Filter out invalid entries
    .map(p => ({
        snowZone: p.snow_load_zone,
        width: p.width_mm,
        depth: p.depth_mm,
        // Use glass total price for glass, polycarbonate total for polycarbonate
        price: p.cover_type === 'glass'
            ? (p.glass_44_2_total_price_eur || 0)
            : (p.price_total_polycarbonate_clear_eur || 0),
        coverType: p.cover_type,
        irGoldSurcharge: p.ir_gold_surcharge_eur || undefined,
        // For glass: mat surcharge and sunscreen surcharge
        glass_44_2_surcharge_eur: p.glass_44_2_matt_surcharge_eur || undefined,
        glass_55_2_surcharge_eur: p.glass_55_2_surcharge_eur || undefined,
        fields: p.fields || 0,
        posts: p.posts || 0
    }));

// Debug: log data size on module load
console.log('[TOPSTYLE_XL_PRICING] Loaded', topstyleXlPricingEntries.length, 'pricing entries');
if (topstyleXlPricingEntries.length > 0) {
    console.log('[TOPSTYLE_XL_PRICING] Sample entry:', topstyleXlPricingEntries[0]);
}
