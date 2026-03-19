import { prisma } from "@/lib/db";

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "near",
  "from",
  "that",
  "this",
  "your",
  "you",
  "food",
  "meal",
  "order",
  "delivery",
]);

export type VisitorProfile = {
  preferredArea: string | null;
  favoriteVendorSlugs: string[];
  keywordScores: Record<string, number>;
  recentQueries: string[];
  eventCount: number;
};

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

export async function getVisitorProfile(visitorId?: string | null): Promise<VisitorProfile | null> {
  if (!visitorId) return null;

  const visitor = await prisma.visitor.findUnique({
    where: { id: visitorId },
    select: {
      preferredArea: true,
      events: {
        orderBy: { createdAt: "desc" },
        take: 80,
        select: {
          type: true,
          vendorSlug: true,
          searchQuery: true,
          metaJson: true,
        },
      },
    },
  });

  if (!visitor) return null;

  const vendorScores = new Map<string, number>();
  const keywordScores = new Map<string, number>();
  const recentQueries: string[] = [];

  for (const event of visitor.events) {
    if (event.vendorSlug) {
      const current = vendorScores.get(event.vendorSlug) ?? 0;
      const weight = event.type === "vendor_click" ? 4 : event.type === "recommendation_click" ? 5 : 2;
      vendorScores.set(event.vendorSlug, current + weight);
    }

    if (event.searchQuery) {
      recentQueries.push(event.searchQuery);
      for (const token of tokenize(event.searchQuery)) {
        keywordScores.set(token, (keywordScores.get(token) ?? 0) + 4);
      }
    }

    if (event.metaJson) {
      try {
        const parsed = JSON.parse(event.metaJson) as Record<string, unknown>;
        for (const field of ["name", "category", "cuisines"] as const) {
          const value = parsed[field];
          const parts = Array.isArray(value) ? value.map(String) : [String(value ?? "")];
          for (const part of parts) {
            for (const token of tokenize(part)) {
              keywordScores.set(token, (keywordScores.get(token) ?? 0) + 2);
            }
          }
        }
      } catch {
        // ignore malformed telemetry payloads
      }
    }
  }

  return {
    preferredArea: visitor.preferredArea || null,
    favoriteVendorSlugs: Array.from(vendorScores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([slug]) => slug)
      .slice(0, 5),
    keywordScores: Object.fromEntries(
      Array.from(keywordScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    ),
    recentQueries: recentQueries.slice(0, 6),
    eventCount: visitor.events.length,
  };
}
