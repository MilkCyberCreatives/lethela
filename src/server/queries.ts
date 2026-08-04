// /src/server/queries.ts
import { getFallbackVendorProfile, type CatalogSection } from "@/lib/catalog-fallback";
import { shouldUseCatalogFallbackBeforeQuery } from "@/lib/catalog-runtime";
import { isPublicCatalogProduct, isPublicMarketplaceVendor } from "@/lib/public-catalog";
import { withQueryTimeout } from "@/lib/query-timeout";
import { prisma } from "@/server/db";

export async function getVendorBySlug(slug: string) {
  const allowFallback = shouldUseCatalogFallbackBeforeQuery();
  const fallback = getFallbackVendorProfile(slug);
  if (fallback && allowFallback) return fallback;

  const vendorQuery = prisma.vendor.findFirst({
    where: {
      slug,
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
      OR: [
        { products: { some: { inStock: true, isAlcohol: false, status: "APPROVED" } } },
        { items: { some: { draft: false } } },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      phone: true,
      address: true,
      suburb: true,
      city: true,
      province: true,
      municipality: true,
      township: true,
      sectionArea: true,
      storeType: true,
      description: true,
      coverImage: true,
      pickupInstructions: true,
      temporaryClosed: true,
      preparationMinutes: true,
      orderCapacity: true,
      cuisine: true,
      rating: true,
      deliveryFee: true,
      etaMins: true,
      halaal: true,
      image: true,
      isActive: true,
      status: true,
      products: {
        where: { inStock: true, isAlcohol: false, status: "APPROVED" },
        orderBy: { updatedAt: "desc" },
        take: 80,
      },
      specials: {
        where: { endsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
        take: 4,
      },
      sections: {
        orderBy: { sortOrder: "asc" },
        include: { items: { where: { draft: false }, orderBy: { name: "asc" } } },
      },
      hours: { orderBy: { day: "asc" } },
      _count: { select: { products: true, items: true, hours: true } },
    },
  });

  type VendorRecord = Awaited<typeof vendorQuery>;
  const vendor = await withQueryTimeout<VendorRecord | null>(vendorQuery, null);
  if (!vendor) return fallback;

  const liveMenuItemCount = vendor.sections.reduce((sum, section) => sum + section.items.length, 0);
  if (
    !isPublicMarketplaceVendor({
      ...vendor,
      email: "verified@lethela.local",
      hasBanking: true,
      hasKycDocuments: true,
      _count: {
        ...vendor._count,
        products: vendor.products.length,
        items: liveMenuItemCount,
      },
    })
  ) {
    return null;
  }

  const cuisine = Array.isArray(vendor.cuisine)
    ? vendor.cuisine
    : (() => {
        try {
          const parsed = JSON.parse(vendor.cuisine || "[]");
          return Array.isArray(parsed)
            ? parsed.filter((item): item is string => typeof item === "string")
            : [];
        } catch {
          return [];
        }
      })();

  const products = vendor.products.filter((product) =>
    isPublicCatalogProduct({
      id: product.id,
      name: product.name,
      status: product.status,
      vendorName: vendor.name,
      vendorSlug: vendor.slug,
    }),
  );

  const sections = (vendor.sections as unknown as CatalogSection[])
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) =>
          isPublicCatalogProduct({
            id: item.id,
            name: item.name,
            vendorName: vendor.name,
            vendorSlug: vendor.slug,
          }),
        )
        .map((item) => ({
          ...item,
          tags: Array.isArray(item.tags)
            ? item.tags
            : (() => {
                try {
                  const parsed = JSON.parse(String(item.tags || "[]"));
                  return Array.isArray(parsed)
                    ? parsed.filter((tag): tag is string => typeof tag === "string")
                    : [];
                } catch {
                  return [];
                }
              })(),
        })),
    }))
    .filter((section) => section.items.length > 0);

  return {
    ...vendor,
    cuisine,
    sections,
    hours: vendor.hours,
    products,
    specials: vendor.specials,
  };
}
