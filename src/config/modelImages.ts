/**
 * Product Model Images Configuration
 * Simple static mapping of model names to image URLs
 * 
 * Images are stored in /public/images/models/
 * To add a new image: put the file in that folder and add entry here
 */

// Model image mapping - matches actual files in public/images/models/
// Include both capitalized and lowercase variants for flexible matching
export const MODEL_IMAGES: Record<string, string> = {
    // Roof Models - Capitalized
    'Trendline': '/images/models/trendline.webp',
    'Trendline+': '/images/models/trendline-plus.jpg',
    'Topline': '/images/models/topline.webp',
    'Topline XL': '/images/models/toplinexl.webp',
    'Designline': '/images/models/designline.webp',
    'Skyline': '/images/models/skyline.jpg',
    'Orangeline': '/images/models/orangeline.jpg',
    'Orangeline+': '/images/models/orangeline-plus.jpg',
    'Carport': '/images/models/carport.jpg',

    // Roof Models - Lowercase (for modelId matching)
    'trendline': '/images/models/trendline.webp',
    'trendline+': '/images/models/trendline-plus.jpg',
    'topline': '/images/models/topline.webp',
    'topline xl': '/images/models/toplinexl.webp',
    'designline': '/images/models/designline.webp',
    'skyline': '/images/models/skyline.jpg',
    'orangeline': '/images/models/orangeline.jpg',
    'orangeline+': '/images/models/orangeline-plus.jpg',
    'carport': '/images/models/carport.jpg',
};

/**
 * Get image URL for a model
 * @param modelName - Name of the model (e.g., "Trendline", "Topline")
 * @returns Image URL or undefined if not found
 */
export function getModelImage(modelName: string): string | undefined {
    // Direct match
    if (MODEL_IMAGES[modelName]) {
        return MODEL_IMAGES[modelName];
    }

    // Try to find partial match (case insensitive)
    const normalizedName = modelName.toLowerCase().trim();
    const key = Object.keys(MODEL_IMAGES).find(k => {
        const normalizedKey = k.toLowerCase();
        return normalizedName.includes(normalizedKey) || normalizedKey.includes(normalizedName);
    });

    return key ? MODEL_IMAGES[key] : undefined;
}

/**
 * Check if a model has an image configured
 */
export function hasModelImage(modelName: string): boolean {
    return !!getModelImage(modelName);
}

// Default placeholder image
export const PLACEHOLDER_IMAGE = '/images/models/placeholder.jpg';
