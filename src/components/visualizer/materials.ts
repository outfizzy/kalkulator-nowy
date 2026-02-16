/**
 * Centralized PBR Materials Library
 * ===================================
 * Premium material definitions for the 3D visualizer.
 * All materials use Physically Based Rendering (PBR) properties
 * for photorealistic appearance under environment lighting.
 */
import * as THREE from 'three';

// ─── RAL Color Map ──────────────────────────────────────────
export const RAL_COLORS: Record<string, string> = {
    'RAL 9006': '#A5A5A5',   // White Aluminium
    'RAL 9010': '#F5F5F0',   // Pure White (warm)
    'RAL 9007': '#8F8F8F',   // Grey Aluminium
    'RAL 8014': '#4E3B31',   // Sepia Brown
    'RAL 7016': '#373F43',   // Anthracite Grey (default)
    'RAL 9005': '#0A0A0A',   // Jet Black
    'RAL 9001': '#FDF4E3',   // Cream
    'RAL 7035': '#D7D7D7',   // Light Grey
};

export function resolveRALColor(input: string): string {
    return RAL_COLORS[input] || input || RAL_COLORS['RAL 7016'];
}

// ─── Aluminum (Anodized / Brushed) ────────────────────────────
/** Creates a premium brushed/anodized aluminum material */
export function createAluminumMaterial(color: string): THREE.MeshStandardMaterial {
    const resolved = resolveRALColor(color);
    return new THREE.MeshStandardMaterial({
        color: resolved,
        metalness: 0.85,
        roughness: 0.25,
        envMapIntensity: 1.2,
    });
}

// ─── Polycarbonate Roof ──────────────────────────────────────
/** Translucent polycarbonate (opal/clear) */
export function createPolycarbonateRoofMaterial(
    variant: 'opal' | 'clear' | 'ir-gold' = 'opal'
): THREE.MeshPhysicalMaterial {
    const tint = variant === 'ir-gold' ? '#dbeafe' : '#ffffff';
    const transmission = variant === 'clear' ? 0.85 : 0.55;
    return new THREE.MeshPhysicalMaterial({
        color: tint,
        transmission,
        opacity: 1,
        transparent: true,
        roughness: 0.35,
        metalness: 0,
        ior: 1.49,
        thickness: 0.016,
        envMapIntensity: 0.5,
        side: THREE.DoubleSide,
    });
}

/** Clear glass roof (VSG/ESG) */
export function createGlassRoofMaterial(): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        transmission: 0.96,
        opacity: 1,
        transparent: true,
        roughness: 0.02,
        metalness: 0,
        ior: 1.52,
        thickness: 0.012,
        envMapIntensity: 1.5,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
    });
}

// ─── Structural Glass (Walls / Sliding) ──────────────────────
/** High-clarity architectural glass for walls */
export function createGlassWallMaterial(): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
        color: '#eef2ff',
        transmission: 0.97,
        opacity: 1,
        transparent: true,
        metalness: 0,
        roughness: 0.01,
        ior: 1.52,
        thickness: 0.01,
        envMapIntensity: 1.8,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
    });
}

// ─── Floor Materials ─────────────────────────────────────────
/** WPC composite decking */
export function createWPCFloorMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color: '#6D4C3D',
        roughness: 0.85,
        metalness: 0.0,
        envMapIntensity: 0.3,
    });
}

/** WPC floor base (visible between planks) */
export function createWPCBaseMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color: '#3e2723',
        roughness: 1,
        metalness: 0,
    });
}

/** Gres/porcelain tile */
export function createGresTileMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color: '#C8C8C8',
        roughness: 0.4,
        metalness: 0.05,
        envMapIntensity: 0.6,
    });
}

/** Gres floor base (grout) */
export function createGresBaseMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color: '#9E9E9E',
        roughness: 1,
        metalness: 0,
    });
}

// ─── Accessories ─────────────────────────────────────────────
/** Dark metal housing (heaters, zip cassettes, LED fixtures) */
export function createDarkMetalMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color: '#1a1a1a',
        roughness: 0.35,
        metalness: 0.9,
        envMapIntensity: 0.8,
    });
}

