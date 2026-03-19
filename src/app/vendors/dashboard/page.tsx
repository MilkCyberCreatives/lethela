import dynamic from "next/dynamic";
import Link from "next/link";
import type { ReactNode } from "react";
import MainHeader from "@/components/MainHeader";
import { requireVendor } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { getOrderWhatsAppPhone } from "@/lib/whatsapp-order";

const InsightsCard = dynamic(() => import("@/components/dashboard/InsightsCard"), {
  loading: () => <DashboardPanelSkeleton lines={4} />,
});
const ProfileManager = dynamic(() => import("@/components/dashboard/ProfileManager"), {
  loading: () => <DashboardPanelSkeleton lines={6} />,
});
const OrdersManager = dynamic(() => import("@/components/dashboard/OrdersManager"), {
  loading: () => <DashboardPanelSkeleton lines={5} />,
});
const ProductsManager = dynamic(() => import("@/components/dashboard/ProductsManager"), {
  loading: () => <DashboardPanelSkeleton lines={5} />,
});
const MenuManager = dynamic(() => import("@/components/dashboard/MenuManager"), {
  loading: () => <DashboardPanelSkeleton lines={6} />,
});
const SalesCharts = dynamic(() => import("@/components/dashboard/SalesCharts"), {
  loading: () => <DashboardPanelSkeleton lines={6} />,
});
const PayoutsPanel = dynamic(() => import("@/components/dashboard/PayoutsPanel"), {
  loading: () => <DashboardPanelSkeleton lines={6} />,
});
const NotificationsPanel = dynamic(() => import("@/components/dashboard/NotificationsPanel"), {
  loading: () => <DashboardPanelSkeleton lines={5} />,
});
const FeedbackPanel = dynamic(() => import("@/components/dashboard/FeedbackPanel"), {
  loading: () => <DashboardPanelSkeleton lines={5} />,
});
const TeamManager = dynamic(() => import("@/components/dashboard/TeamManager"), {
  loading: () => <DashboardPanelSkeleton lines={5} />,
});
const OperatingHours = dynamic(() => import("@/components/dashboard/OperatingHours"), {
  loading: () => <DashboardPanelSkeleton lines={4} />,
});
const SpecialsManager = dynamic(() => import("@/components/dashboard/SpecialsManager"), {
  loading: () => <DashboardPanelSkeleton lines={4} />,
});
const BulkImportProducts = dynamic(() => import("@/components/dashboard/BulkImportProducts"), {
  loading: () => <DashboardPanelSkeleton lines={4} />,
});
const AutomationsPanel = dynamic(() => import("@/components/dashboard/AutomationsPanel"), {
  loading: () => <DashboardPanelSkeleton lines={4} />,
});
const AdvancedAutomationsPanel = dynamic(() => import("@/components/dashboard/AdvancedAutomationsPanel"), {
  loading: () => <DashboardPanelSkeleton lines={5} />,
});

type SearchParams = Promise<{ tab?: string }> | { tab?: string };
type DashboardTab =
  | "overview"
  | "analytics"
  | "orders"
  | "menu"
  | "payouts"
  | "operations"
  | "experience"
  | "team"
  | "profile"
  | "hours"
  | "specials"
  | "automations"
  | "support";

const tabs: Array<{ tab: DashboardTab; label: string; hint: string }> = [
  { tab: "overview", label: "Overview", hint: "Clean home view" },
  { tab: "analytics", label: "Analytics", hint: "Sales and trends" },
  { tab: "orders", label: "Orders", hint: "Live operations" },
  { tab: "menu", label: "Menu", hint: "Public menu, products and imports" },
  { tab: "payouts", label: "Payouts", hint: "Settlements and cash flow" },
  { tab: "operations", label: "Operations", hint: "Notifications and issues" },
  { tab: "experience", label: "Feedback", hint: "Ratings and service signals" },
  { tab: "team", label: "Team", hint: "Staff and permissions" },
  { tab: "profile", label: "Profile", hint: "Store settings" },
  { tab: "hours", label: "Hours", hint: "Trading schedule" },
  { tab: "specials", label: "Specials", hint: "Promotions" },
  { tab: "automations", label: "Automations", hint: "AI actions" },
  { tab: "support", label: "Support", hint: "Help and launch" },
];

