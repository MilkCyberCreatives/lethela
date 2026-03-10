import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { aiPredictETA } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const suburb = String(url.searchParams.get("suburb") || "").trim();
  const hour = Number(url.searchParams.get("hour") ?? new Date().getHours());
  const take = Math.min(60, Math.max(6, Number(url.searchParams.get("take") ?? 30)));

  const dbVendors = await prisma.vendor.findMany({
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
  });

  let items = dbVendors.map((vendor) => {
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

  if (items.length === 0) {
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
