import { getOrderWhatsAppPhone } from "@/lib/whatsapp-order";
/**
 * Central AI utilities with graceful fallbacks:
 * - If OPENAI_API_KEY is set, we call OpenAI (chat + moderation).
 * - Otherwise we return deterministic local results.
 */
export type AIMessage = { role: "user" | "assistant" | "system"; content: string };
import { supportFaq } from "@/lib/business-context";
import type { VisitorProfile } from "@/lib/visitor-profile";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHATSAPP_SUPPORT = `https://wa.me/${getOrderWhatsAppPhone()}`;

/* ---------------- Chat ---------------- */

async function openAIChat(messages: AIMessage[]) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.6,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI chat error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function mockChat(messages: AIMessage[]) {
  const last = messages.filter((msg) => msg.role === "user").pop()?.content ?? "";
  if (!last.trim()) {
    return "Tell me what you need help with: ordering, tracking, payments, vendor onboarding, rider onboarding, dashboard help, or support.";
  }

  const tokens = last
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 18);
  const rankedMatches = supportFaq()
    .map((item) => {
      const haystack = `${item.q} ${item.a} ${item.tags.join(" ")}`.toLowerCase();
      let score = 0;
      for (const token of tokens) {
        if (item.tags.some((tag) => tag.toLowerCase().includes(token))) {
          score += 2;
          continue;
        }
        if (haystack.includes(token)) {
          score += 1;
        }
      }
      return { item, score };
    })
    .sort((left, right) => right.score - left.score);
  if (rankedMatches[0] && rankedMatches[0].score >= 2) {
    const topAnswers = rankedMatches
      .filter((entry) => entry.score >= 2)
      .slice(0, 2)
      .map((entry) => entry.item.a)
      .filter((answer, index, all) => all.indexOf(answer) === index);
    return topAnswers.join(" ");
  }

  if (/where'?s my order|track|status|order\s?#?\d+/i.test(last)) {
    return "I can help track your order. Share your order reference (for example LET-12345).";
  }
  if (/whatsapp|cash|offline payment|no card|manual order|pay later/i.test(last)) {
    return `Yes, you can place an order via WhatsApp without paying online. Use: ${WHATSAPP_SUPPORT}`;
  }
  if (/vendor|become a vendor|sell/i.test(last)) {
    return "You can apply from the Become a Vendor page. Admin approval is required before your store goes live.";
  }
  if (/rider|driver|deliver/i.test(last)) {
    return "You can apply from the Rider page. Ops reviews applications before onboarding.";
  }
  if (/kota|chips|burger|grocer|groceries/i.test(last)) {
    return "Popular categories include Kota, Chips, Burger, Alcohol, and Groceries. Tell me your area and I will suggest options.";
  }
  if (/refund|refunds|cancel|cancellation/i.test(last)) {
    return `If your order is incorrect or delayed, message support on WhatsApp and we will resolve it quickly: ${WHATSAPP_SUPPORT}`;
  }
  if (/alcohol|beer|wine|cider/i.test(last)) {
    return "Alcohol orders are available for customers aged 18+ and subject to local regulations.";
  }
  if (/vegan|halaal|vegetarian/i.test(last)) {
    return "We can suggest veg and halaal-friendly options. Share your area and preferred meal type.";
  }
  if (/support|contact|help/i.test(last)) {
    return `For direct support, message Lethela on WhatsApp: ${WHATSAPP_SUPPORT}`;
  }
  return "Tell me what you want to do: place an order, order via WhatsApp, track an order, ask about payments, become a vendor, become a rider, or get support.";
}

export async function aiChat(messages: AIMessage[]) {
  if (OPENAI_API_KEY) {
    try {
      return await openAIChat(messages);
    } catch {
      // fallback below
    }
  }
  return mockChat(messages);
}

/* ---------------- AI Search ---------------- */

export type AIResult = {
  ok: boolean;
  results: Array<{
    title: string;
    subtitle?: string;
    image?: string;
    vendor?: string;
    slug?: string;
    priceCents?: number;
    isAlcohol?: boolean;
  }>;
};

