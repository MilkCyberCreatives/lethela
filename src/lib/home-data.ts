import type { ProductLite } from "@/components/ProductCard";
import { aiPredictETA, aiRecommend, aiRerankVendors } from "@/lib/ai";
import { getFallbackProducts, getFallbackVendorCards } from "@/lib/catalog-fallback";
import {
  shouldFallbackWhenCatalogEmpty,
  shouldPreferCatalogFallback,
  shouldUseCatalogFallbackBeforeQuery,
} from "@/lib/catalog-runtime";
import { inferProductCategory } from "@/lib/categories";
import { prisma } from "@/lib/db";
import {
  buildPublicVendorCard,
  isPublicCatalogProduct,
  isPublicMarketplaceVendor,
} from "@/lib/public-catalog";
import {
  canReadSqliteCatalog,
  getSqliteCatalogProducts,
  getSqliteCatalogVendors,
} from "@/lib/sqlite-catalog";
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
  status?: string | null;
  isActive?: boolean | null;
  phone?: string | null;
  address?: string | null;
  suburb?: string | null;
  city?: string | null;
  province?: string | null;
  municipality?: string | null;
  township?: string | null;
  sectionArea?: string | null;
  storeType?: string | null;
  deliveryFee?: number | null;
  _count?: { products?: number; items?: number; hours?: number };
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

