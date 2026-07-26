import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { FloodAnalysis } from "@/types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: "No telemetry image provided" },
        { status: 400 },
      );
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    const prompt = `
      You are Amuyo's core multimodal AI disaster analysis engine.
      Analyze this environmental telemetry image from Nigeria (e.g., Lagos, Kogi, Benue, Niger states).
      
      Tasks:
      1. Estimate flood depth in meters relative to adult height or structures.
      2. Calculate threat risk score from 1 (Safe) to 10 (Catastrophic).
      3. Identify the likely region or default to "Lokoja Confluence Area, Kogi State".
      4. Estimate geographic coordinates (lat/lng) for the scene.
      5. Estimate wave velocity (m/s) and structural submergence percentage (0-100%).
      6. Provide 3 step reasoning logs.
      7. Provide localized emergency warning alerts in English, Pidgin, Yoruba, and Igbo.

      Return ONLY a valid raw JSON object matching this structure with NO markdown or backticks:
      {
        "estimatedWaterLevelMeters": 1.2,
        "riskScore": 8,
        "status": "CRITICAL",
        "locationName": "Lokoja Flood Basin, Kogi",
        "coordinates": { "lat": 7.7969, "lng": 6.7333 },
        "waveVelocityMs": 2.4,
        "submergedStructuralPercentage": 65,
        "alerts": {
          "english": "CRITICAL: Heavy floodwaters rising in your area. Evacuate to higher ground immediately.",
          "pidgin": "DANGER DEY: Water don high well well for your area. Make everybody move go high ground now now!",
          "yoruba": "EWU NLA: Omi ti gbe de agbegbe re. E lo si ibi giga ni kiakiai.",
          "igbo": "EGWU DIRI: Mmiri na-ebili ngwa ngwa n'oio gị. Biko gbalaga n'ebe dị elu ubochi a."
        },
        "reasoningLogs": [
          "Identified water level reaching vehicle window line (~1.2m depth).",
          "Calculated high flow turbulence near residential structures.",
          "Cross-referenced spatial risk vector with regional drainage channels."
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemma-4-26b-a4b-it",
      contents: [
        { text: prompt },
        {
          inlineData: {
            mimeType: imageFile.type || "image/jpeg",
            data: base64Data,
          },
        },
      ],
    });

    if (!response.text) {
      throw new Error("Gemma returned an empty evaluation string.");
    }

    const cleanJson = response.text.replace(/```json|```/gi, "").trim();
    const analysis: FloodAnalysis = JSON.parse(cleanJson);

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error("Gemma API Backend Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to parse telemetry data" },
      { status: 500 },
    );
  }
}