export async function aiSearch(q: string): Promise<AIResult> {
  const lower = (q || "").toLowerCase();
  const all: AIResult["results"] = [
    {
      title: "Hello Tomato Burger",
      subtitle: "Hello Tomato - 25-30 min",
      image: "/vendors/burgers.jpg",
      vendor: "Hello Tomato",
      slug: "hello-tomato",
      priceCents: 8999,
    },
    {
      title: "Bento Rainbow Sushi",
      subtitle: "Bento - 20-25 min",
      image: "/vendors/sushi.jpg",
      vendor: "Bento",
      slug: "bento",
      priceCents: 11999,
    },
    {
      title: "Hello Tomato Family Feast",
      subtitle: "Hello Tomato - 25-30 min",
      image: "/vendors/grill.jpg",
      vendor: "Hello Tomato",
      slug: "hello-tomato",
      priceCents: 15999,
    },
    {
      title: "Bento Salmon Deluxe",
      subtitle: "Bento - 20-25 min",
      image: "/vendors/vegan.jpg",
      vendor: "Bento",
      slug: "bento",
      priceCents: 12999,
    },
    {
      title: "Spice Route Vegan Curry",
      subtitle: "Spice Route - 30-35 min",
      image: "/vendors/curry.jpg",
      vendor: "Spice Route",
      slug: "spice-route",
      priceCents: 9999,
    },
  ];
  const filtered = all.filter(
    (item) =>
      !lower ||
      item.title.toLowerCase().includes(lower) ||
      (item.vendor ?? "").toLowerCase().includes(lower) ||
      (item.subtitle ?? "").toLowerCase().includes(lower)
  );
  return { ok: true, results: filtered.length ? filtered : all.slice(0, 3) };
}

/* ---------------- AI Recommendations ---------------- */

async function openAIRecommend(
  base: AIResult["results"],
  suburb: string | null,
  profile: VisitorProfile
): Promise<AIResult["results"] | null> {
  if (!OPENAI_API_KEY || profile.eventCount === 0) return null;

  const prompt = [
    "Rank these delivery recommendations for a returning visitor.",
    `Area: ${suburb || profile.preferredArea || "unknown"}`,
    `Favorite vendors: ${profile.favoriteVendorSlugs.join(", ") || "none"}`,
    `Top keywords: ${Object.keys(profile.keywordScores).join(", ") || "none"}`,
    `Recent queries: ${profile.recentQueries.join(" | ") || "none"}`,
    "Return strict JSON as an array of slugs in the best order.",
    JSON.stringify(base.map((item) => ({ slug: item.slug, title: item.title, subtitle: item.subtitle }))),
  ].join("\n");

  try {
    const response = await openAIChat([
      { role: "system", content: "You rank food delivery recommendations. Return JSON only." },
      { role: "user", content: prompt },
    ]);
    const ordered = JSON.parse(response) as string[];
    if (!Array.isArray(ordered) || ordered.length === 0) return null;

    const rankBySlug = new Map<string, number>();
    ordered.forEach((slug, index) => rankBySlug.set(String(slug), index));

    return [...base].sort((left, right) => {
      const leftRank = rankBySlug.get(String(left.slug)) ?? 999;
      const rightRank = rankBySlug.get(String(right.slug)) ?? 999;
      return leftRank - rightRank;
    });
  } catch {
    return null;
  }
}

function heuristicRecommend(base: AIResult["results"], profile: VisitorProfile | null) {
  if (!profile || profile.eventCount === 0) return base;

  const keywordEntries = Object.entries(profile.keywordScores);
  return [...base].sort((left, right) => {
    const score = (item: AIResult["results"][number]) => {
      let value = 0;
      if (item.slug && profile.favoriteVendorSlugs.includes(item.slug)) {
        value += 12 - profile.favoriteVendorSlugs.indexOf(item.slug);
      }
      const haystack = `${item.title} ${item.subtitle || ""} ${item.vendor || ""}`.toLowerCase();
      for (const [keyword, weight] of keywordEntries) {
        if (haystack.includes(keyword)) value += weight;
      }
      return value;
    };

    return score(right) - score(left);
  });
}

