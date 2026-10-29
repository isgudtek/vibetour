import { searchTags } from "./qloo";

export type QlooTagCandidate = { id: string; name: string; type: string; popularity: number };

export type TagSelection = { phrase: string; tag: QlooTagCandidate | null };

type UnknownRecord = Record<string, unknown>;

const candidateCache = new Map<string, QlooTagCandidate[]>();

/** Lower is better. Location, media-keyword and artist tags pull generic taste phrases toward the wrong venues. */
export function tagPenalty(id: string): number {
  if (id.includes(":nearby_attraction:") || id.includes(":locality") || id.includes(":geocode")) return 4;
  if (id.startsWith("urn:tag:keyword:media") || id.startsWith("urn:tag:keyword:qloo") || id.startsWith("urn:tag:artist:")) return 2;
  return 0;
}

function asRec(v: unknown): UnknownRecord | null {
  return v && typeof v === "object" ? (v as UnknownRecord) : null;
}

function normStr(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Calculate word-overlap similarity score between a phrase and candidate tag name */
export function calculateMatchScore(phrase: string, candidateName: string, penalty = 0, popularity = 0): number {
  const pNorm = normStr(phrase);
  const cNorm = normStr(candidateName);
  if (pNorm === cNorm) return 1.0 - penalty * 0.1;
  if (cNorm.includes(pNorm) || pNorm.includes(cNorm)) return 0.88 - penalty * 0.1 + Math.min(0.1, popularity * 0.1);

  const pWords = new Set(pNorm.split(/\s+/).filter((w) => w.length > 2));
  const cWords = new Set(cNorm.split(/\s+/).filter((w) => w.length > 2));
  if (pWords.size === 0 || cWords.size === 0) return 0;

  let common = 0;
  for (const w of pWords) {
    if (cWords.has(w)) common++;
  }
  const jaccard = common / Math.max(pWords.size, cWords.size);
  return jaccard - penalty * 0.1 + Math.min(0.1, popularity * 0.1);
}

/** Clean long or descriptive phrases into search queries */
export function cleanTagQuery(phrase: string): string[] {
  const queries = new Set<string>();
  const raw = phrase.trim();
  if (!raw) return [];

  // Extract parenthetical if present (e.g. "Modern jazz (Kamasi Washington)" -> "Kamasi Washington")
  const parenMatch = raw.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1]) {
    queries.add(parenMatch[1].trim());
  }

  // Clean base phrase by removing parentheticals, filler words, trailing noise
  const cleaned = raw
    .replace(/\([^)]+\)/g, "")
    .replace(/\b(collecting|attending|sessions|spots like|via|at the|in a|with|from|curates|favors|prefers|enthusiast|lover|fan|lifestyle)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned) queries.add(cleaned);
  queries.add(raw);

  // Add key noun if 2+ words (e.g. "Live Flamenco" -> "Flamenco", "Rooftop Tapas" -> "Tapas", "Seasonal Sashimi" -> "Sashimi")
  const words = cleaned.split(/\s+/);
  if (words.length >= 2) {
    const lastWord = words[words.length - 1];
    if (lastWord.length > 3 && !/venues|places|bars|shops|culture|spots|dining/i.test(lastWord)) {
      queries.add(lastWord);
    }
  }

  return Array.from(queries).slice(0, 3);
}

/**
 * High-hit-rate Qloo tag candidate search.
 */
