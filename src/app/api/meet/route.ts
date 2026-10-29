import { NextResponse } from "next/server";
import { isLive } from "@/lib/qloo";
import { resolveFavorites } from "@/lib/scoring";

export const dynamic = "force-dynamic";

type Place = { id: string; name: string; affinity: number; lat?: number; lon?: number; address?: string; tags?: string[]; image?: string };

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

const CITY_CENTERS: Record<string, { lat: number; lon: number }> = {
  rome: { lat: 41.9028, lon: 12.4964 },
  "new york": { lat: 40.7128, lon: -74.006 },
  london: { lat: 51.5074, lon: -0.1278 },
  paris: { lat: 48.8566, lon: 2.3522 },
  tokyo: { lat: 35.6762, lon: 139.6503 },
};

async function geocode(city: string) {
  const key = city.toLowerCase();
  for (const k of Object.keys(CITY_CENTERS)) if (key.includes(k)) return CITY_CENTERS[k];
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`, { headers: { "User-Agent": "TasteMap/1.0" } });
    const arr = (await res.json()) as { lat: string; lon: string }[];
    if (Array.isArray(arr) && arr[0]) return { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon) };
  } catch {}
  return { lat: 40.7128, lon: -74.006 };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const aName = typeof body.a === "string" ? body.a.trim() : "";
  const bName = typeof body.b === "string" ? body.b.trim() : "";
  const city = typeof body.city === "string" && body.city.trim() ? body.city.trim() : "Rome";
  const center = await geocode(city);

  if (!isLive()) {
    const places: Place[] = [
      { id: "FIX-venue-1", name: `Shared Taste Venue (${city})`, affinity: 0.88, lat: center.lat + 0.01, lon: center.lon + 0.01, address: city, tags: ["Music", "Food"] },
      { id: "FIX-venue-2", name: `Crossover Cafe (${city})`, affinity: 0.81, lat: center.lat - 0.01, lon: center.lon + 0.005, address: city, tags: ["Comedy", "Dining"] },
      { id: "FIX-venue-3", name: `Culture Hub (${city})`, affinity: 0.75, lat: center.lat + 0.005, lon: center.lon - 0.01, address: city, tags: ["Art", "Events"] },
    ];
    return NextResponse.json({ a: aName, b: bName, city, center, shared: [{ name: "Music", affinity: 0.8 }, { name: "Food", affinity: 0.7 }], places, mode: "mock" });
  }

  const [ra, rb] = await Promise.all([resolveFavorites([aName]), resolveFavorites([bName])]);
  const aId = ra[0]?.resolvedId;
  const bId = rb[0]?.resolvedId;
  if (!aId || !bId) return NextResponse.json({ error: "could not resolve both entities" }, { status: 404 });

  const { compareAudiences, insights } = await import("@/lib/qloo");
  const cmp = (await compareAudiences([aId], [bId])) as unknown;
  const cmpRec = asRecord(cmp);
  const cmpResults = asRecord(cmpRec?.results) || {};
  const aTags = Array.isArray(cmpResults.a) ? cmpResults.a : [];
  const bTags = Array.isArray(cmpResults.b) ? cmpResults.b : [];
  const bMap = new Map<string, Record<string, unknown>>();
  for (const t of bTags) {
    const r = asRecord(t);
    if (r && typeof r.name === "string") bMap.set(r.name, r);
  }
  const shared: { name: string; affinity: number }[] = [];
  for (const t of aTags) {
    const r = asRecord(t);
    if (!r || typeof r.name !== "string") continue;
    const other = bMap.get(r.name);
    if (!other) continue;
    const popA = typeof r.popularity === "number" ? r.popularity : 0.5;
    const popB = typeof other.popularity === "number" ? other.popularity : 0.5;
    shared.push({ name: r.name, affinity: Math.min(0.99, (popA + popB) / 2) });
  }
  shared.sort((x, y) => y.affinity - x.affinity);
  const sharedTags = shared.slice(0, 6).map((s) => s.name);

  let places: Place[] = [];
  try {
    const res = (await insights({
      "filter.type": "urn:entity:place",
      "signal.interests.entities": [aId, bId],
      "filter.location.query": city,
      take: 12,
    })) as unknown;
    const rec = asRecord(res);
    const results = asRecord(rec?.results);
    const arr = Array.isArray(results?.entities) ? results.entities : Array.isArray(rec?.results) ? rec.results : [];
    places = (arr as unknown[]).map((o) => {
      const r = asRecord(o) || {};
      const loc = asRecord(r.location) || {};
      const props = asRecord(r.properties);
      const imgs = Array.isArray(props?.images) ? props.images : [];
      const img = asRecord(imgs[0])?.url;
      const q = asRecord(r.query);
      const tagList = Array.isArray(r.tags) ? r.tags.map((x) => (asRecord(x)?.name as string) || String(x)) : undefined;
      return {
        id: typeof r.entity_id === "string" ? r.entity_id : typeof r.id === "string" ? r.id : "",
        name: typeof r.name === "string" ? r.name : "Unknown",
        affinity: typeof q?.affinity === "number" ? q.affinity : 0.7,
        lat: typeof loc.lat === "number" ? loc.lat : undefined,
        lon: typeof loc.lon === "number" ? loc.lon : undefined,
        address: typeof r.properties === "object" ? (asRecord(r.properties)?.address as string) : undefined,
        tags: tagList,
        image: typeof img === "string" ? img : undefined,
      };
    });
  } catch {
    places = [];
  }

  if (places.length === 0) {
    places = [
      { id: "FIX-venue-1", name: `Shared Taste Venue (${city})`, affinity: 0.85, lat: center.lat + 0.01, lon: center.lon + 0.01, address: city, tags: sharedTags },
    ];
  }

  return NextResponse.json({ a: ra[0].resolvedName || aName, b: rb[0].resolvedName || bName, city, center, shared, places, mode: "live" });
}
