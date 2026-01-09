import { supabase } from '../lib/supabase';
import { PricingService } from './pricing.service';

export interface SimulationResult {
    offerId: string;
    offerNumber: string;
    customerName: string;
    oldPrice: number;
    newPrice: number;
    diffValue: number;
    diffPercent: number;
}

export interface SimulationReport {
    totalOffers: number;
    avgChangePercent: number;
    totalDiffValue: number;
    results: SimulationResult[];
}

export const SimulationService = {
    async simulateForTable(tableId: string, limit: number = 50): Promise<SimulationReport> {
        // 1. Get Table Info & Product
        const { data: table } = await supabase.from('price_tables').select('*, product:product_definitions(code, name, provider)').eq('id', tableId).single();
        if (!table) throw new Error('Table not found');

        const productCode = table.product.code;
        // const provider = table.product.provider;

        // 2. Get Matrix Entries for THIS table
        // 2. Get Matrix Entries for THIS table
        let matrix: any[] | null = null;
        const { data: standardMatrix } = await supabase.from('price_matrix_entries').select('*').eq('price_table_id', tableId);

        if (standardMatrix && standardMatrix.length > 0) {
            matrix = standardMatrix;
        } else {
            // Fallback: Check pricing_base
            const { data: manualData } = await supabase.from('pricing_base').select('*').eq('source_import_id', tableId);
            if (manualData && manualData.length > 0) {
                matrix = manualData.map(d => ({
                    width_mm: d.width_mm,
                    projection_mm: d.depth_mm,
                    price: d.price_upe_net_eur,
                    structure_price: d.price_upe_net_eur,
                    glass_price: 0
                }));
            }
        }

        if (!matrix || matrix.length === 0) throw new Error('Matrix empty (No data in standard or manual tables)');

        // 3. Get Supplier Costs (Simulate with current active costs? Or assume costs constant?)
        // Usually simulator checks impact of MATRIX change. Costs are external.
        // We should include current active costs to get a realistic 'Total Price' comparison.
        // const costs = await PricingService.getSupplierCosts(provider);

        // 4. Fetch Offers
        const { data: offersData } = await supabase
            .from('offers')
            .select('id, offer_number, customer_data, product_config, pricing')
            .eq('product_config->>modelId', productCode)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (!offersData || offersData.length === 0) {
            return { totalOffers: 0, avgChangePercent: 0, totalDiffValue: 0, results: [] };
        }

        const results: SimulationResult[] = [];

        for (const row of offersData) {
            const width = row.product_config.width;
            const projection = row.product_config.projection || row.product_config.depth;

            // Let's calculate the NEW Base Cost (Matrix + Supplier Costs).
            const matrixPrice = PricingService.calculateMatrixPrice(matrix, width, projection);

            // Extract OLD Base Cost info
            const oldBasePrice = row.pricing.basePrice || 0;
            const newBasePrice = matrixPrice; // Just matrix

            const diff = newBasePrice - oldBasePrice;
            const diffPercent = oldBasePrice > 0 ? (diff / oldBasePrice) * 100 : 0;

            results.push({
                offerId: row.id,
                offerNumber: row.offer_number,
                customerName: (row.customer_data as any)?.lastName || 'Klient',
                oldPrice: oldBasePrice,
                newPrice: newBasePrice,
                diffValue: diff,
                diffPercent: diffPercent
            });
        }

        const totalDiff = results.reduce((acc, r) => acc + r.diffValue, 0);
        const avgChange = results.reduce((acc, r) => acc + r.diffPercent, 0) / results.length;

        return {
            totalOffers: results.length,
            avgChangePercent: avgChange,
            totalDiffValue: totalDiff,
            results
        };
    }
};
