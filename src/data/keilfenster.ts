export interface KeilfensterProduct {
    width_mm: number;
    price_glass_44_2_eur: number;
    surcharge_vsg_matt_44_2_eur: number;
    surcharge_ig_33_1_10_33_1_eur: number;
    fields: number;
}

export interface KeilfensterOption {
    name: string;
    price_eur: number;
}

export interface KeilfensterData {
    type: 'keilfenster';
    compatible_models: string[];
    products: KeilfensterProduct[];
    options: {
        planible_grey_vsg_8mm_available: boolean;
        included: string[];
        optional: KeilfensterOption[];
    };
    colors: {
        standard: string[];
        special_ral_surcharge_percent: number;
    };
    dimensions: {
        min_height_h1_mm: number;
        max_height_h2_mm: number;
        max_segment_width_mm: number;
        kippfenster_min_height_mm: number;
        kippfenster_max_height_mm: number;
        kippfenster_min_width_mm: number;
        kippfenster_max_width_mm: number;
    };
    delivery_includes: string[];
}

export const keilfensterData: KeilfensterData = {
    type: 'keilfenster',
    compatible_models: [
        'Orangestyle',
        'Orangestyle+',
        'Trendstyle',
        'Trendstyle+',
        'Topline',
        'Topline XL',
        'Designstyle'
    ],
    products: [
        {
            width_mm: 2000,
            price_glass_44_2_eur: 481.65,
            surcharge_vsg_matt_44_2_eur: 8.12,
            surcharge_ig_33_1_10_33_1_eur: 63.31,
            fields: 2
        },
        {
            width_mm: 2500,
            price_glass_44_2_eur: 527.25,
            surcharge_vsg_matt_44_2_eur: 10.15,
            surcharge_ig_33_1_10_33_1_eur: 79.14,
            fields: 2
        },
        {
            width_mm: 3000,
            price_glass_44_2_eur: 571.9,
            surcharge_vsg_matt_44_2_eur: 12.18,
            surcharge_ig_33_1_10_33_1_eur: 94.97,
            fields: 2
        },
        {
            width_mm: 3500,
            price_glass_44_2_eur: 616.55,
            surcharge_vsg_matt_44_2_eur: 14.21,
            surcharge_ig_33_1_10_33_1_eur: 110.79,
            fields: 2
        },
        {
            width_mm: 4000,
            price_glass_44_2_eur: 680.2,
            surcharge_vsg_matt_44_2_eur: 16.25,
            surcharge_ig_33_1_10_33_1_eur: 126.62,
            fields: 3
        },
        {
            width_mm: 4500,
            price_glass_44_2_eur: 722.95,
            surcharge_vsg_matt_44_2_eur: 18.28,
            surcharge_ig_33_1_10_33_1_eur: 142.45,
            fields: 3
        },
        {
            width_mm: 5000,
            price_glass_44_2_eur: 767.6,
            surcharge_vsg_matt_44_2_eur: 20.31,
            surcharge_ig_33_1_10_33_1_eur: 158.28,
            fields: 3
        }
    ],
    options: {
        planible_grey_vsg_8mm_available: true,
        included: [
            'Dichtung 44.2 Klarglas',
            'Entwässerungskappen'
        ],
        optional: [
            {
                name: 'Ausgleichs U Profil für Fenster 55x29mm',
                price_eur: 40.54
            },
            {
                name: 'Schrauben-Set',
                price_eur: 16.17
            },
            {
                name: 'Kipp-Fenster',
                price_eur: 596.13
            },
            {
                name: 'Abdeckung Keilfenster EL891 (3200mm)',
                price_eur: 21.19
            }
        ]
    },
    colors: {
        standard: [
            'RAL 7016 Feinstruktur / Matt',
            'RAL 9007 Feinstruktur / Matt',
            'RAL 9010 Feinstruktur / Matt',
            'RAL 9016 Glatt / Seidenglanz',
            'RAL 9005 Feinstruktur / Matt',
            'DB703 Eisenglimmergrau'
        ],
        special_ral_surcharge_percent: 30
    },
    dimensions: {
        min_height_h1_mm: 39,
        max_height_h2_mm: 1000,
        max_segment_width_mm: 1750,
        kippfenster_min_height_mm: 400,
        kippfenster_max_height_mm: 1000,
        kippfenster_min_width_mm: 500,
        kippfenster_max_width_mm: 1500
    },
    delivery_includes: [
        'Fenster vormontiert'
    ]
};

export function priceKeilfenster(width: number, glassVariant: 'clear' | 'mat' | 'ig', specialRal: boolean): number {
    const products = keilfensterData.products;
    const match = products.find(p => p.width_mm >= width) || products[products.length - 1];
    let price = match.price_glass_44_2_eur;
    if (glassVariant === 'mat') price += match.surcharge_vsg_matt_44_2_eur;
    if (glassVariant === 'ig') price += match.surcharge_ig_33_1_10_33_1_eur;
    if (specialRal) price *= 1 + keilfensterData.colors.special_ral_surcharge_percent / 100;
    return price;
}
