/**
 * Dachrechner - Roof Construction Calculator Service
 * 
 * Implements the same calculation logic as dachrechner.xlsx
 * for all 14 roof models with ALL dimensions.
 * 
 * COLUMN MAPPING FROM EXCEL:
 * B = H3 (Höhe Unterkante Rinne) - INPUT
 * C = Bestelltiefe - INPUT
 * D = H1 (Höhe Unterkante Wandprofil)
 * E = U1 (Dachüberstand) - INPUT for Ultraline
 * F = α (Neigung °)
 * G = Neigung mm/m
 * H = β (Neigung Glas °)
 * I = D1 (Tiefe Hinterkante Wandanschluss)
 * J = S1 Mitte (Länge Sparren Mitte)
 * K = S1 Außen (Länge Sparren Außen)
 * L = D2 (Tiefe mit Standard-Rinne)
 * M = D3 (Tiefe Rinne rund)
 * N = D4 (Tiefe Rinne klassiek)
 * O = D2alt (Tiefe zwischen Ständer/Wand)
 * P = H2 (Höhe Oberkante Wandprofil)
 * Q = D4 (Tiefe bis Außenkante Pfosten)
 * R = D5 (Tiefe Freistand)
 * S = F1 (Fensterhöhe Rinnenseite)
 * T = F2 (Fensterbreite)
 * U = K1 (Keilhöhe Rinnenseite)
 * V = K2 (Keilhöhe Hausseite)
 * W = F3 (Fensterhöhe Hausseite)
 * X = H2 XL (Höhe Oberkante Wandprofil XL)
 */

// Model definitions
export const ROOF_MODELS = {
    orangeline: {
        id: 'orangeline',
        name: 'Orangeline',
        category: 'fixed_angle',
        fixedAngle: 8,
        constants: { keilhoehe: 39 },
        inputs: ['h3', 'depth'],
    },
    'orangeline+': {
        id: 'orangeline+',
        name: 'Orangeline+',
        category: 'fixed_angle_plus',
        fixedAngle: 8,
        constants: { keilhoehe: 34 },
        inputs: ['h3', 'depth'],
    },
    trendline: {
        id: 'trendline',
        name: 'Trendline',
        category: 'calculated_angle',
        constants: { profileHeight: 47.5, keilhoehe: 39 },
        inputs: ['h3', 'depth', 'h1'],
    },
    'trendline+': {
        id: 'trendline+',
        name: 'Trendline+',
        category: 'calculated_angle',
        constants: { profileHeight: 57.5, keilhoehe: 50.1 },
        inputs: ['h3', 'depth', 'h1'],
    },
    topline: {
        id: 'topline',
        name: 'Topline',
        category: 'calculated_angle',
        constants: { profileHeight: 93.2, depthOffset: 155, keilhoehe: 84 },
        inputs: ['h3', 'depth', 'h1'],
    },
    'topline_xl': {
        id: 'topline_xl',
        name: 'Topline XL',
        category: 'calculated_angle',
        constants: { profileHeight: 117, depthOffset: 155, keilhoehe: 106 },
        inputs: ['h3', 'depth', 'h1'],
    },
    designline: {
        id: 'designline',
        name: 'Designline',
        category: 'designline',
        constants: { keilhoehe: 93 },
        inputs: ['h3', 'depth', 'h1'],
    },
    'ultraline_classic': {
        id: 'ultraline_classic',
        name: 'Ultraline Classic',
        category: 'ultraline',
        inputs: ['depth', 'h1', 'overhang'],
    },
    'ultraline_style': {
        id: 'ultraline_style',
        name: 'Ultraline Style',
        category: 'ultraline',
        constants: { fixedOverhang: 120 },
        inputs: ['depth', 'h1'],
    },
    'ultraline_compact': {
        id: 'ultraline_compact',
        name: 'Ultraline Compact',
        category: 'ultraline_compact',
        inputs: ['depth', 'h1'],
    },
    skyline: {
        id: 'skyline',
        name: 'Skyline',
        category: 'flat',
        constants: { glassAngleHeight: 95 },
        inputs: ['h3', 'depth'],
    },
    'skyline_freistand': {
        id: 'skyline_freistand',
        name: 'Skyline Freistand',
        category: 'flat_freestanding',
        constants: { glassAngleHeight: 95 },
        inputs: ['h3', 'depth'],
    },
    carport: {
        id: 'carport',
        name: 'Carport',
        category: 'carport',
        constants: { glassAngleHeight: 28 },
        inputs: ['h3', 'depth'],
    },
    'carport_freistand': {
        id: 'carport_freistand',
        name: 'Carport Freistand',
        category: 'carport_freestanding',
        constants: { glassAngleHeight: 28 },
        inputs: ['h3', 'depth'],
    },
} as const;

