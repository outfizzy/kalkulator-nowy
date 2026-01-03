import { supabase } from '../lib/supabase';
import { calculatePrice as legacyCalculatePrice } from '../utils/pricing';
import { calculateInstallationCosts, calculateDistanceFromGubin } from '../utils/distanceCalculator';
import type { ProductConfig, PricingResult, SnowZoneInfo } from '../types';

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

export interface SupplierCost {
    id: string;
    provider: string;
    cost_name: string;
    value: number;
    cost_type: 'fixed' | 'percentage';
    is_active: boolean;
}

export interface TableConfiguration {
    free_standing_surcharge?: { width: number; price: number, value?: number, type?: string }[];
    image_url?: string;
    [key: string]: any;
}

export interface PriceTableAttributes {
    cover_image?: string;
    discount?: string;
    provider?: string;
    [key: string]: string | undefined;
}

export interface PriceTable {
    id: string;
    name: string;
    product_definition_id: string;
    is_active: boolean;
    type?: 'matrix' | 'simple' | 'component';
    attributes: PriceTableAttributes;
    configuration?: TableConfiguration;
    variant_config?: {
        roofType: 'glass' | 'polycarbonate' | 'other';
        snowZone?: string;
        subtype?: string;
    };
    data?: any; // JSONB
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
            // console.warn(`No active price tables for: ${productCode}`);
            return [];
        }

        // 3. Find Best Match Table
        // Logic: Find table where ALL table attributes match the contextAttributes.
        // Priority: Variant Config matches specified > Attributes match specified.

        const bestMatch = (tables as PriceTable[]).sort((a, b) => {
            // Sort by specificity (number of conditions matched)
            const aVC = a.variant_config ? Object.keys(a.variant_config).length : 0;
            const bVC = b.variant_config ? Object.keys(b.variant_config).length : 0;
            const aAttrs = a.attributes ? Object.keys(a.attributes).length : 0;
            const bAttrs = b.attributes ? Object.keys(b.attributes).length : 0;
            return (bVC + bAttrs) - (aVC + aAttrs);
        }).find(table => {
            // A. Check Variant Config (If present in table)
            if (table.variant_config) {
                const vc = table.variant_config;
                // Roof Type
                if (vc.roofType && vc.roofType !== contextAttributes.roofType) return false;

                // Snow Zone (Optional match, but if defined in Table, must match Context)
                if (vc.snowZone && contextAttributes.snowZone &&
                    vc.snowZone !== contextAttributes.snowZone) return false;

                // Subtype (Partial Match Logic)
                if (vc.subtype && contextAttributes.subtype) {
                    const tSub = vc.subtype.toLowerCase();
                    const cSub = contextAttributes.subtype.toLowerCase();
                    if (!tSub.includes(cSub) && !cSub.includes(tSub)) return false;
                } else if (vc.subtype && !contextAttributes.subtype) {
                    // Table specific to subtype, but none provided -> Fail
                    return false;
                }
            }

            // B. Check Legacy Attributes (Exact Match)
            const tableAttrs = table.attributes || {};
            const keys = Object.keys(tableAttrs);
            // Ignore keys handled by variant_config if duplicates exist, but generally attributes are generic
            return keys.every(key => contextAttributes[key] == tableAttrs[key]);
        });

        if (!bestMatch) {
            // console.warn(`No matching table found for attributes:`, contextAttributes);
            return [];
        }

        console.log(`[Pricing] Selected Table: ${bestMatch.name}`);

        // 4. Get Matrix Entries
        // Optimization: If table has `data` (JSON matrix), use it directly instead of entries table
        if (bestMatch.data) {
            const matrix = bestMatch.data;
            // Convert JSON format (headers/rows) to flat entries for compatibility
            const entries: PriceMatrixEntry[] = [];
            matrix.rows.forEach((row: any) => {
                matrix.headers.forEach((width: number, index: number) => {
                    const price = row.prices[index];
                    if (price > 0) {
                        entries.push({
                            width_mm: width,
                            projection_mm: row.projection,
                            price: price,
                            structure_price: price, // Simple assumption for bulk import
                            glass_price: 0
                        });
                    }
                });
            });
            return entries;
        }

        const { data } = await supabase
            .from('price_matrix_entries')
            .select('*')
            .eq('price_table_id', bestMatch.id);

        return (data || []).map((d: any) => ({
            ...d,
            structure_price: d.structure_price || d.price,
            glass_price: d.glass_price || 0,
            properties: d.properties || {}
        }));
    },

    /**
     * Unified Calculation Method
     * Uses DB Matrix if available, otherwise falls back to legacy JSON calculator.
     */
    async calculateOfferPrice(
        product: ProductConfig,
        marginPercentage: number,
        snowZone?: SnowZoneInfo,
        postalCode?: string
    ): Promise<PricingResult> {
        // 1. Prepare Attributes
        const attributes: Record<string, string> = {};
        attributes['snow_zone'] = snowZone?.id ? String(snowZone.id) : '';
        attributes['roof_type'] = product.roofType;
        // Calculate subtype based on roof type
        const computedSubtype = product.roofType === 'glass'
            ? product.glassType
            : product.polycarbonateType || 'standard';

        if (computedSubtype) attributes['subtype'] = computedSubtype;

        // 2. Try DB Lookup
        let basePrice = 0;
        let dbPriceFound = false;
        let matchedEntryProperties: PriceMatrixEntry['properties'] = {};

        // Find configuration for surcharges
        let tableConfig: TableConfiguration | null = null;

        try {
            // Try to find generic table config first (includes surcharges)
            const configResult = await this.getTableConfig(product.modelId, attributes);
            tableConfig = configResult.config;

            // Existing logic uses getPriceMatrix which returns Entries, but we want the detailed object
            // Use the new getDetailedPrice logic implicitly via full search if we want robust data
            // But let's stick to getPriceMatrix which re-implements the search logic effectively
            // BUT getPriceMatrix returns array of entries. We need to find the specific ONE entry.
            const matrix = await this.getPriceMatrix(product.modelId, attributes);

            if (matrix && matrix.length > 0) {
                // Determine Entry
                const detailed = this.getDetailedPrice(matrix, product.width, product.projection);
                if (detailed) {
                    basePrice = detailed.total;
                    matchedEntryProperties = detailed.properties;
                    dbPriceFound = true;
                    console.log(`[PricingService] Used DB Price: ${basePrice}`);
                }
            }
        } catch (e) {
            console.error("DB Price Lookup Failed", e);
        }

        // 3. Fallback to Legacy if no DB price
        if (!dbPriceFound) {
            console.log(`[PricingService] Fallback to Legacy Pricing for ${product.modelId}`);
            // Note: This returns a full result, we extract basePrice from it?
            // Actually legacyCalculatePrice returns PricingResult.
            // If we use legacy, we might want to return it directly BUT we miss out on new surcharge logic if mixed.
            // Assuming legacy covers everything for legacy models.
            const legacyResult = legacyCalculatePrice(product, marginPercentage, snowZone, postalCode);
            // If we want to return mostly legacy result but enriched:
            return legacyResult;
        }

        // 4. Calculate Full Offer (Result Builder)
        // Accessories
        let accessoriesTotal = 0;
        const accessoriesList = product.selectedAccessories || [];
        accessoriesList.forEach(acc => {
            accessoriesTotal += acc.price * acc.quantity;
        });

        // Custom Items
        let customItemsTotal = 0;
        const customItems = product.customItems || [];
        customItems.forEach(item => {
            customItemsTotal += item.price * item.quantity;
        });

        // Add-ons
        let addonsTotal = 0;
        const addons = product.addons || [];
        addons.forEach(addon => {
            addonsTotal += addon.price;
        });

        // Surcharges
        const surcharges = this.calculateSurcharges(
            basePrice,
            product.width,
            product.projection,
            tableConfig,
            {
                roofType: product.roofType,
                mountingType: product.installationType
            }
        );

        if (surcharges.total > 0) {
            basePrice += surcharges.total;
        }

        // Installation
        const distance = calculateDistanceFromGubin(postalCode || '');
        const installation = calculateInstallationCosts(product.installationDays || 1, distance || 0);

        const totalCost = basePrice + accessoriesTotal + customItemsTotal + addonsTotal + (installation.dailyTotal || 0) + (installation.travelCost || 0);

        // Selling Price
        const marginDecimal = marginPercentage / 100;
        const sellingPriceNet = totalCost / (1 - marginDecimal);
        const sellingPriceGross = sellingPriceNet * 1.19;
        const marginValue = sellingPriceNet - totalCost;

        const result: PricingResult = {
            basePrice: basePrice,
            addonsPrice: addonsTotal,
            customItemsPrice: customItemsTotal,
            totalCost: totalCost,
            marginPercentage: marginPercentage,
            marginValue: marginValue,
            sellingPriceNet: sellingPriceNet,
            sellingPriceGross: sellingPriceGross,
            installationCosts: installation,
            numberOfFields: matchedEntryProperties?.fields_count || 0,
            numberOfPosts: matchedEntryProperties?.posts_count || 0,

            // Debug info
            _debuginfo: {
                foundInDb: dbPriceFound,
                matrixProperties: matchedEntryProperties,
                surcharges: surcharges.items
            }
        };

        return result;
    },

    /**
     * Fetch component lists (tables tagged with table_type="component_list")
     */
    async getComponentLists(_contextAttributes: Record<string, string> = {}): Promise<{ table: PriceTable, entries: PriceMatrixEntry[] }[]> {
        // _contextAttributes is currently unused but kept for future filtering if needed
        const { data: tables } = await supabase
            .from('price_tables')
            .select('*, product:product_definitions(name, code)')
            .eq('is_active', true);

        if (!tables) return [];

        const componentTables = (tables as PriceTable[]).filter(t =>
            (t.attributes && t.attributes['table_type'] === 'component_list') ||
            t.type === 'simple' ||
            t.type === 'component'
        );

        if (componentTables.length === 0) return [];

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
                    price: this.calculateDiscountedPrice(price, tableDiscount),
                    structure_price: this.calculateDiscountedPrice(structure, tableDiscount),
                    glass_price: this.calculateDiscountedPrice(glass, tableDiscount),
                    original_price: price,
                };
            });

            return {
                table,
                entries: processedEntries
            };
        });
    },

    /**
     * Fetch all generic price matrices (type "matrix").
     * Used for loading DB-based prices for Keilfenster, Walls, etc.
     */
    async getMatrixTables(): Promise<{ table: PriceTable, entries: PriceMatrixEntry[] }[]> {
        const { data: tables } = await supabase
            .from('price_tables')
            .select('*, product:product_definitions(name, code)')
            .eq('is_active', true)
            .eq('type', 'matrix');

        if (!tables || tables.length === 0) return [];

        const tableIds = tables.map(t => t.id);
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

        // Cast to PriceTable[] to satisfy TS
        const castTables = tables as unknown as PriceTable[];

        return castTables.map(table => ({
            table,
            entries: entriesByTable[table.id] || []
        }));
    },

    async getTableConfig(productCode: string, contextAttributes: Record<string, string> = {}): Promise<{ config: TableConfiguration, attributes: PriceTableAttributes }> {
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
        const bestMatch = (tables as PriceTable[]).sort((a, b) => {
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
        if (!discountStr) return price;
        const dStr = String(discountStr).trim();
        if (!dStr) return price;

        try {
            const parts = dStr.split('+').map(p => parseFloat(p.trim()));
            let currentPrice = price;

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
        tableConfig: TableConfiguration | null,
        selections: {
            mountingType?: string;
            roofType?: string;
        }
    ): { total: number, items: { name: string, price: number }[] } {
        let totalSurcharge = 0;
        const items: { name: string, price: number }[] = [];

        if (!tableConfig) {
            return { total: 0, items: [] };
        }

        const normalizePrice = (val: any) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') return parseFloat(val.replace(',', '.')) || 0;
            return 0;
        };

        // 1. Free Standing Surcharge
        if (selections.mountingType === 'free_standing' && tableConfig.free_standing_surcharge) {
            const rules = Array.isArray(tableConfig.free_standing_surcharge)
                ? tableConfig.free_standing_surcharge
                : [tableConfig.free_standing_surcharge];

            for (const rule of rules) {
                let price = 0;
                // @ts-ignore - legacy support
                const ruleValue = normalizePrice(rule.value || rule.price);
                // @ts-ignore
                const ruleType = rule.type;

                if (ruleType === 'percentage' || (typeof ruleValue === 'string' && (ruleValue as string).includes('%'))) {
                    const pct = ruleValue;
                    price = basePrice * (pct / 100);
                } else if (ruleType === 'per_m2') {
                    const area = (width * projection) / 1000000;
                    price = ruleValue * area;
                } else {
                    price = ruleValue;
                }

                if (price > 0) {
                    totalSurcharge += price;
                    items.push({ name: 'Dopłata: Wolnostojące', price });
                }
            }
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

        const validEntries = matrix.filter(e =>
            e.width_mm >= width && e.projection_mm >= projection
        );

        if (validEntries.length === 0) return undefined;

        validEntries.sort((a, b) => {
            const areaA = a.width_mm * a.projection_mm;
            const areaB = b.width_mm * b.projection_mm;
            // Prefer width fit first? Standard logic is usually Area.
            // If area is same, prefer smaller width diff? 
            // For now Area is fine.
            return areaA - areaB;
        });

        return validEntries[0];
    },

    async getSupplierCosts(provider: string): Promise<SupplierCost[]> {
        const { data } = await supabase
            .from('supplier_costs')
            .select('*')
            .eq('provider', provider)
            .eq('is_active', true);

        // Cast or map to interface
        return (data || []).map((d: any) => ({
            id: d.id,
            provider: d.provider,
            cost_name: d.cost_name || d.name, // Fallback
            value: d.value,
            cost_type: d.cost_type,
            is_active: d.is_active
        }));
    },

    async getAdditionalCosts(productCode: string, contextAttributes: Record<string, string> = {}): Promise<AdditionalCost[]> {
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

        return data.filter(cost => {
            const costAttrs = cost.attributes || {};
            const keys = Object.keys(costAttrs);
            return keys.every(key => contextAttributes[key] == costAttrs[key]);
        });
    },

    calculateTotalWithCosts(basePrice: number, costs: SupplierCost[]): { total: number, breakdown: any[] } {
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
    },
    async getProductImage(productCode: string, contextAttributes: Record<string, string> = {}): Promise<string | null> {
        // reuse table config lookup logic to find best matching table
        const { config, attributes } = await this.getTableConfig(productCode, contextAttributes);

        // 1. Check if table attributes has cover_image
        if (attributes?.cover_image) return attributes.cover_image;

        // 2. Check if config has image (legacy?)
        if (config?.image_url) return config.image_url;

        return null;
    }
};

