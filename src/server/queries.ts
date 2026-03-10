// /src/server/queries.ts
import { prisma } from "@/server/db";
import { getFallbackVendorProfile, type CatalogSection } from "@/lib/catalog-fallback";
import { shouldPreferCatalogFallback } from "@/lib/catalog-runtime";
import { withQueryTimeout } from "@/lib/query-timeout";

export async function getVendorBySlug(slug: string) {
  const fallback = getFallbackVendorProfile(slug);
  if (fallback && shouldPreferCatalogFallback()) {
    return fallback;
  }

  const vendorQuery = prisma.vendor.findUnique({
      where: { slug },
      include: {
        products: {
          where: { inStock: true },
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
        items: true,
      },
    });

  type VendorRecord = Awaited<typeof vendorQuery>;

  const vendor = await withQueryTimeout<VendorRecord | null>(vendorQuery, null);

  if (!vendor) return fallback;

  const cuisine = Array.isArray(vendor.cuisine)
    ? vendor.cuisine
    : (() => {
        try {
          const parsed = JSON.parse(vendor.cuisine || "[]");
          return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
        } catch {
          return [];
        }
      })();

  const sections = (vendor.sections as unknown as CatalogSection[])
    .map((section) => ({
      ...section,
      items: section.items.map((item) => ({
        ...item,
        tags: Array.isArray(item.tags)
          ? item.tags
          : (() => {
              try {
                const parsed = JSON.parse(String(item.tags || "[]"));
                return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : [];
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
    products: vendor.products ?? [],
    specials: vendor.specials ?? [],
  };
}