function resolveTab(value: string | undefined): DashboardTab {
  if (value === "products" || value === "imports") {
    return "menu";
  }
  return tabs.some((item) => item.tab === value) ? (value as DashboardTab) : "overview";
}

function money(cents: number) {
  return `R${(cents / 100).toFixed(2)}`;
}

function countsTowardRevenue(paymentStatus: string, orderStatus: string) {
  const payment = String(paymentStatus || "").toUpperCase();
  const status = String(orderStatus || "").toUpperCase();
  return payment !== "FAILED" && payment !== "CANCELLED" && status !== "CANCELED";
}

function DashboardPanelSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="h-5 w-40 rounded bg-white/10" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="h-10 rounded-xl bg-white/10" />
        ))}
      </div>
    </div>
  );
}

function SupportCard() {
  const whatsappHref = `https://wa.me/${getOrderWhatsAppPhone()}`;
  return (
    <div className="rounded-2xl border border-lethela-primary/20 bg-[#141b43] p-5">
      <div className="mb-2 text-sm font-semibold text-white">Support</div>
      <p className="text-sm text-white/80">
        Need help? Message Lethela on WhatsApp:{" "}
        <a className="underline" href={whatsappHref} target="_blank" rel="noreferrer">
          +27 72 390 8919
        </a>
      </p>
      <p className="mt-3 text-xs text-white/60">
        Use the tabs to manage products, orders, hours, specials, and store settings without a long landing page.
      </p>
    </div>
  );
}

