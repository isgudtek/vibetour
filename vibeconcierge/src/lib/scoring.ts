import { isLive, compareAudiences, searchEntities, searchTags, trending } from "./qloo";
import { mockResolve, mockCompare } from "./mock";

export type Favorite = { query: string; resolvedId?: string; resolvedName?: string };

export type SharedItem = { id: string; name: string; affinity: number };

export type CompatibilityResult = {
  candidateId: string;
  score: number;
  shared: SharedItem[];
  explanation: string;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(v: unknown): UnknownRecord | null {
  return v && typeof v === "object" ? (v as UnknownRecord) : null;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function pickId(o: unknown): string | undefined {
  const r = asRecord(o);
  if (!r) return undefined;
  const v = r.id ?? r.entity_id ?? r.uuid ?? r.qid;
  return typeof v === "string" ? v : undefined;
}
function pickName(o: unknown): string {
  const r = asRecord(o);
  if (!r) return "Unknown";
  const v = r.name ?? r.title ?? r.label;
  return typeof v === "string" ? v : "Unknown";
}

export async function resolveFavorites(favorites: string[]): Promise<Favorite[]> {
  if (!isLive()) {
    return favorites.map((q) => {
      const r = mockResolve(q);
      return { query: q, resolvedId: r.id, resolvedName: r.name };
    });
  }

  // Parallelize entity lookups (max 10 seeds)
  const targets = favorites.slice(0, 10);
  const results = await Promise.all(
    targets.map(async (q) => {
      try {
        const res = (await searchEntities(q)) as UnknownRecord;
        const first = Array.isArray(res.results)
          ? res.results[0]
          : asRecord(res.results)?.entities && Array.isArray((res.results as UnknownRecord).entities)
          ? ((res.results as UnknownRecord).entities as unknown[])[0]
          : undefined;
        return { query: q, resolvedId: pickId(first), resolvedName: first ? pickName(first) : q };
      } catch {
        return { query: q, resolvedName: q };
      }
    })
  );
  return results;
}

export async function resolveTags(queries: string[]): Promise<string[]> {
  if (!isLive()) return queries.map((q) => "FIX-TAG-" + q.toLowerCase().replace(/\s+/g, "-"));
  
  // Parallelize tag lookups
  const ids = await Promise.all(
    queries.slice(0, 12).map(async (q) => {
      try {
        const res = (await searchTags(q)) as UnknownRecord;
        const tags = Array.isArray(res.results) ? res.results : Array.isArray((res.results as UnknownRecord)?.tags) ? ((res.results as UnknownRecord).tags as unknown[]) : [];
        const first = tags[0];
        return pickId(first) || null;
      } catch {
        return null;
      }
    })
  );
  return ids.filter((id): id is string => Boolean(id));
}

export async function compareWithCandidate(userIds: string[], candidateIds: string[]): Promise<{ shared: SharedItem[]; score: number }> {
  if (!isLive()) {
    const r = mockCompare(userIds, candidateIds) as { results: SharedItem[]; score: number };
    return { shared: r.results, score: r.score };
  }
  try {
    const res = (await compareAudiences(userIds, candidateIds)) as UnknownRecord;
    const arr = Array.isArray(res.results) ? res.results : Array.isArray((res.results as UnknownRecord)?.entities) ? ((res.results as UnknownRecord).entities as unknown[]) : [];
    const shared: SharedItem[] = (arr as unknown[]).slice(0, 8).map((o) => ({
      id: pickId(o) || "",
      name: pickName(o),
      affinity: num((asRecord(o) || {}).score ?? (asRecord(o) || {}).affinity ?? (asRecord(o) || {}).value) ?? 0.5,
    }));
    const score = shared.length ? shared.reduce((s, x) => s + x.affinity, 0) / shared.length : 0.35;
    return { shared, score: Math.min(0.99, Math.max(0.2, score)) };
  } catch {
    return { shared: [], score: 0.35 };
  }
}

export async function trendingFor(ids: string[]) {
  if (!isLive()) return { rising: true, delta: 0.12 };
  try {
    const res = (await trending("urn:entity:artist", ids)) as UnknownRecord;
    const arr = Array.isArray((res.results as UnknownRecord)?.trending) ? ((res.results as UnknownRecord).trending as unknown[]) : [];
    const latest = asRecord(arr[0]);
    const delta = num(latest?.population_percent_delta ?? latest?.velocity_fold_change) ?? 0;
    return { rising: delta >= 0, delta };
  } catch {
    return { rising: false, delta: 0 };
  }
}

export { MOCK_CANDIDATES } from "./mock";
