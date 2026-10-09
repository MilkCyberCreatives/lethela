import dynamic from "next/dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  BarChart3,
  Bell,
  Clock,
  ExternalLink,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Plus,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Tag,
  UsersRound,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import DashboardShell, { type DashboardNavItem } from "@/components/dashboard/kit/DashboardShell";
import NotificationBell from "@/components/dashboard/NotificationBell";
import {
  ChecklistItem,
  EmptyState,
  Notice,
  PageHeader,
  Panel,
  ProgressBar,
  StatTile,
  StatusBadge,
  dashButton,
} from "@/components/dashboard/kit/ui";
import { getVendorSession } from "@/lib/authz";
import { prisma, prismaRuntimeInfo } from "@/lib/db";
import { getSqliteVendorDashboardData } from "@/lib/sqlite-vendor-dashboard";
import { getOrderWhatsAppPhone } from "@/lib/whatsapp-order";
import { getVendorReadiness, normalizeVendorStatus } from "@/lib/vendor-readiness";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata = buildNoIndexMetadata({
  title: "Vendor Dashboard",
  description: "Secure vendor operations dashboard.",
  path: "/vendors/dashboard",
});

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
const MessagesPanel = dynamic(() => import("@/components/dashboard/MessagesPanel"), {
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
const AdvancedAutomationsPanel = dynamic(
  () => import("@/components/dashboard/AdvancedAutomationsPanel"),
  {
    loading: () => <DashboardPanelSkeleton lines={5} />,
  },
);

type SearchParams =
  | Promise<{ tab?: string; welcome?: string; submitted?: string; submitError?: string }>
  | { tab?: string; welcome?: string; submitted?: string; submitError?: string };
type DashboardTab =
  | "overview"
  | "analytics"
  | "orders"
  | "menu"
  | "payouts"
  | "operations"
  | "messages"
  | "experience"
  | "team"
  | "profile"
  | "hours"
  | "specials"
  | "automations"
  | "support";

const tabs: Array<{
  tab: DashboardTab;
  label: string;
  shortLabel?: string;
  description: string;
  group?: string;
  icon: ReactNode;
}> = [
  {
    tab: "overview",
    label: "Home",
    description: "How your store is doing today.",
    icon: <LayoutDashboard />,
  },
  {
    tab: "orders",
    label: "Orders",
    description: "New and current orders. Accept them quickly so riders are not kept waiting.",
    icon: <ShoppingBag />,
  },
  {
    tab: "menu",
    label: "Menu",
    description: "What customers can order from you. Only published items with a price show.",
    icon: <UtensilsCrossed />,
  },
  {
    tab: "profile",
    label: "Store details",
    shortLabel: "Store",
    description: "Your store name, phone number and address. Riders use the address to collect.",
    group: "Store",
    icon: <Store />,
  },
  {
    tab: "hours",
    label: "Trading hours",
    description: "When customers can order from you.",
    group: "Store",
    icon: <Clock />,
  },
  {
    tab: "specials",
    label: "Specials",
    description: "Discounts and promotions on your store page.",
    group: "Store",
    icon: <Tag />,
  },
  {
    tab: "team",
    label: "Team",
    description: "People who help you run the store.",
    group: "Store",
    icon: <UsersRound />,
  },
  {
    tab: "analytics",
    label: "Sales",
    description: "Sales and orders over time.",
    group: "Money",
    icon: <BarChart3 />,
  },
  {
    tab: "payouts",
    label: "Payouts",
    description: "What Lethela owes you and what has been paid.",
    group: "Money",
    icon: <Wallet />,
  },
  {
    tab: "operations",
    label: "Notifications",
    description: "Order alerts and updates from Lethela.",
    group: "Updates",
    icon: <Bell />,
  },
  {
    tab: "messages",
    label: "Messages",
    description: "Messages between you and the Lethela team.",
    group: "Updates",
    icon: <MessageSquare />,
  },
  {
    tab: "experience",
    label: "Customer feedback",
    description: "What customers say about your food and service.",
    group: "Updates",
    icon: <Star />,
  },
  {
    tab: "automations",
    label: "Tips and tools",
    description: "Suggestions that help you sell more and stay on top of orders.",
    group: "Updates",
    icon: <Sparkles />,
  },
  {
    tab: "support",
    label: "Help",
    description: "Get help from the Lethela team.",
    group: "Updates",
    icon: <LifeBuoy />,
  },
];

// Where each approval check is completed.
const READINESS_LINKS: Record<string, string> = {
  "store-details": "/vendors/dashboard?tab=profile",
  "trading-address": "/vendors/dashboard?tab=profile#store-address",
  category: "/vendors/dashboard?tab=profile#store-extras",
  "operating-hours": "/vendors/dashboard?tab=hours",
  "preparation-time": "/vendors/dashboard?tab=profile#store-extras",
  "products-menu": "/vendors/dashboard?tab=menu",
  banking: "/vendors/dashboard?tab=profile#store-banking",
  "owner-documents": "/vendors/dashboard?tab=profile#store-documents",
};

const READINESS_HINTS: Record<string, string> = {
  "store-details": "The name customers see and a number Lethela can call.",
  "trading-address": "Street address and area, so riders can collect orders.",
  category: "Type of store and what you sell, for example kota or groceries.",
  "operating-hours": "At least one day you are open for orders.",
  "preparation-time": "How long an order usually takes to prepare.",
  "products-menu": "At least one item with a price.",
  banking: "Needed before your first payout.",
  "owner-documents": "ID and proof of address, if Lethela asks for them.",
};

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
  return (
    ["PAID", "SUCCESS"].includes(payment) &&
    !["CANCELED", "CANCELLED", "REFUNDED", "FAILED"].includes(status)
  );
}

function formatWhatsAppPhone(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("27") && digits.length === 11) {
    return `+27 ${digits.slice(2, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return digits ? `+${digits}` : "WhatsApp support";
}

function DashboardPanelSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5" aria-hidden="true">
      <div className="h-4 w-40 rounded bg-slate-100" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="h-10 rounded-lg bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

function SupportCard() {
  const whatsappPhone = getOrderWhatsAppPhone();
  const whatsappHref = `https://wa.me/${whatsappPhone}`;
  return (
    <Panel
      title="Talk to Lethela"
      description="We usually answer on WhatsApp during trading hours."
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          WhatsApp:{" "}
          <span className="font-semibold text-slate-900">{formatWhatsAppPhone(whatsappPhone)}</span>
        </p>
        <a className={dashButton.primary} href={whatsappHref} target="_blank" rel="noreferrer">
          <MessageSquare aria-hidden="true" />
          Message us on WhatsApp
        </a>
      </div>
    </Panel>
  );
}

function statusBadge(status: string | null | undefined) {
  const normalized = normalizeVendorStatus(status);
  if (normalized === "APPROVED") return <StatusBadge tone="success">Approved</StatusBadge>;
  if (normalized === "SUBMITTED" || normalized === "UNDER_REVIEW")
    return <StatusBadge tone="warning">Waiting for approval</StatusBadge>;
  if (normalized === "CHANGES_REQUESTED")
    return <StatusBadge tone="warning">Changes needed</StatusBadge>;
  if (normalized === "REJECTED") return <StatusBadge tone="danger">Not approved</StatusBadge>;
  if (normalized === "SUSPENDED") return <StatusBadge tone="danger">Paused by Lethela</StatusBadge>;
  return <StatusBadge tone="neutral">Setting up</StatusBadge>;
}

export default async function VendorDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolved = await Promise.resolve(searchParams);
  const activeTab = resolveTab(resolved.tab);

  let vendorId: string | null = null;
  let vendorSlug: string | null = null;

  try {
    const session = await getVendorSession();
    vendorId = session.vendorId;
    vendorSlug = session.vendorSlug;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Please sign in to open your vendor dashboard.";
    redirect(
      `/signin?tab=vendor&callbackUrl=/vendors/dashboard&message=${encodeURIComponent(message)}`,
    );
  }

  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const needsOverviewData = activeTab === "overview";
  const sqliteDashboard =
    prismaRuntimeInfo.provider === "sqlite" && needsOverviewData
      ? await getSqliteVendorDashboardData(vendorId, since)
      : null;
  const [vendor, orders, products, hours, specials, lateFlags] = sqliteDashboard
    ? [
        sqliteDashboard.vendor,
        sqliteDashboard.orders,
        sqliteDashboard.products,
        sqliteDashboard.hours,
        sqliteDashboard.specials,
        sqliteDashboard.lateFlags,
      ]
    : await Promise.all([
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
            email: true,
            address: true,
            province: true,
            municipality: true,
            township: true,
            sectionArea: true,
            storeType: true,
            cuisine: true,
            deliveryFee: true,
            etaMins: true,
            latitude: true,
            longitude: true,
            kycIdUrl: true,
            kycProofUrl: true,
            bankName: true,
            bankAccountName: true,
            bankAccountNumber: true,
            bankBranchCode: true,
            reviewReason: true,
            updatedAt: true,
            _count: {
              select: {
                products: true,
                orders: true,
                specials: true,
                hours: { where: { closed: false } },
                sections: true,
                items: true,
              },
            },
          },
        }),
        needsOverviewData
          ? prisma.order.findMany({
              where: { vendorId, createdAt: { gte: since } },
              orderBy: { createdAt: "desc" },
              select: {
                createdAt: true,
                status: true,
                paymentStatus: true,
                totalCents: true,
                items: { select: { qty: true, product: { select: { name: true } } } },
              },
            })
          : Promise.resolve([]),
        needsOverviewData
          ? prisma.product.findMany({
              where: { vendorId },
              select: { name: true, inStock: true },
            })
          : Promise.resolve([]),
        needsOverviewData
          ? prisma.operatingHour.findMany({
              where: { vendorId, closed: false },
              select: { day: true },
            })
          : Promise.resolve([]),
        needsOverviewData
          ? prisma.special.findMany({
              where: { vendorId },
              orderBy: { startsAt: "asc" },
              select: { title: true, startsAt: true, endsAt: true, draft: true },
            })
          : Promise.resolve([]),
        needsOverviewData
          ? prisma.lateOrderFlag.findMany({
              where: { vendorId, resolved: false },
              take: 3,
              orderBy: { createdAt: "desc" },
              select: { orderPublic: true, etaMinutes: true, aiMessage: true },
            })
          : Promise.resolve([]),
      ]);

  const readiness = getVendorReadiness({
    name: vendor?.name,
    email: vendor?.email,
    phone: vendor?.phone,
    address: vendor?.address,
    suburb: vendor?.suburb,
    city: vendor?.city,
    province: vendor?.province,
    municipality: vendor?.municipality,
    township: vendor?.township,
    sectionArea: vendor?.sectionArea,
    storeType: vendor?.storeType,
    cuisine: vendor?.cuisine,
    deliveryFee: vendor?.deliveryFee,
    etaMins: vendor?.etaMins,
    kycIdUrl: vendor?.kycIdUrl,
    kycProofUrl: vendor?.kycProofUrl,
    bankName: vendor?.bankName,
    bankAccountName: vendor?.bankAccountName,
    bankAccountNumber: vendor?.bankAccountNumber,
    bankBranchCode: vendor?.bankBranchCode,
    productCount: vendor?._count.products,
    menuItemCount: vendor?._count.items,
    operatingHoursCount: vendor?._count.hours,
  });
  const requiredChecks = readiness.checks.filter((check) => check.required);
  const optionalChecks = readiness.checks.filter((check) => !check.required);
  const vendorStatus = normalizeVendorStatus(vendor?.status);
  const approved = vendorStatus === "APPROVED";
  const waitingForApproval = vendorStatus === "SUBMITTED" || vendorStatus === "UNDER_REVIEW";
  const revenue30 = orders.reduce(
    (sum, order) =>
      countsTowardRevenue(order.paymentStatus, order.status) ? sum + order.totalCents : sum,
    0,
  );
  const ordersToday = orders.filter((order) => new Date(order.createdAt) >= today).length;
  const pendingPayments = orders.filter(
    (order) => String(order.paymentStatus).toUpperCase() === "PENDING",
  ).length;
  const inStock = products.filter((product) => product.inStock).length;
  const publishedSpecials = specials.filter((item) => !item.draft).length;
  const topProducts = Object.entries(
    orders
      .filter((order) => countsTowardRevenue(order.paymentStatus, order.status))
      .flatMap((order) => order.items)
      .reduce<Record<string, number>>((acc, item) => {
        const key = item.product?.name || "Unknown item";
        acc[key] = (acc[key] || 0) + item.qty;
        return acc;
      }, {}),
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5);
  const nextPromo = specials.find((item) => new Date(item.startsAt).getTime() > Date.now()) || null;
  const location =
    vendor?.suburb && vendor?.city ? `${vendor.suburb}, ${vendor.city}` : "Address not added yet";
  const issues: Array<{ text: string; href: string }> = [
    !vendor?.phone
      ? { text: "Add a phone or WhatsApp number.", href: "/vendors/dashboard?tab=profile" }
      : null,
    !vendor?.address
      ? {
          text: "Add your street address so riders can collect orders.",
          href: "/vendors/dashboard?tab=profile#store-address",
        }
      : null,
    vendor?.address && (vendor?.latitude == null || vendor?.longitude == null)
      ? {
          text: "Pin your store on the map for more accurate delivery fees.",
          href: "/vendors/dashboard?tab=profile#store-address",
        }
      : null,
    !vendor?._count.hours
      ? { text: "Set the days and times you are open.", href: "/vendors/dashboard?tab=hours" }
      : null,
    approved && !readiness.checks.find((check) => check.key === "banking")?.complete
      ? {
          text: "Add your banking details before your first payout.",
          href: "/vendors/dashboard?tab=profile#store-banking",
        }
      : null,
    !vendor?._count.products && !vendor?._count.items
      ? { text: "Add your first menu item with a price.", href: "/vendors/dashboard?tab=menu" }
      : null,
    products.length > 0 && inStock === 0
      ? {
          text: "Everything on your menu is marked out of stock.",
          href: "/vendors/dashboard?tab=menu",
        }
      : null,
    pendingPayments > 0
      ? {
          text: `${pendingPayments} recent order${pendingPayments === 1 ? "" : "s"} still waiting for payment.`,
          href: "/vendors/dashboard?tab=orders",
        }
      : null,
  ].filter((item): item is { text: string; href: string } => Boolean(item));

  const overview = (
    <div className="space-y-6">
      <PageHeader
        meta={
          <>
            {statusBadge(vendor?.status)}
            {approved ? (
              <StatusBadge tone={vendor?.isActive ? "success" : "neutral"}>
                {vendor?.isActive ? "Taking orders" : "Store paused"}
              </StatusBadge>
            ) : null}
          </>
        }
        title={vendor?.name || "Your store"}
        description={location}
        actions={
          <>
            {vendorSlug ? (
              <Link href={`/vendors/${vendorSlug}`} className={dashButton.secondary}>
                <ExternalLink aria-hidden="true" />
                View store page
              </Link>
            ) : null}
            <Link href="/vendors/dashboard?tab=menu" className={dashButton.primary}>
              <Plus aria-hidden="true" />
              Add menu item
            </Link>
          </>
        }
      />

      {vendor?.reviewReason && !approved ? (
        <Notice tone="warning" title="Message from Lethela">
          {vendor.reviewReason}
        </Notice>
      ) : null}

      {!approved ? (
        <Panel
          title={waitingForApproval ? "Waiting for approval" : "Get your store ready"}
          description={
            waitingForApproval
              ? "Lethela is checking your store. You can keep adding to your menu while you wait."
              : "Finish these steps, then send your store to Lethela for approval."
          }
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
            <div>
              <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-700">
                  {readiness.completedRequired} of {readiness.requiredTotal} steps done
                </span>
                <span className="tabular-nums text-slate-500">{readiness.percent}%</span>
              </div>
              <ProgressBar value={readiness.percent} label="Store setup progress" />
              <div className="mt-3 divide-y divide-slate-100">
                {requiredChecks.map((check) => (
                  <ChecklistItem
                    key={check.key}
                    done={check.complete}
                    label={check.label}
                    detail={READINESS_HINTS[check.key]}
                    href={READINESS_LINKS[check.key]}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-4 rounded-lg bg-slate-50 p-4">
              {optionalChecks.length > 0 ? (
                <div>
                  <p className="text-sm font-semibold text-slate-900">Can wait until later</p>
                  <div className="mt-1 divide-y divide-slate-200/70">
                    {optionalChecks.map((check) => (
                      <ChecklistItem
                        key={check.key}
                        done={check.complete}
                        label={check.label}
                        detail={READINESS_HINTS[check.key]}
                        href={READINESS_LINKS[check.key]}
                        optional
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              {waitingForApproval ? (
                <p className="text-sm text-slate-600">
                  We will let you know by WhatsApp or email as soon as your store is approved.
                </p>
              ) : (
                <form action="/api/vendors/profile/submit" method="post" className="mt-auto">
                  <button
                    className={`${dashButton.primary} w-full`}
                    disabled={!readiness.canSubmit}
                    title={
                      readiness.canSubmit
                        ? "Send your store to Lethela for approval"
                        : "Finish the steps on the left first"
                    }
                  >
                    Send for approval
                  </button>
                  {!readiness.canSubmit ? (
                    <p className="mt-2 text-center text-xs text-slate-500">
                      Finish the steps first.
                    </p>
                  ) : null}
                </form>
              )}
            </div>
          </div>
        </Panel>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatTile
          label="Orders today"
          value={ordersToday}
          hint="Open your orders"
          icon={<ShoppingBag />}
          href="/vendors/dashboard?tab=orders"
        />
        <StatTile
          label="Sales, 30 days"
          value={money(revenue30)}
          hint="Paid orders only"
          icon={<BarChart3 />}
          href="/vendors/dashboard?tab=analytics"
        />
        <StatTile
          label="Items in stock"
          value={`${inStock}/${products.length}`}
          hint="On your menu now"
          icon={<UtensilsCrossed />}
          href="/vendors/dashboard?tab=menu"
        />
        <StatTile
          label="Open days"
          value={`${hours.length}/7`}
          hint="Trading hours set"
          icon={<Clock />}
          href="/vendors/dashboard?tab=hours"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Needs your attention" padded={issues.length === 0 && lateFlags.length === 0}>
          {issues.length === 0 && lateFlags.length === 0 ? (
            <EmptyState compact title="All good" text="Nothing needs your attention right now." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {lateFlags.map((flag) => (
                <li key={flag.orderPublic}>
                  <Link
                    href="/vendors/dashboard?tab=orders"
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50 sm:px-5"
                  >
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-lethela-primary" />
                    <span className="min-w-0 text-sm">
                      <span className="font-semibold text-slate-900">
                        Order {flag.orderPublic} is running late
                      </span>
                      <span className="block text-slate-500">
                        {flag.aiMessage || `Expected in ${flag.etaMinutes} minutes.`}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
              {issues.map((issue) => (
                <li key={issue.text}>
                  <Link
                    href={issue.href}
                    className="flex items-start gap-3 px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-50 sm:px-5"
                  >
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                    {issue.text}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Best sellers" description="Last 30 days" padded={topProducts.length === 0}>
          {topProducts.length > 0 ? (
            <ol className="divide-y divide-slate-100">
              {topProducts.map(([name, qty], index) => (
                <li
                  key={name}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm sm:px-5"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                      {index + 1}
                    </span>
                    <span className="truncate text-slate-900">{name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-500">{qty} sold</span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              compact
              title="No sales yet"
              text="Your best-selling items show here once orders come in."
            />
          )}
        </Panel>
      </div>

      <Panel
        title="Specials"
        description={
          publishedSpecials > 0
            ? `${publishedSpecials} special${publishedSpecials === 1 ? "" : "s"} live on your store page.`
            : "No specials live right now."
        }
        action={
          <Link href="/vendors/dashboard?tab=specials&action=create" className={dashButton.link}>
            Create a special
          </Link>
        }
      >
        <p className="text-sm text-slate-600">
          {nextPromo
            ? `Next up: ${nextPromo.title}, starting ${new Date(nextPromo.startsAt).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}.`
            : "Plan a special to bring in more orders on quiet days."}
        </p>
      </Panel>
    </div>
  );

  const current = tabs.find((item) => item.tab === activeTab) ?? tabs[0];
  let content: ReactNode = overview;
  switch (activeTab) {
    case "analytics":
      content = <SalesCharts />;
      break;
    case "orders":
      content = <OrdersManager />;
      break;
    case "menu":
      content = (
        <div className="space-y-6">
          <MenuManager />
          <ProductsManager />
          <BulkImportProducts />
        </div>
      );
      break;
    case "payouts":
      content = <PayoutsPanel />;
      break;
    case "operations":
      content = <NotificationsPanel />;
      break;
    case "messages":
      content = <MessagesPanel />;
      break;
    case "experience":
      content = <FeedbackPanel />;
      break;
    case "team":
      content = <TeamManager />;
      break;
    case "profile":
      content = <ProfileManager />;
      break;
    case "hours":
      content = <OperatingHours />;
      break;
    case "specials":
      content = <SpecialsManager />;
      break;
    case "automations":
      content = (
        <div className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-2">
            <AutomationsPanel />
            <AdvancedAutomationsPanel />
          </div>
          <InsightsCard />
        </div>
      );
      break;
    case "support":
      content = <SupportCard />;
      break;
    default:
      break;
  }

  if (activeTab !== "overview") {
    content = (
      <>
        <PageHeader title={current.label} description={current.description} />
        {content}
      </>
    );
  }

  const nav: DashboardNavItem[] = tabs.map((item) => ({
    id: item.tab,
    label: item.label,
    shortLabel: item.shortLabel,
    icon: item.icon,
    href: item.tab === "overview" ? "/vendors/dashboard" : `/vendors/dashboard?tab=${item.tab}`,
    group: item.group,
  }));

  return (
    <DashboardShell
      area="Vendor"
      workspaceName={vendor?.name || "Your store"}
      workspaceDetail={vendor?.suburb && vendor?.city ? location : undefined}
      homeHref="/vendors/dashboard"
      nav={nav}
      activeId={activeTab}
      phoneTabs={["overview", "orders", "menu", "profile"]}
      actions={<NotificationBell />}
    >
      {resolved.submitError ? (
        <Notice tone="danger" title="Your store was not sent" className="mb-6">
          {resolved.submitError.slice(0, 240)}
        </Notice>
      ) : null}
      {resolved.submitted === "1" ? (
        <Notice tone="success" title="Your store has been sent to Lethela" className="mb-6">
          We will let you know as soon as it is approved. You can keep adding to your menu.
        </Notice>
      ) : null}
      {resolved.welcome === "1" ? (
        <Notice tone="success" title="Your vendor account is ready" className="mb-6">
          Add your store details and your menu. Nothing is public until Lethela approves your store.
        </Notice>
      ) : null}
      {content}
    </DashboardShell>
  );
}
