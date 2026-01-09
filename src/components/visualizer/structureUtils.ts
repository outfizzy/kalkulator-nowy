import type { ProductConfig } from '../../types';

export interface StructureSpecs {
    postCount: number;
    rafterCount: number;
    fieldCount: number;
}

export function getStructureSpecs(config: ProductConfig): StructureSpecs {
    // 1. Prefer values from Database Configuration (calculated by PricingService)
    if (config.numberOfPosts && config.numberOfFields) {
        return {
            postCount: config.numberOfPosts,
            fieldCount: config.numberOfFields,
            rafterCount: config.numberOfFields + 1
        };
    }

    // 2. Heuristic Fallback (Safeguard if DB calculation hasn't run or failed)
    // Assume max post spacing approx 3.5m for visual safety
    let posts = Math.max(2, Math.ceil(config.width / 3500) + 1);

    // Assume rafter spacing approx 900mm
    let fields = Math.max(2, Math.ceil(config.width / 900));

    // Special Rule for Topstyle standard:
    // If width <= 7000mm, force 2 posts (no middle post).
    if (config.modelId === 'topstyle' && config.width <= 7000) {
        posts = 2;
    }

    return {
        postCount: posts,
        fieldCount: fields,
        rafterCount: fields + 1
    };
}
