/**
 * Tier Generator Service
 * 
 * Takes a live pricing result from a configurator (Aliplast/Aluxe)
 * and generates 3 offer variants: Economy / Recommended / Premium
 * 
 * Each tier includes:
 * - Base product price (from live configurator)
 * - Tier-specific extras (LED, ZIP, motor, etc.)
 * - 1 day installation (default)
 * - Margin applied
 */

export interface LivePricingResult {
    purchasePriceEUR: number;
    purchasePricePLN: number;
    supplier: 'aliplast' | 'aluxe' | 'teranda' | 'deponti';
    product: string;       // e.g. "Carport", "Trendstyle"
    group: string;         // e.g. "Carport", "Pergola"
    width: number;
    depth: number;
    color?: string;
    orderId?: string;      // Supplier order reference
    lineItems?: { name: string; description: string; price?: number }[];
    configurationDetails?: Record<string, string>;
}

export interface TierConfig {
    tier: 'economy' | 'recommended' | 'premium';
    label: string;
    tagline: string;
    marginPercent: number;
    installationDays: number;
    installationCostEUR: number;
    extras: TierExtraConfig[];
}

export interface TierExtraConfig {
    name: string;
    nameDE: string;        // German customer-facing name
    description?: string;
    descriptionDE?: string;
    priceEUR: number;
    included: boolean;
}

export interface GeneratedTier {
    id: string;
    tier: 'economy' | 'recommended' | 'premium';
    label: string;
    tagline: string;
    features: { name: string; included: boolean; highlight?: boolean }[];
    extras: { name: string; description?: string; priceEUR: number }[];
    purchasePriceEUR: number;
    extrasTotalEUR: number;
    installationDays: number;
    installationCostEUR: number;
    marginPercent: number;
    priceNetEUR: number;
    priceGrossEUR: number;
    totalNetEUR: number;
    totalGrossEUR: number;
}

// ===== DEFAULT TIER CONFIGURATIONS =====

const DEFAULT_INSTALLATION_COST_EUR = 700; // 1 day installation
const VAT_RATE = 0.19; // German VAT 19%

/**
 * Get extras catalog per product type
 */
function getExtrasCatalog(product: string): Record<string, TierExtraConfig> {
    const base: Record<string, TierExtraConfig> = {
        led_spots: {
            name: 'LED Spots',
            nameDE: 'LED-Spotbeleuchtung',
            descriptionDE: 'Warmweiß 3000K, dimmbar',
            priceEUR: 350,
            included: false,
        },
        led_strips: {
            name: 'LED Strips',
            nameDE: 'LED-Lichtleisten',
            descriptionDE: 'Indirekte Beleuchtung in der Rinne',
            priceEUR: 280,
            included: false,
        },
        zip_screen_1: {
            name: 'ZIP Screen (1 Seite)',
            nameDE: 'ZIP-Senkrechtmarkise (1 Seite)',
            descriptionDE: 'Windstabile Textilscreen mit Somfy-Motor',
            priceEUR: 1200,
            included: false,
        },
        zip_screen_2: {
            name: 'ZIP Screen (2 Seiten)',
            nameDE: 'ZIP-Senkrechtmarkisen (2 Seiten)',
            descriptionDE: 'Windstabile Textilscreens mit Somfy-Motor',
            priceEUR: 2200,
            included: false,
        },
        zip_screen_3: {
            name: 'ZIP Screen (3 Seiten)',
            nameDE: 'ZIP-Senkrechtmarkisen (3 Seiten)',
            descriptionDE: 'Kompletter Wetterschutz mit Somfy-Motor',
            priceEUR: 3100,
            included: false,
        },
        somfy_motor: {
            name: 'Somfy Motor',
            nameDE: 'Somfy-Motorsteuerung',
            descriptionDE: 'Elektrischer Antrieb mit Fernbedienung',
            priceEUR: 450,
            included: false,
        },
        somfy_io: {
            name: 'Somfy io-homecontrol',
            nameDE: 'Somfy io Smart-Home-Steuerung',
            descriptionDE: 'App-Steuerung über Smartphone',
            priceEUR: 650,
            included: false,
        },
        heater: {
            name: 'IR Heater',
            nameDE: 'Infrarot-Heizstrahler',
            descriptionDE: 'Wärme an kühlen Abenden (2x 1.500W)',
            priceEUR: 890,
            included: false,
        },
        sliding_glass_1: {
            name: 'Sliding Glass (1 Seite)',
            nameDE: 'Glasschiebetür (1 Seite)',
            descriptionDE: 'Softclose mit Laufschiene',
            priceEUR: 1800,
            included: false,
        },
    };

    return base;
}

/**
 * Define which extras are included in each tier
 */
function getTierExtrasMap(product: string): Record<string, string[]> {
    const isCarport = product.toLowerCase().includes('carport');
    const isPergola = product.toLowerCase().includes('pergola');

    if (isCarport) {
        return {
            economy: [],
            recommended: ['led_strips', 'somfy_motor'],
            premium: ['led_spots', 'led_strips', 'somfy_io'],
        };
    }

    if (isPergola) {
        return {
            economy: [],
            recommended: ['led_spots', 'zip_screen_1', 'somfy_motor'],
            premium: ['led_spots', 'led_strips', 'zip_screen_3', 'somfy_io', 'heater'],
        };
    }

    // Default: Terrassenüberdachung (roofing)
    return {
        economy: [],
        recommended: ['led_spots', 'zip_screen_1', 'somfy_motor'],
        premium: ['led_spots', 'led_strips', 'zip_screen_2', 'somfy_io', 'heater'],
    };
}

