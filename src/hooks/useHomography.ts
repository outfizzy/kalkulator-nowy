/**
 * useHomography — Calculates Three.js camera parameters from AI-detected wall geometry.
 *
 * Given 4 wall corner points (in pixel coordinates) and the image dimensions,
 * this hook computes the camera position, rotation, and FOV that match the
 * perspective of the original photograph, so a 3D model can be overlaid.
 */

import { useMemo } from 'react';
import * as THREE from 'three';

export interface WallPoints {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
    bottomRight: { x: number; y: number };
}

export interface HouseAnalysis {
    wall: WallPoints;
    mountingLine: {
        y: number;
        leftX: number;
        rightX: number;
    };
    groundLine: {
        y: number;
    };
    perspective: {
        vanishingPointX: number;
        vanishingPointY: number;
        cameraAngle: 'front' | 'slight_left' | 'slight_right' | 'left' | 'right';
        estimatedFovDeg: number;
    };
    lighting: {
        sunDirectionDeg: number;
        sunElevationDeg: number;
        intensity: 'bright' | 'medium' | 'overcast';
        shadowSide: 'left' | 'right' | 'none';
    };
    estimates: {
        wallHeightMeters: number;
        availableWidthMeters: number;
        groundToMountMeters: number;
    };
    confidence: number;
    notes: string;
}

export interface ARCameraParams {
    position: THREE.Vector3;
    lookAt: THREE.Vector3;
    fov: number;
    // Model placement in 3D world (meters)
    modelPosition: THREE.Vector3;
    modelRotationY: number;
    // Sun light direction matching photo
    sunDirection: THREE.Vector3;
    sunIntensity: number;
}

/**
 * Converts pixel coordinates from AI analysis into Three.js camera and model placement parameters.
 *
 * Strategy:
 * 1. Use the wall corners to establish a reference plane in 3D space
 * 2. The wall is placed at Z=0 (back wall), ground at Y=0
 * 3. Camera position is derived from perspective analysis
 * 4. Model is positioned at the mounting line, projecting outward from the wall
 */
