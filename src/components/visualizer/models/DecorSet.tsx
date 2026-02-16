import React, { useMemo } from 'react';

export const DecorSet = () => {
    // Materials
    const woodMaterial = <meshStandardMaterial color="#8b5a2b" roughness={0.85} metalness={0} envMapIntensity={0.2} />;
    const metalMaterial = <meshStandardMaterial color="#2d2d2d" roughness={0.3} metalness={0.8} envMapIntensity={0.7} />;
    const rugMaterial = <meshStandardMaterial color="#e8e4df" roughness={1} metalness={0} />;
    const plateMaterial = <meshStandardMaterial color="#f8f8f8" roughness={0.15} metalness={0.05} envMapIntensity={0.4} />;

    // Scale: Meters.
    // Table: 1.6m x 0.9m. Height 0.75m.
    return (
        <group>
            {/* Rug */}
            <mesh position={[0.5, 0.02, 1.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[2.5, 3.5]} />
                {rugMaterial}
                {/* Simple pattern with wireframe or just color? Just color for now */}
            </mesh>

            {/* Dining Set - Positioned under the roof, slightly offset */}
            <group position={[0.5, 0, 1.5]}> {/* x=0.5m right, z=1.5m forward (mid-depth of 3m patio) */}

                {/* Table */}
                <group position={[0, 0, 0]}>
                    <mesh position={[0, 0.73, 0]} castShadow receiveShadow>
                        <boxGeometry args={[1.8, 0.04, 1.0]} /> {/* Table Top */}
                        {woodMaterial}
                    </mesh>
                    {/* Legs (Cylinders) */}
                    <mesh position={[-0.8, 0.36, -0.4]} castShadow>
                        <cylinderGeometry args={[0.03, 0.02, 0.72, 16]} />
                        {metalMaterial}
                    </mesh>
                    <mesh position={[0.8, 0.36, -0.4]} castShadow>
                        <cylinderGeometry args={[0.03, 0.02, 0.72, 16]} />
                        {metalMaterial}
                    </mesh>
                    <mesh position={[-0.8, 0.36, 0.4]} castShadow>
                        <cylinderGeometry args={[0.03, 0.02, 0.72, 16]} />
                        {metalMaterial}
                    </mesh>
                    <mesh position={[0.8, 0.36, 0.4]} castShadow>
                        <cylinderGeometry args={[0.03, 0.02, 0.72, 16]} />
                        {metalMaterial}
                    </mesh>

                    {/* Table Setting (Plates, Cups) */}
                    {/* Place 1 */}
                    <mesh position={[-0.6, 0.76, 0]} castShadow>
                        <cylinderGeometry args={[0.1, 0.08, 0.01, 32]} />
                        {plateMaterial}
                    </mesh>
                    {/* Place 2 */}
                    <mesh position={[0.6, 0.76, 0]} castShadow>
                        <cylinderGeometry args={[0.1, 0.08, 0.01, 32]} />
                        {plateMaterial}
                    </mesh>
                    {/* Centerpiece Vase */}
                    <mesh position={[0, 0.85, 0]} castShadow>
                        <cylinderGeometry args={[0.06, 0.08, 0.2, 16]} />
                        <meshStandardMaterial color="#aaeeff" transparent opacity={0.6} />
                    </mesh>
                </group>

                {/* Chairs - Simple modern blocks */}
                {/* Chair 1 */}
                <group position={[-0.9, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                    {/* Seat */}
                    <mesh position={[0, 0.45, 0]} castShadow>
                        <boxGeometry args={[0.45, 0.05, 0.45]} />
                        <meshStandardMaterial color="#444" />
                    </mesh>
                    {/* Backrest (Angled) */}
                    <mesh position={[-0.2, 0.7, 0]} rotation={[0, 0, 0.1]} castShadow>
                        <boxGeometry args={[0.05, 0.5, 0.45]} />
                        <meshStandardMaterial color="#444" />
                    </mesh>
                    {/* Legs */}
                    <mesh position={[0.2, 0.22, 0.2]}><cylinderGeometry args={[0.02, 0.015, 0.45]} />{metalMaterial}</mesh>
                    <mesh position={[0.2, 0.22, -0.2]}><cylinderGeometry args={[0.02, 0.015, 0.45]} />{metalMaterial}</mesh>
                    <mesh position={[-0.2, 0.22, 0.2]}><cylinderGeometry args={[0.02, 0.015, 0.45]} />{metalMaterial}</mesh>
                    <mesh position={[-0.2, 0.22, -0.2]}><cylinderGeometry args={[0.02, 0.015, 0.45]} />{metalMaterial}</mesh>
                </group>

                {/* Chair 2 */}
                <group position={[0.9, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                    {/* Seat */}
                    <mesh position={[0, 0.45, 0]} castShadow>
                        <boxGeometry args={[0.45, 0.05, 0.45]} />
                        <meshStandardMaterial color="#444" />
                    </mesh>
                    {/* Backrest (Angled) */}
                    <mesh position={[-0.2, 0.7, 0]} rotation={[0, 0, 0.1]} castShadow>
                        <boxGeometry args={[0.05, 0.5, 0.45]} />
                        <meshStandardMaterial color="#444" />
                    </mesh>
                    {/* Legs */}
                    <mesh position={[0.2, 0.22, 0.2]}><cylinderGeometry args={[0.02, 0.015, 0.45]} />{metalMaterial}</mesh>
                    <mesh position={[0.2, 0.22, -0.2]}><cylinderGeometry args={[0.02, 0.015, 0.45]} />{metalMaterial}</mesh>
                    <mesh position={[-0.2, 0.22, 0.2]}><cylinderGeometry args={[0.02, 0.015, 0.45]} />{metalMaterial}</mesh>
                    <mesh position={[-0.2, 0.22, -0.2]}><cylinderGeometry args={[0.02, 0.015, 0.45]} />{metalMaterial}</mesh>
                </group>

                {/* Chair 3 */}
                <group position={[0, 0, 0.6]} rotation={[0, Math.PI, 0]}>
                    <mesh position={[0, 0.45, 0]} castShadow>
                        <boxGeometry args={[0.45, 0.05, 0.45]} />
                        <meshStandardMaterial color="#444" />
                    </mesh>
                    <mesh position={[-0.2, 0.7, 0]} rotation={[0, 0, 0.1]} castShadow>
                        <boxGeometry args={[0.05, 0.5, 0.45]} />
                        <meshStandardMaterial color="#444" />
                    </mesh>
                    <mesh position={[0.2, 0.22, 0.2]}><cylinderGeometry args={[0.02, 0.015, 0.45]} />{metalMaterial}</mesh>
                    <mesh position={[0.2, 0.22, -0.2]}><cylinderGeometry args={[0.02, 0.015, 0.45]} />{metalMaterial}</mesh>
                    <mesh position={[-0.2, 0.22, 0.2]}><cylinderGeometry args={[0.02, 0.015, 0.45]} />{metalMaterial}</mesh>
                    <mesh position={[-0.2, 0.22, -0.2]}><cylinderGeometry args={[0.02, 0.015, 0.45]} />{metalMaterial}</mesh>
                </group>

                {/* Chair 4 */}
                <group position={[0, 0, -0.6]} rotation={[0, 0, 0]}>
                    <mesh position={[0, 0.45, 0]} castShadow>
                        <boxGeometry args={[0.45, 0.05, 0.45]} />
                        <meshStandardMaterial color="#444" />
                    </mesh>
                    <mesh position={[-0.2, 0.7, 0]} rotation={[0, 0, 0.1]} castShadow>
                        <boxGeometry args={[0.05, 0.5, 0.45]} />
                        <meshStandardMaterial color="#444" />
                    </mesh>
                    <mesh position={[0.2, 0.22, 0.2]}><cylinderGeometry args={[0.02, 0.015, 0.45]} />{metalMaterial}</mesh>
                    <mesh position={[0.2, 0.22, -0.2]}><cylinderGeometry args={[0.02, 0.015, 0.45]} />{metalMaterial}</mesh>
                    <mesh position={[-0.2, 0.22, 0.2]}><cylinderGeometry args={[0.02, 0.015, 0.45]} />{metalMaterial}</mesh>
                    <mesh position={[-0.2, 0.22, -0.2]}><cylinderGeometry args={[0.02, 0.015, 0.45]} />{metalMaterial}</mesh>
                </group>

            </group>

            {/* Potted Plant */}
            <group position={[-2.5, 0, 0.5]}>
                <mesh position={[0, 0.25, 0]} castShadow>
                    <cylinderGeometry args={[0.2, 0.15, 0.5, 16]} />
                    <meshStandardMaterial color="#8d6e63" />
                </mesh>
                <mesh position={[0, 0.8, 0]} castShadow>
                    {/* Leafy part - low poly spheres */}
                    <dodecahedronGeometry args={[0.4, 0]} />
                    <meshStandardMaterial color="#4caf50" roughness={1} />
                </mesh>
                <mesh position={[0.2, 0.9, 0.1]} castShadow>
                    <dodecahedronGeometry args={[0.25, 0]} />
                    <meshStandardMaterial color="#4caf50" roughness={1} />
                </mesh>
                <mesh position={[-0.15, 0.7, 0.2]} castShadow>
                    <dodecahedronGeometry args={[0.3, 0]} />
                    <meshStandardMaterial color="#4caf50" roughness={1} />
                </mesh>
            </group>
        </group>
    );
};
