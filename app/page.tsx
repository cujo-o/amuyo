"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { FloodAnalysis, Language } from "@/types";
import { siteTranslations } from "@/utils/translations";

const FloodVisualizer = dynamic(() => import("@/components/FloodVisualizer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] bg-[#0c0c0e] rounded-xl flex items-center justify-center border border-white/5 text-xs font-mono text-blue-400 animate-pulse">
      LOADING 3D WATER SIMULATION...
    </div>
  ),
});

const HazardMap = dynamic(() => import("@/components/HazardMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] bg-[#0c0c0e] rounded-xl flex items-center justify-center border border-white/5 text-xs font-mono text-gray-500 animate-pulse">
      LOADING HAZARD MAP...
    </div>
  ),
});

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<FloodAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("english");
  const [activeTab, setActiveTab] = useState<"3D" | "MAP">("3D");
  const [isLangModalOpen, setIsLangModalOpen] = useState<boolean>(false);

  const t = siteTranslations[language];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setErrorMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Convert Image to Base64 directly in the browser
      const getBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () =>
            resolve((reader.result as string).split(",")[1]);
          reader.onerror = (error) => reject(error);
        });
      };

      const base64Data = await getBase64(file);

      // 2. Fetch Weather (Non-blocking)
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
        console.warn("Weather API skipped for speed.");
      }

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

      // 3. VERCEL BYPASS: Direct REST API call to Google Gemma 4
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey)
        throw new Error(
          "API Key missing. Please set NEXT_PUBLIC_GEMINI_API_KEY in Vercel.",
        );

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: file.type || "image/jpeg",
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json",
            },
          }),
        },
      );

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error?.message || "Google API Error");
      }

      const textResponse = responseData.candidates[0].content.parts[0].text;

      // ⚡ BULLETPROOF JSON EXTRACTOR: Mathematically isolates ONLY the first balanced JSON object
      const extractValidJSON = (text: string) => {
        const start = text.indexOf("{");
        if (start === -1) return null;
        let depth = 0;
        for (let i = start; i < text.length; i++) {
          if (text[i] === "{") depth++;
          else if (text[i] === "}") {
            depth--;
            if (depth === 0) return text.substring(start, i + 1); // Stops at the exact closing brace
          }
        }
        return null;
      };

      const cleanJson = extractValidJSON(textResponse);

      if (!cleanJson) {
        throw new Error("Could not extract valid JSON from Gemma's response.");
      }

      const analysis: FloodAnalysis = JSON.parse(cleanJson);
      setAnalysisData(analysis);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleAudioBroadcast = () => {
    if (!analysisData) return;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        analysisData.alerts[language],
      );
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <main className="min-h-screen bg-[#070709] text-gray-100 font-sans pb-12">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0c0c0f] sticky top-0 z-50">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-white">
            {t.navTitle}
          </h1>
          <p className="text-[10px] text-gray-400 font-mono">
            Crowdsourced Flood Defense
          </p>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsLangModalOpen(!isLangModalOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono hover:bg-white/10"
          >
            🌐 {language.toUpperCase()} ⚙️
          </button>
          {isLangModalOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-[#121216] border border-white/15 rounded-xl shadow-2xl p-2 z-50">
              {(["english", "pidgin", "yoruba", "igbo"] as Language[]).map(
                (lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setLanguage(lang);
                      setIsLangModalOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg uppercase font-mono ${language === lang ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-white/5"}`}
                  >
                    {lang}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-[1300px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-[#111115] rounded-2xl border border-white/10 p-5 shadow-xl">
            <h2 className="text-sm font-bold text-white mb-1">
              {t.uploadTitle}
            </h2>
            <p className="text-xs text-gray-400 mb-4">{t.uploadSubtitle}</p>

            <label className="block relative w-full h-44 rounded-xl border-2 border-dashed border-white/15 hover:border-blue-500 cursor-pointer overflow-hidden group">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {previewUrl ? (
                <img
                  src={previewUrl}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                  <span className="text-3xl">📱</span>
                </div>
              )}
            </label>

            <button
              onClick={handleUpload}
              disabled={loading || !file}
              className="w-full mt-4 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase transition-all disabled:opacity-40 flex justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              {loading ? t.analyzingBtn : t.analyzeBtn}
            </button>
            {errorMessage && (
              <p className="mt-3 p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-xs text-red-400 font-mono break-words">
                Error: {errorMessage}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#111115] border border-white/10 rounded-2xl p-4">
              <span className="text-xs text-gray-400">{t.waterPressure}</span>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {analysisData?.hydrostaticPressureKPa || "0.0"}{" "}
                <span className="text-xs text-blue-400">kPa</span>
              </div>
            </div>
            <div className="bg-[#111115] border border-white/10 rounded-2xl p-4">
              <span className="text-xs text-gray-400">{t.electricalRisk}</span>
              <div
                className={`text-sm font-bold font-mono mt-1 ${analysisData?.electricalHazardLevel === "SEVERE" ? "text-red-400" : "text-yellow-400"}`}
              >
                {analysisData?.electricalHazardLevel || "Safe"}
              </div>
            </div>
          </div>

          {analysisData && (
            <div className="bg-[#111115] rounded-2xl border border-red-900/50 p-5 shadow-xl animate-in fade-in">
              <div className="flex justify-between mb-3">
                <span className="text-xs font-bold text-red-400 uppercase">
                  ⚠️ {t.threatTitle}: {analysisData.status}
                </span>
                <button
                  onClick={handleAudioBroadcast}
                  className="px-2.5 py-1 bg-red-950 border border-red-800 text-red-200 text-xs rounded-lg font-mono"
                >
                  🔊 {t.speakBtn}
                </button>
              </div>
              <div className="p-3.5 bg-black/40 rounded-xl text-sm text-gray-200">
                {analysisData.alerts[language]}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-[#111115] rounded-2xl border border-white/10 overflow-hidden flex flex-col h-[460px]">
            <div className="flex border-b border-white/10 bg-[#0a0a0d]">
              <button
                onClick={() => setActiveTab("3D")}
                className={`flex-1 py-3.5 text-xs font-bold uppercase ${activeTab === "3D" ? "text-blue-400 border-b-2 border-blue-500 bg-[#111115]" : "text-gray-500"}`}
              >
                {t.tab3D}
              </button>
              <button
                onClick={() => setActiveTab("MAP")}
                className={`flex-1 py-3.5 text-xs font-bold uppercase ${activeTab === "MAP" ? "text-blue-400 border-b-2 border-blue-500 bg-[#111115]" : "text-gray-500"}`}
              >
                {t.tabMap}
              </button>
            </div>
            <div className="flex-1 relative">
              {activeTab === "3D" ? (
                <FloodVisualizer
                  data={analysisData}
                  imageTextureUrl={previewUrl}
                />
              ) : (
                <HazardMap data={analysisData} />
              )}
            </div>
          </div>

          {analysisData && (
            <div className="bg-[#111115] rounded-2xl border border-white/10 p-5 space-y-4 animate-in fade-in">
              <h3 className="text-xs font-bold text-blue-400 uppercase">
                {t.aiReasoning}
              </h3>
              <div className="space-y-2 text-xs font-mono text-gray-300 bg-black/40 p-4 rounded-xl border border-white/5">
                <div>
                  <span className="text-blue-400">1.</span>{" "}
                  {analysisData.reasoningChain.visualBenchmark[language]}
                </div>
                <div>
                  <span className="text-blue-400">2.</span>{" "}
                  {analysisData.reasoningChain.hydrodynamicForces[language]}
                </div>
                <div>
                  <span className="text-blue-400">3.</span>{" "}
                  {
                    analysisData.reasoningChain.predictiveEvacuationWindow[
                      language
                    ]
                  }
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-400 mb-2">
                  {t.fieldActions}
                </h4>
                <ul className="space-y-1.5 text-xs font-mono text-cyan-200">
                  {analysisData.tacticalActionPlan[language].map(
                    (action, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-blue-400">✓</span>
                        <span>{action}</span>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
