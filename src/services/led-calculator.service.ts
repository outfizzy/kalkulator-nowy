/**
 * LED Calculator Service
 * 
 * Implements LED lighting configuration logic from ledyaluxe.xlsm
 * for ALUXE roof systems.
 * 
 * Supports 9 roof types, Standard/Somfy control, up to 12 fields,
 * and calculates all required LED components (stripes, spots, trafos,
 * cables, controllers).
 */

import { supabase } from '../lib/supabase';

// ==================== MODEL FAMILY MAPPING ====================
// Maps LED roof types to the model_family keys used in pricing_base table
// These keys determine field count (krokwie) based on width from price lists

const LED_ROOF_TO_MODEL_FAMILY: Record<string, string> = {
    'Skyline': 'skystyle',
    'Skyline_Freistand': 'skystyle',
    'Carport': 'carport',
    'Carport_Freistand': 'carport',
    'O_Oplus_TR_TRplus_TL_TLXL': 'orangestyle', // fallback, overridden by subModel
    'Ultraline_compact_style': 'ultrastyle',
    'Ultraline_compact_style_Freistand': 'ultrastyle',
    'Ultraline_classic': 'ultrastyle',
    'Ultraline_classic_Freistand': 'ultrastyle',
};

// Sub-model options for roof types that group multiple model families
// Each sub-model maps to its own model_family in pricing_base with different field counts
export const SUB_MODEL_OPTIONS: Record<string, { id: string; label: string; modelFamily: string }[]> = {
    'O_Oplus_TR_TRplus_TL_TLXL': [
        { id: 'orangestyle', label: 'Orangestyle (O / O+)', modelFamily: 'orangestyle' },
        { id: 'trendstyle', label: 'Trendstyle (TR)', modelFamily: 'trendstyle' },
        { id: 'trendstyle_plus', label: 'Trendstyle+ (TR+)', modelFamily: 'trendstyle' },
        { id: 'topstyle', label: 'Topstyle (TL)', modelFamily: 'topstyle' },
        { id: 'topstyle_xl', label: 'Topstyle XL (TL XL)', modelFamily: 'topstyle' },
    ],
};

/**
 * Fetch the field count (Feldzahl / Krokwie) from pricing_base for a given
 * roof type and width. The pricing data stores the exact number of fields
 * for each width bracket.
 * 
 * Returns null if no data found (caller should fall back to manual input).
 */
