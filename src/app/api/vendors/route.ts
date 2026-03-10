import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { aiPredictETA } from "@/lib/ai";
import { getFallbackVendorCards } from "@/lib/catalog-fallback";
import { shouldPreferCatalogFallback } from "@/lib/catalog-runtime";
import { withQueryTimeout } from "@/lib/query-timeout";

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
        rating: number;
        cuisines: string[];
        eta: string;
        distanceKm: number;
        baseEtaMin: number;
      }>
    | undefined;

  if (shouldPreferCatalogFallback()) {
    const fallback = getFallbackVendorCards().slice(0, take);
    items = fallback.map((vendor) => {
      const etaBase = aiPredictETA(vendor.distanceKm, vendor.baseEtaMin, hour);
      return { ...vendor, eta: `${etaBase}-${etaBase + 5} min` };
    });
  } else {
    try {
      const dbVendors = await withQueryTimeout(
        prisma.vendor.findMany({
          where: {
            isActive: true,
            status: "ACTIVE",
            ...(suburb ? { suburb: { contains: suburb } } : {}),
          },
          orderBy: { updatedAt: "desc" },
          take,
          include: {
            products: {
              select: { isAlcohol: true },
              take: 3,
            },
          },
        }),
        []
      );

      items = dbVendors.map((vendor) => {
        const hasAlcohol = vendor.products.some((product) => product.isAlcohol);
        const etaBase = aiPredictETA(3, 15, hour);
        return {
          id: vendor.id,
          name: vendor.name,
          slug: vendor.slug,
          cover: hasAlcohol ? "/vendors/vegan.jpg" : "/vendors/grill.jpg",
          badge: hasAlcohol ? "18+ available" : null,
          rating: 4.4,
          cuisines: hasAlcohol ? ["Food", "Drinks"] : ["Burgers", "Grill"],
          eta: `${etaBase}-${etaBase + 5} min`,
          distanceKm: 3,
          baseEtaMin: 15,
        };
      });
    } catch {
      items = [];
    }
  }

  if (items.length === 0) {
    const fallback = getFallbackVendorCards().slice(0, take);

    items = fallback.map((vendor) => {
      const etaBase = aiPredictETA(vendor.distanceKm, vendor.baseEtaMin, hour);
      return { ...vendor, eta: `${etaBase}-${etaBase + 5} min` };
    });
  }

  return NextResponse.json(
    {
      ok: true,
      suburb: suburb || "your area",
      items,
      total: items.length,
    },
    {
      headers: {
        "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
