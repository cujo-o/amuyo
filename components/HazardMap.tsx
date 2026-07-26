"use client";

import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
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

  // Custom pulsing map pin
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

  return (
    <div className="w-full h-[420px] bg-[#08080c] rounded-2xl overflow-hidden border border-white/10 relative shadow-2xl">
      <MapContainer
        center={[lat, lng]}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <Circle
          center={[lat, lng]}
          radius={1200}
          pathOptions={{
            color: riskColor,
            fillColor: riskColor,
            fillOpacity: 0.25,
          }}
        />
        <Marker position={[lat, lng]} icon={customIcon}>
          <Popup>
            <div className="font-sans text-xs text-black">
              <strong>{data?.locationName || "Incident Zone"}</strong>
              <br />
              Threat Rating: {risk}/10
              <br />
              Water Depth: {data?.estimatedWaterLevelMeters || 0}m
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