export async function fetchFieldCountFromPricing(
    roofType: string,
    widthMm: number,
    constructionType: 'wall' | 'free' = 'wall',
    subModel?: string
): Promise<{ fieldCount: number; postsCount: number } | null> {
    // Use sub-model's modelFamily if available, otherwise fall back to roof type mapping
    let modelFamily = LED_ROOF_TO_MODEL_FAMILY[roofType];
    if (subModel && SUB_MODEL_OPTIONS[roofType]) {
        const subOpt = SUB_MODEL_OPTIONS[roofType].find(s => s.id === subModel);
        if (subOpt) modelFamily = subOpt.modelFamily;
    }
    if (!modelFamily) return null;

    // Determine construction type from roof type
    const isFreestanding = roofType.includes('Freistand');
    const dbConstructionType = isFreestanding ? 'free' : constructionType;

    try {
        // Query the next-larger-or-equal width entry that has fields_count
        const { data } = await supabase
            .from('pricing_base')
            .select('fields_count, posts_count, width_mm')
            .ilike('model_family', modelFamily)
            .eq('construction_type', dbConstructionType)
            .gte('width_mm', widthMm)
            .not('fields_count', 'is', null)
            .order('width_mm', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (data?.fields_count) {
            return {
                fieldCount: data.fields_count,
                postsCount: data.posts_count || 2,
            };
        }

        // Fallback: try the largest available width if our width is bigger than all entries
        const { data: maxData } = await supabase
            .from('pricing_base')
            .select('fields_count, posts_count, width_mm')
            .ilike('model_family', modelFamily)
            .eq('construction_type', dbConstructionType)
            .not('fields_count', 'is', null)
            .order('width_mm', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (maxData?.fields_count) {
            return {
                fieldCount: maxData.fields_count,
                postsCount: maxData.posts_count || 2,
            };
        }
    } catch (e) {
        console.warn('[LED] Failed to fetch field count from pricing_base:', e);
    }

    return null;
}

// ==================== TYPES ====================

export type LedRoofType =
    | 'Skyline'
    | 'Skyline_Freistand'
    | 'Carport'
    | 'Carport_Freistand'
    | 'O_Oplus_TR_TRplus_TL_TLXL'
    | 'Ultraline_compact_style'
    | 'Ultraline_compact_style_Freistand'
    | 'Ultraline_classic'
    | 'Ultraline_classic_Freistand';

export type LedControlType = 'Standard' | 'Somfy iO';

export interface LedElementConfig {
    stripes: number; // 0-3
    spots: number;   // 0-3
}

export interface LedInputs {
    roofType: LedRoofType;
    subModel?: string;         // e.g., 'orangestyle', 'trendstyle', 'topstyle' — for grouped types
    controlType: LedControlType;
    fieldCount: number;        // 1-12
    width: number;             // mm (Breite)
    depth: number;             // mm (Tiefe)
    overstandDepth?: number;   // mm, only for UL classic types
    includeRemote: boolean;

    // Per-element LED configuration
    rinne: LedElementConfig;
    aussensparrenLinks: LedElementConfig;
    aussensparrenRechts: LedElementConfig;
    wandanschluss: LedElementConfig;
    // Mittelsparren are dynamically generated based on fieldCount
    mittelsparren: LedElementConfig[];   // up to fieldCount-1 elements
    // Pfosten (only for freestanding types)
    pfostenVorne?: LedElementConfig;
    pfostenHinten?: LedElementConfig;
    pfostenLinks?: LedElementConfig;
    pfostenRechts?: LedElementConfig;
    pfostenLinksHinten?: LedElementConfig;
    pfostenRechtsHinten?: LedElementConfig;
}

export interface LedProduct {
    pos: number;
    axe: string;
    articleNr: string;
    name: string;
    nameDE: string;
    unitPrice: number;  // net purchase price
    quantity: number;
    totalPrice: number; // unitPrice * quantity
}

export interface LedResults {
    products: LedProduct[];
    totalNet: number;
    totalVat: number;
    totalGross: number;
    endCustomerNet: number;
    endCustomerVat: number;
    endCustomerGross: number;
}

// ==================== PRODUCT CATALOG ====================

export interface LedCatalogItem {
    pos: number;
    axe: string;
    articleNr: string;
    name: string;
    nameDE: string;
    unitPrice: number;
    perSet?: number; // items per set (e.g., cables come in sets of 4)
}

export const LED_CATALOG: LedCatalogItem[] = [
    { pos: 1, axe: '11321', articleNr: 'S5445', name: 'LED Stripe 5m', nameDE: 'LED Stripe 5m', unitPrice: 65.59 },
    { pos: 2, axe: '11322', articleNr: 'S5448', name: 'LED Stripe 8m', nameDE: 'LED Stripe 8m', unitPrice: 104.98 },
    { pos: 3, axe: '11323', articleNr: 'S6000', name: 'LED Silikon Diffusor', nameDE: 'LED Silikon Diffusor', unitPrice: 5.48 },
    { pos: 4, axe: '11665', articleNr: 'S4539+S4734', name: 'LED Spot Altea Set', nameDE: 'LED Spot Altea, 1er Set', unitPrice: 13.56 },
    { pos: 5, axe: '11374', articleNr: 'S4827', name: 'Trafo 150W', nameDE: 'Trafo 150W', unitPrice: 65.11 },
    { pos: 6, axe: '11381', articleNr: 'S2298', name: 'Verbindungsmuffe Buchse', nameDE: 'Verbindungsmuffe Buchse', unitPrice: 9.02 },
    { pos: 7, axe: '11379', articleNr: 'S4960', name: 'Trafo 60W', nameDE: 'Trafo 60W', unitPrice: 46.82 },
    { pos: 8, axe: '11380', articleNr: 'S4867', name: 'Anschlussbox Somfy', nameDE: 'Anschlussbox Somfy', unitPrice: 44.95 },
    { pos: 9, axe: '11300', articleNr: '1822611', name: 'LED Receiver Somfy', nameDE: 'LED receiver Somfy io 12/24 V LED weiß, 4-Kanal', unitPrice: 149.99 },
    { pos: 10, axe: '11630', articleNr: '', name: 'Somfy Fernbedienung', nameDE: 'Somfy Fernbedienung Situo 5 IO Pure II', unitPrice: 54.44 },
    { pos: 11, axe: '11414', articleNr: 'S4733', name: 'Y-Anschlusskabel 4er Set', nameDE: '4er Set, Y-Anschlusskabel IP65', unitPrice: 24.74, perSet: 4 },
    { pos: 12, axe: '11435', articleNr: 'S4722', name: 'Verlängerung 1m 4er Set', nameDE: '4er Set, Verlängerungskabel 1m IP65', unitPrice: 11.46, perSet: 4 },
    { pos: 13, axe: '11666', articleNr: 'S4725', name: 'Verlängerung 2m 4er Set', nameDE: '4er Set, Verlängerungskabel 2m IP65', unitPrice: 13.99, perSet: 4 },
    { pos: 14, axe: '11444', articleNr: 'S4720', name: 'Verlängerung 3m 4er Set', nameDE: '4er Set, Verlängerungskabel 3m IP65', unitPrice: 16.94, perSet: 4 },
    { pos: 15, axe: '11383', articleNr: 'S5831', name: 'Fernbedienung Standard', nameDE: 'Fernbedienung LED IP65 sets', unitPrice: 12.38 },
    { pos: 16, axe: '11382', articleNr: 'S5830', name: 'Receiver / Dimm-Controller', nameDE: 'Receiver / Dimm-Controller', unitPrice: 23.55 },
];

// ==================== CONSTANTS ====================

const MARGIN = 0.35;  // 35% margin
const DIVISOR = 1 - MARGIN; // 0.65
const VAT_RATE = 0.19; // 19%

// Strip length thresholds (mm)
const STRIP_5M_LENGTH = 5000;
const STRIP_8M_LENGTH = 8000;

// Trafo power thresholds (simplified from Excel)
const TRAFO_150W_MAX_STRIPS = 3; // max strips per 150W trafo
const TRAFO_60W_MAX_STRIPS = 1;  // max strips per 60W trafo

// Stripe distribution breakpoints for channel runs (mm)
const BREAKPOINT_1M = 1000;
const BREAKPOINT_2M = 2000;
const BREAKPOINT_3M = 3000;

// ==================== ROOF TYPE CONFIGURATION ====================
// Based on Excel analysis of Eingabe+Endkundenpreis sheet:
// N1=Skyline, N2=Skyline_Freistand, N3=Carport, N4=Carport_Freistand,
// N5=O_Oplus_TR_TRplus_TL_TLXL, N6=Ultraline_compact_style,
// N7=Ultraline_compact_style_Freistand, N8=Ultraline_classic,
// N9=Ultraline_classic_Freistand
//
// Mittelsparren: NOT for N3,N4 (Carport types) — Excel: IF(OR($B$9=N3,$B$9=N4),"",...)
// Also NOT for N5 (O_Oplus) — Excel: A24 = IF(B9=N5,1,...) but uses Wandanschluss instead
//
// Wandanschluss: Only for N3 (A36=3→Wandanschluss), N5 (single WA),
// N6,N7 (UL compact/style), N8,N9 (UL classic)
// Per Excel A36: IF(B9=N1,4,...) => N1=Skyline gets Pfosten, not WA
// Simplified: WA for O_Oplus, UL_compact_style, UL_compact_style_Frei,
// UL_classic, UL_classic_Frei, Carport (non-frei)
//
// Pfosten: Only for truly freestanding types (N2,N4,N6→N9 selectively)
// Excel rows 36-40: Pfosten-related elements based on roof type

export interface RoofTypeConfig {
    id: LedRoofType;
    label: string;
    labelDE: string;
    isFreestanding: boolean;
    hasWandanschluss: boolean;
    hasMittelsparren: boolean;
    hasOverstand: boolean;
    hasPfosten: boolean;
    maxStripes: {
        rinne: number;
        aussensparren: number;
        mittelsparren: number;
        wandanschluss: number;
        pfosten: number;
    };
    maxSpots: {
        rinne: number;
        aussensparren: number;
        mittelsparren: number;
        wandanschluss: number;
        pfosten: number;
    };
}

export const ROOF_TYPE_CONFIGS: Record<LedRoofType, RoofTypeConfig> = {
    // N1: Skyline — wall-mounted, Mittelsparren YES, NO Wandanschluss
    // Excel D22=3 (rinne max 3), D23=3 (aussen max 3)
    'Skyline': {
        id: 'Skyline',
        label: 'Skyline',
        labelDE: 'Skyline',
        isFreestanding: false,
        hasWandanschluss: false,
        hasMittelsparren: true,
        hasOverstand: false,
        hasPfosten: false,
        maxStripes: { rinne: 3, aussensparren: 3, mittelsparren: 3, wandanschluss: 0, pfosten: 0 },
        maxSpots: { rinne: 3, aussensparren: 3, mittelsparren: 6, wandanschluss: 0, pfosten: 0 },
    },
    // N2: Skyline_Freistand — freestanding, Mittelsparren YES
    'Skyline_Freistand': {
        id: 'Skyline_Freistand',
        label: 'Skyline Freestanding',
        labelDE: 'Skyline Freistand',
        isFreestanding: true,
        hasWandanschluss: false,
        hasMittelsparren: true,
        hasOverstand: false,
        hasPfosten: true,
        maxStripes: { rinne: 3, aussensparren: 3, mittelsparren: 3, wandanschluss: 0, pfosten: 2 },
        maxSpots: { rinne: 3, aussensparren: 3, mittelsparren: 6, wandanschluss: 0, pfosten: 2 },
    },
    // N3: Carport — wall-mounted, NO Mittelsparren!, Wandanschluss YES
    // Excel: IF(OR($B$9=N3,$B$9=N4),"",...) => no Mittelsparren
    // A36 for Carport: IF(B9=N3,3,...) => A36=3 => B36=Wandanschluss
    'Carport': {
        id: 'Carport',
        label: 'Carport',
        labelDE: 'Carport',
        isFreestanding: false,
        hasWandanschluss: true,
        hasMittelsparren: false,
        hasOverstand: false,
        hasPfosten: false,
        maxStripes: { rinne: 3, aussensparren: 3, mittelsparren: 0, wandanschluss: 2, pfosten: 0 },
        maxSpots: { rinne: 3, aussensparren: 3, mittelsparren: 0, wandanschluss: 2, pfosten: 0 },
    },
    // N4: Carport_Freistand — freestanding, NO Mittelsparren!
    // Excel: IF(OR($B$9=N3,$B$9=N4),"",...) => no Mittelsparren
    'Carport_Freistand': {
        id: 'Carport_Freistand',
        label: 'Carport Freestanding',
        labelDE: 'Carport Freistand',
        isFreestanding: true,
        hasWandanschluss: false,
        hasMittelsparren: false,
        hasOverstand: false,
        hasPfosten: true,
        maxStripes: { rinne: 3, aussensparren: 3, mittelsparren: 0, wandanschluss: 0, pfosten: 2 },
        maxSpots: { rinne: 3, aussensparren: 3, mittelsparren: 0, wandanschluss: 0, pfosten: 2 },
    },
    // N5: O_Oplus_TR_TRplus_TL_TLXL — wall-mounted, Mittelsparren YES (has spots between rafters)
    // Trendline/Topline have LED spots between their krokwie
    // Excel D23 for N5: IF(AND(B23=M23,OR(B9=N5,...)),1,...) => aussensparren max 1
    // Wandanschluss: YES (A36 gives WA for O type)
    'O_Oplus_TR_TRplus_TL_TLXL': {
        id: 'O_Oplus_TR_TRplus_TL_TLXL',
        label: 'O / O+ / TR / TR+ / TL / TL XL',
        labelDE: 'O / O+ / TR / TR+ / TL / TL XL',
        isFreestanding: false,
        hasWandanschluss: true,
        hasMittelsparren: true,
        hasOverstand: false,
        hasPfosten: false,
        maxStripes: { rinne: 2, aussensparren: 1, mittelsparren: 2, wandanschluss: 2, pfosten: 0 },
        maxSpots: { rinne: 2, aussensparren: 1, mittelsparren: 4, wandanschluss: 2, pfosten: 0 },
    },
    // N6: Ultraline_compact_style — wall-mounted, Mittelsparren YES
    // Excel D23 for N6: max 1 stripe on Außensparren
    'Ultraline_compact_style': {
        id: 'Ultraline_compact_style',
        label: 'Ultraline Compact / Style',
        labelDE: 'Ultraline Compact / Style',
        isFreestanding: false,
        hasWandanschluss: true,
        hasMittelsparren: true,
        hasOverstand: false,
        hasPfosten: false,
        maxStripes: { rinne: 2, aussensparren: 1, mittelsparren: 3, wandanschluss: 2, pfosten: 0 },
        maxSpots: { rinne: 2, aussensparren: 1, mittelsparren: 6, wandanschluss: 2, pfosten: 0 },
    },
    // N7: Ultraline_compact_style_Freistand — freestanding, Mittelsparren YES
    'Ultraline_compact_style_Freistand': {
        id: 'Ultraline_compact_style_Freistand',
        label: 'Ultraline Compact / Style Freestanding',
        labelDE: 'Ultraline Compact / Style Freistand',
        isFreestanding: true,
        hasWandanschluss: false,
        hasMittelsparren: true,
        hasOverstand: false,
        hasPfosten: true,
        maxStripes: { rinne: 2, aussensparren: 1, mittelsparren: 3, wandanschluss: 0, pfosten: 2 },
        maxSpots: { rinne: 2, aussensparren: 1, mittelsparren: 6, wandanschluss: 0, pfosten: 2 },
    },
    // N8: Ultraline_classic — wall-mounted, Mittelsparren YES, Überstand YES
    'Ultraline_classic': {
        id: 'Ultraline_classic',
        label: 'Ultraline Classic',
        labelDE: 'Ultraline Classic',
        isFreestanding: false,
        hasWandanschluss: true,
        hasMittelsparren: true,
        hasOverstand: true,
        hasPfosten: false,
        maxStripes: { rinne: 2, aussensparren: 1, mittelsparren: 3, wandanschluss: 2, pfosten: 0 },
        maxSpots: { rinne: 2, aussensparren: 1, mittelsparren: 6, wandanschluss: 2, pfosten: 0 },
    },
    // N9: Ultraline_classic_Freistand — freestanding, Mittelsparren YES, Überstand YES
    'Ultraline_classic_Freistand': {
        id: 'Ultraline_classic_Freistand',
        label: 'Ultraline Classic Freestanding',
        labelDE: 'Ultraline Classic Freistand',
        isFreestanding: true,
        hasWandanschluss: false,
        hasMittelsparren: true,
        hasOverstand: true,
        hasPfosten: true,
        maxStripes: { rinne: 2, aussensparren: 1, mittelsparren: 3, wandanschluss: 0, pfosten: 2 },
        maxSpots: { rinne: 2, aussensparren: 1, mittelsparren: 6, wandanschluss: 0, pfosten: 2 },
    },
};

// ==================== SPOT RECOMMENDATIONS ENGINE ====================
// LED Spot Altea: 3W, 12V, ~120 lumens, IP65, 38° beam angle
// From 2.5m height → ~1.7m diameter ground circle
// Standard spacing between spots: 600–1000mm depending on brightness level

export type SpotLevel = 'ambient' | 'standard' | 'bright';

export interface SpotRecommendation {
    element: string;               // e.g. 'rinne', 'mittelsparren', 'aussensparren'
    elementLabel: string;          // e.g. 'Rinne', 'Mittelsparren 1'
    runLengthMm: number;           // length of the element where spots go
    recommended: number;           // recommended count (standard brightness)
    min: number;                   // minimum for ambient
    max: number;                   // maximum for bright
    description: string;           // user-facing explanation
}

export interface SpotRecommendations {
    level: SpotLevel;
    totalSpots: number;
    totalArea: number;              // m² of roof
    luxEstimate: string;           // estimated lux range
    elements: SpotRecommendation[];
}

// Spot spacing by brightness level (mm between spots)
const SPOT_SPACING: Record<SpotLevel, number> = {
    ambient: 1000,    // 1 spot per meter — mood/accent lighting (~50 lux)
    standard: 750,    // ~1.3 spots per meter — comfortable evening (~80 lux)
    bright: 550,      // ~1.8 spots per meter — work/dining light (~120 lux)
};

/**
 * Calculate recommended spot counts for each LED element based on roof dimensions.
 *
 * Logic:
 * - Rinne & Wandanschluss run along WIDTH → width determines spot count
 * - Außensparren & Mittelsparren run along DEPTH → depth determines spot count
 * - Pfosten: 1 spot per post face (constant, not length-dependent)
 */
export function getSpotRecommendations(
    inputs: LedInputs,
    level: SpotLevel = 'standard'
): SpotRecommendations {
    const config = ROOF_TYPE_CONFIGS[inputs.roofType];
    const spacing = SPOT_SPACING[level];
    const elements: SpotRecommendation[] = [];

    const widthM = inputs.width / 1000;
    const depthM = inputs.depth / 1000;
    const areaSqm = widthM * depthM;

    // Helper: calculate spots for a given run length
    const calcSpots = (lengthMm: number, maxAllowed: number): { min: number; rec: number; max: number } => {
        if (maxAllowed <= 0) return { min: 0, rec: 0, max: 0 };
        const minSpots = Math.max(1, Math.round(lengthMm / SPOT_SPACING.ambient));
        const recSpots = Math.max(1, Math.round(lengthMm / SPOT_SPACING.standard));
        const maxSpots = Math.max(1, Math.round(lengthMm / SPOT_SPACING.bright));
        return {
            min: Math.min(minSpots, maxAllowed),
            rec: Math.min(recSpots, maxAllowed),
            max: Math.min(maxSpots, maxAllowed),
        };
    };

    // --- Rinne (gutter) — runs along width ---
    if (config.maxSpots.rinne > 0) {
        const spots = calcSpots(inputs.width, config.maxSpots.rinne);
        elements.push({
            element: 'rinne',
            elementLabel: 'Rinne',
            runLengthMm: inputs.width,
            recommended: spots.rec,
            min: spots.min,
            max: spots.max,
            description: `${(inputs.width / 1000).toFixed(1)}m Breite → ${spots.rec} Spots${spots.rec > 0 ? ` (alle ${Math.round(inputs.width / spots.rec)}mm)` : ''}`,
        });
    }

    // --- Wandanschluss — runs along width ---
    if (config.hasWandanschluss && config.maxSpots.wandanschluss > 0) {
        const spots = calcSpots(inputs.width, config.maxSpots.wandanschluss);
        elements.push({
            element: 'wandanschluss',
            elementLabel: 'Wandanschluss',
            runLengthMm: inputs.width,
            recommended: spots.rec,
            min: spots.min,
            max: spots.max,
            description: `${(inputs.width / 1000).toFixed(1)}m Breite → ${spots.rec} Spots`,
        });
    }

    // --- Außensparren (outer rafters) — run along depth ---
    if (config.maxSpots.aussensparren > 0) {
        const spots = calcSpots(inputs.depth, config.maxSpots.aussensparren);
        const label = `Außensparren`;
        elements.push({
            element: 'aussensparren',
            elementLabel: label,
            runLengthMm: inputs.depth,
            recommended: spots.rec,
            min: spots.min,
            max: spots.max,
            description: `${(inputs.depth / 1000).toFixed(1)}m Tiefe → ${spots.rec} Spots pro Seite`,
        });
    }

    // --- Mittelsparren (inner rafters) — run along depth ---
    if (config.hasMittelsparren && config.maxSpots.mittelsparren > 0) {
        const msCount = Math.max(0, inputs.fieldCount - 1);
        for (let i = 0; i < msCount; i++) {
            const spots = calcSpots(inputs.depth, config.maxSpots.mittelsparren);
            elements.push({
                element: 'mittelsparren',
                elementLabel: `Mittelsparren ${i + 1}`,
                runLengthMm: inputs.depth,
                recommended: spots.rec,
                min: spots.min,
                max: spots.max,
                description: `${(inputs.depth / 1000).toFixed(1)}m Tiefe → ${spots.rec} Spots${spots.rec > 0 ? ` (Abstand ~${Math.round(inputs.depth / spots.rec)}mm)` : ''}`,
            });
        }
    }

    // --- Pfosten (posts) — fixed 1 spot per post face ---
    if (config.hasPfosten && config.maxSpots.pfosten > 0) {
        elements.push({
            element: 'pfosten',
            elementLabel: 'Pfosten',
            runLengthMm: 0,
            recommended: 1,
            min: 1,
            max: config.maxSpots.pfosten,
            description: '1 Spot pro Pfostenfront',
        });
    }

    const totalRec = elements.reduce((sum, e) => sum + e.recommended, 0);
    const totalLumens = totalRec * 120; // ~120 lm per Altea spot
    const areaSafe = Math.max(areaSqm, 0.1); // prevent division by zero
    const avgLux = totalLumens / areaSafe;

    let luxEstimate: string;
    if (avgLux < 40) luxEstimate = '~30-40 Lux (Ambient)';
    else if (avgLux < 80) luxEstimate = '~50-80 Lux (Standard)';
    else if (avgLux < 120) luxEstimate = '~80-120 Lux (Hell)';
    else luxEstimate = '~120+ Lux (Sehr hell)';

    return {
        level,
        totalSpots: totalRec,
        totalArea: areaSqm,
        luxEstimate,
        elements,
    };
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Get the available structural elements for a given roof type and field count.
 */
export function getAvailableElements(roofType: LedRoofType, fieldCount: number): string[] {
    const config = ROOF_TYPE_CONFIGS[roofType];
    const elements: string[] = [];

    // Wandanschluss (wall connection) — at TOP of roof (back, against wall)
    // Per Excel row 35: visible for types that have wall mounting
    if (config.hasWandanschluss) {
        elements.push('Wandanschluss');
    }

    // Außensparren links (left outer rafter) — always available
    elements.push('Außensparren (links)');

    // Mittelsparren (center rafters) — based on field count
    // NOT for Carport/Carport_Freistand (Excel: IF(OR($B$9=N3,$B$9=N4),"",...))
    // NOT for O_Oplus (Excel: A24 = "keine Mittelsparren vorhanden")
    if (config.hasMittelsparren && fieldCount > 1) {
        for (let i = 0; i < fieldCount - 1; i++) {
            elements.push(`Mittelsparren ${i + 1}`);
        }
    }

    // Außensparren rechts (right outer rafter) — always available
    elements.push('Außensparren (rechts)');

    // Rinne (gutter) — at BOTTOM of roof (front edge)
    elements.push('Rinne');

    // Pfosten (posts) — only for types with hasPfosten
    // Excel: rows 37-40, only for UL types with Freistand and Skyline/Carport Freistand
    if (config.hasPfosten) {
        elements.push('Pfosten (links)');
        elements.push('Pfosten (rechts)');
        if (config.id === 'Ultraline_compact_style_Freistand' ||
            config.id === 'Ultraline_classic_Freistand') {
            elements.push('Pfosten (links hinten)');
            elements.push('Pfosten (rechts hinten)');
        }
    }

    return elements;
}

/**
 * Create default LED inputs for a given roof type
 */
export function createDefaultInputs(roofType: LedRoofType = 'Carport'): LedInputs {
    return {
        roofType,
        controlType: 'Standard',
        fieldCount: 2,
        width: 4000,
        depth: 3000,
        includeRemote: true,
        rinne: { stripes: 0, spots: 0 },
        aussensparrenLinks: { stripes: 0, spots: 0 },
        aussensparrenRechts: { stripes: 0, spots: 0 },
        wandanschluss: { stripes: 0, spots: 0 },
        mittelsparren: [],
    };
}

// ==================== STRIPE/SPOT DIMENSION LOGIC ====================

/**
 * Calculate the internal width available for LEDs based on roof type.
 * From Beleuchtung sheet: "freie Sparrenlänge" = depth minus structural deductions
 * From Excel: B11 = depth value, B10 = original depth
 * The deductions apply to the DEPTH (along rafter direction) not width.
 * For Rinne/Wandanschluss, use the full width dimension.
 */
function getInternalDepth(inputs: LedInputs): number {
    const { roofType, depth } = inputs;

    // From Beleuchtung sheet row 10: "freie Sparrenlänge" = depth - deduction
    // E11=211 (SK/CA wall-mounted), E10=322 (Freistand), E12=100 (O types)
    switch (roofType) {
        case 'Skyline':
        case 'Carport':
            // Wall-mounted: deduct wall + gutter profile = 211mm
            return depth - 211;
        case 'Skyline_Freistand':
        case 'Carport_Freistand':
            // Freestanding: deduct both sides = 322mm
            return depth - 322;
        case 'O_Oplus_TR_TRplus_TL_TLXL':
            // From Excel E12 = 100 (Abzug O, O+, etc.)
            return depth - 100;
        case 'Ultraline_compact_style':
            // Wall-mounted: deduct Wandanschluss + compact/style = 200+211
            return depth - 211;
        case 'Ultraline_compact_style_Freistand':
            return depth - 322;
        case 'Ultraline_classic':
            // UL classic: deduct wall side + gutter profile = 211
            return depth - 211;
        case 'Ultraline_classic_Freistand':
            return depth - 322;
        default:
            return depth - 211;
    }
}

/**
 * Get the width available for Rinne/Wandanschluss LED strips.
 * From Beleuchtung sheet: this uses the roof width minus gutter profile deductions.
 */
function getGutterWidth(inputs: LedInputs): number {
    const { roofType, width } = inputs;
    // From Excel: Rinnenbreite calculation
    // SK/CA: width - 234, UL: width - 392, O types: width - 100
    switch (roofType) {
        case 'Skyline':
        case 'Skyline_Freistand':
        case 'Carport':
        case 'Carport_Freistand':
            return width - 234;
        case 'Ultraline_compact_style':
        case 'Ultraline_compact_style_Freistand':
        case 'Ultraline_classic':
        case 'Ultraline_classic_Freistand':
            return width - 392;
        case 'O_Oplus_TR_TRplus_TL_TLXL':
            return width - 100;
        default:
            return width - 234;
    }
}

/**
 * Get the internal width available for LED strips running along the width.
 * Same as gutter width — the usable LED span after structural deductions.
 */
function getInternalWidth(inputs: LedInputs): number {
    return getGutterWidth(inputs);
}

/**
 * Get the field width (width of each field between rafters)
 */
function getFieldWidth(inputs: LedInputs): number {
    const internal = getInternalWidth(inputs);
    if (inputs.fieldCount <= 0) return internal;
    return internal / inputs.fieldCount;
}

/**
 * Calculate the rafter spacing (Sparrenabstand)
 * From Excel Beleuchtung E9 = E6 / E8 (free rafter length / fieldCount)
 */
function getRafterSpacing(inputs: LedInputs): number {
    const freeDepth = getInternalDepth(inputs);
    if (inputs.fieldCount <= 0) return freeDepth;
    return freeDepth / inputs.fieldCount;
}

/**
 * Calculate how many 5m strips are needed for a given total length
 */
function calcStrips5m(totalLength: number): number {
    if (totalLength <= 0) return 0;
    return Math.ceil(totalLength / STRIP_5M_LENGTH);
}

/**
 * Calculate how many 8m strips are needed for a given total length
 */
function calcStrips8m(totalLength: number): number {
    if (totalLength <= 0) return 0;
    return Math.ceil(totalLength / STRIP_8M_LENGTH);
}

// ==================== MAIN CALCULATION ====================

/**
 * Main LED calculation function
 * Replicates the logic from Beleuchtung + Beleuchtung Classic Überstand sheets
 */
export function calculateLedConfig(inputs: LedInputs): LedResults {
    const config = ROOF_TYPE_CONFIGS[inputs.roofType];
    const isSomfy = inputs.controlType === 'Somfy iO';
    const internalWidth = getInternalWidth(inputs);
    const fieldWidth = getFieldWidth(inputs);

    // ---- Count total stripes and spots across all elements ----
    let totalStripeElements = 0; // number of element positions with stripes
    let totalSpotElements = 0;   // number of element positions with spots
    let totalStripeRuns = 0;     // total linear mm of stripe runs
    let totalSpotCount = 0;      // total number of individual spots

    // Collect all active element configurations
    const activeElements: Array<{ name: string; config: LedElementConfig; runLength: number }> = [];

    // Rinne
    if (inputs.rinne.stripes > 0 || inputs.rinne.spots > 0) {
        activeElements.push({
            name: 'Rinne',
            config: inputs.rinne,
            runLength: internalWidth,
        });
    }

    // Außensparren links
    if (inputs.aussensparrenLinks.stripes > 0 || inputs.aussensparrenLinks.spots > 0) {
        activeElements.push({
            name: 'Außensparren (links)',
            config: inputs.aussensparrenLinks,
            runLength: inputs.depth,
        });
    }

    // Mittelsparren
    inputs.mittelsparren.forEach((ms, i) => {
        if (ms.stripes > 0 || ms.spots > 0) {
            activeElements.push({
                name: `Mittelsparren ${i + 1}`,
                config: ms,
                runLength: inputs.depth,
            });
        }
    });

    // Außensparren rechts
    if (inputs.aussensparrenRechts.stripes > 0 || inputs.aussensparrenRechts.spots > 0) {
        activeElements.push({
            name: 'Außensparren (rechts)',
            config: inputs.aussensparrenRechts,
            runLength: inputs.depth,
        });
    }

    // Wandanschluss
    if (config.hasWandanschluss && (inputs.wandanschluss.stripes > 0 || inputs.wandanschluss.spots > 0)) {
        activeElements.push({
            name: 'Wandanschluss',
            config: inputs.wandanschluss,
            runLength: internalWidth,
        });
    }

    // Pfosten (freestanding)
    if (config.isFreestanding) {
        const pfostenConfigs = [
            { name: 'Pfosten (vorne)', config: inputs.pfostenVorne },
            { name: 'Pfosten (hinten)', config: inputs.pfostenHinten },
            { name: 'Pfosten (links)', config: inputs.pfostenLinks },
            { name: 'Pfosten (rechts)', config: inputs.pfostenRechts },
            { name: 'Pfosten (links hinten)', config: inputs.pfostenLinksHinten },
            { name: 'Pfosten (rechts hinten)', config: inputs.pfostenRechtsHinten },
        ];
        pfostenConfigs.forEach(p => {
            if (p.config && (p.config.stripes > 0 || p.config.spots > 0)) {
                activeElements.push({
                    name: p.name,
                    config: p.config,
                    runLength: 2500, // approximate post height for strip run
                });
            }
        });
    }

    // ---- Calculate stripe quantities ----
    // Channel 1: Rinne / Wandanschluss stripes
    // Channel 2: Sparren stripes (Außensparren + Mittelsparren)
    let channel1Stripes = 0;
    let channel2Stripes = 0;
    let channel1Length = 0;
    let channel2Length = 0;

    activeElements.forEach(el => {
        if (el.config.stripes > 0) {
            totalStripeElements++;
            const runLength = el.runLength * el.config.stripes;
            totalStripeRuns += runLength;

            if (el.name === 'Rinne' || el.name === 'Wandanschluss') {
                channel1Stripes += el.config.stripes;
                channel1Length += el.runLength * el.config.stripes;
            } else {
                channel2Stripes += el.config.stripes;
                channel2Length += el.runLength * el.config.stripes;
            }
        }
        if (el.config.spots > 0) {
            totalSpotElements++;
            totalSpotCount += el.config.spots;
        }
    });

    // ---- Calculate individual product quantities ----

    // LED Stripe 5m (pos 1)
    // Stripes <= 4000mm use 5m strips, otherwise 8m
    let strips5m = 0;
    let strips8m = 0;
    let diffusorCount = 0;

    activeElements.forEach(el => {
        if (el.config.stripes > 0) {
            for (let s = 0; s < el.config.stripes; s++) {
                if (el.runLength <= 4000) {
                    strips5m++;
                } else if (el.runLength <= 8000) {
                    strips8m++;
                } else {
                    // For very long runs, use multiple 5m strips
                    strips5m += Math.ceil(el.runLength / STRIP_5M_LENGTH);
                }
                diffusorCount++;
            }
        }
    });

    // LED Spots (pos 4) - spots are sold as individual sets
    const spotSets = totalSpotCount;

    // Trafos - based on power consumption
    // From Excel: complex trafo sizing logic
    // Simplified: each channel needs trafos based on total connected wattage
    // Roughly: 1 strip ~ 30-50W, each spot ~ 3W
    // 150W trafo handles up to 3 strips, 60W handles 1 strip
    let trafos150 = 0;
    let trafos60 = 0;

    // Channel 1 trafos
    if (channel1Stripes > 0) {
        if (channel1Stripes >= 3) {
            trafos150 += Math.ceil(channel1Stripes / TRAFO_150W_MAX_STRIPS);
        } else if (channel1Stripes === 2) {
            trafos150 += 1;
        } else {
            trafos60 += 1;
        }
    }

    // Channel 2 trafos
    if (channel2Stripes > 0) {
        if (channel2Stripes >= 3) {
            trafos150 += Math.ceil(channel2Stripes / TRAFO_150W_MAX_STRIPS);
        } else if (channel2Stripes === 2) {
            trafos150 += 1;
        } else {
            trafos60 += 1;
        }
    }

    // Spots-only trafos (if spots but no stripes on a channel)
    if (totalSpotCount > 0 && channel1Stripes === 0 && channel2Stripes === 0) {
        trafos60 += 1;
    }

    // Y-connectors: needed at each branching point
    // From Excel: calculated per sparren/element junction
    let yConnectors = 0;
    activeElements.forEach(el => {
        if (el.config.stripes > 0 || el.config.spots > 0) {
            yConnectors += 1;
        }
    });
    // Deduct 1 for the first element (no Y needed for first)
    if (yConnectors > 0) yConnectors = Math.max(0, yConnectors - 1);

    // Extension cables based on distance from trafo to element
    // From Excel: complex per-element distance calculation
    // Simplified: distribute based on field position
    let extensions1m = 0;
    let extensions2m = 0;
    let extensions3m = 0;

    // Each trafo gets 1m extension cable for positioning
    extensions1m += trafos150 + trafos60;

    // Additional extensions based on element distance
    activeElements.forEach((el, i) => {
        if (el.config.stripes > 0 || el.config.spots > 0) {
            const relativePos = i / Math.max(activeElements.length - 1, 1);
            if (relativePos > 0.7) {
                extensions3m += 1;
            } else if (relativePos > 0.4) {
                extensions2m += 1;
            } else if (relativePos > 0.1) {
                extensions1m += 1;
            }
        }
    });

    // Dimm-Controller / Receiver
    let dimmControllers = 0;
    let somfyReceivers = 0;
    let somfyBoxes = 0;
    let somfyRemotes = 0;
    let standardReceivers = 0;
    let standardRemotes = 0;

    if (isSomfy) {
        // Somfy: connection box + receiver + remote
        const totalChannels = (channel1Stripes > 0 ? 1 : 0) + (channel2Stripes > 0 ? 1 : 0) + (totalSpotCount > 0 ? 1 : 0);
        somfyBoxes = totalChannels > 0 ? trafos150 + trafos60 : 0;
        somfyReceivers = somfyBoxes;
        if (inputs.includeRemote) {
            somfyRemotes = Math.ceil(somfyReceivers / 5); // 1 remote per 5 receivers max
            if (somfyRemotes === 0 && somfyReceivers > 0) somfyRemotes = 1;
        }
    } else {
        // Standard: dimm-controller + remote (if selected)
        dimmControllers = (channel1Stripes > 0 ? 1 : 0) + (channel2Stripes > 0 ? 1 : 0);
        if (dimmControllers === 0 && totalSpotCount > 0) dimmControllers = 1;
        if (inputs.includeRemote && dimmControllers > 0) {
            standardRemotes = 1;
        }
    }

    // Verbindungsmuffe (connector sleeves) - needed with Somfy setup
    const verbindungsmuffen = somfyBoxes;

    // ---- Build product list ----
    const products: LedProduct[] = [];

    const addProduct = (pos: number, quantity: number) => {
        if (quantity <= 0) return;
        const catalog = LED_CATALOG.find(c => c.pos === pos);
        if (!catalog) return;

        // For set-based items, round up to full sets
        let adjustedQty = quantity;
        if (catalog.perSet) {
            adjustedQty = Math.ceil(quantity / catalog.perSet);
        }

        products.push({
            pos: catalog.pos,
            axe: catalog.axe,
            articleNr: catalog.articleNr,
            name: catalog.name,
            nameDE: catalog.nameDE,
            unitPrice: catalog.unitPrice,
            quantity: adjustedQty,
            totalPrice: Math.round(catalog.unitPrice * adjustedQty * 100) / 100,
        });
    };

    addProduct(1, strips5m);       // LED Stripe 5m
    addProduct(2, strips8m);       // LED Stripe 8m
    addProduct(3, diffusorCount);  // LED Silikon Diffusor
    addProduct(4, spotSets);       // LED Spot Altea Set
    addProduct(5, trafos150);      // Trafo 150W
    addProduct(6, verbindungsmuffen); // Verbindungsmuffe
    addProduct(7, trafos60);       // Trafo 60W

    if (isSomfy) {
        addProduct(8, somfyBoxes);     // Anschlussbox Somfy
        addProduct(9, somfyReceivers); // LED Receiver Somfy
        addProduct(10, somfyRemotes);  // Somfy Fernbedienung
    }

    addProduct(11, yConnectors);    // Y-Anschlusskabel
    addProduct(12, extensions1m);   // Verlängerung 1m
    addProduct(13, extensions2m);   // Verlängerung 2m
    addProduct(14, extensions3m);   // Verlängerung 3m

    if (!isSomfy) {
        addProduct(15, standardRemotes);    // Fernbedienung Standard
        addProduct(16, dimmControllers);    // Receiver / Dimm-Controller
    }

    // ---- Calculate totals ----
    const totalNet = products.reduce((sum, p) => sum + p.totalPrice, 0);
    const totalVat = Math.round(totalNet * VAT_RATE * 100) / 100;
    const totalGross = Math.round((totalNet + totalVat) * 100) / 100;

    // End customer pricing (with margin)
    const endCustomerNet = Math.round((totalNet / DIVISOR) * 100) / 100;
    const endCustomerVat = Math.round(endCustomerNet * VAT_RATE * 100) / 100;
    const endCustomerGross = Math.round((endCustomerNet + endCustomerVat) * 100) / 100;

    return {
        products,
        totalNet: Math.round(totalNet * 100) / 100,
        totalVat,
        totalGross,
        endCustomerNet,
        endCustomerVat,
        endCustomerGross,
    };
}

// ==================== UTILITY EXPORTS ====================

export function getRoofTypeOptions(): Array<{ id: LedRoofType; label: string; labelDE: string }> {
    return Object.values(ROOF_TYPE_CONFIGS).map(c => ({
        id: c.id,
        label: c.label,
        labelDE: c.labelDE,
    }));
}

export function formatPrice(price: number): string {
    return price.toFixed(2).replace('.', ',') + ' €';
}
