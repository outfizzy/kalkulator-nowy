import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Sky } from '@react-three/drei';
import { PatioCoverModel } from './PatioCoverModel';
import { PergolaModel } from './models/PergolaModel';
import { HouseFacade } from './models/HouseFacade';
import { DecorSet } from './models/DecorSet';
import type { ProductConfig } from '../../types';
import * as THREE from 'three';
import { useMemo } from 'react';
import { createGrassMaterial, createStoneGroundMaterial } from './materials';

interface Visualizer3DProps {
    config: ProductConfig;
    transparent?: boolean;
    structureConfig?: { postCount?: number; fieldCount?: number };
    sunPosition?: number;
    onCanvasCreated?: (canvas: HTMLCanvasElement) => void;
}

/** Procedural ground plane with grass and stone patio pad */
const GroundEnvironment = ({ patioWidth, patioDepth }: { patioWidth: number; patioDepth: number }) => {
    const grassMat = useMemo(() => createGrassMaterial(), []);
    const stoneMat = useMemo(() => createStoneGroundMaterial(), []);

    // Pad dimensions with margin around the patio
    const padW = Math.max(patioWidth + 2, 6);
    const padD = Math.max(patioDepth + 2, 5);

    return (
        <group>
            {/* Stone patio pad — directly under the structure */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
                <planeGeometry args={[padW, padD]} />
                <meshStandardMaterial {...stoneMat} />
            </mesh>

            {/* Grass surrounding area — larger ground */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
                <planeGeometry args={[60, 60]} />
                <meshStandardMaterial {...grassMat} />
            </mesh>
        </group>
    );
};

export const Visualizer3D = ({ config, transparent, sunPosition = 0.5, structureConfig, onCanvasCreated }: Visualizer3DProps) => {
    // ── Sun Position Arc ────────────────────────────────
    // 0 = East (sunrise), 0.5 = Noon (high), 1 = West (sunset)
    const sunX = (sunPosition - 0.5) * 40;
    const sunY = 5 + Math.sin(sunPosition * Math.PI) * 20;
    const sunZ = 10 + Math.cos(sunPosition * Math.PI) * 5;

    // Sky sun position (normalized for Drei Sky)
    const skySunPosition: [number, number, number] = [sunX, sunY, sunZ];

    // Dimensions in meters for ground
    const patioWidth = (config.width || 3000) / 1000;
    const patioDepth = (config.projection || 2000) / 1000;

    return (
        <Canvas
            shadows
            camera={{ position: [6, 4, 6], fov: 45 }}
            gl={{
                preserveDrawingBuffer: true,
                alpha: !!transparent,
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.1,
            }}
            onCreated={({ gl }) => onCanvasCreated?.(gl.domElement)}
        >
            {/* ── Background & Atmosphere ── */}
            {!transparent && (
                <>
                    <color attach="background" args={['#d4dbe6']} />
                    <fog attach="fog" args={['#d4dbe6', 18, 55]} />
                    {/* Realistic sky dome — adjusts with sun position */}
                    <Sky
                        distance={450000}
                        sunPosition={skySunPosition}
                        inclination={0.5}
                        azimuth={0.25}
                        turbidity={8}
                        rayleigh={0.5}
                        mieCoefficient={0.005}
                        mieDirectionalG={0.8}
                    />
                </>
            )}

            {/* ── Lighting Setup (3-point + ambient) ── */}
            {/* Ambient fill — gentle sky color */}
            <ambientLight intensity={0.3 + (sunY / 30) * 0.3} color="#e8edf5" />

            {/* Key Light — main sun */}
            <directionalLight
                position={[sunX, sunY, sunZ]}
                intensity={2.2 + (sunY / 25) * 0.8}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-near={0.1}
                shadow-camera-far={50}
                shadow-camera-left={-12}
                shadow-camera-right={12}
                shadow-camera-top={12}
                shadow-camera-bottom={-12}
                shadow-bias={-0.0002}
                color="#fff5e6"
            />

            {/* Fill Light — cool side (blue sky reflection) */}
            <directionalLight
                position={[-sunX * 0.5, 8, -sunZ * 0.5]}
                intensity={0.4}
                color="#b0c4de"
            />

            {/* Rim / Back Light — subtle edge definition */}
            <pointLight position={[-10, 5, -10]} intensity={0.3} color="#ddd" />

            {/* HDRI Environment — city gives sharp, realistic reflections on metal */}
            <Environment preset="city" blur={0.6} background={false} environmentIntensity={1.2} />

            {/* ── Scene ── */}
            <group position={[0, -1.5, 0]}>
                {/* Model Selection */}
                {config.modelId === 'pergola_bio' || config.modelId === 'pergola_deluxe' ? (
                    <PergolaModel config={config} />
                ) : (
                    <PatioCoverModel config={config} structureConfig={structureConfig} />
                )}

                {/* House Facade */}
                <HouseFacade
                    width={config.width}
                    height={config.contextConfig?.wallHeight || 3000}
                    depth={config.projection || 2000}
                    color={config.contextConfig?.wallColor || '#ffffff'}
                    doorPosition={config.contextConfig?.doorPosition || 0}
                    hasWall={!!config.contextConfig?.hasWall}
                />

                {/* Decor Set */}
                {config.contextConfig?.showDecor && <DecorSet />}

                {/* Ground Environment (visible textured ground) */}
                {!transparent && (
                    <GroundEnvironment patioWidth={patioWidth} patioDepth={patioDepth} />
                )}

                {/* Shadow-catching invisible plane (ensures shadows even below ground mesh) */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                    <planeGeometry args={[100, 100]} />
                    <shadowMaterial transparent opacity={0.08} />
                </mesh>
            </group>

            {/* Premium Contact Shadows — soft AO under structure */}
            <ContactShadows
                position={[0, -1.51, 0]}
                opacity={0.5}
                scale={25}
                blur={2.5}
                far={5}
                resolution={1024}
                color="#000000"
            />

            {/* Orbit Controls — smooth damping, constrained */}
            <OrbitControls
                minPolarAngle={0.1}
                maxPolarAngle={Math.PI / 2 - 0.05}
                minDistance={3}
                maxDistance={20}
                enableDamping={true}
                dampingFactor={0.05}
                target={[0, 0.5, 0]}
            />
        </Canvas>
    );
};
