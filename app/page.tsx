"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import FloodVisualizer from "@/components/FloodVisualizer";
import { FloodAnalysis, Language } from "@/types";

// Dynamic import for Leaflet to fix Next.js SSR window errors
const HazardMap = dynamic(() => import("@/components/HazardMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-[#0a0a0a] rounded-xl flex items-center justify-center text-white/30 text-xs tracking-widest uppercase">
      Loading Map Engine...
    </div>
  ),
});

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<FloodAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [language, setLanguage] = useState<Language>("english");
  const [activeTab, setActiveTab] = useState<"3D" | "MAP">("3D");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setAnalysisData(data);
    } catch (error) {
      console.error("Failed to fetch analysis", error);
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
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-gray-200 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="border-b border-white/10 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              AMUYO
            </h1>
            <p className="text-white/40 text-xs uppercase tracking-widest mt-1">
              Citizen Telemetry Node
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Input and Diagnostics */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-white/5">
              <input
                type="file"
                accept="image/*"
                capture="environment" // Opens native camera on mobile
                onChange={handleFileChange}
                className="block w-full text-sm text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:uppercase file:bg-white/10 file:text-white hover:file:bg-white/20 transition-all cursor-pointer mb-6"
              />

              {previewUrl && (
                <div className="relative h-48 w-full rounded-xl overflow-hidden mb-6 opacity-80 mix-blend-screen">
                  <img
                    src={previewUrl}
                    alt="Target Area"
                    className="object-cover w-full h-full grayscale contrast-125"
                  />
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={loading || !file}
                className="w-full py-3 bg-white text-black hover:bg-gray-200 rounded-lg font-bold uppercase tracking-wider text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {loading ? "Analyzing Environment..." : "Run Threat Analysis"}
              </button>
            </div>

            {/* Warning Box & Audio Broadcast */}
            {analysisData && (
              <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <span
                    className={`text-xs font-bold uppercase tracking-widest ${analysisData.riskScore >= 7 ? "text-red-500" : "text-cyan-500"}`}
                  >
                    {analysisData.status} ALERT
                  </span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="bg-transparent text-white/60 text-xs uppercase tracking-wider outline-none cursor-pointer"
                  >
                    <option value="english">English</option>
                    <option value="pidgin">Pidgin</option>
                    <option value="yoruba">Yoruba</option>
                    <option value="igbo">Igbo</option>
                  </select>
                </div>

                <p className="text-white/90 text-sm leading-relaxed">
                  {analysisData.alerts[language]}
                </p>

                <button
                  onClick={handleAudioBroadcast}
                  className="w-full py-2 mt-2 border border-white/20 text-white/70 hover:text-white hover:border-white/50 rounded-lg text-xs uppercase tracking-widest transition-all"
                >
                  Broadcast Audio
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Visualizations */}
          <div className="lg:col-span-7">
            {analysisData ? (
              <div className="space-y-4">
                {/* Minimalist Tabs */}
                <div className="flex gap-6 border-b border-white/10 pb-2 px-2">
                  <button
                    onClick={() => setActiveTab("3D")}
                    className={`text-xs uppercase tracking-widest pb-2 transition-all ${activeTab === "3D" ? "text-white border-b-2 border-white" : "text-white/40 hover:text-white/70"}`}
                  >
                    Digital Twin
                  </button>
                  <button
                    onClick={() => setActiveTab("MAP")}
                    className={`text-xs uppercase tracking-widest pb-2 transition-all ${activeTab === "MAP" ? "text-white border-b-2 border-white" : "text-white/40 hover:text-white/70"}`}
                  >
                    Hazard Map
                  </button>
                </div>

                {/* Render Selected View */}
                <div className="p-1 rounded-2xl border border-white/5 bg-[#0a0a0a]">
                  {activeTab === "3D" ? (
                    <FloodVisualizer data={analysisData} />
                  ) : (
                    <HazardMap data={analysisData} />
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[400px] flex items-center justify-center border border-white/5 rounded-2xl border-dashed">
                <p className="text-white/20 text-xs uppercase tracking-widest">
                  Awaiting Telemetry Data
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
