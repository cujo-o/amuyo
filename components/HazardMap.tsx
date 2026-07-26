"use client";

import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const customIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export default function HazardMap({ data }: { data: any }) {
  const lat = data?.coordinates?.lat || 7.7969;
  const lng = data?.coordinates?.lng || 6.7333;
  const riskScore = data?.riskScore || 1;
  
  const isCritical = riskScore >= 7;
  const color = isCritical ? "#ff003c" : riskScore >= 5 ? "#ffaa00" : "#00f0ff";

  return (
    <div className="w-full h-full min-h-[400px] rounded-xl overflow-hidden bg-[#0a0a0a]">
      <MapContainer 
        center={[lat, lng]} 
        zoom={13} 
        scrollWheelZoom={false} 
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; CartoDB'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <CircleMarker 
          center={[lat, lng]} 
          radius={40} 
          pathOptions={{ color, fillColor: color, fillOpacity: 0.2 }}
        />
        <Marker position={[lat, lng]} icon={customIcon}>
          <Popup className="font-sans text-xs">
            Target Zone. Calculated Risk: {riskScore}/10
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}