/**
 * Build feature checklist for customer display
 * All features shown across all tiers, with included/not markers
 */
function buildFeatureList(
    product: string,
    tier: 'economy' | 'recommended' | 'premium',
    includedExtras: string[],
): { name: string; included: boolean; highlight?: boolean }[] {
    const catalog = getExtrasCatalog(product);
    const allExtras = getTierExtrasMap(product);
    
    // Get all unique extras across all tiers
    const allExtraKeys = new Set<string>();
    Object.values(allExtras).forEach(keys => keys.forEach(k => allExtraKeys.add(k)));

    const features: { name: string; included: boolean; highlight?: boolean }[] = [
        { name: 'Aluminium-Konstruktion', included: true },
        { name: 'Integrierte Entwässerung', included: true },
        { name: 'Pulverbeschichtung (RAL)', included: true },
        { name: 'Professionelle Montage', included: true },
    ];

    for (const key of allExtraKeys) {
        const extra = catalog[key];
        if (!extra) continue;
        const isIncluded = includedExtras.includes(key);
        features.push({
            name: extra.nameDE,
            included: isIncluded,
            highlight: isIncluded && tier !== 'economy',
        });
    }

    return features;
}

// ===== MAIN GENERATOR =====

export const TierGeneratorService = {
    /**
     * Generate 3 tier variants from a live pricing result
     */
    generateTiers(
        pricing: LivePricingResult,
        options?: {
            marginEconomy?: number;     // Default: 25
            marginRecommended?: number; // Default: 30
            marginPremium?: number;     // Default: 35
            installationDays?: number;  // Default: 1
            installationCostEUR?: number; // Default: 700
        }
    ): GeneratedTier[] {
        const opts = {
            marginEconomy: options?.marginEconomy ?? 25,
            marginRecommended: options?.marginRecommended ?? 30,
            marginPremium: options?.marginPremium ?? 35,
            installationDays: options?.installationDays ?? 1,
            installationCostEUR: options?.installationCostEUR ?? DEFAULT_INSTALLATION_COST_EUR,
        };

        const catalog = getExtrasCatalog(pricing.product);
        const tierExtrasMap = getTierExtrasMap(pricing.product);
        const purchasePrice = pricing.purchasePriceEUR;

        const tiers: GeneratedTier[] = [];

        const tierConfigs: Array<{
            tier: 'economy' | 'recommended' | 'premium';
            label: string;
            tagline: string;
            margin: number;
        }> = [
            {
                tier: 'economy',
                label: 'Economy',
                tagline: 'Solide Grundausstattung zum besten Preis',
                margin: opts.marginEconomy,
            },
            {
                tier: 'recommended',
                label: 'Empfohlen',
                tagline: 'Unser beliebtestes Paket — Komfort & Qualität',
                margin: opts.marginRecommended,
            },
            {
                tier: 'premium',
                label: 'Premium',
                tagline: 'Komplettausstattung für höchsten Komfort',
                margin: opts.marginPremium,
            },
        ];

        for (const tc of tierConfigs) {
            const extraKeys = tierExtrasMap[tc.tier] || [];
            const extras = extraKeys
                .map(key => catalog[key])
                .filter(Boolean);

            const extrasTotalEUR = extras.reduce((sum, e) => sum + e.priceEUR, 0);
            const totalPurchase = purchasePrice + extrasTotalEUR;
            const marginMultiplier = 1 + tc.margin / 100;
            const productNetEUR = Math.round(totalPurchase * marginMultiplier);
            const installCost = opts.installationCostEUR * opts.installationDays;
            const totalNetEUR = productNetEUR + installCost;
            const totalGrossEUR = Math.round(totalNetEUR * (1 + VAT_RATE));

            const features = buildFeatureList(pricing.product, tc.tier, extraKeys);

            tiers.push({
                id: `${tc.tier}-${Date.now()}`,
                tier: tc.tier,
                label: tc.label,
                tagline: tc.tagline,
                features,
                extras: extras.map(e => ({
                    name: e.nameDE,
                    description: e.descriptionDE,
                    priceEUR: e.priceEUR,
                })),
                purchasePriceEUR: purchasePrice,
                extrasTotalEUR,
                installationDays: opts.installationDays,
                installationCostEUR: installCost,
                marginPercent: tc.margin,
                priceNetEUR: productNetEUR,
                priceGrossEUR: Math.round(productNetEUR * (1 + VAT_RATE)),
                totalNetEUR,
                totalGrossEUR,
            });
        }

        return tiers;
    },

    /**
     * Convert generated tiers to the format expected by TierComparisonSection
     */
    toTierVariants(tiers: GeneratedTier[]): Array<{
        id: string;
        tier: 'economy' | 'recommended' | 'premium';
        label: string;
        tagline: string;
        features: { name: string; included: boolean; highlight?: boolean }[];
        priceNetEUR: number;
        priceGrossEUR: number;
        installationDays: number;
        installationCostEUR: number;
        totalNetEUR: number;
        totalGrossEUR: number;
        extras: { name: string; description?: string; priceEUR: number }[];
    }> {
        return tiers.map(t => ({
            id: t.id,
            tier: t.tier,
            label: t.label,
            tagline: t.tagline,
            features: t.features,
            priceNetEUR: t.priceNetEUR,
            priceGrossEUR: t.priceGrossEUR,
            installationDays: t.installationDays,
            installationCostEUR: t.installationCostEUR,
            totalNetEUR: t.totalNetEUR,
            totalGrossEUR: t.totalGrossEUR,
            extras: t.extras,
        }));
    },
};
