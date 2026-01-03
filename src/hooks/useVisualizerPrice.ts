import { useState, useEffect, useRef } from 'react';
import type { ProductConfig } from '../types';
import { calculatePrice } from '../utils/pricing';
import { PricingService } from '../services/pricing.service';

export const useVisualizerPrice = (config: ProductConfig) => {
    const [price, setPrice] = useState({ net: 0, gross: 0 });
    const [structureConfig, setStructureConfig] = useState<{ postCount?: number; fieldCount?: number } | undefined>(undefined);
    const [loading, setLoading] = useState(false);

    // Type agnostic timeout ref
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setLoading(true);

        // Debounce calculation
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(async () => {
            let dbPriceFound = false;

            try {
                // 1. Try Database Lookup via PricingService (Centralized Logic)
                const attributes: Record<string, string> = {
                    snow_zone: '1', // Default or need access to it. Config param missing?
                    roof_type: config.roofType,
                    subtype: (config.roofType === 'glass' ? config.glassType : config.polycarbonateType) || 'standard',
                };

                // Note: config object in useVisualizerPrice MIGHT NOT have snowZone property?
                // Checking types.ts: ProductConfig interface HAS snowZone.
                // So we can use config.snowZone.
                if (config.snowZone) {
                    attributes.snow_zone = config.snowZone;
                }

                const matrix = await PricingService.getPriceMatrix(config.modelId, attributes);

                if (matrix && matrix.length > 0) {
                    // 1.5 Calculate Price using Service helper
                    const detailed = PricingService.getDetailedPrice(matrix, config.width, config.projection);

                    if (detailed && detailed.total > 0) {
                        const margin = 0.35; // Default visualizer margin
                        const net = detailed.total / (1 - margin);
                        setPrice({
                            net: Math.round(net),
                            gross: Math.round(net * 1.23) // Assuming 23% VAT
                        });

                        // Extract structural props
                        const structureConfig = detailed.properties ? {
                            postCount: detailed.properties.posts_count || detailed.properties.posts || undefined,
                            fieldCount: detailed.properties.fields_count || detailed.properties.fields || undefined, // Fallback for various naming conventions
                        } : undefined;

                        setStructureConfig(structureConfig);
                        dbPriceFound = true;
                    }
                }
            } catch (err) {
                console.error("DB Pricing error:", err);
            }

            // 2. Fallback to Legacy Static Logic
            if (!dbPriceFound) {
                try {
                    const result = calculatePrice(config, 0.35);
                    if (result) {
                        setPrice({
                            net: result.sellingPriceNet || 0,
                            gross: result.sellingPriceGross || 0
                        });
                    }
                } catch (err) {
                    console.error("Legacy Pricing error:", err);
                }
            }

            setLoading(false);
        }, 300);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [config]);

    return { price, loading, structureConfig };
};
