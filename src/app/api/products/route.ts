// src/app/api/products/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFallbackProducts } from "@/lib/catalog-fallback";
import { shouldPreferCatalogFallback } from "@/lib/catalog-runtime";
import { inferProductCategory } from "@/lib/categories";
import { withQueryTimeout } from "@/lib/query-timeout";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const suburb = searchParams.get("suburb") || undefined;
  const alcohol = searchParams.get("alcohol");
  const category = String(searchParams.get("category") || "").trim();
  const take = Math.min(60, Math.max(6, Number(searchParams.get("take") ?? 30)));

  const where: {
    isAlcohol?: boolean;
    vendor?: {
      isActive?: boolean;
      status?: string;
      suburb?: { contains: string };
    };
  } = {
    vendor: {
      isActive: true,
      status: "ACTIVE",
    },
  };
  if (alcohol === "true") where.isAlcohol = true;
  if (alcohol === "false") where.isAlcohol = false;
  if (suburb) {
    where.vendor = {
      ...where.vendor,
      suburb: { contains: suburb },
    };
  }

  const dbItems = shouldPreferCatalogFallback()
    ? []
    : await withQueryTimeout(
        prisma.product.findMany({
          where,
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
          take,
          orderBy: { updatedAt: "desc" },
        }),
        []
      );

  const items =
    dbItems.length > 0
      ? dbItems.map((item) => ({
          ...item,
          category: inferProductCategory({
            name: item.name,
            description: item.description,
            isAlcohol: item.isAlcohol,
          }),
        }))
      : shouldPreferCatalogFallback()
        ? getFallbackProducts()
        : [];

  const filtered = category
    ? items.filter((item) => item.category.toLowerCase() === category.toLowerCase())
    : items;

  const alcoholFiltered =
    alcohol === "true" ? filtered.filter((item) => item.isAlcohol) : alcohol === "false" ? filtered.filter((item) => !item.isAlcohol) : filtered;

  return NextResponse.json(
    { ok: true, items: alcoholFiltered.slice(0, take), suburb, total: alcoholFiltered.length },
    {
      headers: {
        "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
