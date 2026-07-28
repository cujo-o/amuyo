"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { FloodAnalysis, Language } from "@/types";

const FloodVisualizer = dynamic(() => import("@/components/FloodVisualizer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] bg-[#0c0c0e] rounded-xl flex items-center justify-center border border-white/5 text-xs font-mono text-[#3b82f6] animate-pulse">
      INITIALIZING 3D WEBGL ENGINE...
    </div>
  ),
});

const HazardMap = dynamic(() => import("@/components/HazardMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] bg-[#0c0c0e] rounded-xl flex items-center justify-center border border-white/5 text-xs font-mono text-gray-500 animate-pulse">
      INITIALIZING GEOSPATIAL RADAR...
    </div>
  ),
});

// Bulletproof Mobile Compression with Memory-Crash Fallback
const compressImage = async (file: File): Promise<File> => {
  if (file.size < 1.5 * 1024 * 1024) return file; // Skip small files

  return new Promise((resolve) => {
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let { width, height } = img;

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

        if (!ctx) return resolve(file); // Memory limit hit, use original

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) =>
            blob
              ? resolve(new File([blob], file.name, { type: "image/jpeg" }))
              : resolve(file),
          "image/jpeg",
          0.8,
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file); // Fallback on load error
      };

      img.src = objectUrl;
    } catch (error) {
      console.warn("Compression bypassed due to mobile memory constraints.");
      resolve(file); // Ultimate fallback
    }
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
  const [checklist, setChecklist] = useState<boolean[]>([]);

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

    await new Promise((resolve) => setTimeout(resolve, 50)); // Yield thread

    try {
      const compressedImage = await compressImage(file);
      const formData = new FormData();
      formData.append("image", compressedImage);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const data: FloodAnalysis = await res.json();
      setAnalysisData(data);
      setChecklist(new Array(data.tacticalActionPlan.length).fill(false));
    } catch (error: any) {
      setErrorMessage(
        "Telemetry evaluation failed. Please verify satellite imagery and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleChecklist = (index: number) => {
    const newChecklist = [...checklist];
    newChecklist[index] = !newChecklist[index];
    setChecklist(newChecklist);
  };

  // Helper for UI metric bars
  const getProgressColor = (val: string | number) => {
    if (typeof val === "number")
      return val > 75
        ? "bg-red-500"
        : val > 40
          ? "bg-yellow-500"
          : "bg-blue-500";
    if (
      val.includes("SEVERE") ||
      val.includes("EXTREME") ||
      val.includes("IMPASSABLE")
    )
      return "bg-red-500";
    if (val.includes("MODERATE") || val.includes("HIGH_CLEARANCE"))
      return "bg-yellow-500";
    return "bg-blue-500";
  };

  return (
    <main className="min-h-screen bg-[#050505] text-gray-200 font-sans selection:bg-blue-900 overflow-x-hidden pb-10">
      {/* Top Navigation Panel */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#09090b]">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold tracking-widest text-white">
            AMUYO
          </h1>
          <div className="hidden md:flex gap-6 text-xs text-gray-500 font-medium tracking-wider">
            <span className="hover:text-gray-300 cursor-pointer transition-colors">
              Network
            </span>
            <span className="hover:text-gray-300 cursor-pointer transition-colors">
              Assets
            </span>
            <span className="hover:text-gray-300 cursor-pointer transition-colors">
              Events
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-950/30 border border-blue-900 text-[10px] uppercase font-mono text-blue-400 hover:bg-blue-900/40 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            ENABLE LIVE GPS RADAR
          </button>
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer">
            <span className="text-gray-400 text-xs">⚙</span>
          </div>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
        {/* LEFT COLUMN: Ingestion & Metrics */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Telemetry Ingestion */}
          <div className="bg-[#121214] rounded-xl border border-[#27272a] p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                TELEMETRY INGESTION
              </h2>
              <span className="text-gray-600 text-xs">📄</span>
            </div>

            <label className="block relative w-full h-36 rounded-lg border-2 border-dashed border-[#27272a] hover:border-gray-500 transition-colors cursor-pointer mb-4 overflow-hidden group">
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
                  className="object-cover w-full h-full opacity-60 group-hover:opacity-40 transition-opacity"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-2">
                  <span className="text-2xl">📷</span>
                  <span className="text-[10px] uppercase tracking-widest font-mono">
                    DRAG SATELLITE IMAGERY HERE
                  </span>
                </div>
              )}
            </label>

            <button
              onClick={handleUpload}
              disabled={loading || !file}
              className="w-full py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {loading
                ? "PROCESSING TELEMETRY..."
                : "EXECUTE ENGINEERING EVALUATION"}
            </button>
            {errorMessage && (
              <p className="mt-3 text-[10px] font-mono text-red-400">
                {errorMessage}
              </p>
            )}
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#121214] border border-[#27272a] rounded-xl p-4 flex flex-col justify-between h-28">
              <div className="flex justify-between items-start">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest leading-relaxed">
                  HYDROSTATIC
                  <br />
                  PRESSURE
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              </div>
              <div>
                <div className="text-xl font-bold font-mono text-white mb-2">
                  {analysisData?.hydrostaticPressureKPa || "0.0"}{" "}
                  <span className="text-[10px] text-blue-400">kPa</span>
                </div>
                <div className="w-full h-1 bg-[#27272a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{
                      width: `${Math.min(100, (analysisData?.hydrostaticPressureKPa || 0) * 2)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#121214] border border-[#27272a] rounded-xl p-4 flex flex-col justify-between h-28">
              <div className="flex justify-between items-start">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest leading-relaxed">
                  ELECTRICAL
                  <br />
                  HAZARD
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              </div>
              <div>
                <div
                  className={`text-sm font-bold font-mono mb-2 ${analysisData ? (analysisData.electricalHazardLevel.includes("SEVERE") ? "text-red-500" : "text-yellow-500") : "text-gray-600"}`}
                >
                  {analysisData?.electricalHazardLevel || "AWAITING"}
                </div>
                <div className="w-full h-1 bg-[#27272a] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${analysisData ? getProgressColor(analysisData.electricalHazardLevel) : "bg-gray-600"}`}
                    style={{ width: "80%" }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#121214] border border-[#27272a] rounded-xl p-4 flex flex-col justify-between h-28">
              <div className="flex justify-between items-start">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest leading-relaxed">
                  VEHICLE
                  <br />
                  ACCESSIBILITY
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              </div>
              <div>
                <div
                  className={`text-[11px] font-bold font-mono mb-2 ${analysisData ? "text-yellow-500" : "text-gray-600"}`}
                >
                  {analysisData?.vehicleAccessClass.replace(/_/g, " ") ||
                    "AWAITING"}
                </div>
                <div className="w-full h-1 bg-[#27272a] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${analysisData ? getProgressColor(analysisData.vehicleAccessClass) : "bg-gray-600"}`}
                    style={{ width: "60%" }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#121214] border border-[#27272a] rounded-xl p-4 flex flex-col justify-between h-28">
              <div className="flex justify-between items-start">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest leading-relaxed">
                  SUBMERGED
                  <br />
                  INFRA
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              </div>
              <div>
                <div className="text-lg font-bold font-mono text-white mb-2">
                  {analysisData?.submergedStructuralPercentage || "0"}
                  <span className="text-blue-400 text-sm">%</span>
                </div>
                <div className="w-full h-1 bg-[#27272a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{
                      width: `${analysisData?.submergedStructuralPercentage || 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Threat & Alert Card */}
          <div className="bg-[#121214] rounded-xl border border-[#27272a] p-5">
            <h3 className="text-sm font-bold text-red-500 flex items-center gap-2 mb-4 uppercase tracking-widest">
              <span>⚠️</span> THREAT {analysisData?.status || "PENDING"} R-
              {analysisData?.riskScore || 0}/10
            </h3>

            <div className="flex gap-2 mb-4">
              {(["english", "pidgin", "yoruba", "igbo"] as Language[]).map(
                (lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`px-3 py-1 text-[9px] font-mono uppercase tracking-widest rounded border ${
                      language === lang
                        ? "bg-white/10 border-white text-white"
                        : "border-[#27272a] text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {lang.slice(0, 3)}
                  </button>
                ),
              )}
            </div>

            <div className="p-4 bg-[#0a0a0c] rounded-lg border border-[#27272a] text-xs text-gray-300 leading-loose">
              {analysisData ? (
                <>
                  <strong>URGENT:</strong> {analysisData.alerts[language]}
                </>
              ) : (
                <span className="text-gray-600 italic">
                  Awaiting telemetry evaluation...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Visuals & Terminal */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Main Viewport Card */}
          <div className="bg-[#121214] rounded-xl border border-[#27272a] overflow-hidden flex flex-col relative h-[500px]">
            <div className="flex border-b border-[#27272a] bg-[#0c0c0e]">
              <button
                onClick={() => setActiveTab("3D")}
                className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === "3D" ? "text-blue-400 border-b-2 border-blue-500 bg-[#121214]" : "text-gray-500 hover:text-gray-300"}`}
              >
                3D DIGITAL TWIN
              </button>
              <button
                onClick={() => setActiveTab("MAP")}
                className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === "MAP" ? "text-blue-400 border-b-2 border-blue-500 bg-[#121214]" : "text-gray-500 hover:text-gray-300"}`}
              >
                GEOSPATIAL RADAR
              </button>
            </div>

            <div className="flex-1 relative">
              {activeTab === "3D" ? (
                <FloodVisualizer data={analysisData} />
              ) : (
                <HazardMap data={analysisData} />
              )}

              {/* Floating Coordinates HUD */}
              {analysisData && (
                <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md p-3 rounded-lg border border-white/10 text-[10px] font-mono text-gray-300 z-10 leading-relaxed shadow-lg">
                  <div>
                    <span className="text-blue-400">LAT:</span>{" "}
                    {analysisData.coordinates.lat.toFixed(4)} N
                  </div>
                  <div>
                    <span className="text-blue-400">LON:</span>{" "}
                    {analysisData.coordinates.lng.toFixed(4)} E
                  </div>
                  <div>
                    <span className="text-blue-400">ALT:</span> -
                    {analysisData.estimatedWaterLevelMeters}m (MSL)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tactical Reasoning Terminal */}
          <div className="bg-[#121214] rounded-xl border border-[#27272a] p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-bold text-gray-300 flex items-center gap-2 uppercase tracking-widest">
                <span className="text-blue-500">⚙</span> GEMMA-4 TACTICAL
                REASONING
              </h3>
              <span className="text-[9px] font-mono text-blue-500 uppercase tracking-widest animate-pulse">
                {loading
                  ? "PROCESSING..."
                  : analysisData
                    ? "ANALYSIS COMPLETE"
                    : "STANDBY"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Terminal Logs */}
              <div className="bg-[#09090b] rounded-lg p-4 font-mono text-[11px] leading-loose text-gray-400 border border-[#27272a]">
                {analysisData ? (
                  <>
                    <div>
                      <span className="text-gray-600">&gt;</span> Initializing
                      hydro-spatial matrix...
                    </div>
                    <div>
                      <span className="text-gray-600">&gt;</span> Visual
                      Benchmark: <span className="text-blue-400">SUCCESS</span>{" "}
                      -{" "}
                      {
                        analysisData.reasoningChain.visualBenchmark.split(
                          ".",
                        )[0]
                      }
                    </div>
                    <div>
                      <span className="text-gray-600">&gt;</span> Hydrodynamic
                      Stress: <span className="text-yellow-500">WARNING</span> -{" "}
                      {
                        analysisData.reasoningChain.hydrodynamicForces.split(
                          ".",
                        )[0]
                      }
                    </div>
                    <div>
                      <span className="text-gray-600">&gt;</span> Predictive
                      Window: <span className="text-red-400">&lt; 2HRS</span>
                    </div>
                    <div className="animate-pulse">
                      <span className="text-gray-600">&gt;</span> Recalculating
                      optimal extraction routes...
                    </div>
                  </>
                ) : (
                  <div className="text-gray-600">
                    &gt; Awaiting telemetry input sequence...
                  </div>
                )}
              </div>

              {/* Action Protocol Checklist */}
              <div>
                <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                  RESCUE CREW PROTOCOL
                </h4>
                <div className="space-y-3">
                  {analysisData ? (
                    analysisData.tacticalActionPlan.map((action, i) => (
                      <label
                        key={i}
                        className={`flex items-start gap-3 cursor-pointer group transition-all ${checklist[i] ? "opacity-50" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checklist[i]}
                          onChange={() => toggleChecklist(i)}
                          className="mt-0.5 w-3.5 h-3.5 rounded-sm border-[#27272a] bg-[#09090b] checked:bg-blue-500 cursor-pointer appearance-none checked:border-transparent flex-shrink-0 relative
                            checked:after:content-[''] checked:after:absolute checked:after:left-[4px] checked:after:top-[1px] checked:after:w-[4px] checked:after:h-[8px] checked:after:border-r-2 checked:after:border-b-2 checked:after:border-white checked:after:rotate-45"
                        />
                        <span
                          className={`text-[11px] font-mono leading-relaxed transition-all ${checklist[i] ? "line-through text-gray-600" : "text-gray-300 group-hover:text-white"} ${i === 0 && !checklist[i] ? "text-red-400/90" : ""}`}
                        >
                          {action}
                        </span>
                      </label>
                    ))
                  ) : (
                    <div className="text-[10px] font-mono text-gray-600 border border-dashed border-[#27272a] p-3 rounded text-center">
                      PROTOCOL UNASSIGNED
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
