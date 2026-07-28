import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { FloodAnalysis } from "@/types";

// CRITICAL: Prevents Vercel from timing out during Gemma's reasoning phase
export const maxDuration = 60;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = imageFile.type || "image/jpeg";

    // --- IDEA 3: FETCH LIVE WEATHER FORECAST TO IMPROVE GEMMA'S ACCURACY ---
    let weatherContext = "";
    try {
      const weatherRes = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=7.8&longitude=6.7&hourly=precipitation,windspeed_10m&forecast_days=1",
        { cache: "no-store" },
      );
      if (weatherRes.ok) {
        const weatherData = await weatherRes.json();
        const totalRain = weatherData.hourly.precipitation.reduce(
          (sum: number, val: number) => sum + val,
          0,
        );
        const maxWind = Math.max(...weatherData.hourly.windspeed_10m);
        weatherContext = `[LIVE METEOROLOGICAL DATA]: 24-Hour Forecast indicates ${totalRain.toFixed(1)}mm of accumulated rainfall and peak winds of ${maxWind}km/h in the region. Factor this severe weather forecast into your risk score and predictive window!`;
      }
    } catch (e) {
      console.warn(
        "Weather fetch failed, proceeding with visual-only analysis.",
      );
    }

    const prompt = `
      You are Amuyo's Senior Hydrological AI Engine.
      Analyze this environmental telemetry image from Nigeria.

      ${weatherContext}

      1. Visual Benchmark Calibration: Estimate water depth (m) using visual anchors.
      2. Hydrodynamic Force Analysis: Calculate Hydrostatic Pressure (kPa).
      3. Electrical & Infrastructure Hazard: (LOW, MODERATE, SEVERE, EXTREME).
      4. Emergency Vehicle Accessibility: (ALL_VEHICLES, HEAVY_ONLY, HIGH_CLEARANCE_ONLY, IMPASSABLE).
      5. Formulate a 3-part reasoning chain (visualBenchmark, hydrodynamicForces, predictiveEvacuationWindow).
      6. Provide 3 tactical action steps for emergency responders.
      7. Provide localized public broadcast messages in English, Pidgin, Yoruba, and Igbo.

      Return ONLY a valid JSON object matching this structure (no markdown, no backticks):
      {
        "estimatedWaterLevelMeters": 1.45,
        "hydrostaticPressureKPa": 14.22,
        "waveVelocityMs": 2.1,
        "submergedStructuralPercentage": 68,
        "riskScore": 8,
        "status": "CRITICAL",
        "electricalHazardLevel": "SEVERE",
        "vehicleAccessClass": "HIGH_CLEARANCE_ONLY",
        "diseaseVectorRiskIndex": 7,
        "locationName": "Lokoja Drainage Basin",
        "coordinates": { "lat": 7.7969, "lng": 6.7333 },
        "reasoningChain": {
          "visualBenchmark": "Waterline is submerged past the wheel arches...",
          "hydrodynamicForces": "Hydrostatic force calculated at ~14.2 kPa...",
          "predictiveEvacuationWindow": "Roadway will become completely impassable..."
        },
        "tacticalActionPlan": [
          "Isolate local power distribution...",
          "Deploy high-clearance 4x4...",
          "Establish secondary containment..."
        ],
        "alerts": {
          "english": "CRITICAL HAZARD...",
          "pidgin": "DANGER DEY...",
          "yoruba": "EWU NLA...",
          "igbo": "EGWU DIRI..."
        }
      }
    `;

    // Note: If you still get model errors, try changing "gemma-4-26b-a4b-it" to "gemini-2.5-flash" here.
    const response = await ai.models.generateContent({
      model: "gemma-4-26b-a4b-it",
      contents: [prompt, { inlineData: { mimeType, data: base64Data } }],
    });

    const text = response.text;
    if (!text) throw new Error("Gemma returned an empty evaluation string.");

    const cleanJson = text.replace(/```json|```/gi, "").trim();
    const analysis: FloodAnalysis = JSON.parse(cleanJson);

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error("Gemma API Backend Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process telemetry data" },
      { status: 500 },
    );
  }
}
