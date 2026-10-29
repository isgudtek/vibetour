export function isLive(): boolean {
  return process.env.TASTEMATCH_LIVE === "1" && Boolean(process.env.QLOO_API_KEY);
}

export function mode(): "mock" | "live" {
  return isLive() ? "live" : "mock";
}

const BASE = process.env.QLOO_BASE_URL || "https://hackathon.api.qloo.com";

export class QlooError extends Error {
  code: string;
  retryable: boolean;
  constructor(message: string, code = "QLOO_ERROR", retryable = false) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

type CacheEntry = { value: unknown; expires: number };
const cache = new Map<string, CacheEntry>();
const TTL = 5 * 60 * 1000;

function cacheKey(path: string, params: URLSearchParams) {
  return path + "?" + [...params.entries()].sort().map(([k, v]) => `${k}=${v}`).join("&");
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function qlooGet(path: string, params: Record<string, string | string[] | number | boolean | undefined> = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) sp.append(k, v.map(String).join(","));
    else sp.append(k, String(v));
  }
  const key = cacheKey(path, sp);
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return structuredClone(hit.value);

  const url = `${BASE}${path}${sp.toString() ? "?" + sp.toString() : ""}`;
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "X-Api-Key": process.env.QLOO_API_KEY || "" },
        cache: "no-store",
      });
      if (res.status === 429 || res.status >= 500) {
        lastErr = new QlooError(`Qloo ${res.status}`, "QLOO_HTTP_" + res.status, true);
        await sleep(300 * (attempt + 1));
        continue;
      }
      if (!res.ok) {
        const text = await res.text();
        throw new QlooError(`Qloo ${res.status}: ${text}`, "QLOO_HTTP_" + res.status, false);
      }
      const json = await res.json();
      cache.set(key, { value: json, expires: Date.now() + TTL });
      return structuredClone(json);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (attempt < 2) await sleep(300 * (attempt + 1));
    }
  }
  throw lastErr || new QlooError("Qloo request failed");
}

export async function searchEntities(query: string) {
  return qlooGet("/search", { query, take: 5 });
}

export async function searchTags(query: string) {
  return qlooGet("/v2/tags", { "filter.query": query, take: 10, "feature.semantic_search": true });
}

export async function compareAudiences(a: string[], b: string[]) {
  return qlooGet("/v2/analysis/compare", {
    "a.signal.interests.entities": a,
    "b.signal.interests.entities": b,
    "filter.type": "urn:entity:artist",
    take: 20,
  });
}

export async function insights(params: Record<string, string | string[] | number | undefined>) {
  return qlooGet("/v2/insights", params);
}

export async function trending(entityType: string, ids: string[]) {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 6);
  return qlooGet("/v2/trending", {
    "filter.type": entityType,
    "signal.interests.entities": ids,
    "filter.start_date": start.toISOString().slice(0, 10),
    "filter.end_date": end.toISOString().slice(0, 10),
    take: 10,
  });
}
