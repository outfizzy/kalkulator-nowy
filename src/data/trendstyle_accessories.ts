export interface TrendstyleAccessory {
    system: string;
    category: string;
    description: string;
    unit: string;
    price_eur: number;
}

interface Accessory {
    product_type: string;
    system: string;
    length_mm: number | null;
    accessory_name: string;
    description: string;
    unit: string;
    price_net: number;
    currency: string;
}

import rawData from '../../trendstyle_accessories.json';

const parsed = (rawData as any).items as TrendstyleAccessory[];

const parseLength = (desc: string): number | null => {
    const match = desc.match(/(\d{3,4,5})\s*mm/i);
    return match ? Number(match[1]) : null;
};

export const trendstyleAccessories: Accessory[] = parsed.map(item => ({
    product_type: 'accessory',
    system: item.system,
    length_mm: parseLength(item.description),
    accessory_name: item.category,
    description: `${item.category} ${item.description}`.trim(),
    unit: item.unit,
    price_net: item.price_eur,
    currency: 'EUR'
}));
