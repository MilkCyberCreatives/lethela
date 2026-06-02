import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-auth";
import { getCatalogMode } from "@/lib/catalog-runtime";
import { withQueryTimeout } from "@/lib/query-timeout";
import { hasWebPushConfig } from "@/lib/web-push";
import { hasStorageConfig } from "@/server/supabase";
import { prisma, prismaRuntimeInfo } from "@/server/db";

function configured(name: string) {
  return Boolean(process.env[name]?.trim());
}

function isFalse(name: string) {
  return process.env[name]?.trim() === "false";
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

  const [
    activeVendors,
    activeProducts,
    paidOrders,
    pendingVendors,
    pendingRiders,
    approvedRiders,
    users,
  ] = await Promise.all([
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

  const checks = [
    item(
      "Production database",
      prismaRuntimeInfo.provider === "postgresql" &&
        prismaRuntimeInfo.persistent &&
        prismaRuntimeInfo.scalable,
      `provider=${prismaRuntimeInfo.provider || "unknown"}`,
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
    item("Durable uploads", hasStorageConfig(), "Supabase storage configured"),
    item(
      "Active catalog",
      getCatalogMode() === "live" && activeVendors > 0 && activeProducts > 0,
      `${activeVendors} vendors, ${activeProducts} products`,
    ),
    item("Approved riders", approvedRiders > 0, `${approvedRiders} approved rider(s)`),
    item(
      "Applicant email notifications",
      configured("RESEND_API_KEY") &&
        (configured("ADMIN_NOTIFICATION_EMAIL_FROM") || configured("PASSWORD_RESET_EMAIL_FROM")),
      "Resend API key and verified sender email",
    ),
    item(
      "Applicant WhatsApp notifications",
      configured("TWILIO_ACCOUNT_SID") &&
        configured("TWILIO_AUTH_TOKEN") &&
        configured("TWILIO_WHATSAPP_FROM"),
      "Twilio WhatsApp sender configured",
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
    },
  });
}
