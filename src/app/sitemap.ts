import type { MetadataRoute } from "next";
import { getFallbackProducts, getFallbackVendorCards } from "@/lib/catalog-fallback";
import { shouldPreferCatalogFallback } from "@/lib/catalog-runtime";
import { isPublicMarketplaceProduct, isPublicMarketplaceVendor } from "@/lib/public-catalog";
import { runBoundedDbQuery } from "@/lib/query-timeout";
import { SITE_URL } from "@/lib/site";
import { TOWNSHIP_CATEGORIES, categoryToSlug } from "@/lib/categories";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/faq`,
      changeFrequency: "monthly",
      priority: 0.55,
    },
    {
      url: `${SITE_URL}/contact`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/search`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/restaurants`,
      changeFrequency: "daily",
      priority: 0.75,
    },
    {
      url: `${SITE_URL}/terms`,
      changeFrequency: "yearly",
      priority: 0.35,
    },
    {
      url: `${SITE_URL}/privacy-policy`,
      changeFrequency: "yearly",
      priority: 0.35,
    },
    {
      url: `${SITE_URL}/refund-policy`,
      changeFrequency: "yearly",
      priority: 0.35,
    },
    {
      url: `${SITE_URL}/cookie-policy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/popia`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/paia-manual`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = TOWNSHIP_CATEGORIES.map((category) => ({
    url: `${SITE_URL}/categories/${categoryToSlug(category)}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const vendorRows = shouldPreferCatalogFallback()
    ? []
    : await runBoundedDbQuery((db) =>
        db.vendor.findMany({
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
            products: { some: { inStock: true, status: "APPROVED" } },
          },
          select: {
            id: true,
            name: true,
            slug: true,
            email: true,
            updatedAt: true,
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
            cuisine: true,
            storeType: true,
            temporaryClosed: true,
            liquorLicenceExpiry: true,
            liquorVerificationStatus: true,
            deliveryFee: true,
            etaMins: true,
            _count: { select: { products: true, items: true, hours: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 5000,
        }),
      ).catch(() => []);

  const publicVendorRows = vendorRows.filter((vendor) =>
    isPublicMarketplaceVendor({
      ...vendor,
      hasBanking: true,
      hasKycDocuments: true,
    }),
  );

  const vendorRoutes: MetadataRoute.Sitemap =
    publicVendorRows.length > 0
      ? publicVendorRows.map((vendor) => ({
          url: `${SITE_URL}/vendors/${vendor.slug}`,
          lastModified: vendor.updatedAt,
          changeFrequency: "daily",
          priority: 0.9,
        }))
      : shouldPreferCatalogFallback()
        ? getFallbackVendorCards().map((vendor) => ({
            url: `${SITE_URL}/vendors/${vendor.slug}`,
            changeFrequency: "daily",
            priority: 0.9,
          }))
        : [];

  const publicVendorIds = publicVendorRows.map((vendor) => vendor.id);
  const [productRows, licensedVendorRows] =
    shouldPreferCatalogFallback() || publicVendorIds.length === 0
      ? [[], []]
      : await Promise.all([
          runBoundedDbQuery((db) =>
            db.product.findMany({
              where: {
                vendorId: { in: publicVendorIds },
                inStock: true,
                status: "APPROVED",
                vendor: {
                  isActive: true,
                  status: { in: ["ACTIVE", "APPROVED"] },
                  temporaryClosed: false,
                },
              },
              select: {
                id: true,
                vendorId: true,
                name: true,
                status: true,
                inStock: true,
                isAlcohol: true,
                updatedAt: true,
              },
              orderBy: { updatedAt: "desc" },
              take: 5000,
            }),
          ).catch(() => []),
          runBoundedDbQuery((db) =>
            db.vendor.findMany({
              where: {
                id: { in: publicVendorIds },
                liquorVerificationStatus: "APPROVED",
                liquorLicenceUrl: { not: null },
                liquorLicenceExpiry: { gt: new Date() },
              },
              select: { id: true },
              take: 5000,
            }),
          ).catch(() => []),
        ]);

  const licensedVendorIds = new Set(licensedVendorRows.map((vendor) => vendor.id));
  const publicVendorsById = new Map(publicVendorRows.map((vendor) => [vendor.id, vendor]));
  const productRoutes: MetadataRoute.Sitemap =
    productRows.length > 0
      ? productRows
          .filter((product) => {
            const vendor = publicVendorsById.get(product.vendorId);
            if (!vendor) return false;
            return isPublicMarketplaceProduct({
              ...product,
              vendor: {
                ...vendor,
                hasBanking: true,
                hasKycDocuments: true,
                liquorLicenceUrl: licensedVendorIds.has(product.vendorId) ? "verified" : null,
              },
            });
          })
          .map((product) => ({
            url: `${SITE_URL}/products/${encodeURIComponent(product.id)}`,
            lastModified: product.updatedAt,
            changeFrequency: "daily" as const,
            priority: 0.75,
          }))
      : shouldPreferCatalogFallback()
        ? getFallbackProducts().map((product) => ({
            url: `${SITE_URL}/products/${encodeURIComponent(product.id)}`,
            changeFrequency: "daily" as const,
            priority: 0.75,
          }))
        : [];

  return [...staticRoutes, ...categoryRoutes, ...vendorRoutes, ...productRoutes];
}
