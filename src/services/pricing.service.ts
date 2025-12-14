import { supabase } from '../lib/supabase';

export interface PriceMatrixEntry {
    width_mm: number;
    projection_mm: number;
    price: number;
}

export const PricingService = {
    /**
     * Fetch pricing matrix for a specific product code (e.g. 'trendstyle', 'aufdachmarkise_zip')
     */
    async getPriceMatrix(productCode: string): Promise<PriceMatrixEntry[]> {
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

        // 2. Get Active Price Table
        // For now, simple logic: get the most recently created active table
        const { data: table } = await supabase
            .from('price_tables')
            .select('id')
            .eq('product_definition_id', product.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!table) {
            console.error(`No active price table for: ${productCode}`);
            return [];
        }

        // 3. Get Matrix Entries
        const { data } = await supabase
            .from('price_matrix_entries')
            .select('*')
            .eq('price_table_id', table.id);

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
