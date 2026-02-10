import { supabase } from '../lib/supabase';

export interface ProductInfo {
    model_family: string;
    category: string;
    description?: string;
    available_widths: number[];
    available_depths: number[];
    min_price?: number;
    max_price?: number;
    image_url?: string;
}

export interface PriceInfo {
    model_family: string;
    width_mm: number;
    depth_mm: number;
    price_net: number;
    construction_type?: string;
    cover_type?: string;
}

/**
 * Service for AI Assistant to access real product data and pricing
 */
export class AIProductDataService {
    /**
     * Get all available product models with their details
     */
    static async getAvailableModels(): Promise<ProductInfo[]> {
        try {
            const { data, error } = await supabase
                .from('pricing_base')
                .select('model_family, construction_type, cover_type, width_mm, depth_mm, price_net')
                .order('model_family');

            if (error) throw error;

            // Group by model_family and aggregate data
            const modelsMap = new Map<string, ProductInfo>();

            data?.forEach(row => {
                const key = row.model_family;
                if (!modelsMap.has(key)) {
                    modelsMap.set(key, {
                        model_family: row.model_family,
                        category: this.categorizeModel(row.model_family),
                        available_widths: [],
                        available_depths: [],
                        image_url: this.getModelImage(row.model_family)
                    });
                }

                const model = modelsMap.get(key)!;
                if (row.width_mm && !model.available_widths.includes(row.width_mm)) {
                    model.available_widths.push(row.width_mm);
                }
                if (row.depth_mm && !model.available_depths.includes(row.depth_mm)) {
                    model.available_depths.push(row.depth_mm);
                }

                // Track min/max prices
                if (row.price_net) {
                    if (!model.min_price || row.price_net < model.min_price) {
                        model.min_price = row.price_net;
                    }
                    if (!model.max_price || row.price_net > model.max_price) {
                        model.max_price = row.price_net;
                    }
                }
            });

            // Sort dimensions
            modelsMap.forEach(model => {
                model.available_widths.sort((a, b) => a - b);
                model.available_depths.sort((a, b) => a - b);
            });

            return Array.from(modelsMap.values());
        } catch (error) {
            console.error('Error fetching product models:', error);
            return [];
        }
    }

    /**
     * Get price for specific model and dimensions
     */
    static async getPrice(modelFamily: string, widthMm: number, depthMm: number): Promise<PriceInfo | null> {
        try {
            const { data, error } = await supabase
                .from('pricing_base')
                .select('*')
                .eq('model_family', modelFamily)
                .eq('width_mm', widthMm)
                .eq('depth_mm', depthMm)
                .limit(1)
                .single();

            if (error) throw error;

            return {
                model_family: data.model_family,
                width_mm: data.width_mm,
                depth_mm: data.depth_mm,
                price_net: data.price_net,
                construction_type: data.construction_type,
                cover_type: data.cover_type
            };
        } catch (error) {
            console.error('Error fetching price:', error);
            return null;
        }
    }

    /**
     * Get all available sizes for a model
     */
    static async getAvailableSizes(modelFamily: string): Promise<{ width: number; depth: number; price: number }[]> {
        try {
            const { data, error } = await supabase
                .from('pricing_base')
                .select('width_mm, depth_mm, price_net')
                .eq('model_family', modelFamily)
                .order('width_mm')
                .order('depth_mm');

            if (error) throw error;

            return data?.map(row => ({
                width: row.width_mm,
                depth: row.depth_mm,
                price: row.price_net
            })) || [];
        } catch (error) {
            console.error('Error fetching sizes:', error);
            return [];
        }
    }

    /**
     * Get price range for a model
     */
    static async getPriceRange(modelFamily: string): Promise<{ min: number; max: number } | null> {
        try {
            const { data, error } = await supabase
                .from('pricing_base')
                .select('price_net')
                .eq('model_family', modelFamily);

            if (error) throw error;

            if (!data || data.length === 0) return null;

            const prices = data.map(r => r.price_net).filter(p => p != null);
            return {
                min: Math.min(...prices),
                max: Math.max(...prices)
            };
        } catch (error) {
            console.error('Error fetching price range:', error);
            return null;
        }
    }

    /**
     * Categorize model by name
     */
    private static categorizeModel(modelFamily: string): string {
        const name = modelFamily.toLowerCase();

        if (name.includes('topline') || name.includes('trendline') || name.includes('designline') || name.includes('orangeline')) {
            return 'Pergola Aluminiowa';
        }
        if (name.includes('skyline')) {
            return 'Zadaszenie Szklane';
        }
        if (name.includes('carport')) {
            return 'Wiata Garażowa';
        }
        if (name.includes('moderne') || name.includes('plasma') || name.includes('classic')) {
            return 'Ogrodzenie';
        }
        if (name.includes('zip')) {
            return 'Rolety ZIP';
        }
        if (name.includes('schiebe')) {
            return 'Ściany Przesuwne';
        }

        return 'Inne';
    }

    /**
     * Get model image URL
     */
    private static getModelImage(modelFamily: string): string {
        const name = modelFamily.toLowerCase();

        if (name.includes('topline-xl')) return '/images/models/toplinexl.webp';
        if (name.includes('topline')) return '/images/models/topline.webp';
        if (name.includes('trendline-plus')) return '/images/models/trendline-plus.jpg';
        if (name.includes('trendline')) return '/images/models/trendline.webp';
        if (name.includes('designline')) return '/images/models/designline.webp';
        if (name.includes('orangeline-plus')) return '/images/models/orangeline-plus.jpg';
        if (name.includes('orangeline')) return '/images/models/orangeline.jpg';
        if (name.includes('skyline')) return '/images/models/skyline.jpg';
        if (name.includes('carport')) return '/images/models/carport.jpg';
        if (name.includes('schiebe')) return '/images/models/schiebewand.jpg';

        return '/images/models/topline.webp'; // default
    }

    /**
     * Generate context for AI Assistant with current product data
     */
    static async generateProductContext(): Promise<string> {
        const models = await this.getAvailableModels();

        let context = "# Dostępne Produkty i Ceny\n\n";

        for (const model of models) {
            context += `## ${model.model_family} (${model.category})\n`;
            context += `- Dostępne szerokości: ${model.available_widths.map(w => `${w / 1000}m`).join(', ')}\n`;
            context += `- Dostępne głębokości: ${model.available_depths.map(d => `${d / 1000}m`).join(', ')}\n`;
            if (model.min_price && model.max_price) {
                context += `- Zakres cen: ${model.min_price.toFixed(2)} - ${model.max_price.toFixed(2)} EUR netto\n`;
            }
            context += `\n`;
        }

        return context;
    }

    /**
     * Get specific model details for prompts
     */
    static async getModelDetails(modelFamily: string): Promise<string> {
        const sizes = await this.getAvailableSizes(modelFamily);
        const priceRange = await this.getPriceRange(modelFamily);

        let details = `# ${modelFamily}\n\n`;
        details += `## Dostępne rozmiary i ceny:\n\n`;
        details += `| Szerokość | Głębokość | Cena netto (EUR) |\n`;
        details += `|-----------|-----------|------------------|\n`;

        sizes.forEach(size => {
            details += `| ${size.width / 1000}m | ${size.depth / 1000}m | ${size.price.toFixed(2)} |\n`;
        });

        if (priceRange) {
            details += `\n**Zakres cen**: ${priceRange.min.toFixed(2)} - ${priceRange.max.toFixed(2)} EUR netto\n`;
        }

        return details;
    }
}
