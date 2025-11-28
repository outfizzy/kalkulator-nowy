export type GlassVariant = 'klar' | 'matt' | 'ig';

export interface AluminiumSeitenwandProduct {
    width_mm: number;
    price_44_2_vsg_klar: number;
    surcharge_44_2_matt: number;
    surcharge_isolierglas: number;
    surcharge_fenstersprosse: number;
    fields: number;
}

export interface AluminiumFrontwandProduct {
    width_mm: number;
    height_mm: string;
    price_44_2_vsg_klar: number;
    surcharge_44_2_matt: number;
    surcharge_isolierglas: number;
    surcharge_fenstersprosse: number;
    fields: number;
}

export interface AluminiumSchiebetuerProduct {
    width_mm: number;
    price_44_2_klar: number;
    surcharge_44_2_matt: number;
    surcharge_isolierglas: number;
    configuration: string;
}

export interface AluminiumWallsData {
    aluminium_seitenwand: {
        compatible_models: string[];
        products: AluminiumSeitenwandProduct[];
        options: {
            included: string[];
            optional: { name: string; price_eur: number }[];
        };
        dimensions: {
            max_height_h1_mm: number;
            max_height_h2_mm: number;
            kippfenster_min_height_mm: number;
            kippfenster_max_height_mm: number;
            kippfenster_min_width_mm: number;
            kippfenster_max_width_mm: number;
            max_glass_width_mm: number;
        };
    };
    aluminium_frontwand: {
        compatible_models: string[];
        products: AluminiumFrontwandProduct[];
        options: {
            included: string[];
            optional: { name: string; price_eur: number }[];
        };
    };
    aluminium_schiebetueren: {
        compatible_models: string[];
        products: AluminiumSchiebetuerProduct[];
        limits: { feldbreite_max_mm: number };
        handles: { name: string; description: string }[];
    };
}

