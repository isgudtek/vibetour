import { NextResponse } from "next/server";
import { isLive } from "@/lib/qloo";
import type { Venue } from "@/types";

export const dynamic = "force-dynamic";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

const CATEGORY_SEARCH_KEYWORDS: Record<string, string[]> = {
  Cafe: ["coffee", "cafe", "espresso", "specialty coffee", "roastery"],
  Restaurant: ["dining", "restaurant", "bistro", "izakaya", "cuisine"],
  Bar: ["bar", "cocktails", "wine bar", "speakeasy", "listening bar"],
  Club: ["nightclub", "dance club", "music venue"],
  Museum: ["museum", "contemporary art", "art gallery", "exhibition"],
  Shop: ["boutique", "concept store", "fashion", "bookshop", "design"],
  Hotel: ["boutique hotel", "hotel", "lodging"],
  Park: ["park", "garden", "botanical garden"],
  Theater: ["theater", "cinema", "concert hall"],
  Venue: ["cultural space", "creative studio", "listening lounge"],
};

const TYPOLOGY_TAGS: [string, string[]][] = [
  ["Hotel", ["hotel", "boutique hotel", "resort", "lodging", "inn"]],
  ["Museum", ["museum", "art gallery", "exhibition", "gallery"]],
  ["Shop", ["boutique", "shop", "store", "market", "bookshop", "boutique"]],
  ["Cafe", ["cafe", "coffee shop", "coffeehouse", "bakery", "tea house", "espresso"]],
  ["Restaurant", ["restaurant", "izakaya", "trattoria", "bistro", "diner", "pizzeria", "brasserie", "ramen", "sushi"]],
  ["Bar", ["bar", "cocktail bar", "pub", "wine bar", "speakeasy", "listening bar", "tapas bar"]],
  ["Club", ["nightclub", "club", "dance club"]],
  ["Theater", ["theater", "theatre", "cinema", "concert hall", "venue"]],
];

function classifyVenue(name: string, tags: string[] | undefined, address: string | undefined): string {
  const tagNames = (tags || []).map((t) => t.toLowerCase());
  const lowerName = name.toLowerCase();
  // Obvious name patterns win over tags (restaurants whose tags mention "hotel")
  if (/restaurant|trattoria|ristorante|izakaya|pizzeria|ramen|bistro|brasserie|diner/.test(lowerName)) return "Restaurant";
  if (/cafe|caffè|coffee|espresso|bakery/.test(lowerName)) return "Cafe";
  if (/hotel|inn|lodge|resort/.test(lowerName)) return "Hotel";
  if (/bar|pub|lounge|tavern/.test(lowerName)) return "Bar";
  if (/museum|gallery|exhibition/.test(lowerName)) return "Museum";
  if (/shop|store|market|boutique|bookshop/.test(lowerName)) return "Shop";
  // Then Qloo's own tag labels
  for (const [label, keywords] of TYPOLOGY_TAGS) {
    if (tagNames.some((t) => keywords.some((k) => t.includes(k)))) return label;
  }
  const text = `${name} ${(tags || []).join(" ")} ${address || ""}`.toLowerCase();
  const rules: [string, string[]][] = [
    ["Hotel", ["hotel", "resort", "lodging"]],
    ["Museum", ["museum", "gallery", "exhibition"]],
    ["Shop", ["shop", "boutique", "store", "market"]],
    ["Restaurant", ["restaurant", "dining", "izakaya", "trattoria", "bistro", "ramen", "sushi", "pizza"]],
    ["Cafe", ["cafe", "coffee", "bakery", "tea"]],
    ["Bar", ["bar", "cocktail", "pub", "izakaya", "nightlife", "speakeasy"]],
    ["Club", ["club", "dance", "nightclub"]],
    ["Park", ["park", "garden", "outdoor"]],
    ["Theater", ["theater", "cinema", "concert"]],
  ];
  for (const [label, keywords] of rules) {
    if (keywords.some((k) => text.includes(k))) return label;
  }
  return "Venue";
}

