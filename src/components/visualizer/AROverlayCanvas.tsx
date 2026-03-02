/**
 * AROverlayCanvas — Composites a 3D product model onto a customer's house photo.
 *
 * Architecture:
 * 1. Background layer: customer's house photo (full-screen)
 * 2. Three.js Canvas: renders the product with transparent background
 * 3. Camera is positioned to match the photo's perspective (from AI analysis)
 * 4. Lighting matches the photo's sun direction
 */

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { PatioCoverModel } from './PatioCoverModel';
import { PergolaModel } from './models/PergolaModel';
import type { ProductConfig } from '../../types';
import type { ARCameraParams } from '../../hooks/useHomography';
import * as THREE from 'three';

interface AROverlayCanvasProps {
    config: ProductConfig;
    backgroundImage: string;
    cameraParams: ARCameraParams;
    structureConfig?: { postCount?: number; fieldCount?: number };
    modelOffset: { x: number; y: number; scale: number };
}

/** Invisible ground plane that catches shadows from the product */
const ShadowCatcher = ({ position }: { position: [number, number, number] }) => (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <shadowMaterial transparent opacity={0.35} />
    </mesh>
);

export const AROverlayCanvas = ({
    config,
    backgroundImage,
    cameraParams,
    structureConfig,
    modelOffset
}: AROverlayCanvasProps) => {
    const isPergola = config.modelId === 'pergola_bio' || config.modelId === 'pergola_deluxe';

    // Apply user offset adjustments to model position
    const adjustedPosition: [number, number, number] = [
        cameraParams.modelPosition.x + modelOffset.x,
        cameraParams.modelPosition.y + modelOffset.y,
        cameraParams.modelPosition.z
    ];

    const scale = modelOffset.scale;

    return (
        <div className="relative w-full h-full">
            {/* Layer 1: House Photo Background */}
            <img
                src={backgroundImage}
                alt="Dom klienta"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{ zIndex: 0 }}
            />

            {/* Layer 2: Three.js Transparent Canvas */}
            <div className="absolute inset-0" style={{ zIndex: 1 }}>
                <Canvas
                    shadows
                    camera={{
                        position: cameraParams.position.toArray(),
                        fov: cameraParams.fov,
                        near: 0.1,
                        far: 100
                    }}
                    gl={{
                        preserveDrawingBuffer: true,
                        alpha: true,
                        toneMapping: THREE.ACESFilmicToneMapping,
                        toneMappingExposure: 1.0,
                    }}
                    onCreated={({ camera }) => {
                        camera.lookAt(cameraParams.lookAt);
                    }}
                >
                    {/* No background — transparent */}

                    {/* ── Lighting matched to photo ── */}
                    <ambientLight intensity={cameraParams.sunIntensity * 0.25} color="#e8edf5" />

                    {/* Key Light — matches photo sun direction */}
                    <directionalLight
                        position={cameraParams.sunDirection.toArray()}
                        intensity={cameraParams.sunIntensity}
                        castShadow
                        shadow-mapSize={[2048, 2048]}
                        shadow-camera-near={0.1}
                        shadow-camera-far={50}
                        shadow-camera-left={-15}
                        shadow-camera-right={15}
                        shadow-camera-top={15}
                        shadow-camera-bottom={-15}
                        shadow-bias={-0.0003}
                        color="#fff5e6"
                    />

                    {/* Soft fill from opposite side */}
                    <directionalLight
                        position={[-cameraParams.sunDirection.x, 8, -cameraParams.sunDirection.z]}
                        intensity={cameraParams.sunIntensity * 0.2}
                        color="#b0c4de"
                    />

                    {/* HDRI for realistic metal reflections */}
                    <Environment preset="city" blur={0.6} background={false} environmentIntensity={0.8} />

                    {/* ── Product Model ── */}
                    <group
                        position={adjustedPosition}
                        scale={[scale, scale, scale]}
                        rotation={[0, cameraParams.modelRotationY, 0]}
                    >
                        {isPergola ? (
                            <PergolaModel config={config} />
                        ) : (
                            <PatioCoverModel config={config} structureConfig={structureConfig} />
                        )}
                    </group>

                    {/* Shadow catcher on ground plane */}
                    <ShadowCatcher position={[adjustedPosition[0], -0.01, adjustedPosition[2]]} />

                    {/* Soft contact shadows for grounding */}
                    <ContactShadows
                        position={[adjustedPosition[0], -0.02, adjustedPosition[2]]}
                        opacity={0.4}
                        scale={20}
                        blur={2.5}
                        far={5}
                        resolution={1024}
                        color="#000000"
                    />

                    {/* Limited orbit — user can fine-tune view angle */}
                    <OrbitControls
                        target={cameraParams.lookAt.toArray() as [number, number, number]}
                        enableDamping={true}
                        dampingFactor={0.05}
                        minDistance={2}
                        maxDistance={25}
                        enablePan={false}
                    />
                </Canvas>
            </div>

            {/* Layer 3: AR Info Badge */}
            <div className="absolute top-4 left-4 z-10">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-xl shadow-lg backdrop-blur-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="font-bold text-sm tracking-wide">AR PREVIEW</span>
                </div>
            </div>
        </div>
    );
};
