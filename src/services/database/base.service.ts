
import { supabase } from '../../lib/supabase';
import type { PricingResult } from '../../types';

export { supabase };

// Normalize pricing object to avoid undefined values in UI (e.g. toLocaleString on undefined)
export const normalizePricing = (pricing: Partial<PricingResult> | null | undefined): PricingResult => {
    const p = pricing || {};
    return {
        ...p,
        basePrice: Number(p.basePrice ?? 0),
        addonsPrice: Number(p.addonsPrice ?? 0),
        totalCost: Number(p.totalCost ?? 0),
        sellingPriceNet: Number(p.sellingPriceNet ?? 0),
        sellingPriceGross: Number(p.sellingPriceGross ?? 0),
        finalPriceNet: typeof p.finalPriceNet === 'number' ? p.finalPriceNet : undefined,
        marginPercentage: typeof p.marginPercentage === 'number' ? p.marginPercentage : 0,
        marginValue: Number(p.marginValue ?? 0),
    };
};
