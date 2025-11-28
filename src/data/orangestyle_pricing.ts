import orangelineData from './orangeline_full.json';

export interface OrangelineProduct {
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

export interface OrangelineData {
    system: string;
    currency: string;
    products: OrangelineProduct[];
}

// Export the data with proper typing
export const orangelinePricing: OrangelineData = orangelineData as OrangelineData;

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

// Direct export - use Orangeline zones as-is: "1", "1a&2", "2a&3"
export const orangestylePricing: PricingEntry[] = orangelinePricing.products.map(p => ({
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

// Debug: log data size on module load  
console.log('[ORANGESTYLE_PRICING] Loaded', orangestylePricing.length, 'pricing entries');
if (orangestylePricing.length > 0) {
    console.log('[ORANGESTYLE_PRICING] Sample entry:', orangestylePricing[0]);
    // Count by actual zone names
    const zoneCounts: Record<string, number> = {};
    orangestylePricing.forEach(p => {
        zoneCounts[p.snowZone] = (zoneCounts[p.snowZone] || 0) + 1;
    });
    console.log('[ORANGESTYLE_PRICING] Zone distribution:', zoneCounts);
}
