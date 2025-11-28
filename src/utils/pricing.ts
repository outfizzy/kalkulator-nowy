import type { ProductConfig, PricingResult, SnowZoneInfo, ProductModel } from '../types';
import catalogData from '../data/catalog.json';
import { orangestylePricing, type PricingEntry } from '../data/orangestyle_pricing';
import { trendstylePricingEntries, trendstylePlusPricingEntries } from '../data/trendstyle_pricing';
import { topstylePricingEntries } from '../data/topstyle_pricing';
import { calculateDistanceFromGubin, calculateInstallationCosts } from './distanceCalculator';

// Normalize snow zone IDs coming from postal-code lookup (1/2/3) or Roman numerals (I/II/III)
function mapSnowZoneToOrangelineZone(snowZone: SnowZoneInfo | undefined): string {
    if (!snowZone) return '1a&2';
    const normalized = snowZone.id.toString().toUpperCase();
    const zoneMap: Record<string, string> = {
        '1': '1',
        '2': '1a&2',
        '3': '2a&3',
        'I': '1',
        'II': '1a&2',
        'III': '2a&3',
        'IV': '2a&3',
        'V': '2a&3',
        '1A&2': '1a&2',
        '2A&3': '2a&3'
    };
    return zoneMap[normalized] || '1a&2';
}

