import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { FloodAnalysis } from "@/types";

export const maxDuration = 60;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile)
      return NextResponse.json({ error: "No image provided" }, { status: 400 });

    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    let weatherContext = "";
    try {
      const weatherRes = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=7.8&longitude=6.7&hourly=precipitation,windspeed_10m&forecast_days=1",
      );
      if (weatherRes.ok) {
        const weatherData = await weatherRes.json();
        const totalRain = weatherData.hourly.precipitation.reduce(
          (sum: number, val: number) => sum + val,
          0,
        );
        weatherContext = `[METEOROLOGY]: 24-Hr forecast shows ${totalRain.toFixed(1)}mm rainfall. Factor into predictive window.`;
      }
    } catch (e) {}

    const prompt = `
      You are Amuyo's spatial and hydrological AI. Analyze this flood image from Nigeria.
      ${weatherContext}

      1. Extract hydrological metrics (Depth in meters, Hydrostatic pressure in kPa).
      2. Analyze the spatial layout (scene3D). Estimate the number of visible houses, tall buildings, and trees. Map their relative positions on an X/Z grid from -2.0 to 2.0.
      3. Generate reasoning logs and tactical action plans in English, Pidgin, Yoruba, and Igbo.

      Return ONLY valid JSON matching this exact structure:
      {
        "estimatedWaterLevelMeters": 1.2,
        "hydrostaticPressureKPa": 11.7,
        "waveVelocityMs": 1.5,
        "submergedStructuralPercentage": 45,
        "riskScore": 8,
        "status": "CRITICAL",
        "electricalHazardLevel": "SEVERE",
        "vehicleAccessClass": "HIGH_CLEARANCE_ONLY",
        "locationName": "Lokoja Basin",
        "coordinates": { "lat": 7.7969, "lng": 6.7333 },
        "scene3D": {
          "terrainType": "RESIDENTIAL",
          "structures": [
            { "type": "HOUSE", "height": 1.5, "x": -1.0, "z": 0.5 },
            { "type": "TREE", "height": 2.5, "x": 1.2, "z": -1.0 }
          ]
        },
        "reasoningChain": {
          "visualBenchmark": { "english": "Water reaching window level...", "pidgin": "Water don reach window...", "yoruba": "...", "igbo": "..." },
          "hydrodynamicForces": { "english": "...", "pidgin": "...", "yoruba": "...", "igbo": "..." },
          "predictiveEvacuationWindow": { "english": "...", "pidgin": "...", "yoruba": "...", "igbo": "..." }
        },
        "tacticalActionPlan": {
          "english": ["Isolate power grid", "Deploy boats"],
          "pidgin": ["Off light for area", "Bring boat come"],
          "yoruba": ["Pa ina", "Gbe oko omi wa"],
          "igbo": ["Gbanyuo ọkụ", "Weta ụgbọ mmiri"]
        },
        "alerts": { "english": "Evacuate!", "pidgin": "Comot there!", "yoruba": "Kuro nibe!", "igbo": "Pụọ ebe ahụ!" }
      }
    `;

    // Speed Optimization: Strict JSON configuration
    const response = await ai.models.generateContent({
      model: "gemma-4-26b-a4b-it",
      contents: [
        prompt,
        { inlineData: { mimeType: imageFile.type, data: base64Data } },
      ],
      config: {
        temperature: 0.1, // Forces highly deterministic, fast output
        responseMimeType: "application/json", // Skips markdown formatting entirely
      },
    });

    if (!response.text) throw new Error("Empty response from Gemma.");

    const cleanJson = response.text.replace(/```json|```/gi, "").trim();
    const analysis: FloodAnalysis = JSON.parse(cleanJson);

    return NextResponse.json(analysis);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to process telemetry data" },
      { status: 500 },
    );
  }
}
