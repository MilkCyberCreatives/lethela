import { prisma } from "@/lib/db";
import { aiPredictETA, aiRecommend, aiRerankVendors } from "@/lib/ai";
import { inferProductCategory } from "@/lib/categories";
import { getFallbackProducts, getFallbackVendorCards } from "@/lib/catalog-fallback";
import { shouldPreferCatalogFallback } from "@/lib/catalog-runtime";
import { buildPublicVendorCard } from "@/lib/public-catalog";
import type { ProductLite } from "@/components/ProductCard";
import type { Vendor } from "@/types";

type VendorWithAlcohol = {
  id: string;
  name: string;
  slug: string;
  rating: number;
  cuisine: string;
  halaal?: boolean | null;
  image?: string | null;
  etaMins?: number | null;
  products: Array<{ isAlcohol: boolean }>;
  reviews?: Array<{ rating: number }>;
};

type RecommendationCard = {
  title: string;
  subtitle?: string;
  image?: string;
  vendor?: string | null;
  slug?: string | null;
  isAlcohol?: boolean;
};

const HOME_QUERY_TIMEOUT_MS = 2500;
function timeoutFallback<T>(ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(fallback), ms);
  });
}

async function withTimeout<T>(work: () => Promise<T>, fallback: T, ms = HOME_QUERY_TIMEOUT_MS): Promise<T> {
  try {
    const guarded = Promise.resolve(work()).catch(() => fallback);
    return await Promise.race([guarded, timeoutFallback(ms, fallback)]);
  } catch {
    return fallback;
  }
}

function normalizeSuburb(suburb: string | null) {
  if (!suburb) return null;
  const [firstPart] = suburb.split(",");
  return firstPart?.trim() || suburb.trim();
}

export async function getHomeRecommendations(suburb: string | null): Promise<RecommendationCard[]> {
  const result = await withTimeout<Awaited<ReturnType<typeof aiRecommend>>>(() => aiRecommend(suburb), { ok: true, results: [] });
  return result.results;
}

export async function getHomeProducts(suburb: string | null, take = 24): Promise<ProductLite[]> {
  if (shouldPreferCatalogFallback()) {
    return getFallbackProducts().slice(0, Math.min(60, Math.max(6, take)));
  }

  const normalizedSuburb = normalizeSuburb(suburb);
  const rows = await withTimeout(
    () =>
      prisma.product.findMany({
      where: {
        inStock: true,
        vendor: {
          isActive: true,
          status: "ACTIVE",
          ...(normalizedSuburb ? { suburb: { contains: normalizedSuburb } } : {}),
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        priceCents: true,
        image: true,
        isAlcohol: true,
        vendor: {
          select: {
            id: true,
            name: true,
            slug: true,
            deliveryFee: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: Math.min(60, Math.max(6, take)),
    }),
    []
  );

  return rows.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    priceCents: item.priceCents,
    image: item.image,
    isAlcohol: item.isAlcohol,
    vendor: item.vendor,
    category: inferProductCategory({
      name: item.name,
      description: item.description,
      isAlcohol: item.isAlcohol,
    }),
  }));
}

function fallbackVendors(hour: number): Vendor[] {
  return getFallbackVendorCards().map((vendor) => {
    const etaBase = aiPredictETA(vendor.distanceKm, vendor.baseEtaMin, hour);
    return { ...vendor, eta: `${etaBase}-${etaBase + 5} min` };
  });
}

export async function getHomeVendors(suburb: string | null, take = 18): Promise<Vendor[]> {
  const hour = new Date().getHours();
  if (shouldPreferCatalogFallback()) {
    return fallbackVendors(hour).slice(0, Math.min(60, Math.max(6, take)));
  }

  const normalizedSuburb = normalizeSuburb(suburb);
  const dbVendors = await withTimeout(
    () =>
      prisma.vendor.findMany({
      where: {
        isActive: true,
        status: "ACTIVE",
        ...(normalizedSuburb ? { suburb: { contains: normalizedSuburb } } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        rating: true,
        cuisine: true,
        halaal: true,
        image: true,
        etaMins: true,
        products: {
          select: { isAlcohol: true },
          take: 4,
        },
        reviews: {
          select: { rating: true },
          take: 40,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: Math.min(60, Math.max(6, take)),
    }),
    []
  );

  if (dbVendors.length === 0) {
    return shouldPreferCatalogFallback() ? fallbackVendors(hour) : [];
  }

  const mapped = dbVendors.map((vendor: VendorWithAlcohol) => {
    return buildPublicVendorCard({
      id: vendor.id,
      name: vendor.name,
      slug: vendor.slug,
      rating: vendor.rating,
      cuisine: vendor.cuisine,
      halaal: vendor.halaal,
      image: vendor.image,
      etaMins: vendor.etaMins,
      products: vendor.products,
      reviews: vendor.reviews,
      baseEtaMin: vendor.etaMins ?? 15,
    });
  });

  const reranked = await aiRerankVendors({
    vendors: mapped.map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
      slug: vendor.slug,
      rating: vendor.rating,
      cuisines: vendor.cuisines,
      distanceKm: vendor.distanceKm ?? 3,
      baseEtaMin: vendor.baseEtaMin ?? 15,
    })),
    clicks: {},
    hour,
    suburb,
  });

  const orderById = new Map<string, number>();
  const etaById = new Map<string, number>();
  for (const [index, vendor] of reranked.vendors.entries()) {
    orderById.set(vendor.id, index);
    etaById.set(vendor.id, vendor.predictedEtaMin);
  }

  const merged = mapped.map((vendor) => {
    const etaStart = etaById.get(vendor.id) ?? aiPredictETA(vendor.distanceKm ?? 3, vendor.baseEtaMin ?? 15, hour);
    return {
      ...vendor,
      eta: `${etaStart}-${etaStart + 5} min`,
    };
  });

  merged.sort((a, b) => (orderById.get(a.id) ?? 999) - (orderById.get(b.id) ?? 999));
  return merged;
}
