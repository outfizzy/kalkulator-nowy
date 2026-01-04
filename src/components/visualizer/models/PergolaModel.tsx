import React, { useMemo } from 'react';
import type { ProductConfig } from '../../../types';
import * as THREE from 'three';

interface PergolaModelProps {
    config: ProductConfig;
}

export const PergolaModel: React.FC<PergolaModelProps> = ({ config }) => {
    // 1. Unpack Dimensions safely (convert mm to m)
    const width = (config.width || 4000) / 1000;
    const depth = (config.projection || 3000) / 1000;
    const height = (config.postsHeight || config.frontHeight || 2500) / 1000;

    // 2. Constants (Meters)
    const postSize = 0.15; // 15cm
    const beamHeight = 0.25; // 25cm
    const beamWidth = 0.15; // 15cm
    const lamellaWidth = 0.17; // Reduced from 0.20 for better visual separation
    const lamellaSpacing = 0.20; // 20cm spacing (3cm gap)
    const color = config.color || '#373F43';

    // 3. Logic
    const calculatedModules = config.moduleCount || 1;
    const moduleWidth = width / calculatedModules;
    const isWallMounted = config.installationType === 'wall-mounted';

    // 4. Lamellas
    // Changed: Requested "Perpendicular to Depth" -> "Not as they are now".
    // Previously: They were parallel to Width (X).
    // Now: We make them parallel to Depth (Z).
    // They will be distributed along the Width (X).

    // Internal Space Width = Width - (2 * SideBeamWidth) if we consider simplified frame.
    // Or rather between Left and Right beams.
    // 4. Lamellas
    // Deluxe: Retractable -> "Slide to Rear". Implies Lamellas are Parallel to Width (X), Distributed along Depth (Z).
    // Bio: Previous request made them Parallel to Depth (Z), Distributed along Width (X).

    // We bifurcate logic based on model.
    const isDeluxe = config.modelId === 'pergola_deluxe';
    const roofOpen = config.roofOpen || 0; // 0..1

    // Calculation Constants
    const internalWidth = width - (2 * beamWidth);
    const internalDepth = depth - (2 * beamWidth);

    // Bio: Distributed along Width (X). Lamella Length = Depth.
    // Deluxe: Distributed along Depth (Z). Lamella Length = Width.

    const lamellas = useMemo(() => {
        const items = [];

        if (isDeluxe) {
            // DELUXE LOGIC: Distributed along Z (Depth). Slide to Rear.
            // Lamella is Long (X). Width is Depth-wise dimension.
            // Count based on Depth.
            const lCount = Math.floor(Math.max(0, internalDepth) / lamellaSpacing);


            // Animation Phases:
            // 1. Rotation (0% - 20%): Angle goes from 0 to 90.
            // 2. Sliding (20% - 100%): Slide to Rear (-depth/2).

            const rotatePhase = Math.min(1, roofOpen / 0.2); // 0->1
            const slidePhase = Math.max(0, (roofOpen - 0.2) / 0.8); // 0->1

            // Effective Angle
            // If closed (0), angle is config.lamellaAngle.
            // If opening, we interpolate to 90.
            const currentAngle = config.lamellaAngle || 0;
            const targetAngle = 90;
            const effectiveAngle = currentAngle + (targetAngle - currentAngle) * rotatePhase;

            // Stacking Logic
            // We stack at REAR (Z = -depth/2 + beamWidth + some margin).
            // Stack Start (First lamella to arrive): Rearmost.
            // Wait, if we slide "To Rear", the Rearmost lamella stays put? Or loops?
            // Usually, the Frontmost lamella (#0) travels the farthest.
            // Lamella #N (Rearmost) stays or moves slightly.
            // Target Z for Lamella i:
            // Stack starts at Rear Wall.
            // Lamella N is at Rear. Lamella N-1 is at Rear + Thickness.
            // Index 0 is Front. Index N is Rear.
            // So Target for i = RearLimit + ((N-1-i) * stackThickness).
            // Wait, usually they stack compact.
            // Let's say RearLimit = -depth/2 + beamWidth + 0.1.
            // StackThickness = lamellaWidth * sin(90) = width? No, they stand vertical?
            // If 90deg, they take 'thickness' space (4cm).
            // If they are flat, they take 'width' space (20cm).
            // If they stack vertical, they take very little space.
            // Let's assume 5cm stack pitch.

            const stackPitch = 0.05;
            const rearLimit = -depth / 2 + beamWidth + 0.1;

            for (let i = 0; i < lCount; i++) {
                // Initial Distributed Position
                const distZ = (depth / 2) - beamWidth - (lamellaSpacing / 2) - (i * lamellaSpacing);

                // Stack Target
                // Rearmost (i = lCount-1) should be at rearLimit.
                // Frontmost (i = 0) should be at rearLimit + (lCount-1)*pitch.
                // Wait, if they all go to Rear.
                // i=0 (Front) must travel to become the "Last" in the stack?
                // Or does it become the "First" into the stack?
                // Visual: ||||| ->      |||||
                // Usually the Front one (i=0) pushes back? Or the Rear one stays?
                // Let's assume i=lCount-1 is fixed at Rear. i=0 slides all the way back to meet it.
                // So Stack Position for i: rearLimit + ( (lCount - 1 - i) * stackPitch ) ?
                // Let's try: i=lCount-1 -> rearLimit. i=0 -> rearLimit + MaxOffset.
                // This means i=0 is "In Front" of the stack. Correct.

                const stackZ = rearLimit + ((lCount - 1 - i) * stackPitch);

                // Current Z
                const currentZ = distZ + (stackZ - distZ) * slidePhase;

                items.push(
                    <group key={`deluxe-lamella-${i}`} position={[0, height - (beamHeight / 2), currentZ]}>
                        {/* Box Length is Internal Width */}
                        <mesh rotation={[THREE.MathUtils.degToRad(effectiveAngle), 0, 0]}>
                            <boxGeometry args={[internalWidth, 0.04, lamellaWidth]} />
                            <meshStandardMaterial color={color} />
                        </mesh>
                    </group>
                );
            }

        } else {
            // BIO LOGIC: Distributed along Width (X).
            const lamellaCount = Math.floor(Math.max(0, internalWidth) / lamellaSpacing);
            const startX = -(width / 2) + beamWidth + (lamellaSpacing / 2);
            for (let i = 0; i < lamellaCount; i++) {
                const x = startX + (i * lamellaSpacing);
                items.push(
                    <group key={`lamella-${i}`} position={[x, height - (beamHeight / 2), 0]}>
                        <mesh rotation={[0, 0, THREE.MathUtils.degToRad(config.lamellaAngle || 0) * -1]}>
                            <boxGeometry args={[lamellaWidth, 0.04, depth - (2 * beamWidth) - 0.05]} />
                            <meshStandardMaterial color={color} />
                        </mesh>
                    </group>
                );
            }
        }
        return items;
    }, [isDeluxe, roofOpen, internalWidth, internalDepth, lamellaSpacing, height, beamHeight, depth, width, beamWidth, lamellaWidth, config.lamellaAngle, color]);

    // 5. Addons
    const addons = config.addons || [];

    // Materials
    const glassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
        color: '#eef2ff', transmission: 0.9, opacity: 1, metalness: 0, roughness: 0,
        thickness: 0.01, transparent: true
    }), []);

    // Flooring Check
    const hasWpc = config.floorType === 'wpc' || (!config.floorType && addons.some(a => a.type === 'wpc-floor'));
    const hasGres = config.floorType === 'gres' || (!config.floorType && addons.some(a => a.type === 'gres-floor'));

    const slidingWallAddons = addons.filter(a => a.type === 'slidingWall');
    const hasFrontSlidingGlass = slidingWallAddons.some(a => a.location === 'front' || !a.location);
    const hasLeftSlidingGlass = slidingWallAddons.some(a => a.location === 'left');
    const hasRightSlidingGlass = slidingWallAddons.some(a => a.location === 'right');

    const zipAddons = addons.filter(a => a.type === 'zipScreen');

    console.log('PergolaModel render:', { width, depth, height, config });

    return (
        <group>
            {/* FRAME STRUCTURE */}
            {/* 1. FRONT BEAM */}
            <mesh position={[0, height - beamHeight / 2, depth / 2 - beamWidth / 2]}>
                <boxGeometry args={[width, beamHeight, beamWidth]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Rear Beam */}
            <mesh position={[0, height - beamHeight / 2, -depth / 2 + beamWidth / 2]}>
                <boxGeometry args={[width, beamHeight, beamWidth]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Left Beam */}
            <mesh position={[-width / 2 + beamWidth / 2, height - beamHeight / 2, 0]}>
                <boxGeometry args={[beamWidth, beamHeight, depth - 2 * beamWidth]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Right Beam */}
            <mesh position={[width / 2 - beamWidth / 2, height - beamHeight / 2, 0]}>
                <boxGeometry args={[beamWidth, beamHeight, depth - 2 * beamWidth]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Middle Beams */}
            {calculatedModules > 1 && Array.from({ length: calculatedModules - 1 }).map((_, i) => (
                <mesh key={`mid-beam-${i}`} position={[-width / 2 + ((i + 1) * moduleWidth), height - beamHeight / 2, 0]}>
                    <boxGeometry args={[beamWidth, beamHeight, depth - 2 * beamWidth]} />
                    <meshStandardMaterial color={color} />
                </mesh>
            ))}

            {/* --- POSTS --- */}
            {/* Front Left */}
            <mesh position={[-width / 2 + postSize / 2, height / 2, depth / 2 - postSize / 2]}>
                <boxGeometry args={[postSize, height, postSize]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Front Right */}
            <mesh position={[width / 2 - postSize / 2, height / 2, depth / 2 - postSize / 2]}>
                <boxGeometry args={[postSize, height, postSize]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Middle Posts Front */}
            {calculatedModules > 1 && Array.from({ length: calculatedModules - 1 }).map((_, i) => (
                <mesh key={`mid-post-front-${i}`} position={[-width / 2 + ((i + 1) * moduleWidth), height / 2, depth / 2 - postSize / 2]}>
                    <boxGeometry args={[postSize, height, postSize]} />
                    <meshStandardMaterial color={color} />
                </mesh>
            ))}

            {/* Rear Posts (if not wall mounted) */}
            {!isWallMounted && (
                <>
                    <mesh position={[-width / 2 + postSize / 2, height / 2, -depth / 2 + postSize / 2]}>
                        <boxGeometry args={[postSize, height, postSize]} />
                        <meshStandardMaterial color={color} />
                    </mesh>
                    <mesh position={[width / 2 - postSize / 2, height / 2, -depth / 2 + postSize / 2]}>
                        <boxGeometry args={[postSize, height, postSize]} />
                        <meshStandardMaterial color={color} />
                    </mesh>
                    {calculatedModules > 1 && Array.from({ length: calculatedModules - 1 }).map((_, i) => (
                        <mesh key={`mid-post-rear-${i}`} position={[-width / 2 + ((i + 1) * moduleWidth), height / 2, -depth / 2 + postSize / 2]}>
                            <boxGeometry args={[postSize, height, postSize]} />
                            <meshStandardMaterial color={color} />
                        </mesh>
                    ))}
                </>
            )}

            {/* --- LAMELLAS --- */}
            {lamellas}

            {/* --- ADDONS --- */}

            {/* WPC FLOORING */}
            {hasWpc && (
                <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} receiveShadow>
                    {/* Base */}
                    <mesh position={[0, 0, -0.01]}>
                        <planeGeometry args={[width, depth]} />
                        <meshStandardMaterial color="#3e2723" roughness={1} />
                    </mesh>
                    {/* Planks */}
                    {Array.from({ length: Math.ceil(width / 0.145) }).map((_, i) => {
                        const plankW = 0.14;
                        const gap = 0.005;
                        const stride = plankW + gap;
                        const xPos = -width / 2 + stride * i + plankW / 2;
                        if (xPos > width / 2) return null;

                        return (
                            <mesh key={`plank-${i}`} position={[xPos, 0, 0]} receiveShadow>
                                <boxGeometry args={[plankW, depth, 0.02]} />
                                <meshStandardMaterial color="#5D4037" roughness={0.8} />
                            </mesh>
                        )
                    })}
                </group>
            )}

            {/* GRES FLOORING */}
            {hasGres && (
                <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} receiveShadow>
                    {/* Base */}
                    <mesh position={[0, 0, -0.01]}>
                        <planeGeometry args={[width, depth]} />
                        <meshStandardMaterial color="#757575" roughness={1} />
                    </mesh>
                    {/* Tiles */}
                    {Array.from({ length: Math.ceil(width / 0.604) }).map((_, i) => {
                        return Array.from({ length: Math.ceil(depth / 0.604) }).map((__, j) => {
                            const tileS = 0.60;
                            const gap = 0.004;
                            const stride = tileS + gap;
                            const xPos = -width / 2 + stride * i + tileS / 2;
                            const yPos = -depth / 2 + stride * j + tileS / 2;

                            if (xPos > width / 2 + tileS || yPos > depth / 2 + tileS) return null;

                            return (
                                <mesh key={`tile-${i}-${j}`} position={[xPos, yPos, 0]} receiveShadow>
                                    <boxGeometry args={[tileS, tileS, 0.02]} />
                                    <meshStandardMaterial color="#BDBDBD" roughness={0.6} metalness={0.1} />
                                </mesh>
                            )
                        })
                    })}
                </group>
            )}

            {/* SLIDING FRONT */}
            {hasFrontSlidingGlass && Array.from({ length: calculatedModules }).map((_, modIdx) => {
                const modW = width / calculatedModules;
                const xPos = (-width / 2) + (modW * modIdx) + (modW / 2);
                const w = modW - postSize; // Space between posts

                return (
                    <GlassWallPanel
                        key={`front-wall-${modIdx}`}
                        position={[xPos, (height - beamHeight) / 2, depth / 2 - (postSize / 2)]}
                        width={w}
                        height={height - beamHeight}
                        material={glassMaterial}
                    />
                )
            })}

            {/* SLIDING LEFT */}
            {hasLeftSlidingGlass && (
                <group rotation={[0, Math.PI / 2, 0]} position={[-width / 2 + postSize / 2, (height - beamHeight) / 2, 0]}>
                    <GlassWallPanel
                        position={[0, 0, 0]}
                        width={depth - postSize}
                        height={height - beamHeight}
                        material={glassMaterial}
                    />
                </group>
            )}

            {/* SLIDING RIGHT */}
            {hasRightSlidingGlass && (
                <group rotation={[0, Math.PI / 2, 0]} position={[width / 2 - postSize / 2, (height - beamHeight) / 2, 0]}>
                    <GlassWallPanel
                        position={[0, 0, 0]}
                        width={depth - postSize}
                        height={height - beamHeight}
                        material={glassMaterial}
                    />
                </group>
            )}

            {/* ZIP SCREENS */}
            {zipAddons.some(a => a.location === 'front' || !a.location) && Array.from({ length: calculatedModules }).map((_, modIdx) => {
                const modW = width / calculatedModules;
                const xPos = (-width / 2) + (modW * modIdx) + (modW / 2);
                const w = modW - postSize - 0.05;

                return (
                    <ZipScreen
                        key={`zip-front-${modIdx}`}
                        width={w}
                        height={height - beamHeight}
                        position={[xPos, height - beamHeight - 0.15, depth / 2 - postSize / 2]}
                    />
                );
            })}

            {zipAddons.some(a => a.location === 'left') && (
                <group rotation={[0, Math.PI / 2, 0]} position={[-width / 2 + postSize / 2, height - beamHeight - 0.15, 0]}>
                    <ZipScreen width={depth - postSize} height={height - beamHeight} position={[0, 0, 0]} />
                </group>
            )}

            {zipAddons.some(a => a.location === 'right') && (
                <group rotation={[0, Math.PI / 2, 0]} position={[width / 2 - postSize / 2, height - beamHeight - 0.15, 0]}>
                    <ZipScreen width={depth - postSize} height={height - beamHeight} position={[0, 0, 0]} />
                </group>
            )}

        </group>
    );
};

