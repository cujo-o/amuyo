"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, useTexture } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { FloodAnalysis } from "@/types";

const ProceduralCity = ({
  data,
  imageUrl,
}: {
  data: FloodAnalysis;
  imageUrl?: string | null;
}) => {
  const waterRef = useRef<THREE.Mesh>(null);

  // Set water height relative to the 3D structures
  const targetWaterY = Math.min(
    2.5,
    Math.max(0, data.estimatedWaterLevelMeters),
  );
  const waterColor = data.riskScore >= 7 ? "#ff003c" : "#00f0ff";
  const texture = useTexture(
    imageUrl ||
      "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800",
  );

  useFrame((state, delta) => {
    if (waterRef.current) {
      waterRef.current.position.y = THREE.MathUtils.lerp(
        waterRef.current.position.y,
        targetWaterY - 1.2,
        0.05,
      );
      const mat = waterRef.current.material as THREE.MeshStandardMaterial;
      mat.color.lerp(new THREE.Color(waterColor), 0.05);
    }
  });

  return (
    <group position={[0, -0.5, 0]}>
      {/* Photo Backdrop */}
      <mesh position={[0, 1.5, -3]} rotation={[0, 0, 0]}>
        <planeGeometry args={[7, 4]} />
        <meshStandardMaterial map={texture} roughness={0.8} />
      </mesh>

      {/* Ground Plane */}
      <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, 7]} />
        <meshStandardMaterial color="#1a1a1a" roughness={1} />
      </mesh>

      {/* Procedurally Generated Structures from Gemma */}
      {data.scene3D?.structures.map((struct, idx) => {
        if (struct.type === "TREE") {
          return (
            <mesh key={idx} position={[struct.x * 2.5, -0.2, struct.z * 2.5]}>
              <cylinderGeometry args={[0.2, 0.2, struct.height]} />
              <meshStandardMaterial color="#2d4a22" />
            </mesh>
          );
        }
        return (
          <mesh
            key={idx}
            position={[struct.x * 2.5, struct.height / 2 - 1.2, struct.z * 2.5]}
          >
            <boxGeometry args={[1.2, struct.height, 1.2]} />
            <meshStandardMaterial
              color={struct.type === "TALL_BUILDING" ? "#333" : "#444"}
            />
          </mesh>
        );
      })}

      {/* Animated Water Plane */}
      <mesh
        ref={waterRef}
        position={[0, -1.2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[7, 7, 32, 32]} />
        <meshStandardMaterial
          color={waterColor}
          transparent
          opacity={0.8}
          roughness={0.1}
        />
      </mesh>
    </group>
  );
};

export default function FloodVisualizer({
  data,
  imageTextureUrl,
}: {
  data: FloodAnalysis | null;
  imageTextureUrl?: string | null;
}) {
  if (!data) return null;
  return (
    <div className="w-full h-full min-h-[420px] bg-[#0c0c0e] rounded-xl relative overflow-hidden border border-white/5">
      <Canvas camera={{ position: [5, 4, 6], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} />
        <ProceduralCity data={data} imageUrl={imageTextureUrl} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>
    </div>
  );
}