export async function aiRecommend(suburb: string | null, profile: VisitorProfile | null = null): Promise<AIResult> {
  const nearMidrand = suburb?.toLowerCase().includes("midrand");
  const base: AIResult["results"] = [
    {
      title: "Hello Tomato",
      subtitle: "Burgers - 25-30 min",
      image: "/vendors/burgers.jpg",
      vendor: "Hello Tomato",
      slug: "hello-tomato",
    },
    {
      title: "Bento",
      subtitle: "Sushi - 20-25 min",
      image: "/vendors/sushi.jpg",
      vendor: "Bento",
      slug: "bento",
    },
    {
      title: "Spice Route",
      subtitle: "Curry - 30-35 min",
      image: "/vendors/curry.jpg",
      vendor: "Spice Route",
      slug: "spice-route",
    },
    {
      title: "Hello Tomato Family Feast",
      subtitle: "Burgers - 25-30 min",
      image: "/vendors/grill.jpg",
      vendor: "Hello Tomato",
      slug: "hello-tomato",
    },
    {
      title: "Bento Chef's Box",
      subtitle: "Sushi - 20-25 min",
      image: "/vendors/vegan.jpg",
      vendor: "Bento",
      slug: "bento",
    },
  ];
  const prioritized = nearMidrand ? [base[1], base[0], base[2], base[3], base[4]] : base;
  const aiRanked = profile ? await openAIRecommend(prioritized, suburb, profile) : null;
  return { ok: true, results: aiRanked || heuristicRecommend(prioritized, profile) };
}

/* ---------------- Vendor reranking ---------------- */

export type VendorLite = {
  id: string;
  name: string;
  slug: string;
  rating: number;
  cuisines: string[];
  distanceKm?: number;
  baseEtaMin?: number;
};

export type RerankInput = {
  vendors: VendorLite[];
  clicks: Record<string, number>;
  hour?: number;
  suburb?: string | null;
};

export type RerankOutput = {
  ok: boolean;
  vendors: Array<VendorLite & { predictedEtaMin: number }>;
};

function heuristicEta(vendor: VendorLite, hour = 18): number {
  const distance = vendor.distanceKm ?? 3;
  const prep = vendor.baseEtaMin ?? 15;
  const rush = hour >= 18 && hour <= 20 ? 1.25 : hour >= 12 && hour <= 13 ? 1.15 : 1;
  const ratingBonus = vendor.rating >= 4.7 ? -2 : vendor.rating <= 3.8 ? 3 : 0;
  const travel = Math.round(distance * 4.5);
  return Math.max(12, Math.round((prep + travel + ratingBonus) * rush));
}

export async function aiRerankVendors(input: RerankInput): Promise<RerankOutput> {
  const hour = input.hour ?? new Date().getHours();
  const scored = input.vendors.map((vendor) => {
    const clicks = input.clicks[vendor.id] ?? 0;
    const affinity = clicks * 3;
    const rating = vendor.rating * 2;
    const proximity = 10 / Math.max(1, vendor.distanceKm ?? 3);
    const score = affinity + rating + proximity;
    const predictedEtaMin = heuristicEta(vendor, hour);
    return { ...vendor, score, predictedEtaMin };
  });
  scored.sort((a, b) => b.score - a.score);
  return {
    ok: true,
    vendors: scored.map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
      slug: vendor.slug,
      rating: vendor.rating,
      cuisines: vendor.cuisines,
      distanceKm: vendor.distanceKm,
      baseEtaMin: vendor.baseEtaMin,
      predictedEtaMin: vendor.predictedEtaMin,
    })),
  };
}

/* ---------------- Moderation ---------------- */

export type ModerationResult = { ok: boolean; allowed: boolean; reasons?: string[] };

async function openAIModerate(text: string): Promise<ModerationResult> {
  const res = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: "omni-moderation-latest", input: text }),
  });
  if (!res.ok) throw new Error(`OpenAI moderation error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const flagged = data.results?.[0]?.flagged ?? false;
  return { ok: true, allowed: !flagged, reasons: flagged ? ["Model flagged content"] : [] };
}

function mockModerate(text: string): ModerationResult {
  const banned = /(weapons|illegal drugs|hate|explicit sexual)/i;
  if (banned.test(text)) return { ok: true, allowed: false, reasons: ["Prohibited content"] };
  return { ok: true, allowed: true };
}

export async function aiModerateProduct(name: string, description?: string | null): Promise<ModerationResult> {
  const text = [name, description ?? ""].join("\n").slice(0, 4000);
  if (OPENAI_API_KEY) {
    try {
      return await openAIModerate(text);
    } catch {
      // fallback below
    }
  }
  return mockModerate(text);
}

/* ---------------- ETA helper ---------------- */

export function aiPredictETA(distanceKm: number, baseEtaMin = 15, hour = new Date().getHours()) {
  const vendor: VendorLite = {
    id: "tmp",
    name: "tmp",
    slug: "tmp",
    rating: 4.4,
    cuisines: [],
    distanceKm,
    baseEtaMin,
  };
  return heuristicEta(vendor, hour);
}
