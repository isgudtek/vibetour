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
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`, { headers: { "User-Agent": "TasteRelay/1.0" } });
    const arr = (await res.json()) as { lat: string; lon: string }[];
    if (Array.isArray(arr) && arr[0]) return { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon) };
  } catch {}
  return { lat: 40.7128, lon: -74.006 };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const city = typeof body.city === "string" && body.city.trim() ? body.city.trim() : "Rome";
  const favorites: string[] = Array.isArray(body.favorites) ? (body.favorites as string[]).filter(Boolean) : [];
  const center = await geocode(city);

  if (!isLive()) {
    const places: Place[] = [
      { id: "FIX-venue-1", name: `Taste Match Venue (${city})`, affinity: 0.88, lat: center.lat + 0.01, lon: center.lon + 0.01, address: city, tags: ["Music", "Food", "Design"] },
      { id: "FIX-venue-2", name: `Crossover Spot (${city})`, affinity: 0.81, lat: center.lat - 0.01, lon: center.lon + 0.005, address: city, tags: ["Comedy", "Dining"] },
      { id: "FIX-venue-3", name: `Culture Hub (${city})`, affinity: 0.75, lat: center.lat + 0.005, lon: center.lon - 0.01, address: city, tags: ["Art", "Events"] },
    ];
    return NextResponse.json({ city, center, fingerprint: ["Music", "Food", "Design"], places, mode: "mock" });
  }

  const resolved = await resolveFavorites(favorites);
  const ids = resolved.map((f) => f.resolvedId).filter(Boolean) as string[];
  if (ids.length === 0) return NextResponse.json({ error: "could not resolve favorites" }, { status: 404 });

  // Taste fingerprint: intersect tags across pairwise compares
  const { compareAudiences, insights } = await import("@/lib/qloo");
  const fingerprintSet = new Set<string>();
  if (ids.length >= 2) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) pairs.push([ids[i], ids[j]]);
    const tagMaps: Map<string, number>[] = [];
    for (const [a, b] of pairs) {
      const cmp = (await compareAudiences([a], [b])) as unknown;
      const rec = asRecord(cmp);
      const results = asRecord(rec?.results) || {};
      const aTags = Array.isArray(results.a) ? results.a : [];
      const bTags = Array.isArray(results.b) ? results.b : [];
      const bNames = new Set(bTags.map((t) => asRecord(t)?.name).filter((x): x is string => typeof x === "string"));
      const m = new Map<string, number>();
      for (const t of aTags) {
        const r = asRecord(t);
        if (r && typeof r.name === "string" && bNames.has(r.name)) {
          const pop = typeof r.popularity === "number" ? r.popularity : 0.5;
          m.set(r.name, pop);
        }
      }
      tagMaps.push(m);
    }
    // intersect across all pairs
    if (tagMaps.length) {
      const first = tagMaps[0];
      for (const [name] of first) {
        if (tagMaps.every((m) => m.has(name))) fingerprintSet.add(name);
      }
    }
  }
  let fingerprint = [...fingerprintSet].slice(0, 8);
  if (fingerprint.length === 0) {
    // fallback: top tags from first compare
    try {
      const cmp = (await compareAudiences([ids[0]], [ids[1] || ids[0]])) as unknown;
      const rec = asRecord(cmp);
      const results = asRecord(rec?.results) || {};
      const arr = Array.isArray(results.a) ? results.a : [];
      fingerprint = arr.slice(0, 6).map((t) => (asRecord(t)?.name as string) || "").filter(Boolean);
    } catch {}
  }

  let places: Place[] = [];
  try {
    const res = (await insights({
      "filter.type": "urn:entity:place",
      "signal.interests.entities": ids,
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
        address: typeof props?.address === "string" ? props.address : undefined,
        tags: tagList,
        image: typeof img === "string" ? img : undefined,
      };
    });
  } catch {
    places = [];
  }

  if (places.length === 0) {
    places = [
      { id: "FIX-venue-1", name: `Taste Match Venue (${city})`, affinity: 0.85, lat: center.lat + 0.01, lon: center.lon + 0.01, address: city, tags: fingerprint },
    ];
  }

  return NextResponse.json({ city, center, fingerprint, places, mode: "live" });
}
