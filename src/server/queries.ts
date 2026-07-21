// /src/server/queries.ts
import { prisma } from "@/server/db";
import { getFallbackVendorProfile, type CatalogSection } from "@/lib/catalog-fallback";
import { shouldUseCatalogFallbackBeforeQuery } from "@/lib/catalog-runtime";
import { isPublicCatalogProduct, isPublicMarketplaceVendor } from "@/lib/public-catalog";
import { withQueryTimeout } from "@/lib/query-timeout";

export async function getVendorBySlug(slug: string) {
  const allowFallback = shouldUseCatalogFallbackBeforeQuery();
  const fallback = getFallbackVendorProfile(slug);
  if (fallback && allowFallback) {
    return fallback;
  }

  const vendorQuery = prisma.vendor.findUnique({
    where: { slug },
    include: {
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
      hours: {
        orderBy: { day: "asc" },
      },
      items: true,
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

  const products = (vendor.products ?? []).filter((product) =>
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
    hours: vendor.hours ?? [],
    products,
    specials: vendor.specials ?? [],
  };
}
