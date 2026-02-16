import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { ProductConfig } from '../../types';
import { getGutterProfile, getPostProfile, getRafterProfile, getWallProfileShape } from './profiles';
import { getStructureSpecs } from './structureUtils';
import {
    createAluminumMaterial,
    createGlassWallMaterial,
    createGlassRoofMaterial,
    createPolycarbonateRoofMaterial,
    createWPCFloorMaterial,
    createWPCBaseMaterial,
    createGresTileMaterial,
    createGresBaseMaterial,
    createDarkMetalMaterial,
    createHeaterGlowMaterial,
    createHeaterBodyMaterial,
    createLEDEmitterMaterial,
    createLEDFixtureMaterial,
    createFabricMaterial,
    createScreenMeshMaterial,
    createFrameMaterial,
    createGuideMaterial,
} from './materials';

interface PatioCoverModelProps {
    config: ProductConfig;
    structureConfig?: { postCount?: number; fieldCount?: number };
}

export const PatioCoverModel: React.FC<PatioCoverModelProps> = ({ config, structureConfig }) => {
    // 1. Unpack Configuration with Safety Checks
    const widthM = Math.max(1.0, (config.width || 3000) / 1000);
    const depthM = Math.max(1.0, (config.projection || 2000) / 1000);

    // Heights
    // Default Front: 2.5m. Default Rear: 3.0m.
    const frontHeightBase = (config.frontHeight || config.postsHeight || 2500) / 1000;
    const rearHeightBase = (config.rearHeight || 3000) / 1000;

    // Calculate Angle based on height difference
    // Rise = Rear - Front
    const riseTotal = rearHeightBase - frontHeightBase;
    // Angle = atan(rise / depth)
    // Clamp angle to valid range (e.g. 2 deg to 30 deg)
    const rawAngle = Math.atan(riseTotal / depthM);
    const pitchAngle = Math.max(2 * Math.PI / 180, Math.min(rawAngle, 30 * Math.PI / 180));

    // Effective heights based on clamped angle (if user inputs weird values)
    // We stick to Front Height as anchor.
    // const effectiveRise = depthM * Math.tan(pitchAngle); // Unused
    // const effectiveRearHeight = frontHeightBase + effectiveRise;

    const heightM = frontHeightBase; // Base height for posts/gutter

    // 2. Geometry Constants (Meters)
    // 2. Geometry Constants (Meters)
    const isHeavy = config.modelId.includes('xl') || config.modelId === 'skystyle' || config.modelId === 'trendstyle_plus' || config.modelId === 'topstyle';
    const isSkystyle = config.modelId === 'skystyle';

    // Dynamic Specs from DB or Fallback
    const BASE_POST_SIZE = 0.11;
    const targetPostSize = config.productSpecs?.postSize || (isHeavy ? 0.15 : 0.11);
    const postScale = targetPostSize / BASE_POST_SIZE;
    const POST_SIZE = targetPostSize;

    // Skystyle has massive beams/rafters visually, but let's stick to heavy profile for now.
    // Skystyle structure Pitch is 0. Roof Glass Pitch is calculated.
    // Skystyle structure Pitch is 0. Roof Glass Pitch is calculated but capped for visual "flatness".
    // 2 degrees is enough for drainage but fits in profile.
    const structurePitch = isSkystyle ? 0 : pitchAngle;

    // For Skystyle, use small pitch (~2.5 deg) or calculated, whichever is smaller, to fit inside profile.
    // Actually, calculate: if we have 20cm profile, and 4m depth. tan(alpha) = 0.2/4 = 0.05 -> 2.8 deg.
    // So 2 degrees is safe.
    const skystyleFixedPitch = 2 * Math.PI / 180;

    const glassPitch = isSkystyle ? skystyleFixedPitch : pitchAngle;

    const BEAM_HEIGHT = config.productSpecs?.beamHeight || (isHeavy ? 0.20 : 0.15); // Nominal height for positioning
    const GUTTER_DEPTH = 0.15 * postScale;

    // Use Max Depth for alignment (Beam vs Post) in Freestanding mode
    // Standard: Align Centers to the Beam Center (dominant visual).
    const alignmentZ = -depthM / 2 + GUTTER_DEPTH / 2;
    // (Cleaned up unused calculations)

    // ... (Use Memos for shapes) ...
    const gutterProfileShape = useMemo(() => getGutterProfile(config.modelId, GUTTER_DEPTH, BEAM_HEIGHT), [config.modelId, GUTTER_DEPTH, BEAM_HEIGHT]);
    const postShape = useMemo(() => getPostProfile(), []);
    const rafterShape = useMemo(() => getRafterProfile(), []);
    const wallProfileShape = useMemo(() => getWallProfileShape(), []);

    // Structural Specs
    const { postCount, rafterCount } = useMemo(() => getStructureSpecs(config), [config]);
    const safePostCount = config.customPostCount || structureConfig?.postCount || postCount || 2;
    const safeRafterCount = config.customRafterCount || rafterCount || Math.ceil(widthM / 0.9) + 1;
    const dbRafterCount = structureConfig?.fieldCount ? structureConfig.fieldCount + 1 : undefined;
    const finalRafterCount = config.customRafterCount || dbRafterCount || safeRafterCount;
    const fieldsCount = finalRafterCount - 1;

    // ... Extras Check ...
    const hasLighting = config.addons.some(a => a.type === 'lighting');
    const slidingWallAddons = config.addons.filter(a => a.type === 'slidingWall');
    const hasFrontSlidingGlass = slidingWallAddons.some(a => a.location === 'front' || !a.location);
    const hasLeftSlidingGlass = slidingWallAddons.some(a => a.location === 'left');
    const hasRightSlidingGlass = slidingWallAddons.some(a => a.location === 'right');

    // ... Materials (PBR) ...
    const glassWallMaterial = useMemo(() => createGlassWallMaterial(), []);

    const structureMaterial = useMemo(() => createAluminumMaterial(config.color || 'RAL 7016'), [config.color]);

    const activeRoofMat = useMemo(() => {
        if (config.roofType === 'glass') {
            return createGlassRoofMaterial();
        }
        return createPolycarbonateRoofMaterial(
            config.polycarbonateType === 'ir-gold' ? 'ir-gold' : 'opal'
        );
    }, [config.roofType, config.polycarbonateType]);

    const extrudeSettings = (depth: number) => ({
        steps: 1,
        depth: depth,
        bevelEnabled: true,
        bevelThickness: 0.002,
        bevelSize: 0.002,
        bevelSegments: 2
    });

    // RAFTERS (Ground Truth for X positions)
    const rafterEls = useMemo(() => {
        const els: { position: [number, number, number]; rotation: [number, number, number]; length: number }[] = [];

        // Use the Calculated Pitch Angle!
        // const pitchAngle = 8 * Math.PI / 180; // Old Fixed
        // pitchAngle is now in scope

        // Rafters start at Wall (-depthM/2) and end at Gutter Back (center approx).
        // Let's assume rafters cover the full `depthM` from Wall to Gutter (projected).

        // Usually, Rafter Length = Depth / Cos(Angle).
        const length = depthM / Math.cos(pitchAngle);

        // Center Z relative to group (0, which is centered on x/z plane)
        // Group is at depthM/2 offset? No, Group is usually at [0,0,0].
        // If we want the Wall at -depthM/2.
        // And Front at +depthM/2.
        // Center is 0.

        // Rafter Pivot: 
        // If we rotate around center, ends might detach.
        // It's easier to position them using center point logic.
        // Midpoint Z = 0.
        // Midpoint Y = heightM + (depthM/2) * tan(angle). 
        // (If heightM is Front Height).
        // Front Height = heightM. Rear = heightM + rise.
        // Mid Y = heightM + rise/2 - BEAM_HEIGHT/2.

        const midY = heightM + (depthM / 2) * Math.tan(structurePitch) - BEAM_HEIGHT / 2;

        for (let i = 0; i < safeRafterCount; i++) {
            const x = -widthM / 2 + (widthM / (safeRafterCount - 1)) * i;

            els.push({
                position: [x, midY, 0], // Center at 0 Z
                rotation: [structurePitch, 0, 0],
                length: length
            });
        }
        return els;
    }, [widthM, heightM, depthM, safeRafterCount, BEAM_HEIGHT, structurePitch]);

    // POSTS (Aligned to Rafters)
    const postEls = useMemo(() => {
        const els: { position: [number, number, number]; height: number; type: 'front' | 'rear' }[] = [];
        if (safePostCount < 2) return [];

        // Determine which rafters should have posts
        const indices = [0]; // Always First

        if (safePostCount > 2) {
            const totalSpans = safePostCount - 1;
            const rafterSpan = safeRafterCount - 1;

            for (let i = 1; i < safePostCount - 1; i++) {
                const fraction = i / totalSpans;
                const rafterIdx = Math.round(fraction * rafterSpan);
                indices.push(rafterIdx);
            }
        }
        indices.push(safeRafterCount - 1); // Always Last

        const uniqueIndices = Array.from(new Set(indices)).sort((a, b) => a - b);

        uniqueIndices.forEach((rIdx, i) => {
            const rafter = rafterEls[rIdx];
            if (!rafter || !rafter.position) return;

            let x = rafter.position[0];

            // Default Alignment
            if (rIdx === 0) x += POST_SIZE / 2;
            if (rIdx === safeRafterCount - 1) x -= POST_SIZE / 2;

            // Apply Post Insets (Legacy)
            if (rIdx === 0) x += (config.postOverlayLeft || 0) / 1000;
            if (rIdx === safeRafterCount - 1) x -= (config.postOverlayRight || 0) / 1000;

            // Apply Manual Offsets
            const manualOffset = (config.postOffsets?.[i] || 0) / 1000;
            x += manualOffset;

            const pHeight = heightM - BEAM_HEIGHT;

            // Front Post
            els.push({ position: [x, 0, depthM / 2 - POST_SIZE / 2], height: pHeight, type: 'front' });

            // Rear Post (Freestanding)
            if (config.installationType === 'freestanding') {
                const rise = depthM * Math.tan(structurePitch);
                // "Cofnij do krawędzi belki tylnej" -> Align Back Face of Post to Back Face of Beam (-depthM/2).
                // Post Center = Back Face + Size/2 = -depthM/2 + POST_SIZE/2.
                const rearPostFlushZ = -depthM / 2 + POST_SIZE / 2;

                els.push({ position: [x, 0, rearPostFlushZ], height: heightM + rise - BEAM_HEIGHT, type: 'rear' });
            }
        });

        return els;
    }, [rafterEls, safePostCount, safeRafterCount, heightM, depthM, config.installationType, BEAM_HEIGHT, POST_SIZE, config.postOverlayLeft, config.postOverlayRight, config.postOffsets, structurePitch]);

    return (
        <group>
            {/* POSTS */}
            {postEls.map((p, i) => (
                <mesh
                    key={`post-${i}`}
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[p.position[0], 0, p.position[2] + POST_SIZE / 2]}
                    castShadow receiveShadow
                    scale={[postScale, postScale, 1]}
                >
                    <extrudeGeometry args={[postShape, extrudeSettings(p.height)]} />
                    <meshStandardMaterial color={structureMaterial.color} roughness={0.25} metalness={0.85} envMapIntensity={1.2} />
                </mesh>
            ))}

            {/* BASE PLATES (Feet) */}
            {postEls.map((p, i) => (
                <mesh
                    key={`baseplate-${i}`}
                    position={[p.position[0], 0.005, p.position[2] + POST_SIZE / 2]}
                    receiveShadow
                >
                    <boxGeometry args={[POST_SIZE + 0.04, 0.01, POST_SIZE + 0.04]} />
                    <meshStandardMaterial color={structureMaterial.color} roughness={0.7} metalness={0.1} />
                </mesh>
            ))}


            {/* FRONT GUTTER */}
            <group position={[-widthM / 2, heightM - BEAM_HEIGHT, depthM / 2 + GUTTER_DEPTH / 2]} rotation={[0, Math.PI / 2, 0]}>
                <mesh castShadow receiveShadow material={structureMaterial}>
                    <extrudeGeometry args={[gutterProfileShape, extrudeSettings(widthM)]} />
                </mesh>
                {/* Gutter Caps */}
                <mesh position={[0, 0, -0.005]} material={structureMaterial}>
                    <extrudeGeometry args={[gutterProfileShape, { depth: 0.005, bevelEnabled: false }]} />
                </mesh>
                <mesh position={[0, 0, widthM]} material={structureMaterial}>
                    <extrudeGeometry args={[gutterProfileShape, { depth: 0.005, bevelEnabled: false }]} />
                </mesh>
            </group>


            {/* REAR BEAM (Freestanding) OR WALL PROFILE (Wall Mounted) */}
            {config.installationType === 'freestanding' ? (
                // Rear Beam - aligned with rear posts
                <mesh
                    rotation={[0, Math.PI / 2, 0]}
                    position={[
                        -widthM / 2,
                        heightM + (depthM * Math.tan(structurePitch)) - BEAM_HEIGHT,
                        alignmentZ + GUTTER_DEPTH / 2 // Position is Start Corner? No, shape is 0->Width. 
                        // If Rot Y 90 (X->-Z). Shape 0->Width maps to Z->Z-Width.
                        // So Position should be Back Face + Width? No, Back Face is MinZ.
                        // We want MinZ = -depthM/2.
                        // So MaxZ (Position) = -depthM/2 + GUTTER_DEPTH.
                        // alignmentZ is Center = -depthM/2 + GUTTER_DEPTH/2.
                        // So Position = alignmentZ + GUTTER_DEPTH/2.
                    ]}
                    castShadow receiveShadow
                    material={structureMaterial}
                >
                    <extrudeGeometry args={[gutterProfileShape, extrudeSettings(widthM)]} />
                </mesh>
            ) : (
                // Wall Profile
                <mesh
                    rotation={[0, Math.PI / 2, 0]}
                    position={[-widthM / 2, heightM + (depthM * Math.tan(structurePitch)) - BEAM_HEIGHT, -depthM / 2]}
                    castShadow receiveShadow
                    material={structureMaterial}
                    scale={[postScale, postScale, 1]}
                >
                    <extrudeGeometry args={[wallProfileShape, extrudeSettings(widthM)]} />
                </mesh>
            )}

            {/* RAFTERS */}
            {rafterEls.map((r, i) => (
                <group key={`rafter-${i}`} position={new THREE.Vector3(...r.position)} rotation={new THREE.Euler(...r.rotation)}>
                    <mesh
                        rotation={[0, 0, 0]}
                        position={[0, 0, -r.length / 2]}
                        castShadow receiveShadow
                        material={structureMaterial}
                        scale={[1, 1, 1]}
                    >
                        {/* Make rafters slightly more detailed? standard extrude for now */}
                        <extrudeGeometry args={[rafterShape, extrudeSettings(r.length)]} />
                    </mesh>
                </group>
            ))}

            {/* ROOF PANELS */}
            {/* ROOF PANELS */}
            {Array.from({ length: fieldsCount }).map((_, i) => {
                const rafterSpacing = widthM / fieldsCount;
                const x = -widthM / 2 + rafterSpacing * i + rafterSpacing / 2;

                // For Skystyle, panels are tilted (glassPitch), structure is flat (structurePitch=0).

                // If structure is flat, but glass is tilted, we need to position glass carefully.
                // Pivot at front? 
                // Front Height is Base.
                // Center Z is 0.
                // If we rotate at center, ends might clip. 
                // Usually easier to pivot at Z=0 if we calculated midY carefully.

                // If Skystyle: Glass tilt is calculated relative to flat structure.
                // Actually, let's just use glassPitch for rotation.
                // And ensure midY lifts it above rafters.

                const OVERHANG = 0.05;
                const effectiveDepthZ = depthM;
                const rafterLength = effectiveDepthZ / Math.cos(glassPitch); // Use glass pitch for length
                const panelLength = rafterLength + OVERHANG;

                const centerZ = 0 + (OVERHANG / 2 * Math.cos(glassPitch));

                // Pivot logic:
                // glassPitch used for rotation.
                // We want HIGHEST point of glass (Rear) to be <= heightM (Structure Top).
                // Glass Rear Z approx -depthM/2.
                // Glass Pivot Z = centerZ (approx 0).
                // Distance to Rear = depthM/2.
                // Rear Y = PivotY + (depthM/2) * sin(glassPitch).
                // Solve for PivotY: PivotY = heightM - (depthM/2 * sin(glassPitch)).
                // We add small safety margin (-0.01) to be slightly under.

                // Fix for Z-Fighting: Glass must sit ON TOP of Rafters.
                // Rafter Height ~ 0.10m. Center is at [x, midY_rafter, z].
                // Rafter Top Face is at midY_rafter + 0.05.
                // We want Glass Bottom to be at midY_rafter + 0.05.
                // Glass Center = Glass Bottom + Thickness/2 (0.008). 
                // So Glass Center = midY_rafter + 0.058.

                // Rafter MidY reference:
                // heightM + (depthM / 2) * Math.tan(structurePitch) - BEAM_HEIGHT / 2;

                const rafterMidY = heightM + (depthM / 2) * Math.tan(structurePitch) - BEAM_HEIGHT / 2;
                let midY = rafterMidY + 0.034; // +3.4cm (Deeply seated, well inside profile)

                if (isSkystyle) {
                    // Override midY to sink it
                    midY = heightM - (effectiveDepthZ / 2 * Math.sin(glassPitch)) - 0.06; // 6cm below rim (Guaranteed below top edge)
                }

                return (
                    <mesh
                        key={`panel-${i}`}
                        position={[x, midY, centerZ]}
                        rotation={[glassPitch, 0, 0]}
                        material={activeRoofMat}
                        castShadow={config.roofType !== 'glass'} receiveShadow
                    >
                        <boxGeometry args={[rafterSpacing - 0.005, 0.016, panelLength]} />
                    </mesh>
                );
            })}

            {/* SIDE WEDGES */}
            {config.sideWedges && (
                <>
                    <Wedge
                        side="left"
                        depth={depthM}
                        pitchAngle={pitchAngle}
                        position={[-widthM / 2, heightM - 0.15, 0]}
                        glassMaterial={activeRoofMat}
                        frameMaterial={structureMaterial}
                    />
                    <Wedge
                        side="right"
                        depth={depthM}
                        pitchAngle={pitchAngle}
                        position={[widthM / 2, heightM - 0.15, 0]}
                        glassMaterial={activeRoofMat}
                        frameMaterial={structureMaterial}
                    />
                </>
            )}

            {/* LED LIGHTING */}
            {hasLighting && rafterEls.map((r, i) => {
                // Number of spots per rafter (Configurable, default 3)
                const spotsCount = config.ledCount || 3;
                return (
                    <group key={`led-group-${i}`} position={new THREE.Vector3(...r.position)} rotation={new THREE.Euler(...r.rotation)}>
                        {Array.from({ length: spotsCount }).map((_, j) => {
                            // Distribution along Z axis from 0 to -length (local coords)
                            const zPos = -(r.length / (spotsCount + 1)) * (j + 1);

                            return (
                                <group key={`spot-${j}`} position={[0, -0.06, zPos]}>
                                    {/* Fixture */}
                                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                                        <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
                                        <meshStandardMaterial color="#222" roughness={0.3} metalness={0.9} />
                                    </mesh>
                                    {/* Light Emitter */}
                                    <pointLight
                                        intensity={2}
                                        distance={3}
                                        decay={2}
                                        color="#fffaee"
                                    // castShadow // Disabled: Too many shadow casting lights crash the renderer
                                    />
                                    <mesh position={[0, -0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
                                        <circleGeometry args={[0.02, 16]} />
                                        <meshBasicMaterial color="#fffaee" toneMapped={false} />
                                    </mesh>
                                </group>
                            );
                        })}
                    </group>
                );
            })}

            {/* SLIDING GLASS WALLS (FRONT) */}
            {hasFrontSlidingGlass && (
                <group>
                    {/* Render between front posts */}
                    {/* Retrieve only FRONT posts */}
                    {postEls.filter(p => p.type === 'front').slice(0, -1).map((_, i) => {
                        const allFrontPosts = postEls.filter(p => p.type === 'front');
                        const p1 = allFrontPosts[i];
                        const p2 = allFrontPosts[i + 1];

                        if (!p1 || !p2) return null;

                        const x1 = p1.position[0];
                        const x2 = p2.position[0];
                        const midX = (x1 + x2) / 2;
                        const width = Math.abs(x2 - x1) - POST_SIZE;
                        const height = p1.height;
                        const z = p1.position[2] + POST_SIZE / 2 - 0.05;

                        // Check if this is Panorama (frameless)
                        const isPanorama = slidingWallAddons.some(a => a.name?.includes('Panorama'));

                        return (
                            <GlassWallPanel
                                key={`front-wall-${i}`}
                                position={[midX, height / 2, z]}
                                width={width}
                                height={height}
                                material={glassWallMaterial}
                                isFrameless={isPanorama}
                            />
                        );
                    })}
                </group>
            )}

            {/* SLIDING GLASS WALLS (LEFT) */}
            {hasLeftSlidingGlass && (
                <GlassWallSide
                    side="left"
                    position={[-widthM / 2, (heightM - 0.15) / 2, 0]} // Centered Y for the box?
                    width={depthM}
                    height={heightM - 0.15}
                    material={glassWallMaterial}
                />
            )}

            {/* SLIDING GLASS WALLS (RIGHT) */}
            {hasRightSlidingGlass && (
                <GlassWallSide
                    side="right"
                    position={[widthM / 2, (heightM - 0.15) / 2, 0]}
                    width={depthM}
                    height={heightM - 0.15}
                    material={glassWallMaterial}
                />
            )}

            {/* AWNING (Markiza) */}
            {config.addons.some(a => a.type === 'awning') && (
                <Awning
                    width={widthM}
                    depth={depthM}
                    pitchAngle={8 * Math.PI / 180}
                    position={[0, heightM - 0.2, 0]}
                />
            )}

            {/* ZIP SCREENS */}
            {config.addons.some(a => a.type === 'zipScreen' && (a.location === 'front' || !a.location)) && (
                <ZipScreen
                    width={widthM - 0.22} // Fit between posts approx
                    height={heightM - 0.15}
                    position={[0, heightM - 0.15, depthM / 2]}
                    rotation={[0, 0, 0]}
                />
            )}
            {config.addons.some(a => a.type === 'zipScreen' && a.location === 'left') && (
                <ZipScreen
                    width={depthM}
                    height={heightM - 0.15}
                    position={[-widthM / 2, heightM - 0.15, 0]}
                    rotation={[0, Math.PI / 2, 0]}
                />
            )}
            {config.addons.some(a => a.type === 'zipScreen' && a.location === 'right') && (
                <ZipScreen
                    width={depthM}
                    height={heightM - 0.15}
                    position={[widthM / 2, heightM - 0.15, 0]}
                    rotation={[0, Math.PI / 2, 0]}
                />
            )}

            {/* HEATER (Promiennik) */}
            {config.addons.some(a => a.type === 'heater') && (
                <group position={[0, heightM - 0.4, -depthM / 2 + 0.3]}>
                    <mesh position={[0, 0.1, 0]}>
                        <boxGeometry args={[0.2, 0.1, 0.05]} />
                        <meshStandardMaterial color="#1a1a1a" roughness={0.35} metalness={0.9} />
                    </mesh>
                    <mesh rotation={[0.4, 0, 0]}>
                        <capsuleGeometry args={[0.06, 0.8, 4, 16]} />
                        <meshStandardMaterial color="#222" roughness={0.2} metalness={0.85} envMapIntensity={1.0} />
                    </mesh>
                    <mesh rotation={[0.4, 0, 0]} position={[0, -0.01, 0.04]}>
                        <capsuleGeometry args={[0.02, 0.6, 4, 16]} />
                        <meshStandardMaterial color="#ff6600" emissive="#ff4400" emissiveIntensity={2.5} roughness={0.3} metalness={0.7} toneMapped={false} />
                    </mesh>
                </group>
            )}

            {/* WPC FLOORING (Planks) */}
            {(config.floorType === 'wpc' || (!config.floorType && config.addons.some(a => a.type === 'wpc-floor'))) && (
                <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} receiveShadow>
                    {/* Base Layer */}
                    <mesh position={[0, 0, -0.01]}>
                        <planeGeometry args={[widthM, depthM]} />
                        <meshStandardMaterial color="#3e2723" roughness={1} metalness={0} />
                    </mesh>
                    {/* Planks: 14cm width, 5mm gap */}
                    {Array.from({ length: Math.ceil(widthM / 0.145) }).map((_, i) => {
                        const plankW = 0.14;
                        const gap = 0.005;
                        const stride = plankW + gap;
                        const xPos = -widthM / 2 + stride * i + plankW / 2;
                        if (xPos > widthM / 2) return null; // Clip excess

                        return (
                            <mesh key={`plank-${i}`} position={[xPos, 0, 0]} receiveShadow>
                                <boxGeometry args={[plankW, depthM, 0.02]} /> {/* Depth is Y here due to rotation */}
                                <meshStandardMaterial color="#6D4C3D" roughness={0.85} metalness={0} envMapIntensity={0.3} />
                            </mesh>
                        )
                    })}
                </group>
            )}

            {/* GRES FLOORING (Tiles 60x60) */}
            {(config.floorType === 'gres' || (!config.floorType && config.addons.some(a => a.type === 'gres-floor'))) && (
                <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} receiveShadow>
                    {/* Base Layer */}
                    <mesh position={[0, 0, -0.01]}>
                        <planeGeometry args={[widthM, depthM]} />
                        <meshStandardMaterial color="#9E9E9E" roughness={1} metalness={0} />
                    </mesh>
                    {/* Tiles: 60x60cm, 4mm gap */}
                    {Array.from({ length: Math.ceil(widthM / 0.604) }).map((_, i) => {
                        return Array.from({ length: Math.ceil(depthM / 0.604) }).map((__, j) => {
                            const tileS = 0.60;
                            const gap = 0.004;
                            const stride = tileS + gap;

                            const xPos = -widthM / 2 + stride * i + tileS / 2;
                            const yPos = -depthM / 2 + stride * j + tileS / 2; // Z in local space (which is Depth of patio)

                            if (xPos > widthM / 2 + tileS || yPos > depthM / 2 + tileS) return null;

                            return (
                                <mesh key={`tile-${i}-${j}`} position={[xPos, yPos, 0]} receiveShadow>
                                    <boxGeometry args={[tileS, tileS, 0.02]} />
                                    <meshStandardMaterial color="#C8C8C8" roughness={0.4} metalness={0.05} envMapIntensity={0.6} />
                                </mesh>
                            )
                        })
                    })}
                </group>
            )}

        </group>
    );
};

