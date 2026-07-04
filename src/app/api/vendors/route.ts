import { NextResponse } from "next/server";
import { aiPredictETA } from "@/lib/ai";
import { getFallbackVendorCards } from "@/lib/catalog-fallback";
import {
  getCatalogMode,
  shouldFallbackWhenCatalogEmpty,
  shouldPreferCatalogFallback,
  shouldUseCatalogFallbackBeforeQuery,
} from "@/lib/catalog-runtime";
import { buildPublicVendorCard, isPublicMarketplaceVendor } from "@/lib/public-catalog";
import { runBoundedDbQuery } from "@/lib/query-timeout";
import { canReadSqliteCatalog, getSqliteCatalogVendors } from "@/lib/sqlite-catalog";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const suburb = String(url.searchParams.get("suburb") || "").trim();
  const hour = Number(url.searchParams.get("hour") ?? new Date().getHours());
  const take = Math.min(60, Math.max(6, Number(url.searchParams.get("take") ?? 30)));

  let items:
    | Array<{
        id: string;
        name: string;
        slug: string;
        cover: string;
        badge: string | null;
        rating: number | null;
        reviewCount?: number;
        deliveryFeeCents?: number;
        cuisines: string[];
        eta: string;
        distanceKm?: number;
        baseEtaMin?: number;
      }>
    | undefined;

  if (canReadSqliteCatalog()) {
    items = (await getSqliteCatalogVendors({ suburb, take })) ?? [];
    items = items.map((vendor) => {
      const etaBase = aiPredictETA(vendor.distanceKm ?? 3, vendor.baseEtaMin, hour);
      return { ...vendor, eta: `${etaBase}-${etaBase + 5} min` };
    });
  } else if (shouldUseCatalogFallbackBeforeQuery()) {
    const fallback = getFallbackVendorCards().slice(0, take);
    items = fallback.map((vendor) => {
      const etaBase = aiPredictETA(vendor.distanceKm, vendor.baseEtaMin, hour);
      return { ...vendor, eta: `${etaBase}-${etaBase + 5} min` };
    });
  } else {
    try {
      const dbVendors = await runBoundedDbQuery((db) =>
        db.vendor.findMany({
          where: {
            isActive: true,
            status: { in: ["ACTIVE", "APPROVED"] },
            ...(suburb ? { suburb: { contains: suburb } } : {}),
          },
          orderBy: { updatedAt: "desc" },
          take,
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
            kycIdUrl: true,
            kycProofUrl: true,
            bankName: true,
            bankAccountName: true,
            bankAccountNumber: true,
            bankBranchCode: true,
            products: {
              select: { isAlcohol: true },
              where: { isAlcohol: false, inStock: true },
              take: 6,
            },
            _count: { select: { products: true, items: true, hours: true } },
            reviews: {
              select: { rating: true },
              take: 40,
            },
          },
        }),
      );

      items = dbVendors
        .filter((vendor) => isPublicMarketplaceVendor(vendor))
        .map((vendor) => {
          const card = buildPublicVendorCard({
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
          });
          const etaBase = aiPredictETA(
            card.distanceKm ?? 3,
            card.baseEtaMin ?? vendor.etaMins ?? 15,
            hour,
          );
          return {
            ...card,
            eta: `${etaBase}-${etaBase + 5} min`,
          };
        });
    } catch {
      items = [];
    }
  }

  if (items.length === 0 && (shouldPreferCatalogFallback() || shouldFallbackWhenCatalogEmpty())) {
    const fallback = getFallbackVendorCards().slice(0, take);

    items = fallback.map((vendor) => {
      const etaBase = aiPredictETA(vendor.distanceKm, vendor.baseEtaMin, hour);
      return { ...vendor, eta: `${etaBase}-${etaBase + 5} min` };
    });
  }

  return NextResponse.json(
    {
      ok: true,
      catalogMode: getCatalogMode(),
      suburb: suburb || "your area",
      items,
      total: items.length,
    },
    {
      headers: {
        "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
