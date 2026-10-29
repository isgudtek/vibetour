"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { ConciergeResponse, Venue } from "@/types";
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function Home() {
  const [clientName, setClientName] = useState("");
  const [destinationCity, setDestinationCity] = useState("Tokyo");
  const [llmProvider, setLlmProvider] = useState<"openai" | "groq" | "openrouter" | "gemini">("groq");
  const [profileUrl, setProfileUrl] = useState("");
  const [socialText, setSocialText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [tags, setTags] = useState<{ name: string; category: string; qlooTagId?: string; qlooTagName?: string }[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [rationale, setRationale] = useState<string>("");
  const [center, setCenter] = useState({ lat: 35.6762, lon: 139.6503 });
  const [selected, setSelected] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [moreOffset, setMoreOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [enrichmentText, setEnrichmentText] = useState("");
  const [numDays, setNumDays] = useState(2);
  const [selectedDayRoute, setSelectedDayRoute] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGCalModal, setShowGCalModal] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState("Restaurant");
  const [customAddress, setCustomAddress] = useState("");
  const [customDay, setCustomDay] = useState(1);
  const [customSlot, setCustomSlot] = useState(2); // 10:00 AM
  const [customDuration, setCustomDuration] = useState(2);
  const [tripStartDate, setTripStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // default tomorrow
    return d.toISOString().slice(0, 10);
  });
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [schedule, setSchedule] = useState<{ uid: string; venueId: string; day: number; startSlot: number; duration: number }[]>([]);
  const [resizingUid, setResizingUid] = useState<string | null>(null);
  const [gated, setGated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [planReady, setPlanReady] = useState(false);
  const [viewPlan, setViewPlan] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [briefingTab, setBriefingTab] = useState<"taste_graph" | "rationale">("taste_graph");
  const [plannerTab, setPlannerTab] = useState<"day" | "night">("day");
  const [customSearchQuery, setCustomSearchQuery] = useState("");

  // Phantomatic Plugins States
  const [estimatingBudget, setEstimatingBudget] = useState(false);
  const [budgetResults, setBudgetResults] = useState<{
    total: number;
    currency: string;
    items: { name: string; category: string; estCost: number; note: string }[];
  } | null>(null);

  const [commuteTransitMode, setCommuteTransitMode] = useState<"ev_taxi" | "rail" | "chauffeur">("ev_taxi");
  const [simulatingCommute, setSimulatingCommute] = useState(false);
  const [commuteTimeline, setCommuteTimeline] = useState<{
    time: string;
    action: string;
    details: string;
    status: string;
  }[]>([]);

  const [socialDetectiveHandle, setSocialDetectiveHandle] = useState("");
  const [socialDetectiveScanning, setSocialDetectiveScanning] = useState(false);
  const [socialDetectiveMatches, setSocialDetectiveMatches] = useState<{
    signal: string;
    strength: number;
    matchType: string;
    sentiment: string;
  }[]>([]);

  // Calculate Budget Estimates (Book It Plugin)
  async function calculateBudgetEstimates() {
    if (estimatingBudget) return;
    setEstimatingBudget(true);
    setBudgetResults(null);

    // Simulate server-side pricing & reservation checks
    await new Promise((r) => setTimeout(r, 1500));

    const scheduledStops = schedule
      .map((s) => {
        const v = venues.find((x) => x.id === s.venueId);
        return { slot: s.startSlot, day: s.day, venue: v, duration: s.duration };
      })
      .filter((x) => x.venue)
      .sort((a, b) => a.day - b.day || a.slot - b.slot);

    if (scheduledStops.length === 0) {
      // Return placeholder estimate if schedule is empty
      setBudgetResults({
        total: 1180,
        currency: "USD",
        items: [
          { name: "Design-Boutique Accommodations (Est.)", category: "Hotel", estCost: 650, note: "Average high-end design property in target city (2 nights)" },
          { name: "Fine Gastronomy Dinings (Est.)", category: "Restaurant", estCost: 380, note: "Average multi-course curated dinner matching client profile" },
          { name: "Artisanal Specialty Coffee & Sound Bars", category: "Cafe / Bar", estCost: 150, note: "Estimated mixology and third-wave espresso allowances" }
        ]
      });
      setEstimatingBudget(false);
      return;
    }

    const items = scheduledStops.map((stop) => {
      const v = stop.venue!;
      const cat = v.category || "Venue";
      let baseCost = 80;
      let note = "Estimated dining / ticket fee";

      if (cat.toLowerCase().includes("cafe")) {
        baseCost = 18 * (stop.duration || 1);
        note = "Premium third-wave coffee & bakery service";
      } else if (cat.toLowerCase().includes("bar") || cat.toLowerCase().includes("club")) {
        baseCost = 65 * (stop.duration || 1);
        note = "Bespoke micro-mixology & cover / seat charges";
      } else if (cat.toLowerCase().includes("restaurant")) {
        baseCost = 145 * (stop.duration || 1);
        note = "Multi-course high-concept tasting or design menu";
      } else if (cat.toLowerCase().includes("hotel")) {
        baseCost = 450;
        note = "Design-forward luxury suites (corporate contracted)";
      } else if (cat.toLowerCase().includes("museum") || cat.toLowerCase().includes("theater")) {
        baseCost = 45;
        note = "Fast-track VIP access passes & private tour options";
      } else if (cat.toLowerCase().includes("shop")) {
        baseCost = 110;
        note = "Niche publications / archival design pieces allocation";
      } else {
        baseCost = 60 * (stop.duration || 1);
        note = "Curated localized experience / anchor activity";
      }

      return {
        name: `Day ${stop.day} @ ${String(Math.floor((stop.slot * 30) / 60)).padStart(2, "0")}:${String((stop.slot * 30) % 60).padStart(2, "0")} — ${v.name}`,
        category: cat,
        estCost: baseCost,
        note
      };
    });

    // Add corporate booking platform curation fee
    items.push({
      name: "Qloo Multi-broker Reservation Fee",
      category: "Platform Fee",
      estCost: 45,
      note: "Autonomous API clearance & routing guarantees"
    });

    const total = items.reduce((acc, x) => acc + x.estCost, 0);
    setBudgetResults({ total, currency: "USD", items });
    setEstimatingBudget(false);
  }

  // Simulate Commute Timeline (Commute Plugin)
  async function simulateCommuteTimeline() {
    if (simulatingCommute) return;
    setSimulatingCommute(true);
    setCommuteTimeline([]);

    await new Promise((r) => setTimeout(r, 1200));

    const scheduledStops = schedule
      .map((s) => {
        const v = venues.find((x) => x.id === s.venueId);
        return { slot: s.startSlot, day: s.day, venue: v };
      })
      .filter((x) => x.venue)
      .sort((a, b) => a.day - b.day || a.slot - b.slot);

    if (scheduledStops.length < 2) {
      setCommuteTimeline([
        { time: "08:15 AM", action: "Base Dispatch Queue", details: "Autonomous EV Taxi dispatch pre-queued for scheduled morning start slot.", status: "QUEUED" },
        { time: "12:00 PM", action: "Dynamic Transit Matrix", details: "Awaiting multiple stops to build complete daily multi-point road optimization.", status: "PENDING" },
        { time: "07:30 PM", action: "Return Waypoint", details: "Automatic hotel/airport return route calculations waiting for active trip anchors.", status: "STANDBY" }
      ]);
      setSimulatingCommute(false);
      return;
    }

    const timeline: { time: string; action: string; details: string; status: string }[] = [];

    for (let i = 0; i < scheduledStops.length; i++) {
      const stop = scheduledStops[i];
      const v = stop.venue!;
      const h = Math.floor((stop.slot * 30) / 60);
      const m = (stop.slot * 30) % 60;
      
      // Calculate pickup time (30 mins before)
      let ph = h;
      let pm = m - 30;
      if (pm < 0) {
        ph -= 1;
        pm = 30;
      }
      const pTime = `${String(ph).padStart(2, "0")}:${String(pm).padStart(2, "0")} ${ph >= 12 ? "PM" : "AM"}`;

      if (i === 0) {
        timeline.push({
          time: pTime,
          action: commuteTransitMode === "ev_taxi" ? "Waymo EV Cab Dispatch" : commuteTransitMode === "rail" ? "Express Rail Connection" : "Private Chauffeur Pickup",
          details: `Dispatch pre-routed to initial destination "${v.name}" (${v.category}).`,
          status: "READY"
        });
      } else {
        const prev = scheduledStops[i - 1].venue!;
        timeline.push({
          time: pTime,
          action: "Inter-stop Transit Optimization",
          details: `Route recalculation: "${prev.name}" ➜ "${v.name}". Estimated transit time: 14 mins under standard traffic models. Autonomous trigger set.`,
          status: "QUEUED"
        });
      }
    }

    setCommuteTimeline(timeline);
    setSimulatingCommute(false);
  }

  // Execute Social Detective Scan (Social Detective Plugin)
  async function executeSocialDetective() {
    if (socialDetectiveScanning) return;
    setSocialDetectiveScanning(true);
    setSocialDetectiveMatches([]);

    await new Promise((r) => setTimeout(r, 1800));

    const mockSignals = [
      { signal: "Low-intervention Natural Wines & Biodynamic Viticulture", strength: 0.94, matchType: "Culinary Preferences", sentiment: "Strong Positive" },
      { signal: "Mid-Century brutalist architecture & functionalist spaces", strength: 0.88, matchType: "Design & Spatial", sentiment: "High Affinity" },
      { signal: "Independent avant-garde publications & small press design poetry", strength: 0.82, matchType: "Literary curation", sentiment: "Aesthetic Core" },
      { signal: "Ambient micro-house & experimental vinyl audio installations", strength: 0.79, matchType: "Acoustic Subcultures", sentiment: "Frequent Mention" }
    ];

    setSocialDetectiveMatches(mockSignals);
    setSocialDetectiveScanning(false);
  }

  // Send Itinerary via WhatsApp
  function sendViaWhatsApp() {
    if (schedule.length === 0) return;

    // Helper to format slot index to HH:MM
    const formatSlot = (slot: number) => {
      const h = Math.floor((slot * 30) / 60);
      const m = (slot * 30) % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };

    let text = `*VIBETOUR CURATED ITINERARY* 🌍\n`;
    text += `Tailored for *${clientName || "Executive Client"}* in *${destinationCity}*\n`;
    text += `Starting: *${tripStartDate || "Tomorrow"}* (${numDays} Days)\n\n`;

    for (let day = 1; day <= numDays; day++) {
      const dayStops = schedule
        .filter((s) => s.day === day)
        .sort((a, b) => a.startSlot - b.startSlot);

      if (dayStops.length > 0) {
        text += `*🗓️ Day ${day}*\n`;
        dayStops.forEach((stop) => {
          const v = venues.find((x) => x.id === stop.venueId);
          const timeStr = formatSlot(stop.startSlot);
          text += `• ${timeStr} — *${v?.name || stop.venueId}* (${v?.category || "Stop"})\n`;
        });
        text += `\n`;
      }
    }

    // Append dynamic local print URL
    const printUrl = `${window.location.origin}/print`;
    text += `📄 *View full interactive map, routes & PDF:* ${printUrl}`;

    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  }

  const [customSearchResults, setCustomSearchResults] = useState<Venue[]>([]);
  const [customSearching, setCustomSearching] = useState(false);

  const hasResults = viewPlan && venues.length > 0;

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const raw = localStorage.getItem("vibetour_schedule") || localStorage.getItem("vibeconcierge_schedule");
        if (raw) {
          const d = JSON.parse(raw);
          if (Array.isArray(d.venues)) setVenues(d.venues);
          if (Array.isArray(d.schedule)) setSchedule(d.schedule.map((x: unknown) => { const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>; return { uid: String(r.uid ?? ""), venueId: String(r.venueId ?? ""), day: typeof r.day === "number" ? r.day : 1, startSlot: typeof r.startSlot === "number" ? r.startSlot : (typeof r.hour === "number" ? r.hour * 2 : 0), duration: typeof r.duration === "number" ? r.duration : 2 }; }));
          if (typeof d.numDays === "number") setNumDays(d.numDays);
          if (typeof d.tripStartDate === "string") setTripStartDate(d.tripStartDate);
          if (d.center) setCenter(d.center);
          setSaveStatus("Restored from browser");
        }
      } catch {}
    }, 0);
    return () => clearTimeout(t);
  }, []);

  async function run() {
    const hasCity = Boolean(destinationCity.trim());
    const hasSource = Boolean(profileUrl.trim() || socialText.trim());

    if (!hasCity && !hasSource) {
      setError("Required fields missing: please enter a destination city and at least one taste source (Public URL or taste description, or both).");
      return;
    }
    if (!hasCity) {
      setError("Required field missing: please enter a destination city (e.g. London, Tokyo).");
      return;
    }
    if (!hasSource) {
      setError("Required field missing: please enter a Public URL, paste taste preferences, or both (if both are filled, the page and text will be combined).");
      return;
    }

    setLoading(true);
    setError(null);
    setGated(false);
    setLogs([]);
    setTags([]);
    setVenues([]);
    setRationale("");
    setSelected(null);
    setTypeFilter(null);
    setSchedule([]);
    setMoreOffset(12);
    setPlanReady(false);
    setViewPlan(false);
    setShowBriefing(false);
    try {
      const res = await fetch("/api/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName, destinationCity, profileUrl, socialText, provider: llmProvider }),
      });
      const data = (await res.json()) as ConciergeResponse & { error?: string; status?: string; message?: string };
      if (data.status === "gated_error") {
        setGated(true);
        setLogs(data.logs || []);
        setError(data.message || "Profile is login-gated.");
        setLoading(false);
        return;
      }
      if (data.error) throw new Error(data.error);
      for (let i = 0; i < (data.logs || []).length; i++) {
        await new Promise((r) => setTimeout(r, 250));
        setLogs((prev) => [...prev, data.logs[i]]);
      }
      setTags(data.tags || []);
      setVenues(data.venues || []);
      setRationale(data.rationaleReport || "");
      setMoreOffset(12);
      setPlanReady((data.venues || []).length > 0);
      if (data.venues?.length) {
        const lats = data.venues.map((v) => v.lat).filter((x): x is number => typeof x === "number");
        const lons = data.venues.map((v) => v.lon).filter((x): x is number => typeof x === "number");
        if (lats.length) setCenter({ lat: lats.reduce((a, b) => a + b, 0) / lats.length, lon: lons.reduce((a, b) => a + b, 0) / lons.length });
      }
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  function saveToBrowser() {
    try {
      localStorage.setItem("vibetour_schedule", JSON.stringify({ venues, schedule, numDays, tripStartDate, center, savedAt: Date.now() }));
      setSaveStatus("Saved to browser");
    } catch {
      setSaveStatus("Save failed");
    }
  }

  function clearBrowser() {
    try {
      localStorage.removeItem("vibetour_schedule");
      localStorage.removeItem("vibeconcierge_schedule");
      setSaveStatus("Browser storage cleared");
    } catch {
      setSaveStatus("Clear failed");
    }
  }

  function resetForm() {
    setClientName("");
    setDestinationCity("");
    setProfileUrl("");
    setSocialText("");
    setTags([]);
    setVenues([]);
    setLogs([]);
    setError(null);
    setGated(false);
    setPlanReady(false);
    setSelected(null);
    setRationale("");
    setSchedule([]);
  }

  async function loadMore(category: string) {
    if (loadingMore) return;
    setLoadingMore(true);
    const placeholderId = `loading-${category}-${Date.now()}`;
    setVenues((prev) => [...prev, { id: placeholderId, name: `Scouting ${category}...`, category, affinity: 0, address: `Searching Qloo graph in ${destinationCity}`, tags: [] }]);
    try {
      const r = await fetch("/api/more", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: destinationCity,
          tags: tags.map((t) => t.name),
          tagIds: tags.map((t) => t.qlooTagId).filter(Boolean),
          category,
          excluded: venues.map((v) => v.id),
          offset: moreOffset,
          enrichmentText: enrichmentText.trim() || undefined,
        }),
      });
      const d = await r.json();
      const newPlaces = (d.places || []) as Venue[];
      setVenues((prev) => {
        const without = prev.filter((p) => p.id !== placeholderId);
        if (!newPlaces.length) return without;
        const ids = new Set(without.map((p) => p.id));
        const toAdd = newPlaces.filter((p) => !ids.has(p.id));
        if (toAdd.length) {
          // Auto-select the newly discovered venue so the map centers and pops it up
          setTimeout(() => {
            setSelected(toAdd[0].id);
          }, 150);
          return [...without, ...toAdd];
        }
        return without;
      });
      setMoreOffset((o) => o + 12);
      if (newPlaces.length > 0) {
        setSaveStatus(`Found new ${category}: "${newPlaces[0].name}" via Qloo.`);
      } else {
        setSaveStatus(`No additional ${category} venues found for these taste tags.`);
      }
    } catch {
      setVenues((prev) => prev.filter((p) => p.id !== placeholderId));
      setSaveStatus(`Could not fetch additional ${category}.`);
    } finally {
      setLoadingMore(false);
    }
  }

  async function searchOtherLocations(e?: React.FormEvent, directQuery?: string) {
    if (e) e.preventDefault();
    const query = (directQuery ?? customSearchQuery).trim();
    if (!query) return;
    if (directQuery) setCustomSearchQuery(directQuery);
    setCustomSearching(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}&city=${encodeURIComponent(destinationCity || "")}`);
      const data = await res.json();
      const items: Venue[] = (data.results || []).map((r: { id?: string; name?: string; category?: string; address?: string; lat?: number; lon?: number }) => {
        const sub = r.category && r.category !== "Venue" ? r.category : (/airport/i.test(query) ? "Airport" : /hotel/i.test(query) ? "Hotel" : /hq|office|company/i.test(query) ? "Company HQ" : "Trip Hub");
        return {
          id: r.id || `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: r.name || query,
          category: "Manual",
          address: r.address || `${query}, ${destinationCity}`,
          lat: typeof r.lat === "number" && r.lat !== 0 ? r.lat : center.lat,
          lon: typeof r.lon === "number" && r.lon !== 0 ? r.lon : center.lon,
          affinity: 1.0,
          tags: ["Manual", sub],
          rationale: `Functional trip anchor: ${r.name || query} (${sub}) in ${destinationCity || "destination"}.`,
        };
      });
      setCustomSearchResults(items);
    } catch {
      const sub = /airport/i.test(query) ? "Airport" : /hotel/i.test(query) ? "Hotel" : /hq|office|company/i.test(query) ? "Company HQ" : "Trip Hub";
      setCustomSearchResults([
        {
          id: `manual-${Date.now()}`,
          name: query,
          category: "Manual",
          address: `${query}, ${destinationCity}`,
          lat: center.lat,
          lon: center.lon,
          affinity: 1.0,
          tags: ["Manual", sub],
          rationale: `Functional trip anchor: ${query} (${sub}) in ${destinationCity}.`,
        },
      ]);
    } finally {
      setCustomSearching(false);
    }
  }

  function handleAddCustomToMap(item: Venue) {
    setVenues((prev) => {
      if (prev.some((v) => v.id === item.id)) return prev;
      return [item, ...prev];
    });
    setSelected(item.id);
    if (typeof item.lat === "number" && typeof item.lon === "number") {
      setCenter({ lat: item.lat, lon: item.lon });
    }
    setSaveStatus(`Added functional location "${item.name}" to Manual category.`);
    setCustomSearchResults((prev) => prev.filter((x) => x.id !== item.id));
  }

  const ALL_TYPES = ["Bar", "Cafe", "Club", "Hotel", "Museum", "Park", "Restaurant", "Shop", "Theater", "Venue"];
  const types = ALL_TYPES;

  // Active day route coordinates and ordered stops
  const currentTargetDay = selectedDayRoute ?? 1;
  const activeDaySchedule = schedule
    .filter((s) => s.day === currentTargetDay)
    .sort((a, b) => a.startSlot - b.startSlot);

  const dayOrdersMap = new Map<string, number[]>();
  activeDaySchedule.forEach((s, idx) => {
    const arr = dayOrdersMap.get(s.venueId) || [];
    arr.push(idx + 1);
    dayOrdersMap.set(s.venueId, arr);
  });

  // When a specific day route is selected, show only items on that day ordered by time slot, unless a category filter is active
  let filteredVenues: Venue[];
  if (selectedDayRoute !== null && !typeFilter) {
    // Show only the venues in activeDaySchedule, ordered by schedule time
    const dayVenues: Venue[] = [];
    activeDaySchedule.forEach((s) => {
      const v = venues.find((x) => x.id === s.venueId);
      if (v && !dayVenues.some((item) => item.id === v.id)) {
        dayVenues.push(v);
      }
    });
    filteredVenues = dayVenues;
  } else if (typeFilter) {
    filteredVenues = venues.filter((v) => (v.category || "Venue") === typeFilter);
  } else {
    filteredVenues = venues;
  }

  const mapPlaces = filteredVenues.map((v) => {
    const orders = dayOrdersMap.get(v.id) || [];
    return {
      ...v,
      dayOrder: orders[0],
      dayOrders: orders,
    };
  });

  const routeCoordinates = (selectedDayRoute ? activeDaySchedule : [])
    .map((s) => {
      const v = venues.find((x) => x.id === s.venueId);
      return v && typeof v.lat === "number" && typeof v.lon === "number" ? [v.lat, v.lon] as [number, number] : null;
    })
    .filter((pt): pt is [number, number] => pt !== null);

  function handleAddVenueToSchedule(venueId: string) {
    const targetDay = selectedDayRoute ?? 1;
    const v = venues.find((x) => x.id === venueId);
    const daySlots = schedule.filter((s) => s.day === targetDay);
    let nextSlot = 2; // 10:00 AM default
    if (daySlots.length > 0) {
      const maxEndSlot = Math.max(...daySlots.map((s) => s.startSlot + (s.duration || 2)));
      nextSlot = Math.min(20, maxEndSlot + 1);
    }
    setSchedule((prev) => [
      ...prev,
      {
        uid: `${venueId}-${Date.now()}`,
        venueId,
        day: targetDay,
        startSlot: nextSlot,
        duration: 2,
      },
    ]);
    if (v) setSaveStatus(`Added "${v.name}" to Day ${targetDay}.`);
  }

  function handleRemoveVenueFromSchedule(venueId: string, clearAll = false) {
    const targetDay = selectedDayRoute ?? 1;
    const v = venues.find((x) => x.id === venueId);
    if (clearAll) {
      setSchedule((prev) => prev.filter((s) => !(s.venueId === venueId && s.day === targetDay)));
      if (v) setSaveStatus(`Removed all stops for "${v.name}" from Day ${targetDay}.`);
    } else {
      setSchedule((prev) => {
        const dayVisits = prev.filter((s) => s.venueId === venueId && s.day === targetDay);
        if (dayVisits.length === 0) return prev;
        const lastVisit = dayVisits[dayVisits.length - 1];
        return prev.filter((s) => s.uid !== lastVisit.uid);
      });
      if (v) setSaveStatus(`Removed latest stop for "${v.name}" from Day ${targetDay}.`);
    }
  }

  const [draggedUid, setDraggedUid] = useState<string | null>(null);

  function handleDropReorder(draggedUid: string, targetUid: string) {
    if (!draggedUid || !targetUid || draggedUid === targetUid) return;
    const currentDay = selectedDayRoute ?? 1;
    setSchedule((prev) => {
      const daySlots = prev.filter((s) => s.day === currentDay).sort((a, b) => a.startSlot - b.startSlot);
      const otherSlots = prev.filter((s) => s.day !== currentDay);
      
      const fromIdx = daySlots.findIndex((s) => s.uid === draggedUid);
      const toIdx = daySlots.findIndex((s) => s.uid === targetUid);
      if (fromIdx === -1 || toIdx === -1) return prev;

      const reordered = [...daySlots];
      const [movedItem] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, movedItem);

      let currentSlot = 0;
      const updatedDaySlots = reordered.map((s) => {
        const slot = currentSlot;
        currentSlot += (s.duration || 2);
        return { ...s, startSlot: slot };
      });

      return [...otherSlots, ...updatedDaySlots];
    });
    setSaveStatus(`Reordered Day ${currentDay} route sequence.`);
  }

  function handleRemoveSlotUid(uid: string) {
    const s = schedule.find((x) => x.uid === uid);
    const v = venues.find((x) => x.id === s?.venueId);
    setSchedule((prev) => prev.filter((x) => x.uid !== uid));
    if (v) setSaveStatus(`Removed "${v.name}" stop from Day ${s?.day || 1}.`);
  }

  async function autoBuildSchedule() {
    if (venues.length === 0 || autoScheduling) return;
    setAutoScheduling(true);
    setSaveStatus("Autonomous concierge building schedule...");
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venues, numDays, provider: llmProvider }),
      });
      const data = await res.json();
      if (Array.isArray(data.schedule) && data.schedule.length > 0) {
        setSchedule(data.schedule);
        setSaveStatus(`Auto-generated itinerary with ${data.schedule.length} curated stops.`);
        setTimeout(() => {
          document.getElementById("schedule-section")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        setSaveStatus("Could not auto-generate schedule.");
      }
    } catch {
      setSaveStatus("Failed to auto-generate schedule.");
    } finally {
      setAutoScheduling(false);
    }
  }

  function addCustomVenue() {
    if (!customName.trim()) return;
    const customId = `custom-${Date.now()}`;
    const newVenue: Venue = {
      id: customId,
      name: customName.trim(),
      category: customCategory,
      address: customAddress.trim() || undefined,
      affinity: 0.95,
      lat: center.lat + (Math.random() - 0.5) * 0.02,
      lon: center.lon + (Math.random() - 0.5) * 0.02,
      rationale: "Custom curated entry added by host.",
    };
    setVenues((prev) => [newVenue, ...prev]);
    setSchedule((prev) => [
      ...prev,
      {
        uid: `${customId}-slot`,
        venueId: customId,
        day: customDay,
        startSlot: customSlot,
        duration: customDuration,
      },
    ]);
    setCustomName("");
    setCustomAddress("");
    setShowAddModal(false);
    setSaveStatus(`Added "${newVenue.name}" to Day ${customDay}.`);
  }

  function getGCalSingleUrl(item: { venueId: string; day: number; startSlot: number; duration: number }) {
    const v = venues.find((x) => x.id === item.venueId);
    const start = formatCalDate(item.day, item.startSlot);
    const end = formatCalDate(item.day, item.startSlot + (item.duration || 2));
    const title = v?.name || "Itinerary Stop";
    const details = `${v?.category || "Venue"}${v?.address ? " - " + v.address : ""}${v?.rationale ? "\n\n" + v.rationale : ""}`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(v?.address || "")}`;
  }

  function slotToHM(slot: number) {
    const total = slot * 30; // Offset from midnight (00:00)
    return { h: Math.floor(total / 60), m: total % 60 };
  }

  function getDateForDay(day: number): { y: number; m: number; d: number } {
    const parts = (tripStartDate || "2026-10-28").split("-").map(Number);
    const y = parts[0] || 2026;
    const m = (parts[1] || 10) - 1;
    const d = parts[2] || 28;
    const target = new Date(Date.UTC(y, m, d + (day - 1)));
    return { y: target.getUTCFullYear(), m: target.getUTCMonth() + 1, d: target.getUTCDate() };
  }

  function formatCalDate(day: number, slot: number): string {
    const dt = getDateForDay(day);
    const hm = slotToHM(slot);
    const yStr = String(dt.y).padStart(4, "0");
    const mStr = String(dt.m).padStart(2, "0");
    const dStr = String(dt.d).padStart(2, "0");
    const hStr = String(hm.h).padStart(2, "0");
    const minStr = String(hm.m).padStart(2, "0");
    return `${yStr}${mStr}${dStr}T${hStr}${minStr}00`;
  }

  function exportGoogleCalendar() {
    if (schedule.length === 0) return;
    const sorted = schedule.slice().sort((a, b) => a.day - b.day || a.startSlot - b.startSlot);
    
    // Google Calendar URL template only supports one event at a time.
    // If the schedule has multiple items, opening multiple tabs can be blocked by popup blockers.
    // We open up to the first 4 events in separate tabs or download the full multi-event ICS for 1-click import.
    sorted.forEach((item, index) => {
      const url = getGCalSingleUrl(item);
      setTimeout(() => {
        window.open(url, "_blank");
      }, index * 250);
    });
    setSaveStatus(`Opening ${sorted.length} Google Calendar event tabs. Tip: You can also use "Download for Google Calendar (.ICS)" for 1-click import!`);
  }

  function downloadCSVCalendar() {
    // Google Calendar native CSV format
    // Header format: Subject,Start Date,Start Time,End Date,End Time,All Day Event,Description,Location
    const rows = [
      ["Subject", "Start Date", "Start Time", "End Date", "End Time", "All Day Event", "Description", "Location"],
      ...schedule.slice().sort((a, b) => a.day - b.day || a.startSlot - b.startSlot).map((s) => {
        const v = venues.find((x) => x.id === s.venueId);
        const dt = getDateForDay(s.day);
        const st = slotToHM(s.startSlot);
        const et = slotToHM(s.startSlot + (s.duration || 2));
        const dateStr = `${String(dt.m).padStart(2, "0")}/${String(dt.d).padStart(2, "0")}/${dt.y}`;
        const startTimeStr = `${String(st.h).padStart(2, "0")}:${String(st.m).padStart(2, "0")}`;
        const endTimeStr = `${String(et.h).padStart(2, "0")}:${String(et.m).padStart(2, "0")}`;
        const subject = `VibeTour: ${v?.name || s.venueId} (${v?.category || "Stop"})`;
        const desc = `${v?.category || "Venue"}${v?.address ? " - " + v.address : ""}${v?.rationale ? "\n" + v.rationale : ""}`;
        const loc = v?.address || "";
        return [subject, dateStr, startTimeStr, dateStr, endTimeStr, "False", desc, loc];
      }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "google_calendar_itinerary.csv";
    a.click();
    URL.revokeObjectURL(url);
    setSaveStatus("Downloaded Google Calendar CSV (ready for Google Calendar Import in Settings).");
  }

  function getTimezoneForCity(city: string): string {
    const c = (city || "").toLowerCase().trim();
    if (c.includes("rome") || c.includes("milan") || c.includes("italy")) return "Europe/Rome";
    if (c.includes("london") || c.includes("uk")) return "Europe/London";
    if (c.includes("paris") || c.includes("france")) return "Europe/Paris";
    if (c.includes("tokyo") || c.includes("japan")) return "Asia/Tokyo";
    if (c.includes("new york") || c.includes("ny")) return "America/New_York";
    if (c.includes("madrid") || c.includes("spain")) return "Europe/Madrid";
    return "UTC";
  }

  function downloadICS(openGCalImport = false) {
    if (schedule.length === 0) return;
    const tz = getTimezoneForCity(destinationCity);
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//VibeTour//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:VibeTour - ${clientName || "Trip"} (${destinationCity})`,
      `X-WR-TIMEZONE:${tz}`
    ];
    schedule.slice().sort((a, b) => a.day - b.day || a.startSlot - b.startSlot).forEach((item, i) => {
      const venue = venues.find((v) => v.id === item.venueId);
      const dur = item.duration || 2;
      const start = formatCalDate(item.day, item.startSlot);
      const end = formatCalDate(item.day, item.startSlot + dur);
      const title = `Day ${item.day}: ${venue?.name || item.venueId} (${venue?.category || "Stop"})`;
      const desc = [
        `Category: ${venue?.category || "Venue"}`,
        `Address: ${venue?.address || "N/A"}`,
        venue?.rationale ? `\nStrategic Rationale:\n${venue.rationale}` : "",
        `\nDirections: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([venue?.name, venue?.address].filter(Boolean).join(", "))}`
      ].filter(Boolean).join("\n");
      
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:vibe-${i}-${Date.now()}@vibetour`);
      lines.push(`SUMMARY:${title}`);
      lines.push(`DESCRIPTION:${desc.replace(/\n/g, "\\n")}`);
      if (venue?.address) lines.push(`LOCATION:${venue.address}`);
      if (typeof venue?.lat === "number" && typeof venue?.lon === "number") lines.push(`GEO:${venue.lat};${venue.lon}`);
      lines.push(`DTSTART;TZID=${tz}:${start}`);
      lines.push(`DTEND;TZID=${tz}:${end}`);
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `VibeTour_${(destinationCity || "Trip").replace(/\s+/g, "_")}_Itinerary.ics`;
    a.click();
    URL.revokeObjectURL(url);
    
    if (openGCalImport) {
      setTimeout(() => {
        window.open("https://calendar.google.com/calendar/r/settings/export", "_blank");
      }, 400);
      setSaveStatus("Downloaded .ICS itinerary & opened Google Calendar Import page! Drag & drop the file to import all stops instantly.");
    } else {
      setSaveStatus("Downloaded .ICS itinerary for Google Calendar / Apple Calendar.");
    }
  }

  if (!hasResults) {
    return (
      <div className="page page-hero">
        <div className="hero">
          <div className="hero-bg" />
          <div className="hero-grid">
            <div className="hero-claim">
              <div style={{ marginBottom: 20, display: "flex", justifyContent: "center" }}>
                <img src="/vtlogo.png" alt="VibeTour" style={{ height: 88, width: "auto", display: "block" }} />
              </div>
              <h1>Autonomous taste-driven tour organizer</h1>
              <p>VibeTour transforms an incoming guest&apos;s public cultural footprint into a high-taste host itinerary in your city — powered by Qloo&apos;s taste graph, not generic LLM guesses.</p>
              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span className="chip">Qloo taste graph</span>
                <span className="chip">Groq LLM</span>
                <span className="chip">Interactive map</span>
              </div>

              <div className="card usecase-parent-card">
                <div className="card-head" style={{ marginBottom: 10 }}>
                  <div>
                    <h2 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--amber)", fontWeight: 700 }}>
                      USECASES
                    </h2>
                    <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>
                      Dual-market cultural discovery engine
                    </p>
                  </div>
                </div>

                <div className="usecase-row">
                  <div className="usecase-subcard">
                    <span className="usecase-tag">Personal / Tour operators</span>
                    <p className="usecase-desc">You and friends are visiting a city. Enter your preferences to uncover culturally matched spots.</p>
                  </div>

                  <div className="usecase-subcard">
                    <span className="usecase-tag">B2B / B2C</span>
                    <p className="usecase-desc">A client is visiting your company for a few days. Enter their preferences or fetch their socials to find out.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="card search-control-card" style={{ background: "rgba(25,24,22,0.72)", backdropFilter: "blur(12px)" }}>
              <div className="card-head" style={{ alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--tile)", padding: "3px 10px", borderRadius: 8, border: "1px solid var(--line-strong)", flexWrap: "wrap", fontSize: 11, fontWeight: 700, color: "var(--amber)" }}>
                  <span style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginRight: 4 }}>Model:</span>
                  openai/gpt-oss-120b (Groq) ✓
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    background: "var(--tile)",
                    border: "1px solid var(--line-strong)",
                    padding: "4px 10px",
                    borderRadius: 8,
                    color: "var(--text-2)",
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: "pointer",
                    letterSpacing: "0.03em",
                  }}
                  title="Reset all form fields"
                >
                  ↻ Reset form
                </button>
              </div>
              <div className="stack">
                <input className="field" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Guest / group name (e.g. Kenji Tanaka, Sarah & Friends)" />
                
                {/* Demos Quick-Start Block */}
                <div className="row" style={{ gap: 8, marginTop: 6, marginBottom: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, flexShrink: 0 }}>
                    DEMOS:
                  </span>
                  {(["Kenji / New York", "Fiona / Rome", "Carlos / Tokyo", "Marla / Paris"] as const).map((label) => {
                    const [persona, city] = label.split(" / ");
                    return (
                      <button
                        key={label}
                        className="btn"
                        type="button"
                        disabled={loading}
                        style={{ height: 24, fontSize: 10, padding: "0 8px", letterSpacing: "0.03em", background: "var(--bg-2)", color: "var(--accent)", border: "1px solid var(--accent)", opacity: 0.85 }}
                        onClick={async () => {
                          const KENJI_TEXT = `Kenji Tanaka is a 34-year-old Senior Creative Director at a boutique digital agency based in Tokyo's high-design Daikanyama district. He possesses a deeply curated, minimalist aesthetic that heavily influences both his professional work and his personal lifestyle choices. Rather than following mainstream global trends, Kenji aligns himself with niche sub-cultures, displaying a strong preference for mid-century brutalist architecture, independent Japanese menswear labels, and rare architectural publications.\nWhen it comes to his off-duty hours, Kenji's cultural footprint spans high-fidelity audio and artisanal craftsmanship. He is an avid collector of vintage jazz and electronic vinyl records, frequently spending his evenings scouting hidden, underground listening bars across Shibuya. His daytime routine is anchored by third-wave specialty coffee roasters that focus on single-origin beans and clean, geometric interior spaces, reflecting his broader appreciation for functionalism and understated luxury.\nAs a traveler visiting an international city like London, Kenji completely avoids typical commercial tourist spots, actively seeking out places that mirror Tokyo's sub-cultural DNA. He prioritizes heritage menswear boutiques that focus on sustainable craftsmanship, independent design bookshops, and low-lit cocktail lounges that play ambient or experimental cuts over a high-end sound system. For a host executive looking to build genuine rapport, presenting an itinerary that speaks directly to these micro-tastes is the ultimate key to unlocking a lasting professional relationship.`;
                          const FIONA_TEXT = `Fiona Lindström is a 42-year-old Chief Operating Officer at a leading Stockholm-based green technology firm, embodying the effortless elegance of modern Scandinavian leadership. She lives by the Swedish philosophy of lagom—finding the perfect balance of functional utility and understated premium design. Her lifestyle centers on clean geometric forms, organic materials, and sustainable luxury, preferring independent Nordic interior design concepts and eco-conscious heritage fashion brands over loud corporate logos.\nOutside the boardroom, Fiona is an avid wellness and contemporary art enthusiast. Her mornings typically begin with visits to specialty micro-roasters that prioritize fair-trade, light-roast single-origin coffees, and her weekends are often spent exploring minimalist modern art galleries or attending acoustic neo-classical music performances. When dining out, she seeks out hyper-local, farm-to-table culinary experiences that focus on innovative, seasonal ingredients and Nordic gastronomy principles.\nWhen traveling to a major international hub like London for executive meetings, Fiona has zero interest in generic luxury hotels or crowded tourist staples. She leans toward high-design boutique accommodations, quiet independent art bookstores, and hidden culinary spaces that fuse architectural design with strict sustainability standards. To truly impress her and secure a strategic partnership, a host executive must look past basic corporate hospitality and curate an itinerary that aligns with her values of high-concept design, environmental mindfulness, and quiet sophistication.`;
                          const CARLOS_TEXT = `Carlos Vega is a 38-year-old Managing Partner at a leading early-stage venture capital firm based in Madrid’s vibrant Chamberí district. He represents the new wave of southern European tech investors, blending sharp financial acumen with an active, high-energy Mediterranean lifestyle. Carlos favors a "smart-casual" executive aesthetic, completely bypassing traditional corporate suits in favor of premium unstructured blazers, independent Spanish artisanal leather footwear, and minimalist luxury timepieces.\nAway from the pitch deck, Carlos is a deeply passionate culinary explorer and an avid indie-rock enthusiast. He spends his weekends seeking out hidden natural wine bars, underground live music venues, and conceptual tapas galleries that reinvent traditional Iberian flavors through avant-garde gastronomy. His morning routine is anchored by third-wave espresso lounges that feature striking contemporary art, reflecting his personal passion for collecting emerging Spanish abstract paintings and graphic prints.\nWhen flying into an international financial hub like London to scout cross-border deals or meet limited partners, Carlos skips generic institutional hotels and mainstream steak houses. He actively hunts for high-design boutique stays, hidden vinyl-listening cocktail bars, and energetic, chef-driven culinary laboratories that bridge cultural heritage with modern execution. For an entrepreneur or host executive aiming to build a high-trust relationship with him, orchestrating an evening that taps into this exact mix of indie culture, modern art, and bleeding-edge gastronomy is the ultimate way to close the deal.`;
                          const MARLA_TEXT = `Marla Vance is a 31-year-old high-end contemporary art consultant and fashion archivist dividing her time between New York and Paris. She embodies a dark academia and neo-vintage aesthetic, favoring archival 1990s Japanese fashion, vintage design furniture, and classic French new wave cinema. Her lifestyle is heavily inspired by literary curation, rare vintage photography books, and experimental art installations.\nDuring her free hours, Marla focuses on niche luxury sensory experiences. She is an avid collector of independent artisan perfumes and rare design publications, spending her afternoons exploring back-alley gallery spaces. Her routine centers around quiet architectural book cafés, independent poetry publishing houses, and candle-lit natural wine caves that play retro French ambient or experimental synthesizer music over vintage horn speakers.\nAs a traveler visiting a historic cultural capital, Marla bypasses typical commercial tourist sights and high-volume retail avenues. She prioritizes low-key independent archival boutiques, historic typography print shops, and intimate, chef-driven tasting rooms that combine classical gastronomy with modernist design. To build an enduring creative or professional connection with Marla, a host must curate an itinerary that reflects her love for archival fashion, historic design, and rare, quiet sensory discoveries.`;

                          const text = persona === "Kenji" ? KENJI_TEXT : persona === "Fiona" ? FIONA_TEXT : persona === "Carlos" ? CARLOS_TEXT : MARLA_TEXT;
                          const name = persona === "Kenji" ? "Kenji Tanaka" : persona === "Fiona" ? "Fiona Lindström" : persona === "Carlos" ? "Carlos Vega" : "Marla Vance";

                          // Update form display state
                          setClientName(name);
                          setSocialText(text);
                          setDestinationCity(city);
                          setError(null);
                          // Run the API directly with the known values (avoids stale React state)
                          setLoading(true);
                          setGated(false);
                          setLogs([]);
                          setTags([]);
                          setVenues([]);
                          setRationale("");
                          setSelected(null);
                          setTypeFilter(null);
                          setSchedule([]);
                          setMoreOffset(12);
                          setPlanReady(false);
                          setViewPlan(false);
                          setShowBriefing(false);
                          try {
                            const res = await fetch("/api/concierge", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ clientName: name, destinationCity: city, profileUrl: "", socialText: text, provider: llmProvider }),
                            });
                            const data = (await res.json()) as ConciergeResponse & { error?: string; status?: string; message?: string };
                            if (data.status === "gated_error") { setGated(true); setLogs(data.logs || []); setError(data.message || "Profile is login-gated."); return; }
                            if (data.error) throw new Error(data.error);
                            for (let i = 0; i < (data.logs || []).length; i++) {
                              await new Promise((r) => setTimeout(r, 120));
                              setLogs((prev) => [...prev, data.logs[i]]);
                            }
                            setTags(data.tags || []);
                            setVenues(data.venues || []);
                            setRationale(data.rationaleReport || "");
                            setMoreOffset(12);
                            setPlanReady((data.venues || []).length > 0);
                            if (data.venues?.length) {
                              const lats = data.venues.map((v) => v.lat).filter((x): x is number => typeof x === "number");
                              const lons = data.venues.map((v) => v.lon).filter((x): x is number => typeof x === "number");
                              if (lats.length) setCenter({ lat: lats.reduce((a, b) => a + b, 0) / lats.length, lon: lons.reduce((a, b) => a + b, 0) / lons.length });
                            }
                          } catch (e: unknown) {
                            setError((e as { message?: string })?.message || "Failed");
                          } finally {
                            setLoading(false);
                          }
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                
                <div>
                  <input
                    className={`field ${!destinationCity.trim() && error ? "field-error" : ""}`}
                    value={destinationCity}
                    onChange={(e) => {
                      setDestinationCity(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Destination city * (required, e.g. London, Tokyo)"
                  />
                  {!destinationCity.trim() && error && (
                    <span style={{ color: "var(--coral)", fontSize: 11, display: "block", marginTop: 3 }}>
                      * Destination city is required
                    </span>
                  )}
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Taste Source (Public URL, Text, or both) *
                    </span>
                    <span style={{ fontSize: 10, color: "var(--amber)" }}>Min 1 required (combines both if provided)</span>
                  </div>
                  <input
                    className={`field ${!profileUrl.trim() && !socialText.trim() && error ? "field-error" : ""}`}
                    value={profileUrl}
                    onChange={(e) => {
                      setProfileUrl(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Public URL (Wikipedia, blog, article...)"
                  />
                  <div className="row" style={{ marginTop: 4, marginBottom: 8, gap: 6 }}>
                    <button className="btn" type="button" onClick={() => { setProfileUrl("https://en.wikipedia.org/wiki/Karl_Marx"); if (error) setError(null); }} style={{ height: 24, fontSize: 11 }}>Karl Marx (Wikipedia)</button>
                    <button className="btn" type="button" onClick={() => { setProfileUrl("https://en.wikipedia.org/wiki/Elon_Musk"); if (error) setError(null); }} style={{ height: 24, fontSize: 11 }}>Elon Musk (Wikipedia)</button>
                    <div style={{ display: "flex", gap: 0, alignItems: "center" }}>
                      <button className="btn" type="button" onClick={() => { 
                        setClientName("Liam Sterling");
                        setDestinationCity("Tokyo");
                        setProfileUrl(window.location.origin + "/mock-profile"); 
                        setSocialText("Liam Sterling is a 39-year-old Lead Urban Architect and Acoustic Soundscape Consultant based in San Francisco, CA. He possesses a deeply curated, minimalist aesthetic heavily influenced by his work in acoustics and spatial architecture. Rather than following mainstream global trends, Liam aligns himself with niche sub-cultures, displaying a strong preference for mid-century modern and brutalist architecture, Bauhaus furniture, and independent Japanese heritage denim.\nWhen it comes to his off-duty hours, Liam's cultural footprint spans high-fidelity audio and artisanal craftsmanship. He is an avid collector of vintage jazz and electronic vinyl records, frequently spending his evenings scouting hidden, underground listening bars. His daytime routine is anchored by third-wave specialty coffee roasters that focus on single-origin beans and clean, geometric interior spaces, reflecting his broader appreciation for functionalism and understated luxury.\nAs a traveler, Liam completely avoids typical commercial tourist spots, actively seeking out places that mirror his sub-cultural DNA. He prioritizes heritage boutiques that focus on sustainable craftsmanship, independent design bookshops, and low-lit cocktail and natural wine lounges that play ambient, minimal techno, or experimental cuts over a high-end sound system. For a host executive looking to build genuine rapport, presenting an itinerary that speaks directly to these micro-tastes is the ultimate key to unlocking a lasting professional relationship.");
                        if (error) setError(null); 
                      }} style={{ height: 24, fontSize: 11, borderColor: "rgba(237,166,69,0.5)", color: "var(--amber)", borderTopRightRadius: 0, borderBottomRightRadius: 0 }}>Liam Sterling (Mock Facebook)</button>
                      <a 
                        href="/mock-profile" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="btn" 
                        title="Preview the Mock Facebook Profile in a new tab"
                        style={{ height: 24, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", width: 22, padding: 0, borderColor: "rgba(237,166,69,0.5)", color: "var(--amber)", borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: "none" }}
                      >
                        ↗
                      </a>
                    </div>
                  </div>
                  <textarea
                    className={`field ${!profileUrl.trim() && !socialText.trim() && error ? "field-error" : ""}`}
                    value={socialText}
                    onChange={(e) => {
                      setSocialText(e.target.value);
                      if (error) setError(null);
                    }}
                    rows={3}
                    style={{ resize: "vertical" }}
                    placeholder="Paste taste preferences, sub-culture tastes, or bio text (if both URL and text are filled, they will be combined)..."
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                    <button className="btn" type="button" disabled={generating} onClick={async () => {
                      setGenerating(true);
                      try {
                        const r = await fetch("/api/generate", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ provider: llmProvider }),
                        });
                        const d = await r.json();
                        if (d.text) {
                          setSocialText(d.text);
                          if (error) setError(null);
                        }
                        else if (d.error) alert(d.error);
                      } catch { alert("Generate failed"); }
                      finally { setGenerating(false); }
                    }} style={{ height: 26, fontSize: 11 }}>
                      {generating ? "Generating..." : "Generate persona"}
                    </button>
                  </div>
                  {!profileUrl.trim() && !socialText.trim() && error && (
                    <span style={{ color: "var(--coral)", fontSize: 11, display: "block", marginTop: 3 }}>
                      * Please provide at least one: Public URL or taste text (or both)
                    </span>
                  )}
                </div>

                {gated && <p style={{ color: "var(--coral)", fontSize: 12, margin: 0 }}>OSINT ALERT: profile is gated. Paste public text above and re-run.</p>}
                <p style={{ color: "var(--text-3)", fontSize: 11, margin: 0 }}>Facebook/LinkedIn are login-gated; Jina cannot read them. Paste public About/Interests text above for extraction.</p>
                <button className="btn btn-primary" onClick={() => { if (planReady && venues.length > 0) setViewPlan(true); else run(); }} disabled={loading} style={{ height: 38, width: "100%", animation: planReady ? "blink 1.2s infinite" : "none" }}>
                  {loading ? "deploying scan - Wait" : planReady ? "View the plan" : "Deploy autonomous vibe scan"}
                </button>
                {planReady && rationale && (
                  <button className="btn" onClick={() => setShowBriefing(true)} style={{ height: 34, width: "100%", marginTop: 6 }}>
                    View strategic briefing
                  </button>
                )}
                {error && <p style={{ color: "var(--coral)", fontSize: 13 }}>{error}</p>}
                {tags.length > 0 && (
                  <div className="row">
                    {tags.map((t, i) => (
                      <span key={i} className="chip">{t.name} <span style={{ color: "var(--text-3)" }}>({t.category})</span>{t.qlooTagName && t.qlooTagName.toLowerCase() !== t.name.toLowerCase() ? <span style={{ color: "var(--light)" }}> → {t.qlooTagName}</span> : null}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

      {/* Compact execution pane */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 1000, background: "rgba(10,9,8,0.92)", backdropFilter: "blur(8px)", borderTop: "1px solid var(--line-strong)", padding: "6px 12px", fontFamily: "monospace", fontSize: 11, color: "#9cdcfe", height: 44, overflow: "auto" }}>
        {logs.length === 0 ? (loading ? "Analyzing input parameters..." : "Waiting for execution...") : logs[logs.length - 1]}
      </div>
          {showBriefing && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div className="card" style={{ maxWidth: 760, width: "100%", maxHeight: "85vh", overflow: "auto" }}>
                <div className="card-head">
                  <div>
                    <h2>Qloo Graph Resolution &amp; Strategic Briefing</h2>
                    <p>Multidimensional taste signals matched</p>
                  </div>
                  <button className="btn" onClick={() => setShowBriefing(false)}>Close</button>
                </div>

                {/* Tabbed Navigation */}
                <div style={{ display: "flex", borderBottom: "1px solid var(--line-strong)", marginBottom: 16, gap: 16, padding: "0 12px" }}>
                  <button
                    onClick={() => setBriefingTab("taste_graph")}
                    style={{
                      background: "transparent",
                      border: "none",
                      borderBottom: briefingTab === "taste_graph" ? "2px solid var(--accent)" : "2px solid transparent",
                      color: briefingTab === "taste_graph" ? "var(--accent)" : "var(--text-2)",
                      padding: "8px 4px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.2s ease"
                    }}
                  >
                    Taste Graph Resolution
                  </button>
                  <button
                    onClick={() => setBriefingTab("rationale")}
                    style={{
                      background: "transparent",
                      border: "none",
                      borderBottom: briefingTab === "rationale" ? "2px solid var(--accent)" : "2px solid transparent",
                      color: briefingTab === "rationale" ? "var(--accent)" : "var(--text-2)",
                      padding: "8px 4px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.2s ease"
                    }}
                  >
                    Strategic Rationale
                  </button>
                </div>

                {briefingTab === "taste_graph" && (
                  <>
                    {/* Explicit Qloo Mapping Matrix */}
                    {tags.length > 0 && (
                      <div className="pick" style={{ background: "rgba(237,166,69,0.06)", borderColor: "rgba(237,166,69,0.3)" }}>
                        <div className="cat" style={{ color: "var(--amber)", fontWeight: 700 }}>
                          ✦ QLOO TASTE GRAPH RESOLUTION MATRIX ({tags.length} signals isolated)
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 8, marginTop: 8 }}>
                          {tags.map((t, idx) => (
                            <div key={idx} style={{ background: "var(--tile)", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 10px", fontSize: 11 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontWeight: 600, color: "#fff" }}>{t.name}</span>
                                <span className="chip" style={{ fontSize: 9, padding: "1px 6px" }}>{t.category}</span>
                              </div>
                              <div style={{ marginTop: 4, color: "var(--text-3)", fontFamily: "monospace", fontSize: 10 }}>
                                {t.qlooTagId ? (
                                  <span style={{ color: "#7ee787" }}>
                                    ✓ Tag: <strong style={{ color: "#fff" }}>{t.qlooTagName}</strong>
                                    <br />
                                    <span style={{ opacity: 0.7 }}>{t.qlooTagId}</span>
                                  </span>
                                ) : (
                                  <span style={{ color: "var(--coral)" }}>Direct Entity Search fallback</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pick">
                      <div className="cat">Qloo Real-time API Transaction Logs</div>
                      <div style={{ background: "#0a0908", border: "1px solid var(--line)", borderRadius: 10, padding: 10, fontFamily: "monospace", fontSize: 11, color: "#9cdcfe", maxHeight: 220, overflow: "auto" }}>
                        {logs.map((l, i) => <div key={i}>{l}</div>)}
                      </div>
                    </div>
                  </>
                )}

                {briefingTab === "rationale" && (
                  <div className="pick">
                    <div className="cat">Strategic Rationale &amp; Hometown Bridge</div>
                    <div className="reason" style={{ whiteSpace: "pre-wrap" }}>{rationale}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page results-page">
      <svg className="backdrop" viewBox="0 0 1440 1080" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g fill="none" stroke="rgba(250,240,225,0.10)" strokeWidth="1" strokeDasharray="2 4">
          <ellipse cx="720" cy="560" rx="560" ry="760" />
          <ellipse cx="720" cy="560" rx="360" ry="760" />
          <ellipse cx="720" cy="560" rx="150" ry="760" />
          <ellipse cx="720" cy="560" rx="760" ry="760" />
          <ellipse cx="720" cy="560" rx="980" ry="820" />
        </g>
        <circle cx="1252" cy="262" r="30" fill="rgba(250,240,225,0.03)" stroke="rgba(250,240,225,0.10)" strokeDasharray="2 4" />
      </svg>

      <header className="top">
        <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="brand" style={{ cursor: "pointer" }} onClick={() => setViewPlan(false)}>
            <img src="/vtlogo.png" alt="VibeTour" style={{ height: 41, width: "auto", display: "inline-block", verticalAlign: "middle" }} />
            <small>Corporate hospitality agent</small>
          </div>
          <div className="desktop-menu">
            <button className="btn" onClick={() => document.getElementById("map-section")?.scrollIntoView({ behavior: "smooth" })}>Map</button>
            <button className="btn" onClick={() => document.getElementById("schedule-section")?.scrollIntoView({ behavior: "smooth" })}>Planner</button>
            <button className="btn" onClick={() => document.getElementById("briefing-section")?.scrollIntoView({ behavior: "smooth" })}>Report</button>
            <button className="btn" onClick={() => document.getElementById("plugins-section")?.scrollIntoView({ behavior: "smooth" })}>Plugins</button>
            <button className="btn" onClick={() => setViewPlan(false)}>Back home</button>
          </div>
        </div>
      </header>
      <nav className="mobile-nav">
        <button className="btn" onClick={() => document.getElementById("map-section")?.scrollIntoView({ behavior: "smooth" })}>Map</button>
        <button className="btn" onClick={() => document.getElementById("schedule-section")?.scrollIntoView({ behavior: "smooth" })}>Planner</button>
        <button className="btn" onClick={() => document.getElementById("briefing-section")?.scrollIntoView({ behavior: "smooth" })}>Report</button>
        <button className="btn" onClick={() => document.getElementById("plugins-section")?.scrollIntoView({ behavior: "smooth" })}>Plugins</button>
        <button className="btn" onClick={() => setViewPlan(false)}>Home</button>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", padding: "0 24px" }} className="stack">
        {/* Map with overlay list */}
        <section id="map-section" className="results-wrap">
          <MapView
            center={center}
            places={mapPlaces}
            routeCoordinates={routeCoordinates}
            loading={loading}
            selectedId={selected}
            onSelect={(id) => {
              setSelected(id);
              const v = venues.find((x) => x.id === id);
              if (v?.category) setTypeFilter(v.category);
            }}
            activeDay={selectedDayRoute}
            onAddToSchedule={handleAddVenueToSchedule}
            onRemoveFromSchedule={handleRemoveVenueFromSchedule}
          />
          <div className="results-overlay card" style={{ padding: 14 }}>
            {/* AREA 1: ROUTES (Always visible) */}
            <div className="results-area-routes" style={{ paddingBottom: 10, marginBottom: 12, borderBottom: "1px solid var(--line-strong)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--amber)", background: "rgba(237,166,69,0.12)", border: "1px solid rgba(237,166,69,0.3)", padding: "2px 7px", borderRadius: 4 }}>
                    ROUTES
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-2)" }}>
                    {selectedDayRoute !== null ? `Day ${selectedDayRoute} Route` : "All Places Overview"}
                  </span>
                </div>

                {/* Direct Add / Remove Day Controls */}
                <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--tile)", border: "1px solid var(--line)", borderRadius: 6, padding: "2px 6px" }}>
                  <span style={{ fontSize: 11, color: "var(--text-2)", paddingRight: 4, fontWeight: 600 }}>{numDays} {numDays === 1 ? "day" : "days"}</span>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      setNumDays((prev) => {
                        const n = Math.max(1, prev - 1);
                        if (selectedDayRoute !== null && selectedDayRoute > n) setSelectedDayRoute(n);
                        return n;
                      });
                    }}
                    disabled={numDays <= 1}
                    style={{ height: 20, width: 22, padding: 0, fontSize: 12, lineHeight: 1 }}
                    title="Remove a day"
                  >
                    –
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => setNumDays((prev) => Math.min(7, prev + 1))}
                    disabled={numDays >= 7}
                    style={{ height: 20, width: 22, padding: 0, fontSize: 12, lineHeight: 1 }}
                    title="Add another day"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Day Route Filter Chips (Always visible) */}
              <div className="row" style={{ gap: 6, marginBottom: 8 }}>
                <span
                  className="chip"
                  onClick={() => setSelectedDayRoute(null)}
                  style={{
                    cursor: "pointer",
                    fontSize: 11,
                    padding: "2px 8px",
                    borderColor: selectedDayRoute === null ? "var(--amber)" : undefined,
                    background: selectedDayRoute === null ? "rgba(237,166,69,0.15)" : undefined,
                    color: selectedDayRoute === null ? "var(--amber)" : undefined,
                    fontWeight: selectedDayRoute === null ? 600 : 400,
                  }}
                >
                  All Places
                </span>
                {Array.from({ length: numDays }, (_, i) => i + 1).map((d) => {
                  const count = schedule.filter((s) => s.day === d).length;
                  const isSelected = selectedDayRoute === d;
                  return (
                    <span
                      key={d}
                      className="chip"
                      onClick={() => {
                        const nextDay = isSelected ? null : d;
                        setSelectedDayRoute(nextDay);
                        if (nextDay !== null) setTypeFilter(null);
                      }}
                      style={{
                        cursor: "pointer",
                        fontSize: 11,
                        padding: "2px 8px",
                        borderColor: isSelected ? "var(--amber)" : undefined,
                        background: isSelected ? "rgba(237,166,69,0.15)" : undefined,
                        color: isSelected ? "var(--amber)" : undefined,
                        fontWeight: isSelected ? 600 : 400,
                      }}
                    >
                      Day {d} ({count})
                    </span>
                  );
                })}
              </div>

              {/* Quick Auto-fill Schedule & Strategic Report button */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  className="btn btn-primary"
                  onClick={autoBuildSchedule}
                  disabled={autoScheduling || venues.length === 0}
                  style={{
                    flex: 1,
                    height: 28,
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    background: "var(--amber)",
                    color: "#1a1612",
                    fontWeight: 600,
                    border: "none",
                  }}
                  title="Automatically build and populate schedule from these venues"
                >
                  {autoScheduling ? "✦ Auto-filling..." : "✦ Auto-fill Schedule"}
                </button>
                {rationale && (
                  <button
                    className="btn"
                    onClick={() => setShowBriefing(true)}
                    style={{
                      height: 28,
                      fontSize: 11,
                      padding: "0 8px",
                      borderColor: "var(--amber)",
                      color: "var(--amber)",
                    }}
                    title="View AI Corporate Strategy Report & Taste Rationale"
                  >
                    📜 Report
                  </button>
                )}
              </div>
            </div>

            {/* AREA 2: PICKS (Item results & OTHER LOCATIONS manual search) */}
            <div className="results-area-picks">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#38bdf8", background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.3)", padding: "2px 7px", borderRadius: 4 }}>
                    PICKS
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-2)" }}>
                    {selectedDayRoute !== null && !typeFilter ? `${filteredVenues.length} in sequence` : `${filteredVenues.length} places`}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {tags.length > 0 && (
                    <button
                      className="btn"
                      style={{ fontSize: 10, padding: "2px 6px", height: 22, borderColor: "var(--amber)", color: "var(--amber)" }}
                      onClick={() => setShowBriefing(true)}
                      title="See Qloo entity and tag mappings"
                    >
                      🔍 Qloo Graph ({tags.filter(t => t.qlooTagId).length})
                    </button>
                  )}
                  <div className="big num" style={{ fontSize: 16 }}>{filteredVenues.length}<small>shown</small></div>
                </div>
              </div>

              {/* Category Filter Chips */}
              <div className="row" style={{ marginBottom: 10, gap: 5 }}>
                <span
                  className="chip"
                  onClick={() => setTypeFilter(null)}
                  style={{
                    cursor: "pointer",
                    fontSize: 11,
                    padding: "3px 8px",
                    borderColor: typeFilter === null ? "var(--amber)" : undefined,
                    background: typeFilter === null ? "rgba(237,166,69,0.14)" : undefined,
                    fontWeight: typeFilter === null ? 600 : 400,
                  }}
                >
                  All ({venues.length})
                </span>

                {/* Dedicated MANUAL Category Chip */}
                <span
                  className="chip"
                  onClick={() => setTypeFilter(typeFilter === "Manual" ? null : "Manual")}
                  style={{
                    cursor: "pointer",
                    fontSize: 11,
                    padding: "3px 8px",
                    borderColor: typeFilter === "Manual" ? "#38bdf8" : "rgba(56,189,248,0.4)",
                    background: typeFilter === "Manual" ? "rgba(56,189,248,0.2)" : "rgba(56,189,248,0.06)",
                    color: typeFilter === "Manual" ? "#38bdf8" : "#9cdcfe",
                    fontWeight: 600,
                  }}
                  title="Functional trip locations (Airport, Hotel, Company HQ) added manually"
                >
                  📍 Manual ({venues.filter((v) => v.category === "Manual").length})
                </span>

                {types.map((t) => (
                  <span
                    key={t}
                    className="chip"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      padding: "3px 8px",
                      borderColor: typeFilter === t ? "var(--amber)" : undefined,
                      background: typeFilter === t ? "rgba(237,166,69,0.12)" : undefined,
                    }}
                  >
                    <span onClick={() => setTypeFilter(typeFilter === t ? null : t)} style={{ cursor: "pointer" }}>
                      {t} ({venues.filter((v) => (v.category || "Venue") === t).length})
                    </span>
                    <button
                      onClick={() => loadMore(t)}
                      disabled={loadingMore}
                      style={{ background: "transparent", border: "none", color: "var(--amber)", cursor: "pointer", fontSize: 12, padding: 0, lineHeight: 1 }}
                      title={`Load another ${t}`}
                    >
                      +
                    </button>
                  </span>
                ))}
              </div>

              {/* Dedicated MANUAL Category Search & Results (ONLY visible when 'Manual' category is selected) */}
              {typeFilter === "Manual" && (
                <div style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: 8, padding: 10, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#38bdf8" }}>
                      Functional Locations (Airport, Hotel, HQ)
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text-3)" }}>Search &amp; Map</span>
                  </div>

                  {/* 1-click preset search shortcuts */}
                  <div className="row" style={{ gap: 5, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, color: "var(--text-3)" }}>Quick find:</span>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => searchOtherLocations(undefined, `${destinationCity} Airport`)}
                      style={{ height: 20, fontSize: 10, padding: "0 6px" }}
                    >
                      + Airport
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => searchOtherLocations(undefined, `${destinationCity} Hotel`)}
                      style={{ height: 20, fontSize: 10, padding: "0 6px" }}
                    >
                      + Hotel
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => searchOtherLocations(undefined, `${destinationCity} Office`)}
                      style={{ height: 20, fontSize: 10, padding: "0 6px" }}
                    >
                      + Company HQ
                    </button>
                  </div>

                  <form onSubmit={searchOtherLocations} style={{ display: "flex", gap: 5 }}>
                    <input
                      className="field"
                      style={{ height: 28, fontSize: 12, padding: "3px 8px", flex: 1 }}
                      placeholder="Search spot name (e.g. Haneda Airport, Aman Tokyo, Google HQ)..."
                      value={customSearchQuery}
                      onChange={(e) => setCustomSearchQuery(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="btn"
                      disabled={customSearching || !customSearchQuery.trim()}
                      style={{ height: 28, fontSize: 11, padding: "0 10px", borderColor: "#38bdf8", color: "#38bdf8", fontWeight: 600 }}
                    >
                      {customSearching ? "Searching..." : "Search"}
                    </button>
                  </form>

                  {/* Search results list */}
                  {customSearchResults.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6, maxHeight: 150, overflow: "auto" }}>
                      {customSearchResults.map((item) => (
                        <div key={item.id} style={{ background: "#161514", border: "1px solid var(--line-strong)", borderRadius: 6, padding: "6px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {item.name} <span style={{ fontSize: 9, color: "#38bdf8" }}>({item.tags?.[1] || "Manual"})</span>
                            </div>
                            {item.address && (
                              <div style={{ fontSize: 9, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {item.address}
                              </div>
                            )}
                          </div>
                          <button
                            className="btn btn-primary"
                            type="button"
                            onClick={() => handleAddCustomToMap(item)}
                            style={{ height: 24, fontSize: 10, padding: "0 8px", whiteSpace: "nowrap", background: "#38bdf8", color: "#000", border: "none" }}
                          >
                            + Add to Map
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            <div className="stack" style={{ overflow: "auto", maxHeight: "calc(72vh - 120px)" }}>
              {typeFilter === "Manual" && filteredVenues.length === 0 && (
                <div style={{ padding: "16px 12px", textAlign: "center", color: "var(--text-3)", fontSize: 12, background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px dashed var(--line)" }}>
                  No manual locations added yet. Search above or use quick find to add an airport, hotel, or company office to your map and schedule.
                </div>
              )}
              {selectedDayRoute !== null && !typeFilter ? (
                /* Daily Route View: Render EVERY scheduled stop record with Drag & Drop */
                activeDaySchedule.length === 0 ? (
                  <div style={{ padding: "16px 12px", textAlign: "center", color: "var(--text-3)", fontSize: 12, background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px dashed var(--line)" }}>
                    No stops scheduled for Day {selectedDayRoute} yet. Browse venues or categories above and click &quot;+ Send to schedule&quot;.
                  </div>
                ) : (
                  activeDaySchedule.map((slot, idx) => {
                    const v = venues.find((x) => x.id === slot.venueId);
                    if (!v) return null;
                    const stopNumber = idx + 1;
                    const st = slotToHM(slot.startSlot);
                    const et = slotToHM(slot.startSlot + (slot.duration || 2));
                    const timeRangeStr = `${String(st.h).padStart(2, "0")}:${String(st.m).padStart(2, "0")} - ${String(et.h).padStart(2, "0")}:${String(et.m).padStart(2, "0")}`;
                    const isDragging = draggedUid === slot.uid;

                    return (
                      <div
                        key={slot.uid}
                        className="pick"
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", slot.uid);
                          setDraggedUid(slot.uid);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedUid) {
                            handleDropReorder(draggedUid, slot.uid);
                            setDraggedUid(null);
                          }
                        }}
                        onDragEnd={() => setDraggedUid(null)}
                        onClick={() => {
                          setSelected(v.id);
                        }}
                        style={{
                          cursor: "grab",
                          borderColor: selected === v.id ? (v.category === "Manual" ? "#38bdf8" : "var(--amber)") : undefined,
                          opacity: isDragging ? 0.4 : 1,
                          background: isDragging ? "rgba(237,166,69,0.08)" : undefined,
                          borderStyle: isDragging ? "dashed" : "solid",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                          <div className="name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ cursor: "grab", color: "var(--amber)", fontSize: 13, userSelect: "none" }} title="Drag to reorder stop sequence">
                              ⋮⋮
                            </span>
                            <span>{v.name}</span>
                            <span style={{ background: "var(--amber)", color: "#1a1612", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10, whiteSpace: "nowrap" }}>
                              Stop #{stopNumber}
                            </span>
                          </div>
                          
                          {/* Interactive time editors */}
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                            <select
                              className="field"
                              value={slot.startSlot}
                              onChange={(e) => {
                                const newSlot = Number(e.target.value);
                                setSchedule((prev) =>
                                  prev.map((s) => (s.uid === slot.uid ? { ...s, startSlot: newSlot } : s))
                                );
                              }}
                              style={{
                                padding: "2px 4px",
                                fontSize: 11,
                                height: 24,
                                background: "var(--tile)",
                                color: "var(--amber)",
                                fontWeight: 700,
                                fontFamily: "monospace",
                                border: "1px solid var(--line-strong)",
                                borderRadius: 4,
                                cursor: "pointer",
                              }}
                              title="Edit start time"
                            >
                              {Array.from({ length: 48 }, (_, s) => {
                                const hm = slotToHM(s);
                                return (
                                  <option key={s} value={s}>
                                    {String(hm.h).padStart(2, "0")}:{String(hm.m).padStart(2, "0")}
                                  </option>
                                );
                              })}
                            </select>

                            <select
                              className="field"
                              value={slot.duration || 2}
                              onChange={(e) => {
                                const newDur = Number(e.target.value);
                                setSchedule((prev) =>
                                  prev.map((s) => (s.uid === slot.uid ? { ...s, duration: newDur } : s))
                                );
                              }}
                              style={{
                                padding: "2px 4px",
                                fontSize: 10,
                                height: 24,
                                background: "var(--tile)",
                                color: "var(--text-2)",
                                fontWeight: 600,
                                border: "1px solid var(--line-strong)",
                                borderRadius: 4,
                                cursor: "pointer",
                              }}
                              title="Edit duration or set as single arrival point"
                            >
                              <option value={1}>Single / Point (30m)</option>
                              <option value={2}>1 hr</option>
                              <option value={3}>1.5 hrs</option>
                              <option value={4}>2 hrs</option>
                              <option value={5}>2.5 hrs</option>
                              <option value={6}>3 hrs</option>
                              <option value={8}>4 hrs</option>
                            </select>
                          </div>
                        </div>

                        <div className="reason" style={{ marginTop: 2 }}>
                          {v.category === "Manual" ? (v.tags?.[1] || "Manual location") : v.category}{v.address ? ` · ${v.address}` : ""}
                        </div>
                        {v.rationale && <div className="reason" style={{ marginTop: 4 }}>{v.rationale}</div>}

                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                          <button
                            className="btn"
                            style={{ height: 26, padding: "0 8px", fontSize: 11, background: "var(--bg-2)", color: "var(--amber)", borderColor: "var(--amber)" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddVenueToSchedule(v.id);
                            }}
                            title="Schedule another visit to this venue"
                          >
                            + Add Stop Again
                          </button>
                          <button
                            className="btn"
                            style={{ height: 26, padding: "0 8px", fontSize: 11, borderColor: "var(--coral)", color: "var(--coral)" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSlotUid(slot.uid);
                            }}
                            title="Remove this specific stop"
                          >
                            ✕ Remove Stop #{stopNumber}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                /* All Venues / Category Filter Mode */
                filteredVenues.map((v) => {
                  const orders = dayOrdersMap.get(v.id) || [];
                  const count = orders.length;
                  return (
                    <div
                      key={v.id}
                      className="pick"
                      onClick={() => {
                        setSelected(v.id);
                        if (v.category) {
                          setTypeFilter(v.category);
                        }
                      }}
                      style={{ cursor: "pointer", borderColor: selected === v.id ? (v.category === "Manual" ? "#38bdf8" : "var(--amber)") : undefined }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div className="name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span>{v.name}</span>
                          {v.category === "Manual" && (
                            <span style={{ background: "rgba(56,189,248,0.18)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.4)", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, whiteSpace: "nowrap" }}>
                              {v.tags?.[1] ? `Manual · ${v.tags[1]}` : "Manual"}
                            </span>
                          )}
                          {count > 0 && (
                            <span style={{ background: "var(--amber)", color: "#1a1612", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10, whiteSpace: "nowrap" }}>
                              {count > 1 ? `Stops ${orders.map((o) => `#${o}`).join(", ")}` : `Stop #${orders[0]}`}
                            </span>
                          )}
                        </div>
                        {v.category === "Manual" ? (
                          <div style={{ fontSize: 10, color: "#38bdf8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Trip Anchor</div>
                        ) : (
                          <div className="score num" style={{ fontSize: 14 }}>{Math.round(v.affinity * 100)}%</div>
                        )}
                      </div>
                      <div className="reason">
                        {v.category === "Manual" ? (v.tags?.[1] || "Manual location") : v.category}{v.address ? ` · ${v.address}` : ""}
                        {count > 0 ? ` · Day ${selectedDayRoute ?? 1}` : ""}
                      </div>
                      {v.rationale && <div className="reason" style={{ marginTop: 4 }}>{v.rationale}</div>}
                      
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                        <button
                          className="btn"
                          style={{ height: 26, padding: "0 10px", fontSize: 12, background: count > 0 ? "var(--bg-2)" : "var(--amber)", color: count > 0 ? "var(--amber)" : "#1a1612", borderColor: "var(--amber)" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddVenueToSchedule(v.id);
                          }}
                        >
                          {count > 0 ? "+ Add Stop Again" : `+ Send to schedule ${selectedDayRoute ? `(Day ${selectedDayRoute})` : "(Day 1)"}`}
                        </button>
                        {count > 0 && (
                          <button
                            className="btn"
                            style={{ height: 26, padding: "0 8px", fontSize: 12, borderColor: "var(--coral)", color: "var(--coral)" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveVenueFromSchedule(v.id, false);
                            }}
                            title="Remove latest stop for this venue"
                          >
                            ✕ Remove {count > 1 ? `(#${orders[orders.length - 1]})` : ""}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Bottom yellow query button per selected/active category (Qloo only) */}
              {typeFilter !== "Manual" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <div className="stack" style={{ gap: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      🔍 ENRICH &amp; REFINE SEARCH
                    </span>
                    <input
                      type="text"
                      value={enrichmentText}
                      onChange={(e) => setEnrichmentText(e.target.value)}
                      placeholder={`e.g. speakeasy, rooftop, cozy (for ${typeFilter || "Venue"}s)`}
                      className="field"
                      style={{ height: 28, fontSize: 11, padding: "4px 8px", width: "100%", background: "rgba(255,255,255,0.02)" }}
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => loadMore(typeFilter || "Venue")}
                    disabled={loadingMore}
                    style={{
                      height: 34,
                      fontSize: 12,
                      fontWeight: 600,
                      background: "var(--amber)",
                      color: "#1a1612",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    {loadingMore
                      ? `Querying Qloo for ${typeFilter || "more places"}...`
                      : `Query Qloo for ${typeFilter || "Venue"}`}
                  </button>
                </div>
              )}
            </div>
            </div>
          </div>
        </section>

        {/* Composable schedule */}
        <section id="schedule-section" className="card" style={{ width: "100%" }}>
          <div className="card-head">
            <div>
              <h2>Composable schedule</h2>
              <p>Auto-assign or drag venues into daily time slots</p>
            </div>
            <div className="row" style={{ gap: 12 }}>
              <button
                className="btn btn-primary"
                onClick={autoBuildSchedule}
                disabled={autoScheduling || venues.length === 0}
                style={{ height: 28, fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}
                title="Automatically arrange places across the days based on category & flow"
              >
                {autoScheduling ? "✦ Auto-filling..." : "✦ Auto-fill Schedule"}
              </button>
              <button
                className="btn"
                onClick={() => setShowAddModal(true)}
                style={{ height: 28, fontSize: 12 }}
                title="Add a custom stop manually"
              >
                + Add Stop
              </button>
              <div className="row" style={{ gap: 6 }}>
                <span style={{ color: "var(--text-2)", fontSize: 13 }}>Start date</span>
                <input
                  type="date"
                  value={tripStartDate}
                  onChange={(e) => setTripStartDate(e.target.value)}
                  className="field"
                  style={{ width: 130, padding: "3px 6px", fontSize: 12 }}
                />
              </div>
              <div className="row" style={{ gap: 6 }}>
                <span style={{ color: "var(--text-2)", fontSize: 13 }}>Days</span>
                <input type="number" min={1} max={7} value={numDays} onChange={(e) => setNumDays(Math.max(1, Math.min(7, Number(e.target.value) || 1)))} className="field" style={{ width: 56, padding: "3px 6px", fontSize: 12 }} />
              </div>
            </div>
          </div>

          {/* Day / Night Tabbed Navigation */}
          <div style={{ display: "flex", background: "var(--bg-2)", padding: "4px", borderRadius: 8, gap: 4, width: "fit-content", marginBottom: 12, border: "1px solid var(--line)" }}>
            <button
              onClick={() => setPlannerTab("day")}
              style={{
                background: plannerTab === "day" ? "var(--accent)" : "transparent",
                color: plannerTab === "day" ? "#1a1612" : "var(--text-2)",
                border: "none",
                borderRadius: 6,
                padding: "4px 12px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4
              }}
            >
              ☀️ Day (08:00 - 20:00)
            </button>
            <button
              onClick={() => setPlannerTab("night")}
              style={{
                background: plannerTab === "night" ? "var(--accent)" : "transparent",
                color: plannerTab === "night" ? "#1a1612" : "var(--text-2)",
                border: "none",
                borderRadius: 6,
                padding: "4px 12px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4
              }}
            >
              🌙 Night (20:00 - 08:00)
            </button>
          </div>

          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 6, color: "var(--text-3)", fontWeight: 500, width: 44 }}>Hour</th>
                  {Array.from({ length: numDays }, (_, i) => {
                    const d = i + 1;
                    const isSelectedRoute = selectedDayRoute === d;
                    return (
                      <th
                        key={i}
                        onClick={() => {
                          const nextDay = isSelectedRoute ? null : d;
                          setSelectedDayRoute(nextDay);
                          if (nextDay !== null) setTypeFilter(null);
                        }}
                        style={{
                          textAlign: "left",
                          padding: "6px 8px",
                          color: isSelectedRoute ? "var(--amber)" : "var(--text-2)",
                          fontWeight: 600,
                          width: `calc((100% - 44px) / ${numDays})`,
                          cursor: "pointer",
                          background: isSelectedRoute ? "rgba(237,166,69,0.08)" : undefined,
                          borderTopLeftRadius: 6,
                          borderTopRightRadius: 6,
                        }}
                        title={`Click to show route for Day ${d} on map`}
                      >
                        Day {d} {isSelectedRoute ? "📍 (On Map)" : ""}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const activeSlots = plannerTab === "day"
                    ? Array.from({ length: 24 }, (_, i) => i + 16) // Slots 16 to 39 (08:00 AM to 08:00 PM)
                    : [
                        ...Array.from({ length: 8 }, (_, i) => i + 40), // Slots 40 to 47 (08:00 PM to midnight)
                        ...Array.from({ length: 16 }, (_, i) => i)      // Slots 0 to 15 (midnight to 08:00 AM)
                      ];

                  return activeSlots.map((slot) => {
                    const t = { h: Math.floor((slot * 30) / 60), m: (slot * 30) % 60 };
                    const label = `${String(t.h).padStart(2, "0")}:${String(t.m).padStart(2, "0")}`;
                    return (
                      <tr key={slot}>
                        <td style={{ padding: 6, color: "var(--text-3)", borderTop: "1px solid var(--line)", width: 60, verticalAlign: "top" }}>{label}</td>
                        {Array.from({ length: numDays }, (_, di) => {
                        const day = di + 1;
                        const starting = schedule.find((s) => s.day === day && s.startSlot === slot);
                        const covering = schedule.find((s) => s.day === day && s.startSlot < slot && s.startSlot + (s.duration || 1) > slot);
                        if (covering) return null;
                        if (!starting) {
                          return (
                            <td
                              key={day}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                const uid = e.dataTransfer.getData("text/plain");
                                setSchedule((prev) => prev.map((s) => (s.uid === uid ? { ...s, day, startSlot: slot } : s)));
                              }}
                              style={{ padding: 4, borderTop: "1px solid var(--line)", height: 48, verticalAlign: "top", width: `calc((100% - 44px) / ${numDays})`, wordBreak: "break-word", whiteSpace: "normal" }}
                            />
                          );
                        }
                        const v = venues.find((x) => x.id === starting.venueId);
                        const span = Math.max(1, starting.duration || 1);
                        const isShort = span === 1;

                        return (
                          <td
                            key={day}
                            rowSpan={span}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const uid = e.dataTransfer.getData("text/plain");
                              setSchedule((prev) => prev.map((s) => (s.uid === uid ? { ...s, day, startSlot: slot } : s)));
                            }}
                            style={{ padding: 4, borderTop: "1px solid var(--line)", verticalAlign: "top", width: `calc((100% - 44px) / ${numDays})`, height: `${span * 48}px`, position: "relative" }}
                          >
                            <div
                              draggable={resizingUid !== starting.uid}
                              onDragStart={(e) => {
                                if (resizingUid === starting.uid) { e.preventDefault(); return; }
                                e.dataTransfer.setData("text/plain", starting.uid);
                              }}
                              onClick={() => {
                                setSelected(starting.venueId);
                                document.getElementById("map-section")?.scrollIntoView({ behavior: "smooth" });
                              }}
                              className="pick"
                              style={{
                                cursor: "grab",
                                padding: isShort ? "4px 6px" : "6px 8px 14px 8px",
                                position: "absolute",
                                top: 4,
                                left: 4,
                                right: 4,
                                bottom: 4,
                                overflow: "hidden",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: isShort ? "center" : "space-between",
                                borderColor: selected === starting.venueId ? "var(--amber)" : undefined,
                                background: selected === starting.venueId ? "rgba(237,166,69,0.14)" : "var(--tile)",
                                borderRadius: 8,
                                boxSizing: "border-box",
                              }}
                              title={`${v?.name || starting.venueId} — Click to view on map`}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSchedule((prev) => prev.filter((x) => x.uid !== starting.uid));
                                }}
                                style={{
                                  position: "absolute",
                                  top: 2,
                                  right: 4,
                                  background: "transparent",
                                  border: "none",
                                  color: "var(--text-3)",
                                  cursor: "pointer",
                                  fontSize: 13,
                                  lineHeight: 1,
                                  padding: 2,
                                  zIndex: 10,
                                }}
                                title="Remove from schedule"
                              >
                                ×
                              </button>

                              {isShort ? (
                                /* Compact 1-line / 30m Stop View (No overflow, crisp readability) */
                                <div style={{ display: "flex", flexDirection: "column", gap: 1, paddingRight: 14 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2 }}>
                                    {v?.name || starting.venueId}
                                  </div>
                                  <div style={{ fontSize: 9, color: "var(--amber)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, display: "flex", justifyContent: "space-between" }}>
                                    <span>{v?.category || "Stop"}</span>
                                    {typeof v?.affinity === "number" && <span>{Math.round(v.affinity * 100)}%</span>}
                                  </div>
                                </div>
                              ) : (
                                /* Detailed multi-slot stop view */
                                <>
                                  <div>
                                    <div className="name" style={{ fontSize: 11, fontWeight: 700, paddingRight: 14, color: "var(--text-1)", lineHeight: 1.2 }}>
                                      {v?.name || starting.venueId}
                                    </div>
                                    <div className="meta" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                                      <span style={{ color: "var(--amber)", fontWeight: 600 }}>{v?.category || "Venue"}</span>
                                      {typeof v?.affinity === "number" && <span style={{ color: "var(--text-2)" }}>{Math.round(v.affinity * 100)}%</span>}
                                    </div>
                                    {v?.address && (
                                      <div style={{ fontSize: 9, color: "var(--text-3)", lineHeight: 1.25, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {v.address}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                                    {v && (
                                      <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([v.name, v.address].filter(Boolean).join(", ") || `${v.lat ?? ""},${v.lon ?? ""}`)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        title={`Open ${v.name} in Google Maps`}
                                        style={{ fontSize: 9, color: "var(--light)", textDecoration: "none", fontWeight: 600 }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        gmap ↗
                                      </a>
                                    )}
                                    <a
                                      href={getGCalSingleUrl(starting)}
                                      target="_blank"
                                      rel="noreferrer"
                                      title="Add this stop to Google Calendar"
                                      style={{ fontSize: 9, color: "var(--amber)", textDecoration: "none", fontWeight: 600 }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      +gcal
                                    </a>
                                  </div>
                                </>
                              )}
                            </div>
                            <div
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                const startY = e.clientY;
                                const startDur = starting.duration || 1;
                                const maxDur = Math.max(1, 48 - starting.startSlot);
                                setResizingUid(starting.uid);
                                document.body.style.userSelect = "none";
                                const onMove = (ev: PointerEvent) => {
                                  const delta = Math.round((ev.clientY - startY) / 48);
                                  const newDur = Math.min(maxDur, Math.max(1, startDur + delta));
                                  setSchedule((prev) => prev.map((x) => (x.uid === starting.uid ? { ...x, duration: newDur } : x)));
                                };
                                const cleanup = () => {
                                  setResizingUid(null);
                                  document.body.style.userSelect = "";
                                  window.removeEventListener("pointermove", onMove);
                                  window.removeEventListener("pointerup", cleanup);
                                  window.removeEventListener("pointercancel", cleanup);
                                };
                                window.addEventListener("pointermove", onMove);
                                window.addEventListener("pointerup", cleanup);
                                window.addEventListener("pointercancel", cleanup);
                              }}
                              style={{ position: "absolute", left: 4, right: 4, bottom: 3, height: 9, cursor: "ns-resize", background: "var(--track-fill)", borderRadius: 4, touchAction: "none", zIndex: 2 }}
                              title="Drag to extend or shrink duration"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })})()}
              </tbody>


            </table>
          </div>
          {/* Manual Entry Modal */}
          {showAddModal && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
              <div className="card" style={{ maxWidth: 440, width: "100%", background: "var(--card)", padding: 20 }}>
                <div className="card-head" style={{ marginBottom: 12 }}>
                  <div>
                    <h2 style={{ fontSize: 16 }}>Add Custom Stop</h2>
                    <p style={{ fontSize: 12 }}>Insert your own curated venue into the schedule</p>
                  </div>
                  <button className="btn" onClick={() => setShowAddModal(false)} style={{ height: 26, fontSize: 12 }}>Close</button>
                </div>
                <div className="stack" style={{ gap: 10 }}>
                  <input
                    className="field"
                    placeholder="Venue / Stop Name (e.g. Host Welcome Lunch)"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                  <div className="row" style={{ gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 11, color: "var(--text-3)", display: "block", marginBottom: 3 }}>Category</span>
                      <select
                        className="field"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        style={{ padding: "8px 10px", fontSize: 13 }}
                      >
                        {ALL_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 11, color: "var(--text-3)", display: "block", marginBottom: 3 }}>Day</span>
                      <select
                        className="field"
                        value={customDay}
                        onChange={(e) => setCustomDay(Number(e.target.value))}
                        style={{ padding: "8px 10px", fontSize: 13 }}
                      >
                        {Array.from({ length: numDays }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>Day {d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 11, color: "var(--text-3)", display: "block", marginBottom: 3 }}>Time</span>
                      <select
                        className="field"
                        value={customSlot}
                        onChange={(e) => setCustomSlot(Number(e.target.value))}
                        style={{ padding: "8px 10px", fontSize: 13 }}
                      >
                        {Array.from({ length: 48 }, (_, s) => {
                          const hm = slotToHM(s);
                          return (
                            <option key={s} value={s}>
                              {String(hm.h).padStart(2, "0")}:{String(hm.m).padStart(2, "0")}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 11, color: "var(--text-3)", display: "block", marginBottom: 3 }}>Duration</span>
                      <select
                        className="field"
                        value={customDuration}
                        onChange={(e) => setCustomDuration(Number(e.target.value))}
                        style={{ padding: "8px 10px", fontSize: 13 }}
                      >
                        <option value={1}>30 mins</option>
                        <option value={2}>1 hr</option>
                        <option value={3}>1.5 hrs</option>
                        <option value={4}>2 hrs</option>
                        <option value={6}>3 hrs</option>
                      </select>
                    </div>
                  </div>
                  <input
                    className="field"
                    placeholder="Address or neighborhood (optional)"
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={addCustomVenue}
                    disabled={!customName.trim()}
                    style={{ height: 36, marginTop: 6 }}
                  >
                    Add to Schedule
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn btn-primary" onClick={() => setShowGCalModal(true)} disabled={schedule.length === 0} title="Export entire multi-day schedule to Google Calendar with exact dates and hours">
              📅 1-Click Google Calendar Bulk Export
            </button>
            <button 
              className="btn" 
              onClick={sendViaWhatsApp} 
              disabled={schedule.length === 0} 
              style={{ borderColor: "rgba(34,197,94,0.4)", color: "#4ade80" }}
              title="Share the condensed itinerary on WhatsApp with a scannable link to the full PDF map"
            >
              💬 Send via WhatsApp
            </button>
            <button className="btn" onClick={() => downloadICS(false)} disabled={schedule.length === 0} title="Downloads standard .ICS calendar file for Apple/Google Calendar">
              Download .ICS
            </button>
            <button className="btn" onClick={downloadCSVCalendar} disabled={schedule.length === 0} title="Google Calendar CSV import format with distinct date & time columns">
              Download CSV
            </button>
            <button
              className="btn"
              onClick={() => {
                try {
                  localStorage.setItem("vibetour_print_state", JSON.stringify({
                    venues,
                    schedule,
                    numDays,
                    tripStartDate,
                    center,
                    clientName: clientName || "Executive Client",
                    destinationCity: destinationCity || "Your Destination"
                  }));
                  window.open("/print", "_blank");
                } catch (e) {
                  console.error("Print state storage failed", e);
                  window.print();
                }
              }}
              disabled={venues.length === 0}
              title="Open print-optimized summary page with detailed venue infos, phone numbers, and Maps QR codes"
            >
              Print PDF summary
            </button>
            <button className="btn" onClick={saveToBrowser} disabled={venues.length === 0}>Save to browser</button>
            <button className="btn" onClick={clearBrowser}>Clear browser</button>
          </div>
          {saveStatus && <p style={{ color: "var(--text-3)", fontSize: 12, marginTop: 6 }}>{saveStatus}</p>}
          {schedule.length === 0 && <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 8 }}>Send venues to schedule to start composing.</p>}

          {/* Google Calendar Bulk Export Modal */}
          {showGCalModal && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
              <div className="card" style={{ maxWidth: 520, width: "100%", background: "var(--card)", padding: 24, borderRadius: 16, border: "1px solid var(--amber)" }}>
                <div className="card-head" style={{ marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 18, color: "var(--amber)", display: "flex", alignItems: "center", gap: 8 }}>
                      📅 Google Calendar 1-Click Bulk Export
                    </h2>
                    <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                      Export all {schedule.length} stops across {numDays} days into Google Calendar at exact dates and hours.
                    </p>
                  </div>
                  <button className="btn" onClick={() => setShowGCalModal(false)} style={{ height: 28, fontSize: 12 }}>✕ Close</button>
                </div>

                <div className="stack" style={{ gap: 14 }}>
                  <div style={{ background: "var(--tile)", padding: 12, borderRadius: 10, border: "1px solid var(--line-strong)" }}>
                    <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>Trip Start Date:</span>
                      <input
                        type="date"
                        value={tripStartDate}
                        onChange={(e) => setTripStartDate(e.target.value)}
                        className="field"
                        style={{ width: 150, padding: "4px 8px", fontSize: 13 }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", display: "flex", justifyContent: "space-between" }}>
                      <span>Destination City: <strong style={{ color: "var(--text-1)" }}>{destinationCity || "Tokyo"}</strong></span>
                      <span>Timezone: <strong style={{ color: "var(--amber)" }}>{getTimezoneForCity(destinationCity)}</strong></span>
                    </div>
                  </div>

                  <div style={{ maxHeight: 180, overflowY: "auto", background: "var(--bg-2)", padding: 10, borderRadius: 10, border: "1px solid var(--line)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", marginBottom: 6 }}>
                      Schedule Breakdown ({schedule.length} stops)
                    </div>
                    {Array.from({ length: numDays }, (_, i) => i + 1).map((d) => {
                      const dayItems = schedule.filter((s) => s.day === d);
                      const dt = getDateForDay(d);
                      const dateFormatted = `${dt.y}-${String(dt.m).padStart(2, "0")}-${String(dt.d).padStart(2, "0")}`;
                      return (
                        <div key={d} style={{ fontSize: 12, padding: "6px 0", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-1)", fontWeight: 600 }}>Day {d} ({dateFormatted}):</span>
                          <span style={{ color: "var(--amber)", fontWeight: 600 }}>{dayItems.length} stops</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="stack" style={{ gap: 8, marginTop: 4 }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => { downloadICS(true); setShowGCalModal(false); }}
                      style={{ height: 42, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                    >
                      ⚡ 1-Click Export to Google Calendar (.ICS)
                    </button>
                    <div style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center" }}>
                      Downloads `.ics` bundle and opens Google Calendar Import page automatically. Drag &amp; drop to import all events in 1 click!
                    </div>

                    <div className="row" style={{ gap: 8, marginTop: 6 }}>
                      <button
                        className="btn"
                        onClick={() => { downloadCSVCalendar(); setShowGCalModal(false); }}
                        style={{ flex: 1, height: 32, fontSize: 11 }}
                      >
                        Download Google CSV
                      </button>
                      <button
                        className="btn"
                        onClick={() => { exportGoogleCalendar(); setShowGCalModal(false); }}
                        style={{ flex: 1, height: 32, fontSize: 11 }}
                      >
                        Open Event Tabs
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Strategic briefing */}
        {rationale && (
          <section id="briefing-section" className="card" style={{ width: "100%" }}>
            <div className="card-head">
              <div>
                <h2>Strategic briefing</h2>
                <p>Corporate strategy report &amp; taste reasoning</p>
              </div>
              <button className="btn" onClick={() => setShowBriefing(true)}>
                Open in modal popup
              </button>
            </div>
            <div className="pick">
              <div className="reason" style={{ whiteSpace: "pre-wrap" }}>{rationale}</div>
            </div>
          </section>
        )}

        {/* Phantomatic Plugins / Autonomous Add-ons */}
        <section id="plugins-section" className="card" style={{ width: "100%" }}>
          <div className="card-head" style={{ borderBottom: "1px solid var(--line-strong)", paddingBottom: 12, marginBottom: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ fontSize: 18, color: "#fff" }}>Autonomous Add-ons &amp; Plugins</h2>
                <span className="chip" style={{ background: "rgba(237,166,69,0.15)", color: "var(--amber)", borderColor: "var(--amber)", fontSize: 9, fontWeight: 700 }}>BETA PREVIEW</span>
              </div>
              <p style={{ color: "var(--text-3)", fontSize: 12 }}>Unlock next-generation logistics, autonomous budgeting, and multi-profile taste cross-referencing</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            
            {/* CARD 1: Book It */}
            <div className="pick" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 340, background: "rgba(255,255,255,0.01)" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--amber)" }}>Book It</h3>
                    <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>Estimate &amp; Reserve</div>
                  </div>
                  <span className="chip" style={{ fontSize: 9, padding: "1px 6px" }}>COMING SOON</span>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.4, marginBottom: 12 }}>
                  Calculate total cost estimates across all curated stops in your schedule and initiate automated reservations via direct merchant API brokers.
                </p>

                {/* Interactive Book It Sandbox */}
                <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--line)", borderRadius: 8, padding: 10, fontSize: 11, fontFamily: "monospace", marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginBottom: 6 }}>
                    <span style={{ color: "var(--text-3)" }}>Reservation Broker</span>
                    <span style={{ color: estimatingBudget ? "var(--amber)" : budgetResults ? "#7ee787" : "var(--text-3)" }}>
                      {estimatingBudget ? "● CALCULATING..." : budgetResults ? "✓ COMPLETED" : "○ READY"}
                    </span>
                  </div>

                  {estimatingBudget ? (
                    <div style={{ padding: "12px 0", textAlign: "center", color: "var(--text-3)" }}>
                      <span className="blink">Ping reservation APIs for active schedule...</span>
                    </div>
                  ) : budgetResults ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ maxHeight: 110, overflow: "auto", display: "flex", flexDirection: "column", gap: 4, paddingRight: 4 }}>
                        {budgetResults.items.map((item, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, borderBottom: "1px dashed rgba(255,255,255,0.05)", paddingBottom: 2 }}>
                            <span style={{ color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }} title={item.name}>{item.name}</span>
                            <span style={{ color: "var(--amber)", fontWeight: "bold" }}>${item.estCost}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ borderTop: "1px solid var(--line-strong)", paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 11 }}>
                        <span style={{ color: "#fff" }}>TOTAL ESTIMATE:</span>
                        <span style={{ color: "var(--amber)" }}>${budgetResults.total} {budgetResults.currency}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: "12px 0", textAlign: "center", color: "var(--text-3)", fontSize: 10 }}>
                      No active estimate calculated yet. Click below to analyze your schedule.
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                <button
                  className="btn"
                  onClick={calculateBudgetEstimates}
                  disabled={estimatingBudget}
                  style={{ width: "100%", height: 30, fontSize: 11, background: "transparent", borderColor: "var(--amber)", color: "var(--amber)" }}
                >
                  {estimatingBudget ? "Estimating..." : budgetResults ? "Recalculate Estimate" : "Estimate Total Budget"}
                </button>
                <button
                  className="btn"
                  disabled
                  style={{ width: "100%", height: 30, fontSize: 11, background: "rgba(255,255,255,0.02)", color: "rgba(255,255,255,0.2)", cursor: "not-allowed", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  Reserve All Stops Autonomously
                </button>
              </div>
            </div>

            {/* CARD 2: Commute */}
            <div className="pick" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 340, background: "rgba(255,255,255,0.01)" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "#38bdf8" }}>Commute</h3>
                    <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>Transit &amp; Dispatches</div>
                  </div>
                  <span className="chip" style={{ fontSize: 9, padding: "1px 6px" }}>COMING SOON</span>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.4, marginBottom: 12 }}>
                  Synthesize multi-day road navigation routes, view local transport grids, and auto-provision Waymo/Uber autonomous dispatches synchronized with schedule times.
                </p>

                {/* Interactive Commute Sandbox */}
                <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--line)", borderRadius: 8, padding: 10, fontSize: 11, fontFamily: "monospace", marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginBottom: 6 }}>
                    <span style={{ color: "var(--text-3)" }}>Mode Select</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <span 
                        onClick={() => setCommuteTransitMode("ev_taxi")}
                        style={{ cursor: "pointer", color: commuteTransitMode === "ev_taxi" ? "#38bdf8" : "var(--text-3)", fontWeight: commuteTransitMode === "ev_taxi" ? "bold" : "normal" }}
                      >EV Cab</span>
                      <span style={{ color: "var(--text-3)" }}>|</span>
                      <span 
                        onClick={() => setCommuteTransitMode("rail")}
                        style={{ cursor: "pointer", color: commuteTransitMode === "rail" ? "#38bdf8" : "var(--text-3)", fontWeight: commuteTransitMode === "rail" ? "bold" : "normal" }}
                      >Rail</span>
                      <span style={{ color: "var(--text-3)" }}>|</span>
                      <span 
                        onClick={() => setCommuteTransitMode("chauffeur")}
                        style={{ cursor: "pointer", color: commuteTransitMode === "chauffeur" ? "#38bdf8" : "var(--text-3)", fontWeight: commuteTransitMode === "chauffeur" ? "bold" : "normal" }}
                      >Driver</span>
                    </div>
                  </div>

                  {simulatingCommute ? (
                    <div style={{ padding: "12px 0", textAlign: "center", color: "var(--text-3)" }}>
                      <span className="blink">Optimizing path dispatches...</span>
                    </div>
                  ) : commuteTimeline.length > 0 ? (
                    <div style={{ maxHeight: 110, overflow: "auto", display: "flex", flexDirection: "column", gap: 6, paddingRight: 4 }}>
                      {commuteTimeline.map((item, idx) => (
                        <div key={idx} style={{ display: "flex", flexDirection: "column", fontSize: 9, borderBottom: "1px dashed rgba(255,255,255,0.05)", paddingBottom: 4 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#38bdf8" }}>
                            <span>{item.time} — {item.action}</span>
                            <span style={{ background: "rgba(56,189,248,0.12)", padding: "0 3px", borderRadius: 3, fontSize: 8 }}>{item.status}</span>
                          </div>
                          <span style={{ color: "var(--text-3)", marginTop: 1, fontSize: 9 }}>{item.details}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: "12px 0", textAlign: "center", color: "var(--text-3)", fontSize: 10 }}>
                      No dispatches simulated. Click below to generate route dispatches.
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                <button
                  className="btn"
                  onClick={simulateCommuteTimeline}
                  disabled={simulatingCommute}
                  style={{ width: "100%", height: 30, fontSize: 11, background: "transparent", borderColor: "#38bdf8", color: "#38bdf8" }}
                >
                  {simulatingCommute ? "Synthesizing..." : commuteTimeline.length > 0 ? "Re-optimize Routes" : "Simulate Route Dispatches"}
                </button>
                <button
                  className="btn"
                  disabled
                  style={{ width: "100%", height: 30, fontSize: 11, background: "rgba(255,255,255,0.02)", color: "rgba(255,255,255,0.2)", cursor: "not-allowed", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  Autonomous Taxi Dispatch
                </button>
              </div>
            </div>

            {/* CARD 3: Social Detective */}
            <div className="pick" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 340, background: "rgba(255,255,255,0.01)" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "#a5b4fc" }}>Social Detective</h3>
                    <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>Signal Alignment</div>
                  </div>
                  <span className="chip" style={{ fontSize: 9, padding: "1px 6px" }}>COMING SOON</span>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.4, marginBottom: 12 }}>
                  Scrape secondary public social handles, scrub and anonymize PII data vectors, and run alignment overlays to cross-reference multi-profile shared taste signals.
                </p>

                {/* Interactive Social Detective Sandbox */}
                <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--line)", borderRadius: 8, padding: 10, fontSize: 11, fontFamily: "monospace", marginTop: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid var(--line)", paddingBottom: 6, marginBottom: 6 }}>
                    <span style={{ color: "var(--text-3)" }}>Cross Target:</span>
                    <input
                      type="text"
                      className="field"
                      placeholder="@target_executive"
                      value={socialDetectiveHandle}
                      onChange={(e) => setSocialDetectiveHandle(e.target.value)}
                      style={{ flex: 1, padding: "1px 4px", fontSize: 10, height: 18, background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)" }}
                    />
                  </div>

                  {socialDetectiveScanning ? (
                    <div style={{ padding: "12px 0", textAlign: "center", color: "var(--text-3)" }}>
                      <span className="blink">Running vector alignment across graphs...</span>
                    </div>
                  ) : socialDetectiveMatches.length > 0 ? (
                    <div style={{ maxHeight: 110, overflow: "auto", display: "flex", flexDirection: "column", gap: 4, paddingRight: 4 }}>
                      {socialDetectiveMatches.map((item, idx) => (
                        <div key={idx} style={{ display: "flex", flexDirection: "column", fontSize: 9, borderBottom: "1px dashed rgba(255,255,255,0.05)", paddingBottom: 3 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#a5b4fc", fontWeight: "bold" }}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>{item.signal}</span>
                            <span>{Math.round(item.strength * 100)}% Match</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-3)", fontSize: 8 }}>
                            <span>{item.matchType}</span>
                            <span style={{ color: "#7ee787" }}>{item.sentiment}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: "12px 0", textAlign: "center", color: "var(--text-3)", fontSize: 10 }}>
                      Ready for multi-profile scraping. Enter a handle and run the scan.
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                <button
                  className="btn"
                  onClick={executeSocialDetective}
                  disabled={socialDetectiveScanning}
                  style={{ width: "100%", height: 30, fontSize: 11, background: "transparent", borderColor: "#a5b4fc", color: "#a5b4fc" }}
                >
                  {socialDetectiveScanning ? "Extracting Signals..." : socialDetectiveMatches.length > 0 ? "Rescan Taste Signals" : "Execute Cross-Reference Scan"}
                </button>
                <button
                  className="btn"
                  disabled
                  style={{ width: "100%", height: 30, fontSize: 11, background: "rgba(255,255,255,0.02)", color: "rgba(255,255,255,0.2)", cursor: "not-allowed", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  Inject Shared Taste Nodes
                </button>
              </div>
            </div>

          </div>
        </section>

        {showBriefing && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div className="card" style={{ maxWidth: 760, width: "100%", maxHeight: "85vh", overflow: "auto" }}>
              <div className="card-head">
                <div>
                  <h2>Qloo Graph Resolution &amp; Strategic Briefing</h2>
                  <p>Multidimensional taste signals matched</p>
                </div>
                <button className="btn" onClick={() => setShowBriefing(false)}>Close</button>
              </div>

              {/* Tabbed Navigation */}
              <div style={{ display: "flex", borderBottom: "1px solid var(--line-strong)", marginBottom: 16, gap: 16, padding: "0 12px" }}>
                <button
                  onClick={() => setBriefingTab("taste_graph")}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderBottom: briefingTab === "taste_graph" ? "2px solid var(--accent)" : "2px solid transparent",
                    color: briefingTab === "taste_graph" ? "var(--accent)" : "var(--text-2)",
                    padding: "8px 4px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.2s ease"
                  }}
                >
                  Taste Graph Resolution
                </button>
                <button
                  onClick={() => setBriefingTab("rationale")}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderBottom: briefingTab === "rationale" ? "2px solid var(--accent)" : "2px solid transparent",
                    color: briefingTab === "rationale" ? "var(--accent)" : "var(--text-2)",
                    padding: "8px 4px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.2s ease"
                  }}
                >
                  Strategic Rationale
                </button>
              </div>

              {briefingTab === "taste_graph" && (
                <>
                  {/* Explicit Qloo Mapping Matrix */}
                  {tags.length > 0 && (
                    <div className="pick" style={{ background: "rgba(237,166,69,0.06)", borderColor: "rgba(237,166,69,0.3)" }}>
                      <div className="cat" style={{ color: "var(--amber)", fontWeight: 700 }}>
                        ✦ QLOO TASTE GRAPH RESOLUTION MATRIX ({tags.length} signals isolated)
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 8, marginTop: 8 }}>
                        {tags.map((t, idx) => (
                          <div key={idx} style={{ background: "var(--tile)", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 10px", fontSize: 11 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontWeight: 600, color: "#fff" }}>{t.name}</span>
                              <span className="chip" style={{ fontSize: 9, padding: "1px 6px" }}>{t.category}</span>
                            </div>
                            <div style={{ marginTop: 4, color: "var(--text-3)", fontFamily: "monospace", fontSize: 10 }}>
                              {t.qlooTagId ? (
                                <span style={{ color: "#7ee787" }}>
                                  ✓ Tag: <strong style={{ color: "#fff" }}>{t.qlooTagName}</strong>
                                  <br />
                                  <span style={{ opacity: 0.7 }}>{t.qlooTagId}</span>
                                </span>
                              ) : (
                                <span style={{ color: "var(--coral)" }}>Direct Entity Search fallback</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pick">
                    <div className="cat">Qloo Real-time API Transaction Logs</div>
                    <div style={{ background: "#0a0908", border: "1px solid var(--line)", borderRadius: 10, padding: 10, fontFamily: "monospace", fontSize: 11, color: "#9cdcfe", maxHeight: 220, overflow: "auto" }}>
                      {logs.map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                  </div>
                </>
              )}

              {briefingTab === "rationale" && (
                <div className="pick">
                  <div className="cat">Strategic Rationale &amp; Hometown Bridge</div>
                  <div className="reason" style={{ whiteSpace: "pre-wrap" }}>{rationale}</div>
                </div>
              )}
            </div>
          </div>
        )}


      {/* Compact execution pane */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 1000, background: "rgba(10,9,8,0.92)", backdropFilter: "blur(8px)", borderTop: "1px solid var(--line-strong)", padding: "6px 12px", fontFamily: "monospace", fontSize: 11, color: "#9cdcfe", height: 44, overflow: "auto" }}>
        {logs.length === 0 ? (loading ? "Analyzing input parameters..." : "Waiting for execution...") : logs[logs.length - 1]}
      </div>
      </div>
    </div>
  );
}
