"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import FloodVisualizer from "@/components/FloodVisualizer";
import { FloodAnalysis, Language } from "@/types";

const HazardMap = dynamic(() => import("@/components/HazardMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] bg-[#08080c] rounded-2xl flex items-center justify-center border border-white/10 text-xs font-mono text-gray-500">
      INITIALIZING MAP RADAR...
    </div>
  ),
});

// Haversine formula to calculate distance between two lat/lng coordinates in km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth's radius in km
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

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<FloodAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("english");
  const [activeTab, setActiveTab] = useState<"3D" | "MAP">("3D");

  // GPS Proximity State
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceKm, setDistanceKm] = useState<string | null>(null);

  // Request browser geolocation
  const handleLocateUser = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserCoords(coords);
          if (analysisData?.coordinates) {
            const dist = calculateDistanceKm(
              coords.lat,
              coords.lng,
              analysisData.coordinates.lat,
              analysisData.coordinates.lng
            );
            setDistanceKm(dist);
          }
        },
        (err) => alert("Could not fetch GPS location. Please allow location permissions.")
      );
    }
  };

  useEffect(() => {
    if (userCoords && analysisData?.coordinates) {
      const dist = calculateDistanceKm(
        userCoords.lat,
        userCoords.lng,
        analysisData.coordinates.lat,
        analysisData.coordinates.lng
      );
      setDistanceKm(dist);
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

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server returned ${res.status}: ${errText.slice(0, 100)}`);
      }

      const data: FloodAnalysis = await res.json();
      setAnalysisData(data);
    } catch (error: any) {
      console.error("Analysis Request Failed:", error);
      setErrorMessage(error.message || "Failed to analyze image.");
    } finally {
      setLoading(false);
    }
  };

  const handleAudioBroadcast = () => {
    if (!analysisData) return;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(analysisData.alerts[language]);
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <main className="min-h-screen bg-[#030308] text-gray-100 p-4 md:p-8 font-sans selection:bg-cyan-900 selection:text-white">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <header className="border-b border-white/10 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500">
              AMUYO
            </h1>
            <p className="text-gray-400 text-xs font-mono tracking-widest mt-0.5">
              AUTONOMOUS FLOOD & DISASTER TELEMETRY ENGINE
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
          
          {/* Left Column: Input, Camera, Diagnostics */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-[#090910] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
              <h2 className="text-xs font-mono uppercase tracking-widest text-cyan-400">
                TELEMETRY INGESTION
              </h2>

              {/* Standard File Upload without forced camera lock */}
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
                  <img src={previewUrl} alt="Telemetry target" className="object-cover w-full h-full" />
                </div>
              )}

              <button 
                onClick={handleUpload}
                disabled={loading || !file}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,240,255,0.15)]"
              >
                {loading ? "GEMMA IS ANALYZING..." : "RUN THREAT EVALUATION"}
              </button>

              {errorMessage && (
                <div className="p-3 bg-red-950/50 border border-red-800/50 rounded-xl text-xs text-red-300 font-mono">
                  {errorMessage}
                </div>
              )}
            </div>

            {/* Language Pills & Localized Alert Card */}
            {analysisData && (
              <div className="bg-[#090910] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <span className={`text-xs font-mono font-bold tracking-widest ${
                    analysisData.riskScore >= 7 ? "text-red-500" : "text-cyan-400"
                  }`}>
                    {analysisData.status} (R-{analysisData.riskScore}/10)
                  </span>

                  <button
                    onClick={handleAudioBroadcast}
                    className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[11px] font-mono text-gray-200 transition-all"
                  >
                    🔊 SPEAK
                  </button>
                </div>

                {/* Quick-Tap Dialect Buttons */}
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
                  {(["english", "pidgin", "yoruba", "igbo"] as Language[]).map((lang) => (
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
                  ))}
                </div>

                <div className="p-4 bg-black/50 rounded-xl border border-white/5 text-sm leading-relaxed text-gray-200">
                  {analysisData.alerts[language]}
                </div>

                {/* GPS Proximity Card */}
                {distanceKm && (
                  <div className="p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-xl flex justify-between items-center text-xs font-mono">
                    <span className="text-gray-400">PROXIMITY TO INCIDENT:</span>
                    <span className="text-cyan-400 font-bold">{distanceKm} KM AWAY</span>
                  </div>
                )}
              </div>
            )}

            {/* Reasoning Matrix */}
            {analysisData && (
              <div className="bg-[#090910] p-5 rounded-2xl border border-white/10 space-y-2">
                <h3 className="text-xs font-mono text-gray-400 uppercase tracking-widest">
                  GEMMA 4 REASONING LOGS
                </h3>
                <div className="space-y-2 text-xs font-mono text-gray-300 bg-black/40 p-3.5 rounded-xl border border-white/5">
                  {analysisData.reasoningLogs.map((log, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-cyan-500">[{i + 1}]</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Dynamic Digital Twin or Hazard Map */}
          <div className="lg:col-span-7 space-y-4">
            
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
                  LOCATION: <span className="text-white">{analysisData.locationName}</span>
                </span>
              )}
            </div>

            {/* View Switching */}
            {activeTab === "3D" ? (
              <FloodVisualizer data={analysisData} />
            ) : (
              <HazardMap data={analysisData} />
            )}

          </div>

        </div>
      </div>
    </main>
  );
}