import type { ProductConfig } from '../../types';

export interface StructureSpecs {
    postCount: number;
    rafterCount: number;
    fieldCount: number;
}

/**
 * Model-specific max span on 2 posts (mm).
 * Based on aluxe.eu/de technical specs & Dachrechner service data.
 * Beyond this width a middle post (3 posts total) is required.
 */
const MODEL_MAX_SPAN_2_POSTS: Record<string, number> = {
    // Orangestyle family — max 4000mm on 2 posts (glass)
    orangestyle: 4000,
    orangestyle_plus: 4000,
    // Trendstyle family — max 6000×3000mm on 2 posts
    trendstyle: 6000,
    trendstyle_plus: 6000,
    // Topstyle — max 6000×4500mm on 2 posts
    topstyle: 6000,
    // Topstyle XL — max 7000×4000mm on 2 posts
    topstyle_xl: 7000,
    // Ultraline — max 7000×5000mm on 2 posts
    ultraline_classic: 7000,
    ultraline_style: 7000,
    // Skyline — max 6000mm on 2 posts
    skyline: 6000,
    // Designline (Schiebedach) — max 6000mm
    designline: 6000,
    // Carport — max 6000mm on 2 posts
    carport: 6000,
    // Pergola — max 7000mm on 2 posts
    pergola_bio: 7000,
    pergola_deluxe: 7000,
};

/**
 * Post width (mm) per model — determines visual post thickness
 */
const MODEL_POST_WIDTH: Record<string, number> = {
    orangestyle: 110,
    orangestyle_plus: 110,
    trendstyle: 110,
    trendstyle_plus: 110,
    topstyle: 149,
    topstyle_xl: 196,
    ultraline_classic: 149,
    ultraline_style: 149,
    skyline: 149,
    designline: 149,
    carport: 110,
    pergola_bio: 149,
    pergola_deluxe: 149,
};

/**
 * Rafter spacing (mm) per model — varies by profile strength
 */
const MODEL_RAFTER_SPACING: Record<string, number> = {
    orangestyle: 600,       // Smaller profiles, tighter spacing
    orangestyle_plus: 600,
    trendstyle: 750,
    trendstyle_plus: 750,
    topstyle: 900,
    topstyle_xl: 900,
    ultraline_classic: 900,
    ultraline_style: 900,
    skyline: 900,
    designline: 900,
    carport: 900,
    pergola_bio: 800,
    pergola_deluxe: 800,
};

export function getStructureSpecs(config: ProductConfig): StructureSpecs {
    // 1. Prefer values from Database Configuration (calculated by PricingService)
    if (config.numberOfPosts && config.numberOfFields) {
        return {
            postCount: config.numberOfPosts,
            fieldCount: config.numberOfFields,
            rafterCount: config.numberOfFields + 1
        };
    }

    // 2. Model-aware calculation
    const modelId = config.modelId?.toLowerCase() || '';
    const maxSpan = MODEL_MAX_SPAN_2_POSTS[modelId] || 3500;
    const rafterSpacing = MODEL_RAFTER_SPACING[modelId] || 900;

    // Post calculation: 2 posts if within max span, add more for wider structures
    let posts: number;
    if (config.width <= maxSpan) {
        posts = 2; // Standard: 2 end posts
    } else {
        // Need middle post(s): each additional span segment needs an extra post
        const additionalSpans = Math.ceil((config.width - maxSpan) / maxSpan);
        posts = 2 + additionalSpans;
    }

    // Allow manual override
    if (config.customPostCount) {
        posts = config.customPostCount;
    }

    // Fields (rafter sections) based on model-specific spacing
    const fields = Math.max(2, Math.ceil(config.width / rafterSpacing));

    return {
        postCount: posts,
        fieldCount: fields,
        rafterCount: fields + 1
    };
}

/**
 * Get the post width in mm for a model ID
 */
export function getModelPostWidth(modelId: string): number {
    return MODEL_POST_WIDTH[modelId?.toLowerCase()] || 110;
}
