import { prisma } from "@/lib/db";
import { aiPredictETA, aiRecommend, aiRerankVendors } from "@/lib/ai";
import { inferProductCategory } from "@/lib/categories";
import type { ProductLite } from "@/components/ProductCard";
import type { Vendor } from "@/types";

type VendorWithAlcohol = {
  id: string;
  name: string;
  slug: string;
  rating: number;
  cuisine: string;
  products: Array<{ isAlcohol: boolean }>;
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

function parseCuisine(value: string) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function vendorCover(hasAlcohol: boolean) {
  return hasAlcohol ? "/vendors/vegan.jpg" : "/vendors/grill.jpg";
}

export async function getHomeRecommendations(suburb: string | null): Promise<RecommendationCard[]> {
  const result = await withTimeout<Awaited<ReturnType<typeof aiRecommend>>>(() => aiRecommend(suburb), { ok: true, results: [] });
  return result.results;
}

export async function getHomeProducts(suburb: string | null, take = 24): Promise<ProductLite[]> {
  const rows = await withTimeout(
    () =>
      prisma.product.findMany({
      where: {
        inStock: true,
        vendor: {
          isActive: true,
          status: "ACTIVE",
          ...(suburb ? { suburb: { contains: suburb } } : {}),
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
  const fallback = [
    {
      id: "v1",
      name: "Hello Tomato",
      slug: "hello-tomato",
      cover: "/vendors/grill.jpg",
      badge: "Popular",
      rating: 4.7,
      cuisines: ["Burgers", "Grill"],
      distanceKm: 2.5,
      baseEtaMin: 14,
    },
    {
      id: "v2",
      name: "Bento",
      slug: "bento",
      cover: "/vendors/sushi.jpg",
      badge: null,
      rating: 4.6,
      cuisines: ["Sushi", "Asian"],
      distanceKm: 3.2,
      baseEtaMin: 16,
    },
    {
      id: "v3",
      name: "Spice Route",
      slug: "spice-route",
      cover: "/vendors/curry.jpg",
      badge: "Halaal",
      rating: 4.5,
      cuisines: ["Curry", "Indian"],
      distanceKm: 4.1,
      baseEtaMin: 18,
    },
    {
      id: "v4",
      name: "Romans Pizza",
      slug: "romans-pizza",
      cover: "/vendors/burgers.jpg",
      badge: null,
      rating: 4.1,
      cuisines: ["Pizza"],
      distanceKm: 3.8,
      baseEtaMin: 17,
    },
  ];

  return fallback.map((vendor) => {
    const etaBase = aiPredictETA(vendor.distanceKm, vendor.baseEtaMin, hour);
    return { ...vendor, eta: `${etaBase}-${etaBase + 5} min` };
  });
}

export async function getHomeVendors(suburb: string | null, take = 18): Promise<Vendor[]> {
  const hour = new Date().getHours();
  const dbVendors = await withTimeout(
    () =>
      prisma.vendor.findMany({
      where: {
        isActive: true,
        status: "ACTIVE",
        ...(suburb ? { suburb: { contains: suburb } } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        rating: true,
        cuisine: true,
        products: {
          select: { isAlcohol: true },
          take: 4,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: Math.min(60, Math.max(6, take)),
    }),
    []
  );

  if (dbVendors.length === 0) {
    return fallbackVendors(hour);
  }

  const mapped = dbVendors.map((vendor: VendorWithAlcohol) => {
    const hasAlcohol = vendor.products.some((product) => product.isAlcohol);
    const cuisine = parseCuisine(vendor.cuisine);
    return {
      id: vendor.id,
      name: vendor.name,
      slug: vendor.slug,
      cover: vendorCover(hasAlcohol),
      badge: hasAlcohol ? "18+ available" : null,
      rating: Number.isFinite(vendor.rating) ? vendor.rating : 4.4,
      cuisines: cuisine.length > 0 ? cuisine : hasAlcohol ? ["Food", "Drinks"] : ["Burgers", "Grill"],
      distanceKm: 3,
      baseEtaMin: 15,
      eta: "20-25 min",
    };
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