export async function candidatesFor(phrase: string, limit = 8): Promise<QlooTagCandidate[]> {
  const key = phrase.trim().toLowerCase();
  if (!key) return [];
  const cached = candidateCache.get(key);
  if (cached) return cached.slice(0, limit);

  const seenIds = new Set<string>();
  const bestByName = new Map<string, QlooTagCandidate>();
  const queries = cleanTagQuery(phrase);

  await Promise.all(
    queries.map(async (q) => {
      try {
        const res = asRec(await searchTags(q));
        const results = asRec(res?.results);
        const raw: unknown[] = Array.isArray(results?.tags) ? (results.tags as unknown[]) : Array.isArray(res?.results) ? (res.results as unknown[]) : [];
        for (const t of raw) {
          const r = asRec(t) || {};
          const id = typeof r.id === "string" ? r.id : "";
          const name = (typeof r.name === "string" ? r.name : "").trim();
          if (!id || !name || seenIds.has(id)) continue;
          seenIds.add(id);

          const cand: QlooTagCandidate = {
            id,
            name,
            type: typeof r.type === "string" ? r.type : "",
            popularity: typeof r.popularity === "number" ? r.popularity : 0,
          };

          const nameKey = name.toLowerCase();
          const existing = bestByName.get(nameKey);
          if (!existing) {
            bestByName.set(nameKey, cand);
          } else {
            const existingScore = -tagPenalty(existing.id) * 10 + existing.popularity;
            const candScore = -tagPenalty(cand.id) * 10 + cand.popularity;
            if (candScore > existingScore) {
              bestByName.set(nameKey, cand);
            }
          }
        }
      } catch {
        // continue
      }
    })
  );

  const out = Array.from(bestByName.values());
  out.sort((a, b) => {
    const scoreA = calculateMatchScore(phrase, a.name, tagPenalty(a.id), a.popularity);
    const scoreB = calculateMatchScore(phrase, b.name, tagPenalty(b.id), b.popularity);
    return scoreB - scoreA;
  });

  candidateCache.set(key, out);
  return out.slice(0, limit);
}

/**
 * Fast Hybrid Screening:
 * Resolves direct matches instantly, and passes only ambiguous phrases to the LLM.
 */
export async function selectQlooTags(
  phrases: string[],
  llm: (prompt: string) => Promise<string>,
): Promise<TagSelection[]> {
  const candidateLists = await Promise.all(phrases.map((phrase) => candidatesFor(phrase)));
  const shortlist: { phrase: string; candidates: QlooTagCandidate[]; directMatch?: QlooTagCandidate | null }[] = phrases.map((phrase, i) => {
    const cands = candidateLists[i];
    const pNorm = normStr(phrase);
    const exact = cands.find((c) => {
      const cNorm = normStr(c.name);
      return (cNorm === pNorm || pNorm.includes(cNorm) || cNorm.includes(pNorm)) && tagPenalty(c.id) < 2;
    });
    return {
      phrase,
      candidates: cands,
      directMatch: exact || null,
    };
  });

  const needLlm = shortlist.filter((s) => !s.directMatch && s.candidates.length > 0);
  let mappings: { phrase?: string; tag?: string | null }[] = [];

  if (needLlm.length > 0) {
    try {
      const prompt = `You map taste phrases to Qloo tags. For each phrase, pick the BEST candidate name. Return JSON: {"mappings":[{"phrase":string,"tag":string|null}]}. Input: ${JSON.stringify(needLlm.map((s) => ({ phrase: s.phrase, candidates: s.candidates.slice(0, 5).map((c) => c.name) })))}`;
      const raw = await llm(prompt);
      const match = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : raw) as { mappings?: { phrase?: string; tag?: string | null }[] };
      mappings = Array.isArray(parsed.mappings) ? parsed.mappings : [];
    } catch {
      mappings = [];
    }
  }

  return shortlist.map((s) => {
    if (s.directMatch) {
      return { phrase: s.phrase, tag: s.directMatch };
    }

    const m = mappings.find((x) => normStr(x.phrase || "") === normStr(s.phrase));
    const chosenName = (m?.tag || "").toLowerCase().trim();
    const fromLlm = chosenName ? s.candidates.find((c) => c.name.toLowerCase() === chosenName) : undefined;
    if (fromLlm) return { phrase: s.phrase, tag: fromLlm };

    if (s.candidates.length > 0) {
      const scored = s.candidates.map((c) => ({
        candidate: c,
        score: calculateMatchScore(s.phrase, c.name, tagPenalty(c.id), c.popularity),
      }));
      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];
      if (best && best.score > 0.05) {
        return { phrase: s.phrase, tag: best.candidate };
      }
    }

    return { phrase: s.phrase, tag: null };
  });
}