export const aluminiumWallsData: AluminiumWallsData = {
    aluminium_seitenwand: {
        compatible_models: [
            'Orangestyle',
            'Orangestyle+',
            'Trendstyle',
            'Trendstyle+',
            'Topstyle',
            'Topstyle XL',
            'Designstyle',
            'Skystyle',
            'Ultrastyle',
            'Carport'
        ],
        products: [
            {
                width_mm: 1000,
                price_44_2_vsg_klar: 598.50,
                surcharge_44_2_matt: 20.31,
                surcharge_isolierglas: 158.28,
                surcharge_fenstersprosse: 82.67,
                fields: 1
            },
            {
                width_mm: 1500,
                price_44_2_vsg_klar: 798.00,
                surcharge_44_2_matt: 30.46,
                surcharge_isolierglas: 237.41,
                surcharge_fenstersprosse: 124.01,
                fields: 2
            },
            {
                width_mm: 2000,
                price_44_2_vsg_klar: 885.40,
                surcharge_44_2_matt: 40.61,
                surcharge_isolierglas: 316.55,
                surcharge_fenstersprosse: 165.35,
                fields: 2
            },
            {
                width_mm: 2500,
                price_44_2_vsg_klar: 1070.65,
                surcharge_44_2_matt: 50.77,
                surcharge_isolierglas: 395.69,
                surcharge_fenstersprosse: 207.29,
                fields: 3
            },
            {
                width_mm: 3000,
                price_44_2_vsg_klar: 1166.60,
                surcharge_44_2_matt: 60.92,
                surcharge_isolierglas: 474.83,
                surcharge_fenstersprosse: 249.23,
                fields: 3
            },
            {
                width_mm: 3500,
                price_44_2_vsg_klar: 1375.60,
                surcharge_44_2_matt: 71.07,
                surcharge_isolierglas: 553.97,
                surcharge_fenstersprosse: 289.96,
                fields: 4
            },
            {
                width_mm: 4000,
                price_44_2_vsg_klar: 1470.60,
                surcharge_44_2_matt: 81.23,
                surcharge_isolierglas: 633.10,
                surcharge_fenstersprosse: 330.68,
                fields: 4
            },
            {
                width_mm: 4500,
                price_44_2_vsg_klar: 1676.75,
                surcharge_44_2_matt: 91.38,
                surcharge_isolierglas: 712.24,
                surcharge_fenstersprosse: 372.03,
                fields: 5
            },
            {
                width_mm: 5000,
                price_44_2_vsg_klar: 1773.65,
                surcharge_44_2_matt: 101.53,
                surcharge_isolierglas: 791.38,
                surcharge_fenstersprosse: 413.35,
                fields: 5
            }
        ],
        options: {
            included: [
                'Dichtung 44.2 Klarglas',
                'Entwässerungskappen'
            ],
            optional: [
                {
                    name: 'Unteres Profil / Rahmen U-Profil',
                    price_eur: 40.54
                },
                {
                    name: 'Schrauben-Set',
                    price_eur: 16.17
                },
                {
                    name: 'Dreh-Kipp Funktion',
                    price_eur: 921.46
                }
            ]
        },
        dimensions: {
            max_height_h1_mm: 2400,
            max_height_h2_mm: 3400,
            kippfenster_min_height_mm: 400,
            kippfenster_max_height_mm: 1000,
            kippfenster_min_width_mm: 500,
            kippfenster_max_width_mm: 1500,
            max_glass_width_mm: 1000
        }
    },

    aluminium_frontwand: {
        compatible_models: [
            'Orangestyle',
            'Orangestyle+',
            'Trendstyle',
            'Trendstyle+',
            'Topstyle',
            'Topstyle XL',
            'Designstyle',
            'Skystyle',
            'Ultrastyle',
            'Carport'
        ],
        products: [
            {
                width_mm: 1000,
                height_mm: '2200/2400',
                price_44_2_vsg_klar: 548.15,
                surcharge_44_2_matt: 19.49,
                surcharge_isolierglas: 151.94,
                surcharge_fenstersprosse: 82.67,
                fields: 1
            },
            {
                width_mm: 2000,
                height_mm: '2200/2400',
                price_44_2_vsg_klar: 779.00,
                surcharge_44_2_matt: 38.99,
                surcharge_isolierglas: 303.89,
                surcharge_fenstersprosse: 165.35,
                fields: 2
            },
            {
                width_mm: 3000,
                height_mm: '2200/2400',
                price_44_2_vsg_klar: 1022.20,
                surcharge_44_2_matt: 58.48,
                surcharge_isolierglas: 455.83,
                surcharge_fenstersprosse: 249.23,
                fields: 3
            },
            {
                width_mm: 4000,
                height_mm: '2200/2400',
                price_44_2_vsg_klar: 1265.40,
                surcharge_44_2_matt: 77.98,
                surcharge_isolierglas: 607.78,
                surcharge_fenstersprosse: 330.68,
                fields: 4
            },
            {
                width_mm: 5000,
                height_mm: '2200/2400',
                price_44_2_vsg_klar: 1519.05,
                surcharge_44_2_matt: 97.47,
                surcharge_isolierglas: 759.72,
                surcharge_fenstersprosse: 413.35,
                fields: 5
            },
            {
                width_mm: 6000,
                height_mm: '2200/2400',
                price_44_2_vsg_klar: 1657.75,
                surcharge_44_2_matt: 116.96,
                surcharge_isolierglas: 911.67,
                surcharge_fenstersprosse: 497.25,
                fields: 6
            },
            {
                width_mm: 7000,
                height_mm: '2200/2400',
                price_44_2_vsg_klar: 1866.75,
                surcharge_44_2_matt: 136.46,
                surcharge_isolierglas: 1063.61,
                surcharge_fenstersprosse: 579.91,
                fields: 7
            }
        ],
        options: {
            included: [
                'Dichtung 44.2 VSG klar',
                'Entwässerungskappen'
            ],
            optional: [
                { name: 'Dreh-Kipp Funktion', price_eur: 596.13 },
                { name: 'Dreh-Kipp Funktion Doppeltür', price_eur: 921.46 },
                { name: 'Dreh-Kipp Tür groß', price_eur: 1232.62 },
                { name: 'Dreh-Kipp Doppeltür groß', price_eur: 1879.76 }
            ]
        }
    },

    aluminium_schiebetueren: {
        compatible_models: [
            'Orangestyle',
            'Orangestyle+',
            'Trendstyle',
            'Trendstyle+',
            'Topstyle',
            'Topstyle XL',
            'Designstyle',
            'Skystyle',
            'Ultrastyle',
            'Carport'
        ],
        products: [
            {
                width_mm: 2000,
                price_44_2_klar: 1201.75,
                surcharge_44_2_matt: 42.24,
                surcharge_isolierglas: 329.21,
                configuration: '2-teilig'
            },
            {
                width_mm: 2500,
                price_44_2_klar: 1290.10,
                surcharge_44_2_matt: 52.80,
                surcharge_isolierglas: 411.52,
                configuration: '2-teilig'
            },
            {
                width_mm: 3000,
                price_44_2_klar: 1822.10,
                surcharge_44_2_matt: 63.36,
                surcharge_isolierglas: 493.82,
                configuration: '2-3-teilig'
            },
            {
                width_mm: 3500,
                price_44_2_klar: 1938.00,
                surcharge_44_2_matt: 73.91,
                surcharge_isolierglas: 576.12,
                configuration: '3-teilig'
            },
            {
                width_mm: 4000,
                price_44_2_klar: 2059.60,
                surcharge_44_2_matt: 84.47,
                surcharge_isolierglas: 658.43,
                configuration: '3-4-teilig'
            },
            {
                width_mm: 4500,
                price_44_2_klar: 2180.25,
                surcharge_44_2_matt: 95.03,
                surcharge_isolierglas: 740.73,
                configuration: '3-4-teilig'
            },
            {
                width_mm: 5000,
                price_44_2_klar: 2382.60,
                surcharge_44_2_matt: 105.59,
                surcharge_isolierglas: 823.03,
                configuration: '4-teilig'
            },
            {
                width_mm: 5500,
                price_44_2_klar: 2930.75,
                surcharge_44_2_matt: 116.15,
                surcharge_isolierglas: 905.34,
                configuration: '4-6-teilig'
            },
            {
                width_mm: 6000,
                price_44_2_klar: 3116.00,
                surcharge_44_2_matt: 126.71,
                surcharge_isolierglas: 987.64,
                configuration: '4-6-teilig'
            }
        ],
        limits: {
            feldbreite_max_mm: 1500
        },
        handles: [
            { name: 'ACSL2042', description: 'Handgriff flach (innen)' },
            { name: 'ACSL2046', description: 'Handgriff fest (außen)' },
            { name: 'ACSL2044', description: 'Handgriff fest (innen)' },
            { name: 'ACSL2047', description: 'Handgriff mit Zylinder (außen)' }
        ]
    }
};

