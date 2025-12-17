import { supabase } from '../lib/supabase';

export interface PriceMatrixEntry {
    width_mm: number;
    projection_mm: number;
    price: number;
    structure_price?: number;
    glass_price?: number;
    properties?: {
        rafters?: number;
        posts?: number;
        [key: string]: any;
    };
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

        // Ensure format
        return (data || []).map((d: any) => ({
            ...d,
            structure_price: d.structure_price || d.price,
            glass_price: d.glass_price || 0,
            properties: d.properties || {}
        }));
    },

    /**
     * Fetch component lists (tables tagged with table_type="component_list")
     */
    async getComponentLists(_contextAttributes: Record<string, string> = {}): Promise<{ table: PriceTable, entries: PriceMatrixEntry[] }[]> {
        // Fetch tables that have table_type = 'component_list'
        // Supabase JSONB filtering: attributes->>'table_type' = 'component_list'
        const { data: tables } = await supabase
            .from('price_tables')
            .select('*, product:product_definitions(name, code)')
            .eq('is_active', true)
        // Ideally we filter by JSON, but Supabase JS filter syntax for JSON is .filter('attributes->>table_type', 'eq', 'component_list')
        // or we fetch all active and filter in JS if volume is low.
        // Let's try explicit filter if possible, or JS filter.
        // .eq('attributes->>table_type', 'component_list') // This syntax might not work directly in all client versions without textSearch
        // Let's fetch all active and filter in JS for safety/speed unless volume is huge.

        if (!tables) return [];

        const componentTables = tables.filter(t => t.attributes && t.attributes['table_type'] === 'component_list');

        if (componentTables.length === 0) return [];

        // Fetch entries for these tables
        const tableIds = componentTables.map(t => t.id);
        const { data: entries } = await supabase
            .from('price_matrix_entries')
            .select('*')
            .in('price_table_id', tableIds);

        const entriesByTable = (entries || []).reduce((acc: any, curr: any) => {
            if (!acc[curr.price_table_id]) acc[curr.price_table_id] = [];
            acc[curr.price_table_id].push({
                ...curr,
                structure_price: curr.structure_price || curr.price,
                glass_price: curr.glass_price || 0,
                properties: curr.properties || {}
            });
            return acc;
        }, {});

        return componentTables.map(table => {
            const tableDiscount = table.attributes?.['discount'];
            const rawEntries = entriesByTable[table.id] || [];

            const processedEntries = rawEntries.map((entry: any) => {
                const price = entry.price || 0;
                const structure = entry.structure_price || price;
                const glass = entry.glass_price || 0;

                return {
                    ...entry,
                    // Apply discount if present
                    price: this.calculateDiscountedPrice(price, tableDiscount),
                    structure_price: this.calculateDiscountedPrice(structure, tableDiscount),
                    glass_price: this.calculateDiscountedPrice(glass, tableDiscount),
                    // Keep original for reference if needed
                    original_price: price,
                };
            });

            return {
                table,
                entries: processedEntries
            };
        });
    },

    async getTableConfig(productCode: string, contextAttributes: Record<string, string> = {}): Promise<{ config: any, attributes: any }> {
        // 1. Get Product Definition
        const { data: product } = await supabase
            .from('product_definitions')
            .select('id')
            .eq('code', productCode)
            .single();

        if (!product) return { config: {}, attributes: {} };

        // 2. Get All Active Tables for this Product
        const { data: tables } = await supabase
            .from('price_tables')
            .select('*')
            .eq('product_definition_id', product.id)
            .eq('is_active', true);

        if (!tables || tables.length === 0) return { config: {}, attributes: {} };

        // 3. Find Best Match Table (Reuse logic from getPriceMatrix)
        const bestMatch = tables.sort((a, b) => {
            const aKeys = Object.keys(a.attributes || {});
            const bKeys = Object.keys(b.attributes || {});
            return bKeys.length - aKeys.length;
        }).find(table => {
            const tableAttrs = table.attributes || {};
            const keys = Object.keys(tableAttrs);
            return keys.every(key => contextAttributes[key] == tableAttrs[key]);
        });

        if (!bestMatch) return { config: {}, attributes: {} };

        return { config: bestMatch.configuration || {}, attributes: bestMatch.attributes || {} };
    },

    /**
     * Calculates price after applying discount (supports simple "10" or cascaded "10+5+2")
     */
    calculateDiscountedPrice(price: number, discountStr?: string): number {
        if (!discountStr) return price; // Defensive check for empty discount string/number but strict types say string
        const dStr = String(discountStr).trim();
        if (!dStr) return price;

        try {
            const parts = dStr.split('+').map(p => parseFloat(p.trim()));
            let currentPrice = price;

            // Apply each discount sequentially (cascade)
            for (const d of parts) {
                if (!isNaN(d) && d > 0) {
                    currentPrice = currentPrice * (1 - (d / 100));
                }
            }
            return currentPrice;
        } catch (e) {
            console.error('Error calculating discount:', discountStr, e);
            return price;
        }
    },

    /**
     * Helper to find the correct price in a matrix for generic dimensions.
     * Uses "next size up" logic (standard for awnings/roofs).
     */
    calculateMatrixPrice(matrix: PriceMatrixEntry[], width: number, projection: number): number {
        const entry = this.findMatrixEntry(matrix, width, projection);
        if (!entry) return 0;

        // If modern split pricing exists, prefer sum of parts
        if (entry.structure_price !== undefined || entry.glass_price !== undefined) {
            return (Number(entry.structure_price) || 0) + (Number(entry.glass_price) || 0);
        }

        return Number(entry.price) || 0;
    },

    /**
    * Calculates extra costs (surcharges) based on table configuration and user selections.
    * Returns total surcharge value and detailed list of applied surcharges.
    */
    calculateSurcharges(
        basePrice: number,
        width: number,
        projection: number,
        tableConfig: any,
        selections: {
            mountingType?: string;
            roofType?: string;
            // Add other relevant selections here
        }
    ): { total: number, items: { name: string, price: number }[] } {
        let totalSurcharge = 0;
        const items: { name: string, price: number }[] = [];

        if (!tableConfig) {
            return { total: 0, items: [] };
        }

        // Helper to parse price string/number
        const normalizePrice = (val: any) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') return parseFloat(val.replace(',', '.')) || 0;
            return 0;
        };

        // 1. Free Standing Surcharge (Montaż Wolnostojący)
        if (selections.mountingType === 'free_standing' && tableConfig.free_standing_surcharge) {
            const rules = Array.isArray(tableConfig.free_standing_surcharge)
                ? tableConfig.free_standing_surcharge
                : [tableConfig.free_standing_surcharge]; // Handle single object legacy

            for (const rule of rules) {
                // Check logic (if rule matches context, e.g. width/projection range? For now assume global)
                let price = 0;
                const ruleValue = normalizePrice(rule.value);
                const ruleType = rule.type; // 'fixed', 'percentage', 'per_m2'

                if (ruleType === 'percentage' || (typeof rule.value === 'string' && rule.value.includes('%'))) {
                    const pct = ruleValue;
                    price = basePrice * (pct / 100);
                } else if (ruleType === 'per_m2') {
                    const area = (width * projection) / 1000000;
                    price = ruleValue * area;
                } else {
                    // Fixed
                    price = ruleValue;
                }

                if (price > 0) {
                    totalSurcharge += price;
                    items.push({ name: 'Dopłata: Wolnostojące', price });
                }
            }
        }

        // 2. Glass Surcharge (if distinct from base price)
        // Note: Usually matrix handles glass via 'glass_price' column. 
        // This is for EXTRA surcharges defined in config (e.g. "Szkło Mleczne +10%")
        if (selections.roofType === 'glass' && tableConfig.glass_surcharge) {
            // Similar logic if needed
        }

        return { total: totalSurcharge, items };
    },

    getDetailedPrice(matrix: PriceMatrixEntry[], width: number, projection: number) {
        const entry = this.findMatrixEntry(matrix, width, projection);
        if (!entry) return null;

        const structure = Number(entry.structure_price) || Number(entry.price) || 0;
        const glass = Number(entry.glass_price) || 0;
        const total = structure + glass;

        return {
            total,
            structure,
            glass,
            properties: entry.properties || {}
        };
    },

    findMatrixEntry(matrix: PriceMatrixEntry[], width: number, projection: number): PriceMatrixEntry | undefined {
        if (!matrix || matrix.length === 0) return undefined;

        // 1. Filter valid entries (must be capable of handling dimensions)
        const validEntries = matrix.filter(e =>
            e.width_mm >= width && e.projection_mm >= projection
        );

        if (validEntries.length === 0) return undefined;

        // 2. Sort by size (smallest area) to find "Next Size Up"
        // Heuristic: Width * Projection area, but prioritize Width fit first if Area is close
        validEntries.sort((a, b) => {
            const areaA = a.width_mm * a.projection_mm;
            const areaB = b.width_mm * b.projection_mm;
            return areaA - areaB;
        });

        return validEntries[0];
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
