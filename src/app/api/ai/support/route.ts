import { NextResponse } from "next/server";
import { cosine, embed } from "@/lib/embeddings";
import { supportFaq, type SupportFaqItem } from "@/lib/business-context";
import { checkRateLimit } from "@/lib/rate-limit";

type SupportSource = {
  q: string;
  a: string;
  score: number;
  snippet: string;
};

function tokenize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean).slice(0, 16);
}

function lexicalScore(queryTokens: string[], item: SupportFaqItem) {
  if (queryTokens.length === 0) return 0;
  const haystack = `${item.q} ${item.a} ${item.tags.join(" ")}`.toLowerCase();
  let matches = 0;
  for (const token of queryTokens) {
    if (item.tags.some((tag) => tag.toLowerCase().includes(token))) {
      matches += 2;
      continue;
    }
    if (haystack.includes(token)) {
      matches += 1;
    }
  }
  return matches / (queryTokens.length * 2);
}

function makeSnippet(text: string, tokens: string[], radius = 68) {
  if (tokens.length === 0) return text.slice(0, 140);
  const lower = text.toLowerCase();
  let index = 0;
  for (const token of tokens) {
    const found = lower.indexOf(token);
    if (found >= 0) {
      index = found;
      break;
    }
  }
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end).trim();
}

async function rankSupport(query: string, faq: SupportFaqItem[]): Promise<SupportSource[]> {
  const tokens = tokenize(query);
  const docs = faq.map((item) => `${item.q}\n${item.a}\n${item.tags.join(" ")}`);
  const [queryVector, ...docVectors] = await embed([query, ...docs]);

  const scored = faq.map((item, index) => {
    const semantic = cosine(queryVector, docVectors[index]);
    const lexical = lexicalScore(tokens, item);
    const score = semantic * 0.65 + lexical * 0.35;
    return {
      q: item.q,
      a: item.a,
      score: Number(score.toFixed(4)),
      snippet: makeSnippet(item.a, tokens),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
}

function composeAnswer(top: SupportSource[]) {
  const strong = top.filter((item) => item.score > 0.08);
  if (strong.length === 0) return null;

  const combined: string[] = [];
  for (const item of strong.slice(0, 2)) {
    if (!combined.includes(item.a)) {
      combined.push(item.a);
    }
  }
  return combined.join(" ");
}

export async function POST(req: Request) {
  const limited = await checkRateLimit({
    key: "ai-support",
    limit: 15,
    windowMs: 60_000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many support requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const { q } = (await req.json().catch(() => ({ q: "" }))) as { q?: string };
  const query = String(q || "").trim().slice(0, 500);
  if (!query) {
    return NextResponse.json({
      ok: true,
      answer:
        "Ask me about coverage, ordering, Ozow checkout, WhatsApp orders, tracking, refunds, vendor onboarding, rider onboarding, or the vendor dashboard.",
      sources: [],
    });
  }

  const faq = supportFaq();
  const top = await rankSupport(query, faq);

  const defaultAnswer =
    "I can help with ordering, Ozow checkout, WhatsApp orders, tracking, refunds, vendor onboarding, rider onboarding, and vendor dashboard questions. Use WhatsApp support for urgent help.";
  const composed = composeAnswer(top);

  return NextResponse.json({
    ok: true,
    answer: composed || defaultAnswer,
    sources: top,
  });
}