function matchesCategory(name: string, tagList: string[], targetCategory: string, address?: string): boolean {
  const detected = classifyVenue(name, tagList, address);
  if (detected === targetCategory) return true;
  // If target is "Venue", accept places classified as Venue
  if (targetCategory === "Venue") return true;
  return false;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const city = typeof body.city === "string" && body.city.trim() ? body.city.trim() : "Tokyo";
  const category = typeof body.category === "string" && body.category ? body.category : "Venue";
  const tags: string[] = Array.isArray(body.tags) ? (body.tags as string[]) : [];
  const tagIds: string[] = Array.isArray(body.tagIds) ? (body.tagIds as string[]) : [];
  const excluded: string[] = Array.isArray(body.excluded) ? (body.excluded as string[]) : [];
  const offset: number = typeof body.offset === "number" ? body.offset : 0;
  const enrichmentText = typeof body.enrichmentText === "string" && body.enrichmentText.trim() ? body.enrichmentText.trim() : "";

  const excludedSet = new Set(excluded);

  if (!isLive()) {
    // Return high quality curated category fallback for mock mode
    const mockVenueName = enrichmentText
      ? `${city} Curated ${enrichmentText} ${category}`
      : `${city} ${category} Selection`;
    const mockVenue: Venue = {
      id: `mock-more-${category.toLowerCase()}-${Date.now()}`,
      name: mockVenueName,
      category,
      affinity: 0.88,
      address: `${city} Central District`,
      tags: enrichmentText ? [enrichmentText, ...tags.slice(0, 2)] : tags.slice(0, 3),
      rationale: enrichmentText
        ? `Qloo matched this ${category.toLowerCase()} specifically to your refined preference of "${enrichmentText}" along with guest's profile.`
        : `Qloo matched this ${category.toLowerCase()} specifically to the guest's ${tags.slice(0, 2).join(" & ") || "taste"} affinity.`,
    };
    return NextResponse.json({ places: [mockVenue] });
  }

  try {
    const { insights, searchEntities, searchTags } = await import("@/lib/qloo");

    let enrichedTagId: string | null = null;
    if (enrichmentText) {
      try {
        const tagRes = asRecord(await searchTags(enrichmentText));
        const tagResults = asRecord(tagRes?.results);
        const tagRaw: unknown[] = Array.isArray(tagResults?.tags)
          ? (tagResults.tags as unknown[])
          : Array.isArray(tagRes?.results)
          ? (tagRes.results as unknown[])
          : [];
        if (tagRaw.length > 0) {
          const topTag = asRecord(tagRaw[0]);
          if (topTag && typeof topTag.id === "string") {
            enrichedTagId = topTag.id;
          }
        }
      } catch (err) {
        console.error("Error searching tags for enrichment:", err);
      }
    }

    const activeTagIds = enrichedTagId ? [enrichedTagId, ...tagIds] : tagIds;

    // 1. Try Insights — scan multiple offset pages to find a category match
    const offsets = [offset, offset + 24, offset + 48];
    let match: Venue | null = null;

    for (const off of offsets) {
      if (match) break;
      const res = (await insights({
        "filter.type": "urn:entity:place",
        "signal.interests.tags": activeTagIds.length ? activeTagIds.slice(0, 6) : undefined,
        "filter.location.query": city,
        take: 24,
        offset: off,
      })) as unknown;

      const rec = asRecord(res);
      const results = asRecord(rec?.results);
      const arr = Array.isArray(results?.entities) ? results.entities : Array.isArray(rec?.results) ? rec.results : [];

      for (const o of arr as unknown[]) {
        const r = asRecord(o) || {};
        const id = typeof r.entity_id === "string" ? r.entity_id : typeof r.id === "string" ? r.id : "";
        if (!id || excludedSet.has(id)) continue;

        const name = typeof r.name === "string" ? r.name : "Unknown";
        const loc = asRecord(r.location) || {};
        const props = asRecord(r.properties);
        const imgs = Array.isArray(props?.images) ? props.images : [];
        const img = asRecord(imgs[0])?.url;
        const q = asRecord(r.query);
        const tagList = Array.isArray(r.tags) ? r.tags.map((x) => (asRecord(x)?.name as string) || String(x)) : [];

        const addr = typeof props?.address === "string" ? props.address : undefined;

        // ✅ Strictly check against the same classifier used in concierge
        const detected = classifyVenue(name, tagList, addr);
        if (category !== "Venue" && detected !== category) {
          continue;
        }

        match = {
          id,
          name,
          category,
          affinity: typeof q?.affinity === "number" ? q.affinity : 0.82,
          lat: typeof loc.lat === "number" ? loc.lat : undefined,
          lon: typeof loc.lon === "number" ? loc.lon : undefined,
          address: addr,
          tags: tagList,
          image: typeof img === "string" ? img : undefined,
          rationale: `Qloo suggestion: ${name} matches the guest's ${tags.slice(0, 2).join(" & ") || "lifestyle"} profile in ${city}.`,
        };
        break;
      }
    }

    if (match) {
      return NextResponse.json({ places: [match] });
    }

    // 2. Fallback: keyword search — try each keyword until we find a category-matching result
    const baseKeywords = CATEGORY_SEARCH_KEYWORDS[category] || [category.toLowerCase()];
    const keywords = enrichmentText ? [enrichmentText, ...baseKeywords] : baseKeywords;

    for (const keyword of keywords) {
      const searchQuery = `${city} ${keyword}`;
      const searchRes = (await searchEntities(searchQuery)) as Record<string, unknown>;
      const searchArr = Array.isArray(searchRes?.results) ? searchRes.results : [];

      for (const item of searchArr) {
        const r = asRecord(item) || {};
        const id = typeof r.id === "string" ? r.id : typeof r.entity_id === "string" ? r.entity_id : "";
        if (!id || excludedSet.has(id)) continue;
        const name = typeof r.name === "string" ? r.name : `${city} ${category}`;
        const tagList = Array.isArray(r.tags) ? r.tags.map((x) => (asRecord(x)?.name as string) || String(x)) : [];
        const props = asRecord(r.properties);
        const addr = typeof props?.address === "string" ? props.address : undefined;

        // Strictly verify using the classifier
        const detected = classifyVenue(name, tagList, addr);
        if (category !== "Venue" && detected !== category) {
          continue;
        }

        const loc = asRecord(r.location) || {};
        return NextResponse.json({
          places: [{
            id,
            name,
            category,
            affinity: 0.85,
            lat: typeof loc.lat === "number" ? loc.lat : undefined,
            lon: typeof loc.lon === "number" ? loc.lon : undefined,
            address: addr || `${city}`,
            tags: tagList,
            rationale: `Targeted ${category} discovery in ${city} based on matched taste criteria.`,
          }],
        });
      }
    }

    return NextResponse.json({ places: [] });
  } catch (err) {
    console.error("Error in /api/more:", err);
    return NextResponse.json({ places: [] });
  }
}
