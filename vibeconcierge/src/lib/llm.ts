import { GoogleGenAI } from "@google/genai";

export type LLMProvider = "openai" | "groq" | "openrouter" | "gemini";

export let lastUsedModel = "unknown";
export let lastLlmError: string | null = null;

async function callOpenAI(
  prompt: string,
  maxTokens: number,
  opts: { temperature?: number; response_format?: { type: string } } = {}
): Promise<string> {
  const key = process.env.OPENAI_API_KEY || "";
  const primaryModel = process.env.OPENAI_MODEL || "gpt-5.2";
  const fallbackModels = primaryModel === "gpt-5.2" ? ["gpt-4o", "gpt-4o-mini"] : primaryModel === "gpt-4o" ? ["gpt-4o-mini"] : [];
  const candidateModels = [primaryModel, ...fallbackModels];

  // OpenAI requires the word "json" in prompt when response_format is json_object
  const effectivePrompt = opts.response_format?.type === "json_object" && !/json/i.test(prompt)
    ? `${prompt}\n\nReturn strictly valid JSON.`
    : prompt;

  for (const model of candidateModels) {
    const isReasoningOrGpt5 = model.startsWith("gpt-5") || model.startsWith("o1") || model.startsWith("o3");
    const tokenLimit = isReasoningOrGpt5 ? (maxTokens ? Math.min(maxTokens, 600) : 500) : (maxTokens ? Math.min(maxTokens, 1000) : 600);
    const body: Record<string, unknown> = {
      model,
      messages: [{ role: "user", content: effectivePrompt }],
      temperature: opts.temperature ?? 0.2,
    };
    if (isReasoningOrGpt5) {
      body.max_completion_tokens = tokenLimit;
    } else {
      body.max_tokens = tokenLimit;
    }
    if (opts.response_format) body.response_format = opts.response_format;

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const content = (data.choices?.[0]?.message?.content || "").trim();
        if (content) {
          lastUsedModel = model;
          lastLlmError = null;
          return content;
        }
      } else {
        const errText = await res.text();
        console.error(`[OPENAI ERROR] Model ${model} returned ${res.status}: ${errText}`);
        lastLlmError = `Model ${model} returned HTTP ${res.status}: ${errText}`;
        // If 400 was caused by response_format, retry this model once without response_format
        if (res.status === 400 && body.response_format) {
          const bodyNoFormat = { ...body, response_format: undefined };
          const resRetry = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
            body: JSON.stringify(bodyNoFormat),
          });
          if (resRetry.ok) {
            const dataRetry = (await resRetry.json()) as { choices?: { message?: { content?: string } }[] };
            const contentRetry = (dataRetry.choices?.[0]?.message?.content || "").trim();
            if (contentRetry) {
              lastUsedModel = model;
              lastLlmError = null;
              return contentRetry;
            }
          } else {
            const retryErrText = await resRetry.text();
            console.error(`[OPENAI RETRY ERROR] Model ${model} returned ${resRetry.status}: ${retryErrText}`);
            lastLlmError = `Model ${model} retry returned HTTP ${resRetry.status}: ${retryErrText}`;
          }
        }
      }
    } catch (e: unknown) {
      lastLlmError = (e as Error).message;
    }
  }

  throw new Error("OpenAI requests failed across all configured models");
}

async function callOpenRouter(
  prompt: string,
  maxTokens: number,
  opts: { temperature?: number; response_format?: { type: string } } = {}
): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY || "";
  const model = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3.5-lightning:free";
  const body: Record<string, unknown> = {
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: opts.temperature ?? 0.3,
    max_tokens: Math.max(maxTokens, 1200),
  };
  if (opts.response_format) body.response_format = opts.response_format;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "http://localhost:8082",
      "X-Title": "VibeTour",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${errText}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = (data.choices?.[0]?.message?.content || "").trim();
  if (content) {
    lastUsedModel = model;
    lastLlmError = null;
  }
  return content;
}

/**
 * Call Gemini via Google Vertex AI with Application Default Credentials (ADC).
 * Strictly requires NO API keys per organization security policy.
 */
async function callGemini(
  prompt: string,
  maxTokens: number,
  opts: { temperature?: number; response_format?: { type: string } } = {}
): Promise<string> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.VERTEX_PROJECT_ID;
  const location = process.env.GOOGLE_CLOUD_LOCATION || process.env.VERTEX_LOCATION || "us-central1";
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  // Ensure vertexai flag is recognized by @google/genai runtime
  process.env.GOOGLE_GENAI_USE_VERTEXAI = "true";

  // GoogleGenAI with vertexai: true authenticates strictly via Application Default Credentials (ADC) without any API key
  const ai = new GoogleGenAI({
    vertexai: true,
    project: project || undefined,
    location: location || "us-central1",
  } as { vertexai?: boolean; project?: string; location?: string });

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: opts.temperature ?? 0.2,
      maxOutputTokens: Math.max(maxTokens, 2500),
      responseMimeType: opts.response_format?.type === "json_object" ? "application/json" : undefined,
    },
  });

  const text = (response.text || "").trim();
  if (!text) throw new Error("Empty response from Gemini Vertex AI ADC");
  lastUsedModel = model;
  lastLlmError = null;
  return text;
}

export async function callLLM(
  prompt: string,
  provider: LLMProvider = "openai",
  maxTokens = 400,
  opts: { temperature?: number; seed?: number; response_format?: { type: string } } = {}
): Promise<string> {
  if (provider === "openai") {
    // Pure OpenAI execution - No fallback to Groq
    return await callOpenAI(prompt, maxTokens, opts);
  }

  if (provider === "gemini") {
    return await callGemini(prompt, maxTokens, opts);
  }

  if (provider === "openrouter") {
    return callOpenRouter(prompt, maxTokens, opts);
  }

  // Verified model on Groq
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return callOpenRouter(prompt, maxTokens, opts);
  }

  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const effectiveMaxTokens = Math.max(maxTokens, 2500);
  const body: Record<string, unknown> = {
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: opts.temperature ?? 0.2,
    max_tokens: effectiveMaxTokens,
  };
  if (typeof opts.seed === "number") body.seed = opts.seed;
  if (opts.response_format) body.response_format = opts.response_format;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      // Try fast alternative model on Groq before giving up
      const res2 = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ ...body, model: "qwen/qwen3.8-27b" }),
      });
      if (res2.ok) {
        const data2 = (await res2.json()) as { choices?: { message?: { content?: string; reasoning?: string } }[] };
        const msg2 = data2.choices?.[0]?.message;
        const content2 = (msg2?.content?.trim() || msg2?.reasoning?.trim() || "").trim();
        if (content2) {
          lastUsedModel = "qwen/qwen3.8-27b";
          lastLlmError = null;
          return content2;
        }
      }
      const errText = await res.text();
      throw new Error(`Groq ${res.status}: ${errText}`);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string; reasoning?: string } }[] };
    const msg = data.choices?.[0]?.message;
    const content = (msg?.content?.trim() || msg?.reasoning?.trim() || "").trim();
    if (!content) throw new Error("Empty response from Groq");
    lastUsedModel = model;
    lastLlmError = null;
    return content;
  } catch (err) {
    console.warn(`[LLM] Groq request failed (${(err as Error)?.message}), falling back to OpenRouter...`);
    return callOpenRouter(prompt, maxTokens, opts);
  }
}
