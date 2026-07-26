export type RiskStatus = "SAFE" | "WARNING" | "HIGH_RISK" | "CRITICAL";
export type Language = "english" | "pidgin" | "yoruba" | "igbo";

export interface FloodAnalysis {
  estimatedWaterLevelMeters: number;
  riskScore: number;
  status: RiskStatus;
  coordinates: {
    lat: number;
    lng: number;
  };
  alerts: {
    english: string;
    pidgin: string;
    yoruba: string;
    igbo: string;
  };
  reasoningLogs: string[];
}