export type RoofModelId = keyof typeof ROOF_MODELS;

export interface DachrechnerInputs {
    h3?: number;      // B: Höhe Unterkante Rinne [mm]
    depth: number;    // C: Bestelltiefe [mm]
    h1?: number;      // D: Höhe Unterkante Wandprofil [mm]
    overhang?: number; // E: Dachüberstand [mm] (Ultraline only)
    width?: number;   // Säulen Außen-Außen (Szerokość całkowita) [mm]
    postCount?: number; // Anzahl Pfosten (Liczba słupów)
}

export interface DachrechnerResults {
    // Input echo
    h3: number | null;           // B
    depth: number;               // C
    h1: number | null;           // D
    overhang: number | null;     // E (U1)

    // Angles
    angleAlpha: number | null;       // F: Neigung [°] (α)
    inclinationMmM: number | null;   // G: Neigung [mm/m]
    angleBeta: number | null;        // H: Neigung Glas [°] (β)

    // Depths (Tiefe)
    depthD1: number | null;          // I: Tiefe Hinterkante Wandanschluss
    depthD2: number | null;          // L: Tiefe mit Standard-Rinne
    depthD3: number | null;          // M: Tiefe Rinne rund
    depthD4: number | null;          // N: Tiefe Rinne klassiek
    depthD2alt: number | null;       // O: Tiefe zwischen Ständer und Wand
    depthD4post: number | null;      // Q: Tiefe bis Außenkante Pfosten
    depthD5: number | null;          // R: Tiefe Freistand bis Außenkante

    // Rafter lengths (Sparren)
    sparrenMitte: number | null;     // J: Länge Sparren Mitte (S1)
    sparrenAussen: number | null;    // K: Länge Sparren Außen (S1a)

    // Heights (Höhe)
    heightH2: number | null;         // P: Höhe Oberkante Wandprofil
    heightH2XL: number | null;       // X: Höhe Oberkante Wandprofil XL

    // Window dimensions (Fenster)
    fensterF1: number | null;        // S: Fensterhöhe Rinnenseite
    fensterF2: number | null;        // T: Fensterbreite
    fensterF3: number | null;        // W: Fensterhöhe Hausseite

    // Wedge heights (Keilhöhe)
    keilhoeheK1: number | null;      // U: Keilhöhe Rinnenseite
    keilhoeheK2: number | null;      // V: Keilhöhe Hausseite

    // Widths
    innerWidth: number | null;       // Säulen Innen-Innen (Szerokość między słupami)
}

// Helper functions
const toRadians = (degrees: number): number => degrees * (Math.PI / 180);
const toDegrees = (radians: number): number => radians * (180 / Math.PI);

/**
 * Main calculation function
 */
