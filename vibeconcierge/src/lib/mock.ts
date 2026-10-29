export type Candidate = {
  id: string;
  name: string;
  city: string;
  age: number;
  gender: string;
  favorites: string[];
  tags: string[];
};

export const MOCK_CANDIDATES: Candidate[] = [
  { id: "c1", name: "Mina", city: "Brooklyn", age: 29, gender: "female", favorites: ["Beyonce", "Insecure", "Nigerian cuisine", "streetwear"], tags: ["afrobeats", "comedy"] },
  { id: "c2", name: "Leo", city: "Manhattan", age: 31, gender: "male", favorites: ["Radiohead", "Blade Runner", "ramen", "minimalist fashion"], tags: ["indie", "sci-fi"] },
  { id: "c3", name: "Priya", city: "Queens", age: 27, gender: "female", favorites: ["Bollywood", "Slumdog Millionaire", "chaat", "sarees"], tags: ["bollywood", "spicy"] },
  { id: "c4", name: "Sam", city: "Brooklyn", age: 33, gender: "male", favorites: ["Kendrick Lamar", "Atlanta", "soul food", "sneakers"], tags: ["hip-hop", "southern"] },
  { id: "c5", name: "Ava", city: "Manhattan", age: 26, gender: "female", favorites: ["Taylor Swift", "La La Land", "Italian", "cottagecore"], tags: ["pop", "romance"] },
  { id: "c6", name: "Diego", city: "Bronx", age: 30, gender: "male", favorites: ["Bad Bunny", "Coco", "tacos", "reggaeton"], tags: ["latin", "dance"] },
  { id: "c7", name: "Nora", city: "Brooklyn", age: 32, gender: "female", favorites: ["Fleetwood Mac", "Almost Famous", "wine bars", "vintage"], tags: ["classic-rock", "nostalgia"] },
  { id: "c8", name: "Kai", city: "Manhattan", age: 28, gender: "nonbinary", favorites: ["Lo-fi", "Spirited Away", "matcha", "Japanese design"], tags: ["anime", "minimal"] },
];

export function mockResolve(query: string) {
  return { id: "FIX-" + query.toLowerCase().replace(/\s+/g, "-"), name: query };
}

export function mockCompare(a: string[], b: string[]) {
  const shared = a.filter((x) => b.includes(x));
  const overlap = shared.length / Math.max(1, Math.max(a.length, b.length));
  const results = shared.map((name, i) => ({
    id: "FIX-" + name.toLowerCase().replace(/\s+/g, "-"),
    name,
    affinity: Math.min(0.98, 0.6 + overlap * 0.3 + i * 0.02),
  }));
  if (results.length === 0) {
    // give a weak shared vibe based on tag-ish overlap
    const weak = a.slice(0, 1).map((name) => ({ id: "FIX-" + name.toLowerCase().replace(/\s+/g, "-"), name, affinity: 0.45 }));
    results.push(...weak);
  }
  return { results, score: results.reduce((s, r) => s + r.affinity, 0) / Math.max(1, results.length) };
}

export type DatePick = {
  category: "restaurant" | "movie" | "music" | "outfit" | "activity";
  name: string;
  entityId?: string;
  affinity?: number;
  reason: string;
  constraintStatus: "pass" | "fail" | "unknown";
};

export function mockDatePlan(shared: string[], location: string, constraints: string[]) {
  const vibe = shared[0] || "your taste";
  const picks: DatePick[] = [
    { category: "restaurant", name: `${vibe}-inspired kitchen in ${location}`, entityId: "FIX-restaurant-1", affinity: 0.91, reason: "High affinity with both taste profiles", constraintStatus: constraints.includes("dietary") ? "unknown" : "pass" },
    { category: "movie", name: `A film fans of ${vibe} also love`, entityId: "FIX-movie-1", affinity: 0.88, reason: "Shared media affinity", constraintStatus: "pass" },
    { category: "music", name: `${vibe} playlist starter`, entityId: "FIX-artist-1", affinity: 0.85, reason: "Cross-category taste link", constraintStatus: "pass" },
    { category: "outfit", name: "Brand aligned with your shared vibe", entityId: "FIX-brand-1", affinity: 0.8, reason: "Audience overlap with favorite brands", constraintStatus: "pass" },
    { category: "activity", name: `Venue popular with ${vibe} fans`, entityId: "FIX-place-1", affinity: 0.87, reason: "Where-popular signal", constraintStatus: constraints.includes("accessibility") ? "unknown" : "pass" },
  ];
  return picks;
}
