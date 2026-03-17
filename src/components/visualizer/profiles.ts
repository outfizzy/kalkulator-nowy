import * as THREE from 'three';

// Helper to create a rounded rectangle shape
const createRoundedRect = (width: number, height: number, radius: number) => {
    const shape = new THREE.Shape();
    const x = -width / 2;
    const y = -height / 2;

    shape.moveTo(x, y + radius);
    shape.lineTo(x, y + height - radius);
    shape.quadraticCurveTo(x, y + height, x + radius, y + height);
    shape.lineTo(x + width - radius, y + height);
    shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
    shape.lineTo(x + width, y + radius);
    shape.quadraticCurveTo(x + width, y, x + width - radius, y);
    shape.lineTo(x + radius, y);
    shape.quadraticCurveTo(x, y, x, y + radius);

    return shape;
};

// ═══════════ POST PROFILE ═══════════
// 110mm × 110mm square aluminum post with 3mm corner radius
export const getPostProfile = () => {
    return createRoundedRect(0.11, 0.11, 0.003);
};

// ═══════════ RAFTER PROFILE (main body) ═══════════
// 60mm wide × 80mm tall structural body
export const getRafterProfile = () => {
    return createRoundedRect(0.06, 0.08, 0.002);
};

// ═══════════ RAFTER CAP (cover strip) ═══════════
// Wider cap that sits on top of rafter body — creates T-shape silhouette
// 80mm wide × 15mm tall (wider than 60mm rafter body)
export const getRafterCapProfile = () => {
    return createRoundedRect(0.08, 0.015, 0.001);
};

// ═══════════ RUBBER SEAL STRIP ═══════════
// Black EPDM rubber gasket between glass panels and rafter caps
// 8mm wide × 5mm tall
export const getRubberSealProfile = () => {
    return createRoundedRect(0.008, 0.005, 0.0005);
};

// ═══════════ WALL PROFILE (Wandanschluss) ═══════════
// Wall attachment bar — 50mm deep × 150mm tall
export const getWallProfileShape = () => {
    return createRoundedRect(0.05, 0.15, 0.002);
};

// ═══════════ GUTTER PROFILE (Rinne / Frontbalken) ═══════════
// Multi-part profile: front fascia + drainage channel + top shelf
export const getGutterProfile = (style: 'trendstyle' | 'orangestyle' | 'topstyle' | string, width: number = 0.15, height: number = 0.15) => {
    const shape = new THREE.Shape();
    // width = GUTTER_DEPTH (front-to-back thickness)
    // height = BEAM_HEIGHT (top-to-bottom visual height)

    const lip = 0.02;       // bottom drainage lip extension
    const channel = 0.012;  // water channel depth on top
    const fascia = 0.008;   // front fascia overhang

    if (style === 'orangestyle') {
        // Softline: Rounded front face with drainage lip
        shape.moveTo(0, -lip);                          // Bottom lip start
        shape.lineTo(width + fascia, -lip);             // Bottom edge to front
        shape.bezierCurveTo(
            width + fascia + 0.03, height * 0.3,
            width + fascia + 0.015, height * 0.7,
            width + fascia, height
        );                                               // Curved front face
        shape.lineTo(width, height);                     // Top shelf outer edge
        shape.lineTo(width, height - channel);           // Channel dip
        shape.lineTo(channel, height - channel);         // Channel bottom
        shape.lineTo(0, height);                         // Top shelf inner edge
        shape.lineTo(0, -lip);                           // Close

        return shape;
    } else {
        // Trendstyle / Topstyle: Modern cubist with drainage lip + channel
        shape.moveTo(0, -lip);                           // Bottom lip start
        shape.lineTo(width + fascia, -lip);              // Bottom edge to front
        shape.lineTo(width + fascia, height);            // Front face (flat)
        shape.lineTo(width, height);                     // Top outer edge
        shape.lineTo(width, height - channel);           // Channel outer drop
        shape.lineTo(channel, height - channel);         // Channel bottom
        shape.lineTo(0, height);                         // Top inner edge
        shape.lineTo(0, -lip);                           // Close

        return shape;
    }
};

// ═══════════ TRACK RAIL (for sliding glass) ═══════════
// Top track: multi-channel profile ~30mm tall × 40mm deep
export const getTopTrackProfile = () => {
    const shape = new THREE.Shape();
    const w = 0.04; // depth (front-to-back)
    const h = 0.03; // height

    shape.moveTo(0, 0);
    shape.lineTo(w, 0);
    shape.lineTo(w, h);
    // Two grooves in the bottom for glass panes
    shape.lineTo(w * 0.7, h);
    shape.lineTo(w * 0.7, h - 0.008);
    shape.lineTo(w * 0.55, h - 0.008);
    shape.lineTo(w * 0.55, h);
    shape.lineTo(w * 0.45, h);
    shape.lineTo(w * 0.45, h - 0.008);
    shape.lineTo(w * 0.3, h - 0.008);
    shape.lineTo(w * 0.3, h);
    shape.lineTo(0, h);
    shape.lineTo(0, 0);

    return shape;
};

// Bottom track: low-profile rail ~15mm tall × 40mm wide
export const getBottomTrackProfile = () => {
    return createRoundedRect(0.04, 0.015, 0.001);
};

// ═══════════ GLASS EDGE U-PROFILE ═══════════
// Slim aluminum U-channel on glass panel edges — 20mm × 10mm
export const getGlassEdgeProfile = () => {
    const shape = new THREE.Shape();
    const w = 0.01;
    const h = 0.02;
    const wall = 0.003;

    shape.moveTo(0, 0);
    shape.lineTo(w, 0);
    shape.lineTo(w, h);
    shape.lineTo(w - wall, h);
    shape.lineTo(w - wall, wall);
    shape.lineTo(wall, wall);
    shape.lineTo(wall, h);
    shape.lineTo(0, h);
    shape.lineTo(0, 0);

    return shape;
};

// ═══════════ WEDGE FRAME PROFILE ═══════════
export const getWedgeFrameProfile = () => {
    return createRoundedRect(0.04, 0.04, 0.001);
};
