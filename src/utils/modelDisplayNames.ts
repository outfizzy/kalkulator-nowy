/**
 * Model Display Name Utility
 * Maps internal model IDs/codes to user-friendly display names
 * 
 * IMPORTANT: This only changes DISPLAY names.
 * Internal IDs, database queries, and logic remain unchanged.
 */

// Mapping of internal model ID patterns to display names
const MODEL_DISPLAY_MAP: Record<string, string> = {
    // Aluxe models - "line" → "style"
    'trendline': 'Trendstyle',
    'trendstyle': 'Trendstyle',
    'trendstyle_plus': 'Trendstyle+',
    'trendline_plus': 'Trendstyle+',
    'topline': 'Topstyle',
    'topstyle': 'Topstyle',
    'topline_xl': 'Topstyle XL',
    'topstyle_xl': 'Topstyle XL',
    'ultraline': 'Ultrastyle',
    'ultrastyle': 'Ultrastyle',
    'skyline': 'Skystyle',
    'skystyle': 'Skystyle',

    // Pergola models (no change needed)
    'pergola_bio': 'Pergola Bio',
    'pergola_deluxe': 'Pergola Deluxe',

    // Carport models (no change needed)
    'carport': 'Carport',

    // Add more as needed...
};

/**
 * Get display name for a model ID
 * @param modelId Internal model identifier
 * @returns User-friendly display name
 */
export function getDisplayModelName(modelId: string | undefined | null): string {
    if (!modelId) return '-';

    const normalizedId = modelId.toLowerCase().trim();

    // Check exact match first
    if (MODEL_DISPLAY_MAP[normalizedId]) {
        return MODEL_DISPLAY_MAP[normalizedId];
    }

    // Handle variations with suffixes
    for (const [key, displayName] of Object.entries(MODEL_DISPLAY_MAP)) {
        if (normalizedId.includes(key)) {
            return displayName;
        }
    }

    // Fallback: Apply general "line" → "style" replacement
    let displayName = modelId
        .replace(/line/gi, 'style')
        .replace(/_/g, ' ');

    // Capitalize first letter of each word
    displayName = displayName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

    return displayName;
}

/**
 * Format model name from product.modelId for PDF/display
 * Same as getDisplayModelName but handles common product object patterns
 */
export function formatProductModelName(product: { modelId?: string; model?: string; name?: string } | null): string {
    if (!product) return '-';

    const modelId = product.modelId || product.model || product.name || '';
    return getDisplayModelName(modelId);
}
