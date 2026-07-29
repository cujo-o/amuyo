"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { FloodAnalysis } from "@/types";

const StaticCityScene = ({
  waterLevel,
  riskScore,
}: {
  waterLevel: number;
  riskScore: number;
}) => {
  const waterRef = useRef<THREE.Mesh>(null);

  // Visually scale the water level for the 3D scene
  const targetWaterY = Math.min(2.5, Math.max(0, waterLevel * 0.8));
  const waterColor =
    riskScore >= 7 ? "#ff003c" : riskScore >= 5 ? "#ffaa00" : "#00f0ff";

  useFrame((state, delta) => {
    if (waterRef.current) {
      // Smoothly animate the water rising
      waterRef.current.position.y = THREE.MathUtils.lerp(
        waterRef.current.position.y,
        targetWaterY,
        0.02,
      );
      const mat = waterRef.current.material as THREE.MeshStandardMaterial;
      mat.color.lerp(new THREE.Color(waterColor), 0.05);
    }
  });

  return (
    <group position={[0, -1.5, 0]}>
      {/* City Ground Base */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[8, 8, 0.5]} />
        <meshStandardMaterial color="#0c0c0f" roughness={1} />
      </mesh>

      {/* Abstract Infrastructure Blocks */}
      <mesh position={[-1.5, 1, -1.5]}>
        <boxGeometry args={[1.2, 2, 1.2]} />
        <meshStandardMaterial color="#1a1a24" roughness={0.7} />
      </mesh>
      <mesh position={[1.5, 1.5, -1]}>
        <boxGeometry args={[1.5, 3, 1.5]} />
        <meshStandardMaterial color="#1a1a24" roughness={0.7} />
      </mesh>
      <mesh position={[-1, 0.75, 1.5]}>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="#1a1a24" roughness={0.7} />
      </mesh>
      <mesh position={[2, 0.5, 1.5]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#1a1a24" roughness={0.7} />
      </mesh>

      {/* Dynamic Colored Water Plane */}
      <mesh ref={waterRef} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[8.5, 8.5, 0.1]} />
        <meshStandardMaterial
          color={waterColor}
          transparent
          opacity={0.8}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>

      {/* Floating Danger Ping if risk is high */}
      {riskScore >= 7 && (
        <Float speed={2} rotationIntensity={1} floatIntensity={1.5}>
          <mesh position={[0, targetWaterY + 1, 0]}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial color={waterColor} />
          </mesh>
        </Float>
      )}
    </group>
  );
};

export default function FloodVisualizer({
  data,
}: {
  data: FloodAnalysis | null;
}) {
  const level = data?.estimatedWaterLevelMeters || 0;
  const risk = data?.riskScore || 1;

  return (
    <div className="w-full h-full min-h-[420px] bg-[#0c0c0e] rounded-xl relative overflow-hidden border border-white/5">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-lg border border-white/10 text-xs font-mono text-cyan-400 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        3D DIGITAL TWIN SIMULATION
      </div>

      <Canvas camera={{ position: [6, 5, 8], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 15, 10]} intensity={1.5} />
        <StaticCityScene waterLevel={level} riskScore={risk} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>
    </div>
  );
}