export function calculateDachrechner(
    modelId: RoofModelId,
    inputs: DachrechnerInputs
): DachrechnerResults {
    const model = ROOF_MODELS[modelId];

    // Initialize with nulls
    const results: DachrechnerResults = {
        h3: inputs.h3 ?? null,
        depth: inputs.depth,
        h1: inputs.h1 ?? null,
        overhang: inputs.overhang ?? null,
        angleAlpha: null,
        inclinationMmM: null,
        angleBeta: null,
        depthD1: null,
        depthD2: null,
        depthD3: null,
        depthD4: null,
        depthD2alt: null,
        depthD4post: null,
        depthD5: null,
        sparrenMitte: null,
        sparrenAussen: null,
        heightH2: null,
        heightH2XL: null,
        fensterF1: null,
        fensterF2: null,
        fensterF3: null,
        keilhoeheK1: null,
        keilhoeheK2: null,
    };

    switch (model.category) {
        case 'fixed_angle':
            return calcOrangeline(inputs, results);
        case 'fixed_angle_plus':
            return calcOrangelinePlus(inputs, results);
        case 'calculated_angle':
            return calcTrendlineFamily(modelId, inputs, results);
        case 'designline':
            return calcDesignline(inputs, results);
        case 'ultraline':
            return calcUltraline(modelId, inputs, results);
        case 'ultraline_compact':
            return calcUltralineCompact(inputs, results);
        case 'flat':
            return calcSkyline(inputs, results);
        case 'flat_freestanding':
            return calcSkylineFreistand(inputs, results);
        case 'carport':
            return calcCarport(inputs, results);
        case 'carport_freestanding':
            return calcCarportFreistand(inputs, results);
        default:
            return results;
    }
}

// ===================== ORANGELINE =====================
function calcOrangeline(inputs: DachrechnerInputs, r: DachrechnerResults): DachrechnerResults {
    const { h3 = 0, depth } = inputs;
    const F = 8; // Fixed angle
    const radF = toRadians(F);

    // J = C - 100
    r.sparrenMitte = depth - 100;

    // F = 8 (fixed)
    r.angleAlpha = F;

    // G = TAN(F) * 1000
    r.inclinationMmM = Math.tan(radF) * 1000;

    // D = B + J*SIN(F) + 18 + 2
    r.h1 = h3 + r.sparrenMitte * Math.sin(radF) + 18 + 2;

    // I = J*COS(F) + 57 + 34
    r.depthD1 = r.sparrenMitte * Math.cos(radF) + 57 + 34;

    // L = I + 70
    r.depthD2 = r.depthD1 + 70;

    // O = I - 55
    r.depthD2alt = r.depthD1 - 55;

    // P = D + 157
    r.heightH2 = r.h1 + 157;

    // X = D + 166
    r.heightH2XL = r.h1 + 166;

    // Q = I + 55
    r.depthD4post = r.depthD1 + 55;

    // R = Q + 117
    r.depthD5 = r.depthD4post + 117;

    // S = B + 15.7
    r.fensterF1 = h3 + 15.7;

    // T = O
    r.fensterF2 = r.depthD2alt;

    // U = 39 (fixed)
    r.keilhoeheK1 = 39;

    // V = D - B + 23.8
    r.keilhoeheK2 = r.h1 - h3 + 23.8;

    // W = D
    r.fensterF3 = r.h1;

    return r;
}

// ===================== ORANGELINE+ =====================
function calcOrangelinePlus(inputs: DachrechnerInputs, r: DachrechnerResults): DachrechnerResults {
    const { h3 = 0, depth } = inputs;
    const F = 8; // Fixed angle
    const radF = toRadians(F);

    // J = C - 100
    r.sparrenMitte = depth - 100;

    r.angleAlpha = F;
    r.inclinationMmM = Math.tan(radF) * 1000;

    // D = C*SIN(F) - TAN(F)*56.8 + B + 34
    r.h1 = depth * Math.sin(radF) - Math.tan(radF) * 56.8 + h3 + 34;

    // I = COS(F)*(C+2.5+2.5)
    r.depthD1 = Math.cos(radF) * (depth + 2.5 + 2.5);

    // L = I + 89.6
    r.depthD2 = r.depthD1 + 89.6;

    // O = I - 55
    r.depthD2alt = r.depthD1 - 55;

    // P = D + 157.18
    r.heightH2 = r.h1 + 157.18;

    // X = D + 166
    r.heightH2XL = r.h1 + 166;

    // Q = O + 110
    r.depthD4post = r.depthD2alt + 110;

    // R = Q + 117
    r.depthD5 = r.depthD4post + 117;

    // S = B + U
    r.keilhoeheK1 = 34;
    r.fensterF1 = h3 + r.keilhoeheK1;

    // T = O
    r.fensterF2 = r.depthD2alt;

    // V = D - B
    r.keilhoeheK2 = r.h1 - h3;

    // W = D
    r.fensterF3 = r.h1;

    return r;
}