export function calculatePrice(
    config: ProductConfig,
    marginPercentage: number,
    snowZone?: SnowZoneInfo,
    customerPostalCode?: string
): PricingResult {
    // 1. Calculate Base Price (Roof)
    let basePrice = 0;
    let numberOfFields: number | undefined;
    let numberOfPosts: number | undefined;

    console.log('[PRICING DEBUG] Starting price calculation');
    console.log('[PRICING DEBUG] Config:', { modelId: config.modelId, width: config.width, projection: config.projection, roofType: config.roofType, polycarbonateType: config.polycarbonateType });
    console.log('[PRICING DEBUG] Snow Zone:', snowZone);

    const applyGlassSurcharge = (entry: PricingEntry) => {
        if (config.roofType !== 'glass' || !config.glassType) return 0;
        if (config.glassType === 'mat' && entry.glass_44_2_surcharge_eur) {
            return entry.glass_44_2_surcharge_eur;
        }
        if (config.glassType === 'sunscreen' && entry.glass_55_2_surcharge_eur) {
            return entry.glass_55_2_surcharge_eur;
        }
        return 0;
    };

    if (config.modelId === 'orangestyle' && snowZone) {
        const orangelineZone = mapSnowZoneToOrangelineZone(snowZone);
        console.log('[PRICING DEBUG] Mapped zone', snowZone.id, 'to Orangeline zone:', orangelineZone);

        // Use new pricing table for Orangestyle
        console.log('[PRICING DEBUG] Using Orangestyle pricing, zone ID:', snowZone.id);
        const zonePrices = orangestylePricing.filter(p =>
            p.snowZone === orangelineZone &&
            p.coverType === config.roofType
        );
        console.log('[PRICING DEBUG] Zone prices found:', zonePrices.length, 'entries');

        if (zonePrices.length > 0) {
            console.log('[PRICING DEBUG] Sample zone price:', zonePrices[0]);
        }

        // Find suitable width (>= config.width)
        // Get unique widths sorted
        const availableWidths = Array.from(new Set(zonePrices.map(p => p.width))).sort((a, b) => a - b);
        console.log('[PRICING DEBUG] Available widths for zone:', availableWidths);
        const matchedWidth = availableWidths.find(w => w >= config.width) || availableWidths[availableWidths.length - 1];
        console.log('[PRICING DEBUG] Matched width:', matchedWidth, 'for requested:', config.width);

        // Find suitable depth (>= config.projection) for the matched width
        const entriesForWidth = zonePrices.filter(p => p.width === matchedWidth).sort((a, b) => a.depth - b.depth);
        console.log('[PRICING DEBUG] Entries for width:', entriesForWidth.length);
        const matchedEntry = entriesForWidth.find(p => p.depth >= config.projection) || entriesForWidth[entriesForWidth.length - 1];
        console.log('[PRICING DEBUG] Matched entry:', matchedEntry);

        if (matchedEntry) {
            basePrice = matchedEntry.price;
            numberOfFields = matchedEntry.fields;
            numberOfPosts = matchedEntry.posts;
            console.log('[PRICING DEBUG] Base price set to:', basePrice);

            // Add IR Gold Surcharge if selected
            if (config.roofType === 'polycarbonate' && config.polycarbonateType === 'ir-gold' && matchedEntry.irGoldSurcharge) {
                basePrice += matchedEntry.irGoldSurcharge;
                console.log('[PRICING DEBUG] With IR  Gold surcharge:', basePrice);
            }

            // Add glass surcharge if selected
            if (config.roofType === 'glass') {
                const surcharge = applyGlassSurcharge(matchedEntry);
                if (surcharge) {
                    basePrice += surcharge;
                    console.log('[PRICING DEBUG] With glass surcharge:', basePrice);
                }
            }
        } else {
            console.log('[PRICING DEBUG] No matching entry found!');
        }
    } else if ((config.modelId === 'trendstyle' || config.modelId === 'trendstyle_plus') && snowZone) {
        const orangelineZone = mapSnowZoneToOrangelineZone(snowZone);
        console.log('[PRICING DEBUG] Trendstyle - Mapped zone', snowZone.id, 'to:', orangelineZone);

        // Select the correct pricing table based on model
        const pricingTable = config.modelId === 'trendstyle_plus'
            ? trendstylePlusPricingEntries
            : trendstylePricingEntries;
        console.log('[PRICING DEBUG] Using', config.modelId, 'pricing table');

        const zonePrices = pricingTable.filter(p =>
            p.snowZone === orangelineZone &&
            p.coverType === config.roofType
        );
        console.log('[PRICING DEBUG] Zone prices found:', zonePrices.length, 'entries');

        if (zonePrices.length > 0) {
            console.log('[PRICING DEBUG] Sample zone price:', zonePrices[0]);
        }

        // Find suitable width and depth
        const availableWidths = Array.from(new Set(zonePrices.map(p => p.width))).sort((a, b) => a - b);
        console.log('[PRICING DEBUG] Available widths:', availableWidths);
        const matchedWidth = availableWidths.find(w => w >= config.width) || availableWidths[availableWidths.length - 1];
        console.log('[PRICING DEBUG] Matched width:', matchedWidth);

        const entriesForWidth = zonePrices.filter(p => p.width === matchedWidth).sort((a, b) => a.depth - b.depth);
        const matchedEntry = entriesForWidth.find(p => p.depth >= config.projection) || entriesForWidth[entriesForWidth.length - 1];
        console.log('[PRICING DEBUG] Matched entry:', matchedEntry);

        if (matchedEntry) {
            basePrice = matchedEntry.price;
            numberOfFields = matchedEntry.fields;
            numberOfPosts = matchedEntry.posts;
            console.log('[PRICING DEBUG] Base price set to:', basePrice);

            // Add IR Gold Surcharge if selected
            if (config.roofType === 'polycarbonate' && config.polycarbonateType === 'ir-gold' && matchedEntry.irGoldSurcharge) {
                basePrice += matchedEntry.irGoldSurcharge;
                console.log('[PRICING DEBUG] With IR Gold surcharge:', basePrice);
            }

            // Add glass surcharge if selected
            if (config.roofType === 'glass') {
                const surcharge = applyGlassSurcharge(matchedEntry);
                if (surcharge) {
                    basePrice += surcharge;
                    console.log('[PRICING DEBUG] With glass surcharge:', basePrice);
                }
            }
        } else {
            console.log('[PRICING DEBUG] No matching entry found!');
        }
    } else if (config.modelId === 'topstyle' && snowZone) {
        const orangelineZone = mapSnowZoneToOrangelineZone(snowZone);
        console.log('[PRICING DEBUG] Topstyle - Mapped zone', snowZone.id, 'to:', orangelineZone);

        const zonePrices = topstylePricingEntries.filter(p =>
            p.snowZone === orangelineZone &&
            p.coverType === config.roofType
        );
        console.log('[PRICING DEBUG] Zone prices found:', zonePrices.length, 'entries');

        if (zonePrices.length > 0) {
            console.log('[PRICING DEBUG] Sample zone price:', zonePrices[0]);
        }

        const availableWidths = Array.from(new Set(zonePrices.map(p => p.width))).sort((a, b) => a - b);
        console.log('[PRICING DEBUG] Available widths:', availableWidths);
        const matchedWidth = availableWidths.find(w => w >= config.width) || availableWidths[availableWidths.length - 1];
        console.log('[PRICING DEBUG] Matched width:', matchedWidth);

        const entriesForWidth = zonePrices.filter(p => p.width === matchedWidth).sort((a, b) => a.depth - b.depth);
        const matchedEntry = entriesForWidth.find(p => p.depth >= config.projection) || entriesForWidth[entriesForWidth.length - 1];
        console.log('[PRICING DEBUG] Matched entry:', matchedEntry);

        if (matchedEntry) {
            basePrice = matchedEntry.price;
            numberOfFields = matchedEntry.fields;
            numberOfPosts = matchedEntry.posts;
            console.log('[PRICING DEBUG] Base price set to:', basePrice);

            if (config.roofType === 'polycarbonate' && config.polycarbonateType === 'ir-gold' && matchedEntry.irGoldSurcharge) {
                basePrice += matchedEntry.irGoldSurcharge;
                console.log('[PRICING DEBUG] With IR Gold surcharge:', basePrice);
            }

            if (config.roofType === 'glass') {
                const surcharge = applyGlassSurcharge(matchedEntry);
                if (surcharge) {
                    basePrice += surcharge;
                    console.log('[PRICING DEBUG] With glass surcharge:', basePrice);
                }
            }
        } else {
            console.log('[PRICING DEBUG] No matching entry found!');
        }
    } else {
        // Fallback to catalog.json for other models
        const model = (catalogData.models as ProductModel[]).find(m => m.id === config.modelId);

        if (model && model.pricing) {
            // Logic: Find the smallest defined width that is >= config.width
            // And for that width, find the smallest defined projection that is >= config.projection

            const availableWidths = Object.keys(model.pricing).map(Number).sort((a, b) => a - b);
            const matchedWidth = availableWidths.find(w => w >= config.width);

            if (matchedWidth) {
                const projectionsForWidth = model.pricing[matchedWidth.toString()];
                const availableProjections = Object.keys(projectionsForWidth).map(Number).sort((a, b) => a - b);
                const matchedProjection = availableProjections.find(p => p >= config.projection);

                if (matchedProjection) {
                    basePrice = projectionsForWidth[matchedProjection.toString()];
                } else {
                    // Fallback: use largest projection if exceeding
                    const maxProj = availableProjections[availableProjections.length - 1];
                    basePrice = projectionsForWidth[maxProj.toString()];
                }
            } else {
                // Fallback: use largest width if exceeding
                const maxWidth = availableWidths[availableWidths.length - 1];
                const projectionsForWidth = model.pricing[maxWidth.toString()];
                const maxProj = Object.keys(projectionsForWidth).map(Number).sort((a, b) => a - b).pop();
                if (maxProj) {
                    basePrice = projectionsForWidth[maxProj.toString()];
                }
            }
        }
    }

    // 2. Calculate Add-ons Price
    let addonsPrice = 0;
    config.addons.forEach(addon => {
        addonsPrice += addon.price;
    });

    // Add Accessories Price
    if (config.selectedAccessories) {
        config.selectedAccessories.forEach(acc => {
            addonsPrice += acc.price * acc.quantity;
        });
    }

    // 3. Calculate Installation Costs (if applicable)
    let installationCosts = undefined;
    if (config.installationDays && config.installationDays > 0 && customerPostalCode) {
        const distance = calculateDistanceFromGubin(customerPostalCode);
        if (distance) {
            installationCosts = calculateInstallationCosts(config.installationDays, distance);
        }
    }

    // 4. Totals
    const totalCost = basePrice + addonsPrice;

    // Margin calculation: Selling Price = Cost / (1 - Margin%)
    let sellingPriceNet = totalCost / (1 - marginPercentage);
    const marginValue = sellingPriceNet - totalCost;

    // VAT 19%
    let sellingPriceGross = sellingPriceNet * 1.19;

    // Add Installation Costs (Gross) to final totals
    // Installation rates are Gross, so we add directly to Gross and back-calculate Net
    if (installationCosts) {
        sellingPriceGross += installationCosts.totalInstallation;
        sellingPriceNet += (installationCosts.totalInstallation / 1.19);
    }

    return {
        basePrice,
        addonsPrice,
        totalCost,
        marginPercentage: marginPercentage * 100,
        marginValue,
        sellingPriceNet,
        sellingPriceGross,
        installationCosts,
        numberOfFields,
        numberOfPosts
    };
}