// ... Existing Wedge, GlassWallPanel, GlassWallSide ...
// But I need to preserve them. The Instruction tool replaces content. 
// I will just add the new components after GlassWallSide and keep the replacements inside the main component consistent.

// Helper Component for Wedge
// Helper Component for Wedge
interface WedgeProps {
    side: 'left' | 'right';
    depth: number;
    pitchAngle: number;
    position: [number, number, number];
    glassMaterial: THREE.Material;
    frameMaterial: THREE.Material;
}

const Wedge: React.FC<WedgeProps> = ({ side: _side, depth, pitchAngle, position, glassMaterial, frameMaterial }) => {
    const rise = depth * Math.tan(pitchAngle);
    const hypotenuse = depth / Math.cos(pitchAngle);
    const frameSize = 0.05;

    return (
        <group position={position} rotation={[0, 0, 0]} name={`wedge-${_side}`}>
            {/* 
                Rotation Fix: The slope must always go Up towards the Back (-Z).
                Both Left and Right wedges share this slope direction. 
            */}
            <group>
                {/* 1. Bottom Profile (Horizontal) */}
                <mesh
                    position={[0, frameSize / 2, 0]}
                    castShadow receiveShadow
                    material={frameMaterial}
                >
                    <boxGeometry args={[frameSize, frameSize, depth]} />
                </mesh>

                {/* 2. Back Vertical Profile (Wall side) - at Z = -depth/2 */}
                <mesh
                    position={[0, rise / 2, -depth / 2 + frameSize / 2]}
                    castShadow receiveShadow
                    material={frameMaterial}
                >
                    <boxGeometry args={[frameSize, rise, frameSize]} />
                </mesh>

                {/* 3. Top Profile (Slanted) */}
                <mesh
                    position={[0, rise / 2 + frameSize / 2, 0]}
                    rotation={[pitchAngle, 0, 0]}
                    castShadow receiveShadow
                    material={frameMaterial}
                >
                    <boxGeometry args={[frameSize, frameSize, hypotenuse]} />
                </mesh>

                {/* 4. Glass Panel */}
                <mesh position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <shapeGeometry args={[
                        new THREE.Shape()
                            .moveTo(-depth / 2, frameSize)         // Front Bottom (Low)
                            .lineTo(depth / 2, frameSize)          // Back Bottom (Low)
                            .lineTo(depth / 2, rise - frameSize)   // Back Top (High)
                            .lineTo(-depth / 2, frameSize)         // Close at Front Bottom
                    ]} />
                    <meshPhysicalMaterial
                        color={(glassMaterial as THREE.MeshPhysicalMaterial).color}
                        transmission={0.9}
                        opacity={0.3}
                        transparent={true}
                        roughness={0}
                        metalness={0}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            </group>
        </group>
    );
};

