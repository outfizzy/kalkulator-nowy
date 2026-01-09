import { supabase } from '../lib/supabase';
import type { ProductConfig, PricingResult, SnowZoneInfo, TransportSettings } from '../types';
import { calculateInstallationCosts, calculateDistanceFromGubin } from '../utils/distanceCalculator';
import catalogData from '../data/catalog.json';

// --- Types for New Manual Pricing ---

export interface BasePriceEntry {
    id: string;
    model_family: string;
    construction_type: string;
    cover_type: string;
    zone: number;
    width_mm: number;
    depth_mm: number;
    price_upe_net_eur: number;
    currency: string;
}

export interface AddonPriceEntry {
    id: string;
    addon_code: string;
    addon_name: string;
    pricing_basis: 'FIXED' | 'PER_M2' | 'BY_WIDTH' | 'BY_OPENING_WIDTH' | 'MANUAL' | 'PERCENTAGE';
    price_upe_net_eur: number;
    unit: string;
    addon_group?: string;
    properties?: Record<string, any>;
}

export interface AdditionalCost {
    id?: string;
    name?: string;
    cost_type: 'fixed' | 'percentage';
    value: number;
    description?: string;
    attributes?: Record<string, any>;
}

export const PricingService = {

    /**
     * Get distinct model families from pricing_base to populate Product Dropdown.
     */
    async getMainProducts(): Promise<{ id: string, code: string, name: string, description: string, category: string, image_url?: string, standard_colors?: string[], custom_color_surcharge_percentage?: number }[]> {
        // Fetch from product_definitions primarily, but also include manual models from base
        const { data: dbProducts, error } = await supabase
            .from('product_definitions')
            .select('*')
            .order('name');

        const { data: manualData } = await supabase
            .from('pricing_base')
            .select('model_family')
            .limit(50000);

        const uniqueManualModels = Array.from(new Set((manualData || []).map(d => d.model_family))).filter(m => m).sort();

        // Merge DB products with Manual models (that don't exist in DB)
        const combined = [...(dbProducts || [])];

        // Also fetch from price_tables to capture models that might have been imported into tables 
        // but don't have a formal definition or base entry yet.
        const { data: tableData } = await supabase
            .from('price_tables')
            .select('name');

        const tableModels = Array.from(new Set((tableData || []).map(t => {
            // Extract model name from table name "Trendstyle - Glass..."
            return t.name.split(' - ')[0].trim();
        }))).filter(m => m);

        // Unite all manual sources
        const allManualModels = Array.from(new Set([...uniqueManualModels, ...tableModels]));

        allManualModels.forEach(manualName => {
            if (!combined.find(p => p.name === manualName || p.code === manualName)) {
                // Add pseudo-product for manual entry
                combined.push({
                    id: '', // No ID means it's purely manual
                    code: manualName,
                    name: manualName,
                    description: 'Manual Pricing Model',
                    category: 'roof',
                    image_url: undefined,
                    standard_colors: undefined,
                    custom_color_surcharge_percentage: undefined
                });
            }
        });

        return combined.map(p => ({
            id: p.id,
            code: p.code,
            name: p.name,
            description: p.description || 'Manual Pricing Model',
            category: p.category,
            image_url: p.image_url,
            standard_colors: p.standard_colors,
            custom_color_surcharge_percentage: p.custom_color_surcharge_percentage
        }));
    },

    /**
     * Create or Update Product Definition
     */
    async upsertProductDefinition(product: Partial<{ id: string, name: string, code: string, description: string, image_url: string, standard_colors: string[], custom_color_surcharge_percentage: number }>) {
        if (!product.name) throw new Error("Name is required");

        // Auto-generate code if missing
        const code = product.code || product.name.toLowerCase().replace(/\s+/g, '_');

        const payload: Record<string, unknown> = {
            name: product.name,
            code: code,
            category: 'roof', // Default
            provider: 'Manual',
            updated_at: new Date()
        };

        if (product.description !== undefined) payload.description = product.description;
        if (product.image_url !== undefined) payload.image_url = product.image_url;
        if (product.standard_colors !== undefined) payload.standard_colors = product.standard_colors;
        if (product.custom_color_surcharge_percentage !== undefined) payload.custom_color_surcharge_percentage = product.custom_color_surcharge_percentage;

        if (product.id) {
            return supabase.from('product_definitions').update(payload).eq('id', product.id).select().single();
        } else {
            return supabase.from('product_definitions').insert(payload).select().single();
        }
    },

    /**
     * Get Product Image URL based on configuration
     */
    async getProductImage(modelId: string, _context: { roofType?: string, snowZone?: string }): Promise<string | undefined> {
        // Simple lookup from catalog for now
        // In future could query DB if images are variant-specific
        const models = catalogData.models as Array<{ id: string, image: string }>;
        const model = models.find(m => m.id.toLowerCase() === modelId.toLowerCase());
        return model?.image;
    },

    /**
     * Get Product Dimension Limits
     */
    async getProductLimits(modelId: string): Promise<{ minWidth: number, maxWidth: number, minDepth: number, maxDepth: number }> {
        const defaultLimits = { minWidth: 2000, maxWidth: 14000, minDepth: 2000, maxDepth: 6000 };

        try {
            // Run parallel queries for efficiency
            const [minW, maxW, minD, maxD] = await Promise.all([
                supabase.from('pricing_base').select('width_mm').eq('model_family', modelId).order('width_mm', { ascending: true }).limit(1).maybeSingle(),
                supabase.from('pricing_base').select('width_mm').eq('model_family', modelId).order('width_mm', { ascending: false }).limit(1).maybeSingle(),
                supabase.from('pricing_base').select('depth_mm').eq('model_family', modelId).order('depth_mm', { ascending: true }).limit(1).maybeSingle(),
                supabase.from('pricing_base').select('depth_mm').eq('model_family', modelId).order('depth_mm', { ascending: false }).limit(1).maybeSingle()
            ]);

            return {
                minWidth: minW.data?.width_mm || defaultLimits.minWidth,
                maxWidth: maxW.data?.width_mm || defaultLimits.maxWidth,
                minDepth: minD.data?.depth_mm || defaultLimits.minDepth,
                maxDepth: maxD.data?.depth_mm || defaultLimits.maxDepth
            };
        } catch (e) {
            console.error('Error fetching product limits:', e);
            return defaultLimits;
        }
    },

    /**
     * Exact Match Lookup for Base Price with Smart Fallback
     */
    async findBasePrice(criteria: {
        modelFamily: string;
        constructionType: 'wall' | 'free';
        coverType: string;
        zone: number;
        width: number;
        depth: number;
    }): Promise<{ price: number, variant_note?: string } | null> {
        console.log('🔍 Pricing Lookup:', criteria);

        // 1. Try Exact Match
        const { data: exactData } = await supabase
            .from('pricing_base')
            .select('price_upe_net_eur, variant_note')
            .ilike('model_family', criteria.modelFamily)
            .eq('construction_type', criteria.constructionType)
            .ilike('cover_type', criteria.coverType)
            .eq('zone', criteria.zone)
            .eq('width_mm', criteria.width)
            .eq('depth_mm', criteria.depth)
            .maybeSingle();

        if (exactData) {
            console.log('✅ Exact Price Found:', exactData.price_upe_net_eur);
            return { price: exactData.price_upe_net_eur, variant_note: exactData.variant_note };
        }

        // 2. Smart Match (Next Larger)
        const { data: smartData } = await supabase
            .from('pricing_base')
            .select('price_upe_net_eur, width_mm, depth_mm, variant_note')
            .ilike('model_family', criteria.modelFamily) // Case-insensitive Family match
            .eq('construction_type', criteria.constructionType)
            .ilike('cover_type', criteria.coverType)
            .eq('zone', criteria.zone) // Strict Zone match (safety)
            .gte('width_mm', criteria.width)
            .gte('depth_mm', criteria.depth)
            .order('width_mm', { ascending: true })
            .order('depth_mm', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (smartData) {
            console.log(`✅ Smart Match Found: Requested ${criteria.width}x${criteria.depth} -> Used ${smartData.width_mm}x${smartData.depth_mm}`);
            return { price: smartData.price_upe_net_eur, variant_note: smartData.variant_note };
        }

        console.warn('❌ Price Not Found');
        return null; // Return null to indicate failure
    },

    /**
     * Main Calculation Function replacing legacy calculateOfferPrice
     */
    async calculateOfferPrice(
        product: ProductConfig,
        marginPercentage: number, // e.g. 0.30 for 30% MARGIN (Selling = Cost / (1-0.3))
        snowZone?: SnowZoneInfo,
        postalCode?: string
    ): Promise<PricingResult> {

        // 1. Normalize Inputs
        // 1. Normalize Inputs
        // const modelFamily = product.modelId.charAt(0).toUpperCase() + product.modelId.slice(1); // Unused
        const constructionType = product.installationType === 'freestanding' ? 'free' : 'wall';

        let coverType = 'poly_clear'; // Default
        if (product.roofType === 'glass') {
            // Map legacy glass types or defaults
            if (product.glassType === 'mat' || product.glassType === 'glass_opal') coverType = 'glass_opal';
            else if (product.glassType === 'sunscreen' || product.glassType === 'glass_tinted') coverType = 'glass_tinted';
            else coverType = 'glass_clear';
        } else {
            // Poly mappings
            if (product.polycarbonateType === 'poly_opal') coverType = 'poly_opal';
            else if (product.polycarbonateType === 'iq-relax' || product.polycarbonateType === 'ir-gold' || product.polycarbonateType === 'poly_iq_relax') coverType = 'poly_iq_relax';
            else coverType = 'poly_clear';
        }

        // Snow Zone
        let zone = 1;
        if (snowZone && snowZone.id) {
            // Usually '1', '2', '3'... parse int
            const parsed = parseInt(String(snowZone.id));
            if (!isNaN(parsed)) zone = parsed;
        }

        // 2. Lookup Base Price
        let priceResult = await this.findBasePrice({
            modelFamily: product.modelId, // Pass raw ID, assumed to be correct from Dropdown 
            constructionType,
            coverType,
            zone,
            width: product.width,
            depth: product.projection
        });

        // [FallBack] If Freestanding price not found in base table, try Wall Base + Freestanding Surcharge
        let freestandingSurcharge = 0;
        if (!priceResult && constructionType === 'free') {
            console.log('⚠️ Freestanding base price not found. Attempting Wall Base + Surcharge fallback.');

            // Try fetching Wall price
            priceResult = await this.findBasePrice({
                modelFamily: product.modelId,
                constructionType: 'wall', // Force Wall
                coverType,
                zone,
                width: product.width,
                depth: product.projection
            });

            if (priceResult) {
                // Fetch Surcharge
                freestandingSurcharge = await this.getSurchargePrice(product.modelId, 'freestanding', product.width);
                console.log(`➕ Added Freestanding Surcharge: ${freestandingSurcharge} EUR`);
            }
        }

        let safeBasePrice = (priceResult?.price || 0) + freestandingSurcharge;

        // Ensure dbPriceFound reflects success even if we used fallback
        const dbPriceFound = priceResult !== null;
        const structuralNote = priceResult?.variant_note;

        // 3. Addons Total
        let addonsTotal = 0;
        (product.selectedAccessories || []).forEach(acc => {
            addonsTotal += (acc.price || 0) * (acc.quantity || 1);
        });

        // 4. Custom Items
        let customItemsTotal = 0;
        (product.customItems || []).forEach(item => {
            customItemsTotal += (item.price || 0) * (item.quantity || 1);
        });

        // 5. Installation
        // 5. Installation
        // Fetch settings dynamically to ensure accuracy (avoid stale defaults)
        let transportSettings: TransportSettings | undefined;
        try {
            const { data } = await supabase.from('app_settings').select('value').eq('key', 'transport_settings').maybeSingle();
            if (data?.value) {
                transportSettings = data.value as TransportSettings;
            }
        } catch (e) {
            console.warn('Failed to fetch transport settings in pricing service', e);
        }

        const distance = calculateDistanceFromGubin(postalCode || '', transportSettings?.baseLocation);
        const installation = calculateInstallationCosts(product.installationDays || 1, distance || 0, transportSettings?.ratePerKm);

        // 6. Final Calculation
        // Manual Override logic
        const effectiveBase = (product.isManual && product.manualPrice) ? product.manualPrice : safeBasePrice;

        const totalCost = effectiveBase + addonsTotal + customItemsTotal + (installation.dailyTotal || 0) + (installation.travelCost || 0);

        // Margin Calculation (Margin vs Markup?)
        // Assuming MARGIN: Price = Cost / (1 - Margin%)
        // marginPercentage is usually 0-100 in input? Or 0.3?
        // Let's assume input comes as integer percentage (30) or checks.
        // Usually Types say `marginPercentage: number`.

        // Safety check
        const marginDecimal = marginPercentage > 1 ? marginPercentage / 100 : marginPercentage;
        const safeMargin = Math.min(Math.max(marginDecimal, 0), 0.99); // Cap at 99%

        const sellingPriceNet = totalCost / (1 - safeMargin);
        const marginValue = sellingPriceNet - totalCost;

        // VAT
        const sellingPriceGross = sellingPriceNet * 1.19; // DE 19% default

        return {
            basePrice: effectiveBase,
            addonsPrice: addonsTotal,
            customItemsPrice: customItemsTotal,
            totalCost,
            marginPercentage: safeMargin * 100,
            marginValue,
            sellingPriceNet: parseFloat(sellingPriceNet.toFixed(2)),
            sellingPriceGross: parseFloat(sellingPriceGross.toFixed(2)),
            installationCosts: installation,

            _debuginfo: {
                found: dbPriceFound,
                info: `Model: ${product.modelId}, W:${product.width} D:${product.projection} Z:${zone}`
            },
            structuralNote // Propagate the note to the offer
        };
    },

    /**
     * Fetch Matrix (All Rows) for Client-Side Filtering
     * Used by ProductConfigurator to find "Next Size Up" locally or get exact match details.
     */
    async getPriceMatrix(modelId: string, attributes: Record<string, string>) {
        console.log('Fetching Price Matrix for:', modelId, attributes);
        const zone = parseInt(attributes.snow_zone || '1');
        const constructionType = attributes.mounting === 'wall-mounted' ? 'wall' : (attributes.mounting || 'wall');
        const coverTypeQuery = attributes.subtype || '';

        // Build query
        let query = supabase
            .from('pricing_base')
            .select('*')
            .ilike('model_family', modelId)
            .eq('zone', zone);

        // Handle construction type if present in DB (some models might not have it?)
        // Assuming pricing_base has construction_type
        if (constructionType) {
            query = query.eq('construction_type', constructionType);
        }

        // Handle Cover Type with wildcards for generic types
        if (coverTypeQuery) {
            // If query is 'glass', match 'glass_clear', 'glass_opal', etc.
            // If query is 'polycarbonate', match 'poly_clear', 'poly_opal'
            if (coverTypeQuery.toLowerCase() === 'glass') {
                query = query.ilike('cover_type', '%glass%');
            } else if (coverTypeQuery.toLowerCase() === 'polycarbonate') {
                query = query.ilike('cover_type', '%poly%');
            } else {
                query = query.ilike('cover_type', `%${coverTypeQuery}%`);
            }
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching matrix:', error);
            return [];
        }
        return data || [];
    },

    /**
     * Find best match in the matrix for given dimensions.
     * Returns { total, variant_note, properties: { matchedWidth, matchedProjection } }
     */
    getDetailedPrice(matrix: any[], width: number, depth: number) {
        if (!matrix || matrix.length === 0) return { total: 0 };

        // 1. Try Exact or Best Match (Next Larger)
        // Sort by area (width*depth) ascending
        const sorted = [...matrix].sort((a, b) => (a.width_mm * a.depth_mm) - (b.width_mm * b.depth_mm));

        // Find match: width >= requested AND depth >= requested
        const match = sorted.find(row => row.width_mm >= width && row.depth_mm >= depth);

        if (match) {
            return {
                total: match.price_upe_net_eur,
                variant_note: match.variant_note,
                properties: {
                    matchedWidth: match.width_mm,
                    matchedProjection: match.depth_mm,
                    posts: match.posts,
                    fields: match.fields,
                    posts_count: match.posts_count,
                    fields_count: match.fields_count
                }
            };
        }

        return { total: 0 };
    },

    async getAvailableSurcharges(modelId: string, attributes: Record<string, string>) {
        if (!modelId) return [];

        try {
            // Get unique surcharge types available for this model family
            const { data, error } = await supabase
                .from('pricing_surcharges')
                .select('surcharge_type, price_eur')
                .ilike('model_family', modelId)
            // .eq('width_mm', 0) // Typically global surcharges might have width 0 or specific width?
            // Actually, surcharges vary by width. Use distinct on type to get NAMES.
            // But we need a price for display? Price might depend on width!
            // For UI "Option List", we just need the IDs/Names.
            // Let's get distinct types.
            // .order('surcharge_type');

            if (error) {
                console.error('Error fetching available surcharges:', error);
                return [];
            }

            // To get distinct types with a representative price (e.g. min price or just for listing)
            // Supabase distinct is tricky. Let's fetch all and dedupe in JS for now or use .rpc if needed.
            // Better: select distinct surcharge_type? simple .select() doesn't do distinct well without query modification.
            // Let's just return a static list of KNOWN surcharges if DB is complex, OR fetch all and unique.

            // Temporary robust approach: Fetch all for model, unique by type
            const unique = new Map();
            data?.forEach(item => {
                if (!unique.has(item.surcharge_type)) {
                    unique.set(item.surcharge_type, {
                        id: item.surcharge_type,
                        name: item.surcharge_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()), // Prettify
                        price: item.price_eur // Just a sample price
                    });
                }
            });

            return Array.from(unique.values());

        } catch (e) {
            console.error('getAvailableSurcharges exception:', e);
            return [];
        }
    },

    async getAdditionalCosts(modelId: string, attributes: Record<string, string>) {
        return [];
    },

    async getTableConfig(modelId: string, attributes: Record<string, string>) {
        return { config: {} as any, attributes: {} as any };
    },

    calculateSurcharges(basePrice: number, width: number, depth: number, config: any, context: any): { total: number, items: { name: string, price: number }[] } {
        return { total: 0, items: [] };
    },

    async getSurchargePrice(modelFamily: string, surchargeType: string, width: number): Promise<number> {
        console.log(`💰 Surcharge Lookup: ${modelFamily} - ${surchargeType} (Width: ${width})`);

        const { data } = await supabase
            .from('pricing_surcharges')
            .select('price_eur, width_mm')
            .eq('model_family', modelFamily)
            .eq('surcharge_type', surchargeType)
            .gte('width_mm', width)
            .order('width_mm', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (data) {
            console.log(`✅ Surcharge Found: ${data.price_eur} EUR (Matched Width: ${data.width_mm})`);
            return data.price_eur;
        }

        return 0;
    },

    calculateDiscountedPrice(price: number, discount: string) {
        return price;
    },

    // --- Legacy / Compatibility Stubs ---
    async checkPriceTableExists() { return true; },
    async getMatrixTables() { return []; },
    async getComponentLists() { return []; },

    async getAddonsByGroup(group: string) {
        try {
            const { data: addons } = await supabase.from('pricing_addons').select('*').eq('addon_group', group);

            if (!addons || addons.length === 0) return [];

            // Fetch metadata from product_components
            const keys = addons.map(a => a.addon_code).filter(k => k);
            const { data: meta } = await supabase
                .from('product_components')
                .select('component_key, image_url, description')
                .in('component_key', keys);

            // Map metadata
            const merged = addons.map(addon => {
                const info = meta?.find(m => m.component_key === addon.addon_code);
                return {
                    ...addon,
                    image_url: info?.image_url,
                    description: info?.description || addon.addon_name
                };
            });

            return merged;
        } catch (e) {
            console.error('Error fetching addons group:', group, e);
            return [];
        }
    }
};
