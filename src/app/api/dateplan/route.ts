import { NextResponse } from "next/server";
import { isLive, insights } from "@/lib/qloo";
import { mockDatePlan } from "@/lib/mock";

type Pick = {
  category: "restaurant" | "movie" | "music" | "outfit" | "activity";
  name: string;
  entityId?: string;
  affinity?: number;
  reason: string;
  constraintStatus: "pass" | "fail" | "unknown";
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function parseInsights(res: unknown, category: Pick["category"], reason: string, constraints: string[]): Pick[] {
  const r = asRecord(res);
  const results = r?.results;
  const arr = Array.isArray(results) ? results : Array.isArray(asRecord(results)?.entities) ? (asRecord(results)?.entities as unknown[]) : [];
  return (arr as unknown[]).slice(0, 3).map((o) => {
    const rec = asRecord(o) || {};
    const affinity = typeof rec.score === "number" ? rec.score : typeof rec.affinity === "number" ? rec.affinity : 0.75;
    return {
      category,
      name: typeof rec.name === "string" ? rec.name : typeof rec.title === "string" ? rec.title : "Unknown",
      entityId: typeof rec.id === "string" ? rec.id : typeof rec.entity_id === "string" ? rec.entity_id : undefined,
      affinity,
      reason,
      constraintStatus: constraints.includes("accessibility") && category === "activity" ? "unknown" : "pass",
    };
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const shared: string[] = Array.isArray(body.shared) ? (body.shared as string[]) : [];
  const sharedTags: string[] = Array.isArray(body.sharedTags) ? (body.sharedTags as string[]) : [];
  const location: string = typeof body.location === "string" ? body.location : "New York City";
  const constraints: string[] = Array.isArray(body.constraints) ? (body.constraints as string[]) : [];

  if (!isLive()) {
    const vibeSource: string[] = Array.isArray(body.sharedNames) ? (body.sharedNames as string[]) : shared;
    const picks = mockDatePlan(vibeSource, location, constraints);
    return NextResponse.json({ picks });
  }

  const ids = shared.filter(Boolean);
  const tags = sharedTags.filter(Boolean);
  const picks: Pick[] = [];

  try {
    const r = await insights({
      "filter.type": "urn:entity:place",
      "signal.interests.entities": ids,
      "filter.tags": tags.length ? tags : undefined,
      "filter.location.query": location,
      take: 3,
    });
    picks.push(...parseInsights(r, "restaurant", "Place affinity for shared taste", constraints));
  } catch {}

  try {
    const r = await insights({ "filter.type": "urn:entity:movie", "signal.interests.entities": ids, take: 3 });
    picks.push(...parseInsights(r, "movie", "Media affinity for shared taste", constraints));
  } catch {}

  try {
    const r = await insights({ "filter.type": "urn:entity:artist", "signal.interests.entities": ids, take: 3 });
    picks.push(...parseInsights(r, "music", "Music affinity for shared taste", constraints));
  } catch {}

  try {
    const r = await insights({ "filter.type": "urn:entity:brand", "signal.interests.entities": ids, take: 3 });
    picks.push(...parseInsights(r, "outfit", "Brand affinity for shared taste", constraints));
  } catch {}

  try {
    const r = await insights({
      "filter.type": "urn:entity:place",
      "signal.interests.entities": ids,
      "filter.location.query": location,
      take: 3,
    });
    const acts = parseInsights(r, "activity", "Where-popular venue signal", constraints);
    if (acts.length) picks.push(acts[0]);
  } catch {}

  if (picks.length === 0) {
    picks.push(...mockDatePlan(shared, location, constraints));
  }
  return NextResponse.json({ picks });
}
