export interface AwningPricing {
    description: string;
    projection_mm: number[];
    prices: Record<string, number[]>;
    brackets_per_projection: Record<string, number>;
    mounting_consoles?: number;
}

export interface AwningData {
    type: string;
    compatible_models: string[];
    limits: {
        max_single_field_width_mm?: number;
        max_projection_mm?: number;
        max_coupled_width_mm?: number;
        max_width_mm?: number;
        max_drop_mm?: number;
        coupling_note?: string;
    };
    one_field?: AwningPricing;
    two_fields?: AwningPricing;
    widths_mm?: number[];
    drops_mm?: number[];
    holders_per_width?: Record<string, number>;
    prices?: Record<string, number[]>;
    includes?: string[];
    notes?: string[];
    colors: {
        standard: string[];
        special_color_surcharge_eur: number;
    };
    fabric_suppliers: string[];
    extras?: {
        mounting_brackets_price_tr_tl_eur: number;
        mounting_brackets_price_dl_ul_eur: number;
        wind_rain_sensor_eur: number;
    };
}

export const awningsData: Record<string, AwningData> = {
    "aufdachmarkise_zip": {
        "type": "aufdachmarkise_zip",
        "compatible_models": [
            "Orangestyle", "Orangestyle+",
            "Trendstyle", "Trendstyle+",
            "Topstyle", "Topstyle XL",
            "Designstyle", "Skystyle",
            "Ultrastyle", "Carport"
        ],
        "limits": {
            "max_single_field_width_mm": 6000,
            "max_projection_mm": 5000,
            "max_coupled_width_mm": 12000,
            "coupling_note": "Kupplung max. 2 x 5.000 mm"
        },
        "one_field": {
            "description": "1 Feld (bis 5000 mm Breite) = 1 Motor",
            "projection_mm": [2500, 3000, 3500, 4000, 4500, 5000],
            "prices": {
                "3000": [1522, 1589, 1659, 1742, 1813, 1880],
                "3500": [1625, 1701, 1779, 1872, 1950, 2026],
                "4000": [1720, 1805, 1891, 1992, 2080, 2164],
                "4500": [1807, 1900, 1996, 2105, 2201, 2295],
                "5000": [1902, 2005, 2109, 2227, 2331, 2466],
                "5500": [2006, 2118, 2231, 2357, 2470, 2581],
                "6000": [2118, 2237, 2359, 2495, 2616, 2735]
            },
            "brackets_per_projection": {
                "2500": 6,
                "3000": 6,
                "3500": 6,
                "4000": 8,
                "4500": 8,
                "5000": 8
            }
        },
        "two_fields": {
            "description": "2 Felder (ab 5000 mm Breite) = 2 Motoren",
            "projection_mm": [2500, 3000, 3500, 4000, 4500, 5000],
            "prices": {
                "6000": [3089, 3224, 3365, 3531, 3671, 3806],
                "7000": [3296, 3448, 3605, 3790, 3946, 4098],
                "8000": [3486, 3656, 3829, 4032, 4206, 4376],
                "9000": [3660, 3942, 4038, 4258, 4449, 4636],
                "10000": [3850, 4145, 4264, 4500, 4709, 4913],
                "11000": [4059, 4281, 4507, 4760, 4987, 5209],
                "12000": [4282, 4520, 4764, 5035, 5278, 5518]
            },
            "brackets_per_projection": {
                "2500": 9,
                "3000": 9,
                "3500": 9,
                "4000": 12,
                "4500": 12,
                "5000": 12
            }
        },
        "colors": {
            "standard": [
                "RAL 7016 Feinstruktur / Matt",
                "RAL 9007 Feinstruktur / Matt",
                "RAL 9010 Feinstruktur / Matt",
                "RAL 9016 Glatt / Seidenglanz",
                "RAL 9005 Feinstruktur / Matt",
                "DB703 Eisenglimmergrau"
            ],
            "special_color_surcharge_eur": 200
        },
        "fabric_suppliers": ["Sattler", "Para", "Serge Ferrari"],
        "extras": {
            "mounting_brackets_price_tr_tl_eur": 100,
            "mounting_brackets_price_dl_ul_eur": 150,
            "wind_rain_sensor_eur": 341.34
        }
    },
    "unterdachmarkise_zip": {
        "type": "unterdachmarkise_zip",
        "compatible_models": [
            "Orangestyle", "Orangestyle+",
            "Trendstyle", "Trendstyle+",
            "Topstyle", "Topstyle XL",
            "Designstyle", "Skystyle",
            "Ultrastyle", "Carport"
        ],
        "limits": {
            "max_single_field_width_mm": 6000,
            "max_projection_mm": 5000,
            "max_coupled_width_mm": 12000,
            "coupling_note": "Kupplung max. 2 x 6.000 mm"
        },
        "one_field": {
            "description": "1 Feld – 1 Motor",
            "projection_mm": [2500, 3000, 3500, 4000, 4500, 5000],
            "mounting_consoles": 2,
            "prices": {
                "3000": [1522, 1589, 1659, 1742, 1813, 1880],
                "3500": [1625, 1701, 1779, 1872, 1950, 2026],
                "4000": [1720, 1805, 1891, 1992, 2080, 2164],
                "4500": [1807, 1900, 1996, 2105, 2201, 2295],
                "5000": [1902, 2005, 2109, 2227, 2331, 2466],
                "5500": [2006, 2118, 2231, 2357, 2470, 2581],
                "6000": [2118, 2237, 2359, 2495, 2616, 2735]
            },
            "brackets_per_projection": {
                "2500": 6,
                "3000": 6,
                "3500": 6,
                "4000": 8,
                "4500": 8,
                "5000": 8
            }
        },
        "two_fields": {
            "description": "2 Feld – 2 Motor",
            "projection_mm": [2500, 3000, 3500, 4000, 4500, 5000],
            "mounting_consoles": 4,
            "prices": {
                "6000": [3089, 3224, 3365, 3531, 3671, 3806],
                "7000": [3296, 3448, 3605, 3790, 3946, 4098],
                "8000": [3486, 3656, 3829, 4032, 4206, 4376],
                "9000": [3660, 3942, 4038, 4258, 4449, 4636],
                "10000": [3850, 4145, 4264, 4500, 4709, 4913],
                "11000": [4059, 4281, 4507, 4760, 4987, 5209],
                "12000": [4282, 4520, 4764, 5035, 5278, 5518]
            },
            "brackets_per_projection": {
                "2500": 9,
                "3000": 9,
                "3500": 9,
                "4000": 12,
                "4500": 12,
                "5000": 12
            }
        },
        "colors": {
            "standard": [
                "RAL 7016 Feinstruktur / Matt",
                "RAL 9007 Feinstruktur / Matt",
                "RAL 9010 Feinstruktur / Matt",
                "RAL 9016 Glatt / Seidenglanz",
                "RAL 9005 Feinstruktur / Matt",
                "DB703 Eisenglimmergrau"
            ],
            "special_color_surcharge_eur": 200
        },
        "fabric_suppliers": ["Sattler", "Para", "Serge Ferrari"],
        "extras": {
            "mounting_brackets_price_tr_tl_eur": 100,
            "mounting_brackets_price_dl_ul_eur": 150,
            "wind_rain_sensor_eur": 341.34
        }
    },
    "zip_screen": {
        "type": "senkrechtmarkise_zip",
        "compatible_models": [
            "Orangestyle", "Orangestyle+",
            "Trendstyle", "Trendstyle+",
            "Topstyle", "Topstyle XL",
            "Designstyle", "Skystyle",
            "Ultrastyle", "Carport"
        ],
        "limits": {
            "max_width_mm": 6000,
            "max_drop_mm": 3000
        },
        "widths_mm": [
            1500, 1750, 2000, 2250, 2500,
            2750, 3000, 3250, 3500, 3750,
            4000, 4250, 4500, 4750, 5000,
            5250, 5500, 5750, 6000
        ],
        "drops_mm": [
            1000, 1250, 1500, 1750, 2000,
            2250, 2500, 2750, 3000
        ],
        "holders_per_width": {
            "1500": 2, "1750": 2, "2000": 2, "2250": 2, "2500": 2,
            "2750": 2, "3000": 2, "3250": 2, "3500": 2, "3750": 2,
            "4000": 3, "4250": 3, "4500": 3, "4750": 3, "5000": 3,
            "5250": 3, "5500": 3, "5750": 3, "6000": 3
        },
        "prices": {
            "1500": [850.93, 880.79, 909.29, 932.36, 955.43, 981.21, 1007.00, 1054.50, 1068.07],
            "1750": [878.07, 909.29, 943.21, 963.57, 983.93, 1024.64, 1064.00, 1096.57, 1126.43],
            "2000": [901.14, 937.79, 971.71, 996.14, 1019.21, 1061.29, 1103.36, 1111.50, 1168.50],
            "2250": [931.00, 962.21, 993.43, 1019.21, 1043.64, 1081.64, 1119.64, 1160.36, 1201.07],
            "2500": [958.14, 988.00, 1013.79, 1042.29, 1068.07, 1103.36, 1137.29, 1184.79, 1232.29],
            "2750": [979.86, 1008.36, 1038.21, 1064.00, 1092.50, 1134.57, 1176.64, 1220.07, 1263.50],
            "3000": [1000.21, 1031.43, 1061.29, 1091.14, 1118.29, 1165.79, 1213.29, 1255.36, 1294.71],
            "3250": [1016.50, 1050.43, 1080.29, 1110.14, 1141.36, 1190.21, 1239.07, 1281.14, 1323.21],
            "3500": [1034.14, 1065.36, 1097.93, 1129.14, 1160.36, 1199.71, 1262.14, 1305.57, 1347.64],
            "3750": [1059.93, 1089.79, 1118.29, 1157.64, 1197.00, 1248.57, 1301.50, 1347.64, 1391.07],
            "4000": [1088.43, 1111.50, 1137.29, 1184.79, 1229.57, 1285.21, 1339.50, 1387.00, 1433.14],
            "4250": [1141.36, 1180.71, 1220.07, 1264.86, 1308.29, 1368.00, 1426.36, 1477.93, 1529.50],
            "4500": [1194.29, 1249.93, 1305.57, 1349.00, 1388.36, 1453.50, 1514.57, 1570.21, 1624.50],
            "4750": [1225.50, 1285.21, 1340.86, 1385.64, 1427.71, 1499.64, 1570.21, 1621.79, 1673.36],
            "5000": [1256.71, 1317.79, 1376.14, 1422.29, 1467.07, 1545.79, 1624.50, 1673.36, 1719.50],
            "5250": [1293.36, 1357.14, 1419.57, 1467.07, 1513.21, 1598.71, 1684.21, 1729.00, 1773.79],
            "5500": [1338.14, 1403.29, 1468.43, 1517.29, 1566.14, 1659.79, 1752.07, 1794.14, 1832.14],
            "5750": [1388.36, 1456.21, 1522.71, 1574.29, 1624.50, 1726.29, 1825.36, 1862.00, 1900.00],
            "6000": [1444.00, 1515.93, 1585.14, 1638.07, 1691.00, 1798.21, 1905.43, 1939.36, 1973.29]
        },
        "includes": [
            "Somfy IO Motor",
            "Kabel",
            "5-Kanal Fernbedienung"
        ],
        "notes": [
            "Preis inkl. Motor und Steuerung, exkl. Montagematerial",
            "Bitte nutzen Sie das Markisen-Bestell-Formular (ALUXE Downloads)"
        ],
        "colors": {
            "standard": [
                "RAL 7016 Feinstruktur / Matt",
                "RAL 9007 Feinstruktur / Matt",
                "RAL 9010 Feinstruktur / Matt",
                "RAL 9016 Glatt / Seidenglanz",
                "RAL 9005 Feinstruktur / Matt",
                "DB703 Eisenglimmergrau"
            ],
            "special_color_surcharge_eur": 150
        },
        "fabric_suppliers": [
            "Sattler",
            "Para",
            "Serge Ferrari"
        ]
    }
};
