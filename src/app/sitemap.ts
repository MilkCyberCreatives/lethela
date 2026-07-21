import type { MetadataRoute } from "next";
import { getFallbackProducts, getFallbackVendorCards } from "@/lib/catalog-fallback";
import { shouldPreferCatalogFallback } from "@/lib/catalog-runtime";
import { isPublicMarketplaceVendor } from "@/lib/public-catalog";
import { runBoundedDbQuery } from "@/lib/query-timeout";
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
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
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
      url: `${SITE_URL}/ai.txt`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/opensearch.xml`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.25,
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
      url: `${SITE_URL}/restaurants`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.65,
    },
    {
      url: `${SITE_URL}/track`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.55,
    },
    {
      url: `${SITE_URL}/rider`,
      changeFrequency: "monthly",
      lastModified: now,
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.35,
    },
    {
      url: `${SITE_URL}/privacy-policy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.35,
    },
    {
      url: `${SITE_URL}/refund-policy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.35,
    },
    {
      url: `${SITE_URL}/cookie-policy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/popia`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/paia-manual`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
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
    : await runBoundedDbQuery((db) =>
        db.vendor.findMany({
          where: {
            isActive: true,
            status: { in: ["ACTIVE", "APPROVED"] },
            phone: { not: null },
            address: { not: null },
            city: { not: null },
            province: { not: null },
            storeType: { not: null },
            kycIdUrl: { not: null },
            kycProofUrl: { not: null },
            bankName: { not: null },
            bankAccountName: { not: null },
            bankAccountNumber: { not: null },
            hours: { some: { closed: false } },
            products: { some: { inStock: true, isAlcohol: false, status: "APPROVED" } },
          },
          select: {
            id: true,
            name: true,
            slug: true,
            updatedAt: true,
            status: true,
            isActive: true,
            phone: true,
            address: true,
            city: true,
            province: true,
            cuisine: true,
            storeType: true,
            kycIdUrl: true,
            kycProofUrl: true,
            bankName: true,
            bankAccountName: true,
            bankAccountNumber: true,
            deliveryFee: true,
            etaMins: true,
            _count: { select: { products: true, hours: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 5000,
        }),
      ).catch(() => []);

  const vendorRoutes: MetadataRoute.Sitemap =
    vendorRows.length > 0
      ? vendorRows
          .filter((vendor) => isPublicMarketplaceVendor(vendor))
          .map((vendor) => ({
            url: `${SITE_URL}/vendors/${vendor.slug}`,
            lastModified: vendor.updatedAt,
            changeFrequency: "daily",
            priority: 0.9,
          }))
      : shouldPreferCatalogFallback()
        ? getFallbackVendorCards().map((vendor) => ({
            url: `${SITE_URL}/vendors/${vendor.slug}`,
            lastModified: now,
            changeFrequency: "daily",
            priority: 0.9,
          }))
        : [];

  const productRows = shouldPreferCatalogFallback()
    ? []
    : await runBoundedDbQuery((db) =>
        db.product.findMany({
          where: {
            inStock: true,
            status: "APPROVED",
            vendor: {
              isActive: true,
              status: { in: ["ACTIVE", "APPROVED"] },
              temporaryClosed: false,
            },
          },
          select: { id: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
          take: 5000,
        }),
      ).catch(() => []);
  const productRoutes: MetadataRoute.Sitemap =
    productRows.length > 0
      ? productRows.map((product) => ({
          url: `${SITE_URL}/products/${encodeURIComponent(product.id)}`,
          lastModified: product.updatedAt,
          changeFrequency: "daily" as const,
          priority: 0.75,
        }))
      : shouldPreferCatalogFallback()
        ? getFallbackProducts().map((product) => ({
            url: `${SITE_URL}/products/${encodeURIComponent(product.id)}`,
            lastModified: now,
            changeFrequency: "daily" as const,
            priority: 0.75,
          }))
        : [];

  return [...staticRoutes, ...categoryRoutes, ...vendorRoutes, ...productRoutes];
}
