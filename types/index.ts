export type RiskStatus = "SAFE" | "WARNING" | "HIGH_RISK" | "CRITICAL";
export type Language = "english" | "pidgin" | "yoruba" | "igbo";
export type VehicleAccess =
  | "ALL_VEHICLES"
  | "HEAVY_ONLY"
  | "HIGH_CLEARANCE_ONLY"
  | "IMPASSABLE";
export type ElectricalHazard = "LOW" | "MODERATE" | "SEVERE" | "EXTREME";

export interface FloodAnalysis {
  // Quantitative Physics & Hydrodynamics
  estimatedWaterLevelMeters: number;
  hydrostaticPressureKPa: number; // Hydrostatic force P = rho * g * h
  waveVelocityMs: number;
  submergedStructuralPercentage: number;

  // Tactical Risk Vectors
  riskScore: number; // 1 to 10
  status: RiskStatus;
  electricalHazardLevel: ElectricalHazard;
  vehicleAccessClass: VehicleAccess;
  diseaseVectorRiskIndex: number; // 1-10 (stagnant water contamination)

  // Location & Spatial
  locationName: string;
  coordinates: {
    lat: number;
    lng: number;
  };

  // Deep Gemma 4 Engineering Reasoning Chain
  reasoningChain: {
    visualBenchmark: string; // How depth was calculated using visual anchors
    hydrodynamicForces: string; // Force & structural stress assessment
    infrastructureVulnerability: string; // Electrical grid, roads, and building impact
    predictiveEvacuationWindow: string; // Estimated time before area becomes impassable
  };

  // Actionable Protocols
  tacticalActionPlan: string[]; // Step-by-step instructions for emergency crews

  // Multilingual Public Broadcast
  alerts: {
    english: string;
    pidgin: string;
    yoruba: string;
    igbo: string;
  };
}
