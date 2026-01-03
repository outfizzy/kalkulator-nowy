import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { PatioCoverModel } from './PatioCoverModel';
import { PergolaModel } from './models/PergolaModel';
import { HouseFacade } from './models/HouseFacade';
import { DecorSet } from './models/DecorSet';
import type { ProductConfig } from '../../types';

interface Visualizer3DProps {
    config: ProductConfig;
    transparent?: boolean;
    structureConfig?: { postCount?: number; fieldCount?: number };
    sunPosition?: number;
    onCanvasCreated?: (canvas: HTMLCanvasElement) => void;
}

export const Visualizer3D = ({ config, transparent, sunPosition = 0.5, structureConfig, onCanvasCreated }: Visualizer3DProps) => {
    // Calculate Sun Angle
    // 0 = East (-X?), 0.5 = Noon (High Y), 1 = West (+X?)
    // Arc X: -20 to 20. Y: 5 to 25 to 5.
    const sunX = (sunPosition - 0.5) * 40; // -20 to 20
    const sunY = 5 + Math.sin(sunPosition * Math.PI) * 20; // Arc up to 25
    const sunZ = 10 + Math.cos(sunPosition * Math.PI) * 5; // Slight Z varied
    return (
        <Canvas
            shadows
            camera={{ position: [6, 4, 6], fov: 45 }}
            gl={{ preserveDrawingBuffer: true, alpha: !!transparent }}
            onCreated={({ gl }) => onCanvasCreated?.(gl.domElement)}
        >
            {/* Ambient Base - Only render if not transparent (background mode) */}
            {!transparent && <color attach="background" args={['#eef2f6']} />}
            {!transparent && <fog attach="fog" args={['#eef2f6', 10, 50]} />}

            {/* Lighting Setup */}
            <ambientLight intensity={0.2 + (sunY / 30) * 0.4} />
            <spotLight
                position={[sunX, sunY, sunZ]}
                angle={0.4}
                penumbra={1}
                intensity={2.0 + (sunY / 25)}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-bias={-0.0001}
            />
            {/* Fill Light */}
            <pointLight position={[-10, 5, -10]} intensity={0.5} />

            {/* HDRI Environment - City gives sharp, realistic reflections */}
            <Environment preset="city" blur={0.8} background={false} />

            {/* Model */}
            <group position={[0, -1.5, 0]}> {/* Lower model slightly to center it */}
                {config.modelId === 'pergola_bio' ? (
                    <PergolaModel config={config} />
                ) : (
                    <PatioCoverModel config={config} structureConfig={structureConfig} />
                )}

                {/* Visualizer 3.0: House Facade */}
                <HouseFacade
                    width={config.width}
                    height={config.contextConfig?.wallHeight || 3000}
                    depth={config.projection || 2000}
                    color={config.contextConfig?.wallColor || '#ffffff'}
                    doorPosition={config.contextConfig?.doorPosition || 0}
                    hasWall={!!config.contextConfig?.hasWall}
                />

                {/* Visualizer 3.0: Decor */}
                {config.contextConfig?.showDecor && <DecorSet />}

                {/* Floor Plane Reference (Invisible but catches shadows nicely) */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                    <planeGeometry args={[100, 100]} />
                    <shadowMaterial transparent opacity={0.05} />
                </mesh>
            </group>

            {/* Premium Ground Shadows */}
            <ContactShadows
                position={[0, -1.51, 0]}
                opacity={0.6}
                scale={20}
                blur={2}
                far={4.5}
                resolution={1024}
                color="#000000"
            />

            {/* Controls with constraints */}
            <OrbitControls
                minPolarAngle={0}
                maxPolarAngle={Math.PI / 2 - 0.05} // Don't go below ground
                minDistance={3}
                maxDistance={20}
                enableDamping={true}
                dampingFactor={0.05}
            />
        </Canvas>
    );
};