// ===================== TRENDLINE FAMILY =====================
function calcTrendlineFamily(modelId: RoofModelId, inputs: DachrechnerInputs, r: DachrechnerResults): DachrechnerResults {
    const { h3 = 0, depth, h1 = 0 } = inputs;
    r.h1 = h1;

    const model = ROOF_MODELS[modelId];
    const c = model.constants as { profileHeight: number; keilhoehe: number; depthOffset?: number };

    // J = C - depthOffset (usually 100, 155 for Topline)
    const depthOffset = c.depthOffset || 100;
    r.sparrenMitte = depth - depthOffset;
    const J = r.sparrenMitte;

    // F = DEGREES(ASIN(((D+1.6)-(B+profileHeight))/(J+20.4)))
    const numerator = (h1 + 1.6) - (h3 + c.profileHeight);
    const denominator = J + 20.4;

    if (denominator > 0 && Math.abs(numerator / denominator) <= 1) {
        const radF = Math.asin(numerator / denominator);
        r.angleAlpha = toDegrees(radF);
        r.inclinationMmM = Math.tan(radF) * 1000;

        const cosF = Math.cos(radF);

        // Model-specific calculations
        if (modelId === 'trendline') {
            // I = COS(F)*J + 78.4 + 20.4 + 33.1
            r.depthD1 = cosF * J + 78.4 + 20.4 + 33.1;
            // L = I + 112
            r.depthD2 = r.depthD1 + 112;
            // M = I + 115.3 (Rinne rund)
            r.depthD3 = r.depthD1 + 115.3;
            // N = I + 157.6 (Rinne klassiek)
            r.depthD4 = r.depthD1 + 157.6;
            // O = COS(F)*J + 23.4 + 20.4 + 33.1
            r.depthD2alt = cosF * J + 23.4 + 20.4 + 33.1;
            // Q = COS(F)*J + 133.4 + 20.4 + 33.1
            r.depthD4post = cosF * J + 133.4 + 20.4 + 33.1;
            // R = Q + 117
            r.depthD5 = r.depthD4post + 117;
            // P = D + 162.2
            r.heightH2 = h1 + 162.2;
            // X = D + 190.8
            r.heightH2XL = h1 + 190.8;
        } else if (modelId === 'trendline+') {
            // I = COS(F)*(J+2*10.2) + 78.4 + 33.1
            r.depthD1 = cosF * (J + 2 * 10.2) + 78.4 + 33.1;
            // L = I + 112.1
            r.depthD2 = r.depthD1 + 112.1;
            // O = I - 55
            r.depthD2alt = r.depthD1 - 55;
            // Q = I + 55
            r.depthD4post = r.depthD1 + 55;
            // R = Q + 117
            r.depthD5 = r.depthD4post + 117;
            r.heightH2 = h1 + 162.2;
            r.heightH2XL = h1 + 190.8;
        } else if (modelId === 'topline') {
            // I = COS(F)*J + 99.1 + 20.4 + 33.1
            r.depthD1 = cosF * J + 99.1 + 20.4 + 33.1;
            // L = COS(F)*J + 222.1 + 20.4 + 33.1
            r.depthD2 = cosF * J + 222.1 + 20.4 + 33.1;
            // O = COS(F)*J + 24.6 + 20.4 + 33.1
            r.depthD2alt = cosF * J + 24.6 + 20.4 + 33.1;
            // Q = I + 74.5
            r.depthD4post = r.depthD1 + 74.5;
            // R = Q + 117
            r.depthD5 = r.depthD4post + 117;
            r.heightH2 = h1 + 162.2;
            r.heightH2XL = h1 + 190.8;
        } else if (modelId === 'topline_xl') {
            // I = COS(F)*J + 118.9 + 20.4 + 33.1
            r.depthD1 = cosF * J + 118.9 + 20.4 + 33.1;
            // L = COS(F)*J + 118.9 + 134.8 + 20.4 + 33.1
            r.depthD2 = cosF * J + 118.9 + 134.8 + 20.4 + 33.1;
            // O = COS(F)*J + 21.2 + 20.4 + 33.1
            r.depthD2alt = cosF * J + 21.2 + 20.4 + 33.1;
            // Q = COS(F)*J + 118.9 + 98.3 + 20.4 + 33.1
            r.depthD4post = cosF * J + 118.9 + 98.3 + 20.4 + 33.1;
            // R = COS(F)*J + 217.2 + 20.4 + 33.1 + 117
            r.depthD5 = cosF * J + 217.2 + 20.4 + 33.1 + 117;
            r.heightH2 = h1 + 162.2;
            r.heightH2XL = h1 + 190.8;
        }

        // Common: Fenster
        // S = B + U
        r.keilhoeheK1 = c.keilhoehe;
        r.fensterF1 = h3 + c.keilhoehe;
        // T = O
        r.fensterF2 = r.depthD2alt;
        // V = D - B
        r.keilhoeheK2 = h1 - h3;
        // W = D
        r.fensterF3 = h1;
    }

    return r;
}

