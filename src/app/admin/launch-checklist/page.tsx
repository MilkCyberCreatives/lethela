import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { ADMIN_ACCESS_COOKIE_NAME, readAdminAccessToken } from "@/lib/admin-access";
import { getCatalogMode } from "@/lib/catalog-runtime";
import { hasWhatsAppChannel } from "@/lib/notification-channels";
import { withQueryTimeout } from "@/lib/query-timeout";
import { hasStorageConfig, storageProvider } from "@/server/supabase";
import { hasWebPushConfig } from "@/lib/web-push";
import { prisma, prismaRuntimeInfo } from "@/server/db";

function configured(name: string) {
  return Boolean(process.env[name]?.trim());
}

function falseFlag(name: string) {
  return process.env[name]?.trim() === "false";
}

function numberSetting(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function absoluteSqliteUrl(value = "") {
  if (!value.startsWith("file:")) return false;
  const body = value.slice("file:".length);
  return body.startsWith("/") || /^[A-Za-z]:\//.test(body);
}

function productionDatabaseReady() {
  if (prismaRuntimeInfo.provider === "postgresql" && prismaRuntimeInfo.scalable) return true;
  return prismaRuntimeInfo.provider === "sqlite" && absoluteSqliteUrl(prismaRuntimeInfo.url);
}

function durableStorageReady() {
  if (storageProvider() === "supabase") return true;
  return (
    storageProvider() === "local" &&
    configured("STORAGE_LOCAL_DIR") &&
    configured("STORAGE_PUBLIC_PATH")
  );
}

function ChecklistItem({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">{label}</h2>
          <p className="mt-1 text-sm text-white/65">{detail}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
            ok ? "border-emerald-300/40 text-emerald-100" : "border-amber-300/40 text-amber-100"
          }`}
        >
          {ok ? "Ready" : "Action"}
        </span>
      </div>
    </div>
  );
}

export default async function LaunchChecklistPage() {
  const cookieStore = await cookies();
  const hasAdminCookie = Boolean(
    readAdminAccessToken(cookieStore.get(ADMIN_ACCESS_COOKIE_NAME)?.value?.trim() || ""),
  );
  const session = await auth().catch(() => null);
  if (!hasAdminCookie && session?.user?.role !== "ADMIN") {
    redirect("/owner-access");
  }

  const [activeVendors, activeProducts, approvedRiders, paidOrders] = await Promise.all([
    withQueryTimeout(prisma.vendor.count({ where: { isActive: true, status: "ACTIVE" } }), 0),
    withQueryTimeout(
      prisma.product.count({
        where: { inStock: true, vendor: { isActive: true, status: "ACTIVE" } },
      }),
      0,
    ),
    withQueryTimeout(prisma.riderApplication.count({ where: { status: "APPROVED" } }), 0),
    withQueryTimeout(
      prisma.order.count({ where: { paymentStatus: { in: ["PAID", "SUCCESS"] } } }),
      0,
    ),
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
    {
      label: "Production database",
      ok: productionDatabaseReady(),
      detail: `Provider: ${prismaRuntimeInfo.provider}. Scalable: ${prismaRuntimeInfo.scalable}.`,
    },
    {
      label: "Live Ozow configuration",
      ok:
        configured("OZOW_SITE_CODE") &&
        configured("OZOW_PRIVATE_KEY") &&
        falseFlag("OZOW_IS_TEST") &&
        falseFlag("NEXT_PUBLIC_OZOW_IS_TEST"),
      detail: "Ozow keys are configured and test flags are false.",
    },
    {
      label: "Real paid order proof",
      ok: paidOrders >= pilotMinimums.paidOrders,
      detail: `${paidOrders}/${pilotMinimums.paidOrders} paid proof order(s) recorded. Run low-value live payments before scaling traffic.`,
    },
    {
      label: "Active catalog",
      ok:
        getCatalogMode() === "live" &&
        activeVendors >= pilotMinimums.vendors &&
        activeProducts >= pilotMinimums.products,
      detail: `${activeVendors}/${pilotMinimums.vendors} active vendor(s), ${activeProducts}/${pilotMinimums.products} active product(s). Public marketing target: ${publicMinimums.vendors} vendor(s), ${publicMinimums.products} product(s).`,
    },
    {
      label: "Approved riders",
      ok: approvedRiders >= pilotMinimums.riders,
      detail: `${approvedRiders}/${pilotMinimums.riders} approved rider(s) available for pilot operations. Public marketing target: ${publicMinimums.riders}.`,
    },
    {
      label: "Public marketing gate",
      ok:
        activeVendors >= publicMinimums.vendors &&
        activeProducts >= publicMinimums.products &&
        approvedRiders >= publicMinimums.riders &&
        paidOrders >= publicMinimums.paidOrders,
      detail: `${activeVendors}/${publicMinimums.vendors} vendor(s), ${activeProducts}/${publicMinimums.products} product(s), ${approvedRiders}/${publicMinimums.riders} rider(s), ${paidOrders}/${publicMinimums.paidOrders} paid proof order(s).`,
    },
    {
      label: "Durable uploads",
      ok: hasStorageConfig() && durableStorageReady(),
      detail: `Storage provider: ${storageProvider()}. Local storage requires a persistent upload directory.`,
    },
    {
      label: "Vendor WhatsApp order alerts",
      ok: hasWhatsAppChannel(),
      detail: "Paid Ozow orders are sent to the vendor phone number and still appear on dashboard.",
    },
    {
      label: "Sentry monitoring",
      ok: configured("SENTRY_DSN"),
      detail: "Sentry DSN catches production runtime errors.",
    },
    {
      label: "Realtime updates",
      ok:
        configured("PUSHER_APP_ID") &&
        configured("PUSHER_KEY") &&
        configured("PUSHER_SECRET") &&
        configured("NEXT_PUBLIC_PUSHER_KEY"),
      detail: "Pusher enables live order status and rider location updates.",
    },
    {
      label: "Web push",
      ok: hasWebPushConfig(),
      detail: "VAPID keys are configured for browser notifications.",
    },
  ];

  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <section className="container py-10">
        <Link href="/admin" className="text-sm underline">
          Back to admin
        </Link>
        <p className="mt-6 text-xs uppercase tracking-[0.16em] text-lethela-primary">
          Owner operating checklist
        </p>
        <h1 className="mt-3 text-3xl font-bold">Operating readiness</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/70">
          This owner-only checklist separates code readiness from external configuration, real
          vendor supply, approved rider capacity and paid-order proof.
        </p>
        <div className="mt-6 grid gap-3">
          {checks.map((check) => (
            <ChecklistItem key={check.label} {...check} />
          ))}
        </div>
      </section>
    </main>
  );
}
