import { NextResponse } from "next/server";
import { resolveFavorites, resolveTags } from "@/lib/scoring";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const favorites: string[] = Array.isArray(body?.favorites) ? body.favorites : [];
  const vibes: string[] = Array.isArray(body?.vibes) ? body.vibes : [];
  const resolved = await resolveFavorites(favorites);
  const tags = await resolveTags(vibes);
  return NextResponse.json({ favorites: resolved, tags });
}