// ===================== DESIGNLINE =====================
function calcDesignline(inputs: DachrechnerInputs, r: DachrechnerResults): DachrechnerResults {
    const { h3 = 0, depth, h1 = 0 } = inputs;
    r.h1 = h1;

    // J = C + 5
    r.sparrenMitte = depth + 5;
    const J = r.sparrenMitte;

    // F = DEGREES(ASIN((D+7.3-(B+83.1))/(J-41)))
    const numerator = h1 + 7.3 - (h3 + 83.1);
    const denominator = J - 41;

    if (denominator > 0 && Math.abs(numerator / denominator) <= 1) {
        const radF = Math.asin(numerator / denominator);
        r.angleAlpha = toDegrees(radF);
        r.inclinationMmM = Math.tan(radF) * 1000;

        const tanF = Math.tan(radF);
        if (tanF !== 0) {
            // I = ((D+7.3-(B+83.1))/TAN(F)) + 70.4 + 13.9
            const base = numerator / tanF;
            r.depthD1 = base + 70.4 + 13.9;
            // L = base + 184.9 + 13.9
            r.depthD2 = base + 184.9 + 13.9;
            // O = base + 70.4 + 13.9 - 98
            r.depthD2alt = r.depthD1 - 98;
            // Q = base + 70.4 + 13 + 98
            r.depthD4post = base + 70.4 + 13 + 98;
            // R = Q + 117
            r.depthD5 = r.depthD4post + 117;
        }

        // P = D + 163.6
        r.heightH2 = h1 + 163.6;

        // Fenster
        r.keilhoeheK1 = 93;
        r.fensterF1 = h3 + 93;
        r.fensterF2 = r.depthD2alt;
        r.keilhoeheK2 = h1 - h3;
        r.fensterF3 = h1;
    }

    return r;
}

