import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { FloodAnalysis } from "@/types";

export const runtime = "edge";
export const maxDuration = 60;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    let weatherContext = "";
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const weatherRes = await fetch("https://api.open-meteo.com/v1/forecast?latitude=7.8&longitude=6.7&hourly=precipitation,windspeed_10m&forecast_days=1", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (weatherRes.ok) {
        const weatherData = await weatherRes.json();
        const totalRain = weatherData.hourly.precipitation.reduce((sum: number, val: number) => sum + val, 0);
        weatherContext = `[WEATHER]: 24-Hour forecast shows ${totalRain.toFixed(1)}mm rainfall.`;
      }
    } catch (e) {
      console.warn("Weather skipped");
    }

    const prompt = `
      You are a hydrological AI. Analyze this flood image.
      ${weatherContext}

      Extract hydrological metrics (Depth in meters, Hydrostatic pressure in kPa).
      Generate reasoning logs and tactical action plans in English, Pidgin, Yoruba, and Igbo.
      
      CRITICAL: Return ONLY valid JSON matching this exact structure. Do not write conversational text or markdown:
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
        "reasoningChain": {
          "visualBenchmark": { "english": "...", "pidgin": "...", "yoruba": "...", "igbo": "..." },
          "hydrodynamicForces": { "english": "...", "pidgin": "...", "yoruba": "...", "igbo": "..." },
          "predictiveEvacuationWindow": { "english": "...", "pidgin": "...", "yoruba": "...", "igbo": "..." }
        },
        "tacticalActionPlan": {
          "english": ["..."],
          "pidgin": ["..."],
          "yoruba": ["..."],
          "igbo": ["..."]
        },
        "alerts": { "english": "...", "pidgin": "...", "yoruba": "...", "igbo": "..." }
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemma-4-26b-a4b-it",
      contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }] }],
      config: { temperature: 0.1, responseMimeType: "application/json" }
    });

    const textResponse = response.text;
    if (!textResponse) throw new Error("Empty response from Gemma.");

    const extractValidJSON = (text: string) => {
      const start = text.indexOf('{');
      if (start === -1) return null;
      let depth = 0;
      for (let i = start; i < text.length; i++) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') {
          depth--;
          if (depth === 0) return text.substring(start, i + 1);
        }
      }
      return null;
    };

    const cleanJson = extractValidJSON(textResponse);
    if (!cleanJson) throw new Error("Could not extract JSON.");

    const analysis: FloodAnalysis = JSON.parse(cleanJson);
    return NextResponse.json(analysis);

  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Server processing failed." }, { status: 500 });
  }
}