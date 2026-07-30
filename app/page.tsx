"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { FloodAnalysis, Language } from "@/types";
import { siteTranslations } from "@/utils/translations";

const FloodVisualizer = dynamic(() => import("@/components/FloodVisualizer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] bg-[#0c0c0e] rounded-xl flex items-center justify-center border border-white/5 text-xs font-mono text-blue-400 animate-pulse">
      LOADING 3D SIMULATION...
    </div>
  ),
});

const HazardMap = dynamic(() => import("@/components/HazardMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] bg-[#0c0c0e] rounded-xl flex items-center justify-center border border-white/5 text-xs font-mono text-gray-500 animate-pulse">
      LOADING MAP...
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
  
  // Interactive Location State
  const [locationEnabled, setLocationEnabled] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  
  const [weatherSummary, setWeatherSummary] = useState<string>("Checking weather data...");
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);

  const t = siteTranslations[language];

  useEffect(() => {
    const fetchInitialWeather = async () => {
      try {
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=9.0&longitude=8.6&current=temperature_2m,precipitation&forecast_days=1");
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
            setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setLocationEnabled(true);
          },
          () => alert("Location permission denied by your browser.")
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
      // Compress image before sending to save upload time
      const getBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const MAX_WIDTH = 800; 
              const scaleSize = MAX_WIDTH / img.width;
              canvas.width = MAX_WIDTH;
              canvas.height = img.height * scaleSize;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", 0.7).split(",")[1]);
              } else {
                resolve((reader.result as string).split(",")[1]); 
              }
            };
          };
          reader.onerror = (error) => reject(error);
        });
      };
      
      const base64Data = await getBase64(file);

      // Call the restored route.ts backend
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64Data })
      });

      const responseData = await res.json();
      
      if (!res.ok) {
        throw new Error(responseData.error || "Server Error");
      }

      setAnalysisData(responseData);

      if (responseData.riskScore >= 7 || responseData.status === "CRITICAL") {
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
      const utterance = new SpeechSynthesisUtterance(analysisData.alerts[language]);
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <main className="min-h-screen bg-[#070709] text-gray-100 font-sans pb-12 relative overflow-x-hidden">
      
      {/* EMERGENCY MODAL */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all">
          <div className="bg-[#0c0c0e] border border-red-900/50 rounded-2xl w-full max-w-md p-6 shadow-[0_0_80px_rgba(255,0,60,0.25)] animate-in zoom-in-95 duration-300">
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 bg-red-950/80 rounded-full flex items-center justify-center border border-red-900 shadow-[0_0_30px_rgba(255,0,60,0.5)]">
                <span className="text-2xl animate-pulse">🚨</span>
              </div>
            </div>
            <h2 className="text-xl font-bold text-white text-center mb-2 tracking-wide uppercase">High Danger Level</h2>
            <p className="text-sm text-gray-400 text-center mb-6 leading-relaxed">
              This area is highly dangerous. Please evacuate to higher ground immediately.
            </p>
            <div className="space-y-3">
              <a href="tel:112" className="flex items-center justify-center w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold uppercase tracking-wider transition-colors shadow-[0_0_20px_rgba(220,38,38,0.4)]">
                📞 Call Emergency Services
              </a>
              <button onClick={() => setShowEmergencyModal(false)} className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAV BAR */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0c0c0f]/90 backdrop-blur-md sticky top-0 z-50">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-white">{t.navTitle}</h1>
          <p className="text-[10px] text-gray-400 font-mono">Flood Warning System</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Interactive Location Toggle */}
          <button 
            onClick={toggleLocation} 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">LOCATION</span>
            {locationEnabled ? (
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" title="Connected"></span>
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" title="Disconnected"></span>
            )}
          </button>

          <div className="relative">
            <button onClick={() => setIsLangModalOpen(!isLangModalOpen)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono hover:bg-white/10 transition-colors">
              🌐 {language.toUpperCase()} ⚙️
            </button>
            {isLangModalOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-[#121216] border border-white/15 rounded-xl shadow-2xl p-2 z-50">
                {(["english", "pidgin", "yoruba", "igbo"] as Language[]).map((lang) => (
                  <button key={lang} onClick={() => { setLanguage(lang); setIsLangModalOpen(false); }} className={`w-full text-left px-3 py-2 text-xs rounded-lg uppercase font-mono ${language === lang ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-white/5"}`}>
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-[1300px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-[#111115] rounded-2xl border border-white/10 p-5 shadow-xl">
            <h2 className="text-sm font-bold text-white mb-1">{t.uploadTitle}</h2>
            <p className="text-xs text-gray-400 mb-4">{t.uploadSubtitle}</p>

            <label className="block relative w-full h-48 rounded-xl border-2 border-dashed border-white/15 hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden group">
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              {previewUrl ? <img src={previewUrl} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" /> : <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-2"><span className="text-3xl animate-bounce">📱</span><span className="text-xs font-mono">Tap to upload photo</span></div>}
            </label>

            <button onClick={handleUpload} disabled={loading || !file} className="w-full mt-4 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.2)]">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              {loading ? t.analyzingBtn : t.analyzeBtn}
            </button>
            {errorMessage && <p className="mt-3 p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-xs text-red-400 font-mono break-words">Error: {errorMessage}</p>}
          </div>

          {/* Pre-Analysis Status UI (Simplified) */}
          {!analysisData && !loading && (
            <div className="bg-[#111115] rounded-2xl border border-white/10 p-5 shadow-xl animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                System Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-xs font-mono text-gray-400">Location:</span>
                  {locationEnabled ? (
                    <span className="text-xs font-mono text-green-400 font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> CONNECTED</span>
                  ) : (
                    <span className="text-xs font-mono text-red-400 font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> DISCONNECTED</span>
                  )}
                </div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-xs font-mono text-gray-400 block mb-1">Current Weather:</span>
                  <span className="text-xs font-mono text-cyan-200">{weatherSummary}</span>
                </div>
                
                <div className="p-4 border border-blue-900/30 bg-blue-950/10 rounded-xl mt-2">
                  <h4 className="text-xs font-bold text-blue-400 mb-1">What to do next</h4>
                  <p className="text-xs text-gray-400 leading-relaxed mb-3">
                    Please upload a photo of the flooded area to begin the analysis.
                  </p>
                  <button onClick={() => setActiveTab("MAP")} className="text-xs font-mono text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2 group">
                    <span className="group-hover:translate-x-1 transition-transform">&rarr;</span> Open Hazard Map
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Post-Analysis Metrics */}
          {analysisData && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#111115] border border-white/10 rounded-2xl p-4"><span className="text-xs text-gray-400">{t.waterPressure}</span><div className="text-xl font-bold font-mono text-white mt-1">{analysisData?.hydrostaticPressureKPa || "0.0"} <span className="text-xs text-blue-400">kPa</span></div></div>
                <div className="bg-[#111115] border border-white/10 rounded-2xl p-4"><span className="text-xs text-gray-400">{t.electricalRisk}</span><div className={`text-sm font-bold font-mono mt-1 ${analysisData?.electricalHazardLevel === "SEVERE" ? "text-red-400" : "text-yellow-400"}`}>{analysisData?.electricalHazardLevel || "Safe"}</div></div>
              </div>
              <div className="bg-[#111115] rounded-2xl border border-red-900/50 p-5 shadow-[0_0_20px_rgba(220,38,38,0.05)] animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between mb-3 items-center">
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider">⚠️ {t.threatTitle}: {analysisData?.status || "UNKNOWN"}</span>
                  <button onClick={handleAudioBroadcast} className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 transition-colors border border-red-800 text-red-200 text-xs rounded-lg font-mono flex items-center gap-2">🔊 {t.speakBtn}</button>
                </div>
                {/* Fallbacks removed: it will now display real data or show nothing if Gemma fails to supply it */}
                <div className="p-3.5 bg-black/50 rounded-xl border border-red-900/30 text-sm text-gray-200 leading-relaxed">{analysisData?.alerts?.[language]}</div>
              </div>
            </>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-[#111115] rounded-2xl border border-white/10 overflow-hidden flex flex-col h-[460px] shadow-xl">
            <div className="flex border-b border-white/10 bg-[#0a0a0d]">
              <button onClick={() => setActiveTab("3D")} className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === "3D" ? "text-blue-400 border-b-2 border-blue-500 bg-[#111115]" : "text-gray-500 hover:text-gray-300"}`}>{t.tab3D}</button>
              <button onClick={() => setActiveTab("MAP")} className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === "MAP" ? "text-blue-400 border-b-2 border-blue-500 bg-[#111115]" : "text-gray-500 hover:text-gray-300"}`}>{t.tabMap}</button>
            </div>
            <div className="flex-1 relative bg-black/20">
              {activeTab === "3D" ? <FloodVisualizer data={analysisData} /> : <HazardMap data={analysisData} />}
            </div>
          </div>

          {analysisData && (
            <div className="bg-[#111115] rounded-2xl border border-white/10 p-5 space-y-5 shadow-xl animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">{t.aiReasoning}</h3>
              <div className="space-y-3 text-xs font-mono text-gray-300 bg-black/40 p-4 rounded-xl border border-white/5">
                <div className="flex gap-2"><span className="text-blue-400">1.</span> <span>{analysisData?.reasoningChain?.visualBenchmark?.[language]}</span></div>
                <div className="flex gap-2"><span className="text-blue-400">2.</span> <span>{analysisData?.reasoningChain?.hydrodynamicForces?.[language]}</span></div>
                <div className="flex gap-2"><span className="text-blue-400">3.</span> <span>{analysisData?.reasoningChain?.predictiveEvacuationWindow?.[language]}</span></div>
              </div>

              <div className="pt-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t.fieldActions}</h4>
                <ul className="space-y-2 text-xs font-mono text-cyan-200">
                  {analysisData?.tacticalActionPlan?.[language]?.map((action, i) => (
                    <li key={i} className="flex gap-3 items-start bg-blue-950/20 p-2.5 rounded-lg border border-blue-900/30">
                      <span className="text-blue-400 mt-0.5">✓</span>
                      <span className="leading-relaxed">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}