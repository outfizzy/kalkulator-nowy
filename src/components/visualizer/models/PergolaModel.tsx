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
    const height = (config.frontHeight || 2500) / 1000;

    // 2. Constants (Meters)
    const postSize = 0.15; // 15cm
    const beamHeight = 0.25; // 25cm
    const beamWidth = 0.15; // 15cm
    const lamellaWidth = 0.20; // 20cm
    const lamellaSpacing = 0.21; // 21cm
    const color = config.color || '#373F43';

    // 3. Logic
    const calculatedModules = config.moduleCount || (width > 4.5 ? Math.ceil(width / 4.5) : 1);
    const moduleWidth = width / calculatedModules;
    const isWallMounted = config.installationType === 'wall-mounted';

    // 4. Lamellas
    // Fits inside the frame defined by beams.
    // Internal Space Z = Depth - FrontBeamWidth - RearBeamWidth
    const internalDepth = depth - (2 * beamWidth);
    const lamellaCount = Math.floor(Math.max(0, internalDepth) / lamellaSpacing);

    // Start Z: Center of model is 0.
    // Front is +depth/2 (approx). Rear is -depth/2.
    // Beam centers are at +/- (depth/2 - beamWidth/2).
    // Lamella area starts just after Rear Beam and ends just before Front Beam.
    // Rear Inner Edge = -depth/2 + beamWidth.
    // First lamella center = Rear Inner Edge + lamellaWidth/2 + small gap?
    const startZ = -(depth / 2) + beamWidth + (lamellaSpacing / 2);

    const lamellas = useMemo(() => {
        const items = [];
        for (let i = 0; i < lamellaCount; i++) {
            const z = startZ + (i * lamellaSpacing);
            items.push(
                <group key={`lamella-${i}`} position={[0, height - (beamHeight / 2), z]}>
                    <mesh rotation={[THREE.MathUtils.degToRad(config.lamellaAngle || 0), 0, 0]}>
                        <boxGeometry args={[width - (2 * beamWidth) - 0.05, 0.04, lamellaWidth]} />
                        <meshStandardMaterial color={color} />
                    </mesh>
                </group>
            );
        }
        return items;
    }, [lamellaCount, startZ, lamellaSpacing, height, beamHeight, width, beamWidth, lamellaWidth, config.lamellaAngle, color]);

    // 5. Addons
    const addons = config.addons || [];

    // Materials
    const glassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
        color: '#eef2ff', transmission: 0.9, opacity: 1, metalness: 0, roughness: 0,
        thickness: 0.01, transparent: true
    }), []);

    const slidingWallAddons = addons.filter(a => a.type === 'slidingWall');
    const hasFrontSlidingGlass = slidingWallAddons.some(a => a.location === 'front' || !a.location);
    const hasLeftSlidingGlass = slidingWallAddons.some(a => a.location === 'left');
    const hasRightSlidingGlass = slidingWallAddons.some(a => a.location === 'right');

    const zipAddons = addons.filter(a => a.type === 'zipScreen');

    console.log('PergolaModel render:', { width, depth, height, config });

    return (
        <group>
            {/* DEBUG CUBE (Visible if model mounts) */}
            {/* <mesh position={[0, height + 0.5, 0]}>
                <boxGeometry args={[0.2, 0.2, 0.2]} />
                <meshStandardMaterial color="red" />
            </mesh> */}

            {/* --- BEAMS --- */}
            {/* Front Beam */}
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

interface GlassWallSideProps {
    side: 'left' | 'right';
    position: [number, number, number];
    width: number;
    height: number;
    material: THREE.Material;
}

const GlassWallSide: React.FC<GlassWallSideProps> = ({ side: _side, position, width, height, material }) => {
    return (
        <group position={position} rotation={[0, Math.PI / 2, 0]} name={`glass-side-${_side}`}>
            <GlassWallPanel position={[0, 0, 0]} width={width} height={height} material={material} />
        </group>
    );
};

interface GlassWallPanelProps {
    position: [number, number, number];
    width: number;
    height: number;
    material: THREE.Material;
}

const GlassWallPanel: React.FC<GlassWallPanelProps> = ({ position, width, height, material }) => {
    const frameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#333', roughness: 0.5 }), []);
    const guideMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#aaa', roughness: 0.5 }), []);

    // Safety check for width/height
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
