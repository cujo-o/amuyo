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
      You are Amuyo's Senior Hydrological & Disaster Intelligence AI Engine.
      Perform a deep civil engineering and crisis management evaluation of this environmental telemetry image from Nigeria.

      DO NOT state obvious generic descriptions like "the water is high". Perform deep quantitative extraction:

      1. Visual Benchmark Calibration: Identify visual anchor points (e.g., vehicle tires [~0.6m], door handles [~1.0m], wall lines, human body submergence) to precisely estimate water depth in meters.
      2. Hydrodynamic Force Analysis: Calculate Hydrostatic Pressure in kPa (P = 9.81 * depth).
      3. Electrical & Infrastructure Hazard Assessment: Evaluate risk of electrocution, open drainage channels, or submerged transformers (LOW, MODERATE, SEVERE, EXTREME).
      4. Emergency Vehicle Accessibility: Classify vehicle passability (ALL_VEHICLES, HEAVY_ONLY, HIGH_CLEARANCE_ONLY, IMPASSABLE).
      5. Formulate a 4-part multi-step engineering reasoning chain (visualBenchmark, hydrodynamicForces, infrastructureVulnerability, predictiveEvacuationWindow).
      6. Provide 3 tactical action steps for emergency responders.
      7. Provide localized public broadcast messages in English, Pidgin, Yoruba, and Igbo.

      Return ONLY a valid raw JSON object matching this EXACT structure with NO markdown or backticks:
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
        "locationName": "Lokoja Drainage Basin, Kogi State",
        "coordinates": { "lat": 7.7969, "lng": 6.7333 },
        "reasoningChain": {
          "visualBenchmark": "Waterline is submerged past the wheel arches of visible vehicles (~0.7m) and reaching door handle height on adjacent structures (~1.4m).",
          "hydrodynamicForces": "Hydrostatic force calculated at ~14.2 kPa. Turbulent current creates structural shear stress on unreinforced masonry walls.",
          "infrastructureVulnerability": "Submerged low-voltage junction boxes present severe electrocution hazard within a 15-meter radius.",
          "predictiveEvacuationWindow": "Roadway will become completely impassable for all rescue vehicles within 30-45 minutes if rainfall continues."
        },
        "tacticalActionPlan": [
          "Isolate local power distribution feeder line ID-4 to prevent waterborne electrocution.",
          "Deploy high-clearance 4x4 or inflatable watercraft for civilian evacuation.",
          "Establish secondary containment barrier 200m south of current flood fringe."
        ],
        "alerts": {
          "english": "CRITICAL HAZARD: Deep floodwaters (1.45m) with severe electrocution risk detected in Lokoja Basin. Only high-clearance rescue vehicles can navigate. Evacuate to higher ground immediately.",
          "pidgin": "DANGER DEY: Water don deep reach 1.45m for Lokoja Basin and light fit shock person for water! Only big trailer/4x4 fit pass. Make everybody move go high place now now!",
          "yoruba": "EWU NLA: Omi ti gbe de mita 1.45 ni Lokoja Basin ati ina le mu eyan ninu omi! Awon oko nla nikan lo le koja. E lo si ibi giga ni kiakiai.",
          "igbo": "EGWU DIRI: Mmiri gburu emu 1.45m n'ala Lokoja Basin na mberede oku nwere ike igbu mmadu! Biko gbalaga n'ebe dị elu ubochi a."
        }
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
      { error: error?.message || "Failed to process telemetry data" },
      { status: 500 },
    );
  }
}
