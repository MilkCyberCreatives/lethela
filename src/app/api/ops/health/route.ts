import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-auth";
import { getCatalogMode } from "@/lib/catalog-runtime";
import { withQueryTimeout } from "@/lib/query-timeout";
import { countRiderApplications } from "@/lib/rider-applications";
import { hasWhatsAppChannel } from "@/lib/notification-channels";
import { hasWebPushConfig } from "@/lib/web-push";
import { hasStorageConfig, storageProvider } from "@/server/supabase";
import { getSqliteReadinessCounts } from "@/lib/sqlite-readiness";
import { prisma, prismaRuntimeInfo } from "@/server/db";

export async function GET(req: NextRequest) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const sqliteCounts = await getSqliteReadinessCounts();
  const [
    activeVendors,
    activeProducts,
    pendingVendors,
    pendingRiders,
    underReviewRiders,
    paidOrders24h,
  ] = sqliteCounts
    ? [
        sqliteCounts.activeVendors,
        sqliteCounts.activeProducts,
        sqliteCounts.pendingVendors,
        sqliteCounts.pendingRiders,
        sqliteCounts.underReviewRiders,
        sqliteCounts.paidOrders24h,
      ]
    : await Promise.all([
        withQueryTimeout(
          prisma.vendor.count({
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
              products: { some: { inStock: true, isAlcohol: false } },
            },
          }),
          0,
        ),
        withQueryTimeout(
          prisma.product.count({
            where: {
              inStock: true,
              isAlcohol: false,
              vendor: {
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
              },
            },
          }),
          0,
        ),
        withQueryTimeout(
          prisma.vendor.count({
            where: { status: { in: ["PENDING", "SUBMITTED_FOR_APPROVAL", "CHANGES_REQUESTED"] } },
          }),
          0,
        ),
        withQueryTimeout(countRiderApplications("PENDING"), 0),
        withQueryTimeout(countRiderApplications("UNDER_REVIEW"), 0),
        withQueryTimeout(
          prisma.order.count({
            where: {
              paymentStatus: { in: ["PAID", "SUCCESS"] },
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
          }),
          0,
        ),
      ]);

  return NextResponse.json({
    ok: true,
    environment: process.env.NODE_ENV,
    services: {
      db: {
        ok: prismaRuntimeInfo.persistent,
        source: prismaRuntimeInfo.source,
        provider: prismaRuntimeInfo.provider,
        persistent: prismaRuntimeInfo.persistent,
        scalable: prismaRuntimeInfo.scalable,
      },
      storage: { ok: hasStorageConfig(), provider: storageProvider() },
      maps: Boolean(
        process.env.GOOGLE_MAPS_API_KEY?.trim() ||
          process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim(),
      ),
      webPush: hasWebPushConfig(),
      pusher: Boolean(
        process.env.PUSHER_APP_ID?.trim() &&
          process.env.PUSHER_KEY?.trim() &&
          process.env.PUSHER_SECRET?.trim() &&
          process.env.NEXT_PUBLIC_PUSHER_KEY?.trim(),
      ),
      ozow: Boolean(process.env.OZOW_SITE_CODE?.trim() && process.env.OZOW_PRIVATE_KEY?.trim()),
      vendorWhatsAppOrders: hasWhatsAppChannel(),
      gtm: Boolean(process.env.NEXT_PUBLIC_GTM_ID?.trim()),
      ga4: Boolean(process.env.NEXT_PUBLIC_GA4_ID?.trim()),
      metaPixel: Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim()),
    },
    catalog: {
      mode: getCatalogMode(),
      activeVendors,
      activeProducts,
    },
    queues: {
      pendingVendors,
      pendingRiders,
      underReviewRiders,
    },
    orders: {
      paidLast24h: paidOrders24h,
    },
  });
}
