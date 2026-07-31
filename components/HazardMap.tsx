"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import { FloodAnalysis } from "@/types";

export default function HazardMap({
  data,
  userCoords,
}: {
  data: FloodAnalysis | null;
  userCoords?: { lat: number; lng: number } | null;
}) {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

  // 🛡️ SMART RENDER: Only show the map AFTER an analysis has been completed
  if (!data) {
    return (
      <div className="w-full h-full min-h-[420px] bg-black/20 flex flex-col items-center justify-center text-gray-500 font-mono text-xs relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent"></div>
        <span className="text-4xl mb-3 opacity-30 animate-pulse">🗺️</span>
        <span className="z-10">
          Awaiting flood analysis to generate hazard map...
        </span>
      </div>
    );
  }

  // Uses real GPS if available, otherwise falls back to AI coordinates
  const lat = userCoords?.lat || data?.coordinates?.lat || 7.7969;
  const lng = userCoords?.lng || data?.coordinates?.lng || 6.7333;
  const riskColor = (data?.riskScore || 1) >= 7 ? "#ff003c" : "#ffaa00";

  // Safe zone ~2.5km away
  const safeZoneLat = lat + 0.02;
  const safeZoneLng = lng + 0.02;

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${safeZoneLng},${safeZoneLat}?overview=full&geometries=geojson`,
        );
        const routeData = await res.json();
        if (routeData.routes && routeData.routes[0]) {
          const mappedCoords = routeData.routes[0].geometry.coordinates.map(
            (coord: number[]) => [coord[1], coord[0]],
          );
          setRouteCoords(mappedCoords);
        }
      } catch (e) {
        setRouteCoords([
          [lat, lng],
          [safeZoneLat, safeZoneLng],
        ]);
      }
    };
    fetchRoute();
  }, [lat, lng, safeZoneLat, safeZoneLng]);

  const customIcon = L.divIcon({
    className: "custom-map-pin",
    html: `<div style="position:relative; width:24px; height:24px;"><div style="position:absolute; width:24px; height:24px; background:${riskColor}; border-radius:50%; opacity:0.4; animation:ping 1.5s infinite;"></div><div style="position:absolute; top:4px; left:4px; width:16px; height:16px; background:${riskColor}; border:2px solid white; border-radius:50%;"></div></div>`,
    iconSize: [24, 24],
  });

  const safeIcon = L.divIcon({
    className: "safe-zone-pin",
    html: `<div style="position:relative; width:24px; height:24px;"><div style="position:absolute; top:4px; left:4px; width:16px; height:16px; background:#22c55e; border:2px solid white; border-radius:50%;"></div></div>`,
    iconSize: [24, 24],
  });

  return (
    <div className="w-full h-full min-h-[420px] bg-[#0c0c0e] overflow-hidden relative">
      <MapContainer
        key={`${lat}-${lng}`}
        center={[lat + 0.01, lng + 0.01]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <Circle
          center={[lat, lng]}
          radius={1000}
          pathOptions={{
            color: riskColor,
            fillColor: riskColor,
            fillOpacity: 0.15,
          }}
        />

        <Marker position={[lat, lng]} icon={customIcon}>
          <Popup>Incident Zone</Popup>
        </Marker>
        <Marker position={[safeZoneLat, safeZoneLng]} icon={safeIcon}>
          <Popup>High Ground Triage</Popup>
        </Marker>

        {routeCoords.length > 0 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{ color: "#22c55e", weight: 5, opacity: 0.8 }}
          />
        )}
      </MapContainer>

      <div className="absolute top-4 right-4 z-[400] bg-black/80 p-2 rounded-lg text-[10px] text-gray-300 font-mono shadow-xl border border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 bg-red-500 rounded-full"></span> Incident
          Core
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span> Active
          Escape Route
        </div>
      </div>
    </div>
  );
}
