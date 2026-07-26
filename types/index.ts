export type RiskStatus = "SAFE" | "WARNING" | "HIGH_RISK" | "CRITICAL";
export type Language = "english" | "pidgin" | "yoruba" | "igbo";

export interface FloodAnalysis {
  estimatedWaterLevelMeters: number;
  riskScore: number; // 1 to 10
  status: RiskStatus;
  locationName: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  waveVelocityMs: number;
  submergedStructuralPercentage: number;
  alerts: {
    english: string;
    pidgin: string;
    yoruba: string;
    igbo: string;
  };
  reasoningLogs: string[];
}
