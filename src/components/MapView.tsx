"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

type Place = { id: string; name: string; affinity: number; lat?: number; lon?: number };

export default function MapView({ center, places, loading = false }: { center: { lat: number; lon: number }; places: Place[]; loading?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    setReady(false);
    const map = L.map(ref.current).setView([center.lat, center.lon], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    const icon = (aff: number) =>
      L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${aff > 0.75 ? "#eda645" : "#a9cdec"};border:2px solid #191816;box-shadow:0 0 0 2px rgba(250,240,225,0.2)"></div>`,
        iconSize: [14, 14],
      });

    places.forEach((p) => {
      if (typeof p.lat === "number" && typeof p.lon === "number") {
        L.marker([p.lat, p.lon], { icon: icon(p.affinity) }).addTo(map).bindPopup(`${p.name} · ${Math.round(p.affinity * 100)}%`);
      }
    });

    // allow tiles to load
    const t1 = setTimeout(() => { map.invalidateSize(); map.setView([center.lat, center.lon], 13); }, 100);
    const t2 = setTimeout(() => setReady(true), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      map.remove();
    };
  }, [center, places]);

  return (
    <div className="relative" style={{ height: 360, width: "100%", borderRadius: 18, overflow: "hidden" }}>
      <div ref={ref} style={{ height: "100%", width: "100%" }} />
      {(loading || !ready) && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0e0d0c]/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#4a4741] border-t-[#eda645]" />
            <p className="text-xs text-[#bdb7ad] num">Loading map &amp; places…</p>
          </div>
        </div>
      )}
    </div>
  );
}
