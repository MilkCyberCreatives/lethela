import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-auth";
import { getCatalogMode } from "@/lib/catalog-runtime";
import { hasWhatsAppChannel } from "@/lib/notification-channels";
import { withQueryTimeout } from "@/lib/query-timeout";
import { hasWebPushConfig } from "@/lib/web-push";
import { hasStorageConfig, storageProvider } from "@/server/supabase";
import { getSqliteReadinessCounts } from "@/lib/sqlite-readiness";
import { prisma, prismaRuntimeInfo } from "@/server/db";

function configured(name: string) {
  return Boolean(process.env[name]?.trim());
}

function isFalse(name: string) {
  return process.env[name]?.trim() === "false";
}

function numberSetting(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function item(
  label: string,
  ok: boolean,
  detail: string,
  severity: "required" | "recommended" = "required",
) {
  return { label, ok, detail, severity };
}

export async function GET(req: NextRequest) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const sqliteCounts = await getSqliteReadinessCounts();
  const [
    activeVendors,
    activeProducts,
    paidOrders,
    pendingVendors,
    pendingRiders,
    approvedRiders,
    users,
  ] = sqliteCounts
    ? [
        sqliteCounts.activeVendors,
        sqliteCounts.activeProducts,
        sqliteCounts.paidOrders,
        sqliteCounts.pendingVendors,
        sqliteCounts.pendingRiders + sqliteCounts.underReviewRiders,
        sqliteCounts.approvedRiders,
        sqliteCounts.users,
      ]
    : await Promise.all([
        withQueryTimeout(prisma.vendor.count({ where: { isActive: true, status: "ACTIVE" } }), 0),
        withQueryTimeout(
          prisma.product.count({
            where: { inStock: true, vendor: { isActive: true, status: "ACTIVE" } },
          }),
          0,
        ),
        withQueryTimeout(
          prisma.order.count({ where: { paymentStatus: { in: ["PAID", "SUCCESS"] } } }),
          0,
        ),
        withQueryTimeout(prisma.vendor.count({ where: { status: "PENDING" } }), 0),
        withQueryTimeout(
          prisma.riderApplication.count({ where: { status: { in: ["PENDING", "UNDER_REVIEW"] } } }),
          0,
        ),
        withQueryTimeout(prisma.riderApplication.count({ where: { status: "APPROVED" } }), 0),
        withQueryTimeout(prisma.user.count(), 0),
      ]);

  const pilotMinimums = {
    vendors: numberSetting("MIN_PILOT_VENDORS", 1),
    products: numberSetting("MIN_PILOT_PRODUCTS", 5),
    riders: numberSetting("MIN_PILOT_RIDERS", 1),
    paidOrders: numberSetting("MIN_PILOT_PAID_ORDERS", 1),
  };
  const publicMinimums = {
    vendors: numberSetting("MIN_PUBLIC_VENDORS", 3),
    products: numberSetting("MIN_PUBLIC_PRODUCTS", 20),
    riders: numberSetting("MIN_PUBLIC_RIDERS", 2),
    paidOrders: numberSetting("MIN_PUBLIC_PAID_ORDERS", 5),
  };

  const checks = [
    item(
      "Production database",
      prismaRuntimeInfo.persistent,
      `provider=${prismaRuntimeInfo.provider || "unknown"}, scalable=${prismaRuntimeInfo.scalable}`,
    ),
    item(
      "Canonical URL",
      configured("NEXT_PUBLIC_SITE_URL") && configured("NEXTAUTH_URL"),
      "NEXT_PUBLIC_SITE_URL and NEXTAUTH_URL",
    ),
    item(
      "Authentication secrets",
      configured("NEXTAUTH_SECRET") && configured("VENDOR_SESSION_SECRET"),
      "NextAuth and vendor session secrets",
    ),
    item("Admin owner access", configured("ADMIN_APPROVAL_KEY"), "ADMIN_APPROVAL_KEY configured"),
    item(
      "Rider console security",
      configured("RIDER_CONSOLE_SECRET") || configured("NEXTAUTH_SECRET"),
      "Secure rider console tokens",
    ),
    item(
      "Ozow live checkout",
      configured("OZOW_SITE_CODE") && configured("OZOW_PRIVATE_KEY"),
      "Site code and private key configured",
    ),
    item(
      "Ozow live mode",
      isFalse("OZOW_IS_TEST") && isFalse("NEXT_PUBLIC_OZOW_IS_TEST"),
      "Both Ozow test flags set to false",
    ),
    item(
      "Google Maps",
      configured("GOOGLE_MAPS_API_KEY") && configured("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"),
      "Server and browser map keys",
    ),
    item("Durable uploads", hasStorageConfig(), `${storageProvider()} storage configured`),
    item(
      "Active catalog",
      getCatalogMode() === "live" && activeVendors > 0 && activeProducts > 0,
      `${activeVendors} vendors, ${activeProducts} products`,
    ),
    item("Approved riders", approvedRiders > 0, `${approvedRiders} approved rider(s)`),
    item(
      "Controlled pilot gate",
      activeVendors >= pilotMinimums.vendors &&
        activeProducts >= pilotMinimums.products &&
        approvedRiders >= pilotMinimums.riders &&
        paidOrders >= pilotMinimums.paidOrders,
      `${activeVendors}/${pilotMinimums.vendors} vendor(s), ${activeProducts}/${pilotMinimums.products} product(s), ${approvedRiders}/${pilotMinimums.riders} rider(s), ${paidOrders}/${pilotMinimums.paidOrders} paid proof order(s)`,
    ),
    item(
      "Public marketing gate",
      activeVendors >= publicMinimums.vendors &&
        activeProducts >= publicMinimums.products &&
        approvedRiders >= publicMinimums.riders &&
        paidOrders >= publicMinimums.paidOrders,
      `${activeVendors}/${publicMinimums.vendors} vendor(s), ${activeProducts}/${publicMinimums.products} product(s), ${approvedRiders}/${publicMinimums.riders} rider(s), ${paidOrders}/${publicMinimums.paidOrders} paid proof order(s)`,
      "recommended",
    ),
    item(
      "Applicant email notifications",
      configured("RESEND_API_KEY") &&
        (configured("ADMIN_NOTIFICATION_EMAIL_FROM") || configured("PASSWORD_RESET_EMAIL_FROM")),
      "Resend API key and verified sender email",
    ),
    item(
      "Applicant WhatsApp notifications",
      hasWhatsAppChannel(),
      "Twilio WhatsApp sender configured",
    ),
    item(
      "Vendor WhatsApp order alerts",
      hasWhatsAppChannel(),
      "Paid orders are sent to the vendor phone number after Ozow confirms payment",
    ),
    item(
      "Owner notification recipients",
      configured("ADMIN_NOTIFICATION_EMAILS") || configured("ADMIN_NOTIFICATION_WHATSAPP_TO"),
      "Owner email or WhatsApp recipients configured",
    ),
    item(
      "Realtime updates",
      configured("PUSHER_APP_ID") && configured("PUSHER_KEY") && configured("PUSHER_SECRET"),
      "Pusher server keys",
      "recommended",
    ),
    item("Web push", hasWebPushConfig(), "VAPID keys configured", "recommended"),
    item("Sentry monitoring", configured("SENTRY_DSN"), "Sentry DSN configured", "recommended"),
    item("Search/AI index", true, "/sitemap.xml, /robots.txt, /llms.txt, /ai.txt", "recommended"),
  ];

  const required = checks.filter((check) => check.severity === "required");
  const recommended = checks.filter((check) => check.severity === "recommended");

  return NextResponse.json({
    ok: required.every((check) => check.ok),
    checks,
    summary: {
      requiredReady: required.filter((check) => check.ok).length,
      requiredTotal: required.length,
      recommendedReady: recommended.filter((check) => check.ok).length,
      recommendedTotal: recommended.length,
      activeVendors,
      activeProducts,
      paidOrders,
      pendingVendors,
      pendingRiders,
      approvedRiders,
      users,
      pilotMinimums,
      publicMinimums,
    },
  });
}
