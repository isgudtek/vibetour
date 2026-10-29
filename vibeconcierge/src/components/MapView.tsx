"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

export type Place = {
  id: string;
  name: string;
  category?: string;
  address?: string;
  affinity: number;
  lat?: number;
  lon?: number;
  image?: string;
  rationale?: string;
  dayOrder?: number; // first stop number if part of active day route
  dayOrders?: number[]; // all stop numbers if visited multiple times
};

export default function MapView({
  center,
  places,
  routeCoordinates = [],
  loading = false,
  selectedId,
  onSelect,
  activeDay,
  onAddToSchedule,
  onRemoveFromSchedule,
}: {
  center: { lat: number; lon: number };
  places: Place[];
  routeCoordinates?: [number, number][];
  loading?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  activeDay?: number | null;
  onAddToSchedule?: (venueId: string) => void;
  onRemoveFromSchedule?: (venueId: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const polylineRef = useRef<L.Polyline | null>(null);
  const [ready, setReady] = useState(false);

  // Init map once
  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current).setView([center.lat, center.lon], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    mapRef.current = map;
    setReady(true);
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, []);

  // Center on target city whenever center changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.invalidateSize();
    map.setView([center.lat, center.lon], 13, { animate: true });
  }, [center.lat, center.lon]);

  // Expose global handlers for popup actions so HTML onclick works seamlessly
  useEffect(() => {
    (window as unknown as { __mapAddToSchedule?: (id: string) => void }).__mapAddToSchedule = onAddToSchedule;
    (window as unknown as { __mapRemoveFromSchedule?: (id: string) => void }).__mapRemoveFromSchedule = onRemoveFromSchedule;
    return () => {
      delete (window as unknown as { __mapAddToSchedule?: unknown }).__mapAddToSchedule;
      delete (window as unknown as { __mapRemoveFromSchedule?: unknown }).__mapRemoveFromSchedule;
    };
  }, [onAddToSchedule, onRemoveFromSchedule]);

  // Draw or update route polyline for the selected day
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (routeCoordinates && routeCoordinates.length > 1) {
      const line = L.polyline(routeCoordinates, {
        color: "#ec6f5a", // Vibrant coral red
        weight: 6,        // Thicker and prominent
        opacity: 0.95,
        dashArray: "10, 10",
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
      polylineRef.current = line;

      // Fit bounds to itinerary route with some padding
      try {
        map.fitBounds(line.getBounds(), { padding: [40, 40], maxZoom: 15 });
      } catch {}
    }
  }, [routeCoordinates]);

  // Render markers when places change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    const icon = (aff: number, selected: boolean, dayOrders?: number[], dayOrder?: number) => {
      const orders = dayOrders && dayOrders.length > 0 ? dayOrders : (dayOrder ? [dayOrder] : []);
      const label = orders.join(",");
      const hasOrders = orders.length > 0;
      const isMulti = orders.length > 1;
      const w = isMulti ? Math.max(22, 14 + orders.length * 8) : (selected ? 22 : 16);
      return L.divIcon({
        className: "",
        html: `
          <div style="position:relative;display:flex;align-items:center;justify-content:center;">
            <div style="min-width:${w}px;height:${selected ? 22 : 16}px;padding:0 4px;border-radius:10px;background:${selected ? "#ec6f5a" : hasOrders ? "#eda645" : aff > 0.75 ? "#eda645" : "#a9cdec"};border:2px solid #191816;box-shadow:0 0 0 ${selected ? 3 : 2}px rgba(250,240,225,0.35);transition:all .2s;display:flex;align-items:center;justify-content:center;color:#191816;font-size:10px;font-weight:700;white-space:nowrap;">
              ${label}
            </div>
          </div>
        `,
        iconSize: [w, selected ? 22 : 16],
      });
    };

    places.forEach((p) => {
      if (typeof p.lat === "number" && typeof p.lon === "number") {
        const orders = p.dayOrders && p.dayOrders.length > 0 ? p.dayOrders : (p.dayOrder ? [p.dayOrder] : []);
        const hasOrders = orders.length > 0;
        const orderText = orders.map((o) => `#${o}`).join(", ");

        const scheduleBtn = `
          <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;">
            <button
              onclick="window.__mapAddToSchedule && window.__mapAddToSchedule('${p.id}')"
              style="cursor:pointer;background:#eda645;border:none;color:#1a1612;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:600;"
            >
              ${hasOrders ? "+ Add Stop Again" : `+ Send to schedule ${activeDay ? `(Day ${activeDay})` : "(Day 1)"}`}
            </button>
            ${hasOrders ? `
              <button
                onclick="window.__mapRemoveFromSchedule && window.__mapRemoveFromSchedule('${p.id}')"
                style="cursor:pointer;background:rgba(236,111,90,0.15);border:1px solid #ec6f5a;color:#ec6f5a;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:600;"
                title="Remove latest visit"
              >
                ✕ Remove
              </button>
            ` : ""}
          </div>
        `;

        const popup = `<div style="max-width:260px;font-family:sans-serif;">
  ${p.image ? `<img src="${p.image}" alt="${p.name}" style="width:100%;height:110px;object-fit:cover;border-radius:8px;margin-bottom:6px" />` : ""}
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">
    <div style="font-weight:600;font-size:13px;color:#111;">${p.name}</div>
    ${hasOrders ? `<span style="background:#eda645;color:#1a1612;font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px;white-space:nowrap;">${orders.length > 1 ? `Stops ${orderText}` : `Stop ${orderText}`}</span>` : ""}
  </div>
  <div style="font-size:11px;color:#666;margin:2px 0">${[p.category, p.address].filter(Boolean).join(" · ")}</div>
  <div style="font-size:11px;color:#eda645;font-weight:600;margin:2px 0">${Math.round(p.affinity * 100)}% taste affinity ${hasOrders ? `(${orders.length > 1 ? `Stops ${orderText}` : `Stop ${orderText}`} in Day ${activeDay ?? 1})` : ""}</div>
  ${p.rationale ? `<div style="font-size:11px;color:#444;margin-top:4px;line-height:1.3;">${p.rationale}</div>` : ""}
  <div style="margin-top:8px;padding-top:6px;border-top:1px solid #eee;display:flex;flex-direction:column;gap:6px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      ${scheduleBtn}
      <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([p.name, p.address].filter(Boolean).join(", ") || `${p.lat},${p.lon}`)}" target="_blank" rel="noreferrer" style="font-size:11px;font-weight:600;color:#2563eb;text-decoration:none;">Directions ↗</a>
    </div>
  </div>
</div>`;
        const m = L.marker([p.lat, p.lon], { icon: icon(p.affinity, p.id === selectedId, p.dayOrders, p.dayOrder) })
          .addTo(map)
          .bindPopup(popup, { maxWidth: 280 });
        m.on("click", () => onSelect?.(p.id));
        markersRef.current.set(p.id, m);
      }
    });

    // Auto fit bounds to displayed places when places change (e.g. category filter or day filter)
    if (!selectedId && places.length > 0) {
      const validPoints: [number, number][] = places
        .filter((p) => typeof p.lat === "number" && typeof p.lon === "number")
        .map((p) => [p.lat as number, p.lon as number]);

      if (validPoints.length === 1) {
        map.setView(validPoints[0], 14, { animate: true });
      } else if (validPoints.length > 1) {
        try {
          const bounds = L.latLngBounds(validPoints);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
        } catch {}
      }
    }
  }, [places, selectedId, onSelect, activeDay]);

  // Fly to selected venue
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const m = markersRef.current.get(selectedId);
    if (m) {
      const ll = m.getLatLng();
      map.flyTo(ll, 15, { animate: true, duration: 0.8 });
      m.openPopup();
    }
  }, [selectedId]);

  return (
    <div className="relative" style={{ height: "100%", width: "100%", borderRadius: 18, overflow: "hidden" }}>
      <div ref={ref} style={{ height: "100%", width: "100%" }} />
      {/* Day badge — top-right corner of the map */}
      {activeDay != null && (
        <div style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 1000,
          background: "rgba(10,9,8,0.82)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(237,166,69,0.5)",
          borderRadius: 10,
          padding: "5px 12px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          pointerEvents: "none",
        }}>
          <span style={{ fontSize: 10, color: "var(--amber)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Day</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#faf0e1", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{activeDay}</span>
        </div>
      )}
      {(loading || !ready) && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(14,13,12,0.85)", backdropFilter: "blur(6px)", zIndex: 1000 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid #4a4741", borderTopColor: "#eda645", animation: "spin 0.8s linear infinite" }} />
            <p style={{ fontSize: 12, color: "#bdb7ad", margin: 0, fontFamily: "monospace" }}>Loading map &amp; places…</p>
          </div>
        </div>
      )}
    </div>
  );
}
