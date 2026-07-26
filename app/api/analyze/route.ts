import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { FloodAnalysis } from "@/types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    const prompt = `
      You are an expert flood risk analyst and multimodal AI system.
      Analyze this environmental telemetry image from Nigeria.
      
      1. Estimate the flood depth in meters by analyzing waterlines.
      2. Calculate a threat risk score from 1 to 10.
      3. Generate a strict safety alert translated into the requested local languages.
      4. Provide a brief 3-step reasoning log of your visual analysis.
      5. Provide estimated coordinates (lat/lng) for the region. Default to Lokoja (7.7969, 6.7333) if unsure.
      
      You MUST return your response as a valid JSON object with EXACTLY this structure, with no markdown formatting or backticks:
      {
        "estimatedWaterLevelMeters": 0.0,
        "riskScore": 0,
        "status": "CRITICAL",
        "coordinates": { "lat": 7.7969, "lng": 6.7333 },
        "alerts": {
          "english": "",
          "pidgin": "",
          "yoruba": "",
          "igbo": ""
        },
        "reasoningLogs": ["step 1", "step 2", "step 3"]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemma-4-26b-a4b-it",
      contents: [
        { text: prompt },
        { inlineData: { mimeType: imageFile.type, data: base64Data } },
      ],
    });

    if (!response.text) throw new Error("Empty response from Gemma");

    const cleanJsonString = response.text.replace(/```json|```/gi, "").trim();
    const analysis: FloodAnalysis = JSON.parse(cleanJsonString);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Gemma API Error:", error);
    return NextResponse.json(
      { error: "Failed to process telemetry data" },
      { status: 500 },
    );
  }
}