// ===================== ULTRALINE CLASSIC/STYLE =====================
function calcUltraline(modelId: RoofModelId, inputs: DachrechnerInputs, r: DachrechnerResults): DachrechnerResults {
    const { depth, h1 = 0, overhang } = inputs;
    const model = ROOF_MODELS[modelId];

    // E = overhang (input or fixed 120 for Style)
    const E = modelId === 'ultraline_style'
        ? (model.constants as { fixedOverhang: number }).fixedOverhang
        : (overhang ?? 0);
    r.overhang = E;
    r.h1 = h1;

    // B = D - 218.5
    r.h3 = h1 - 218.5;

    if (modelId === 'ultraline_classic') {
        // L = C - E
        r.depthD2 = depth - E;
        // I = L - 100
        r.depthD1 = r.depthD2 - 100;
        // J = C - 120
        r.sparrenMitte = depth - 120;
    } else {
        // Style: J = C, L = J
        r.sparrenMitte = depth;
        r.depthD2 = depth;
        // I = J - 100
        r.depthD1 = depth - 100;
    }

    // O = I - 98
    r.depthD2alt = r.depthD1 - 98;

    // H = DEGREES(ATAN(155.2 / (O + 60)))
    if (r.depthD2alt !== null && r.depthD2alt + 60 > 0) {
        r.angleBeta = toDegrees(Math.atan(155.2 / (r.depthD2alt + 60)));
    }

    // P = D + 239.5
    r.heightH2 = h1 + 239.5;

    // Q = L - 2 (Classic) or O + 196 (Style)
    if (modelId === 'ultraline_classic') {
        r.depthD4post = r.depthD2 - 2;
    } else {
        r.depthD4post = r.depthD2alt! + 196;
    }

    // R = Q + 196
    r.depthD5 = r.depthD4post + 196;

    // S = B + 220
    r.fensterF1 = r.h3! + 220;

    // T = O
    r.fensterF2 = r.depthD2alt;

    // W = S
    r.fensterF3 = r.fensterF1;

    return r;
}

// ===================== ULTRALINE COMPACT =====================
function calcUltralineCompact(inputs: DachrechnerInputs, r: DachrechnerResults): DachrechnerResults {
    const { depth, h1 = 0 } = inputs;
    r.h1 = h1;

    // B = D - 218.5
    r.h3 = h1 - 218.5;

    // I = C - 100
    r.depthD1 = depth - 100;
    // J = C - 120
    r.sparrenMitte = depth - 120;
    // K = C
    r.sparrenAussen = depth;
    // L = C
    r.depthD2 = depth;
    // O = I - 98
    r.depthD2alt = r.depthD1 - 98;

    // H = DEGREES(ATAN(155.2 / (O + 60)))
    if (r.depthD2alt !== null && r.depthD2alt + 60 > 0) {
        r.angleBeta = toDegrees(Math.atan(155.2 / (r.depthD2alt + 60)));
    }

    // P = D + 239.5
    r.heightH2 = h1 + 239.5;

    // Q = I + 98
    r.depthD4post = r.depthD1 + 98;
    // R = Q + 196
    r.depthD5 = r.depthD4post + 196;

    // S = B + 220
    r.fensterF1 = r.h3 + 220;
    // T = O
    r.fensterF2 = r.depthD2alt;
    // W = S
    r.fensterF3 = r.fensterF1;

    return r;
}

// ===================== SKYLINE =====================
function calcSkyline(inputs: DachrechnerInputs, r: DachrechnerResults): DachrechnerResults {
    const { h3 = 0, depth } = inputs;

    // D = B (flat)
    r.h1 = h3;

    // H = DEGREES(ATAN(95 / (C - 133 - 50)))
    const denom = depth - 133 - 50;
    if (denom > 0) {
        r.angleBeta = toDegrees(Math.atan(95 / denom));
    }

    // I = C - 160/2
    r.depthD1 = depth - 80;
    // J = C - 60 - 3 - 3 - 18
    r.sparrenMitte = depth - 84;
    // K = J
    r.sparrenAussen = r.sparrenMitte;
    // L = C
    r.depthD2 = depth;
    // O = L - 160
    r.depthD2alt = depth - 160;

    // P = D + 242.1
    r.heightH2 = h3 + 242.1;

    // Q = C
    r.depthD4post = depth;

    // S = B
    r.fensterF1 = h3;
    // T = O
    r.fensterF2 = r.depthD2alt;
    // W = S
    r.fensterF3 = r.fensterF1;

    return r;
}

