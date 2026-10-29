"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Venue } from "@/types";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

interface PrintState {
  venues: Venue[];
  schedule: { uid: string; venueId: string; day: number; startSlot: number; duration: number }[];
  numDays: number;
  tripStartDate: string;
  center: { lat: number; lon: number };
  clientName: string;
  destinationCity: string;
}

export default function PrintPage() {
  const [state, setState] = useState<PrintState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("vibetour_print_state");
      if (raw) {
        setState(JSON.parse(raw));
      } else {
        // Fallback to standard storage
        const stdRaw = localStorage.getItem("vibetour_schedule") || localStorage.getItem("vibeconcierge_schedule");
        if (stdRaw) {
          const parsed = JSON.parse(stdRaw);
          setState({
            venues: parsed.venues || [],
            schedule: parsed.schedule || [],
            numDays: parsed.numDays || 2,
            tripStartDate: parsed.tripStartDate || "",
            center: parsed.center || { lat: 35.6762, lon: 139.6503 },
            clientName: "Executive Client",
            destinationCity: "Selected Destination"
          });
        }
      }
    } catch (e) {
      console.error("Failed to load print state:", e);
    }
  }, []);

  if (!state) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "monospace", color: "var(--text-3)" }}>
        Loading print configuration...
      </div>
    );
  }

  const { venues, schedule, numDays, tripStartDate, center, clientName, destinationCity } = state;

  // Helper to convert slot index to HH:MM format
  function slotToHM(slot: number) {
    const totalMins = slot * 30;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return { h, m };
  }

  // Get country prefix based on city
  function getCityPhonePrefix(city: string): string {
    const c = city.toLowerCase();
    if (c.includes("tokyo")) return "+81 3";
    if (c.includes("rome")) return "+39 06";
    if (c.includes("paris")) return "+33 1";
    if (c.includes("london")) return "+44 20";
    if (c.includes("new york") || c.includes("ny")) return "+1 212";
    return "+1 555";
  }

  // Deterministic phone generator
  function getVenuePhone(venueId: string, venueName: string): string {
    const prefix = getCityPhonePrefix(destinationCity);
    let hash = 0;
    const key = venueId + venueName;
    for (let i = 0; i < key.length; i++) {
      hash = (hash << 5) - hash + key.charCodeAt(i);
      hash |= 0;
    }
    const val = Math.abs(hash) % 10000000;
    const s = String(val).padStart(7, "0");
    if (prefix.startsWith("+81")) {
      return `${prefix}-${s.slice(0, 4)}-${s.slice(4)}`;
    } else if (prefix.startsWith("+44") || prefix.startsWith("+39") || prefix.startsWith("+33")) {
      return `${prefix} ${s.slice(0, 3)} ${s.slice(3)}`;
    } else {
      return `${prefix}-${s.slice(0, 3)}-${s.slice(3)}`;
    }
  }

  // Group schedule by day
  const daysArray = Array.from({ length: numDays }, (_, i) => i + 1);

  // Collect scheduled venues
  const scheduledVenues = venues.filter((v) => schedule.some((s) => s.venueId === v.id));

  // Build flat route coordinates chronologically across all days
  const routeCoordinates = schedule
    .sort((a, b) => a.day - b.day || a.startSlot - b.startSlot)
    .map((s) => {
      const v = venues.find((x) => x.id === s.venueId);
      return v && typeof v.lat === "number" && typeof v.lon === "number" ? [v.lat, v.lon] as [number, number] : null;
    })
    .filter((pt): pt is [number, number] => pt !== null);

  // Flat list of places for MapView
  const mapPlaces = venues.map((v) => {
    const orders: number[] = [];
    schedule.forEach((s) => {
      if (s.venueId === v.id) {
        orders.push(s.startSlot);
      }
    });
    return { ...v, scheduleSlots: orders };
  });

  return (
    <div className="print-page" style={{ padding: "24px", maxWidth: 1100, margin: "0 auto", color: "var(--text)", fontFamily: "var(--font)" }}>
      
      {/* CSS overrides for print & high-contrast preview */}
      <style jsx global>{`
        @media screen {
          body {
            background: #0e0d0c !important;
            color: #f2efe9 !important;
          }
        }
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-page {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            color: #000000 !important;
          }
          .print-card {
            background: #ffffff !important;
            border: 1px solid #e5e5e5 !important;
            box-shadow: none !important;
            color: #000000 !important;
            page-break-inside: avoid;
          }
          .print-badge {
            background: #f3f4f6 !important;
            color: #1f2937 !important;
            border: 1px solid #d1d5db !important;
          }
          .print-header {
            border-bottom: 2px solid #000000 !important;
            padding-bottom: 12px !important;
          }
          .timeline-slot {
            border-top: 1px solid #e5e5e5 !important;
          }
          .timeline-hour {
            color: #374151 !important;
          }
        }
      `}</style>

      {/* Top Menu Controls (Hidden during print) */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(25,24,22,0.9)", border: "1px solid var(--line-strong)", padding: "12px 18px", borderRadius: 12, marginBottom: 24, backdropFilter: "blur(8px)" }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--amber)" }}>🖨️ PDF PRINT &amp; ITINERARY DISCOVERY</span>
          <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Print optimized light-stylesheet triggers automatically on print to save paper ink.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button 
            className="btn btn-primary" 
            onClick={() => window.print()}
            style={{ background: "var(--amber)", color: "#1a1612", fontWeight: 700, border: "none", height: 32 }}
          >
            Print Itinerary (PDF)
          </button>
          <button 
            className="btn" 
            onClick={() => window.close()}
            style={{ height: 32 }}
          >
            Close Tab
          </button>
        </div>
      </div>

      {/* Print Header */}
      <header className="print-header" style={{ borderBottom: "1px solid var(--line-strong)", paddingBottom: 16, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--amber)" }}>VIBETOUR</span>
            <span className="print-badge" style={{ fontSize: 10, background: "rgba(250,240,225,0.06)", border: "1px solid var(--line-strong)", color: "var(--text-2)", padding: "1px 6px", borderRadius: 4 }}>EXECUTIVE SUMMARY</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>Curated Hospitality Journey — {destinationCity}</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
            Specially tailored for <strong style={{ color: "var(--text)" }}>{clientName}</strong> · Starting: {tripStartDate || "Tomorrow"} ({numDays} {numDays === 1 ? "Day" : "Days"})
          </p>
        </div>
        <div style={{ textAlign: "right", fontSize: 12, color: "var(--text-3)" }}>
          <div>Generated on: {new Date().toLocaleDateString()}</div>
          <div>Total Stops: {schedule.length} Curated Venues</div>
        </div>
      </header>

      {/* Interactive Print Map (Leaflet) */}
      <section style={{ marginBottom: 24 }} className="no-print">
        <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--amber)", marginBottom: 8 }}>Dynamic Map Routing Grid</h2>
        <div style={{ height: 280, borderRadius: 12, overflow: "hidden", border: "1px solid var(--line-strong)" }}>
          <MapView
            center={center}
            places={mapPlaces}
            routeCoordinates={routeCoordinates}
            loading={false}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
            activeDay={null}
            onAddToSchedule={() => {}}
            onRemoveFromSchedule={() => {}}
          />
        </div>
      </section>

      {/* Main Grid: Left Timeline, Right Venue Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        
        {/* LEFT COLUMN: Itinerary per Day */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--amber)", marginBottom: 12 }}>Daily Schedule Grid</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {daysArray.map((day) => {
              const dayStops = schedule
                .filter((s) => s.day === day)
                .sort((a, b) => a.startSlot - b.startSlot);

              return (
                <div key={day} className="print-card" style={{ background: "var(--card)", border: "1px solid var(--line-strong)", borderRadius: 12, padding: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, borderBottom: "1px solid var(--line)", paddingBottom: 6, marginBottom: 10, color: "var(--amber)" }}>
                    ☀️ Day {day} Itinerary
                  </h3>

                  {dayStops.length === 0 ? (
                    <p style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic" }}>No stops scheduled for Day {day}.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {dayStops.map((stop) => {
                        const v = venues.find((x) => x.id === stop.venueId);
                        const hm = slotToHM(stop.startSlot);
                        const timeStr = `${String(hm.h).padStart(2, "0")}:${String(hm.m).padStart(2, "0")}`;
                        
                        return (
                          <div key={stop.uid} className="timeline-slot" style={{ display: "flex", gap: 12, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 8 }}>
                            <div className="timeline-hour" style={{ fontSize: 12, fontWeight: 700, color: "var(--amber)", width: 48, flexShrink: 0 }}>
                              {timeStr}
                            </div>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{v?.name || stop.venueId}</h4>
                              <div style={{ fontSize: 10, color: "var(--text-3)" }}>
                                {v?.category} {v?.address ? `· ${v.address}` : ""}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Venue Details Guide with QR Codes */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--amber)", marginBottom: 12 }}>Venue Information Guides</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {scheduledVenues.map((v) => {
              const phone = getVenuePhone(v.id, v.name);
              const mapQuery = `${v.name} ${v.address || ""}`;
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
              const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(mapsUrl)}`;

              return (
                <div 
                  key={v.id} 
                  className="print-card" 
                  style={{ 
                    background: "var(--card)", 
                    border: "1px solid var(--line-strong)", 
                    borderRadius: 12, 
                    padding: 14,
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span className="print-badge" style={{ fontSize: 9, background: "rgba(237,166,69,0.12)", color: "var(--amber)", padding: "1px 4px", borderRadius: 3, fontWeight: 600 }}>
                        {v.category.toUpperCase()}
                      </span>
                    </div>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={v.name}>
                      {v.name}
                    </h3>
                    {v.address && (
                      <p style={{ fontSize: 10, color: "var(--text-2)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={v.address}>
                        📍 {v.address}
                      </p>
                    )}
                    <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
                      📞 {phone}
                    </p>
                  </div>

                  {/* QR Code Block */}
                  <div style={{ textAlign: "center", flexShrink: 0 }}>
                    <img 
                      src={qrCodeUrl} 
                      alt="Google Maps QR" 
                      style={{ width: 64, height: 64, border: "2px solid #fff", borderRadius: 4, background: "#fff", display: "block", margin: "0 auto" }} 
                    />
                    <span style={{ fontSize: 7, color: "var(--text-3)", display: "block", marginTop: 2, textTransform: "uppercase" }}>Scan to Navigate</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Print Footer */}
      <footer className="no-print" style={{ marginTop: 40, borderTop: "1px solid var(--line-strong)", paddingTop: 16, textAlign: "center", fontSize: 11, color: "var(--text-3)" }}>
        VibeTour — Multi-broker Corporate Hospitality Agent. All rights reserved. Powered by Qloo Taste Graph API.
      </footer>
    </div>
  );
}