/** Heater element (glowing tube) */
export function createHeaterGlowMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color: '#ff6600',
        emissive: '#ff4400',
        emissiveIntensity: 2.5,
        roughness: 0.3,
        metalness: 0.7,
        toneMapped: false,
    });
}

/** Heater body (dark brushed steel) */
export function createHeaterBodyMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color: '#222',
        roughness: 0.2,
        metalness: 0.85,
        envMapIntensity: 1.0,
    });
}

/** LED warm white emitter */
export function createLEDEmitterMaterial(): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
        color: '#fffaee',
        toneMapped: false,
    });
}

/** LED fixture housing */
export function createLEDFixtureMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color: '#222',
        roughness: 0.3,
        metalness: 0.9,
    });
}

/** Awning fabric */
export function createFabricMaterial(color: string = '#e5e7eb'): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.95,
        metalness: 0,
        side: THREE.DoubleSide,
    });
}

/** Zip screen mesh */
export function createScreenMeshMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color: '#2a2a2a',
        transparent: true,
        opacity: 0.75,
        roughness: 0.9,
        metalness: 0,
        side: THREE.DoubleSide,
    });
}

/** Frame profile (glass wall frames, guides) */
export function createFrameMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color: '#2a2a2a',
        roughness: 0.4,
        metalness: 0.7,
        envMapIntensity: 0.6,
    });
}

/** Guide rail material */
export function createGuideMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color: '#999',
        roughness: 0.4,
        metalness: 0.5,
    });
}

// ─── Decor / Furniture ───────────────────────────────────────
/** Natural wood (table tops, fence, planters) */
export function createWoodMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color: '#8b5a2b',
        roughness: 0.85,
        metalness: 0,
        envMapIntensity: 0.2,
    });
}

/** Chair / furniture metal */
export function createFurnitureMetalMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color: '#2d2d2d',
        roughness: 0.3,
        metalness: 0.8,
        envMapIntensity: 0.7,
    });
}

/** Rug / textile */
export function createRugMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color: '#e8e4df',
        roughness: 1,
        metalness: 0,
    });
}

/** Ceramic plate */
export function createPlateMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color: '#f8f8f8',
        roughness: 0.15,
        metalness: 0.05,
        envMapIntensity: 0.4,
    });
}

/** Plant / leaf green */
export function createPlantMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color: '#3d8b37',
        roughness: 0.9,
        metalness: 0,
    });
}

/** Plant pot (terracotta) */
export function createPotMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color: '#8d6e63',
        roughness: 0.8,
        metalness: 0,
    });
}

// ─── House Facade ────────────────────────────────────────────
/** Stucco / plaster wall */
export function createWallMaterial(color: string = '#ffffff'): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.92,
        metalness: 0,
        envMapIntensity: 0.2,
    });
}

/** Interior floor visible through door */
export function createInteriorFloorMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color: '#ddd',
        roughness: 0.7,
        metalness: 0,
    });
}

/** Window / door glass */
export function createWindowGlassMaterial(): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
        color: '#87CEEB',
        transmission: 0.55,
        roughness: 0.08,
        metalness: 0.05,
        ior: 1.52,
        thickness: 0.01,
        envMapIntensity: 0.8,
    });
}

/** Window / door frame */
export function createWindowFrameMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color: '#2a2a2a',
        roughness: 0.4,
        metalness: 0.6,
    });
}

// ─── Ground & Environment ────────────────────────────────────
/** Grass-like ground material */
export function createGrassMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color: '#5a8a3c',
        roughness: 1,
        metalness: 0,
    });
}

/** Stone patio ground material */
export function createStoneGroundMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color: '#b0a89a',
        roughness: 0.75,
        metalness: 0.02,
        envMapIntensity: 0.3,
    });
}

/** Water glass for decor */
export function createWaterGlassMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
        color: '#aaeeff',
        transparent: true,
        opacity: 0.6,
        roughness: 0.1,
        metalness: 0.1,
    });
}