// ===================== SKYLINE FREISTAND =====================
function calcSkylineFreistand(inputs: DachrechnerInputs, r: DachrechnerResults): DachrechnerResults {
    const { h3 = 0, depth } = inputs;

    r.h1 = h3;

    // H = DEGREES(ATAN(95 / (C - 133 - 62)))
    const denom = depth - 133 - 62;
    if (denom > 0) {
        r.angleBeta = toDegrees(Math.atan(95 / denom));
    }

    // I = C - 160/2 - 160
    r.depthD1 = depth - 80 - 160;
    // J = C - 60 - 3 - 3 - 60
    r.sparrenMitte = depth - 126;
    // K = J
    r.sparrenAussen = r.sparrenMitte;
    // L = C - 160
    r.depthD2 = depth - 160;
    // O = C - 2*160
    r.depthD2alt = depth - 320;

    // P = D + 242.1
    r.heightH2 = h3 + 242.1;

    // Q = L
    r.depthD4post = r.depthD2;
    // R = C
    r.depthD5 = depth;

    // S = B
    r.fensterF1 = h3;
    // T = O
    r.fensterF2 = r.depthD2alt;
    // W = S
    r.fensterF3 = r.fensterF1;

    return r;
}

// ===================== CARPORT =====================
function calcCarport(inputs: DachrechnerInputs, r: DachrechnerResults): DachrechnerResults {
    const { h3 = 0, depth } = inputs;

    r.h1 = h3;

    // H = DEGREES(ATAN(28 / (C - 77 - 133)))
    const denom = depth - 77 - 133;
    if (denom > 0) {
        r.angleBeta = toDegrees(Math.atan(28 / denom));
    }

    // I = C - 160/2
    r.depthD1 = depth - 80;
    // K = C - 60 - 3 - 3 - 18
    r.sparrenAussen = depth - 84;
    // L = C
    r.depthD2 = depth;
    // O = L - 160
    r.depthD2alt = depth - 160;

    // P = D + 242.1
    r.heightH2 = h3 + 242.1;

    // Q = C
    r.depthD4post = depth;

    // S = B
    r.fensterF1 = h3;
    // T = O
    r.fensterF2 = r.depthD2alt;
    // W = S
    r.fensterF3 = r.fensterF1;

    // Width Calculation (Standard 110mm Post)
    if (inputs.width) {
        const posts = inputs.postCount || 2;
        const postWidth = 110; // Standard 110mm
        // Inner Width = (Total - (Posts * PostWidth)) / (Posts - 1) gives spacing
        // But usually user wants "Total Clearance" or "Spacing between posts"?
        // "Szerokość w świetle" usually means spacing between two posts.
        // If 3 posts, it's spacing between 1 and 2 (assuming equal).
        if (posts > 1) {
            r.innerWidth = (inputs.width - (posts * postWidth)) / (posts - 1);
        } else {
            r.innerWidth = inputs.width - postWidth; // Single post? Weird.
        }
    }

    return r;
}

// ===================== CARPORT FREISTAND =====================
function calcCarportFreistand(inputs: DachrechnerInputs, r: DachrechnerResults): DachrechnerResults {
    const { h3 = 0, depth } = inputs;

    r.h1 = h3;

    // H = DEGREES(ATAN(28 / (C - 133 - 118)))
    const denom = depth - 133 - 118;
    if (denom > 0) {
        r.angleBeta = toDegrees(Math.atan(28 / denom));
    }

    // I = C - 160/2 - 160
    r.depthD1 = depth - 80 - 160;
    // K = C - 60 - 3 - 3 - 60
    r.sparrenAussen = depth - 126;
    // L = C - 160
    r.depthD2 = depth - 160;
    // O = C - 2*160
    r.depthD2alt = depth - 320;

    // P = D + 242.1
    r.heightH2 = h3 + 242.1;

    // Q = C - 160
    r.depthD4post = depth - 160;
    // R = C
    r.depthD5 = depth;

    // S = B
    r.fensterF1 = h3;
    // T = O
    r.fensterF2 = r.depthD2alt;
    // W = S
    r.fensterF3 = r.fensterF1;

    return r;
}

/**
 * Get required inputs for a model
 */
export function getModelInputs(modelId: RoofModelId): string[] {
    return ROOF_MODELS[modelId].inputs as unknown as string[];
}

/**
 * Get all model options for dropdown
 */
export function getModelOptions(): Array<{ id: RoofModelId; name: string }> {
    return Object.values(ROOF_MODELS).map(m => ({
        id: m.id as RoofModelId,
        name: m.name,
    }));
}