function findByWidth<T extends { width_mm: number }>(items: T[], width: number): T {
    return items.find(p => p.width_mm >= width) || items[items.length - 1];
}

export function priceAluSeitenwand(width: number, glass: GlassVariant, fensterSprosse: boolean): number {
    const p = findByWidth(aluminiumWallsData.aluminium_seitenwand.products, width);
    let price = p.price_44_2_vsg_klar;
    if (glass === 'matt') price += p.surcharge_44_2_matt;
    if (glass === 'ig') price += p.surcharge_isolierglas;
    if (fensterSprosse) price += p.surcharge_fenstersprosse;
    return price;
}

export function priceAluFrontwand(width: number, glass: GlassVariant, fensterSprosse: boolean): number {
    const p = findByWidth(aluminiumWallsData.aluminium_frontwand.products, width);
    let price = p.price_44_2_vsg_klar;
    if (glass === 'matt') price += p.surcharge_44_2_matt;
    if (glass === 'ig') price += p.surcharge_isolierglas;
    if (fensterSprosse) price += p.surcharge_fenstersprosse;
    return price;
}

export function priceAluSchiebetuer(width: number, glass: GlassVariant): { price: number; config: string } {
    const p = findByWidth(aluminiumWallsData.aluminium_schiebetueren.products, width);
    let price = p.price_44_2_klar;
    if (glass === 'matt') price += p.surcharge_44_2_matt;
    if (glass === 'ig') price += p.surcharge_isolierglas;
    return { price, config: p.configuration };
}

export function isAluWallCompatible(modelId: string | undefined): boolean {
    if (!modelId) return false;
    const map: Record<string, string> = {
        orangestyle: 'Orangestyle',
        orangestyle_plus: 'Orangestyle+',
        trendstyle: 'Trendstyle',
        trendstyle_plus: 'Trendstyle+',
        topline: 'Topstyle',
        topline_xl: 'Topstyle XL',
        designstyle: 'Designstyle',
        skystyle: 'Skystyle',
        ultrastyle: 'Ultrastyle',
        carport: 'Carport'
    };
    const name = map[modelId] || modelId;
    return aluminiumWallsData.aluminium_seitenwand.compatible_models.includes(name);
}
