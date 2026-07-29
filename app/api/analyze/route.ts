import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { FloodAnalysis } from "@/types";

// ⚡ SPEED OPTIMIZATION 1: Edge Runtime gives you a longer timeout window and zero cold-start delay
export const runtime = "edge";
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

    // Fetch weather with a strict 2-second timeout so it never bottlenecks the AI
    let weatherContext = "";
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const weatherRes = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=7.8&longitude=6.7&hourly=precipitation,windspeed_10m&forecast_days=1",
        { signal: controller.signal },
      );
      clearTimeout(timeoutId);

      if (weatherRes.ok) {
        const weatherData = await weatherRes.json();
        const totalRain = weatherData.hourly.precipitation.reduce(
          (sum: number, val: number) => sum + val,
          0,
        );
        weatherContext = `[METEOROLOGY]: 24-Hr forecast shows ${totalRain.toFixed(1)}mm rainfall. Factor into predictive window.`;
      }
    } catch (e) {
      console.warn("Weather API skipped to maintain execution speed.");
    }

    // ⚡ SPEED OPTIMIZATION 2: Strict instruction for brevity to reduce token generation time
    const prompt = `
      You are Amuyo's spatial and hydrological AI. Analyze this flood image from Nigeria.
      ${weatherContext}

      1. Extract hydrological metrics (Depth in meters, Hydrostatic pressure in kPa).
      2. Analyze the spatial layout (scene3D). Estimate the number of visible houses, tall buildings, and trees. Map their relative positions on an X/Z grid from -2.0 to 2.0.
      3. Generate reasoning logs and tactical action plans in English, Pidgin, Yoruba, and Igbo.
      
      CRITICAL SPEED CONSTRAINT: Keep all reasoning strings and action plans strictly to ONE short sentence. Be extremely concise.

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
          "visualBenchmark": { "english": "Water reaching window level.", "pidgin": "Water don reach window.", "yoruba": "...", "igbo": "..." },
          "hydrodynamicForces": { "english": "...", "pidgin": "...", "yoruba": "...", "igbo": "..." },
          "predictiveEvacuationWindow": { "english": "...", "pidgin": "...", "yoruba": "...", "igbo": "..." }
        },
        "tacticalActionPlan": {
          "english": ["Isolate power grid.", "Deploy boats."],
          "pidgin": ["Off light.", "Bring boat."],
          "yoruba": ["Pa ina.", "Gbe oko omi wa."],
          "igbo": ["Gbanyuo ọkụ.", "Weta ụgbọ mmiri."]
        },
        "alerts": { "english": "Evacuate!", "pidgin": "Comot there!", "yoruba": "Kuro nibe!", "igbo": "Pụọ ebe ahụ!" }
      }
    `;

    // ⚡ STRICT COMPLIANCE: Forcing the exact Gemma 4 model required by the hackathon
    const response = await ai.models.generateContent({
      model: "gemma-4-26b-a4b-it",
      contents: [
        prompt,
        {
          inlineData: {
            mimeType: imageFile.type || "image/jpeg",
            data: base64Data,
          },
        },
      ],
      config: {
        temperature: 0.1, // Forces deterministic, fast output
        responseMimeType: "application/json", // Bypasses markdown formatting
      },
    });

    if (!response.text) throw new Error("Empty response from AI engine.");

    const cleanJson = response.text.replace(/```json|```/gi, "").trim();
    const analysis: FloodAnalysis = JSON.parse(cleanJson);

    return NextResponse.json(analysis);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Server processing failed." },
      { status: 500 },
    );
  }
}
