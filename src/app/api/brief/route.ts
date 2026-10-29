import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const city = typeof body.city === "string" ? body.city : "Rome";
  const favorites = Array.isArray(body.favorites) ? (body.favorites as string[]) : [];
  const fingerprint = Array.isArray(body.fingerprint) ? (body.fingerprint as string[]) : [];
  const places = Array.isArray(body.places) ? body.places : [];

  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json({ error: "GROQ_API_KEY not set" }, { status: 500 });

  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
  const placeList = places.slice(0, 8).map((p: unknown) => { const r = (p && typeof p === "object" ? p : {}) as Record<string, unknown>; return `${String(r.name ?? "")} (${Math.round(Number(r.affinity ?? 0) * 100)}% affinity) - ${String(r.address ?? "")}`; }).join("\n");

  const prompt = `You are a travel concierge. A traveler is visiting ${city}. Their hometown taste fingerprint (shared cultural interests) is: ${fingerprint.join(", ") || "unknown"}. Their hometown favorites are: ${favorites.join(", ")}.

Qloo found these culturally matched venues in ${city}:
${placeList}

Write a concise, friendly travel brief (max 180 words) with:
1. A one-sentence vibe summary.
2. A short half-day itinerary using 3 of the venues.
3. One practical tip.
Mention that recommendations are based on aggregate cultural affinities, not guarantees. Do not invent venues not listed.`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
        reasoning_effort: "low",
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Groq ${res.status}: ${text}` }, { status: 502 });
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const msg = data.choices?.[0]?.message as { content?: string; reasoning?: string } | undefined;
    const brief = (msg?.content?.trim() || msg?.reasoning?.trim() || "No brief generated.").slice(0, 800);
    return NextResponse.json({ brief, model });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as { message?: string })?.message || "Groq failed" }, { status: 502 });
  }
}
