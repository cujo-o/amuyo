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
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const t = siteTranslations[language];

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        (err) => console.log("GPS prompt declined"),
      );
    }
  }, []);

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
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      // EXPLICIT ERROR CATCHING: Shows exact Gemma/Vercel failure reason
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.error ||
            `Server Status ${res.status}: Check API Key or Model Name`,
        );
      }

      const data: FloodAnalysis = await res.json();
      setAnalysisData(data);
    } catch (error: any) {
      setErrorMessage(error.message); // Will print exact reason on screen
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
    <main className="min-h-screen bg-[#070709] text-gray-100 font-sans selection:bg-blue-900 pb-12 transition-all">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0c0c0f]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-wider text-white">
              {t.navTitle}
            </h1>
            <p className="text-[10px] text-gray-400 font-mono">
              Crowdsourced Flood Defense
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsLangModalOpen(!isLangModalOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono text-gray-300 transition-all"
          >
            🌐 {language.toUpperCase()} ⚙️
          </button>

          {isLangModalOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-[#121216] border border-white/15 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
              <p className="text-[10px] text-gray-400 px-2 py-1 uppercase font-mono border-b border-white/5 mb-1">
                Select Site Language
              </p>
              {(["english", "pidgin", "yoruba", "igbo"] as Language[]).map(
                (lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setLanguage(lang);
                      setIsLangModalOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg uppercase font-mono transition-colors ${
                      language === lang
                        ? "bg-blue-600 text-white font-bold"
                        : "text-gray-300 hover:bg-white/5"
                    }`}
                  >
                    {lang}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-[1300px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-[#111115] rounded-2xl border border-white/10 p-5 shadow-xl">
            <h2 className="text-sm font-bold text-white mb-1">
              {t.uploadTitle}
            </h2>
            <p className="text-xs text-gray-400 mb-4">{t.uploadSubtitle}</p>

            <label className="block relative w-full h-44 rounded-xl border-2 border-dashed border-white/15 hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden group">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Target"
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <span className="text-3xl animate-bounce">📱</span>
                  <span className="text-xs font-mono text-gray-400">
                    {t.uploadSubtitle}
                  </span>
                </div>
              )}
            </label>

            <button
              onClick={handleUpload}
              disabled={loading || !file}
              className="w-full mt-4 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t.analyzingBtn}
                </>
              ) : (
                t.analyzeBtn
              )}
            </button>
            {errorMessage && (
              <div className="mt-3 p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-xs text-red-400 font-mono break-words">
                <strong>Error:</strong> {errorMessage}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#111115] border border-white/10 rounded-2xl p-4">
              <span className="text-xs text-gray-400 font-medium">
                {t.waterPressure}
              </span>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {analysisData?.hydrostaticPressureKPa || "0.0"}{" "}
                <span className="text-xs text-blue-400">kPa</span>
              </div>
            </div>
            <div className="bg-[#111115] border border-white/10 rounded-2xl p-4">
              <span className="text-xs text-gray-400 font-medium">
                {t.electricalRisk}
              </span>
              <div
                className={`text-sm font-bold font-mono mt-1 ${analysisData?.electricalHazardLevel === "SEVERE" ? "text-red-400" : "text-yellow-400"}`}
              >
                {analysisData?.electricalHazardLevel || "Safe"}
              </div>
            </div>
            <div className="bg-[#111115] border border-white/10 rounded-2xl p-4">
              <span className="text-xs text-gray-400 font-medium">
                {t.vehicleAccess}
              </span>
              <div className="text-xs font-bold font-mono text-white mt-1">
                {analysisData?.vehicleAccessClass.replace(/_/g, " ") ||
                  "All Cars"}
              </div>
            </div>
            <div className="bg-[#111115] border border-white/10 rounded-2xl p-4">
              <span className="text-xs text-gray-400 font-medium">
                {t.submergedInfra}
              </span>
              <div className="text-xl font-bold font-mono text-blue-400 mt-1">
                {analysisData?.submergedStructuralPercentage || "0"}%
              </div>
            </div>
          </div>

          {analysisData && (
            <div className="bg-[#111115] rounded-2xl border border-red-900/50 p-5 shadow-xl animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                  ⚠️ {t.threatTitle}: {analysisData.status} (
                  {analysisData.riskScore}/10)
                </span>
                <button
                  onClick={handleAudioBroadcast}
                  className="px-2.5 py-1 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-lg font-mono hover:bg-red-900 transition-colors"
                >
                  🔊 {t.speakBtn}
                </button>
              </div>
              <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 text-sm text-gray-200 leading-relaxed">
                {analysisData.alerts[language]}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-[#111115] rounded-2xl border border-white/10 overflow-hidden flex flex-col h-[460px]">
            <div className="flex border-b border-white/10 bg-[#0a0a0d]">
              <button
                onClick={() => setActiveTab("3D")}
                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === "3D" ? "text-blue-400 border-b-2 border-blue-500 bg-[#111115]" : "text-gray-500 hover:text-gray-300"}`}
              >
                {t.tab3D}
              </button>
              <button
                onClick={() => setActiveTab("MAP")}
                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === "MAP" ? "text-blue-400 border-b-2 border-blue-500 bg-[#111115]" : "text-gray-500 hover:text-gray-300"}`}
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
            <div className="bg-[#111115] rounded-2xl border border-white/10 p-5 space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                {t.aiReasoning}
              </h3>
              <div className="space-y-2 text-xs font-mono text-gray-300 bg-black/40 p-4 rounded-xl border border-white/5">
                <div>
                  <span className="text-blue-400">1.</span>{" "}
                  {analysisData.reasoningChain.visualBenchmark}
                </div>
                <div>
                  <span className="text-blue-400">2.</span>{" "}
                  {analysisData.reasoningChain.hydrodynamicForces}
                </div>
                <div>
                  <span className="text-blue-400">3.</span>{" "}
                  {analysisData.reasoningChain.predictiveEvacuationWindow}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-400 mb-2">
                  {t.fieldActions}
                </h4>
                <ul className="space-y-1.5 text-xs font-mono text-cyan-200">
                  {analysisData.tacticalActionPlan.map((action, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-blue-400">✓</span>
                      <span>{action}</span>
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
