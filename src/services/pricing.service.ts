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
     * Fetch active product definitions
     */
    /**
     * getProducts now returns ALL products (for admin/debug).
     * Use getMainProducts for the Calculator UI.
     */
    async getProducts(): Promise<{ id: string, code: string, name: string, description: string, category: string }[]> {
        const { data } = await supabase
            .from('product_definitions')
            .select('id, code, name, description, category')
            .order('name');
        return data || [];
    },

    /**
     * Fetches only the main models for the Product Configurator.
     * Filters out accessories (Markisen, Walls) and sorts by priority.
     */
    async getMainProducts(): Promise<{ id: string, code: string, name: string, description: string, category: string }[]> {
        // Fetch ALL products first, then filter in memory to ensure exact matching
        const { data } = await supabase
            .from('product_definitions')
            .select('id, code, name, description, category')
            .in('category', ['roof', 'carport']); // Only Roofs and Carports

        if (!data) return [];

        // STRICT WHITELIST
        // Keys: The start of the 'code' in DB.
        // Values: The 'Display Name' requested by user.
        const whitelistMap: Record<string, string> = {
            'orangestyle': 'Orangestyle (Orangeline)',
            'trendstyle': 'Trendstyle (Trendline)',
            'topstyle': 'Topstyle',
            'ultrastyle': 'Ultrastyle (Ultraline)',
            'skystyle': 'Skystyle (Skyline)',
            'carport': 'Carport'
        };

        const filtered = data.filter(p => {
            // Check if product code starts with any of the whitelist keys
            // AND explicitly exclude accessories if they slip through category check
            if (p.code.includes('markise') || p.code.includes('screen')) return false;

            return Object.keys(whitelistMap).some(key => p.code.startsWith(key));
        });

        // Map Names
        const mapped = filtered.map(p => {
            const key = Object.keys(whitelistMap).find(k => p.code.startsWith(k));
            if (!key) return p;

            let displayName = whitelistMap[key];

            // If it's a "Plus" variant, adjust the name
            if (p.code.includes('_plus') || p.name.includes('+')) {
                // Heuristic: "Trendstyle (Trendline)" -> "Trendstyle+ (Trendline+)"
                displayName = displayName.replace(/\)/, '+)').replace(/ \(/, '+ (');
            }

            // If it's "XL" variant, append XL
            if (p.code.includes('_xl') || p.name.includes('XL')) {
                displayName += ' XL';
            }

            return { ...p, name: displayName };
        });

        // Custom Sort Order
        const priority = ['orangestyle', 'trendstyle', 'topstyle', 'ultrastyle', 'skystyle', 'carport'];

        return mapped.sort((a, b) => {
            const idxA = priority.findIndex(p => a.code.startsWith(p));
            const idxB = priority.findIndex(p => b.code.startsWith(p));

            if (idxA !== -1 && idxB !== -1) {
                if (idxA === idxB) return a.code.length - b.code.length; // Check for Plus variants (longer code)
                return idxA - idxB;
            }
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.name.localeCompare(b.name);
        });
    },

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

            // NEW: Support for direct entry list (from Intelligent Import)
            if (matrix.data && Array.isArray(matrix.data)) {
                return matrix.data.map((e: any) => ({
                    width_mm: e.width_mm || e.width,
                    projection_mm: e.projection_mm || e.projection,
                    price: e.price,
                    structure_price: e.structure_price || e.price,
                    glass_price: e.glass_price || 0,
                    properties: e.properties || {}
                }));
            }

            // Legacy Matrix Format (Pivoted)
            if (matrix.rows && matrix.headers) {
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

        // Surcharges (Config-based)
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

        // NEW: Inject Row-Specific Surcharges from PDF Extraction (IDP)
        // If the price table contains specific surcharge variants for this size (e.g. "Aufpreis Opal")
        if (matchedEntryProperties?.surcharges && Array.isArray(matchedEntryProperties.surcharges)) {
            const currentSubtype = attributes['subtype']?.toLowerCase();

            matchedEntryProperties.surcharges.forEach((s: any) => {
                if (s && typeof s.name === 'string' && typeof s.price === 'number') {
                    // Fuzzy match the subtype (e.g. "opal" matches "Aufpreis Opal")
                    // Only apply if we have a specific subtype selected
                    if (currentSubtype && s.name.toLowerCase().includes(currentSubtype)) {
                        surcharges.items.push({
                            name: `Dopłata (Wariant): ${s.name}`,
                            price: s.price
                        });
                        surcharges.total += s.price;
                        console.log(`[Pricing] Applied IDP Surcharge: ${s.name} (+${s.price})`);
                    }
                }
            });
        }

        // NEW: Process User-Selected Surcharges (Calculator V2)
        if (product.selectedSurcharges && product.selectedSurcharges.length > 0) {
            try {
                // 1. Resolve Product ID (Cache or fetch)
                const { data: prodDef } = await supabase.from('product_definitions').select('id').eq('code', product.modelId).single();

                if (prodDef) {
                    // 2. Fetch all active tables to find the surcharge ones
                    // Optimization: We could filter by name like '%surcharge%' but fetching all for product is usually fine (10-20 tables max per product usually, though Aluxe has 140 total, maybe 20 per product)
                    const { data: allTables } = await supabase.from('price_tables')
                        .select('*')
                        .eq('product_definition_id', prodDef.id)
                        .eq('is_active', true);

                    if (allTables) {
                        for (const surchargeKey of product.selectedSurcharges) {
                            // Match table by name AND context (attributes)
                            const matchingTable = allTables.find(t => {
                                const nameMatch = t.name.includes(`surcharge_${surchargeKey}`);
                                if (!nameMatch) return false;

                                // Context Awareness Check (Zone, Roof Type) using 'attributes' column
                                const attrs = t.attributes || {};

                                // Check Attributes (if present in table metadata)
                                if (attrs.subtype && product.attributes && attrs.subtype !== product.attributes.roofType) return false;

                                // Robust check for Snow Zone
                                if (attrs.snow_zone && product.attributes && product.attributes.snowZone &&
                                    String(attrs.snow_zone) !== String(product.attributes.snowZone)) return false;

                                return true;
                            });

                            if (matchingTable) {
                                // 3. Get Price for this surcharge table
                                let entries: PriceMatrixEntry[] = [];

                                if (matchingTable.data) {
                                    // JSON Data
                                    const matrix = matchingTable.data;
                                    if (matrix.data && Array.isArray(matrix.data)) {
                                        entries = matrix.data.map((e: any) => ({
                                            width_mm: e.width_mm || e.width,
                                            projection_mm: e.projection_mm || e.projection,
                                            price: e.price,
                                            structure_price: e.structure_price || e.price,
                                            glass_price: e.glass_price || 0,
                                            properties: e.properties || {}
                                        }));
                                    } else if (matrix.rows && matrix.headers) {
                                        // Pivoted
                                        matrix.rows.forEach((row: any) => {
                                            matrix.headers.forEach((w: number, idx: number) => {
                                                const p = row.prices[idx];
                                                if (p > 0) {
                                                    entries.push({
                                                        width_mm: w,
                                                        projection_mm: row.projection,
                                                        price: p
                                                    });
                                                }
                                            });
                                        });
                                    }
                                } else {
                                    // DB Entries
                                    const { data: dbEntries } = await supabase
                                        .from('price_matrix_entries')
                                        .select('*')
                                        .eq('price_table_id', matchingTable.id);

                                    if (dbEntries) {
                                        entries = dbEntries.map((d: any) => ({
                                            width_mm: d.width_mm,
                                            projection_mm: d.projection_mm,
                                            price: d.price,
                                            structure_price: d.structure_price || d.price,
                                            glass_price: d.glass_price || 0,
                                            properties: d.properties || {}
                                        }));
                                    }
                                }

                                // 4. Calculate Surcharge Value
                                const surchargeValue = this.calculateMatrixPrice(entries, product.width, product.projection);
                                if (surchargeValue > 0) {
                                    surcharges.items.push({
                                        name: matchingTable.name.split('surcharge_')[1]?.replace(/_/g, ' ').toUpperCase() || surchargeKey,
                                        price: surchargeValue
                                    });
                                    surcharges.total += surchargeValue;
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Error calculating selected surcharges:", err);
            }
        }

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
            .eq('is_active', true); // Relaxed: fetch all active tables, not just 'matrix' type

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
     * Optimized fetch for specific accessory matrices (e.g. Keilfenster, Walls).
     * Avoids loading the entire database.
     */
    async getAccessoryMatrices(keywords: string[]): Promise<{ table: PriceTable, entries: PriceMatrixEntry[] }[]> {
        if (keywords.length === 0) return [];

        // Build OR query for filtering by name
        // name.ilike.%k1%,name.ilike.%k2%
        const orQuery = keywords.map(k => `name.ilike.%${k}%`).join(',');

        const { data: tables } = await supabase
            .from('price_tables')
            .select('*, product:product_definitions(name, code)')
            .eq('is_active', true)
            .or(orQuery);

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

    /**
     * Calculates the price for a specific surcharge table given dimensions.
     */
    async getSurchargePrice(tableId: string, width: number, projection: number): Promise<number> {
        try {
            const { data: entries } = await supabase
                .from('price_matrix_entries')
                .select('*')
                .eq('price_table_id', tableId);

            if (!entries || entries.length === 0) return 0;

            const matrixEntries: PriceMatrixEntry[] = entries.map((d: any) => ({
                width_mm: d.width_mm,
                projection_mm: d.projection_mm,
                price: d.price,
                structure_price: d.structure_price || 0,
                glass_price: d.glass_price || 0,
                properties: d.properties || {}
            }));

            return this.calculateMatrixPrice(matrixEntries, width, projection);
        } catch (error) {
            console.error("Error calculating surcharge price:", error);
            return 0;
        }
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
    async getAvailableSurcharges(productCode: string, contextAttributes: Record<string, string> = {}): Promise<{ id: string; name: string; price_table_id: string }[]> {
        // 1. Get Product Definition
        const { data: product } = await supabase
            .from('product_definitions')
            .select('id')
            .eq('code', productCode)
            .single();

        if (!product) return [];

        // 2. Get All Surcharge Tables for this Product
        const { data: tables } = await supabase
            .from('price_tables')
            .select('*')
            .eq('product_definition_id', product.id)
            .eq('is_active', true);
        // .eq('type', 'surcharge'); // We might need to add 'type' column to DB or check naming convention?
        // Current DB schema has 'type', but typically used for 'matrix' | 'simple'.
        // Surcharges are identified by naming convention `... - surcharge_...` OR explicitly by variant_config

        if (!tables) return [];

        const surchargeTables = (tables as PriceTable[]).filter(t => {
            // Filter logic: Must look like a surcharge table
            // Naming convention: " - surcharge_"
            const isSurcharge = t.name.includes('surcharge_');
            if (!isSurcharge) return false;

            // Context Matching Logic (using attributes)
            const attrs = t.attributes || {};
            const vc = t.variant_config || {}; // Fallback for legacy

            // Check Roof Type (Subtype)
            const tableSubtype = attrs.subtype || vc.roofType;
            if (tableSubtype && tableSubtype !== contextAttributes.roofType) return false;

            // Check Snow Zone
            const tableZone = attrs.snow_zone || vc.snowZone;
            if (tableZone && contextAttributes.snowZone && String(tableZone) !== String(contextAttributes.snowZone)) return false;

            return true;
        });

        // Map to simplified structure
        return surchargeTables.map(t => {
            // Extract pretty name from table name or attributes
            // format: "Product - Zone - Type - surcharge_variant"
            const parts = t.name.split('surcharge_');
            const variantName = parts.length > 1 ? parts[1] : t.name;

            // Capitalize
            const label = variantName.charAt(0).toUpperCase() + variantName.slice(1).replace(/_/g, ' ');

            return {
                id: variantName, // e.g. "ir_gold"
                name: label,
                price_table_id: t.id
            };
        });
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