// ... GlassWallPanel ...

// ... GlassWallSide ...
interface GlassWallSideProps {
    side: 'left' | 'right';
    position: [number, number, number];
    width: number;
    height: number;
    material: THREE.Material;
}

const GlassWallSide: React.FC<GlassWallSideProps> = ({ side: _side, position, width, height, material }) => {
    // Rotated panel for side
    return (
        <group position={position} rotation={[0, Math.PI / 2, 0]} name={`glass-side-${_side}`}>
            <GlassWallPanel position={[0, 0, 0]} width={width} height={height} material={material} />
        </group>
    );
};

// Helper Components for Glass Wall
interface GlassWallPanelProps {
    position: [number, number, number];
    width: number;
    height: number;
    material: THREE.Material;
    isFrameless?: boolean;
}

const GlassWallPanel: React.FC<GlassWallPanelProps> = ({ position, width, height, material, isFrameless }) => {
    // Frame Color
    const frameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.4, metalness: 0.7, envMapIntensity: 0.6 }), []);
    const guideMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#999', roughness: 0.4, metalness: 0.5 }), []);

    return (
        <group position={position}>
            {/* Glass Pane */}
            <mesh material={material}>
                <boxGeometry args={[width, height, 0.02]} />
            </mesh>

            {/* Rails / Frames */}
            <mesh position={[0, height / 2 - 0.02, 0]} material={frameMat}>
                <boxGeometry args={[width, 0.04, 0.04]} />
            </mesh>
            <mesh position={[0, -height / 2 + 0.02, 0]} material={frameMat}>
                <boxGeometry args={[width, 0.04, 0.04]} />
            </mesh>

            {/* Vertical Lines simulating sliding panes overlap (3-track?) */}
            {/* Dynamic Vertical Lines for Sliding Panes - HIDE FOR FRAMELESS PANORAMA */}
            {!isFrameless && Array.from({ length: Math.max(2, Math.ceil(width / 1.1)) - 1 }).map((_, i) => {
                const numPanels = Math.max(2, Math.ceil(width / 1.1));
                // i goes from 0 to numPanels - 2.
                // Positions: -width/2 + (width/numPanels) * (i+1)
                const xPos = -width / 2 + (width / numPanels) * (i + 1);
                // Alternate offset for realism (front/back track)
                const zOffset = i % 2 === 0 ? 0.015 : -0.015;

                return (
                    <mesh key={`v-bar-${i}`} position={[xPos, 0, zOffset]} material={guideMat}>
                        <boxGeometry args={[0.02, height, 0.02]} />
                    </mesh>
                );
            })}
        </group>
    );
};


