import { supabase } from '../lib/supabase';

export interface PriceMatrixEntry {
    width_mm: number;
    projection_mm: number;
    price: number;
}

export interface PriceTable {
    id: string;
    name: string;
    product_definition_id: string;
    is_active: boolean;
    attributes: Record<string, string>; // e.g. { "snow_zone": "3" }
}

export interface AdditionalCost {
    id: string;
    name: string;
    cost_type: 'fixed' | 'per_m' | 'per_item' | 'percentage';
    value: number;
    attributes: Record<string, string>;
}

export const PricingService = {
    /**
     * Fetch pricing matrix for a specific product code, considering attributes (e.g. Snow Zone)
     */
    async getPriceMatrix(productCode: string, contextAttributes: Record<string, string> = {}): Promise<PriceMatrixEntry[]> {
        // 1. Get Product Definition ID
        const { data: product } = await supabase
            .from('product_definitions')
            .select('id')
            .eq('code', productCode)
            .single();

        if (!product) {
            console.error(`Product not found: ${productCode}`);
            return [];
        }

        // 2. Get All Active Price Tables for Product
        const { data: tables } = await supabase
            .from('price_tables')
            .select('*')
            .eq('product_definition_id', product.id)
            .eq('is_active', true);

        if (!tables || tables.length === 0) {
            console.error(`No active price tables for: ${productCode}`);
            return [];
        }

        // 3. Find Best Match Table
        // Logic: Find table where ALL table attributes match the contextAttributes.
        // If multiple match, pick the most specific one (most attributes).
        // If none match specific attributes, fall back to "Base" table (empty attributes).

        const bestMatch = tables.sort((a, b) => {
            // Sort by number of attributes (descending) to prioritize more specific tables
            const aKeys = Object.keys(a.attributes || {});
            const bKeys = Object.keys(b.attributes || {});
            return bKeys.length - aKeys.length;
        }).find(table => {
            const tableAttrs = table.attributes || {};
            const keys = Object.keys(tableAttrs);

            // Check if all table attributes are present and matching in context
            return keys.every(key => contextAttributes[key] == tableAttrs[key]);
        });

        if (!bestMatch) {
            console.warn(`No matching table found for attributes:`, contextAttributes);
            return [];
        }

        console.log(`[Pricing] Selected Table: ${bestMatch.name}`, bestMatch.attributes);

        // 4. Get Matrix Entries for the matched table
        const { data } = await supabase
            .from('price_matrix_entries')
            .select('*')
            .eq('price_table_id', bestMatch.id);

        return data || [];
    },

    /**
     * Helper to find the correct price in a matrix for generic dimensions.
     * Uses "next size up" logic (standard for awnings/roofs).
     */
    calculateMatrixPrice(matrix: PriceMatrixEntry[], width: number, projection: number): number {
        if (!matrix || matrix.length === 0) return 0;

        // 1. Filter valid entries (must be capable of handling dimensions)
        const validEntries = matrix.filter(e =>
            e.width_mm >= width && e.projection_mm >= projection
        );

        if (validEntries.length === 0) return 0;

        // 2. Sort by size (smallest area) to find "Next Size Up"
        // Heuristic: Width * Projection area
        validEntries.sort((a, b) => (a.width_mm * a.projection_mm) - (b.width_mm * b.projection_mm));

        return validEntries[0]?.price || 0;
    },

    async getSupplierCosts(provider: string): Promise<any[]> {
        const { data } = await supabase
            .from('supplier_costs')
            .select('*')
            .eq('provider', provider)
            .eq('is_active', true);
        return data || [];
    },

    async getAdditionalCosts(productCode: string, contextAttributes: Record<string, string> = {}): Promise<AdditionalCost[]> {
        // Get Product ID
        const { data: product } = await supabase
            .from('product_definitions')
            .select('id')
            .eq('code', productCode)
            .single();

        if (!product) return [];

        const { data } = await supabase
            .from('additional_costs')
            .select('*')
            .eq('product_definition_id', product.id)
            .eq('is_active', true);

        if (!data) return [];

        // Filter costs that apply to current context
        return data.filter(cost => {
            const costAttrs = cost.attributes || {};
            const keys = Object.keys(costAttrs);
            // If cost has condition (e.g. post_height=3000), context must match
            return keys.every(key => contextAttributes[key] == costAttrs[key]);
        });
    },

    calculateTotalWithCosts(basePrice: number, costs: any[]): { total: number, breakdown: any[] } {
        let total = basePrice;
        const breakdown = [{ name: 'Cena Bazowa', value: basePrice }];

        costs.forEach(cost => {
            let costValue = 0;
            if (cost.cost_type === 'fixed') {
                costValue = parseFloat(cost.value.toString());
            } else if (cost.cost_type === 'percentage') {
                costValue = basePrice * (parseFloat(cost.value.toString()) / 100);
            }

            if (costValue > 0) {
                total += costValue;
                breakdown.push({ name: cost.cost_name, value: costValue });
            }
        });

        return { total, breakdown };
    }
};