export function useHomography(
    analysis: HouseAnalysis | null,
    imageWidth: number,
    imageHeight: number,
    productConfig: { width: number; projection: number; postsHeight?: number }
): ARCameraParams | null {
    return useMemo(() => {
        if (!analysis) return null;

        const { wall, mountingLine, groundLine, perspective, lighting, estimates } = analysis;

        // ── 1. Estimate real-world dimensions ──
        const wallHeightM = estimates.wallHeightMeters || 2.8;
        const wallWidthM = estimates.availableWidthMeters || 5.0;
        const mountHeightM = estimates.groundToMountMeters || 2.3;

        // Product dimensions in meters
        const productWidthM = (productConfig.width || 5000) / 1000;
        const productDepthM = (productConfig.projection || 3000) / 1000;
        const postsHeightM = (productConfig.postsHeight || 2500) / 1000;

        // ── 2. Calculate camera angle from wall perspective ──
        // Wall center in normalized coords (-1 to 1)
        const wallCenterX = ((wall.topLeft.x + wall.topRight.x + wall.bottomLeft.x + wall.bottomRight.x) / 4) / imageWidth * 2 - 1;

        // Top/bottom width ratio reveals perspective foreshortening
        const topWidth = wall.topRight.x - wall.topLeft.x;
        const bottomWidth = wall.bottomRight.x - wall.bottomLeft.x;
        const perspectiveRatio = topWidth / Math.max(bottomWidth, 1);

        // Camera Y rotation based on perspective analysis
        let cameraYawDeg = 0;
        switch (perspective.cameraAngle) {
            case 'front': cameraYawDeg = 0; break;
            case 'slight_left': cameraYawDeg = -15; break;
            case 'slight_right': cameraYawDeg = 15; break;
            case 'left': cameraYawDeg = -30; break;
            case 'right': cameraYawDeg = 30; break;
        }

        // Fine-tune with vanishing point offset
        const vpOffsetNorm = (perspective.vanishingPointX / imageWidth - 0.5) * 2;
        cameraYawDeg += vpOffsetNorm * 10;

        // ── 3. Calculate camera pitch from wall vertical position ──
        const wallVerticalCenter = (wall.topLeft.y + wall.bottomLeft.y) / 2 / imageHeight;
        // If wall center is above image center, camera is looking up (and vice versa)
        const cameraPitchDeg = (wallVerticalCenter - 0.5) * -20;

        // ── 4. Camera distance from wall ──
        // Use wall pixel height vs image height to estimate distance
        const wallPixelHeight = ((wall.bottomLeft.y + wall.bottomRight.y) - (wall.topLeft.y + wall.topRight.y)) / 2;
        const wallScreenFraction = wallPixelHeight / imageHeight;
        const fov = perspective.estimatedFovDeg || 55;
        const fovRad = THREE.MathUtils.degToRad(fov);

        // Distance = (realHeight / 2) / tan(fov/2 * screenFraction)
        // Simplified: if wall fills 60% of screen at 55° FOV and is 2.8m tall
        const cameraDistance = (wallHeightM / 2) / Math.tan(fovRad / 2 * wallScreenFraction);
        const clampedDistance = Math.max(4, Math.min(cameraDistance, 15));

        // ── 5. Camera position in 3D ──
        const yawRad = THREE.MathUtils.degToRad(cameraYawDeg);
        const pitchRad = THREE.MathUtils.degToRad(cameraPitchDeg);

        // Camera height (approx eye level ~1.6m)
        const cameraHeightM = 1.6;

        const cameraPosition = new THREE.Vector3(
            Math.sin(yawRad) * clampedDistance,
            cameraHeightM,
            Math.cos(yawRad) * clampedDistance + productDepthM  // offset by product depth
        );

        // Camera looks at the wall center
        const lookAt = new THREE.Vector3(
            wallCenterX * wallWidthM * 0.3,
            mountHeightM * 0.6,
            0
        );

        // ── 6. Model position ──
        // Model sits with back beam against the wall (Z=0), centered on the mounting line
        const mountCenterX = ((mountingLine.leftX + mountingLine.rightX) / 2 / imageWidth - 0.5) * wallWidthM;
        const groundY = 0; // Ground plane

        const modelPosition = new THREE.Vector3(
            mountCenterX,
            groundY,
            productDepthM / 2  // Center of product depth, projecting from wall
        );

        // Model rotation to match wall angle
        // If wall is not perfectly parallel to camera, rotate model slightly
        const wallAngle = Math.atan2(
            wall.topRight.y - wall.topLeft.y,
            wall.topRight.x - wall.topLeft.x
        );
        const modelRotationY = perspectiveRatio > 1.05 ? yawRad * 0.3 : 0;

        // ── 7. Sun direction matching photo ──
        const sunDirRad = THREE.MathUtils.degToRad(lighting.sunDirectionDeg);
        const sunElevRad = THREE.MathUtils.degToRad(lighting.sunElevationDeg || 45);
        const sunDirection = new THREE.Vector3(
            Math.sin(sunDirRad) * Math.cos(sunElevRad),
            Math.sin(sunElevRad),
            Math.cos(sunDirRad) * Math.cos(sunElevRad)
        ).normalize().multiplyScalar(20);

        const sunIntensity = lighting.intensity === 'bright' ? 3.0
            : lighting.intensity === 'medium' ? 2.0
                : 1.2;

        return {
            position: cameraPosition,
            lookAt,
            fov,
            modelPosition,
            modelRotationY: modelRotationY + (wallAngle * 0.1),
            sunDirection,
            sunIntensity,
        };
    }, [analysis, imageWidth, imageHeight, productConfig.width, productConfig.projection, productConfig.postsHeight]);
}
