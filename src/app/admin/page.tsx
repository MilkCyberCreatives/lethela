"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bike,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  LayoutDashboard,
  LineChart,
  LifeBuoy,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  PackageCheck,
  RefreshCw,
  Search,
  Settings,
  ShoppingBag,
  Store,
  Truck,
  UserCircle,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type DashboardView =
  | "overview"
  | "vendors"
  | "products"
  | "riders"
  | "users"
  | "orders"
  | "messages"
  | "finance"
  | "operations";

const DASHBOARD_VIEWS: DashboardView[] = [
  "overview",
  "vendors",
  "products",
  "riders",
  "users",
  "orders",
  "messages",
  "finance",
  "operations",
];

function isDashboardView(value: string | null): value is DashboardView {
  return Boolean(value && DASHBOARD_VIEWS.includes(value as DashboardView));
}
type VendorStatusOption =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "ALL";
type RiderStatusFilter =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "ALL";
type VendorActionType = "approve" | "reject" | "changes_requested" | "suspend";
type RiderApplicationStatus = Exclude<RiderStatusFilter, "ALL" | "DRAFT">;
type ProductStatusFilter = "SUBMITTED" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED" | "ALL";

type ProductReview = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceCents: number;
  image: string | null;
  isAlcohol: boolean;
  abv: number | null;
  inStock: boolean;
  status: string;
  reviewReason: string | null;
  updatedAt: string;
  vendor: { id: string; name: string; status: string; isActive: boolean };
};

type VendorApplication = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  suburb: string | null;
  city: string | null;
  province: string | null;
  status: string;
  isActive: boolean;
  ownerId: string | null;
  kycIdUrl: string | null;
  kycProofUrl: string | null;
  cuisine: string;
  deliveryFee: number;
  halaal: boolean;
  createdAt: string;
  updatedAt: string;
  liquorLicenceUrl: string | null;
  liquorLicenceNumber: string | null;
  liquorLicenceExpiry: string | null;
  liquorVerificationStatus: string;
  liquorReviewReason: string | null;
};

type VendorCounts = {
  draft?: number;
  submitted?: number;
  changesRequested?: number;
  pending: number;
  active: number;
  approved?: number;
  rejected: number;
  suspended?: number;
  total: number;
};

type RiderApplication = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  idNumberLast4: string;
  licenseCode: string;
  suburb: string;
  city: string;
  vehicleType: string;
  vehicleRegistration: string | null;
  availableHours: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  hasSmartphone: boolean;
  hasBankAccount: boolean;
  experience: string | null;
  aiSummary: string | null;
  status: RiderApplicationStatus;
  createdAt: string;
  updatedAt: string;
};

type RiderCounts = {
  submitted?: number;
  changesRequested?: number;
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
  suspended?: number;
  total: number;
};

type NotificationChannels = {
  email: { enabled: boolean; recipients: number };
  whatsapp: { enabled: boolean; recipients: number };
  push: { enabled: boolean };
};

type ApplicantNotificationChannels = {
  email: { enabled: boolean };
  whatsapp: { enabled: boolean };
};

type PlatformMessage = {
  id: string;
  recipientType: string;
  recipientId: string | null;
  subject: string;
  body: string;
  channel: string;
  createdAt: string;
};

type MessageRecipientType = "VENDOR" | "RIDER" | "ALL_VENDORS" | "ALL_RIDERS" | "ALL";

type AdminStats = {
  ordersToday: number;
  completedOrdersToday: number;
  revenueTodayCents: number;
  revenueMonthCents: number;
  grossMerchandiseValueTodayCents: number;
  grossMerchandiseValueMonthCents: number;
  customerPaymentsTodayCents: number;
  customerPaymentsMonthCents: number;
  vendorSalesTodayCents: number;
  vendorSalesMonthCents: number;
  deliveryFeesTodayCents: number;
  deliveryFeesMonthCents: number;
  riderTipsTodayCents: number;
  riderTipsMonthCents: number;
  riderEarningsTodayCents: number;
  riderEarningsMonthCents: number;
  averageOrderValueTodayCents: number;
  activeVendors: number;
  activeRiders: number;
  availableRiders: number;
  pendingDeliveries: number;
  averageDeliveryTimeMins: number;
  customerSatisfactionScore: number;
  delayedOrders: number;
  failedDeliveries: number;
  cancelledOrders: number;
  customerCount: number;
  reviewCount: number;
  topProducts: Array<{ id: string | null; name: string; qty: number }>;
  topVendors: Array<{ id: string; name: string; revenueCents: number }>;
};

type OperationsOrder = {
  id: string;
  publicId: string;
  ozowReference: string | null;
  status: string;
  paymentStatus: string;
  subtotalCents: number;
  deliveryFeeCents: number;
  riderTipCents: number;
  riderPayoutCents: number;
  vendorPayoutCents: number;
  platformFeeCents: number;
  deliveryDistanceKm: number | null;
  containsAlcohol: boolean;
  totalCents: number;
  createdAt: string;
  vendorName: string;
  vendorPhone: string | null;
  customerName: string | null;
  customerEmail: string | null;
  riderName: string | null;
  itemCount: number;
};

type OperationsRider = {
  id: string;
  fullName: string;
  phone: string;
  suburb: string;
  city: string;
  vehicleType: string;
};

type OperationsEvent = {
  id: string;
  publicId: string;
  type: string;
  actor: string | null;
  note: string | null;
  createdAt: string;
};

type OperationsRefund = {
  id: string;
  publicId: string;
  amountCents: number;
  reason: string;
  status: string;
  evidenceUrl: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

type OperationsDispatch = {
  id: string;
  publicId: string;
  riderApplicationId: string;
  riderName: string;
  riderPhone: string;
  status: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

type AdminAuditLog = {
  id: string;
  actor: string;
  action: string;
  targetType: string;
  targetId: string;
  before: string | null;
  after: string | null;
  createdAt: string;
};

type AdminCustomer = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  joinedAt: string;
  status: "VERIFIED" | "UNVERIFIED" | "LOCKED";
  orderCount: number;
  totalSpentCents: number;
  lastOrderAt: string | null;
};

type AdminOperationsPayload = {
  orders?: OperationsOrder[];
  riders?: OperationsRider[];
  events?: OperationsEvent[];
  refunds?: OperationsRefund[];
  dispatches?: OperationsDispatch[];
  auditLogs?: AdminAuditLog[];
};

type GlobalSearchResult = {
  id: string;
  title: string;
  subtitle: string;
  view: DashboardView;
  query?: string;
  orderRef?: string;
};

type GlobalSearchGroups = Partial<
  Record<"orders" | "vendors" | "products" | "riders" | "customers", GlobalSearchResult[]>
>;

const VENDOR_STATUS_OPTIONS: VendorStatusOption[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "DRAFT",
  "ALL",
];
const RIDER_STATUS_OPTIONS: RiderStatusFilter[] = [
  "SUBMITTED",
  "CHANGES_REQUESTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "DRAFT",
  "ALL",
];
const PRODUCT_STATUS_OPTIONS: ProductStatusFilter[] = [
  "SUBMITTED",
  "CHANGES_REQUESTED",
  "APPROVED",
  "REJECTED",
  "ALL",
];

const ADMIN_NAV_GROUPS: Array<{
  title: string;
  items: Array<{ id: DashboardView; label: string; icon: typeof LayoutDashboard }>;
}> = [
  {
    title: "Overview",
    items: [{ id: "overview", label: "Overview", icon: LayoutDashboard }],
  },
  {
    title: "Operations",
    items: [
      { id: "operations", label: "Operations & support", icon: Activity },
      { id: "orders", label: "Order monitoring", icon: ShoppingBag },
    ],
  },
  {
    title: "Marketplace",
    items: [
      { id: "vendors", label: "Vendor approvals", icon: Store },
      { id: "products", label: "Product reviews", icon: PackageCheck },
    ],
  },
  {
    title: "People",
    items: [
      { id: "riders", label: "Rider applications", icon: Bike },
      { id: "users", label: "Customers", icon: Users },
    ],
  },
  {
    title: "Support & finance",
    items: [
      { id: "messages", label: "Messages", icon: MessageSquare },
      { id: "finance", label: "Finance", icon: WalletCards },
    ],
  },
];

const DAILY_OPERATING_PLAYBOOK = [
  "Check new vendor submissions and approve only complete profiles with products, hours, address, banking and documents.",
  "Check rider applications and approve only riders with valid contact, vehicle, banking and emergency details.",
  "Keep WhatsApp support open during operating hours and log every complaint, refund request or failed delivery.",
  "Before accepting public traffic, run at least one low-value paid Ozow order from cart to vendor alert, rider handover and completion.",
  "Keep liquor restricted to approved licensed vendors with age verification, rider ID checks, refusal handling and refund rules.",
];

const ORDER_EXCEPTION_PLAYBOOK = [
  "Vendor unavailable: call the vendor, pause the store if needed, and offer customer replacement, credit or refund.",
  "Missing or incorrect item: request photos where useful, contact the vendor, then record correction, partial refund or full refund.",
  "Rider delay: contact rider first, notify customer with a realistic ETA, then reassign if the rider cannot continue.",
  "Payment mismatch: match Ozow reference to the order before fulfilment or refund action.",
  "Complaint escalation: keep the order reference, customer phone, vendor name, rider name and resolution note together.",
];

const SCALE_READINESS_PLAYBOOK = [
  "Controlled pilot: minimum 1 approved vendor, 5 approved products, 1 approved rider and 1 successful paid proof order.",
  "Public marketing: minimum 3 approved vendors, 20 approved products, 2 approved riders and 5 successful paid proof orders.",
  "Monitoring: add Sentry for runtime errors and Pusher for realtime order/rider updates before larger customer traffic.",
  "Media: replace placeholder-looking store and product images with real vendor photos before promotion.",
];

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function money(cents: number) {
  return `R${(Number(cents || 0) / 100).toFixed(2)}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function parseCuisine(value: string) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function matchesSearch(query: string, values: Array<string | null | undefined>) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return values.some((value) =>
    String(value || "")
      .toLowerCase()
      .includes(normalized),
  );
}

function statusClass(status: string) {
  if (["ACTIVE", "APPROVED"].includes(status))
    return "border-emerald-300/30 bg-emerald-300/10 text-emerald-100";
  if (["REJECTED"].includes(status)) return "border-red-300/30 bg-red-300/10 text-red-100";
  if (["UNDER_REVIEW"].includes(status))
    return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  return "border-white/15 bg-white/5 text-white/80";
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: typeof LayoutDashboard;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.14em] text-white/55">{label}</p>
          <p className="mt-1 text-xl font-bold text-white">{value}</p>
        </div>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-lethela-primary/15 text-lethela-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 flex items-center justify-between gap-2 text-xs leading-5 text-white/60">
        <span>{note}</span>
        {onClick ? (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden="true" />
        ) : null}
      </p>
    </>
  );

  if (onClick) {
    return (
      <button
        className="admin-metric-card rounded-lg border border-white/10 bg-white/[0.045] p-4 text-left transition-colors hover:border-lethela-primary/60 hover:bg-lethela-primary/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lethela-primary"
        type="button"
        onClick={onClick}
        aria-label={`${label}: ${value}. ${note}`}
      >
        {content}
      </button>
    );
  }

  return (
    <article className="admin-metric-card rounded-lg border border-white/10 bg-white/[0.045] p-4">
      {content}
    </article>
  );
}

function AdminSectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lethela-primary">
          {eyebrow}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-white">{title}</h3>
      </div>
      <p className="max-w-xl text-sm leading-6 text-white/55 sm:text-right">{description}</p>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/[0.04] p-5 text-sm text-white/75">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 text-white/60">{text}</p>
    </div>
  );
}

function AdminTopBar({
  searchValue,
  onSearchChange,
  onSearch,
  onNotifications,
  searchGroups,
  searchLoading,
  onSelectResult,
  notificationCount,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onNotifications: () => void;
  searchGroups: GlobalSearchGroups | null;
  searchLoading: boolean;
  onSelectResult: (result: GlobalSearchResult) => void;
  notificationCount: number;
}) {
  const router = useRouter();
  const resultCount = Object.values(searchGroups ?? {}).reduce(
    (total, items) => total + (items?.length ?? 0),
    0,
  );

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#05071D]">
      <div className="mx-auto flex min-h-[72px] w-full max-w-[1440px] flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap md:px-6 lg:px-8">
        <Link href="/admin" className="flex shrink-0 items-center gap-3">
          <Image
            src="/lethelalogo.svg"
            alt="Lethela"
            width={130}
            height={32}
            className="h-8 w-auto rounded bg-white px-2"
            priority
          />
          <span className="hidden sm:block">
            <span className="block text-sm font-semibold">Admin</span>
            <span className="block text-[11px] uppercase tracking-[0.14em] text-white/45">
              Command centre
            </span>
          </span>
        </Link>

        <form
          className="relative order-last flex min-w-0 basis-full items-center rounded-lg border border-white/10 bg-white/[0.05] px-2 sm:order-none sm:basis-auto sm:flex-1 sm:px-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch();
          }}
        >
          <Search className="h-4 w-4 text-white/40" />
          <input
            className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-white/35"
            placeholder="Search orders, people or products..."
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label="Search dashboard records"
          />
          <button
            type="submit"
            className="rounded-md px-2 py-1 text-xs font-semibold text-white/65 hover:text-white"
          >
            {searchLoading ? "Searching" : "Search"}
          </button>
          {searchGroups ? (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[70vh] overflow-y-auto rounded-lg border border-white/15 bg-[#090D2C] p-2">
              {resultCount === 0 ? (
                <p className="px-3 py-4 text-sm text-white/60">No matching records found.</p>
              ) : (
                Object.entries(searchGroups).map(([group, items]) =>
                  items && items.length > 0 ? (
                    <div key={group} className="py-1">
                      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                        {group}
                      </p>
                      {items.map((item) => (
                        <button
                          key={`${group}-${item.id}`}
                          type="button"
                          onClick={() => onSelectResult(item)}
                          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-lethela-primary"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-white">
                              {item.title}
                            </span>
                            <span className="block truncate text-xs text-white/55">
                              {item.subtitle}
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-white/40" />
                        </button>
                      ))}
                    </div>
                  ) : null,
                )
              )}
            </div>
          ) : null}
        </form>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="relative grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-lethela-primary hover:text-white"
            aria-label={`Open operational notifications${notificationCount ? `, ${notificationCount} active` : ""}`}
            onClick={onNotifications}
          >
            <Bell className="h-4 w-4" />
            {notificationCount > 0 ? (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full border border-[#05071D] bg-lethela-primary px-1 text-[10px] font-bold text-white">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            ) : null}
          </button>
          <Link
            href="/contact"
            className="hidden h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-lethela-primary hover:text-white sm:grid"
            aria-label="Open Lethela support"
          >
            <LifeBuoy className="h-4 w-4" />
          </Link>
          <span className="hidden h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white/70 sm:inline-flex">
            <UserCircle className="h-4 w-4" />
            Owner
          </span>
          <Link
            href="/"
            className="hidden rounded-lg border border-white/20 px-3 py-2 text-sm text-white/72 transition hover:border-lethela-primary hover:text-lethela-primary lg:inline-flex"
          >
            View Marketplace
          </Link>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-lethela-primary hover:text-white"
            aria-label="Sign out"
            onClick={() => {
              void fetch("/api/admin/access", { method: "DELETE" }).finally(() => {
                router.push("/owner-access");
                router.refresh();
              });
            }}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

function PriorityCard({
  label,
  value,
  note,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: typeof LayoutDashboard;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${value}. ${note}`}
      className="admin-priority-card rounded-xl border border-white/10 bg-white/[0.055] p-5 text-left transition-colors hover:border-lethela-primary/60 hover:bg-lethela-primary/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lethela-primary"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">{label}</p>
          <p className="mt-3 text-3xl font-bold">{value}</p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-lethela-primary/15 text-lethela-primary">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 flex items-center justify-between gap-2 text-sm leading-6 text-white/62">
        <span>{note}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />
      </p>
    </button>
  );
}

