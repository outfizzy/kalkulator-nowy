import { useState, useEffect, useRef } from 'react';
import type { ProductConfig } from '../types';
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
            try {
                const snowZoneInfo = config.snowZone ? { id: config.snowZone, value: 0, description: '' } : undefined;

                // Margin 0.35 (35%) used in visualizer default
                const result = await PricingService.calculateOfferPrice(config, 0.35, snowZoneInfo, undefined); // No postal code -> no installation cost

                setPrice({
                    net: result.sellingPriceNet,
                    gross: result.sellingPriceGross
                });

                // Extract structural props
                setStructureConfig({
                    postCount: result.numberOfPosts,
                    fieldCount: result.numberOfFields
                });

            } catch (err) {
                console.error("Pricing calculation error:", err);
            }

            setLoading(false);
        }, 300);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [config]);

    return { price, loading, structureConfig };
};
