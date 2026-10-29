import { NextResponse } from "next/server";
import { isLive } from "@/lib/qloo";
import { resolveFavorites } from "@/lib/scoring";

export const dynamic = "force-dynamic";

type SharedTag = { id: string; name: string; affinity: number; type?: string };

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const aName = typeof body.a === "string" ? body.a.trim() : "";
  const bName = typeof body.b === "string" ? body.b.trim() : "";
  if (!aName || !bName) return NextResponse.json({ error: "both names required" }, { status: 400 });

  if (!isLive()) {
    const tags: SharedTag[] = [
      { id: "FIX-drama", name: "Drama", affinity: 0.82, type: "genre" },
      { id: "FIX-comedy", name: "Comedy", affinity: 0.76, type: "genre" },
      { id: "FIX-music", name: "Music", affinity: 0.71, type: "interest" },
      { id: "FIX-travel", name: "Travel", affinity: 0.65, type: "interest" },
      { id: "FIX-food", name: "Food & dining", affinity: 0.6, type: "interest" },
    ];
    return NextResponse.json({ a: aName, b: bName, shared: tags, mode: "mock" });
  }

  const [ra, rb] = await Promise.all([resolveFavorites([aName]), resolveFavorites([bName])]);
  const aId = ra[0]?.resolvedId;
  const bId = rb[0]?.resolvedId;
  if (!aId || !bId) return NextResponse.json({ error: "could not resolve both entities" }, { status: 404 });

  const { compareAudiences } = await import("@/lib/qloo");
  const res = (await compareAudiences([aId], [bId])) as unknown;
  const rec = asRecord(res);
  const results = asRecord(rec?.results) || {};
  const aTags = Array.isArray(results.a) ? results.a : [];
  const bTags = Array.isArray(results.b) ? results.b : [];
  const bMap = new Map<string, Record<string, unknown>>();
  for (const t of bTags) {
    const r = asRecord(t);
    if (r && typeof r.name === "string") bMap.set(r.name, r);
  }
  const shared: SharedTag[] = [];
  for (const t of aTags) {
    const r = asRecord(t);
    if (!r || typeof r.name !== "string") continue;
    const other = bMap.get(r.name);
    if (!other) continue;
    const popA = typeof r.popularity === "number" ? r.popularity : 0.5;
    const popB = typeof other.popularity === "number" ? other.popularity : 0.5;
    shared.push({
      id: (r.tag_id as string) || r.name,
      name: typeof r.name === "string" ? r.name : "Unknown",
      affinity: Math.min(0.99, (popA + popB) / 2),
      type: typeof r.subtype === "string" ? r.subtype.split(":").pop() : undefined,
    });
  }
  shared.sort((x, y) => y.affinity - x.affinity);

  return NextResponse.json({ a: ra[0].resolvedName || aName, b: rb[0].resolvedName || bName, shared, mode: "live" });
}
