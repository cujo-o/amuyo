"use client";

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

interface Props {
  data: FloodAnalysis | null;
}

export default function HazardMap({ data }: Props) {
  const lat = data?.coordinates?.lat || 7.7969;
  const lng = data?.coordinates?.lng || 6.7333;
  const risk = data?.riskScore || 1;
  const riskColor = risk >= 7 ? "#ff003c" : risk >= 5 ? "#ffaa00" : "#00f0ff";

  // Calculate a safe zone for evacuation (higher elevation coordinates)
  const safeZoneLat = lat + 0.025;
  const safeZoneLng = lng + 0.02;

  const customIcon = L.divIcon({
    className: "custom-map-pin",
    html: `
      <div style="position: relative; width: 24px; height: 24px;">
        <div style="position: absolute; width: 24px; height: 24px; background: ${riskColor}; border-radius: 50%; opacity: 0.4; animation: ping 1.5s infinite;"></div>
        <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; background: ${riskColor}; border: 2px solid white; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  // Green Safe Zone Marker
  const safeZoneIcon = L.divIcon({
    className: "safe-zone-pin",
    html: `
      <div style="position: relative; width: 24px; height: 24px;">
        <div style="position: absolute; width: 24px; height: 24px; background: #22c55e; border-radius: 50%; opacity: 0.6; animation: ping 2s infinite;"></div>
        <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; background: #22c55e; border: 2px solid white; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  // Dynamic Evacuation Route coordinates
  const evacuationPath: [number, number][] = [
    [lat, lng],
    [lat + 0.008, lng + 0.015],
    [safeZoneLat, safeZoneLng],
  ];

  return (
    <div className="w-full h-full min-h-[420px] bg-[#0c0c0e] rounded-xl overflow-hidden border border-white/5 relative shadow-2xl">
      <MapContainer
        center={[lat + 0.01, lng + 0.01]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

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
          <Popup>
            <div className="font-sans text-xs text-black">
              <strong>{data?.locationName || "Incident Zone"}</strong>
              <br />
              Threat Rating: {risk}/10
            </div>
          </Popup>
        </Marker>

        <Marker position={[safeZoneLat, safeZoneLng]} icon={safeZoneIcon}>
          <Popup>
            <div className="font-sans text-xs text-black">
              <strong>Safe Zone / High Ground</strong>
              <br />
              Evacuation Destination
            </div>
          </Popup>
        </Marker>

        <Polyline
          positions={evacuationPath}
          pathOptions={{
            color: "#22c55e",
            weight: 4,
            dashArray: "10, 10",
            opacity: 0.8,
          }}
        />
      </MapContainer>

      <div className="absolute top-4 right-4 z-[400] bg-black/80 backdrop-blur-md p-2 rounded-lg border border-white/10 text-[10px] font-mono text-gray-300">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 bg-red-500 rounded-full"></span> Incident
          Zone
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span> Safe
          Extraction Route
        </div>
      </div>
    </div>
  );
}
