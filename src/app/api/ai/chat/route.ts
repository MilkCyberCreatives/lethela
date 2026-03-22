// /src/app/api/ai/chat/route.ts
import { NextResponse } from "next/server";
import { aiChat, aiRecommend, type AIMessage } from "@/lib/ai";
import { buildBusinessSystemPrompt, supportFaq, type SupportFaqItem } from "@/lib/business-context";
import { getDemoOrderSummary, isDemoOrderRef } from "@/lib/demo-order";
import { buildTrackingSnapshot, getTrackingEta } from "@/lib/order-tracking";
import { checkRateLimit } from "@/lib/rate-limit";
import { searchCatalog } from "@/lib/search";
import { runBoundedDbQuery } from "@/lib/query-timeout";
import { getOrderWhatsAppPhone } from "@/lib/whatsapp-order";

type IncomingBody = {
  messages?: AIMessage[];
};

type AssistantMode = "tracking" | "recommendations" | "support" | "general";

type SearchResult = {
  id: string;
  kind: "vendor" | "product";
  title: string;
  subtitle?: string | null;
  image?: string | null;
  slug?: string | null;
  vendor?: string | null;
  priceCents?: number | null;
};

type SupportSource = {
  q: string;
  snippet?: string;
  score: number;
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

function makeSnippet(text: string, tokens: string[], radius = 72) {
  if (tokens.length === 0) return text.slice(0, 140);
  const lower = text.toLowerCase();
  const firstMatch = tokens.map((token) => lower.indexOf(token)).find((index) => index >= 0) ?? 0;
  const start = Math.max(0, firstMatch - radius);
  const end = Math.min(text.length, firstMatch + radius);
  return text.slice(start, end).trim();
}

function matchOrderId(text: string) {
  const match = text.match(/\bLET(?:[-\s]?[A-Z0-9]{2,}){1,4}\b/i);
  return match?.[0]?.replace(/\s/g, "").toUpperCase() ?? null;
}

function buildFollowUps(mode: AssistantMode, latestUserMessage: string, hasResults = false) {
  if (mode === "tracking") {
    return ["Open live tracking", "How long does delivery take?", "Contact support on WhatsApp"];
  }
  if (mode === "recommendations") {
    return hasResults
      ? ["Show vegetarian options", "What is popular tonight?", "Track my order LET-12345"]
      : ["Try burgers near me", "Show grocery options", "Order via WhatsApp"];
  }
  if (mode === "support") {
    return ["How do vendors join?", "How do riders apply?", "Order via WhatsApp"];
  }
  if (/vendor|dashboard|store|menu/i.test(latestUserMessage)) {
    return ["How do vendors join?", "What can vendors do in the dashboard?", "Need WhatsApp support"];
  }
  return ["Popular tonight", "Track order LET-12345", "Order via WhatsApp"];
}

async function getTrackedOrderSummary(id: string) {
  if (isDemoOrderRef(id)) {
    const demo = getDemoOrderSummary();
    return {
      id: demo.id,
      status: demo.status,
      eta: demo.eta,
      vendor: demo.vendor,
      progressPct: 78,
      href: `/orders/${encodeURIComponent(demo.id)}`,
    };
  }

  const order = await runBoundedDbQuery((db) =>
    db.order.findFirst({
      where: {
        OR: [{ publicId: id }, { ozowReference: id }],
      },
      include: {
        vendor: {
          select: { name: true, latitude: true, longitude: true },
        },
      },
    })
  ).catch(() => null);

  if (!order) return null;

  const tracking = buildTrackingSnapshot({
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    riderLocatedAt: order.riderLocatedAt,
    vendor:
      order.vendor?.latitude != null && order.vendor?.longitude != null
        ? { lat: order.vendor.latitude, lng: order.vendor.longitude }
        : null,
    destination:
      order.customerLat != null && order.customerLng != null
        ? { lat: order.customerLat, lng: order.customerLng }
        : null,
    rider:
      order.riderLat != null && order.riderLng != null ? { lat: order.riderLat, lng: order.riderLng } : null,
  });

  return {
    id: order.ozowReference || order.publicId,
    status: order.status,
    eta: tracking.etaLabel || getTrackingEta(order.status),
    vendor: order.vendor?.name ?? "Unknown vendor",
    progressPct: tracking.progressPct,
    href: `/orders/${encodeURIComponent(order.ozowReference || order.publicId)}`,
  };
}

function rankSupportSources(query: string) {
  const tokens = tokenize(query);
  return supportFaq()
    .map((item) => ({
      q: item.q,
      answer: item.a,
      score: lexicalScore(tokens, item),
      snippet: makeSnippet(item.a, tokens),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
}

function supportReplyFromSources(sources: Array<{ answer: string; score: number }>) {
  const strong = sources.filter((item) => item.score >= 2).slice(0, 2);
  const combined = strong
    .map((item) => item.answer)
    .filter((answer, index, all) => all.indexOf(answer) === index);
  return combined.join(" ");
}

function normalizeSearchResults(rows: Awaited<ReturnType<typeof searchCatalog>>): SearchResult[] {
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    subtitle: row.subtitle,
    image: row.image,
    slug: row.slug,
    vendor: row.vendorName,
    priceCents: row.priceCents,
  }));
}

export async function POST(req: Request) {
  const whatsappSupportHref = `https://wa.me/${getOrderWhatsAppPhone()}`;
  const limited = await checkRateLimit({
    key: "ai-chat",
    limit: 20,
    windowMs: 60_000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many AI chat requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const body = (await req.json().catch(() => ({}))) as IncomingBody;
  if (!body.messages || !Array.isArray(body.messages)) {
    return NextResponse.json({ ok: false, error: "messages[] required" }, { status: 400 });
  }

  const clean = sanitizeMessages(body.messages);
  if (clean.length === 0) {
    return NextResponse.json({ ok: false, error: "No usable messages." }, { status: 400 });
  }

  const latestUserMessage = [...clean].reverse().find((message) => message.role === "user")?.content ?? "";
  const lower = latestUserMessage.toLowerCase();
  const knowledge = relevantKnowledge(latestUserMessage);

  const orderId = matchOrderId(latestUserMessage);
  const wantsTracking = /where'?s my order|track|status|delivery progress/i.test(lower);
  if (orderId || wantsTracking) {
    if (!orderId) {
      return NextResponse.json({
        ok: true,
        mode: "tracking" as AssistantMode,
        reply: "Share your order reference in the format LET-12345 and I will pull up the latest tracking status.",
        followUps: buildFollowUps("tracking", latestUserMessage),
      });
    }

    const order = await getTrackedOrderSummary(orderId);
    if (!order) {
      return NextResponse.json({
        ok: true,
        mode: "tracking" as AssistantMode,
        reply: `I could not find ${orderId}. Double-check the reference and try again, or use WhatsApp support if you need urgent help.`,
        followUps: ["Try another order reference", "Open Track Order page", "Contact support on WhatsApp"],
      });
    }

    return NextResponse.json({
      ok: true,
      mode: "tracking" as AssistantMode,
      reply: `Order ${order.id} is currently ${String(order.status).replaceAll("_", " ").toLowerCase()}. Estimated arrival is ${order.eta} from ${order.vendor}.`,
      order,
      followUps: buildFollowUps("tracking", latestUserMessage),
      cta: { label: "Open live tracking", href: order.href },
    });
  }

  const recommendationIntent =
    /recommend|suggest|hungry|what should i eat|popular|kota|chips|burger|pizza|grocer|groceries|vegan|halaal|chicken|dinner|lunch|breakfast/i.test(lower);
  if (recommendationIntent) {
    const broadPrompt = /popular tonight|popular|what should i eat|hungry|dinner|lunch|breakfast/.test(lower);
    const recommendationRows: SearchResult[] = broadPrompt
      ? ((await aiRecommend(null)).results || []).slice(0, 6).map((item, index) => ({
          id: `recommend-${index}`,
          kind: "vendor",
          title: item.title,
          subtitle: item.subtitle,
          image: item.image,
          slug: item.slug,
          vendor: item.vendor,
          priceCents: item.priceCents,
        }))
      : normalizeSearchResults(await searchCatalog(latestUserMessage, { limit: 6 }));
    const results = recommendationRows.slice(0, 5);
    const reply =
      results.length > 0
        ? "Here are strong options right now. I picked a shortlist you can open immediately."
        : "I could not find a strong match right now. Try another meal, vendor, or area.";

    return NextResponse.json({
      ok: true,
      mode: "recommendations" as AssistantMode,
      reply,
      results,
      followUps: buildFollowUps("recommendations", latestUserMessage, results.length > 0),
      cta: results[0]?.slug ? { label: "Open top pick", href: `/vendors/${results[0].slug}` } : undefined,
    });
  }

  const supportIntent =
    /refund|refunds|cancel|cancellation|coverage|available|alcohol|beer|wine|cider|contact|help|support|delivery|time|eta|whatsapp|cash|offline|vendor|rider|dashboard|menu|payment|ozow|apply/i.test(
      lower
    );
  if (supportIntent) {
    const ranked = rankSupportSources(latestUserMessage);
    const answer = supportReplyFromSources(ranked) || "I can help with ordering, Ozow checkout, WhatsApp orders, tracking, vendor onboarding, rider onboarding, and dashboard questions.";

    return NextResponse.json({
      ok: true,
      mode: "support" as AssistantMode,
      reply: answer,
      sources: ranked.map((item) => ({
        q: item.q,
        snippet: item.snippet,
        score: Number((item.score / 6).toFixed(2)),
      })) satisfies SupportSource[],
      followUps: buildFollowUps("support", latestUserMessage),
      cta: /refund|support|cancel|payment/i.test(lower)
        ? { label: "Open WhatsApp support", href: whatsappSupportHref, external: true }
        : undefined,
    });
  }

  const systemContext: AIMessage = {
    role: "system",
    content: buildBusinessSystemPrompt(knowledge),
  };

  const reply = (await aiChat([systemContext, ...clean])).trim();
  return NextResponse.json({
    ok: true,
    mode: "general" as AssistantMode,
    reply: reply || "I can help with orders, tracking, WhatsApp checkout, vendor onboarding, and rider onboarding.",
    followUps: buildFollowUps("general", latestUserMessage),
  });
}