export default async function VendorDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolved = await Promise.resolve(searchParams);
  const activeTab = resolveTab(resolved.tab);

  let authError: string | null = null;
  let vendorId: string | null = null;
  let vendorSlug: string | null = null;
  let vendorRole: string | null = null;

  try {
    const session = await requireVendor("STAFF");
    vendorId = session.vendorId;
    vendorSlug = session.vendorSlug;
    vendorRole = session.role;
  } catch (error: unknown) {
    authError = error instanceof Error ? error.message : "You do not have access to the vendor dashboard.";
  }

  if (authError || !vendorId) {
    return (
      <main className="min-h-screen bg-lethela-secondary text-white">
        <MainHeader />
        <section className="container py-12">
          <div className="max-w-2xl rounded-2xl border border-white/15 bg-white/5 p-6">
            <h1 className="text-2xl font-bold">Dashboard access blocked</h1>
            <p className="mt-3 text-sm text-white/80">{authError || "Unable to resolve vendor access."}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/vendors/register" className="rounded-full border border-white/30 px-4 py-2 text-xs font-medium hover:border-lethela-primary hover:text-lethela-primary">Go to vendor registration</Link>
              <Link href="/vendors/signin" className="rounded-full border border-white/30 px-4 py-2 text-xs font-medium hover:border-lethela-primary hover:text-lethela-primary">Vendor sign in</Link>
              <Link href="/admin" className="rounded-full border border-white/30 px-4 py-2 text-xs font-medium hover:border-lethela-primary hover:text-lethela-primary">Open admin approvals</Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [vendor, orders, products, hours, specials, lateFlags] = await Promise.all([
    prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        isActive: true,
        suburb: true,
        city: true,
        phone: true,
        address: true,
        latitude: true,
        longitude: true,
        kycIdUrl: true,
        kycProofUrl: true,
        updatedAt: true,
        _count: { select: { products: true, orders: true, specials: true, hours: true, sections: true, items: true } },
      },
    }),
    prisma.order.findMany({
      where: { vendorId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        status: true,
        paymentStatus: true,
        totalCents: true,
        items: { select: { qty: true, product: { select: { name: true } } } },
      },
    }),
    prisma.product.findMany({
      where: { vendorId },
      select: { name: true, inStock: true },
    }),
    prisma.operatingHour.findMany({
      where: { vendorId, closed: false },
      select: { day: true },
    }),
    prisma.special.findMany({
      where: { vendorId },
      orderBy: { startsAt: "asc" },
      select: { title: true, startsAt: true, endsAt: true, draft: true },
    }),
    prisma.lateOrderFlag.findMany({
      where: { vendorId, resolved: false },
      take: 3,
      orderBy: { createdAt: "desc" },
      select: { orderPublic: true, etaMinutes: true, aiMessage: true },
    }),
  ]);

  const progressChecks = [
    Boolean(vendor?.phone && vendor?.address && vendor?.city && vendor?.suburb),
    Boolean(vendor?.kycIdUrl && vendor?.kycProofUrl),
    Boolean(vendor?._count.products && vendor._count.products >= 5),
    Boolean(vendor?._count.hours),
  ];
  const progressPct = Math.round((progressChecks.filter(Boolean).length / progressChecks.length) * 100);
  const revenue30 = orders.reduce(
    (sum, order) =>
      countsTowardRevenue(order.paymentStatus, order.status) ? sum + order.totalCents : sum,
    0
  );
  const ordersToday = orders.filter((order) => new Date(order.createdAt) >= today).length;
  const pendingPayments = orders.filter((order) => String(order.paymentStatus).toUpperCase() === "PENDING").length;
  const inStock = products.filter((product) => product.inStock).length;
  const publishedSpecials = specials.filter((item) => !item.draft).length;
  const unresolvedLateCount = lateFlags.length;
  const topProducts = Object.entries(
    orders.flatMap((order) => order.items).reduce<Record<string, number>>((acc, item) => {
      const key = item.product?.name || "Unknown item";
      acc[key] = (acc[key] || 0) + item.qty;
      return acc;
    }, {})
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3);
  const nextPromo = specials.find((item) => new Date(item.startsAt).getTime() > Date.now()) || null;
  const issues = [
    !vendor?.phone ? "Add a phone or WhatsApp number." : null,
    !vendor?.address ? "Add your full street address." : null,
    vendor?.latitude == null || vendor?.longitude == null ? "Add store coordinates for map tracking." : null,
    !vendor?._count.hours ? "Set your trading hours." : null,
    !vendor?._count.sections ? "Create menu sections for the public restaurant page." : null,
    !vendor?._count.items ? "Add customer-facing menu items and publish them." : null,
    products.length < 5 ? "Add more products so the menu feels complete." : null,
    pendingPayments > 0 ? `${pendingPayments} recent order(s) still show pending payment.` : null,
  ].filter((item): item is string => Boolean(item));

  const overview = (
    <div className="grid h-full gap-4 xl:grid-cols-[1.15fr,0.85fr]">
      <div className="grid content-start gap-4">
        <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-white/65">Vendor control center</p>
              <h1 className="mt-1 text-2xl font-bold">{vendor?.name || "Vendor Dashboard"}</h1>
              <p className="mt-2 text-sm text-white/75">
                {vendor?.suburb && vendor?.city ? `${vendor.suburb}, ${vendor.city}` : "Location not set"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-white/20 px-3 py-1">{vendor?.status || "PENDING"}</span>
                <span className="rounded-full border border-white/20 px-3 py-1">{vendorRole || "STAFF"}</span>
                <span className="rounded-full border border-white/20 px-3 py-1">{progressPct}% ready</span>
                <span className="rounded-full border border-white/20 px-3 py-1">{vendor?.isActive ? "Store live" : "Store paused"}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {vendorSlug ? <Link href={`/vendors/${vendorSlug}`} className="rounded-full border border-white/30 px-4 py-2 text-xs font-medium hover:border-lethela-primary hover:text-lethela-primary">View public profile</Link> : null}
              <Link href="/vendors/dashboard?tab=menu" className="rounded-full border border-white/30 px-4 py-2 text-xs font-medium hover:border-lethela-primary hover:text-lethela-primary">Manage menu</Link>
              <Link href="/vendors/dashboard?tab=specials&action=create" className="rounded-full border border-white/30 px-4 py-2 text-xs font-medium hover:border-lethela-primary hover:text-lethela-primary">Create special</Link>
              <Link href="/vendors/dashboard?tab=orders" className="rounded-full border border-white/30 px-4 py-2 text-xs font-medium hover:border-lethela-primary hover:text-lethela-primary">Open orders</Link>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Revenue" value={money(revenue30)} hint="Last 30 days" />
          <MetricCard label="Orders today" value={String(ordersToday)} hint="Live activity" />
          <MetricCard label="Products live" value={`${inStock}/${products.length || 0}`} hint="In stock now" />
          <MetricCard label="Open days" value={`${hours.length}/7`} hint="Trading schedule" />
          <MetricCard label="Specials live" value={String(publishedSpecials)} hint="Published promos" />
          <MetricCard label="Late flags" value={String(unresolvedLateCount)} hint="Needs follow-up" />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <InfoCard title="Important right now">
            {issues.length > 0 ? issues.slice(0, 3).map((issue) => (
              <div key={issue} className="rounded-lg border border-amber-200/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-50">{issue}</div>
            )) : <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-sm text-white/70">No urgent issues detected.</div>}
          </InfoCard>
          <InfoCard title="Best sellers">
            {topProducts.length > 0 ? topProducts.map(([name, qty], index) => (
              <div key={name} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm">
                <span>{index + 1}. {name}</span>
                <span className="font-semibold">{qty} sold</span>
              </div>
            )) : <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-sm text-white/60">Sales data appears here once orders start coming in.</div>}
          </InfoCard>
          <InfoCard title="Launch readiness">
            <MiniStat label="Profile completion" value={`${progressPct}%`} />
            <MiniStat label="Menu sections" value={String(vendor?._count.sections ?? 0)} />
            <MiniStat label="Menu items" value={String(vendor?._count.items ?? 0)} />
            <MiniStat label="Store status" value={vendor?.isActive ? "Accepting orders" : "Paused"} />
          </InfoCard>
        </div>
      </div>

      <div className="grid content-start gap-4">
          <InfoCard title="Store overview">
            <MiniStat label="Products" value={String(vendor?._count.products ?? 0)} />
            <MiniStat label="Menu items" value={String(vendor?._count.items ?? 0)} />
            <MiniStat label="Sections" value={String(vendor?._count.sections ?? 0)} />
            <MiniStat label="Orders" value={String(vendor?._count.orders ?? 0)} />
            <MiniStat label="Specials" value={String(vendor?._count.specials ?? 0)} />
            <MiniStat label="Pending payments" value={String(pendingPayments)} />
          </InfoCard>
        <InfoCard title="Next promo">
          <div className="rounded-lg border border-white/10 px-3 py-3 text-sm">
            <div className="font-semibold">{nextPromo ? nextPromo.title : "No upcoming promo"}</div>
            <div className="mt-1 text-xs text-white/65">
              {nextPromo ? new Date(nextPromo.startsAt).toLocaleString() : "Create a future special to plan demand ahead."}
            </div>
          </div>
        </InfoCard>
        {lateFlags.length > 0 ? (
          <InfoCard title="Attention needed">
            {lateFlags.map((flag) => (
              <div key={flag.orderPublic} className="rounded-lg border border-white/10 px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{flag.orderPublic}</span>
                  <span className="text-xs text-white/55">ETA {flag.etaMinutes} min</span>
                </div>
                <p className="mt-1 text-xs text-white/65">{flag.aiMessage || "Late delivery attention needed."}</p>
              </div>
            ))}
          </InfoCard>
        ) : null}
        <InfoCard title="Trading week">
          <MiniStat label="Open days set" value={`${hours.length} / 7`} />
          <MiniStat label="Products in stock" value={`${inStock} / ${products.length || 0}`} />
          <MiniStat label="Pending payments" value={String(pendingPayments)} />
          <MiniStat label="Active specials" value={String(publishedSpecials)} />
        </InfoCard>
      </div>
    </div>
  );

  let title = "Overview";
  let content: ReactNode = overview;
  switch (activeTab) {
    case "analytics":
      title = "Analytics";
      content = <SalesCharts />;
      break;
    case "orders":
      title = "Orders";
      content = <OrdersManager />;
      break;
    case "menu":
      title = "Menu";
      content = <div className="grid gap-4"><MenuManager /><ProductsManager /><BulkImportProducts /></div>;
      break;
    case "payouts":
      title = "Payouts";
      content = <PayoutsPanel />;
      break;
    case "operations":
      title = "Operations";
      content = <NotificationsPanel />;
      break;
    case "experience":
      title = "Feedback";
      content = <FeedbackPanel />;
      break;
    case "team":
      title = "Team";
      content = <TeamManager />;
      break;
    case "profile":
      title = "Profile";
      content = <ProfileManager />;
      break;
    case "hours":
      title = "Hours";
      content = <OperatingHours />;
      break;
    case "specials":
      title = "Specials";
      content = <SpecialsManager />;
      break;
    case "automations":
      title = "Automations";
      content = <div className="grid gap-4"><div className="grid gap-4 xl:grid-cols-2"><AutomationsPanel /><AdvancedAutomationsPanel /></div><InsightsCard /></div>;
      break;
    case "support":
      title = "Support";
      content = <SupportCard />;
      break;
    default:
      break;
  }

  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />
      <section className="relative w-full px-4 py-6 sm:px-6 lg:h-[calc(100vh-88px)] lg:px-8 xl:px-10">
        <div className="grid h-full gap-6 lg:grid-cols-[270px,minmax(0,1fr)]">
          <aside className="rounded-2xl border border-white/10 bg-[#0f1637] p-4 lg:h-full">
            <div className="border-b border-white/10 pb-4">
              <p className="text-xs uppercase tracking-[0.14em] text-white/55">Dashboard</p>
              <h2 className="mt-2 text-lg font-semibold">{vendor?.name || "Vendor"}</h2>
              <p className="mt-1 text-xs text-white/60">{vendor?.suburb && vendor?.city ? `${vendor.suburb}, ${vendor.city}` : "Location not set"}</p>
            </div>
            <nav className="mt-4 grid gap-2">
              {tabs.map((item) => (
                <Link
                  key={item.tab}
                  href={`/vendors/dashboard?tab=${item.tab}`}
                  className={`rounded-xl border px-3 py-3 transition-colors duration-200 ${activeTab === item.tab ? "border-lethela-primary/70 bg-lethela-primary/12" : "border-white/10 bg-black/10 hover:border-lethela-primary/50 hover:bg-white/10"}`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <span className={`h-2 w-2 rounded-full ${activeTab === item.tab ? "bg-lethela-primary" : "bg-white/25"}`} />
                    {item.label}
                  </div>
                  <div className="mt-1 text-xs text-white/55">{item.hint}</div>
                </Link>
              ))}
            </nav>
          </aside>

          <div className="rounded-2xl border border-white/10 bg-[#0b112a] p-4 lg:h-full lg:overflow-hidden">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-lethela-primary/85">Current view</p>
                <h2 className="mt-1 text-xl font-semibold">{title}</h2>
              </div>
              {activeTab !== "overview" ? <Link href="/vendors/dashboard?tab=overview" className="rounded-full border border-white/25 px-4 py-2 text-xs font-medium hover:border-lethela-primary hover:text-lethela-primary">Back to overview</Link> : null}
            </div>
            <div className={activeTab === "overview" ? "lg:h-[calc(100%-73px)] lg:overflow-hidden" : "lg:h-[calc(100%-73px)] lg:overflow-y-auto lg:pr-1"}>
              {content}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-lethela-primary/20 bg-[#141b43] p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-lethela-primary/85">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-white/60">{hint}</p>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.12em] text-white/82">
        <span className="h-2.5 w-2.5 rounded-full bg-lethela-primary" />
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-sm">
      <span>{label}</span>
      <span className="font-semibold text-lethela-primary">{value}</span>
    </div>
  );
}
