// components/FloodVisualizer.tsx
"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, useTexture } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { FloodAnalysis } from "@/types";

interface Props {
  data: FloodAnalysis | null;
  imageTextureUrl?: string | null;
}

const DynamicPhotoScene = ({
  waterLevel,
  riskScore,
  imageUrl,
}: {
  waterLevel: number;
  riskScore: number;
  imageUrl?: string | null;
}) => {
  const waterRef = useRef<THREE.Mesh>(null);
  const targetWaterY = Math.min(1.8, Math.max(-0.5, waterLevel * 0.8 - 1.2));
  const waterColor =
    riskScore >= 7 ? "#ff003c" : riskScore >= 5 ? "#ffaa00" : "#00f0ff";

  // Load uploaded photo texture dynamically if available
  const texture = useTexture(
    imageUrl ||
      "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80",
  );

  useFrame((state, delta) => {
    if (waterRef.current) {
      waterRef.current.position.y = THREE.MathUtils.lerp(
        waterRef.current.position.y,
        targetWaterY,
        0.05,
      );
      const mat = waterRef.current.material as THREE.MeshStandardMaterial;
      mat.color.lerp(new THREE.Color(waterColor), 0.05);
    }
  });

  return (
    <group position={[0, -0.2, 0]}>
      {/* 3D Uploaded Photo Billboard */}
      <mesh position={[0, 0, 0]} rotation={[-0.3, 0, 0]}>
        <planeGeometry args={[4, 2.8]} />
        <meshStandardMaterial
          map={texture}
          side={THREE.DoubleSide}
          roughness={0.3}
        />
      </mesh>

      {/* 3D Rising Water Surface */}
      <mesh
        ref={waterRef}
        position={[0, -1.2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[5, 5, 32, 32]} />
        <meshStandardMaterial
          color={waterColor}
          transparent
          opacity={0.7}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>

      {/* Pulsing Danger Marker */}
      {riskScore >= 5 && (
        <Float speed={2} rotationIntensity={1} floatIntensity={1.5}>
          <mesh position={[0, targetWaterY + 0.5, 0]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshBasicMaterial color={waterColor} />
          </mesh>
        </Float>
      )}
    </group>
  );
};

export default function FloodVisualizer({ data, imageTextureUrl }: Props) {
  const level = data?.estimatedWaterLevelMeters || 0.5;
  const risk = data?.riskScore || 2;

  return (
    <div className="w-full h-full min-h-[420px] bg-[#0c0c0e] rounded-xl relative overflow-hidden border border-white/5 shadow-2xl">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-lg border border-white/10 text-xs font-mono text-cyan-400">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        3D PHOTO WATER RECONSTRUCTION
      </div>

      <Canvas camera={{ position: [0, 1, 5], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} />
        <DynamicPhotoScene
          waterLevel={level}
          riskScore={risk}
          imageUrl={imageTextureUrl}
        />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
