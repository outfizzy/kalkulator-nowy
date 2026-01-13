import type { Offer, OrderedItem } from '../types';

/**
 * Extracts OrderedItems from an Offer's product configuration.
 * Maps the offer's base pricing and addons to the OrderedItem structure
 * with purchase costs populated.
 */
export function extractOrderedItemsFromOffer(offer: Offer): OrderedItem[] {
    const items: OrderedItem[] = [];

    // 1. Add main roofing as first item
    const modelName = getModelDisplayName(offer.product.modelId);
    items.push({
        id: crypto.randomUUID(),
        category: 'Roofing',
        name: modelName,
        details: `${offer.product.width}mm x ${offer.product.projection}mm`,
        status: 'pending',
        purchaseCost: offer.pricing.basePrice
    });

    // 2. Process addons
    for (const addon of offer.product.addons || []) {
        const category = mapAddonTypeToCategory(addon.type);
        items.push({
            id: crypto.randomUUID(),
            category,
            name: addon.name,
            details: addon.variant || addon.description || undefined,
            status: 'pending',
            purchaseCost: addon.price
        });
    }

    // 3. Process selected accessories
    for (const accessory of offer.product.selectedAccessories || []) {
        items.push({
            id: crypto.randomUUID(),
            category: 'Accessories',
            name: accessory.name,
            details: accessory.quantity > 1 ? `x${accessory.quantity}` : undefined,
            status: 'pending',
            purchaseCost: accessory.price * accessory.quantity
        });
    }

    // 4. Process custom manual items
    if (offer.product.customItems) {
        for (const item of offer.product.customItems) {
            items.push({
                id: item.id || crypto.randomUUID(),
                category: 'Other', // Or map from attributes if available
                name: item.name,
                details: item.description,
                status: 'pending',
                purchaseCost: 0 // Manual items might not have known purchase cost in this context
            });
        }
    }

    return items;
}

function getModelDisplayName(modelId: string): string {
    const modelNames: Record<string, string> = {
        'orangestyle': 'Orangestyle',
        'trendstyle': 'Trendstyle',
        'topstyle': 'Topstyle',
        'skystyle': 'Skystyle',
        'orangeline': 'Orangeline'
    };
    return modelNames[modelId] || modelId;
}

function mapAddonTypeToCategory(addonType: string): OrderedItem['category'] {
    switch (addonType) {
        case 'awning':
        case 'zipScreen':
            return addonType === 'zipScreen' ? 'ZIP Screen' : 'Awning';
        case 'slidingWall':
        case 'fixedWall':
        case 'panorama':
            return 'Sliding Glass';
        case 'lighting':
        case 'heater':
            return 'Accessories';
        default:
            return 'Other';
    }
}
