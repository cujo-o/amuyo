"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, MeshDistortMaterial } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { FloodAnalysis } from "@/types";

const WaterVolume = ({
  waterLevel,
  riskScore,
}: {
  waterLevel: number;
  riskScore: number;
}) => {
  const waterRef = useRef<THREE.Mesh>(null);
  const targetColor =
    riskScore >= 7 ? "#ff003c" : riskScore >= 5 ? "#ffaa00" : "#00f0ff";

  useFrame((state, delta) => {
    if (!waterRef.current) return;
    const targetScaleY = Math.max(0.1, waterLevel / 2);
    waterRef.current.scale.y = THREE.MathUtils.lerp(
      waterRef.current.scale.y,
      targetScaleY,
      0.05,
    );

    const material = waterRef.current.material as THREE.MeshPhysicalMaterial;
    material.color.lerp(new THREE.Color(targetColor), 0.05);
    waterRef.current.rotation.y += delta * 0.15;
  });

  return (
    <mesh ref={waterRef} position={[0, -1.5, 0]}>
      <cylinderGeometry args={[1.9, 1.9, 3, 32]} />
      <MeshDistortMaterial
        distort={0.15}
        speed={1.5}
        roughness={0.2}
        metalness={0.8}
      />
    </mesh>
  );
};

export default function FloodVisualizer({
  data,
}: {
  data: FloodAnalysis | null;
}) {
  const level = data?.estimatedWaterLevelMeters || 0.2;
  const risk = data?.riskScore || 1;

  return (
    <div className="w-full h-full min-h-[400px] bg-[#0a0a0a] rounded-xl relative overflow-hidden">
      <Canvas camera={{ position: [0, 2, 7], fov: 45 }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
        />

        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[2, 2, 4, 24]} />
          <meshBasicMaterial
            color="#ffffff"
            wireframe
            transparent
            opacity={0.05}
          />
        </mesh>

        <WaterVolume waterLevel={level} riskScore={risk} />
      </Canvas>
    </div>
  );
}
