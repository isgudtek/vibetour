import { NextResponse } from "next/server";
import { callLLM, LLMProvider } from "@/lib/llm";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const provider: LLMProvider = body.provider === "openai" ? "openai" : body.provider === "gemini" ? "gemini" : body.provider === "openrouter" ? "openrouter" : "groq";

  const prompt = `Generate a 2-3 paragraph fictional corporate hospitality client profile in the same style as these examples: a named professional with age, role, city, lifestyle, cultural tastes, and travel preferences. Include specific brands, music, food, design, and a destination city. Return only the profile text, no JSON, no markdown.`;
  try {
    const text = await callLLM(prompt, provider, 300, { temperature: 0.8 });
    return NextResponse.json({ text });
  } catch (e: unknown) {
    if (provider !== "groq") {
      try {
        const fallbackText = await callLLM(prompt, "groq", 300, { temperature: 0.8 });
        return NextResponse.json({ text: fallbackText });
      } catch {}
    }
    return NextResponse.json({ error: (e as { message?: string })?.message || "LLM failed" }, { status: 502 });
  }
}