// --- HELPER COMPONENTS ---

interface GlassWallPanelProps {
    position: [number, number, number];
    width: number;
    height: number;
    material: THREE.Material;
}

const GlassWallPanel: React.FC<GlassWallPanelProps> = ({ position, width, height, material }) => {
    const frameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#333', roughness: 0.5 }), []);
    const guideMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#aaa', roughness: 0.5 }), []);

    if (width <= 0 || height <= 0) return null;

    return (
        <group position={position}>
            {/* Glass Pane */}
            <mesh material={material}>
                <boxGeometry args={[width, height, 0.02]} />
            </mesh>

            {/* Rails */}
            <mesh position={[0, height / 2 - 0.02, 0]} material={frameMat}>
                <boxGeometry args={[width, 0.04, 0.04]} />
            </mesh>
            <mesh position={[0, -height / 2 + 0.02, 0]} material={frameMat}>
                <boxGeometry args={[width, 0.04, 0.04]} />
            </mesh>

            {/* Vertical Lines */}
            {Array.from({ length: Math.max(2, Math.ceil(width / 1.1)) - 1 }).map((_, i) => {
                const numPanels = Math.max(2, Math.ceil(width / 1.1));
                const xPos = -width / 2 + (width / numPanels) * (i + 1);
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

const ZipScreen: React.FC<{ width: number; height: number; position: [number, number, number]; rotation?: [number, number, number] }> = ({ width, height, position, rotation = [0, 0, 0] }) => {
    const screenMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#333',
        transparent: true,
        opacity: 0.7,
        roughness: 0.8,
        side: THREE.DoubleSide
    }), []);

    const boxMat = new THREE.MeshStandardMaterial({ color: '#333' });

    if (width <= 0 || height <= 0) return null;

    return (
        <group position={position} rotation={rotation}>
            {/* Cassette */}
            <mesh position={[0, 0, 0]} material={boxMat}>
                <boxGeometry args={[width, 0.1, 0.1]} />
            </mesh>
            {/* Rails */}
            <mesh position={[-width / 2 + 0.02, -height / 2, 0]} material={boxMat}>
                <cylinderGeometry args={[0.02, 0.02, height, 8]} />
            </mesh>
            <mesh position={[width / 2 - 0.02, -height / 2, 0]} material={boxMat}>
                <cylinderGeometry args={[0.02, 0.02, height, 8]} />
            </mesh>
            {/* Fabric */}
            <mesh position={[0, -height / 2, 0]} material={screenMat}>
                <planeGeometry args={[width - 0.05, height]} />
            </mesh>
        </group>
    );
};
