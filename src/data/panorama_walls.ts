export interface PanoramaVariant {
    track_type: string;
    panel: {
        paneel_width_min_mm: number;
        paneel_width_max_mm: number;
        max_height_mm: number;
        price_per_panel: Record<string, number>;
    };
    loose_material: {
        name: string;
        unit: string;
        price_per_track: Record<string, number>;
    }[];
}

export interface PanoramaData {
    type: string;
    compatible_models: string[];
    variants: Record<string, PanoramaVariant>;
}

export const panoramaWallsData: PanoramaData = {
    "type": "panorama_schiebewand",
    "compatible_models": [
        "Orangestyle",
        "Orangestyle+",
        "Trendstyle",
        "Trendstyle+",
        "Topstyle",
        "Topstyle XL",
        "Designstyle",
        "Skystyle",
        "Ultrastyle",
        "Carport"
    ],
    "variants": {
        "AL22": {
            "track_type": "flach",
            "panel": {
                "paneel_width_min_mm": 600,
                "paneel_width_max_mm": 1100,
                "max_height_mm": 2650,
                "price_per_panel": {
                    "3_tracks": 242.25,
                    "5_tracks": 247.00
                }
            },
            "loose_material": [
                {
                    "name": "Laufschiene unten",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 10.88,
                        "5_tracks": 17.27
                    }
                },
                {
                    "name": "Laufschiene oben",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 28.46,
                        "5_tracks": 41.03
                    }
                },
                {
                    "name": "Seitenprofil",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 11.26,
                        "5_tracks": 11.26
                    }
                },
                {
                    "name": "Koppelprofil / Keilfenster",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 7.84,
                        "5_tracks": 11.35
                    }
                },
                {
                    "name": "Edelstahl Schloss (seitlich öffnend)",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 73.64,
                        "5_tracks": 73.64
                    }
                },
                {
                    "name": "Edelstahl Schloss (mittig öffnend)",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 98.19,
                        "5_tracks": 98.19
                    }
                },
                {
                    "name": "Türknauf aus Edelstahl",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 36.78,
                        "5_tracks": 36.78
                    }
                },
                {
                    "name": "Türgriff Edelstahl oder Schwarz",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 14.25,
                        "5_tracks": 14.25
                    }
                },
                {
                    "name": "Verriegelung AL22/23/24",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 9.83,
                        "5_tracks": 9.83
                    }
                },
                {
                    "name": "Steel-Look U Profil 2400mm",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 19.00,
                        "5_tracks": 19.00
                    }
                },
                {
                    "name": "Steel-Look U Profil 2400mm mit Bürstendichtung",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 19.00,
                        "5_tracks": 19.00
                    }
                },
                {
                    "name": "Bürstendichtung für Steel-Look Profile",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 0.99,
                        "5_tracks": 0.99
                    }
                },
                {
                    "name": "Steel-Look horizontal Strip",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 3.80,
                        "5_tracks": 3.80
                    }
                },
                {
                    "name": "Steel-Look Tape 50m",
                    "unit": "roll",
                    "price_per_track": {
                        "3_tracks": 19.95,
                        "5_tracks": 19.95
                    }
                },
                {
                    "name": "Planibel Grey 10mm",
                    "unit": "m2",
                    "price_per_track": {
                        "3_tracks": 105.09,
                        "5_tracks": 105.09
                    }
                },
                {
                    "name": "ESG klar 10mm",
                    "unit": "m2",
                    "price_per_track": {
                        "3_tracks": 57.00,
                        "5_tracks": 57.00
                    }
                }
            ]
        },
        "AL23": {
            "track_type": "hoch",
            "panel": {
                "paneel_width_min_mm": 600,
                "paneel_width_max_mm": 1100,
                "max_height_mm": 2650,
                "price_per_panel": {
                    "3_tracks": 261.25,
                    "4_tracks": 266.00,
                    "5_tracks": 266.00,
                    "6_tracks": 266.00,
                    "7_tracks": 266.00
                }
            },
            "loose_material": [
                {
                    "name": "Laufschiene unten",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 24.47,
                        "4_tracks": 30.55,
                        "5_tracks": 36.62,
                        "6_tracks": 43.95,
                        "7_tracks": 51.27
                    }
                },
                {
                    "name": "Laufschiene oben",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 28.46,
                        "4_tracks": 34.73,
                        "5_tracks": 41.03,
                        "6_tracks": 49.58,
                        "7_tracks": 57.87
                    }
                },
                {
                    "name": "Seitenprofil",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 11.26,
                        "4_tracks": 11.26,
                        "5_tracks": 11.26,
                        "6_tracks": 11.26,
                        "7_tracks": 11.26
                    }
                },
                {
                    "name": "Koppelprofil / Keilfenster",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 7.84,
                        "4_tracks": 9.60,
                        "5_tracks": 11.35
                    }
                },
                {
                    "name": "Edelstahl Schloss (seitlich öffnend)",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 73.64,
                        "4_tracks": 73.64,
                        "5_tracks": 73.64,
                        "6_tracks": 73.64,
                        "7_tracks": 73.64
                    }
                },
                {
                    "name": "Edelstahl Schloss (mittig öffnend)",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 98.19,
                        "4_tracks": 98.19,
                        "5_tracks": 98.19,
                        "6_tracks": 98.19,
                        "7_tracks": 98.19
                    }
                },
                {
                    "name": "Türknauf Edelstahl",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 36.78,
                        "4_tracks": 36.78,
                        "5_tracks": 36.78,
                        "6_tracks": 36.78,
                        "7_tracks": 36.78
                    }
                },
                {
                    "name": "Türgriff Edelstahl oder Schwarz",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 14.25,
                        "4_tracks": 14.25,
                        "5_tracks": 14.25,
                        "6_tracks": 14.25,
                        "7_tracks": 14.25
                    }
                },
                {
                    "name": "Verriegelung AL22/23/24",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 9.83,
                        "4_tracks": 9.83,
                        "5_tracks": 9.83,
                        "6_tracks": 9.83,
                        "7_tracks": 9.83
                    }
                },
                {
                    "name": "Steel-Look U Profil 2400mm",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 19.00,
                        "4_tracks": 19.00,
                        "5_tracks": 19.00,
                        "6_tracks": 19.00,
                        "7_tracks": 19.00
                    }
                },
                {
                    "name": "Steel-Look U Profil 2400mm mit Bürstendichtung",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 19.00,
                        "4_tracks": 19.00,
                        "5_tracks": 19.00,
                        "6_tracks": 19.00,
                        "7_tracks": 19.00
                    }
                },
                {
                    "name": "Bürstendichtung für Steel-Look Profile",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 0.99,
                        "4_tracks": 0.99,
                        "5_tracks": 0.99,
                        "6_tracks": 0.99,
                        "7_tracks": 0.99
                    }
                },
                {
                    "name": "Steel-Look horizontal Strip",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 3.80,
                        "4_tracks": 3.80,
                        "5_tracks": 3.80,
                        "6_tracks": 3.80,
                        "7_tracks": 3.80
                    }
                },
                {
                    "name": "Steel-Look Tape 50m",
                    "unit": "roll",
                    "price_per_track": {
                        "3_tracks": 19.95,
                        "4_tracks": 19.95,
                        "5_tracks": 19.95,
                        "6_tracks": 19.95,
                        "7_tracks": 19.95
                    }
                },
                {
                    "name": "Planibel Grau 10mm",
                    "unit": "m2",
                    "price_per_track": {
                        "3_tracks": 105.09,
                        "4_tracks": 105.09,
                        "5_tracks": 105.09,
                        "6_tracks": 105.09,
                        "7_tracks": 105.09
                    }
                },
                {
                    "name": "Klar 10mm",
                    "unit": "m2",
                    "price_per_track": {
                        "3_tracks": 57.00,
                        "4_tracks": 57.00,
                        "5_tracks": 57.00,
                        "6_tracks": 57.00,
                        "7_tracks": 57.00
                    }
                }
            ]
        },
        "AL24": {
            "track_type": "hoch",
            "panel": {
                "paneel_width_min_mm": 600,
                "paneel_width_max_mm": 1100,
                "max_height_mm": 2650,
                "price_per_panel": {
                    "3_tracks": 242.25,
                    "4_tracks": 247.00,
                    "5_tracks": 247.00,
                    "6_tracks": 247.00,
                    "7_tracks": 247.00
                }
            },
            "loose_material": [
                {
                    "name": "Laufschiene unten",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 13.27,
                        "4_tracks": 17.95,
                        "5_tracks": 21.75,
                        "6_tracks": 25.68,
                        "7_tracks": 29.82
                    }
                },
                {
                    "name": "Laufschiene oben",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 28.46,
                        "4_tracks": 34.73,
                        "5_tracks": 41.03,
                        "6_tracks": 49.58,
                        "7_tracks": 57.87
                    }
                },
                {
                    "name": "Seitenprofil",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 11.26,
                        "4_tracks": 11.26,
                        "5_tracks": 11.26,
                        "6_tracks": 11.26,
                        "7_tracks": 11.26
                    }
                },
                {
                    "name": "Koppelprofil / Keilfenster",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 7.84,
                        "4_tracks": 9.60,
                        "5_tracks": 11.35
                    }
                },
                {
                    "name": "Edelstahl Schloss (seitlich öffnend)",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 73.64,
                        "4_tracks": 73.64,
                        "5_tracks": 73.64,
                        "6_tracks": 73.64,
                        "7_tracks": 73.64
                    }
                },
                {
                    "name": "Edelstahl Schloss (mittig öffnend)",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 98.19,
                        "4_tracks": 98.19,
                        "5_tracks": 98.19,
                        "6_tracks": 98.19,
                        "7_tracks": 98.19
                    }
                },
                {
                    "name": "Türknauf aus Edelstahl",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 36.78,
                        "4_tracks": 36.78,
                        "5_tracks": 36.78,
                        "6_tracks": 36.78,
                        "7_tracks": 36.78
                    }
                },
                {
                    "name": "Türgriff Edelstahl oder Schwarz",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 14.25,
                        "4_tracks": 14.25,
                        "5_tracks": 14.25,
                        "6_tracks": 14.25,
                        "7_tracks": 14.25
                    }
                },
                {
                    "name": "Verriegelung AL22/23/24",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 9.83,
                        "4_tracks": 9.83,
                        "5_tracks": 9.83,
                        "6_tracks": 9.83,
                        "7_tracks": 9.83
                    }
                },
                {
                    "name": "Bürstenprofil",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 14.70,
                        "4_tracks": 14.70,
                        "5_tracks": 14.70,
                        "6_tracks": 14.70,
                        "7_tracks": 14.70
                    }
                },
                {
                    "name": "Steel-Look U Profil 2400mm",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 19.00,
                        "4_tracks": 19.00,
                        "5_tracks": 19.00,
                        "6_tracks": 19.00,
                        "7_tracks": 19.00
                    }
                },
                {
                    "name": "Steel-Look U Profil 2400mm mit Bürstendichtung",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 19.00,
                        "4_tracks": 19.00,
                        "5_tracks": 19.00,
                        "6_tracks": 19.00,
                        "7_tracks": 19.00
                    }
                },
                {
                    "name": "Bürstendichtung für Steel-Look Profile",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 0.99,
                        "4_tracks": 0.99,
                        "5_tracks": 0.99,
                        "6_tracks": 0.99,
                        "7_tracks": 0.99
                    }
                },
                {
                    "name": "Steel-Look horizontal Strip",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 3.80,
                        "4_tracks": 3.80,
                        "5_tracks": 3.80,
                        "6_tracks": 3.80,
                        "7_tracks": 3.80
                    }
                },
                {
                    "name": "Steel-Look Tape 50m",
                    "unit": "roll",
                    "price_per_track": {
                        "3_tracks": 19.95,
                        "4_tracks": 19.95,
                        "5_tracks": 19.95,
                        "6_tracks": 19.95,
                        "7_tracks": 19.95
                    }
                },
                {
                    "name": "Planibel grey 10mm",
                    "unit": "m2",
                    "price_per_track": {
                        "3_tracks": 105.09,
                        "4_tracks": 105.09,
                        "5_tracks": 105.09,
                        "6_tracks": 105.09,
                        "7_tracks": 105.09
                    }
                },
                {
                    "name": "Klar 10mm",
                    "unit": "m2",
                    "price_per_track": {
                        "3_tracks": 57.00,
                        "4_tracks": 57.00,
                        "5_tracks": 57.00,
                        "6_tracks": 57.00,
                        "7_tracks": 57.00
                    }
                }
            ]
        },
        "AL25": {
            "track_type": "hoch",
            "panel": {
                "paneel_width_min_mm": 600,
                "paneel_width_max_mm": 1100,
                "max_height_mm": 2650,
                "price_per_panel": {
                    "3_tracks": 280.25,
                    "4_tracks": 285.00,
                    "5_tracks": 285.00,
                    "6_tracks": 285.00,
                    "7_tracks": 285.00
                }
            },
            "loose_material": [
                {
                    "name": "Laufschiene unten",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 24.47,
                        "4_tracks": 30.55,
                        "5_tracks": 36.62,
                        "6_tracks": 43.95,
                        "7_tracks": 51.27
                    }
                },
                {
                    "name": "Laufschiene oben",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 28.46,
                        "4_tracks": 34.73,
                        "5_tracks": 41.03,
                        "6_tracks": 49.58,
                        "7_tracks": 57.87
                    }
                },
                {
                    "name": "Seitenprofil",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 11.26,
                        "4_tracks": 11.26,
                        "5_tracks": 11.26,
                        "6_tracks": 11.26,
                        "7_tracks": 11.26
                    }
                },
                {
                    "name": "Koppelprofil / Keilfenster",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 7.84,
                        "4_tracks": 9.60,
                        "5_tracks": 11.35
                    }
                },
                {
                    "name": "Edelstahl Schloss (seitlich öffnend)",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 73.64,
                        "4_tracks": 73.64,
                        "5_tracks": 73.64,
                        "6_tracks": 73.64,
                        "7_tracks": 73.64
                    }
                },
                {
                    "name": "Edelstahl Schloss (mittig öffnend)",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 98.19,
                        "4_tracks": 98.19,
                        "5_tracks": 98.19,
                        "6_tracks": 98.19,
                        "7_tracks": 98.19
                    }
                },
                {
                    "name": "Türknauf Edelstahl",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 36.78,
                        "4_tracks": 36.78,
                        "5_tracks": 36.78,
                        "6_tracks": 36.78,
                        "7_tracks": 36.78
                    }
                },
                {
                    "name": "Türgriff Edelstahl oder Schwarz",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 14.25,
                        "4_tracks": 14.25,
                        "5_tracks": 14.25,
                        "6_tracks": 14.25,
                        "7_tracks": 14.25
                    }
                },
                {
                    "name": "Verriegelung AL22/23/24",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 9.83,
                        "4_tracks": 9.83,
                        "5_tracks": 9.83,
                        "6_tracks": 9.83,
                        "7_tracks": 9.83
                    }
                },
                {
                    "name": "Steel-Look U Profil 2400mm",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 19.00,
                        "4_tracks": 19.00,
                        "5_tracks": 19.00,
                        "6_tracks": 19.00,
                        "7_tracks": 19.00
                    }
                },
                {
                    "name": "Steel-Look U Profil 2400mm mit Bürstendichtung",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 19.00,
                        "4_tracks": 19.00,
                        "5_tracks": 19.00,
                        "6_tracks": 19.00,
                        "7_tracks": 19.00
                    }
                },
                {
                    "name": "Bürstendichtung für Steel-Look Profile",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 0.99,
                        "4_tracks": 0.99,
                        "5_tracks": 0.99,
                        "6_tracks": 0.99,
                        "7_tracks": 0.99
                    }
                },
                {
                    "name": "Steel-Look horizontal Strip",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 3.80,
                        "4_tracks": 3.80,
                        "5_tracks": 3.80,
                        "6_tracks": 3.80,
                        "7_tracks": 3.80
                    }
                },
                {
                    "name": "Steel-Look Tape 50m",
                    "unit": "roll",
                    "price_per_track": {
                        "3_tracks": 19.95,
                        "4_tracks": 19.95,
                        "5_tracks": 19.95,
                        "6_tracks": 19.95,
                        "7_tracks": 19.95
                    }
                },
                {
                    "name": "Planibel Grau 10mm",
                    "unit": "m2",
                    "price_per_track": {
                        "3_tracks": 105.09,
                        "4_tracks": 105.09,
                        "5_tracks": 105.09,
                        "6_tracks": 105.09,
                        "7_tracks": 105.09
                    }
                },
                {
                    "name": "Klar 10mm",
                    "unit": "m2",
                    "price_per_track": {
                        "3_tracks": 57.00,
                        "4_tracks": 57.00,
                        "5_tracks": 57.00,
                        "6_tracks": 57.00,
                        "7_tracks": 57.00
                    }
                }
            ]
        },
        "AL26": {
            "track_type": "hoch",
            "panel": {
                "paneel_width_min_mm": 600,
                "paneel_width_max_mm": 1100,
                "max_height_mm": 2650,
                "price_per_panel": {
                    "3_tracks": 261.25,
                    "4_tracks": 266.00,
                    "5_tracks": 266.00,
                    "6_tracks": 266.00,
                    "7_tracks": 266.00
                }
            },
            "loose_material": [
                {
                    "name": "Laufschiene unten",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 13.27,
                        "4_tracks": 17.95,
                        "5_tracks": 21.75,
                        "6_tracks": 25.68,
                        "7_tracks": 29.82
                    }
                },
                {
                    "name": "Laufschiene oben",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 28.46,
                        "4_tracks": 34.73,
                        "5_tracks": 41.03,
                        "6_tracks": 49.58,
                        "7_tracks": 57.87
                    }
                },
                {
                    "name": "Seitenprofil",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 11.26,
                        "4_tracks": 11.26,
                        "5_tracks": 11.26,
                        "6_tracks": 11.26,
                        "7_tracks": 11.26
                    }
                },
                {
                    "name": "Koppelprofil / Keilfenster",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 7.84,
                        "4_tracks": 9.60,
                        "5_tracks": 11.35
                    }
                },
                {
                    "name": "Edelstahl Schloss (seitlich öffnend)",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 73.64,
                        "4_tracks": 73.64,
                        "5_tracks": 73.64,
                        "6_tracks": 73.64,
                        "7_tracks": 73.64
                    }
                },
                {
                    "name": "Edelstahl Schloss (mittig öffnend)",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 98.19,
                        "4_tracks": 98.19,
                        "5_tracks": 98.19,
                        "6_tracks": 98.19,
                        "7_tracks": 98.19
                    }
                },
                {
                    "name": "Türknauf aus Edelstahl",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 36.78,
                        "4_tracks": 36.78,
                        "5_tracks": 36.78,
                        "6_tracks": 36.78,
                        "7_tracks": 36.78
                    }
                },
                {
                    "name": "Türgriff Edelstahl oder Schwarz",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 14.25,
                        "4_tracks": 14.25,
                        "5_tracks": 14.25,
                        "6_tracks": 14.25,
                        "7_tracks": 14.25
                    }
                },
                {
                    "name": "Verriegelung AL22/23/24",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 9.83,
                        "4_tracks": 9.83,
                        "5_tracks": 9.83,
                        "6_tracks": 9.83,
                        "7_tracks": 9.83
                    }
                },
                {
                    "name": "Bürstenprofil",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 14.70,
                        "4_tracks": 14.70,
                        "5_tracks": 14.70,
                        "6_tracks": 14.70,
                        "7_tracks": 14.70
                    }
                },
                {
                    "name": "Steel-Look U Profil 2400mm",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 19.00,
                        "4_tracks": 19.00,
                        "5_tracks": 19.00,
                        "6_tracks": 19.00,
                        "7_tracks": 19.00
                    }
                },
                {
                    "name": "Steel-Look U Profil 2400mm mit Bürstendichtung",
                    "unit": "pcs",
                    "price_per_track": {
                        "3_tracks": 19.00,
                        "4_tracks": 19.00,
                        "5_tracks": 19.00,
                        "6_tracks": 19.00,
                        "7_tracks": 19.00
                    }
                },
                {
                    "name": "Bürstendichtung für Steel-Look Profile",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 0.99,
                        "4_tracks": 0.99,
                        "5_tracks": 0.99,
                        "6_tracks": 0.99,
                        "7_tracks": 0.99
                    }
                },
                {
                    "name": "Steel-Look horizontal Strip",
                    "unit": "m1",
                    "price_per_track": {
                        "3_tracks": 3.80,
                        "4_tracks": 3.80,
                        "5_tracks": 3.80,
                        "6_tracks": 3.80,
                        "7_tracks": 3.80
                    }
                },
                {
                    "name": "Steel-Look Tape 50m",
                    "unit": "roll",
                    "price_per_track": {
                        "3_tracks": 19.95,
                        "4_tracks": 19.95,
                        "5_tracks": 19.95,
                        "6_tracks": 19.95,
                        "7_tracks": 19.95
                    }
                },
                {
                    "name": "Planibel grey 10mm",
                    "unit": "m2",
                    "price_per_track": {
                        "3_tracks": 105.09,
                        "4_tracks": 105.09,
                        "5_tracks": 105.09,
                        "6_tracks": 105.09,
                        "7_tracks": 105.09
                    }
                },
                {
                    "name": "Klar 10mm",
                    "unit": "m2",
                    "price_per_track": {
                        "3_tracks": 57.00,
                        "4_tracks": 57.00,
                        "5_tracks": 57.00,
                        "6_tracks": 57.00,
                        "7_tracks": 57.00
                    }
                }
            ]
        }
    }
};
