/**
 * Dual-provider client: try Groq first, fall back to OpenRouter.
 * Keys stay on the server (Vercel secrets / .env.local).
 */

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_OPENROUTER_MODEL = "openai/gpt-4o-mini";

const TIMEOUT_MS = 25_000; // if Groq is slow, switch to OpenRouter

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function callGroq(messages: ChatMessage[]): Promise<{ content: string; provider: string }> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set");

  const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;

  const res = await fetchWithTimeout(
    GROQ_URL,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    },
    TIMEOUT_MS
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Groq ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned empty content");
  return { content, provider: "groq" };
}

async function callOpenRouter(
  messages: ChatMessage[]
): Promise<{ content: string; provider: string }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");

  const model = process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.SITE_URL || "https://kilo-ai.vercel.app",
      "X-Title": "Kilo AI",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned empty content");
  return { content, provider: "openrouter" };
}

/**
 * Primary: Groq. If it fails or times out → OpenRouter.
 * If only one key is set, use that one.
 */
export async function chatWithFallback(
  messages: ChatMessage[]
): Promise<{ content: string; provider: string }> {
  const hasGroq = !!process.env.GROQ_API_KEY;
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;

  if (!hasGroq && !hasOpenRouter) {
    throw new Error(
      "No API keys configured. Set GROQ_API_KEY and/or OPENROUTER_API_KEY in Vercel secrets."
    );
  }

  // Prefer Groq when available
  if (hasGroq) {
    try {
      return await callGroq(messages);
    } catch (e) {
      console.warn("[Kilo] Groq failed or timed out, falling back to OpenRouter:", e);
      if (!hasOpenRouter) throw e;
    }
  }

  return await callOpenRouter(messages);
}
