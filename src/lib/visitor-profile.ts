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
  favoriteProductIds: string[];
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
          userId: true,
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
  const recentUserId = visitor.events.find((event) => typeof event.userId === "string" && event.userId)?.userId || null;

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

  const [favoriteProducts, reviewedProducts] = recentUserId
    ? await Promise.all([
        prisma.userFavoriteProduct.findMany({
          where: { userId: recentUserId },
          select: {
            productId: true,
            product: {
              select: {
                vendor: {
                  select: { slug: true },
                },
                name: true,
              },
            },
          },
          take: 24,
        }),
        prisma.userProductReview.findMany({
          where: { userId: recentUserId },
          select: {
            rating: true,
            productId: true,
            product: {
              select: {
                vendor: { select: { slug: true } },
                name: true,
              },
            },
          },
          take: 24,
        }),
      ])
    : [[], []];

  for (const item of favoriteProducts) {
    vendorScores.set(item.product.vendor.slug, (vendorScores.get(item.product.vendor.slug) ?? 0) + 6);
    for (const token of tokenize(item.product.name)) {
      keywordScores.set(token, (keywordScores.get(token) ?? 0) + 3);
    }
  }

  for (const item of reviewedProducts) {
    vendorScores.set(item.product.vendor.slug, (vendorScores.get(item.product.vendor.slug) ?? 0) + item.rating);
    for (const token of tokenize(item.product.name)) {
      keywordScores.set(token, (keywordScores.get(token) ?? 0) + Math.max(2, item.rating - 1));
    }
  }

  return {
    preferredArea: visitor.preferredArea || null,
    favoriteVendorSlugs: Array.from(vendorScores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([slug]) => slug)
      .slice(0, 5),
    favoriteProductIds: favoriteProducts.map((item) => item.productId),
    keywordScores: Object.fromEntries(
      Array.from(keywordScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    ),
    recentQueries: recentQueries.slice(0, 6),
    eventCount: visitor.events.length + favoriteProducts.length + reviewedProducts.length,
  };
}
