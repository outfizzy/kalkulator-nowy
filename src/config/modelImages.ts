/**
 * Product Model Images Configuration
 * Simple static mapping of model names to image URLs
 * 
 * Images are stored in /public/images/models/
 * Hero images sourced from aluxe.eu manufacturer product pages
 */

// Model hero image mapping - primary image for each model
export const MODEL_IMAGES: Record<string, string> = {
    // Roof Models - Capitalized
    'Trendline': '/images/models/trendline.jpg',
    'Trendline+': '/images/models/trendline.jpg',
    'Topline': '/images/models/topline.jpg',
    'Topline XL': '/images/models/topline.jpg',
    'Designline': '/images/models/designline.jpg',
    'Skyline': '/images/models/skyline.jpg',
    'Orangeline': '/images/models/orangeline.jpg',
    'Orangeline+': '/images/models/orangeline.jpg',
    'Ultraline': '/images/models/ultraline.jpg',
    'Carport': '/images/models/carport.jpg',
    'Pergola': '/images/models/pergola.jpg',
    'Pergola Deluxe': '/images/models/pergola-deluxe.jpg',

    // Roof Models - Lowercase (for modelId matching)
    'trendline': '/images/models/trendline.jpg',
    'trendline+': '/images/models/trendline.jpg',
    'topline': '/images/models/topline.jpg',
    'topline xl': '/images/models/topline.jpg',
    'designline': '/images/models/designline.jpg',
    'skyline': '/images/models/skyline.jpg',
    'orangeline': '/images/models/orangeline.jpg',
    'orangeline+': '/images/models/orangeline.jpg',
    'ultraline': '/images/models/ultraline.jpg',
    'carport': '/images/models/carport.jpg',
    'pergola': '/images/models/pergola.jpg',
    'pergola_bio': '/images/models/pergola.jpg',
    'pergola deluxe': '/images/models/pergola-deluxe.jpg',
    'pergola_deluxe': '/images/models/pergola-deluxe.jpg',
};

/**
 * Model gallery images — multiple images per model for the interactive offer
 * Each model has 2-3 images from aluxe.eu showing different angles/configurations
 */
export const MODEL_GALLERY: Record<string, string[]> = {
    'Trendline': [
        '/images/models/trendline.jpg',
        '/images/models/trendline-2.webp',
    ],
    'Trendline+': [
        '/images/models/trendline.jpg',
        '/images/models/trendline-2.webp',
    ],
    'Topline': [
        '/images/models/topline.jpg',
    ],
    'Topline XL': [
        '/images/models/topline.jpg',
    ],
    'Designline': [
        '/images/models/designline.jpg',
        '/images/models/designline-2.webp',
        '/images/models/designline-senkrechtmarkise.webp',
    ],
    'Skyline': [
        '/images/models/skyline.jpg',
        '/images/models/skyline-2.jpg',
        '/images/models/skyline-3.jpg',
    ],
    'Orangeline': [
        '/images/models/orangeline.jpg',
    ],
    'Orangeline+': [
        '/images/models/orangeline.jpg',
    ],
    'Ultraline': [
        '/images/models/ultraline.jpg',
    ],
    'Carport': [
        '/images/models/carport.jpg',
    ],
    'Pergola': [
        '/images/models/pergola.jpg',
    ],
    'Pergola Deluxe': [
        '/images/models/pergola-deluxe.jpg',
    ],
};

/**
 * Get gallery images for a model
 * @param modelId - Model ID (e.g., "Trendline")
 * @returns Array of image URLs, or single hero image fallback
 */
export function getModelGallery(modelId: string): string[] {
    if (MODEL_GALLERY[modelId]) return MODEL_GALLERY[modelId];
    
    // Try case-insensitive
    const key = Object.keys(MODEL_GALLERY).find(
        k => k.toLowerCase() === modelId?.toLowerCase()
    );
    if (key) return MODEL_GALLERY[key];

    // Fallback to single hero image
    const hero = getModelImage(modelId);
    return hero ? [hero] : [];
}

/**
 * Get image URL for a model
 */
export function getModelImage(modelName: string): string | undefined {
    if (MODEL_IMAGES[modelName]) return MODEL_IMAGES[modelName];

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
export const PLACEHOLDER_IMAGE = '/images/models/trendline.jpg';

/**
 * Model display name mapping
 */
const MODEL_DISPLAY_NAMES: Record<string, string> = {
    'Orangeline': 'Orangestyle',
    'Orangeline+': 'Orangestyle+',
    'Trendline': 'Trendstyle',
    'Trendline+': 'Trendstyle+',
    'Topline': 'Topstyle',
    'Topline XL': 'Topstyle XL',
    'Designline': 'Designline',
    'Ultraline': 'Ultrastyle',
    'Skyline': 'Skystyle',
    'Carport': 'Carport',
    'Pergola': 'Pergola',
    'Pergola Deluxe': 'Pergola Deluxe',
};

/**
 * Get the display name for a model (for UI presentation)
 */
export function getModelDisplayName(modelId: string): string {
    if (!modelId) return '';
    if (MODEL_DISPLAY_NAMES[modelId]) return MODEL_DISPLAY_NAMES[modelId];

    const key = Object.keys(MODEL_DISPLAY_NAMES).find(
        k => k.toLowerCase() === modelId.toLowerCase()
    );
    if (key) return MODEL_DISPLAY_NAMES[key];

    return modelId.charAt(0).toUpperCase() + modelId.slice(1);
}
