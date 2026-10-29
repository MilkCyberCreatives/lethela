/**
 * AI for admins only. Nothing here is used by public pages: it is called from /admin/ai, the
 * admin AI API and the morning brief sent to admins.
 *
 * Provider: ANTHROPIC_API_KEY (Claude) if set, otherwise OPENAI_API_KEY, otherwise none. With no
 * key every caller falls back to plain, rule-based text, so the admin tools keep working.
 */

export type AdminAiProvider = "anthropic" | "openai" | "none";

export type AdminAiResult = { text: string; provider: Exclude<AdminAiProvider, "none"> };

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5-5";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 25_000;

/** The house rules every admin AI answer must follow. */
export const LETHELA_AI_RULES = [
  "You help the owner and admins of Lethela (Siyashesha), a South African township marketplace and delivery platform at lethela.co.za.",
  "Lethela is open in Klipfontein View, Midrand. Never say it delivers anywhere else, and never say it is launching soon.",
  "Lethela runs delivery itself with its own riders. Customers order and pay online only (Ozow instant EFT); there is no cash on delivery and no ordering on WhatsApp. WhatsApp is for support only.",
  "Never mention prices, fees, commission or the delivery fee structure in anything meant for the public.",
  "Never invent business facts, numbers, names or promises. If you do not know, say so or write UNCONFIRMED.",
  "Write in plain South African English, short sentences, no jargon, no emojis unless asked.",
].join("\n");

export function adminAiProvider(): AdminAiProvider {
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "anthropic";
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  return "none";
}

export function adminAiEnabled() {
  return process.env.ADMIN_AI_ENABLED?.trim().toLowerCase() !== "false";
}

async function postJson(url: string, headers: Record<string, string>, body: unknown) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`AI provider answered ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function anthropicComplete(system: string, prompt: string, maxTokens: number) {
  const data = await postJson(
    "https://api.anthropic.com/v1/messages",
    {
      "x-api-key": process.env.ANTHROPIC_API_KEY!.trim(),
      "anthropic-version": "2023-06-01",
    },
    {
      model: process.env.ADMIN_AI_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    },
  );
  const blocks = Array.isArray(data?.content) ? data.content : [];
  return blocks
    .filter((block: { type?: string }) => block?.type === "text")
    .map((block: { text?: string }) => block.text || "")
    .join("")
    .trim();
}

async function openAiComplete(system: string, prompt: string, maxTokens: number) {
  const data = await postJson(
    "https://api.openai.com/v1/chat/completions",
    { authorization: `Bearer ${process.env.OPENAI_API_KEY!.trim()}` },
    {
      model: process.env.ADMIN_AI_OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
      max_tokens: maxTokens,
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    },
  );
  return String(data?.choices?.[0]?.message?.content || "").trim();
}

/**
 * Asks the configured AI. Returns null when no key is set, AI is switched off or the provider
 * fails, so callers show their rule-based fallback instead of an error.
 */
export async function adminAiComplete(
  task: string,
  prompt: string,
  { maxTokens = 700 }: { maxTokens?: number } = {},
): Promise<AdminAiResult | null> {
  const provider = adminAiProvider();
  if (provider === "none" || !adminAiEnabled()) return null;
  const system = `${LETHELA_AI_RULES}\n\n${task}`;
  try {
    const text =
      provider === "anthropic"
        ? await anthropicComplete(system, prompt, maxTokens)
        : await openAiComplete(system, prompt, maxTokens);
    return text ? { text, provider } : null;
  } catch (error) {
    console.error("Admin AI request failed.", error instanceof Error ? error.message : error);
    return null;
  }
}
