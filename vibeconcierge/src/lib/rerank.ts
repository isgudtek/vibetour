export type RankableVenue = {
  name: string;
  category: string;
  affinity: number;
  popularity: number;
  tags: string[];
};

const STOP = new Set(["the", "and", "of", "a", "an", "in", "with", "for", "to", "style", "culture", "interests", "shop", "shops"]);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/** Share of the user's taste tokens that appear in the venue's Qloo tags (0..1). */
export function tagOverlap(venueTags: string[], tasteNames: string[]): number {
  const taste = new Set(tasteNames.flatMap(tokens));
  if (taste.size === 0) return 0;
  const venue = new Set(venueTags.flatMap(tokens));
  let hit = 0;
  for (const t of taste) if (venue.has(t)) hit++;
  return hit / taste.size;
}

/**
 * Re-ranks a candidate pool. Qloo's affinity is flat across results for a given query,
 * so the score is driven by tag overlap with the user's taste, then popularity.
 * Near-zero popularity entries (typically chains or stale listings) are dropped, and
 * hotels are demoted unless the taste profile itself asks for lodging.
 */
export function rerank<T extends RankableVenue>(pool: T[], tasteNames: string[], take: number, relaxed = false): T[] {
  const askedForLodging = tasteNames.some((n) => /hotel|stay|lodg|hostel|resort/i.test(n));
  const scored = pool
    .filter((v) => relaxed ? true : v.popularity >= 0.3)
    .map((v) => {
      const overlap = tagOverlap(v.tags, tasteNames);
      const hotelPenalty = v.category === "Hotel" && !askedForLodging ? 0.5 : 0;
      if (!relaxed && overlap === 0) return { v, score: -1 };
      const effectiveOverlap = relaxed && overlap === 0 ? 0.05 : overlap;
      const score = 0.7 * effectiveOverlap + 0.2 * (v.popularity || 0.1) + 0.1 * v.affinity - hotelPenalty;
      return { v, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, take).map((x) => x.v);
}

/**
 * Category-balanced variant: same scoring, then keeps the top N of each venue type,
 * so the result covers the full spread (Bar, Cafe, Shop, Museum...) instead of
 * being dominated by the single most common type.
 */
export function rerankByCategory<T extends RankableVenue>(
  pool: T[],
  tasteNames: string[],
  perCategory: number,
  maxTotal: number,
  relaxed = false
): { venues: T[]; counts: Record<string, number> } {
  const askedForLodging = tasteNames.some((n) => /hotel|stay|lodg|hostel|resort/i.test(n));
  const scored = pool
    .filter((v) => relaxed ? true : v.popularity >= 0.3)
    .map((v) => {
      const overlap = tagOverlap(v.tags, tasteNames);
      const hotelPenalty = v.category === "Hotel" && !askedForLodging ? 0.5 : 0;
      if (!relaxed && overlap === 0) return { v, score: -1 };
      const effectiveOverlap = relaxed && overlap === 0 ? 0.05 : overlap;
      const score = 0.7 * effectiveOverlap + 0.2 * (v.popularity || 0.1) + 0.1 * v.affinity - hotelPenalty;
      return { v, score };
    })
    .sort((a, b) => b.score - a.score);

  const byCat = new Map<string, { v: T; score: number }[]>();
  for (const s of scored.filter((x) => x.score > 0)) {
    const arr = byCat.get(s.v.category) || [];
    arr.push(s);
    byCat.set(s.v.category, arr);
  }

  const picked: { v: T; score: number }[] = [];
  const counts: Record<string, number> = {};
  for (const [cat, arr] of byCat) {
    const take = arr.slice(0, perCategory);
    counts[cat] = take.length;
    picked.push(...take);
  }
  picked.sort((a, b) => b.score - a.score);
  return { venues: picked.slice(0, maxTotal).map((x) => x.v), counts };
}