async function withTimeout<T>(
  work: () => Promise<T>,
  fallback: T,
  ms = HOME_QUERY_TIMEOUT_MS,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const guarded = Promise.resolve(work()).catch(() => fallback);
    const timeout = new Promise<T>((resolve) => {
      timeoutId = setTimeout(() => resolve(fallback), ms);
    });
    return await Promise.race([guarded, timeout]);
  } catch {
    return fallback;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function normalizeSuburb(suburb: string | null) {
  if (!suburb) return null;
  const [firstPart] = suburb.split(",");
  return firstPart?.trim() || suburb.trim();
}

function publicReadinessFlags<T extends object>(vendor: T) {
  return {
    ...vendor,
    email: "verified@lethela.local",
    hasBanking: true,
    hasKycDocuments: true,
  };
}

export async function getHomeRecommendations(suburb: string | null): Promise<RecommendationCard[]> {
  const result = await withTimeout<Awaited<ReturnType<typeof aiRecommend>>>(
    () => aiRecommend(suburb),
    { ok: true, results: [] },
  );
  return result.results;
}

export async function getHomeProducts(suburb: string | null, take = 24): Promise<ProductLite[]> {
  if (canReadSqliteCatalog()) {
    const sqliteItems = await getSqliteCatalogProducts({ suburb, take, alcohol: "false" });
    if (sqliteItems) return sqliteItems;
  }

  if (shouldUseCatalogFallbackBeforeQuery()) {
    return getFallbackProducts()
      .filter((item) => !item.isAlcohol)
      .slice(0, Math.min(60, Math.max(6, take)));
  }

  const normalizedSuburb = normalizeSuburb(suburb);
  const rows = await withTimeout(
    () =>
      prisma.product.findMany({
        where: {
          inStock: true,
          status: "APPROVED",
          isAlcohol: false,
          vendor: {
            isActive: true,
            status: { in: ["ACTIVE", "APPROVED"] },
            temporaryClosed: false,
            phone: { not: null },
            email: { not: null },
            address: { not: null },
            city: { not: null },
            province: { not: null },
            storeType: { not: null },
            etaMins: { gte: 10 },
            kycIdUrl: { not: null },
            kycProofUrl: { not: null },
            bankName: { not: null },
            bankAccountName: { not: null },
            bankAccountNumber: { not: null },
            hours: { some: { closed: false } },
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
              status: true,
              isActive: true,
              temporaryClosed: true,
              phone: true,
              address: true,
              suburb: true,
              city: true,
              province: true,
              municipality: true,
              township: true,
              sectionArea: true,
              storeType: true,
              cuisine: true,
              etaMins: true,
              _count: { select: { products: true, items: true, hours: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: Math.min(60, Math.max(6, take)),
      }),
    [],
  );

  if (rows.length === 0 && shouldFallbackWhenCatalogEmpty()) {
    return getFallbackProducts()
      .filter((item) => !item.isAlcohol)
      .slice(0, Math.min(60, Math.max(6, take)));
  }

  return rows
    .filter(
      (item) =>
        isPublicCatalogProduct(item) &&
        isPublicMarketplaceVendor(publicReadinessFlags(item.vendor)),
    )
    .map((item) => ({
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
  if (canReadSqliteCatalog()) {
    const sqliteVendors = await getSqliteCatalogVendors({ suburb, take });
    if (sqliteVendors) {
      return sqliteVendors.map((vendor) => {
        const etaStart = aiPredictETA(vendor.distanceKm ?? 3, vendor.baseEtaMin ?? 15, hour);
        return { ...vendor, eta: `${etaStart}-${etaStart + 5} min` };
      });
    }
  }

  if (shouldUseCatalogFallbackBeforeQuery()) {
    return fallbackVendors(hour).slice(0, Math.min(60, Math.max(6, take)));
  }

  const normalizedSuburb = normalizeSuburb(suburb);
  const dbVendors = await withTimeout(
    () =>
      prisma.vendor.findMany({
        where: {
          isActive: true,
          status: { in: ["ACTIVE", "APPROVED"] },
          temporaryClosed: false,
          phone: { not: null },
          email: { not: null },
          address: { not: null },
          city: { not: null },
          province: { not: null },
          storeType: { not: null },
          etaMins: { gte: 10 },
          kycIdUrl: { not: null },
          kycProofUrl: { not: null },
          bankName: { not: null },
          bankAccountName: { not: null },
          bankAccountNumber: { not: null },
          hours: { some: { closed: false } },
          products: { some: { isAlcohol: false, inStock: true, status: "APPROVED" } },
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
          status: true,
          isActive: true,
          phone: true,
          address: true,
          suburb: true,
          city: true,
          province: true,
          municipality: true,
          township: true,
          sectionArea: true,
          storeType: true,
          deliveryFee: true,
          products: {
            select: { isAlcohol: true },
            where: { isAlcohol: false, inStock: true, status: "APPROVED" },
            take: 6,
          },
          _count: { select: { products: true, items: true, hours: true } },
          reviews: {
            select: { rating: true },
            take: 40,
          },
        },
        orderBy: { updatedAt: "desc" },
        take: Math.min(60, Math.max(6, take)),
      }),
    [],
  );

  if (dbVendors.length === 0) {
    return shouldPreferCatalogFallback() || shouldFallbackWhenCatalogEmpty()
      ? fallbackVendors(hour)
      : [];
  }

  const mapped = dbVendors
    .filter((vendor: VendorWithAlcohol) => isPublicMarketplaceVendor(publicReadinessFlags(vendor)))
    .map((vendor: VendorWithAlcohol) =>
      buildPublicVendorCard({
        id: vendor.id,
        name: vendor.name,
        slug: vendor.slug,
        rating: vendor.rating ?? 0,
        cuisine: vendor.cuisine,
        halaal: vendor.halaal,
        image: vendor.image,
        etaMins: vendor.etaMins,
        products: vendor.products,
        reviews: vendor.reviews,
        baseEtaMin: vendor.etaMins ?? 15,
      }),
    );

  if (mapped.length <= 1) return mapped;

  const reranked = await aiRerankVendors({
    vendors: mapped.map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
      slug: vendor.slug,
      rating: vendor.rating ?? 0,
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
    const etaStart =
      etaById.get(vendor.id) ?? aiPredictETA(vendor.distanceKm ?? 3, vendor.baseEtaMin ?? 15, hour);
    return {
      ...vendor,
      eta: `${etaStart}-${etaStart + 5} min`,
    };
  });

  merged.sort((a, b) => (orderById.get(a.id) ?? 999) - (orderById.get(b.id) ?? 999));
  return merged;
}
