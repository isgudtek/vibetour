import { NextResponse } from "next/server";
import { isLive, insights } from "@/lib/qloo";
import { resolveFavorites, resolveTags } from "@/lib/scoring";

export const dynamic = "force-dynamic";

type Place = {
  id: string;
  name: string;
  affinity: number;
  lat?: number;
  lon?: number;
  address?: string;
  tags?: string[];
  image?: string;
};

const CITY_CENTERS: Record<string, { lat: number; lon: number }> = {
  rome: { lat: 41.9028, lon: 12.4964 },
  "new york": { lat: 40.7128, lon: -74.006 },
  london: { lat: 51.5074, lon: -0.1278 },
  paris: { lat: 48.8566, lon: 2.3522 },
  tokyo: { lat: 35.6762, lon: 139.6503 },
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function pickLatLon(o: Record<string, unknown>): { lat?: number; lon?: number } {
  const loc = asRecord(o.location) || asRecord(o.geocode) || asRecord(o.coordinates);
  const lat = num(o.latitude ?? o.lat ?? loc?.latitude ?? loc?.lat);
  const lon = num(o.longitude ?? o.lng ?? o.lon ?? loc?.longitude ?? loc?.lng ?? loc?.lon);
  return { lat, lon };
}

async function geocode(city: string) {
  const key = city.toLowerCase();
  for (const k of Object.keys(CITY_CENTERS)) {
    if (key.includes(k)) return CITY_CENTERS[k];
  }
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`, {
      headers: { "User-Agent": "TasteMap/1.0" },
    });
    const arr = (await res.json()) as { lat: string; lon: string }[];
    if (Array.isArray(arr) && arr[0]) return { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon) };
  } catch {}
  return { lat: 40.7128, lon: -74.006 };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const city: string = typeof body.city === "string" && body.city.trim() ? body.city.trim() : "Rome";
  const favorites: string[] = Array.isArray(body.favorites) ? (body.favorites as string[]) : [];
  const tags: string[] = Array.isArray(body.tags) ? (body.tags as string[]) : [];
  const center = await geocode(city);

  if (!isLive()) {
    const names = ["Trattoria Affinity", "Cinema Taste", "Boutique Match", "Cafe Resonance", "Gallery Echo", "Market Vibe", "Park Harmony", "Club Signal"];
    const places: Place[] = names.map((name, i) => ({
      id: "FIX-" + name.toLowerCase().replace(/\s+/g, "-"),
      name: `${name} (${city})`,
      affinity: 0.6 + (i % 4) * 0.09,
      lat: center.lat + (Math.sin(i) * 0.02),
      lon: center.lon + (Math.cos(i) * 0.02),
      address: `${city} center`,
      tags: tags.length ? tags : ["taste"],
    }));
    return NextResponse.json({ city, center, places, mode: "mock" });
  }

  const resolved = await resolveFavorites(favorites);
  const ids = resolved.map((f) => f.resolvedId).filter(Boolean) as string[];
  const resolvedTags = await resolveTags(tags);

  let places: Place[] = [];
  try {
    const res = (await insights({
      "filter.type": "urn:entity:place",
      "signal.interests.entities": ids.length ? ids : undefined,
      "signal.interests.tags": resolvedTags.length ? resolvedTags : undefined,
      "filter.location.query": city,
      take: 12,
    })) as unknown;
    const rec = asRecord(res);
    const results = asRecord(rec?.results);
    const arr = Array.isArray(results?.entities) ? results.entities : Array.isArray(rec?.results) ? rec.results : [];
    places = (arr as unknown[]).map((o) => {
      const r = asRecord(o) || {};
      const { lat, lon } = pickLatLon(r);
      const t = Array.isArray(r.tags) ? r.tags.map((x) => (asRecord(x)?.name as string) || String(x)) : undefined;
      const props = asRecord(r.properties);
      const imgs = Array.isArray(props?.images) ? props.images : [];
      const img = asRecord(imgs[0])?.url;
      const q = asRecord(r.query);
      return {
        id: typeof r.id === "string" ? r.id : typeof r.entity_id === "string" ? r.entity_id : "",
        name: typeof r.name === "string" ? r.name : typeof r.title === "string" ? r.title : "Unknown",
        affinity: typeof q?.affinity === "number" ? q.affinity : typeof r.score === "number" ? r.score : typeof r.affinity === "number" ? r.affinity : 0.7,
        lat: lat ?? center.lat + (Math.random() - 0.5) * 0.03,
        lon: lon ?? center.lon + (Math.random() - 0.5) * 0.03,
        address: typeof r.address === "string" ? r.address : undefined,
        tags: t && t.length ? t : (Array.isArray(r.tags) ? r.tags.map((x: unknown) => (asRecord(x)?.name as string) || String(x)) : undefined),
        image: typeof img === "string" ? img : undefined,
      };
    });
  } catch {
    places = [];
  }

  if (places.length === 0) {
    const names = ["Taste Pick", "Culture Spot", "Local Match", "Affinity Venue"];
    places = names.map((name, i) => ({
      id: "FIX-" + name.toLowerCase().replace(/\s+/g, "-"),
      name: `${name} (${city})`,
      affinity: 0.65 + i * 0.05,
      lat: center.lat + (Math.sin(i) * 0.02),
      lon: center.lon + (Math.cos(i) * 0.02),
      address: city,
      tags: tags.length ? tags : ["taste"],
    }));
  }

  return NextResponse.json({ city, center, places, mode: "live" });
}
