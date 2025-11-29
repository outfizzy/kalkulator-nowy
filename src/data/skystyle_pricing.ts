import skystyleData from './skystyle_full.json';

export interface SkystyleProduct {
    system: string;
    model: string;
    mounting_type: string;
    cover_type: string;
    snow_load_zone: string;
    snow_load_limit_kN_m2: number;
    wind_load_zone: string;
    wind_load_factor: number;
    width_mm: number;
    depth_mm: number;
    price_frame_only_eur: number;
    base_glass_type: string;
    price_base_glass_area_or_sum_eur: number;
    price_total_base_glass_eur: number;
    alt_glass_type: string;
    surcharge_alt_glass_eur: number;
    surcharge_sun_protection_glass_eur: number;
    fields: number;
    posts: number;
    area_m2: number;
    markers: string;
}

export interface SkystyleData {
    system: string;
    currency: string;
    products: SkystyleProduct[];
}

// Export the data with proper typing
export const skystylePricing: SkystyleData = skystyleData as SkystyleData;

// Export for backward compatibility with existing code
export interface PricingEntry {
    snowZone: string;
    width: number;
    depth: number;
    price: number;
    coverType: string;
    mountingType: string;
    glassType: string;
    glass_matt_surcharge_eur?: number;
    glass_55_2_surcharge_eur?: number;
    glass_sun_protection_surcharge_eur?: number;
    fields: number;
    posts: number;
}

// Map Skystyle data - only glass roof
export const skystylePricingEntries: PricingEntry[] = skystylePricing.products
    .filter(p => p.width_mm && p.depth_mm)
    .map(p => ({
        snowZone: p.snow_load_zone,
        width: p.width_mm,
        depth: p.depth_mm,
        price: p.price_total_base_glass_eur,
        coverType: 'glass',
        // Normalizujemy typ montażu do wartości używanych w konfiguratorze
        // (wall-mounted | freestanding)
        mountingType: p.mounting_type === 'wall' ? 'wall-mounted' : 'freestanding',
        glassType: p.base_glass_type,
        // Matt surcharge if alt glass is matt
        glass_matt_surcharge_eur: p.alt_glass_type === '44.2_matt' ? p.surcharge_alt_glass_eur : undefined,
        // 55.2 surcharge if alt glass is 55.2
        glass_55_2_surcharge_eur: p.alt_glass_type === '55.2' ? p.surcharge_alt_glass_eur : undefined,
        // Sun protection surcharge
        glass_sun_protection_surcharge_eur: p.surcharge_sun_protection_glass_eur || undefined,
        fields: p.fields || 0,
        posts: p.posts || 0
    }));

// Debug: log data size on module load
console.log('[SKYSTYLE_PRICING] Loaded', skystylePricingEntries.length, 'pricing entries');
if (skystylePricingEntries.length > 0) {
    console.log('[SKYSTYLE_PRICING] Sample entry:', skystylePricingEntries[0]);
}
