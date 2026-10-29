import { NextResponse } from "next/server";
import { resolveFavorites } from "@/lib/scoring";
import { isLive } from "@/lib/qloo";
import { MOCK_CANDIDATES, mockCompare } from "@/lib/mock";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const userFavorites: string[] = Array.isArray(body.userFavorites) ? (body.userFavorites as string[]) : [];
  const candidateId: string = typeof body.candidateId === "string" ? body.candidateId : "";
  const candidate = MOCK_CANDIDATES.find((c) => c.id === candidateId);
  if (!candidate) return NextResponse.json({ error: "candidate not found" }, { status: 404 });

  if (!isLive()) {
    const r = mockCompare(userFavorites, candidate.favorites) as { results: { id: string; name: string; affinity: number }[]; score: number };
    return NextResponse.json({
      candidateId,
      score: r.score,
      shared: r.results,
      explanation: r.results.length
        ? `Shared affinity on ${r.results.map((x) => x.name).join(", ")}`
        : "Low overlap; try refining taste signals",
    });
  }

  const [uResolved, cResolved] = await Promise.all([
    resolveFavorites(userFavorites),
    resolveFavorites(candidate.favorites),
  ]);
  const uIds = uResolved.map((f) => f.resolvedId).filter(Boolean) as string[];
  const cIds = cResolved.map((f) => f.resolvedId).filter(Boolean) as string[];

  const { compareAudiences } = await import("@/lib/qloo");
  const res = (await compareAudiences(uIds, cIds)) as unknown;
  const rec = asRecord(res);
  const results = asRecord(rec?.results);
  const arr = Array.isArray(results?.tags) ? results.tags : Array.isArray(rec?.results) ? (rec?.results as unknown[]) : [];
  const shared = (arr as unknown[]).slice(0, 8).map((o) => {
    const r2 = asRecord(o) || {};
    const q = asRecord(r2.query);
    const affinity = typeof q?.score === "number" ? q.score : typeof r2.score === "number" ? r2.score : typeof r2.affinity === "number" ? r2.affinity : 0.5;
    return {
      id: typeof r2.id === "string" ? r2.id : typeof r2.entity_id === "string" ? r2.entity_id : "",
      name: typeof r2.name === "string" ? r2.name : typeof r2.tag_id === "string" ? r2.tag_id : "Unknown",
      affinity,
    };
  });
  const score = shared.length ? shared.reduce((s, x) => s + x.affinity, 0) / shared.length : 0.35;
  return NextResponse.json({
    candidateId,
    score: Math.min(0.99, Math.max(0.2, score)),
    shared,
    explanation: shared.length
      ? `Qloo audience overlap on ${shared.map((x) => x.name).join(", ")}`
      : "Low aggregate overlap",
  });
}
