"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { FloodAnalysis, Language } from "@/types";

// 1. FIX THE BLACK SCREEN: Force client-side rendering for Three.js WebGL
const FloodVisualizer = dynamic(() => import("@/components/FloodVisualizer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] bg-[#08080c] rounded-2xl flex items-center justify-center border border-white/10 text-xs font-mono text-cyan-500">
      INITIALIZING 3D WEBGL ENGINE...
    </div>
  ),
});

const HazardMap = dynamic(() => import("@/components/HazardMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] bg-[#08080c] rounded-2xl flex items-center justify-center border border-white/10 text-xs font-mono text-gray-500">
      INITIALIZING GEOSPATIAL RADAR...
    </div>
  ),
});

function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
}

// 2. FIX MOBILE CRASH: Memory-safe compression utilizing createObjectURL with Fallbacks
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    // If the file is already small (< 1MB), bypass compression entirely
    if (file.size < 1024 * 1024) return resolve(file);

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 1024;
      const MAX_HEIGHT = 1024;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      // Fallback: If mobile browser blocks canvas context, send original file
      if (!ctx) return resolve(file);

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          } else {
            resolve(file); // Fallback if blob creation fails
          }
        },
        "image/jpeg",
        0.8,
      );
    };

    // Fallback: If image fails to load into memory, don't hang—send the original file
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
};

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<FloodAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("english");
  const [activeTab, setActiveTab] = useState<"3D" | "MAP">("3D");

  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [distanceKm, setDistanceKm] = useState<string | null>(null);

  const handleLocateUser = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setUserCoords(coords);
          if (analysisData?.coordinates) {
            setDistanceKm(
              calculateDistanceKm(
                coords.lat,
                coords.lng,
                analysisData.coordinates.lat,
                analysisData.coordinates.lng,
              ),
            );
          }
        },
        () => alert("GPS access declined. Defaulting to regional telemetry."),
      );
    }
  };

  useEffect(() => {
    if (userCoords && analysisData?.coordinates) {
      setDistanceKm(
        calculateDistanceKm(
          userCoords.lat,
          userCoords.lng,
          analysisData.coordinates.lat,
          analysisData.coordinates.lng,
        ),
      );
    }
  }, [analysisData, userCoords]);

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

    // 3. FIX UI HANG: Yield main thread so the mobile browser can visually update the button to "COMPRESSING..."
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const compressedImage = await compressImage(file);

      const formData = new FormData();
      formData.append("image", compressedImage);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server ${res.status}: ${errText.slice(0, 100)}`);
      }

      const data: FloodAnalysis = await res.json();
      setAnalysisData(data);
    } catch (error: any) {
      console.error("Analysis Error:", error);
      setErrorMessage(error.message || "Failed to analyze telemetry image.");
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
    <main className="min-h-screen bg-[#030308] text-gray-100 p-4 md:p-8 font-sans selection:bg-cyan-900 selection:text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Bar */}
        <header className="border-b border-white/10 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500">
              AMUYO INTELLIGENCE
            </h1>
            <p className="text-gray-400 text-xs font-mono tracking-widest mt-0.5">
              AUTONOMOUS HYDROLOGICAL & DISASTER TELEMETRY MATRIX
            </p>
          </div>

          <button
            onClick={handleLocateUser}
            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-mono text-cyan-400 flex items-center gap-2 transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            {userCoords ? "GPS ACTIVE" : "ENABLE LIVE GPS RADAR"}
          </button>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Input & Telemetry Data */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#090910] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
              <h2 className="text-xs font-mono uppercase tracking-widest text-cyan-400">
                TELEMETRY INGESTION
              </h2>

              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-xs text-gray-400
                  file:mr-4 file:py-2.5 file:px-4
                  file:rounded-xl file:border-0
                  file:text-xs file:font-mono file:uppercase file:font-bold
                  file:bg-cyan-950 file:text-cyan-400
                  hover:file:bg-cyan-900 transition-all cursor-pointer"
              />

              {previewUrl && (
                <div className="relative h-44 w-full rounded-xl overflow-hidden border border-white/10">
                  <img
                    src={previewUrl}
                    alt="Telemetry target"
                    className="object-cover w-full h-full"
                  />
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={loading || !file}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,240,255,0.15)] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    COMPRESSING & ANALYZING...
                  </>
                ) : (
                  "EXECUTE ENGINEERING EVALUATION"
                )}
              </button>

              {errorMessage && (
                <div className="p-3 bg-red-950/50 border border-red-800/50 rounded-xl text-xs text-red-300 font-mono">
                  {errorMessage}
                </div>
              )}
            </div>

            {/* Quantitative Physical Telemetry Metrics */}
            {analysisData && (
              <div className="bg-[#090910] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h3 className="text-xs font-mono uppercase tracking-widest text-cyan-400">
                  HYDROLOGICAL TELEMETRY
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                    <div className="text-[10px] font-mono text-gray-400">
                      HYDROSTATIC PRESSURE
                    </div>
                    <div className="text-lg font-bold font-mono text-cyan-300">
                      {analysisData.hydrostaticPressureKPa}{" "}
                      <span className="text-xs font-normal">kPa</span>
                    </div>
                  </div>

                  <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                    <div className="text-[10px] font-mono text-gray-400">
                      ELECTRICAL HAZARD
                    </div>
                    <div
                      className={`text-sm font-bold font-mono ${
                        analysisData.electricalHazardLevel === "SEVERE" ||
                        analysisData.electricalHazardLevel === "EXTREME"
                          ? "text-red-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {analysisData.electricalHazardLevel}
                    </div>
                  </div>

                  <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                    <div className="text-[10px] font-mono text-gray-400">
                      VEHICLE ACCESSIBILITY
                    </div>
                    <div className="text-xs font-bold font-mono text-white">
                      {analysisData.vehicleAccessClass.replace(/_/g, " ")}
                    </div>
                  </div>

                  <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                    <div className="text-[10px] font-mono text-gray-400">
                      SUBMERGED INFRASTRUCTURE
                    </div>
                    <div className="text-lg font-bold font-mono text-cyan-300">
                      {analysisData.submergedStructuralPercentage}%
                    </div>
                  </div>
                </div>

                {distanceKm && (
                  <div className="p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-xl flex justify-between items-center text-xs font-mono">
                    <span className="text-gray-400">
                      PROXIMITY TO INCIDENT:
                    </span>
                    <span className="text-cyan-400 font-bold">
                      {distanceKm} KM AWAY
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Language Pills & Localized Alert Card */}
            {analysisData && (
              <div className="bg-[#090910] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <span
                    className={`text-xs font-mono font-bold tracking-widest ${
                      analysisData.riskScore >= 7
                        ? "text-red-500"
                        : "text-cyan-400"
                    }`}
                  >
                    {analysisData.status} (R-{analysisData.riskScore}/10)
                  </span>

                  <button
                    onClick={handleAudioBroadcast}
                    className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[11px] font-mono text-gray-200 transition-all"
                  >
                    🔊 SPEAK ALOUD
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
                  {(["english", "pidgin", "yoruba", "igbo"] as Language[]).map(
                    (lang) => (
                      <button
                        key={lang}
                        onClick={() => setLanguage(lang)}
                        className={`py-1.5 text-[11px] font-mono uppercase tracking-wider rounded-lg transition-all ${
                          language === lang
                            ? "bg-cyan-950 text-cyan-300 font-bold border border-cyan-800/50"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        {lang.slice(0, 3)}
                      </button>
                    ),
                  )}
                </div>

                <div className="p-4 bg-black/50 rounded-xl border border-white/5 text-sm leading-relaxed text-gray-200">
                  {analysisData.alerts[language]}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Visualizations & Engineering Reasoning */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab("3D")}
                  className={`text-xs font-mono uppercase tracking-widest pb-2 transition-all ${
                    activeTab === "3D"
                      ? "text-cyan-400 border-b-2 border-cyan-400 font-bold"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  3D Digital Twin
                </button>
                <button
                  onClick={() => setActiveTab("MAP")}
                  className={`text-xs font-mono uppercase tracking-widest pb-2 transition-all ${
                    activeTab === "MAP"
                      ? "text-cyan-400 border-b-2 border-cyan-400 font-bold"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  Geospatial Radar
                </button>
              </div>

              {analysisData && (
                <span className="text-xs font-mono text-gray-400">
                  LOCATION:{" "}
                  <span className="text-white">
                    {analysisData.locationName}
                  </span>
                </span>
              )}
            </div>

            {/* View Switching */}
            {activeTab === "3D" ? (
              <FloodVisualizer data={analysisData} />
            ) : (
              <HazardMap data={analysisData} />
            )}

            {/* Gemma 4 Deep Engineering Reasoning Chain */}
            {analysisData && (
              <div className="bg-[#090910] p-6 rounded-2xl border border-white/10 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h3 className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
                  GEMMA 4 REASONING & TACTICAL ANALYSIS
                </h3>

                <div className="space-y-3 text-xs font-mono text-gray-300">
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                    <span className="text-cyan-500 font-bold">
                      [VISUAL BENCHMARK CALIBRATION]
                    </span>
                    <p className="mt-1 text-gray-300">
                      {analysisData.reasoningChain.visualBenchmark}
                    </p>
                  </div>

                  <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                    <span className="text-cyan-500 font-bold">
                      [HYDRODYNAMIC STRESS ANALYSIS]
                    </span>
                    <p className="mt-1 text-gray-300">
                      {analysisData.reasoningChain.hydrodynamicForces}
                    </p>
                  </div>

                  <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                    <span className="text-cyan-500 font-bold">
                      [PREDICTIVE IMPASSABILITY WINDOW]
                    </span>
                    <p className="mt-1 text-gray-300">
                      {analysisData.reasoningChain.predictiveEvacuationWindow}
                    </p>
                  </div>
                </div>

                {/* Tactical Response Action Plan */}
                <div className="pt-2">
                  <h4 className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-2">
                    FIELD RESPONDER ACTION PROTOCOL
                  </h4>
                  <ul className="space-y-1.5 font-mono text-xs text-cyan-200">
                    {analysisData.tacticalActionPlan.map((action, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-cyan-500">►</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