// ---------------- NEW COMPONENTS ----------------

const Awning: React.FC<{ width: number; depth: number; position: [number, number, number]; pitchAngle: number }> = ({ width, depth, position, pitchAngle }) => {
    // Fabric Material
    const fabricMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#e5e7eb',
        roughness: 0.95,
        metalness: 0,
        side: THREE.DoubleSide,
    }), []);

    const length = depth / Math.cos(pitchAngle);

    return (
        <group position={position} rotation={[pitchAngle, 0, 0]}>
            <mesh material={fabricMat} castShadow receiveShadow>
                {/* Wavy shape or just simple plane? Simple plane with segments */}
                <boxGeometry args={[width - 0.2, 0.02, length - 0.2]} />
            </mesh>
            {/* Box/Cassette at top (back) */}
            <mesh position={[0, 0, -length / 2]} rotation={[-pitchAngle, 0, 0]}>
                <boxGeometry args={[width, 0.15, 0.15]} />
                <meshStandardMaterial color="#444" roughness={0.4} metalness={0.7} />
            </mesh>
        </group>
    );
};

const ZipScreen: React.FC<{ width: number; height: number; position: [number, number, number]; rotation: [number, number, number] }> = ({ width, height, position, rotation }) => {
    // Screen Material (Mesh-like)
    const screenMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#2a2a2a',
        transparent: true,
        opacity: 0.75,
        roughness: 0.9,
        metalness: 0,
        side: THREE.DoubleSide,
    }), []);

    const boxMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.35, metalness: 0.9 }), []);

    return (
        <group position={position} rotation={rotation}>
            {/* Cassette Box */}
            <mesh position={[0, 0, 0]} material={boxMat}>
                <boxGeometry args={[width, 0.1, 0.1]} />
            </mesh>
            {/* Guide Rails */}
            <mesh position={[-width / 2 + 0.02, -height / 2, 0]} material={boxMat}>
                <cylinderGeometry args={[0.02, 0.02, height, 8]} />
            </mesh>
            <mesh position={[width / 2 - 0.02, -height / 2, 0]} material={boxMat}>
                <cylinderGeometry args={[0.02, 0.02, height, 8]} />
            </mesh>
            {/* Fabric (Down) */}
            <mesh position={[0, -height / 2, 0]} material={screenMat}>
                <planeGeometry args={[width - 0.05, height]} />
            </mesh>
        </group>
    );
};
