// /src/app/api/ai/chat/route.ts
import { NextResponse } from "next/server";
import { aiChat, type AIMessage } from "@/lib/ai";
import { buildBusinessSystemPrompt, supportFaq, type SupportFaqItem } from "@/lib/business-context";

type IncomingBody = {
  messages?: AIMessage[];
};

function sanitizeMessages(messages: AIMessage[]) {
  return messages
    .filter(
      (message): message is AIMessage =>
        Boolean(message) &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string"
    )
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 1200),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-12);
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 18);
}

function lexicalScore(queryTokens: string[], item: SupportFaqItem) {
  if (queryTokens.length === 0) return 0;
  const haystack = `${item.q} ${item.a} ${item.tags.join(" ")}`.toLowerCase();
  let score = 0;
  for (const token of queryTokens) {
    if (item.tags.some((tag) => tag.toLowerCase().includes(token))) {
      score += 2;
      continue;
    }
    if (haystack.includes(token)) {
      score += 1;
    }
  }
  return score;
}

function relevantKnowledge(query: string, limit = 5) {
  const tokens = tokenize(query);
  return supportFaq()
    .map((item) => ({ item, score: lexicalScore(tokens, item) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as IncomingBody;
  if (!body.messages || !Array.isArray(body.messages)) {
    return NextResponse.json({ ok: false, error: "messages[] required" }, { status: 400 });
  }

  const clean = sanitizeMessages(body.messages);
  if (clean.length === 0) {
    return NextResponse.json({ ok: false, error: "No usable messages." }, { status: 400 });
  }

  const latestUserMessage =
    [...clean].reverse().find((message) => message.role === "user")?.content ?? "";
  const knowledge = relevantKnowledge(latestUserMessage);

  const systemContext: AIMessage = {
    role: "system",
    content: buildBusinessSystemPrompt(knowledge),
  };

  const reply = (await aiChat([systemContext, ...clean])).trim();
  return NextResponse.json({
    ok: true,
    reply: reply || "I can help with orders, tracking, WhatsApp checkout, vendor onboarding, and rider onboarding.",
  });
}
