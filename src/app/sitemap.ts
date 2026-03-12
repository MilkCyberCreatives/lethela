import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { getFallbackVendorCards } from "@/lib/catalog-fallback";
import { shouldPreferCatalogFallback } from "@/lib/catalog-runtime";
import { SITE_URL } from "@/lib/site";
import { TOWNSHIP_CATEGORIES, categoryToSlug } from "@/lib/categories";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.55,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/llms.txt`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/feeds/google-merchant.xml`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/vendors/register`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/rider`,
      changeFrequency: "monthly",
      lastModified: now,
      priority: 0.5,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = TOWNSHIP_CATEGORIES.map((category) => ({
    url: `${SITE_URL}/categories/${categoryToSlug(category)}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.65,
  }));

  const vendorRows = shouldPreferCatalogFallback()
    ? []
    : await prisma.vendor
        .findMany({
          where: { isActive: true, status: "ACTIVE" },
          select: { slug: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
          take: 5000,
        })
        .catch(() => []);

  const vendorRoutes: MetadataRoute.Sitemap =
    vendorRows.length > 0
      ? vendorRows.map((vendor) => ({
          url: `${SITE_URL}/vendors/${vendor.slug}`,
          lastModified: vendor.updatedAt,
          changeFrequency: "daily",
          priority: 0.9,
        }))
      : getFallbackVendorCards().map((vendor) => ({
          url: `${SITE_URL}/vendors/${vendor.slug}`,
          lastModified: now,
          changeFrequency: "daily",
          priority: 0.9,
        }));

  return [...staticRoutes, ...categoryRoutes, ...vendorRoutes];
}
