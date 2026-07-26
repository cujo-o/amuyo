"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { FloodAnalysis } from "@/types";

interface Props {
  data: FloodAnalysis | null;
}

const CityTerrain = ({
  waterLevel,
  riskScore,
}: {
  waterLevel: number;
  riskScore: number;
}) => {
  const waterRef = useRef<THREE.Mesh>(null);
  const targetWaterY = Math.min(2.2, Math.max(0.1, waterLevel * 0.8));

  const waterColor =
    riskScore >= 7 ? "#ff003c" : riskScore >= 5 ? "#ffaa00" : "#00f0ff";

  useFrame((state, delta) => {
    if (waterRef.current) {
      // Smooth water elevation animation
      waterRef.current.position.y = THREE.MathUtils.lerp(
        waterRef.current.position.y,
        targetWaterY - 1.2,
        0.04,
      );

      // Animate material color
      const mat = waterRef.current.material as THREE.MeshStandardMaterial;
      mat.color.lerp(new THREE.Color(waterColor), 0.05);
    }
  });

  return (
    <group position={[0, -0.5, 0]}>
      {/* Base Ground Grid */}
      <mesh position={[0, -1.3, 0]} receiveShadow>
        <boxGeometry args={[6, 0.2, 6]} />
        <meshStandardMaterial color="#1a1a24" roughness={0.8} />
      </mesh>

      {/* Simulated Buildings / Infrastructure */}
      {[
        [-1.8, -0.3, -1.8, 0.8, 1.8, 0.8],
        [-0.5, -0.1, -1.5, 1.0, 2.2, 1.0],
        [1.2, -0.4, -1.2, 0.9, 1.6, 0.9],
        [-1.5, -0.5, 1.2, 1.1, 1.4, 0.9],
        [1.5, -0.2, 1.2, 0.8, 2.0, 0.8],
      ].map((b, idx) => (
        <mesh key={idx} position={[b[0], b[1], b[2]]}>
          <boxGeometry args={[b[3], b[4], b[5]]} />
          <meshStandardMaterial
            color="#2a2a3a"
            wireframe={false}
            roughness={0.5}
          />
        </mesh>
      ))}

      {/* Dynamic Water Plane */}
      <mesh ref={waterRef} position={[0, -1.2, 0]}>
        <boxGeometry args={[5.8, 0.1, 5.8, 32, 1, 32]} />
        <meshStandardMaterial
          color={waterColor}
          transparent
          opacity={0.75}
          roughness={0.1}
          metalness={0.6}
        />
      </mesh>

      {/* Floating Hazard Indicators */}
      {riskScore >= 5 && (
        <Float speed={3} rotationIntensity={1} floatIntensity={2}>
          <mesh position={[0, targetWaterY - 0.9, 0]}>
            <octahedronGeometry args={[0.2, 0]} />
            <meshBasicMaterial color="#ff003c" wireframe />
          </mesh>
        </Float>
      )}
    </group>
  );
};

export default function FloodVisualizer({ data }: Props) {
  const level = data?.estimatedWaterLevelMeters || 0.3;
  const risk = data?.riskScore || 2;

  return (
    <div className="w-full h-[420px] bg-[#08080c] rounded-2xl relative overflow-hidden border border-white/10 shadow-2xl">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-lg border border-white/10 text-xs font-mono text-cyan-400">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        3D DIGITAL TWIN SIMULATION
      </div>

      {data && (
        <div className="absolute bottom-4 left-4 z-10 bg-black/80 backdrop-blur-md p-3 rounded-xl border border-white/10 text-xs font-mono space-y-1 text-gray-300">
          <div>
            Est. Depth:{" "}
            <span className="text-white font-bold">
              {data.estimatedWaterLevelMeters}m
            </span>
          </div>
          <div>
            Submergence:{" "}
            <span className="text-white font-bold">
              {data.submergedStructuralPercentage}%
            </span>
          </div>
          <div>
            Velocity:{" "}
            <span className="text-white font-bold">
              {data.waveVelocityMs} m/s
            </span>
          </div>
        </div>
      )}

      <Canvas camera={{ position: [5, 4, 6], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 15, 10]} intensity={1.5} />
        <pointLight position={[-10, 5, -10]} intensity={0.8} color="#00f0ff" />

        <CityTerrain waterLevel={level} riskScore={risk} />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.8}
        />
      </Canvas>
    </div>
  );
}
