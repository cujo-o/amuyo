"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { FloodAnalysis, Language } from "@/types";
import { siteTranslations } from "@/utils/translations";

const FloodVisualizer = dynamic(() => import("@/components/FloodVisualizer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[350px] md:h-[420px] bg-[#0c0c0e] rounded-xl flex items-center justify-center border border-white/5 text-xs font-mono text-blue-400 animate-pulse">
      LOADING 3D SIMULATION...
    </div>
  ),
});

const HazardMap = dynamic(() => import("@/components/HazardMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[350px] md:h-[420px] bg-[#0c0c0e] rounded-xl flex items-center justify-center border border-white/5 text-xs font-mono text-gray-500 animate-pulse">
      LOADING MAP...
    </div>
  ),
});

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("english");
  const [activeTab, setActiveTab] = useState<"3D" | "MAP">("3D");
  const [isLangModalOpen, setIsLangModalOpen] = useState<boolean>(false);

  const [locationEnabled, setLocationEnabled] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [weatherSummary, setWeatherSummary] = useState<string>(
    "Checking weather data...",
  );
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);

  const t = siteTranslations[language];

  useEffect(() => {
    const fetchInitialWeather = async () => {
      try {
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=9.0&longitude=8.6&current=temperature_2m,precipitation&forecast_days=1",
        );
        if (res.ok) {
          const data = await res.json();
          const rainStat = data.current.precipitation > 0 ? "Raining" : "Clear";
          setWeatherSummary(`${data.current.temperature_2m}°C | ${rainStat}`);
        }
      } catch {
        setWeatherSummary("Weather data unavailable.");
      }
    };
    fetchInitialWeather();
  }, []);

  const toggleLocation = () => {
    if (!locationEnabled) {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserCoords({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
            setLocationEnabled(true);
          },
          () => alert("Location permission denied by your browser."),
        );
      }
    } else {
      setLocationEnabled(false);
      setUserCoords(null);
    }
  };

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
    setAnalysisData(null);

    try {
      const getBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const MAX_WIDTH = 640;
              const scaleSize = MAX_WIDTH / img.width;
              canvas.width = MAX_WIDTH;
              canvas.height = img.height * scaleSize;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", 0.6).split(",")[1]);
              } else {
                resolve((reader.result as string).split(",")[1]);
              }
            };
          };
          reader.onerror = (error) => reject(error);
        });
      };

      const base64Data = await getBase64(file);

      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey)
        throw new Error(
          "API Key missing. Please set NEXT_PUBLIC_GEMINI_API_KEY in Vercel.",
        );

      const systemPrompt = `
        You are a rigid data-extraction API. You do not speak. You do not use markdown. 
        You output ONLY raw, valid JSON starting with { and ending with }. DO NOT output bullet points.
      `;

      const userPrompt = `
        Analyze this flood image.
        
        You MUST return your analysis using exactly this JSON structure. Do not use bullet points or extra text:
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
            "visualBenchmark": { "english": "Water is at window level", "pidgin": "Water don reach window", "yoruba": "Omi ti de ferese", "igbo": "Mmiri eruola na windo" },
            "hydrodynamicForces": { "english": "Currents are strong", "pidgin": "Water get force", "yoruba": "Omi lagbara", "igbo": "Mmiri siri ike" },
            "predictiveEvacuationWindow": { "english": "Evacuate immediately", "pidgin": "Comot now", "yoruba": "Kuro nibe bayi", "igbo": "Pụọ ozugbo" }
          },
          "tacticalActionPlan": {
            "english": ["Isolate power", "Deploy boats"],
            "pidgin": ["Off light", "Bring boat"],
            "yoruba": ["Pa ina", "Gbe oko omi wa"],
            "igbo": ["Gbanyuo ọkụ", "Weta ụgbọ mmiri"]
          },
          "alerts": { "english": "Evacuate!", "pidgin": "Comot there!", "yoruba": "Kuro nibe!", "igbo": "Pụọ ebe ahụ!" }
        }
      `;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: [
              {
                role: "user",
                parts: [
                  { text: userPrompt },
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
              maxOutputTokens: 2048,
            },
          }),
        },
      );

      const responseData = await res.json();
      if (!res.ok)
        throw new Error(responseData.error?.message || "Google API Error");

      const textResponse = responseData.candidates[0].content.parts[0].text;

      const extractValidJSON = (text: string) => {
        let cleaned = text
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();
        let startIndex = cleaned.indexOf("{");

        while (startIndex !== -1) {
          let depth = 0;
          for (let i = startIndex; i < cleaned.length; i++) {
            if (cleaned[i] === "{") depth++;
            else if (cleaned[i] === "}") {
              depth--;
              if (depth === 0) {
                const candidate = cleaned.substring(startIndex, i + 1);
                try {
                  const parsed = JSON.parse(candidate);
                  if (
                    parsed.estimatedWaterLevelMeters !== undefined ||
                    parsed.tacticalActionPlan ||
                    parsed.status
                  ) {
                    return candidate;
                  }
                } catch (e) {}
                break;
              }
            }
          }
          startIndex = cleaned.indexOf("{", startIndex + 1);
        }
        return null;
      };

      const cleanJson = extractValidJSON(textResponse);

      if (!cleanJson) {
        console.error("Gemma's Raw Output:", textResponse);
        throw new Error(
          "Gemma AI outputted an invalid response format. Please hit Analyze again.",
        );
      }

      let parsedData = JSON.parse(cleanJson);

      if (parsedData.floodAnalysis) parsedData = parsedData.floodAnalysis;
      else if (parsedData.analysis) parsedData = parsedData.analysis;
      else if (parsedData.data) parsedData = parsedData.data;

      if (!parsedData.status && !parsedData.hydrostaticPressureKPa) {
        parsedData._rawSchemaDrift = cleanJson;
      }

      setAnalysisData(parsedData);

      if (parsedData.riskScore >= 7 || parsedData.status === "CRITICAL") {
        setShowEmergencyModal(true);
      }
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleAudioBroadcast = () => {
    if (!analysisData || !analysisData.alerts?.[language]) return;
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
    <main className="min-h-screen bg-gradient-to-br from-[#050508] via-[#0e1017] to-[#050508] text-gray-100 font-sans pb-12 relative overflow-x-hidden selection:bg-blue-500/30">
      {showEmergencyModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all">
          <div className="bg-gradient-to-b from-[#13151c] to-[#0c0d12] border border-red-900/50 rounded-2xl w-full max-w-sm md:max-w-md p-6 shadow-[0_0_80px_rgba(255,0,60,0.25)] animate-in zoom-in-95 duration-300">
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 bg-red-950/80 rounded-full flex items-center justify-center border border-red-900 shadow-[0_0_30px_rgba(255,0,60,0.5)] text-red-500 font-black text-2xl">
                !
              </div>
            </div>
            <h2 className="text-xl font-bold text-white text-center mb-2 tracking-wide uppercase">
              High Danger Level
            </h2>
            <p className="text-sm text-gray-400 text-center mb-6 leading-relaxed">
              This area is highly dangerous. Please evacuate to higher ground
              immediately.
            </p>
            <div className="space-y-3">
              <a
                href="tel:112"
                className="flex items-center justify-center w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold uppercase tracking-wider transition-colors shadow-[0_0_20px_rgba(220,38,38,0.4)]"
              >
                CALL EMERGENCY (112)
              </a>
              <button
                onClick={() => setShowEmergencyModal(false)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE OPTIMIZED NAV */}
      <nav className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-white/5 bg-[#0a0c10]/70 backdrop-blur-xl sticky top-0 z-50">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500">
            {t.navTitle}
          </h1>
          <p className="text-[9px] md:text-[10px] text-blue-200/50 font-mono tracking-widest uppercase mt-0.5">
            Flood Warning System
          </p>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={toggleLocation}
            className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 rounded-xl bg-black/40 border border-white/5 hover:bg-white/5 transition-all shadow-lg cursor-pointer"
          >
            <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">
              LOCATION
            </span>
            {locationEnabled ? (
              <span
                className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)] animate-pulse"
                title="Connected"
              ></span>
            ) : (
              <span
                className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                title="Disconnected"
              ></span>
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setIsLangModalOpen(!isLangModalOpen)}
              className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 rounded-xl bg-blue-900/20 border border-blue-500/20 text-[10px] md:text-xs font-mono text-blue-100 hover:bg-blue-900/40 transition-all shadow-lg"
            >
              LANG: {language.substring(0, 3).toUpperCase()}
            </button>
            {isLangModalOpen && (
              <div className="absolute right-0 mt-3 w-40 bg-[#0e1017] border border-white/10 rounded-xl shadow-2xl p-2 z-50 backdrop-blur-xl">
                {(["english", "pidgin", "yoruba", "igbo"] as Language[]).map(
                  (lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLanguage(lang);
                        setIsLangModalOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-xs rounded-lg uppercase font-mono tracking-wider transition-colors ${language === lang ? "bg-blue-600 text-white shadow-md" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
                    >
                      {lang}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* MOBILE OPTIMIZED LAYOUT */}
      <div className="max-w-[1300px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 mt-2 md:mt-4">
        <div className="lg:col-span-5 flex flex-col gap-4 md:gap-6">
          <div className="bg-gradient-to-b from-[#13151c] to-[#0c0d12] rounded-3xl border border-white/5 p-4 md:p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>

            <h2 className="text-sm font-bold text-white mb-1">
              {t.uploadTitle}
            </h2>
            <p className="text-xs text-gray-400 mb-4">{t.uploadSubtitle}</p>

            <label className="block relative w-full h-40 md:h-52 rounded-2xl border-2 border-dashed border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer overflow-hidden group">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {previewUrl ? (
                <img
                  src={previewUrl}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg
                      className="w-6 h-6 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      ></path>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      ></path>
                    </svg>
                  </div>
                  <span className="text-xs font-mono tracking-wider">
                    Tap to upload photo
                  </span>
                </div>
              )}
            </label>

            <button
              onClick={handleUpload}
              disabled={loading || !file}
              className="w-full mt-4 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 disabled:grayscale flex justify-center items-center gap-3 shadow-[0_0_30px_rgba(37,99,235,0.2)]"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {loading ? "ANALYZING... (please hold on)" : t.analyzeBtn}
            </button>

            {errorMessage && (
              <p className="mt-4 p-4 bg-red-950/30 border border-red-900/30 rounded-xl text-xs text-red-400 font-mono break-words shadow-inner">
                Error: {errorMessage}
              </p>
            )}
          </div>

          <div className="bg-gradient-to-b from-[#13151c] to-[#0c0d12] rounded-3xl border border-white/5 p-4 md:p-6 shadow-2xl">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              System Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-[#0a0c10] rounded-2xl border border-white/5 shadow-inner">
                <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">
                  Location 
                </span>
                {locationEnabled ? (
                  <span className="text-xs font-mono text-green-400 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]"></span>{" "}
                    ACTIVE
                  </span>
                ) : (
                  <span className="text-xs font-mono text-red-400 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>{" "}
                    OFFLINE
                  </span>
                )}
              </div>
              <div className="p-4 bg-[#0a0c10] rounded-2xl border border-white/5 shadow-inner flex items-center justify-between">
                <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">
                  Local Weather
                </span>
                <span className="text-xs font-mono text-cyan-300 font-bold">
                  {weatherSummary}
                </span>
              </div>

              {!analysisData && !loading && (
                <div className="p-4 border border-blue-900/30 bg-blue-500/5 rounded-2xl mt-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
                  <h4 className="text-xs font-bold text-blue-400 mb-2 tracking-wider">
                    Ready for Analysis
                  </h4>
                  <p className="text-[11px] md:text-xs text-gray-400 leading-relaxed">
                    Please upload a photo of the flooded area. The AI will
                    utilize this visual data combined with your device sensors.
                  </p>
                </div>
              )}
            </div>
          </div>

          {analysisData && (
            <>
              {analysisData._rawSchemaDrift ? (
                <div className="bg-gradient-to-b from-red-950/30 to-[#0c0d12] border border-red-900/30 rounded-3xl p-4 md:p-6 shadow-2xl animate-in fade-in">
                  <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    SCHEMA DRIFT DETECTED
                  </h3>
                  <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                    Gemma 4 analyzed the image but returned a non-standard data
                    structure. Raw AI output below:
                  </p>
                  <pre className="text-[10px] text-red-300/80 font-mono bg-black/60 p-4 rounded-2xl overflow-x-auto border border-red-900/20 whitespace-pre-wrap shadow-inner">
                    {analysisData._rawSchemaDrift}
                  </pre>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="bg-gradient-to-b from-[#13151c] to-[#0c0d12] border border-white/5 rounded-2xl p-4 shadow-xl hover:border-white/10 transition-colors">
                      <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                        Water Depth
                      </span>
                      <div className="text-xl md:text-2xl font-black font-mono text-white mt-1">
                        {analysisData?.estimatedWaterLevelMeters || "0.0"}{" "}
                        <span className="text-xs md:text-sm text-blue-500">
                          m
                        </span>
                      </div>
                    </div>
                    <div className="bg-gradient-to-b from-[#13151c] to-[#0c0d12] border border-white/5 rounded-2xl p-4 shadow-xl hover:border-white/10 transition-colors">
                      <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                        Struct. Damage
                      </span>
                      <div className="text-xl md:text-2xl font-black font-mono text-yellow-400 mt-1">
                        {analysisData?.submergedStructuralPercentage || "0"}{" "}
                        <span className="text-xs md:text-sm text-yellow-600">
                          %
                        </span>
                      </div>
                    </div>
                    <div className="bg-gradient-to-b from-[#13151c] to-[#0c0d12] border border-white/5 rounded-2xl p-4 shadow-xl hover:border-white/10 transition-colors">
                      <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                        {t.waterPressure}
                      </span>
                      <div className="text-xl md:text-2xl font-black font-mono text-white mt-1">
                        {analysisData?.hydrostaticPressureKPa || "0.0"}{" "}
                        <span className="text-xs md:text-sm text-blue-500">
                          kPa
                        </span>
                      </div>
                    </div>
                    <div className="bg-gradient-to-b from-[#13151c] to-[#0c0d12] border border-white/5 rounded-2xl p-4 shadow-xl hover:border-white/10 transition-colors">
                      <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                        {t.electricalRisk}
                      </span>
                      <div
                        className={`text-sm md:text-lg font-black font-mono mt-2 tracking-wider ${analysisData?.electricalHazardLevel === "SEVERE" ? "text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" : "text-yellow-400"}`}
                      >
                        {analysisData?.electricalHazardLevel || "Safe"}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-b from-red-950/20 to-[#0c0d12] rounded-3xl border border-red-900/30 p-4 md:p-6 shadow-[0_0_30px_rgba(220,38,38,0.05)] animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-between mb-4 items-center">
                      <span className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                        {t.threatTitle}: {analysisData?.status || "UNKNOWN"}
                      </span>
                      <button
                        onClick={handleAudioBroadcast}
                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 transition-colors border border-red-500/20 text-red-300 text-[10px] md:text-xs rounded-lg font-mono flex items-center gap-2 shadow-sm uppercase"
                      >
                        LISTEN
                      </button>
                    </div>
                    <div className="p-4 bg-black/40 rounded-2xl border border-red-900/20 text-xs md:text-sm text-gray-200 leading-relaxed shadow-inner">
                      {analysisData?.alerts?.[language] ||
                        "Evacuation analysis pending."}
                    </div>

                    {/* 🚨 PERSISTENT EMERGENCY BUTTON */}
                    {(analysisData?.riskScore >= 7 ||
                      analysisData?.status === "CRITICAL") && (
                      <a
                        href="tel:112"
                        className="mt-4 w-full py-3.5 bg-red-600/90 hover:bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors shadow-[0_0_20px_rgba(220,38,38,0.3)] flex justify-center items-center"
                      >
                        CALL EMERGENCY (112)
                      </a>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="lg:col-span-7 flex flex-col gap-4 md:gap-6">
          <div className="bg-gradient-to-b from-[#13151c] to-[#0c0d12] rounded-3xl border border-white/5 overflow-hidden flex flex-col h-[400px] md:h-[480px] shadow-2xl">
            <div className="flex border-b border-white/5 bg-[#0a0c10]/50 backdrop-blur-md">
              <button
                onClick={() => setActiveTab("3D")}
                className={`flex-1 py-3 md:py-4 text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "3D" ? "text-blue-400 border-b-2 border-blue-500 bg-blue-500/5" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}
              >
                {t.tab3D}
              </button>
              <button
                onClick={() => setActiveTab("MAP")}
                className={`flex-1 py-3 md:py-4 text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "MAP" ? "text-blue-400 border-b-2 border-blue-500 bg-blue-500/5" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}
              >
                {t.tabMap}
              </button>
            </div>
            <div className="flex-1 relative bg-black/40 shadow-inner">
              {activeTab === "3D" ? (
                <FloodVisualizer data={analysisData} />
              ) : (
                <HazardMap data={analysisData} userCoords={userCoords} />
              )}
            </div>
          </div>

          {analysisData && !analysisData._rawSchemaDrift && (
            <div className="bg-gradient-to-b from-[#13151c] to-[#0c0d12] rounded-3xl border border-white/5 p-4 md:p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">
                {t.aiReasoning}
              </h3>
              <div className="space-y-3 text-[11px] md:text-xs font-mono text-gray-300 bg-[#0a0c10] p-4 md:p-5 rounded-2xl border border-white/5 shadow-inner">
                <div className="flex gap-3">
                  <span className="text-blue-500/50 font-black">01.</span>{" "}
                  <span className="leading-relaxed">
                    {analysisData?.reasoningChain?.visualBenchmark?.[
                      language
                    ] || "Processing telemetry..."}
                  </span>
                </div>
                <div className="flex gap-3">
                  <span className="text-blue-500/50 font-black">02.</span>{" "}
                  <span className="leading-relaxed">
                    {analysisData?.reasoningChain?.hydrodynamicForces?.[
                      language
                    ] || "Calculating flow rates..."}
                  </span>
                </div>
                <div className="flex gap-3">
                  <span className="text-blue-500/50 font-black">03.</span>{" "}
                  <span className="leading-relaxed">
                    {analysisData?.reasoningChain?.predictiveEvacuationWindow?.[
                      language
                    ] || "Evaluating risk vectors..."}
                  </span>
                </div>
              </div>

              <div className="pt-5">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 md:mb-4">
                  {t.fieldActions}
                </h4>
                <ul className="space-y-2 text-[11px] md:text-xs font-mono text-cyan-100">
                  {(analysisData?.tacticalActionPlan?.[language] || []).map(
                    (action: string, i: number) => (
                      <li
                        key={i}
                        className="flex gap-3 items-center bg-blue-500/5 hover:bg-blue-500/10 transition-colors p-3 rounded-xl border border-blue-500/10"
                      >
                        <span className="text-blue-400 bg-blue-900/30 p-1 rounded-md leading-none">
                          ✓
                        </span>
                        <span className="leading-relaxed">{action}</span>
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
