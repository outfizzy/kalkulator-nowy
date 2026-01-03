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

export const getPostProfile = () => {
    // 110mm x 110mm with 3mm radius
    return createRoundedRect(0.11, 0.11, 0.003);
};

export const getRafterProfile = () => {
    // 60mm x 100mm (or higher?) usually rafters are tall. 
    // Let's say 60mm width x 100mm height
    // But in "Extrusion" usually Z is length. So Shape is the XY cross section.
    // In our model, we might extrude along Z or Y. 
    // Let's define shape as Width x Height cross-section.
    return createRoundedRect(0.06, 0.10, 0.002);
};

export const getWallProfileShape = () => {
    // Simple L-shape or Box for wall connection
    // 150mm height, 50mm depth?
    // Let's just use a nice rounded box for now, maybe with a "lip"
    return createRoundedRect(0.05, 0.15, 0.002);
};

export const getGutterProfile = (style: 'trendstyle' | 'orangestyle' | 'topstyle' | string, width: number = 0.15, height: number = 0.15) => {
    const shape = new THREE.Shape();
    // width is GUTTER_DEPTH (approx 150mm - 200mm)
    // height is BEAM_HEIGHT (approx 150mm - 200mm)

    if (style === 'orangestyle') {
        // Softline: Rounded front face
        // We draw the CROSS SECTION.
        // Assuming we look from side? 
        // No, typically we extrude the LENGTH (Width of patio).
        // So shape is the side profile (Depth x Height).

        // Start bottom left
        shape.moveTo(0, 0);
        // Bottom line
        shape.lineTo(width, 0);
        // Front face (curved)
        shape.bezierCurveTo(width + 0.05, height * 0.3, width + 0.02, height * 0.8, width, height);
        // Top line
        shape.lineTo(0, height);
        // Back line
        shape.lineTo(0, 0);

        return shape;
    } else {
        // Trendstyle: Modern Boxy - Cubist Flat Front
        // Removed decorative steps to match "Cubist" reference photo
        shape.moveTo(0, 0);
        shape.lineTo(width, 0);
        shape.lineTo(width, height);
        shape.lineTo(0, height);
        shape.lineTo(0, 0);

        return shape;
    }
};

// Wedge Frame Profile (for triangles)
export const getWedgeFrameProfile = () => {
    // Small 40x40mm profile
    return createRoundedRect(0.04, 0.04, 0.001);
};
