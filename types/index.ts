export type RiskStatus = "SAFE" | "WARNING" | "HIGH_RISK" | "CRITICAL";
export type Language = "english" | "pidgin" | "yoruba" | "igbo";

export interface MultilingualText {
  english: string;
  pidgin: string;
  yoruba: string;
  igbo: string;
}

export interface MultilingualArray {
  english: string[];
  pidgin: string[];
  yoruba: string[];
  igbo: string[];
}

export interface Scene3D {
  terrainType: "URBAN" | "RURAL" | "RESIDENTIAL";
  structures: {
    type: "HOUSE" | "TALL_BUILDING" | "TREE";
    height: number; // 1 to 4
    x: number; // -2.0 to 2.0
    z: number; // -2.0 to 2.0
  }[];
}

export interface FloodAnalysis {
  estimatedWaterLevelMeters: number;
  hydrostaticPressureKPa: number;
  waveVelocityMs: number;
  submergedStructuralPercentage: number;
  riskScore: number;
  status: RiskStatus;
  electricalHazardLevel: string;
  vehicleAccessClass: string;
  locationName: string;
  coordinates: { lat: number; lng: number };

  scene3D: Scene3D;
  reasoningChain: {
    visualBenchmark: MultilingualText;
    hydrodynamicForces: MultilingualText;
    predictiveEvacuationWindow: MultilingualText;
  };
  tacticalActionPlan: MultilingualArray;
  alerts: MultilingualText;
}