type AttentionRow = {
  type: string;
  issue: string;
  area: string;
  assignedTo: string;
  priority: "High" | "Medium" | "Low";
  status: string;
  action: string;
  target: DashboardView;
};

function priorityPillClass(priority: AttentionRow["priority"]) {
  if (priority === "High") return "border-red-300/35 bg-red-300/10 text-red-100";
  if (priority === "Medium") return "border-amber-300/35 bg-amber-300/10 text-amber-100";
  return "border-white/15 bg-white/5 text-white/65";
}

function NeedsAttentionQueue({
  rows,
  onNavigate,
  limit = 6,
}: {
  rows: AttentionRow[];
  onNavigate: (view: DashboardView) => void;
  limit?: number;
}) {
  const activeRows = rows.filter(
    (row) => !["Clear", "0 pending", "0 in queue"].includes(row.status),
  );
  const visibleRows = activeRows.slice(0, limit);

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
            Operations queue
          </p>
          <h3 className="mt-1 text-xl font-semibold">Needs attention</h3>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">
          {activeRows.length} active issue{activeRows.length === 1 ? "" : "s"}
        </span>
      </div>

      {activeRows.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Nothing needs attention right now."
            text="New operational alerts appear here automatically."
          />
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleRows.map((row) => (
              <div
                key={`${row.type}-${row.issue}`}
                className="flex flex-col rounded-lg border border-white/10 bg-[#080B27]/70 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white/70">
                    {row.type}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${priorityPillClass(row.priority)}`}
                  >
                    {row.priority}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium leading-snug text-white">{row.issue}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/55">
                  <span>{row.area}</span>
                  <span>Owner: {row.assignedTo}</span>
                  <span>{row.status}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate(row.target)}
                  className="mt-3 inline-flex w-fit items-center gap-1 rounded-md border border-lethela-primary bg-lethela-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lethela-primary"
                >
                  {row.action}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          {activeRows.length > visibleRows.length ? (
            <button
              type="button"
              onClick={() => onNavigate("operations")}
              className="mt-4 inline-flex items-center gap-1 rounded-md border border-white/20 px-3 py-2 text-xs font-semibold text-white/80 transition-colors hover:border-lethela-primary hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lethela-primary"
            >
              View all {activeRows.length} in Operations
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [view, setView] = useState<DashboardView>("vendors");
  const [vendorStatus, setVendorStatus] = useState<VendorStatusOption>("SUBMITTED");
  const [riderStatus, setRiderStatus] = useState<RiderStatusFilter>("SUBMITTED");
  const [productStatus, setProductStatus] = useState<ProductStatusFilter>("SUBMITTED");
  const [vendorSearch, setVendorSearch] = useState("");
  const [riderSearch, setRiderSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalSearchGroups, setGlobalSearchGroups] = useState<GlobalSearchGroups | null>(null);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [orderPaymentFilter, setOrderPaymentFilter] = useState("ALL");
  const [orderPeriodFilter, setOrderPeriodFilter] = useState("ALL");
  const [orderSort, setOrderSort] = useState<"newest" | "oldest">("newest");
  const [orderPage, setOrderPage] = useState(1);
  const [vendors, setVendors] = useState<VendorApplication[]>([]);
  const [products, setProducts] = useState<ProductReview[]>([]);
  const [vendorCounts, setVendorCounts] = useState<VendorCounts>({
    pending: 0,
    active: 0,
    rejected: 0,
    total: 0,
  });
  const [riders, setRiders] = useState<RiderApplication[]>([]);
  const [riderCounts, setRiderCounts] = useState<RiderCounts>({
    pending: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [customerState, setCustomerState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSearchInput, setCustomerSearchInput] = useState("");
  const [customerPage, setCustomerPage] = useState(1);
  const [customerMeta, setCustomerMeta] = useState({ total: 0, pageCount: 1 });
  const [channels, setChannels] = useState<NotificationChannels | null>(null);
  const [applicantChannels, setApplicantChannels] = useState<ApplicantNotificationChannels | null>(
    null,
  );
  const [messages, setMessages] = useState<PlatformMessage[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [operationsOrders, setOperationsOrders] = useState<OperationsOrder[]>([]);
  const [operationsRiders, setOperationsRiders] = useState<OperationsRider[]>([]);
  const [operationsEvents, setOperationsEvents] = useState<OperationsEvent[]>([]);
  const [operationsRefunds, setOperationsRefunds] = useState<OperationsRefund[]>([]);
  const [operationsDispatches, setOperationsDispatches] = useState<OperationsDispatch[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [operationsForm, setOperationsForm] = useState({
    orderRef: "",
    status: "PREPARING",
    riderApplicationId: "",
    refundAmountRand: "",
    refundReason: "",
    evidenceUrl: "",
    note: "",
  });
  const [messageForm, setMessageForm] = useState<{
    recipientType: MessageRecipientType;
    recipientId: string;
    subject: string;
    body: string;
    channel: "DASHBOARD" | "EMAIL_WHATSAPP" | "ALL";
  }>({
    recipientType: "ALL",
    recipientId: "",
    subject: "",
    body: "",
    channel: "ALL",
  });
  const [authMode, setAuthMode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pushPermission, setPushPermission] = useState<string>("unsupported");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const adminKeyRef = useRef("");
  const vendorStatusRef = useRef<VendorStatusOption>("SUBMITTED");
  const riderStatusRef = useRef<RiderStatusFilter>("SUBMITTED");
  const productStatusRef = useRef<ProductStatusFilter>("SUBMITTED");
  const initialLoadCompleteRef = useRef(false);

  useEffect(() => {
    setPushPermission(
      typeof window !== "undefined" && "Notification" in window
        ? Notification.permission
        : "unsupported",
    );
  }, []);

  useEffect(() => {
    const syncViewFromUrl = () => {
      const params = new URL(window.location.href).searchParams;
      const candidate = params.get("view");
      const nextView = isDashboardView(candidate) ? candidate : "overview";
      setView(nextView);

      // Restore the deep-link filter (e.g. /admin?view=vendors&status=SUBMITTED)
      // so a card click lands on the right list with the right filter applied.
      const status = params.get("status")?.toUpperCase();
      if (status) {
        if (
          nextView === "vendors" &&
          VENDOR_STATUS_OPTIONS.includes(status as VendorStatusOption)
        ) {
          setVendorStatus(status as VendorStatusOption);
        } else if (
          nextView === "riders" &&
          RIDER_STATUS_OPTIONS.includes(status as RiderStatusFilter)
        ) {
          setRiderStatus(status as RiderStatusFilter);
        } else if (
          nextView === "products" &&
          PRODUCT_STATUS_OPTIONS.includes(status as ProductStatusFilter)
        ) {
          setProductStatus(status as ProductStatusFilter);
        } else if (nextView === "orders") {
          setOrderStatusFilter(status);
        }
      }
      if (nextView === "orders") {
        setOrderPeriodFilter(params.get("period")?.toUpperCase() || "ALL");
        setOrderPaymentFilter(params.get("payment")?.toUpperCase() || "ALL");
        setOrderSearch(params.get("q") || "");
      }
    };

    syncViewFromUrl();
    window.addEventListener("popstate", syncViewFromUrl);
    return () => window.removeEventListener("popstate", syncViewFromUrl);
  }, []);

  const navigateView = useCallback((nextView: DashboardView, params?: Record<string, string>) => {
    setView(nextView);
    const url = new URL(window.location.href);
    // Keep only the navigation params we own so stale filters do not leak between sections.
    for (const key of ["view", "status", "filter", "period", "payment", "q"])
      url.searchParams.delete(key);
    if (nextView !== "overview") url.searchParams.set("view", nextView);
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value) url.searchParams.set(key, value);
    }

    // Apply a deep-linked status filter to the destination list immediately
    // (the URL sync effect only runs on load / browser navigation).
    const status = params?.status?.toUpperCase();
    if (status) {
      if (nextView === "vendors" && VENDOR_STATUS_OPTIONS.includes(status as VendorStatusOption)) {
        setVendorStatus(status as VendorStatusOption);
      } else if (
        nextView === "riders" &&
        RIDER_STATUS_OPTIONS.includes(status as RiderStatusFilter)
      ) {
        setRiderStatus(status as RiderStatusFilter);
      } else if (
        nextView === "products" &&
        PRODUCT_STATUS_OPTIONS.includes(status as ProductStatusFilter)
      ) {
        setProductStatus(status as ProductStatusFilter);
      } else if (nextView === "orders") {
        setOrderStatusFilter(status);
      }
    }
    if (nextView === "orders") {
      setOrderPeriodFilter(params?.period?.toUpperCase() || "ALL");
      setOrderPaymentFilter(params?.payment?.toUpperCase() || "ALL");
      setOrderSearch(params?.q || "");
      setOrderPage(1);
    }

    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    adminKeyRef.current = adminKey.trim();
  }, [adminKey]);

  useEffect(() => {
    vendorStatusRef.current = vendorStatus;
  }, [vendorStatus]);

  useEffect(() => {
    riderStatusRef.current = riderStatus;
  }, [riderStatus]);

  useEffect(() => {
    productStatusRef.current = productStatus;
  }, [productStatus]);

  const syncAdminAccess = useCallback(async () => {
    const normalizedKey = adminKeyRef.current;
    if (!normalizedKey) return;

    const response = await fetch("/api/admin/access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ adminKey: normalizedKey }),
    });
    const json = await response.json();
    if (!response.ok || !json.ok)
      throw new Error(json.error || "Failed to validate admin approval key.");
    if (json.promoted && json.message) setNotice(json.message);
  }, []);

  const fetchAdminJson = useCallback(async (url: string, fallback: string) => {
    const response = await fetch(url, { method: "GET", cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) throw new Error(json.error || fallback);
    return json;
  }, []);

  const loadVendorApprovals = useCallback(
    async (status: VendorStatusOption = vendorStatusRef.current) => {
      const json = await fetchAdminJson(
        `/api/admin/vendors?status=${status}`,
        "Failed to load vendor approvals.",
      );
      setVendors(json.items ?? []);
      setVendorCounts(
        json.counts ?? {
          pending: Number(json.pendingCount ?? 0),
          active: 0,
          rejected: 0,
          total: Number((json.items ?? []).length),
        },
      );
      if (json.authMode) setAuthMode(json.authMode);
    },
    [fetchAdminJson],
  );

  const loadProductReviews = useCallback(
    async (status: ProductStatusFilter = productStatusRef.current) => {
      const json = await fetchAdminJson(
        `/api/admin/products?status=${status}`,
        "Failed to load product reviews.",
      );
      setProducts(json.products ?? []);
    },
    [fetchAdminJson],
  );

  const loadRiderApplications = useCallback(
    async (status: RiderStatusFilter = riderStatusRef.current) => {
      const json = await fetchAdminJson(
        `/api/admin/riders?status=${status}`,
        "Failed to load rider applications.",
      );
      setRiders(json.items ?? []);
      setRiderCounts(
        json.counts ?? {
          pending: 0,
          underReview: 0,
          approved: 0,
          rejected: 0,
          total: Number((json.items ?? []).length),
        },
      );
      if (json.authMode) setAuthMode(json.authMode);
    },
    [fetchAdminJson],
  );

  const loadCustomers = useCallback(
    async (search: string, page: number) => {
      setCustomerState((current) => (current === "ready" ? "ready" : "loading"));
      setCustomerError(null);
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: "25" });
        if (search) params.set("q", search);
        const json = await fetchAdminJson(
          `/api/admin/customers?${params.toString()}`,
          "Failed to load customers.",
        );
        setCustomers((json.customers ?? []) as AdminCustomer[]);
        setCustomerMeta({
          total: Number(json.total ?? 0),
          pageCount: Number(json.pageCount ?? 1),
        });
        setCustomerState("ready");
      } catch (err: unknown) {
        setCustomerError(getErrorMessage(err, "Failed to load customers."));
        setCustomerState("error");
      }
    },
    [fetchAdminJson],
  );

  const applyOperationsJson = useCallback((json: AdminOperationsPayload) => {
    setOperationsOrders(json.orders ?? []);
    setOperationsRiders(json.riders ?? []);
    setOperationsEvents(json.events ?? []);
    setOperationsRefunds(json.refunds ?? []);
    setOperationsDispatches(json.dispatches ?? []);
    setAuditLogs(json.auditLogs ?? []);
  }, []);

  const loadLiveData = useCallback(async () => {
    const [statsJson, operationsJson] = await Promise.all([
      fetchAdminJson("/api/admin/stats", "Failed to load owner statistics."),
      fetchAdminJson("/api/admin/operations", "Failed to load operations centre."),
    ]);
    setStats(statsJson.stats ?? null);
    applyOperationsJson(operationsJson);
    setLastRefreshedAt(new Date());
  }, [applyOperationsJson, fetchAdminJson]);

  const loadCommunicationData = useCallback(async () => {
    const [notificationsJson, messagesJson] = await Promise.all([
      fetchAdminJson("/api/admin/notifications", "Failed to load notification settings."),
      fetchAdminJson("/api/admin/messages", "Failed to load messages."),
    ]);
    setChannels(notificationsJson.channels ?? null);
    setApplicantChannels(notificationsJson.applicantChannels ?? null);
    setMessages(messagesJson.items ?? []);
  }, [fetchAdminJson]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await syncAdminAccess();
      await Promise.all([
        loadVendorApprovals(),
        loadProductReviews(),
        loadRiderApplications(),
        loadCommunicationData(),
        loadLiveData(),
      ]);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to refresh the admin dashboard."));
    } finally {
      setLoading(false);
    }
  }, [
    loadCommunicationData,
    loadLiveData,
    loadProductReviews,
    loadRiderApplications,
    loadVendorApprovals,
    syncAdminAccess,
  ]);

  useEffect(() => {
    void load().finally(() => {
      initialLoadCompleteRef.current = true;
    });
  }, [load]);

  useEffect(() => {
    if (!initialLoadCompleteRef.current) return;
    void loadVendorApprovals(vendorStatus).catch((err: unknown) => {
      setError(getErrorMessage(err, "Failed to load vendor approvals."));
    });
  }, [loadVendorApprovals, vendorStatus]);

  useEffect(() => {
    if (!initialLoadCompleteRef.current) return;
    void loadProductReviews(productStatus).catch((err: unknown) => {
      setError(getErrorMessage(err, "Failed to load product reviews."));
    });
  }, [loadProductReviews, productStatus]);

  useEffect(() => {
    if (!initialLoadCompleteRef.current) return;
    void loadRiderApplications(riderStatus).catch((err: unknown) => {
      setError(getErrorMessage(err, "Failed to load rider applications."));
    });
  }, [loadRiderApplications, riderStatus]);

  // Debounce the customer search box.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setCustomerSearch(customerSearchInput.trim());
      setCustomerPage(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [customerSearchInput]);

  // Load customers lazily: only when the Customers tab is open, then on search/page change.
  useEffect(() => {
    if (view !== "users") return;
    void loadCustomers(customerSearch, customerPage);
  }, [view, customerSearch, customerPage, loadCustomers]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadLiveData().catch(() => {
        // Manual refresh exposes a detailed error without interrupting the operator every 30 seconds.
      });
    }, 30000);
    return () => window.clearInterval(timer);
  }, [loadLiveData]);

  async function enableBrowserAlerts() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotice("Browser notifications are not supported on this device.");
      setPushPermission("unsupported");
      return;
    }

    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    setNotice(
      permission === "granted"
        ? "Browser push notifications enabled for admin alerts."
        : "Browser push notifications were not enabled.",
    );
  }

  async function updateVendorStatus(vendorId: string, action: VendorActionType) {
    const reason =
      action === "approve"
        ? ""
        : window
            .prompt("Enter the exact reason. The vendor will see this in their dashboard.")
            ?.trim();
    if (action !== "approve" && !reason) return;
    if (
      action === "approve" &&
      !window.confirm("Approve this vendor and make the store eligible to go live?")
    )
      return;
    setSavingKey(`vendor:${vendorId}`);
    setError(null);
    setNotice(null);
    try {
      await syncAdminAccess();

      const response = await fetch(`/api/admin/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok)
        throw new Error(json.error || "Failed to update vendor application.");
      setNotice(json.message || "Vendor application updated.");
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to update vendor application."));
    } finally {
      setSavingKey(null);
    }
  }

  async function updateRiderStatus(id: string, status: RiderApplicationStatus) {
    const requiresReason = ["CHANGES_REQUESTED", "REJECTED", "SUSPENDED"].includes(status);
    const reason = requiresReason
      ? window.prompt("Enter the exact reason. The rider will see this in their dashboard.")?.trim()
      : "";
    if (requiresReason && !reason) return;
    if (status === "APPROVED" && !window.confirm("Approve this rider for delivery assignments?"))
      return;
    setSavingKey(`rider:${id}:${status}`);
    setError(null);
    setNotice(null);
    try {
      await syncAdminAccess();

      const response = await fetch(`/api/admin/riders/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok)
        throw new Error(json.error || "Failed to update rider application.");
      setNotice(`Rider moved to ${status.replaceAll("_", " ").toLowerCase()}.`);
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to update rider application."));
    } finally {
      setSavingKey(null);
    }
  }

  async function updateLiquorStatus(
    vendorId: string,
    status: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED",
  ) {
    const reason =
      status === "APPROVED"
        ? ""
        : window.prompt("Enter the liquor-review reason shown to the vendor.")?.trim();
    if (status !== "APPROVED" && !reason) return;
    if (status === "APPROVED" && !window.confirm("Approve this current liquor licence?")) return;
    setSavingKey(`liquor:${vendorId}`);
    setError(null);
    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}/liquor`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Liquor review failed.");
      setNotice(`Liquor licence moved to ${status.replaceAll("_", " ").toLowerCase()}.`);
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Liquor review failed."));
    } finally {
      setSavingKey(null);
    }
  }

  async function updateProductStatus(
    productId: string,
    status: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED",
  ) {
    const reason =
      status === "APPROVED"
        ? ""
        : window.prompt("Enter the exact review reason shown to the vendor.")?.trim();
    if (status !== "APPROVED" && !reason) return;
    if (
      status === "APPROVED" &&
      !window.confirm("Approve this product for the public marketplace?")
    )
      return;
    setSavingKey(`product:${productId}`);
    setError(null);
    setNotice(null);
    try {
      await syncAdminAccess();
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok) throw new Error(json.error || "Product review failed.");
      setNotice(`Product moved to ${status.replaceAll("_", " ").toLowerCase()}.`);
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Product review failed."));
    } finally {
      setSavingKey(null);
    }
  }

  async function sendOwnerMessage() {
    setSavingKey("message:send");
    setError(null);
    setNotice(null);
    try {
      await syncAdminAccess();

      const response = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...messageForm,
          recipientId:
            messageForm.recipientType === "VENDOR" || messageForm.recipientType === "RIDER"
              ? messageForm.recipientId
              : null,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Failed to send message.");
      setNotice(json.notice || "Message sent.");
      setMessageForm((state) => ({ ...state, subject: "", body: "" }));
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to send message."));
    } finally {
      setSavingKey(null);
    }
  }

  async function submitOperation(action: "status" | "dispatch" | "refund" | "event") {
    const orderRef = operationsForm.orderRef.trim();
    if (!orderRef) {
      setError("Choose or enter an order reference first.");
      return;
    }

    setSavingKey(`operation:${action}`);
    setError(null);
    setNotice(null);
    try {
      const amountCents = Math.round(Number(operationsForm.refundAmountRand || 0) * 100);
      const payload =
        action === "status"
          ? {
              action,
              orderRef,
              status: operationsForm.status,
              note: operationsForm.note || undefined,
            }
          : action === "dispatch"
            ? {
                action,
                orderRef,
                riderApplicationId: operationsForm.riderApplicationId,
                note: operationsForm.note || undefined,
              }
            : action === "refund"
              ? {
                  action,
                  orderRef,
                  amountCents,
                  reason: operationsForm.refundReason,
                  evidenceUrl: operationsForm.evidenceUrl || undefined,
                  note: operationsForm.note || undefined,
                }
              : {
                  action,
                  orderRef,
                  type: "OWNER_NOTE",
                  note: operationsForm.note || "Owner operations note",
                };

      const response = await fetch("/api/admin/operations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to save operation.");
      }
      setNotice("Operations update saved.");
      setOperationsForm((state) => ({
        ...state,
        refundAmountRand: "",
        refundReason: "",
        evidenceUrl: "",
        note: "",
      }));
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to save operation."));
    } finally {
      setSavingKey(null);
    }
  }

  const filteredVendors = useMemo(
    () =>
      vendors.filter((vendor) =>
        matchesSearch(vendorSearch, [
          vendor.name,
          vendor.slug,
          vendor.email,
          vendor.phone,
          vendor.address,
          vendor.suburb,
          vendor.city,
        ]),
      ),
    [vendorSearch, vendors],
  );

  const filteredRiders = useMemo(
    () =>
      riders.filter((rider) =>
        matchesSearch(riderSearch, [
          rider.fullName,
          rider.email,
          rider.phone,
          rider.vehicleType,
          rider.vehicleRegistration,
          rider.suburb,
          rider.city,
          rider.status,
        ]),
      ),
    [riderSearch, riders],
  );

  const filteredProducts = useMemo(
    () =>
      products.filter((product) =>
        matchesSearch(productSearch, [
          product.name,
          product.slug,
          product.description,
          product.status,
          product.reviewReason,
          product.vendor.name,
        ]),
      ),
    [productSearch, products],
  );

  const handleGlobalSearch = useCallback(async () => {
    const query = globalSearch.trim();
    if (!query) {
      setNotice("Enter an order reference, name, email, phone number, vendor or product.");
      return;
    }
    setGlobalSearchLoading(true);
    setError(null);
    try {
      const json = await fetchAdminJson(
        `/api/admin/search?q=${encodeURIComponent(query)}`,
        "Unable to search dashboard records.",
      );
      setGlobalSearchGroups((json.groups ?? {}) as GlobalSearchGroups);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to search dashboard records."));
      setGlobalSearchGroups(null);
    } finally {
      setGlobalSearchLoading(false);
    }
  }, [fetchAdminJson, globalSearch]);

  const selectGlobalSearchResult = useCallback(
    (result: GlobalSearchResult) => {
      setGlobalSearchGroups(null);
      if (result.orderRef) {
        setOperationsForm((current) => ({ ...current, orderRef: result.orderRef || "" }));
      }
      if (result.view === "vendors") {
        setVendorStatus("ALL");
        setVendorSearch(result.query || result.title);
      } else if (result.view === "products") {
        setProductStatus("ALL");
        setProductSearch(result.query || result.title);
      } else if (result.view === "riders") {
        setRiderStatus("ALL");
        setRiderSearch(result.query || result.title);
      } else if (result.view === "users") {
        setCustomerSearchInput(result.query || result.title);
      }
      navigateView(result.view, result.orderRef ? { q: result.orderRef } : undefined);
    },
    [navigateView],
  );

  const attentionRows = useMemo<AttentionRow[]>(() => {
    const rows: AttentionRow[] = [];

    operationsOrders
      .filter((order) =>
        [
          "NEW",
          "VENDOR_ACCEPTED",
          "PREPARING",
          "READY_FOR_PICKUP",
          "RIDER_ASSIGNED",
          "PICKED_UP",
          "ON_THE_WAY",
          "FAILED",
        ].includes(order.status),
      )
      .slice(0, 4)
      .forEach((order) => {
        const reference = order.ozowReference || order.publicId;
        const failed = order.status === "FAILED" || order.paymentStatus === "FAILED";
        rows.push({
          type: "Order",
          issue: `${reference}: ${order.status.replaceAll("_", " ")}`,
          area: order.vendorName || "Live order",
          assignedTo: order.status === "NEW" ? "Vendor / Admin" : "Operations",
          priority: failed ? "High" : "Medium",
          status: order.paymentStatus,
          action: "Open order",
          target: "operations",
        });
      });

    vendors
      .filter((vendor) =>
        ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"].includes(vendor.status),
      )
      .slice(0, 3)
      .forEach((vendor) => {
        rows.push({
          type: "Vendor",
          issue: `${vendor.name}: ${vendor.status.replaceAll("_", " ")}`,
          area: [vendor.suburb, vendor.city].filter(Boolean).join(", ") || "Location incomplete",
          assignedTo: vendor.status === "CHANGES_REQUESTED" ? "Vendor" : "Admin",
          priority: vendor.status === "SUBMITTED" ? "Medium" : "Low",
          status: vendor.status.replaceAll("_", " "),
          action: "Review vendor",
          target: "vendors",
        });
      });

    products
      .filter((product) => ["SUBMITTED", "CHANGES_REQUESTED"].includes(product.status))
      .slice(0, 3)
      .forEach((product) => {
        rows.push({
          type: "Product",
          issue: `${product.name}${product.image ? "" : ": image required"}`,
          area: product.vendor.name,
          assignedTo: product.status === "CHANGES_REQUESTED" ? "Vendor" : "Admin",
          priority: product.image ? "Low" : "Medium",
          status: product.status.replaceAll("_", " "),
          action: "Review product",
          target: "products",
        });
      });

    riders
      .filter((rider) => ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"].includes(rider.status))
      .slice(0, 3)
      .forEach((rider) => {
        rows.push({
          type: "Rider",
          issue: `${rider.fullName || rider.email}: ${rider.status.replaceAll("_", " ")}`,
          area: [rider.suburb, rider.city].filter(Boolean).join(", ") || "Location incomplete",
          assignedTo: rider.status === "CHANGES_REQUESTED" ? "Rider" : "Admin",
          priority: rider.status === "SUBMITTED" ? "Medium" : "Low",
          status: rider.status.replaceAll("_", " "),
          action: "Review rider",
          target: "riders",
        });
      });

    operationsRefunds
      .filter(
        (refund) =>
          !["COMPLETED", "PAID", "REJECTED", "CANCELLED", "CLOSED"].includes(refund.status),
      )
      .slice(0, 3)
      .forEach((refund) => {
        rows.push({
          type: "Refund",
          issue: `${refund.publicId}: ${refund.reason}`,
          area: "Support",
          assignedTo: "Finance / Support",
          priority: "High",
          status: refund.status.replaceAll("_", " "),
          action: "Review refund",
          target: "operations",
        });
      });

    return rows;
  }, [operationsOrders, operationsRefunds, products, riders, vendors]);

  const orderMonitoring: Array<{
    label: string;
    value: string | number;
    note: string;
    icon: typeof LayoutDashboard;
  }> = [
    {
      label: "Pending deliveries",
      value: stats ? stats.pendingDeliveries : "—",
      note: "Waiting, preparing or out for delivery.",
      icon: ShoppingBag,
    },
    {
      label: "Delayed orders",
      value: stats ? stats.delayedOrders : "—",
      note: "Past the expected delivery window.",
      icon: Clock,
    },
    {
      label: "Failed deliveries",
      value: stats ? stats.failedDeliveries : "—",
      note: "Delivery could not be completed.",
      icon: Truck,
    },
    {
      label: "Cancelled orders",
      value: stats ? stats.cancelledOrders : "—",
      note: "Cancelled and may need review.",
      icon: Bell,
    },
  ];

  const filteredOrders = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodStart =
      orderPeriodFilter === "TODAY"
        ? startToday
        : orderPeriodFilter === "MONTH"
          ? startMonth
          : null;

    return operationsOrders
      .filter((order) => {
        const statusMatches =
          orderStatusFilter === "ALL" ||
          order.status === orderStatusFilter ||
          (orderStatusFilter === "CANCELLED" && order.status === "CANCELED");
        const paymentMatches =
          orderPaymentFilter === "ALL" || order.paymentStatus === orderPaymentFilter;
        const periodMatches = !periodStart || new Date(order.createdAt) >= periodStart;
        return (
          statusMatches &&
          paymentMatches &&
          periodMatches &&
          matchesSearch(orderSearch, [
            order.publicId,
            order.ozowReference,
            order.customerName,
            order.customerEmail,
            order.vendorName,
            order.vendorPhone,
            order.riderName,
          ])
        );
      })
      .sort((a, b) =>
        orderSort === "newest"
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  }, [
    operationsOrders,
    orderPaymentFilter,
    orderPeriodFilter,
    orderSearch,
    orderSort,
    orderStatusFilter,
  ]);

  const orderPageCount = Math.max(1, Math.ceil(filteredOrders.length / 10));
  const visibleOrders = filteredOrders.slice((orderPage - 1) * 10, orderPage * 10);

  useEffect(() => {
    setOrderPage(1);
  }, [orderPaymentFilter, orderPeriodFilter, orderSearch, orderSort, orderStatusFilter]);

  const currentViewLabel =
    ADMIN_NAV_GROUPS.flatMap((group) => group.items).find((item) => item.id === view)?.label ||
    "Overview";

  return (
    <main className="min-h-screen bg-[#05071D] text-white">
      <AdminTopBar
        searchValue={globalSearch}
        onSearchChange={setGlobalSearch}
        onSearch={handleGlobalSearch}
        onNotifications={() => navigateView("operations")}
        searchGroups={globalSearchGroups}
        searchLoading={globalSearchLoading}
        onSelectResult={selectGlobalSearchResult}
        notificationCount={attentionRows.length}
      />

      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3 px-4 pt-4 lg:hidden">
        <div className="text-xs text-slate-500" aria-label="Breadcrumb">
          Dashboard <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-slate-900">{currentViewLabel}</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileNavigationOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lethela-primary"
          aria-expanded={mobileNavigationOpen}
          aria-controls="admin-mobile-navigation"
        >
          <Menu className="h-4 w-4" />
          Menu
        </button>
      </div>

      {mobileNavigationOpen ? (
        <div
          className="fixed inset-0 z-[70] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Close navigation"
            onClick={() => setMobileNavigationOpen(false)}
          />
          <aside
            id="admin-mobile-navigation"
            className="absolute bottom-0 left-0 top-0 w-[min(88vw,340px)] overflow-y-auto border-r border-white/10 bg-[#090D2C] p-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lethela-primary">
                  Lethela admin
                </p>
                <p className="mt-1 font-semibold text-white">Command centre</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavigationOpen(false)}
                className="grid h-11 w-11 place-items-center rounded-lg border border-white/15 text-white"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-4 grid gap-5">
              {ADMIN_NAV_GROUPS.map((group) => (
                <div key={`mobile-${group.title}`}>
                  <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                    {group.title}
                  </p>
                  <div className="grid gap-1.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={`mobile-${item.id}`}
                          type="button"
                          onClick={() => {
                            navigateView(item.id);
                            setMobileNavigationOpen(false);
                          }}
                          className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                            view === item.id
                              ? "bg-lethela-primary text-white"
                              : "border border-white/10 text-white/75"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}

      <section className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[280px,minmax(0,1fr)]">
          <aside className="hidden rounded-xl border border-white/10 bg-[#090D2C]/95 p-4 lg:sticky lg:top-24 lg:block lg:h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <div className="border-b border-white/10 pb-4">
              <p className="text-xs uppercase tracking-[0.16em] text-lethela-primary">
                Lethela Admin
              </p>
              <h1 className="mt-2 text-xl font-bold">Manage</h1>
              <p className="mt-2 text-xs leading-relaxed text-white/60">
                Approvals and daily work in one place.
              </p>
            </div>

            <nav className="mt-4 grid gap-5">
              {ADMIN_NAV_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/38">
                    {group.title}
                  </p>
                  <div className="grid gap-1.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = view === item.id;
                      return (
                        <button
                          key={`${group.title}-${item.label}`}
                          className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                            active
                              ? "bg-lethela-primary text-white"
                              : "bg-white/[0.025] text-white/68 hover:bg-white/[0.075] hover:text-white"
                          }`}
                          type="button"
                          onClick={() => navigateView(item.id)}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                Quick actions
              </p>
              <div className="mt-3 grid gap-1.5 text-sm">
                <button
                  type="button"
                  onClick={() => navigateView("vendors", { status: "SUBMITTED" })}
                  className="flex min-h-10 items-center justify-between rounded-md px-2 text-left text-white/75 hover:bg-white/[0.07] hover:text-white"
                >
                  Review vendors
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => navigateView("riders", { status: "SUBMITTED" })}
                  className="flex min-h-10 items-center justify-between rounded-md px-2 text-left text-white/75 hover:bg-white/[0.07] hover:text-white"
                >
                  Review riders
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => navigateView("orders")}
                  className="flex min-h-10 items-center justify-between rounded-md px-2 text-left text-white/75 hover:bg-white/[0.07] hover:text-white"
                >
                  View live orders
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-6">
            <section className="rounded-xl border border-white/10 bg-[#0C1132] p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-lethela-primary">
                    Owner workspace
                  </p>
                  <h2 className="mt-2 text-2xl font-bold md:text-3xl">Lethela dashboard</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/68">
                    Monitor orders, vendors, riders, customers and marketplace operations.
                  </p>
                  <div
                    className="mt-3 flex flex-wrap items-center gap-3 text-xs"
                    aria-live="polite"
                  >
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold ${
                        lastRefreshedAt && !error
                          ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-100"
                          : "border-white/15 bg-white/5 text-white/55"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${lastRefreshedAt && !error ? "bg-emerald-400" : "bg-white/35"}`}
                        aria-hidden="true"
                      />
                      {lastRefreshedAt && !error ? "Live data connected" : "Connecting"}
                    </span>
                    <span className="text-white/45">
                      {lastRefreshedAt
                        ? `Last synced ${lastRefreshedAt.toLocaleTimeString()}`
                        : "Waiting for the first successful sync"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="bg-lethela-primary text-white hover:opacity-90"
                    disabled={loading}
                    onClick={load}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {loading ? "Refreshing" : "Refresh"}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/30 bg-transparent text-white hover:border-lethela-primary hover:text-lethela-primary"
                    onClick={enableBrowserAlerts}
                    disabled={pushPermission === "granted"}
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    {pushPermission === "granted" ? "Alerts enabled" : "Enable alerts"}
                  </Button>
                </div>
              </div>

              {notice ? (
                <div className="mt-4 rounded-lg border border-emerald-300/40 bg-emerald-300/10 px-3 py-2 text-xs text-emerald-100">
                  {notice}
                </div>
              ) : null}
              {error ? (
                <div className="mt-4 rounded-lg border border-red-300/40 bg-red-300/10 px-3 py-2 text-xs text-red-100">
                  {error}
                </div>
              ) : null}
            </section>

            {view === "overview" ? (
              <div className="space-y-5">
                <section>
                  <AdminSectionHeader
                    eyebrow="Live marketplace"
                    title="Immediate operations"
                    description="The four signals most likely to require an owner decision right now."
                  />
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <PriorityCard
                      label="Live orders"
                      value={stats ? stats.pendingDeliveries : "—"}
                      note="Orders waiting, preparing or out for delivery."
                      icon={ShoppingBag}
                      onClick={() => navigateView("orders")}
                    />
                    <PriorityCard
                      label="Orders needing action"
                      value={stats ? stats.delayedOrders + stats.failedDeliveries : "—"}
                      note="Delayed, failed or exception orders."
                      icon={Bell}
                      onClick={() => navigateView("operations")}
                    />
                    <PriorityCard
                      label="Pending vendor approvals"
                      value={vendorCounts.submitted ?? vendorCounts.pending ?? 0}
                      note="Complete vendor profiles waiting for owner review."
                      icon={Store}
                      onClick={() => navigateView("vendors", { status: "SUBMITTED" })}
                    />
                    <PriorityCard
                      label="Riders online now"
                      value={stats ? stats.availableRiders : "—"}
                      note={`${stats?.activeRiders ?? riderCounts.approved} approved rider(s) in total.`}
                      icon={Bike}
                      onClick={() => navigateView("riders", { status: "APPROVED" })}
                    />
                  </div>
                </section>

                <section>
                  <AdminSectionHeader
                    eyebrow="Performance"
                    title="Business today"
                    description="Paid-order performance and service quality, kept separate from rider earnings."
                  />
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                      label="Platform revenue today"
                      value={stats ? money(stats.revenueTodayCents) : "—"}
                      note="Commission only; rider fees and tips excluded."
                      icon={WalletCards}
                      onClick={() => navigateView("finance", { period: "today" })}
                    />
                    <MetricCard
                      label="Platform revenue this month"
                      value={stats ? money(stats.revenueMonthCents) : "—"}
                      note="Commission from paid orders this month."
                      icon={LineChart}
                      onClick={() => navigateView("finance", { period: "month" })}
                    />
                    <MetricCard
                      label="Orders today"
                      value={stats ? stats.ordersToday : "—"}
                      note={`${stats?.completedOrdersToday ?? 0} delivered today.`}
                      icon={PackageCheck}
                      onClick={() => navigateView("orders", { period: "today" })}
                    />
                    <MetricCard
                      label="Completed deliveries"
                      value={stats ? stats.completedOrdersToday : "—"}
                      note="Orders delivered today."
                      icon={CheckCircle2}
                      onClick={() => navigateView("orders", { status: "DELIVERED" })}
                    />
                    <MetricCard
                      label="Cancelled orders"
                      value={stats ? stats.cancelledOrders : "—"}
                      note="Cancelled orders needing review."
                      icon={Clock}
                      onClick={() => navigateView("orders", { status: "CANCELLED" })}
                    />
                    <MetricCard
                      label="Average delivery"
                      value={
                        !stats
                          ? "—"
                          : stats.averageDeliveryTimeMins
                            ? `${stats.averageDeliveryTimeMins}m`
                            : "N/A"
                      }
                      note={
                        stats && !stats.averageDeliveryTimeMins
                          ? "No completed deliveries yet."
                          : "Average time from order to delivery."
                      }
                      icon={Truck}
                      onClick={() => navigateView("operations")}
                    />
                    <MetricCard
                      label="Customer satisfaction"
                      value={
                        !stats
                          ? "—"
                          : stats.reviewCount
                            ? `${stats.customerSatisfactionScore}/5`
                            : "N/A"
                      }
                      note={
                        stats && !stats.reviewCount
                          ? "No customer reviews submitted yet."
                          : `Across ${stats?.reviewCount ?? 0} review(s).`
                      }
                      icon={CheckCircle2}
                      onClick={() => navigateView("operations")}
                    />
                    <MetricCard
                      label="Average order value"
                      value={stats ? money(stats.averageOrderValueTodayCents) : "—"}
                      note="Average product value per order today."
                      icon={ShoppingBag}
                      onClick={() => navigateView("finance", { period: "today" })}
                    />
                  </div>
                </section>

                <NeedsAttentionQueue rows={attentionRows} onNavigate={navigateView} />
              </div>
            ) : null}

            {view === "vendors" ? (
              <section className="space-y-4">
                <SearchBox
                  label="Vendor approvals"
                  value={vendorSearch}
                  placeholder="Search vendors by name, slug, email, or area"
                  onChange={setVendorSearch}
                />
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                  <label className="mb-2 block text-xs uppercase tracking-[0.14em] text-white/50">
                    Vendor status filter
                  </label>
                  <select
                    value={vendorStatus}
                    onChange={(event) => setVendorStatus(event.target.value as VendorStatusOption)}
                    className="h-10 w-full rounded-lg border border-white/10 bg-white px-3 text-sm text-black md:max-w-xs"
                  >
                    {VENDOR_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
                {filteredVendors.map((vendor) => {
                  const saving = savingKey === `vendor:${vendor.id}`;
                  const location = [vendor.address, vendor.suburb, vendor.city, vendor.province]
                    .filter(Boolean)
                    .join(", ");
                  const cuisines = parseCuisine(vendor.cuisine);

                  return (
                    <article
                      key={vendor.id}
                      className="rounded-lg border border-white/10 bg-white/[0.035] p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold">{vendor.name}</h3>
                          <p className="text-xs text-white/60">/{vendor.slug}</p>
                        </div>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs ${statusClass(vendor.status)}`}
                        >
                          {vendor.status} {vendor.isActive ? "Live" : "Not live"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-white/78">{location || "Location not set"}</p>
                      <p className="mt-1 text-xs text-white/60">
                        {vendor.email || "No email provided"}
                        {vendor.phone ? ` | ${vendor.phone}` : ""}
                      </p>
                      <div className="mt-4 grid gap-2 text-xs text-white/65 md:grid-cols-3">
                        <div>Delivery: Lethela R10/km (R10 minimum)</div>
                        <div>Owner linked: {vendor.ownerId ? "Yes" : "No"}</div>
                        <div>
                          KYC:{" "}
                          {vendor.kycIdUrl && vendor.kycProofUrl ? "Complete" : "Needs documents"}
                        </div>
                        <div>Halaal: {vendor.halaal ? "Yes" : "No"}</div>
                        <div>
                          {cuisines.length > 0
                            ? `Cuisine: ${cuisines.join(", ")}`
                            : "Cuisine: Not set"}
                        </div>
                        <div>Applied: {formatDate(vendor.createdAt)}</div>
                        <div>Liquor: {vendor.liquorVerificationStatus.replaceAll("_", " ")}</div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <Button
                          className="bg-lethela-primary text-white hover:opacity-90"
                          disabled={saving}
                          onClick={() => updateVendorStatus(vendor.id, "approve")}
                        >
                          {saving ? "Saving..." : "Approve vendor"}
                        </Button>
                        <Button
                          variant="outline"
                          className="border-amber-300/50 bg-transparent text-amber-100 hover:bg-amber-200/10"
                          disabled={saving}
                          onClick={() => updateVendorStatus(vendor.id, "changes_requested")}
                        >
                          Request changes
                        </Button>
                        <Button
                          variant="outline"
                          className="border-red-300/50 bg-transparent text-red-100 hover:bg-red-200/10"
                          disabled={saving}
                          onClick={() => updateVendorStatus(vendor.id, "reject")}
                        >
                          Reject
                        </Button>
                        <Button
                          variant="outline"
                          className="border-white/25 bg-transparent text-white hover:bg-white/10"
                          disabled={saving}
                          onClick={() => updateVendorStatus(vendor.id, "suspend")}
                        >
                          Suspend
                        </Button>
                        {vendor.kycIdUrl ? (
                          <a
                            href={vendor.kycIdUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm underline"
                          >
                            ID document
                          </a>
                        ) : null}
                        {vendor.kycProofUrl ? (
                          <a
                            href={vendor.kycProofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm underline"
                          >
                            Proof of address
                          </a>
                        ) : null}
                        {vendor.liquorLicenceUrl ? (
                          <>
                            <a
                              href={vendor.liquorLicenceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm underline"
                            >
                              Liquor licence
                            </a>
                            <Button
                              className="bg-lethela-primary text-white hover:opacity-90"
                              disabled={savingKey === `liquor:${vendor.id}`}
                              onClick={() => updateLiquorStatus(vendor.id, "APPROVED")}
                            >
                              Approve liquor
                            </Button>
                            <Button
                              variant="outline"
                              className="border-amber-300/50 bg-transparent text-amber-100"
                              disabled={savingKey === `liquor:${vendor.id}`}
                              onClick={() => updateLiquorStatus(vendor.id, "CHANGES_REQUESTED")}
                            >
                              Liquor changes
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
                {!loading && filteredVendors.length === 0 ? (
                  <EmptyState
                    title="No vendors found"
                    text="There are no vendor applications for this filter yet."
                  />
                ) : null}
              </section>
            ) : null}

            {view === "products" ? (
              <section className="space-y-4">
                <SearchBox
                  label="Product review queue"
                  value={productSearch}
                  placeholder="Search products by name, vendor, status, or reason"
                  onChange={setProductSearch}
                />
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                  <label className="mb-2 block text-xs uppercase tracking-[0.14em] text-white/50">
                    Product status filter
                  </label>
                  <select
                    value={productStatus}
                    onChange={(event) =>
                      setProductStatus(event.target.value as ProductStatusFilter)
                    }
                    className="h-10 w-full rounded-lg border border-white/10 bg-white px-3 text-sm text-black md:max-w-xs"
                  >
                    {PRODUCT_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
                {filteredProducts.map((product) => (
                  <article
                    key={product.id}
                    className="rounded-lg border border-white/10 bg-white/[0.035] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">{product.name}</h3>
                        <p className="mt-1 text-xs text-white/60">
                          {product.vendor.name} · /{product.slug} · {money(product.priceCents)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${statusClass(product.status)}`}
                      >
                        {product.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    {product.description ? (
                      <p className="mt-3 text-sm text-white/70">{product.description}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/60">
                      <span>{product.inStock ? "In stock" : "Out of stock"}</span>
                      <span>
                        {product.isAlcohol
                          ? `Liquor 18+${product.abv ? ` · ${product.abv}% ABV` : ""}`
                          : "Standard product"}
                      </span>
                      <span>Vendor: {product.vendor.status.replaceAll("_", " ")}</span>
                      <span>Updated: {formatDate(product.updatedAt)}</span>
                    </div>
                    {product.reviewReason ? (
                      <p className="mt-3 rounded-lg border border-amber-200/20 bg-amber-300/10 p-3 text-sm text-amber-50">
                        Review reason: {product.reviewReason}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        className="bg-lethela-primary text-white hover:opacity-90"
                        disabled={savingKey === `product:${product.id}`}
                        onClick={() => updateProductStatus(product.id, "APPROVED")}
                      >
                        Approve product
                      </Button>
                      <Button
                        variant="outline"
                        className="border-amber-300/50 bg-transparent text-amber-100"
                        disabled={savingKey === `product:${product.id}`}
                        onClick={() => updateProductStatus(product.id, "CHANGES_REQUESTED")}
                      >
                        Request changes
                      </Button>
                      <Button
                        variant="outline"
                        className="border-red-300/50 bg-transparent text-red-100"
                        disabled={savingKey === `product:${product.id}`}
                        onClick={() => updateProductStatus(product.id, "REJECTED")}
                      >
                        Reject
                      </Button>
                    </div>
                  </article>
                ))}
                {!loading && filteredProducts.length === 0 ? (
                  <EmptyState
                    title="No products found"
                    text="There are no products in this review filter."
                  />
                ) : null}
              </section>
            ) : null}

            {view === "riders" ? (
              <section className="space-y-4">
                <SearchBox
                  label="Rider approvals and fleet"
                  value={riderSearch}
                  placeholder="Search riders by name, phone, vehicle, or area"
                  onChange={setRiderSearch}
                />
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                  <label className="mb-2 block text-xs uppercase tracking-[0.14em] text-white/50">
                    Rider status filter
                  </label>
                  <select
                    value={riderStatus}
                    onChange={(event) => setRiderStatus(event.target.value as RiderStatusFilter)}
                    className="h-10 w-full rounded-lg border border-white/10 bg-white px-3 text-sm text-black md:max-w-xs"
                  >
                    {RIDER_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <MetricCard
                    label="Pending"
                    value={riderCounts.pending}
                    note="New rider applications."
                    icon={Clock}
                    onClick={() => setRiderStatus("SUBMITTED")}
                  />
                  <MetricCard
                    label="Review"
                    value={riderCounts.underReview}
                    note="Documents being checked."
                    icon={PackageCheck}
                    onClick={() => setRiderStatus("UNDER_REVIEW")}
                  />
                  <MetricCard
                    label="Approved"
                    value={riderCounts.approved}
                    note="Riders ready for shifts."
                    icon={Bike}
                    onClick={() => setRiderStatus("APPROVED")}
                  />
                </div>
                {filteredRiders.map((rider) => (
                  <article
                    key={rider.id}
                    className="rounded-lg border border-white/10 bg-white/[0.035] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">{rider.fullName}</h3>
                        <p className="text-sm text-white/78">
                          {[rider.suburb, rider.city].filter(Boolean).join(", ") ||
                            "Location not set"}
                        </p>
                        <p className="text-xs text-white/60">
                          {rider.email} | {rider.phone}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${statusClass(rider.status)}`}
                      >
                        {rider.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-2 text-xs text-white/65 md:grid-cols-3">
                      <div>
                        Vehicle: {rider.vehicleType}
                        {rider.vehicleRegistration ? ` (${rider.vehicleRegistration})` : ""}
                      </div>
                      <div>Licence: {rider.licenseCode}</div>
                      <div>Available: {rider.availableHours}</div>
                      <div>ID ending: {rider.idNumberLast4}</div>
                      <div>
                        Emergency: {rider.emergencyContactName} ({rider.emergencyContactPhone})
                      </div>
                      <div>
                        Smartphone: {rider.hasSmartphone ? "Yes" : "No"} | Bank:{" "}
                        {rider.hasBankAccount ? "Yes" : "No"}
                      </div>
                    </div>
                    {rider.aiSummary ? (
                      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white/75">
                        {rider.aiSummary}
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-3">
                      {(
                        [
                          "SUBMITTED",
                          "UNDER_REVIEW",
                          "CHANGES_REQUESTED",
                          "APPROVED",
                          "REJECTED",
                          "SUSPENDED",
                        ] as RiderApplicationStatus[]
                      ).map((status) => (
                        <Button
                          key={status}
                          variant={status === "APPROVED" ? "default" : "outline"}
                          className={
                            status === "APPROVED"
                              ? "bg-lethela-primary text-white hover:opacity-90"
                              : "border-white/30 bg-transparent text-white hover:border-lethela-primary hover:text-lethela-primary"
                          }
                          disabled={savingKey === `rider:${rider.id}:${status}`}
                          onClick={() => updateRiderStatus(rider.id, status)}
                        >
                          {savingKey === `rider:${rider.id}:${status}`
                            ? "Saving..."
                            : status.replaceAll("_", " ")}
                        </Button>
                      ))}
                    </div>
                  </article>
                ))}
                {!loading && filteredRiders.length === 0 ? (
                  <EmptyState
                    title="No riders found"
                    text="There are no rider applications for this filter yet."
                  />
                ) : null}
              </section>
            ) : null}

            {view === "users" ? (
              <section className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                      People
                    </p>
                    <h3 className="mt-1 text-xl font-semibold">Customers</h3>
                    <p className="mt-1 text-sm text-white/55">
                      {customerMeta.total} registered account{customerMeta.total === 1 ? "" : "s"}.
                      Contact details are for authorised support use only.
                    </p>
                  </div>
                  <label className="w-full md:w-80">
                    <span className="sr-only">Search customers</span>
                    <input
                      type="search"
                      value={customerSearchInput}
                      onChange={(event) => setCustomerSearchInput(event.target.value)}
                      placeholder="Search name, email or phone"
                      className="h-10 w-full rounded-lg border border-white/10 bg-white px-3 text-sm text-black placeholder:text-black/40"
                      aria-label="Search customers"
                    />
                  </label>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.035]">
                  {customerState === "error" ? (
                    <div className="p-6 text-sm">
                      <p className="font-semibold text-white">Unable to load customers.</p>
                      <p className="mt-1 text-white/60">{customerError}</p>
                      <Button
                        className="mt-3 bg-lethela-primary text-white hover:opacity-90"
                        onClick={() => void loadCustomers(customerSearch, customerPage)}
                      >
                        Retry
                      </Button>
                    </div>
                  ) : customerState === "loading" && customers.length === 0 ? (
                    <div className="space-y-2 p-4">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div
                          key={index}
                          className="h-12 animate-pulse rounded-md border border-white/5 bg-white/[0.04]"
                        />
                      ))}
                    </div>
                  ) : customers.length === 0 ? (
                    <div className="p-6 text-sm">
                      <p className="font-semibold text-white">
                        {customerSearch
                          ? "No customers match this search."
                          : "No customer accounts yet."}
                      </p>
                      <p className="mt-1 text-white/60">
                        {customerSearch
                          ? "Check the spelling or clear the search."
                          : "Accounts appear here as soon as customers register."}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto p-2">
                      <table className="w-full min-w-[880px] border-separate border-spacing-y-2 text-left text-sm">
                        <thead className="text-xs uppercase tracking-[0.12em] text-white/38">
                          <tr>
                            <th className="px-3 py-2">Customer</th>
                            <th className="px-3 py-2">Phone</th>
                            <th className="px-3 py-2">Orders</th>
                            <th className="px-3 py-2">Total spent</th>
                            <th className="px-3 py-2">Last order</th>
                            <th className="px-3 py-2">Joined</th>
                            <th className="px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customers.map((customer) => (
                            <tr key={customer.id} className="bg-[#080B27]/75">
                              <td className="rounded-l-lg px-3 py-3">
                                <div className="font-semibold text-white">
                                  {customer.name || "—"}
                                </div>
                                <div className="text-xs text-white/55">{customer.email}</div>
                              </td>
                              <td className="px-3 py-3 text-white/70">{customer.phone || "—"}</td>
                              <td className="px-3 py-3 text-white/70">{customer.orderCount}</td>
                              <td className="px-3 py-3 text-white/70">
                                {money(customer.totalSpentCents)}
                              </td>
                              <td className="px-3 py-3 text-white/60">
                                {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "—"}
                              </td>
                              <td className="px-3 py-3 text-white/60">
                                {formatDate(customer.joinedAt)}
                              </td>
                              <td className="rounded-r-lg px-3 py-3">
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-xs ${
                                    customer.status === "LOCKED"
                                      ? "border-red-300/35 bg-red-300/10 text-red-100"
                                      : customer.status === "VERIFIED"
                                        ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-100"
                                        : "border-white/15 bg-white/5 text-white/65"
                                  }`}
                                >
                                  {customer.status === "VERIFIED"
                                    ? "Verified"
                                    : customer.status === "LOCKED"
                                      ? "Locked"
                                      : "Unverified"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {customerMeta.pageCount > 1 ? (
                  <div className="flex items-center justify-between gap-3 text-sm text-white/60">
                    <span>
                      Page {customerPage} of {customerMeta.pageCount} · {customerMeta.total} total
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="border-white/20 bg-transparent text-white hover:border-lethela-primary hover:text-lethela-primary"
                        disabled={customerPage <= 1 || customerState === "loading"}
                        onClick={() => setCustomerPage((page) => Math.max(1, page - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        className="border-white/20 bg-transparent text-white hover:border-lethela-primary hover:text-lethela-primary"
                        disabled={
                          customerPage >= customerMeta.pageCount || customerState === "loading"
                        }
                        onClick={() =>
                          setCustomerPage((page) => Math.min(customerMeta.pageCount, page + 1))
                        }
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            {view === "orders" ? (
              <section className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {orderMonitoring.map((item) => (
                    <MetricCard
                      key={item.label}
                      label={item.label}
                      value={item.value}
                      note={item.note}
                      icon={item.icon}
                      onClick={() => navigateView("operations")}
                    />
                  ))}
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-white/45">
                        Recent orders
                      </p>
                      <h3 className="mt-1 text-lg font-semibold">Order monitoring</h3>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">
                      {filteredOrders.length} matching · {operationsOrders.length} recent loaded
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 rounded-lg border border-white/10 bg-white/[0.025] p-3 sm:grid-cols-2 xl:grid-cols-6">
                    <label className="xl:col-span-2">
                      <span className="sr-only">Search orders</span>
                      <input
                        type="search"
                        value={orderSearch}
                        onChange={(event) => setOrderSearch(event.target.value)}
                        placeholder="Order, customer, vendor or rider"
                        className="h-11 w-full rounded-lg border border-white/15 bg-white px-3 text-sm text-black placeholder:text-black/45"
                      />
                    </label>
                    <label>
                      <span className="sr-only">Order status</span>
                      <select
                        value={orderStatusFilter}
                        onChange={(event) => setOrderStatusFilter(event.target.value)}
                        className="h-11 w-full rounded-lg border border-white/15 bg-white px-3 text-sm text-black"
                      >
                        <option value="ALL">All statuses</option>
                        {[
                          "NEW",
                          "VENDOR_ACCEPTED",
                          "PREPARING",
                          "READY_FOR_PICKUP",
                          "RIDER_ASSIGNED",
                          "PICKED_UP",
                          "ON_THE_WAY",
                          "DELIVERED",
                          "CANCELLED",
                          "FAILED",
                        ].map((status) => (
                          <option key={status} value={status}>
                            {status.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="sr-only">Payment status</span>
                      <select
                        value={orderPaymentFilter}
                        onChange={(event) => setOrderPaymentFilter(event.target.value)}
                        className="h-11 w-full rounded-lg border border-white/15 bg-white px-3 text-sm text-black"
                      >
                        <option value="ALL">All payments</option>
                        <option value="PENDING">Pending payment</option>
                        <option value="PAID">Paid</option>
                        <option value="SUCCESS">Successful</option>
                        <option value="FAILED">Failed</option>
                        <option value="REFUNDED">Refunded</option>
                      </select>
                    </label>
                    <label>
                      <span className="sr-only">Order period</span>
                      <select
                        value={orderPeriodFilter}
                        onChange={(event) => setOrderPeriodFilter(event.target.value)}
                        className="h-11 w-full rounded-lg border border-white/15 bg-white px-3 text-sm text-black"
                      >
                        <option value="ALL">All recent dates</option>
                        <option value="TODAY">Today</option>
                        <option value="MONTH">This month</option>
                      </select>
                    </label>
                    <label>
                      <span className="sr-only">Sort orders</span>
                      <select
                        value={orderSort}
                        onChange={(event) =>
                          setOrderSort(event.target.value as "newest" | "oldest")
                        }
                        className="h-11 w-full rounded-lg border border-white/15 bg-white px-3 text-sm text-black"
                      >
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                      </select>
                    </label>
                  </div>

                  {filteredOrders.length === 0 ? (
                    <div className="mt-4">
                      <EmptyState
                        title={
                          operationsOrders.length
                            ? "No orders match these filters"
                            : "No orders loaded"
                        }
                        text={
                          operationsOrders.length
                            ? "Clear or change the filters to see other recent orders."
                            : "Paid and pending orders will appear here as customers begin ordering."
                        }
                      />
                    </div>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-[1320px] text-sm">
                        <thead>
                          <tr>
                            <th className="px-3 py-3 text-left">Order</th>
                            <th className="px-3 py-3 text-left">Customer</th>
                            <th className="px-3 py-3 text-left">Vendor</th>
                            <th className="px-3 py-3 text-left">Rider</th>
                            <th className="px-3 py-3 text-right">Items</th>
                            <th className="px-3 py-3 text-right">Subtotal</th>
                            <th className="px-3 py-3 text-right">Delivery</th>
                            <th className="px-3 py-3 text-right">Tip</th>
                            <th className="px-3 py-3 text-right">Total</th>
                            <th className="px-3 py-3 text-left">Payment</th>
                            <th className="px-3 py-3 text-left">Status</th>
                            <th className="px-3 py-3 text-left">Created</th>
                            <th className="px-3 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleOrders.map((order) => (
                            <tr key={order.id}>
                              <td className="border-t border-white/10 px-3 py-3 font-semibold">
                                {order.ozowReference || order.publicId}
                              </td>
                              <td className="border-t border-white/10 px-3 py-3">
                                <div>{order.customerName || "Guest"}</div>
                                <div className="text-xs text-white/50">
                                  {order.customerEmail || "—"}
                                </div>
                              </td>
                              <td className="border-t border-white/10 px-3 py-3">
                                {order.vendorName}
                              </td>
                              <td className="border-t border-white/10 px-3 py-3">
                                {order.riderName || "Unassigned"}
                              </td>
                              <td className="border-t border-white/10 px-3 py-3 text-right">
                                {order.itemCount}
                              </td>
                              <td className="border-t border-white/10 px-3 py-3 text-right">
                                {money(order.subtotalCents)}
                              </td>
                              <td className="border-t border-white/10 px-3 py-3 text-right">
                                {money(order.deliveryFeeCents)}
                              </td>
                              <td className="border-t border-white/10 px-3 py-3 text-right">
                                {money(order.riderTipCents)}
                              </td>
                              <td className="border-t border-white/10 px-3 py-3 text-right font-semibold">
                                {money(order.totalCents)}
                              </td>
                              <td className="border-t border-white/10 px-3 py-3">
                                {order.paymentStatus}
                              </td>
                              <td className="border-t border-white/10 px-3 py-3">
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(order.status)}`}
                                >
                                  {order.status.replaceAll("_", " ")}
                                </span>
                              </td>
                              <td className="border-t border-white/10 px-3 py-3 text-white/60">
                                {formatDate(order.createdAt)}
                              </td>
                              <td className="border-t border-white/10 px-3 py-3 text-right">
                                <button
                                  type="button"
                                  className="rounded-md bg-lethela-primary px-3 py-2 text-xs font-semibold text-white"
                                  onClick={() => {
                                    setOperationsForm((current) => ({
                                      ...current,
                                      orderRef: order.ozowReference || order.publicId,
                                    }));
                                    navigateView("operations");
                                  }}
                                >
                                  Manage
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {orderPageCount > 1 ? (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-white/60">
                      <span>
                        Page {orderPage} of {orderPageCount}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="border-white/20 bg-transparent text-white"
                          disabled={orderPage <= 1}
                          onClick={() => setOrderPage((page) => Math.max(1, page - 1))}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          className="border-white/20 bg-transparent text-white"
                          disabled={orderPage >= orderPageCount}
                          onClick={() => setOrderPage((page) => Math.min(orderPageCount, page + 1))}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {view === "messages" ? (
              <section className="grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-lethela-primary/15 text-lethela-primary">
                      <MessageSquare className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold">Send owner message</h3>
                      <p className="text-sm text-white/60">
                        Message vendors, riders, or everyone from one place.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    <label className="grid gap-1 text-sm">
                      <span className="text-xs uppercase tracking-[0.14em] text-white/50">
                        Recipient
                      </span>
                      <select
                        className="h-10 rounded-lg border border-white/10 bg-white px-3 text-sm text-black"
                        value={messageForm.recipientType}
                        onChange={(event) =>
                          setMessageForm((state) => ({
                            ...state,
                            recipientType: event.target.value as MessageRecipientType,
                            recipientId: "",
                          }))
                        }
                      >
                        <option value="ALL">All vendors and riders</option>
                        <option value="ALL_VENDORS">All active vendors</option>
                        <option value="ALL_RIDERS">All approved riders</option>
                        <option value="VENDOR">One vendor</option>
                        <option value="RIDER">One rider</option>
                      </select>
                    </label>

                    {messageForm.recipientType === "VENDOR" ? (
                      <label className="grid gap-1 text-sm">
                        <span className="text-xs uppercase tracking-[0.14em] text-white/50">
                          Vendor
                        </span>
                        <select
                          className="h-10 rounded-lg border border-white/10 bg-white px-3 text-sm text-black"
                          value={messageForm.recipientId}
                          onChange={(event) =>
                            setMessageForm((state) => ({
                              ...state,
                              recipientId: event.target.value,
                            }))
                          }
                        >
                          <option value="">Choose vendor</option>
                          {vendors.map((vendor) => (
                            <option key={vendor.id} value={vendor.id}>
                              {vendor.name} ({vendor.status})
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    {messageForm.recipientType === "RIDER" ? (
                      <label className="grid gap-1 text-sm">
                        <span className="text-xs uppercase tracking-[0.14em] text-white/50">
                          Rider
                        </span>
                        <select
                          className="h-10 rounded-lg border border-white/10 bg-white px-3 text-sm text-black"
                          value={messageForm.recipientId}
                          onChange={(event) =>
                            setMessageForm((state) => ({
                              ...state,
                              recipientId: event.target.value,
                            }))
                          }
                        >
                          <option value="">Choose rider</option>
                          {riders.map((rider) => (
                            <option key={rider.id} value={rider.id}>
                              {rider.fullName} ({rider.status.replaceAll("_", " ")})
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    <label className="grid gap-1 text-sm">
                      <span className="text-xs uppercase tracking-[0.14em] text-white/50">
                        Channel
                      </span>
                      <select
                        className="h-10 rounded-lg border border-white/10 bg-white px-3 text-sm text-black"
                        value={messageForm.channel}
                        onChange={(event) =>
                          setMessageForm((state) => ({
                            ...state,
                            channel: event.target.value as "DASHBOARD" | "EMAIL_WHATSAPP" | "ALL",
                          }))
                        }
                      >
                        <option value="ALL">Dashboard plus email/WhatsApp</option>
                        <option value="DASHBOARD">Dashboard inbox only</option>
                        <option value="EMAIL_WHATSAPP">Email and WhatsApp plus inbox</option>
                      </select>
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="text-xs uppercase tracking-[0.14em] text-white/50">
                        Subject
                      </span>
                      <input
                        className="h-10 rounded-lg border border-white/10 bg-white px-3 text-sm text-black"
                        value={messageForm.subject}
                        onChange={(event) =>
                          setMessageForm((state) => ({ ...state, subject: event.target.value }))
                        }
                        placeholder="Weekend specials, payout notice, rider shift update..."
                      />
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="text-xs uppercase tracking-[0.14em] text-white/50">
                        Message
                      </span>
                      <textarea
                        className="min-h-36 rounded-lg border border-white/10 bg-white px-3 py-2 text-sm text-black"
                        value={messageForm.body}
                        onChange={(event) =>
                          setMessageForm((state) => ({ ...state, body: event.target.value }))
                        }
                        placeholder="Write the operational message here..."
                      />
                    </label>

                    <Button
                      className="bg-lethela-primary text-white hover:opacity-90"
                      disabled={savingKey === "message:send"}
                      onClick={sendOwnerMessage}
                    >
                      {savingKey === "message:send" ? "Sending..." : "Send message"}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">Recent owner messages</h3>
                      <p className="text-sm text-white/60">
                        Sent dashboard messages are saved here for audit and follow-up.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="border-white/30 bg-transparent text-white hover:border-lethela-primary hover:text-lethela-primary"
                      onClick={load}
                    >
                      Refresh
                    </Button>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {messages.length === 0 ? (
                      <EmptyState
                        title="No messages yet"
                        text="Send your first update to vendors or riders."
                      />
                    ) : (
                      messages.map((message) => (
                        <article
                          key={message.id}
                          className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-semibold">{message.subject}</h4>
                              <p className="mt-1 text-xs text-white/45">
                                {message.recipientType.replaceAll("_", " ")}
                                {message.recipientId ? ` · ${message.recipientId}` : ""} ·{" "}
                                {new Date(message.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/65">
                              {message.channel.replaceAll("_", " ")}
                            </span>
                          </div>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/72">
                            {message.body}
                          </p>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {view === "finance" ? (
              <section className="space-y-4" aria-labelledby="finance-heading">
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                    Finance
                  </p>
                  <h3 id="finance-heading" className="mt-1 text-xl font-semibold">
                    Marketplace money flow
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
                    Paid orders only. Delivery fees and rider tips are shown separately because they
                    belong entirely to the rider and are never counted as Lethela platform revenue.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    label="Gross merchandise value"
                    value={stats ? money(stats.grossMerchandiseValueMonthCents) : "—"}
                    note="Product value from paid orders this month."
                    icon={ShoppingBag}
                    onClick={() => navigateView("orders", { period: "month" })}
                  />
                  <MetricCard
                    label="Platform revenue"
                    value={stats ? money(stats.revenueMonthCents) : "—"}
                    note="Lethela commission this month."
                    icon={LineChart}
                    onClick={() => navigateView("orders", { period: "month" })}
                  />
                  <MetricCard
                    label="Vendor sales"
                    value={stats ? money(stats.vendorSalesMonthCents) : "—"}
                    note="Vendor payout value this month."
                    icon={Store}
                    onClick={() => navigateView("orders", { period: "month" })}
                  />
                  <MetricCard
                    label="Customer payments"
                    value={stats ? money(stats.customerPaymentsMonthCents) : "—"}
                    note="Full paid customer charge for reconciliation."
                    icon={WalletCards}
                    onClick={() => navigateView("orders", { period: "month" })}
                  />
                  <MetricCard
                    label="Delivery earnings"
                    value={stats ? money(stats.deliveryFeesMonthCents) : "—"}
                    note="Delivery fees owed entirely to riders."
                    icon={Bike}
                    onClick={() => navigateView("riders", { status: "APPROVED" })}
                  />
                  <MetricCard
                    label="Rider tips"
                    value={stats ? money(stats.riderTipsMonthCents) : "—"}
                    note="Tips owed entirely to riders."
                    icon={WalletCards}
                    onClick={() => navigateView("riders", { status: "APPROVED" })}
                  />
                  <MetricCard
                    label="Total rider earnings"
                    value={stats ? money(stats.riderEarningsMonthCents) : "—"}
                    note="Recorded rider payout value this month."
                    icon={Truck}
                    onClick={() => navigateView("riders", { status: "APPROVED" })}
                  />
                  <MetricCard
                    label="Open refund cases"
                    value={
                      operationsRefunds.filter(
                        (refund) =>
                          !["COMPLETED", "PAID", "REJECTED", "CANCELLED", "CLOSED"].includes(
                            refund.status,
                          ),
                      ).length
                    }
                    note="Cases requiring finance or support review."
                    icon={Bell}
                    onClick={() => navigateView("operations", { filter: "refunds" })}
                  />
                </div>
              </section>
            ) : null}

            {view === "operations" ? (
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Email"
                  value={channels?.email.enabled ? channels.email.recipients : "Off"}
                  note="Admin recipient coverage."
                  icon={Mail}
                />
                <MetricCard
                  label="WhatsApp"
                  value={channels?.whatsapp.enabled ? channels.whatsapp.recipients : "Off"}
                  note="Operations escalation channel."
                  icon={Bell}
                />
                <MetricCard
                  label="Applicant email"
                  value={applicantChannels?.email.enabled ? "On" : "Off"}
                  note="Vendor and rider confirmations and approval notices."
                  icon={Mail}
                />
                <MetricCard
                  label="Applicant WhatsApp"
                  value={applicantChannels?.whatsapp.enabled ? "On" : "Off"}
                  note="Compulsory phone-based onboarding updates."
                  icon={Bell}
                />
                <MetricCard
                  label="Settings"
                  value={authMode || "Local"}
                  note={`Browser push: ${pushPermission}`}
                  icon={Settings}
                />
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5 md:col-span-2 xl:col-span-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-white/45">
                    Settings / Developer Tools
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">Admin access key</h3>
                  <p className="mt-1 text-sm text-white/60">
                    Use this only when the production admin approval key is required to restore
                    owner access on this browser.
                  </p>
                  <input
                    className="mt-4 h-10 w-full max-w-md rounded-lg border border-white/10 bg-white px-3 text-sm text-black outline-none focus:ring-2 focus:ring-lethela-primary"
                    value={adminKey}
                    onChange={(event) => setAdminKey(event.target.value)}
                    placeholder="ADMIN_APPROVAL_KEY"
                    type="password"
                  />
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5 md:col-span-2 xl:col-span-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-white/45">
                        Order control
                      </p>
                      <h3 className="mt-1 text-lg font-semibold">Operations center</h3>
                      <p className="mt-1 text-sm text-white/60">
                        Update order lifecycle, assign approved riders, log refund cases and keep an
                        audit trail for support follow-up.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="border-white/30 bg-transparent text-white hover:border-lethela-primary hover:text-lethela-primary"
                      onClick={load}
                    >
                      Refresh
                    </Button>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
                    <div className="grid gap-3">
                      <label className="grid gap-1 text-sm">
                        <span className="text-xs uppercase tracking-[0.14em] text-white/50">
                          Order
                        </span>
                        <select
                          className="h-10 rounded-lg border border-white/10 bg-white px-3 text-sm text-black"
                          value={operationsForm.orderRef}
                          onChange={(event) =>
                            setOperationsForm((state) => ({
                              ...state,
                              orderRef: event.target.value,
                            }))
                          }
                        >
                          <option value="">Choose recent order</option>
                          {operationsOrders.map((order) => (
                            <option key={order.id} value={order.publicId}>
                              {order.publicId} - {order.vendorName} - {money(order.totalCents)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="grid gap-1 text-sm">
                        <span className="text-xs uppercase tracking-[0.14em] text-white/50">
                          Manual reference
                        </span>
                        <input
                          className="h-10 rounded-lg border border-white/10 bg-white px-3 text-sm text-black"
                          value={operationsForm.orderRef}
                          onChange={(event) =>
                            setOperationsForm((state) => ({
                              ...state,
                              orderRef: event.target.value,
                            }))
                          }
                          placeholder="LET-..."
                        />
                      </label>

                      <label className="grid gap-1 text-sm">
                        <span className="text-xs uppercase tracking-[0.14em] text-white/50">
                          Status
                        </span>
                        <select
                          className="h-10 rounded-lg border border-white/10 bg-white px-3 text-sm text-black"
                          value={operationsForm.status}
                          onChange={(event) =>
                            setOperationsForm((state) => ({
                              ...state,
                              status: event.target.value,
                            }))
                          }
                        >
                          {[
                            "PENDING_PAYMENT",
                            "PAID",
                            "NEW",
                            "VENDOR_ACCEPTED",
                            "PREPARING",
                            "READY_FOR_PICKUP",
                            "RIDER_ASSIGNED",
                            "PICKED_UP",
                            "ON_THE_WAY",
                            "DELIVERED",
                            "CANCELLED",
                            "REFUND_REQUESTED",
                            "REFUNDED",
                            "FAILED",
                          ].map((status) => (
                            <option key={status} value={status}>
                              {status.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="grid gap-1 text-sm">
                        <span className="text-xs uppercase tracking-[0.14em] text-white/50">
                          Approved rider
                        </span>
                        <select
                          className="h-10 rounded-lg border border-white/10 bg-white px-3 text-sm text-black"
                          value={operationsForm.riderApplicationId}
                          onChange={(event) =>
                            setOperationsForm((state) => ({
                              ...state,
                              riderApplicationId: event.target.value,
                            }))
                          }
                        >
                          <option value="">Choose rider</option>
                          {operationsRiders.map((rider) => (
                            <option key={rider.id} value={rider.id}>
                              {rider.fullName} - {rider.suburb || rider.city} - {rider.vehicleType}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="grid gap-1 text-sm">
                          <span className="text-xs uppercase tracking-[0.14em] text-white/50">
                            Refund amount
                          </span>
                          <input
                            className="h-10 rounded-lg border border-white/10 bg-white px-3 text-sm text-black"
                            value={operationsForm.refundAmountRand}
                            onChange={(event) =>
                              setOperationsForm((state) => ({
                                ...state,
                                refundAmountRand: event.target.value,
                              }))
                            }
                            placeholder="0.00"
                          />
                        </label>
                        <label className="grid gap-1 text-sm">
                          <span className="text-xs uppercase tracking-[0.14em] text-white/50">
                            Evidence URL
                          </span>
                          <input
                            className="h-10 rounded-lg border border-white/10 bg-white px-3 text-sm text-black"
                            value={operationsForm.evidenceUrl}
                            onChange={(event) =>
                              setOperationsForm((state) => ({
                                ...state,
                                evidenceUrl: event.target.value,
                              }))
                            }
                            placeholder="Photo or proof link"
                          />
                        </label>
                      </div>

                      <label className="grid gap-1 text-sm">
                        <span className="text-xs uppercase tracking-[0.14em] text-white/50">
                          Refund reason
                        </span>
                        <input
                          className="h-10 rounded-lg border border-white/10 bg-white px-3 text-sm text-black"
                          value={operationsForm.refundReason}
                          onChange={(event) =>
                            setOperationsForm((state) => ({
                              ...state,
                              refundReason: event.target.value,
                            }))
                          }
                          placeholder="Missing item, failed delivery, incorrect order..."
                        />
                      </label>

                      <label className="grid gap-1 text-sm">
                        <span className="text-xs uppercase tracking-[0.14em] text-white/50">
                          Operations note
                        </span>
                        <textarea
                          className="min-h-24 rounded-lg border border-white/10 bg-white px-3 py-2 text-sm text-black"
                          value={operationsForm.note}
                          onChange={(event) =>
                            setOperationsForm((state) => ({ ...state, note: event.target.value }))
                          }
                          placeholder="What happened and what action was taken?"
                        />
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          className="bg-lethela-primary text-white"
                          disabled={savingKey === "operation:status"}
                          onClick={() => void submitOperation("status")}
                        >
                          Update status
                        </Button>
                        <Button
                          variant="outline"
                          className="border-white/30 bg-transparent text-white hover:border-lethela-primary hover:text-lethela-primary"
                          disabled={savingKey === "operation:dispatch"}
                          onClick={() => void submitOperation("dispatch")}
                        >
                          Assign rider
                        </Button>
                        <Button
                          variant="outline"
                          className="border-white/30 bg-transparent text-white hover:border-lethela-primary hover:text-lethela-primary"
                          disabled={savingKey === "operation:refund"}
                          onClick={() => void submitOperation("refund")}
                        >
                          Create refund case
                        </Button>
                        <Button
                          variant="outline"
                          className="border-white/30 bg-transparent text-white hover:border-lethela-primary hover:text-lethela-primary"
                          disabled={savingKey === "operation:event"}
                          onClick={() => void submitOperation("event")}
                        >
                          Save note
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <div className="rounded-lg border border-white/10 bg-black/10 p-4">
                        <h4 className="text-sm font-semibold text-white">
                          Recent order money split
                        </h4>
                        <div className="mt-3 grid gap-2">
                          {operationsOrders.length === 0 ? (
                            <p className="text-sm text-white/55">No recent orders loaded yet.</p>
                          ) : (
                            operationsOrders.slice(0, 5).map((order) => (
                              <div
                                key={order.id}
                                className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-xs text-white/70"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-semibold text-white">{order.publicId}</span>
                                  <span>{order.vendorName}</span>
                                </div>
                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                  <span>Products: {money(order.subtotalCents)}</span>
                                  <span>Vendor payout: {money(order.vendorPayoutCents)}</span>
                                  <span>Delivery fee: {money(order.deliveryFeeCents)}</span>
                                  <span>Tip: {money(order.riderTipCents)}</span>
                                  <span>Rider payout: {money(order.riderPayoutCents)}</span>
                                  <span>Total paid: {money(order.totalCents)}</span>
                                </div>
                                <div className="mt-2 text-white/50">
                                  {order.deliveryDistanceKm != null
                                    ? `${order.deliveryDistanceKm.toFixed(2)} km`
                                    : "Distance pending"}
                                  {order.containsAlcohol ? " - Liquor ID check required" : ""}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <OperationsFeed
                        title="Recent order events"
                        empty="No order events logged yet."
                        items={operationsEvents.map((event) => ({
                          id: event.id,
                          title: `${event.publicId} - ${event.type.replaceAll("_", " ")}`,
                          body: event.note || event.actor || "No note captured.",
                          meta: new Date(event.createdAt).toLocaleString(),
                        }))}
                      />
                      <OperationsFeed
                        title="Refund cases"
                        empty="No refund cases yet."
                        items={operationsRefunds.map((refund) => ({
                          id: refund.id,
                          title: `${refund.publicId} - ${money(refund.amountCents)} - ${refund.status}`,
                          body: `${refund.reason}${refund.note ? ` - ${refund.note}` : ""}`,
                          meta: new Date(refund.createdAt).toLocaleString(),
                        }))}
                      />
                      <OperationsFeed
                        title="Dispatch assignments"
                        empty="No rider assignments yet."
                        items={operationsDispatches.map((dispatch) => ({
                          id: dispatch.id,
                          title: `${dispatch.publicId} - ${dispatch.riderName}`,
                          body: `${dispatch.status} - ${dispatch.riderPhone}${
                            dispatch.note ? ` - ${dispatch.note}` : ""
                          }`,
                          meta: new Date(dispatch.createdAt).toLocaleString(),
                        }))}
                      />
                      <OperationsFeed
                        title="Audit logs"
                        empty="No admin audit logs yet."
                        items={auditLogs.map((log) => ({
                          id: log.id,
                          title: `${log.action.replaceAll("_", " ")} - ${log.targetType}`,
                          body: `${log.actor} updated ${log.targetId}`,
                          meta: new Date(log.createdAt).toLocaleString(),
                        }))}
                      />
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5 md:col-span-2 xl:col-span-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-white/45">
                        Owner control room
                      </p>
                      <h3 className="mt-1 text-lg font-semibold">Operating readiness workflow</h3>
                    </div>
                    <Link
                      href="/admin/launch-checklist"
                      className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/75 transition hover:border-lethela-primary hover:text-lethela-primary"
                    >
                      Open readiness checklist
                    </Link>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-white/70 md:grid-cols-3">
                    <p className="rounded-lg border border-white/10 p-3">
                      Vendor registration sends an applicant confirmation and owner alert.
                    </p>
                    <p className="rounded-lg border border-white/10 p-3">
                      Rider registration sends an applicant confirmation and owner alert.
                    </p>
                    <p className="rounded-lg border border-white/10 p-3">
                      Approval or rejection sends a decision notice by email and WhatsApp.
                    </p>
                  </div>
                </div>
                <OperationsList
                  title="Daily operating SOP"
                  items={DAILY_OPERATING_PLAYBOOK}
                  className="md:col-span-2 xl:col-span-4"
                />
                <OperationsList
                  title="Order exception SOP"
                  items={ORDER_EXCEPTION_PLAYBOOK}
                  className="md:col-span-2"
                />
                <OperationsList
                  title="Scale-up gate"
                  items={SCALE_READINESS_PLAYBOOK}
                  className="md:col-span-2"
                />
              </section>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

function OperationsList({
  title,
  items,
  className = "",
}: {
  title: string;
  items: string[];
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-white/10 bg-white/[0.035] p-5 ${className}`}>
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <div key={item} className="flex gap-3 rounded-lg border border-white/10 p-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lethela-primary" />
            <p className="text-sm leading-6 text-white/72">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function OperationsFeed({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ id: string; title: string; body: string; meta: string }>;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/10 p-4">
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <div className="mt-3 grid gap-2">
        {items.length === 0 ? (
          <p className="text-sm text-white/55">{empty}</p>
        ) : (
          items.slice(0, 5).map((item) => (
            <article
              key={item.id}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-3"
            >
              <div className="text-sm font-medium text-white">{item.title}</div>
              <p className="mt-1 text-xs leading-5 text-white/65">{item.body}</p>
              <div className="mt-2 text-[11px] text-white/40">{item.meta}</div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function SearchBox({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <label className="mb-2 block text-xs uppercase tracking-[0.14em] text-white/50">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white px-3">
        <Search className="h-4 w-4 text-black/45" />
        <input
          className="h-10 min-w-0 flex-1 bg-transparent text-sm text-black outline-none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
