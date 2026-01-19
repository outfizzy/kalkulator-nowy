import React, { useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Center } from '@react-three/drei';
import { PatioCoverModel } from '../visualizer/PatioCoverModel';
import type { ProductConfig } from '../../types';

interface WallVisualizerProps {
    wallProduct: string;
    width: number; // For Front walls / Panorama
    projection: number; // For Side walls
    height?: number; // Usually wallHeight
    modelName: string; // To match visualizer style
}

export const WallVisualizer: React.FC<WallVisualizerProps> = ({ wallProduct, width, projection, height = 2500, modelName }) => {

    // Construct a mock config to display the chosen wall
    const mockConfig: ProductConfig = useMemo(() => {
        // Default base config
        const config: ProductConfig = {
            id: 'preview',
            modelId: modelName.toLowerCase().includes('sky') ? 'skystyle' : 'trendline',
            name: modelName,
            width: width,   // Use provided width for context
            projection: projection, // Use provided projection
            roofType: 'poly',
            polycarbonateType: 'opal',
            color: 'RAL 7016',
            price: 0,
            addons: [],
            sideWedges: false
        };

        // Determine what to show based on selected wall product
        // 1. Wedges
        if (wallProduct.includes('Wedge') || wallProduct.includes('Keilfenster')) {
            config.sideWedges = true;
            // Focus on side
        }

        // 2. Side Walls (Fixed or Sliding - visualizing as Glass Side for preview)
        else if (wallProduct.includes('Side Wall') || wallProduct.includes('Ściana Boczna')) {
            // Using sliding wall visual for generic side wall for now, or fixed if we had it.
            // Visually "GlassWallSide" is a good proxy.
            config.addons.push({
                id: 'preview-side',
                name: 'Preview Side',
                type: 'slidingWall',
                price: 0,
                location: 'left' // Show on left side
            });
        }

        // 3. Front Walls / Schiebeture / Panorama
        else {
            // Assume Front location for Sciebetur, Panorama, Front Wall
            // Note: Panorama usually replaces the front posts or goes between them.
            config.addons.push({
                id: 'preview-front',
                name: 'Preview Front',
                type: 'slidingWall',
                price: 0,
                location: 'front'
            });
        }

        return config;
    }, [wallProduct, width, projection, modelName]);

    // Camera postion based on type
    const isSideView = wallProduct.includes('Wedge') || wallProduct.includes('Side Wall') || wallProduct.includes('Ściana Boczna');
    const cameraPos: [number, number, number] = isSideView
        ? [-5, 2, 0] // Left side view
        : [0, 2, 6]; // Front view

    return (
        <div className="w-full h-[300px] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative">
            <div className="absolute top-3 right-3 z-10 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-600 shadow-sm">
                Podgląd interaktywny 3D
            </div>

            <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-slate-400">Ładowanie widoku 3D...</div>}>
                <Canvas shadows camera={{ position: cameraPos, fov: 45 }}>
                    <color attach="background" args={['#f1f5f9']} />
                    <fog attach="fog" args={['#f1f5f9', 5, 20]} />

                    <ambientLight intensity={0.7} />
                    <spotLight position={[5, 10, 5]} intensity={1} castShadow />
                    <Environment preset="city" />

                    <group position={[0, -1.2, 0]}>
                        <Center>
                            <PatioCoverModel config={mockConfig} />
                        </Center>

                        {/* Floor */}
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                            <planeGeometry args={[15, 15]} />
                            <shadowMaterial opacity={0.1} />
                        </mesh>
                    </group>

                    <ContactShadows opacity={0.4} scale={20} blur={2} far={4} color="#000000" />
                    <OrbitControls autoRotate autoRotateSpeed={isSideView ? 0.5 : 1} minPolarAngle={0} maxPolarAngle={Math.PI / 2 - 0.1} />
                </Canvas>
            </Suspense>
        </div>
    );
};
