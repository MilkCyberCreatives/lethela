"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  Bike,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  ImageOff,
  LayoutDashboard,
  LineChart,
  Mail,
  MessageSquare,
  PackageCheck,
  RefreshCw,
  Search,
  Settings,
  ShoppingBag,
  Store,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";
import DashboardShell, { type DashboardNavItem } from "@/components/dashboard/kit/DashboardShell";
import {
  dashButton,
  dashField,
  DetailRow,
  EmptyState as DashEmptyState,
  FilterTabs,
  Notice,
  PageHeader,
  Panel,
  StatTile,
  StatusBadge,
  statusText,
  toneForStatus,
} from "@/components/dashboard/kit/ui";
import NotificationBell from "@/components/dashboard/NotificationBell";

type DashboardView =
  | "overview"
  | "vendors"
  | "products"
  | "riders"
  | "users"
  | "orders"
  | "messages"
  | "finance"
  | "operations"
  | "activity";

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
  "activity",
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

type ProductCounts = {
  submitted: number;
  changesRequested: number;
  approved: number;
  rejected: number;
  total: number;
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
  township?: string | null;
  storeType?: string | null;
  hasBankAccount?: boolean;
  productCount?: number;
  menuItemCount?: number;
  pendingProductCount?: number;
  openDays?: number;
  ownerCanSignIn?: boolean;
  readiness?: ApprovalReadiness;
};

type ApprovalReadiness = { canApprove: boolean; missing: string[]; later: string[] };

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
  province?: string;
  township?: string;
  municipality?: string;
  reviewReason?: string | null;
  hasIdDocument?: boolean;
  hasPhoto?: boolean;
  hasLicenceDocument?: boolean;
  accountCanSignIn?: boolean;
  readiness?: ApprovalReadiness;
};

type RiderCounts = {
  draft?: number;
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

type PushSegment = "ALL" | "ENGAGED" | "LOYAL" | "NO_ORDER_YET";

type PushCampaignSummary = {
  id: string;
  title: string;
  segment: string;
  sentCount: number;
  failedCount: number;
  createdAt: string;
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
  status: "VERIFIED" | "UNVERIFIED" | "ACTIVE" | "LOCKED";
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
  items: Array<{
    id: DashboardView;
    label: string;
    shortLabel?: string;
    icon: typeof LayoutDashboard;
  }>;
}> = [
  {
    title: "Overview",
    items: [{ id: "overview", label: "Overview", shortLabel: "Home", icon: LayoutDashboard }],
  },
  {
    title: "Daily work",
    items: [
      { id: "operations", label: "Operations", shortLabel: "Dispatch", icon: Activity },
      { id: "orders", label: "Orders", icon: ShoppingBag },
    ],
  },
  {
    title: "Approvals",
    items: [
      { id: "vendors", label: "Vendors", icon: Store },
      { id: "products", label: "Products", icon: PackageCheck },
      { id: "riders", label: "Riders", icon: Bike },
    ],
  },
  {
    title: "People and money",
    items: [
      { id: "users", label: "Customers", icon: Users },
      { id: "messages", label: "Messages", icon: MessageSquare },
      { id: "finance", label: "Finance", icon: WalletCards },
      { id: "activity", label: "Activity log", icon: Clock },
    ],
  },
];

const VIEW_COPY: Record<DashboardView, { title: string; description: string }> = {
  overview: {
    title: "Overview",
    description: "What needs you today and how Lethela is doing.",
  },
  operations: {
    title: "Operations",
    description: "Assign riders, update orders, handle refunds and keep support notes.",
  },
  orders: {
    title: "Orders",
    description: "Every order, its payment and where it is now.",
  },
  vendors: {
    title: "Vendors",
    description:
      "A store can be approved once it has a name, phone number, address, opening hours and at least one item.",
  },
  riders: {
    title: "Riders",
    description:
      "A rider can be approved once they have a name, phone number, delivery method, area and the rider agreement.",
  },
  products: {
    title: "Products",
    description:
      "New and changed items wait here until you approve them. Approve the store first, then its items.",
  },
  users: {
    title: "Customers",
    description: "Registered customer accounts. Contact details are for support only.",
  },
  messages: {
    title: "Messages",
    description: "Send updates to vendors and riders, and see what was sent.",
  },
  finance: {
    title: "Finance",
    description: "Money in, Lethela's commission and what is owed to vendors and riders.",
  },
  activity: {
    title: "Activity log",
    description: "Every admin action: who did it, what changed and when.",
  },
};

// The order statuses an admin may set. Must match ADMIN_OPERATIONAL_STATUSES in
// src/app/api/admin/operations/route.ts, which rejects anything else.
const ADMIN_ORDER_STATUSES = [
  "NEW",
  "VENDOR_ACCEPTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "ON_THE_WAY",
  "DELIVERED",
  "CANCELLED",
  "FAILED",
] as const;

const DAILY_OPERATING_PLAYBOOK = [
  "Approve only vendors and riders you know. A store needs a name, phone number, address, opening hours and at least one item. A rider needs a name, phone number, how they deliver, their area and the rider agreement.",
  "Banking details, documents and photos can come later. Check a vendor has added banking before their first payout.",
  "Approve each store's items after the store. Use Approve all on the Products page for a store you trust.",
  "Keep WhatsApp support open while stores are open, and note every complaint, refund and failed delivery here.",
  "Liquor only from stores with an approved, current licence. Riders check ID and may refuse handover.",
];

const ORDER_EXCEPTION_PLAYBOOK = [
  "Store cannot fill the order: call the store, pause it if needed, and offer the customer a swap, credit or refund.",
  "Missing or wrong item: ask for a photo if useful, speak to the store, then record the fix or open a refund case.",
  "Rider running late: call the rider first, tell the customer a realistic time, and give the order to another rider if needed.",
  "Payment does not match: match the Ozow reference to the order before you deliver or refund.",
  "Complaint: keep the order reference, customer phone, store, rider and what you did together in the order note.",
];

const SCALE_READINESS_PLAYBOOK = [
  "Small start: at least 1 approved store, 5 approved items, 1 approved rider and 1 real paid order delivered.",
  "Before advertising widely: at least 3 stores, 20 items, 2 riders and 5 real paid orders delivered.",
  "Use real photos of each store and its food before promoting it.",
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
  return <StatTile label={label} value={value} hint={note} icon={<Icon />} onClick={onClick} />;
}

function AdminSectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function EmptyState({
  title,
  text,
  compact = false,
}: {
  title: string;
  text: string;
  compact?: boolean;
}) {
  return <DashEmptyState title={title} text={text} compact={compact} />;
}

function AdminSearch({
  value,
  onChange,
  onSearch,
  groups,
  loading,
  onSelectResult,
}: {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  groups: GlobalSearchGroups | null;
  loading: boolean;
  onSelectResult: (result: GlobalSearchResult) => void;
}) {
  const resultCount = Object.values(groups ?? {}).reduce(
    (total, items) => total + (items?.length ?? 0),
    0,
  );

  return (
    <form
      role="search"
      className="relative flex min-h-10 w-full items-center rounded-lg border border-slate-200 bg-slate-50 px-3 focus-within:border-lethela-primary focus-within:bg-white"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}
    >
      <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      <input
        className="h-10 min-w-0 flex-1 bg-transparent px-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        placeholder="Search orders, stores, riders or products"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Search dashboard records"
      />
      <button
        type="submit"
        className="rounded-md px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
      >
        {loading ? "Searching…" : "Search"}
      </button>
      {groups ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
          {resultCount === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-500">Nothing matches that search.</p>
          ) : (
            Object.entries(groups).map(([group, items]) =>
              items && items.length > 0 ? (
                <div key={group} className="py-1">
                  <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {group}
                  </p>
                  {items.map((item) => (
                    <button
                      key={`${group}-${item.id}`}
                      type="button"
                      onClick={() => onSelectResult(item)}
                      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          {item.title}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {item.subtitle}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </button>
                  ))}
                </div>
              ) : null,
            )
          )}
        </div>
      ) : null}
    </form>
  );
}

function PriorityCard({
  label,
  value,
  note,
  icon: Icon,
  onClick,
  attention = false,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: typeof LayoutDashboard;
  onClick: () => void;
  attention?: boolean;
}) {
  return (
    <StatTile
      label={label}
      value={value}
      hint={note}
      icon={<Icon />}
      onClick={onClick}
      tone={attention ? "attention" : "default"}
    />
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

function priorityTone(priority: AttentionRow["priority"]) {
  if (priority === "High") return "danger" as const;
  if (priority === "Medium") return "warning" as const;
  return "neutral" as const;
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
    <Panel
      title="Needs attention"
      description="Approvals, refunds and orders waiting on you."
      padded={activeRows.length === 0}
      action={
        <StatusBadge tone={activeRows.length ? "warning" : "success"}>
          {activeRows.length ? `${activeRows.length} open` : "All clear"}
        </StatusBadge>
      }
    >
      {activeRows.length === 0 ? (
        <DashEmptyState
          compact
          title="Nothing needs attention right now"
          text="New approvals, refunds and late orders show up here."
        />
      ) : (
        <>
          <ul className="divide-y divide-slate-100">
            {visibleRows.map((row) => (
              <li key={`${row.type}-${row.issue}`}>
                <button
                  type="button"
                  onClick={() => onNavigate(row.target)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 sm:px-5"
                >
                  <span className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {row.type}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {row.issue}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {row.area} · {row.status}
                    </span>
                  </span>
                  <StatusBadge tone={priorityTone(row.priority)} className="hidden sm:inline-flex">
                    {row.priority}
                  </StatusBadge>
                  <span className="hidden text-sm font-semibold text-lethela-primary md:inline">
                    {row.action}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          {activeRows.length > visibleRows.length ? (
            <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={() => onNavigate("operations")}
                className={dashButton.link}
              >
                See all {activeRows.length} in Operations
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </>
      )}
    </Panel>
  );
}

export default function AdminPage() {
  const router = useRouter();
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
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [orderPaymentFilter, setOrderPaymentFilter] = useState("ALL");
  const [orderPeriodFilter, setOrderPeriodFilter] = useState("ALL");
  const [orderSort, setOrderSort] = useState<"newest" | "oldest">("newest");
  const [orderPage, setOrderPage] = useState(1);
  const [vendors, setVendors] = useState<VendorApplication[]>([]);
  const [products, setProducts] = useState<ProductReview[]>([]);
  const [productCounts, setProductCounts] = useState<ProductCounts | null>(null);
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
  // Every vendor and rider for the "One vendor" / "One rider" pickers. The approval lists only
  // hold the status that is currently filtered, so these load separately when first needed.
  const [recipientOptions, setRecipientOptions] = useState<{
    vendors: Array<{ id: string; name: string; status: string }>;
    riders: Array<{ id: string; fullName: string; status: string }>;
  } | null>(null);
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
  const [webPushConfigured, setWebPushConfigured] = useState<boolean | null>(null);
  const [pushCampaigns, setPushCampaigns] = useState<PushCampaignSummary[]>([]);
  const [pushForm, setPushForm] = useState<{
    title: string;
    body: string;
    url: string;
    segment: PushSegment;
  }>({ title: "", body: "", url: "/", segment: "ALL" });
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
      setProductCounts(json.counts ?? null);
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
    setWebPushConfigured(Boolean(notificationsJson.webPushConfigured));
    setPushCampaigns((notificationsJson.recentCampaigns ?? []) as PushCampaignSummary[]);
    setMessages(messagesJson.items ?? []);
  }, [fetchAdminJson]);

  const sendPushCampaign = useCallback(async () => {
    const title = pushForm.title.trim();
    const message = pushForm.body.trim();
    if (!title || !message) {
      setError("Enter a push title and message before sending.");
      return;
    }
    setSavingKey("push:send");
    setError(null);
    setNotice(null);
    try {
      await syncAdminAccess();
      const response = await fetch("/api/push/notify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          body: message,
          url: pushForm.url.trim() || "/",
          segment: pushForm.segment,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Failed to send push campaign.");
      setNotice(
        `Push sent to ${json.sent} device(s)${json.failed ? `, ${json.failed} failed` : ""}.`,
      );
      setPushForm((state) => ({ ...state, title: "", body: "" }));
      await loadCommunicationData();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to send push campaign."));
    } finally {
      setSavingKey(null);
    }
  }, [loadCommunicationData, pushForm, syncAdminAccess]);

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

  useEffect(() => {
    if (view !== "messages" || recipientOptions) return;
    if (!["VENDOR", "RIDER"].includes(messageForm.recipientType)) return;
    let cancelled = false;
    void Promise.all([
      fetchAdminJson("/api/admin/vendors?status=ALL", "Failed to load vendors."),
      fetchAdminJson("/api/admin/riders?status=ALL&take=200", "Failed to load riders."),
    ])
      .then(([vendorJson, riderJson]) => {
        if (cancelled) return;
        setRecipientOptions({
          vendors: ((vendorJson.items ?? []) as VendorApplication[])
            .map(({ id, name, status }) => ({ id, name, status }))
            .sort((left, right) => left.name.localeCompare(right.name)),
          riders: ((riderJson.items ?? []) as RiderApplication[])
            .map(({ id, fullName, status }) => ({ id, fullName, status }))
            .sort((left, right) => left.fullName.localeCompare(right.fullName)),
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err, "Failed to load vendors and riders."));
      });
    return () => {
      cancelled = true;
    };
  }, [fetchAdminJson, messageForm.recipientType, recipientOptions, view]);

  // "Refunds to look at" opens Operations with ?filter=refunds: bring the refund list into view.
  useEffect(() => {
    if (view !== "operations") return;
    if (new URL(window.location.href).searchParams.get("filter") !== "refunds") return;
    const handle = window.setTimeout(() => {
      document.getElementById("refund-cases")?.scrollIntoView({ behavior: "smooth" });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [view]);

  // Load customers lazily: only when the Customers tab is open, then on search/page change.
  useEffect(() => {
    if (view !== "users") return;
    void loadCustomers(customerSearch, customerPage);
  }, [view, customerSearch, customerPage, loadCustomers]);

  useEffect(() => {
    const refreshLive = () => {
      if (document.visibilityState !== "visible") return;
      void loadLiveData().catch(() => {
        // Manual refresh exposes a detailed error without interrupting the operator every 30 seconds.
      });
    };
    const timer = window.setInterval(refreshLive, 30000);
    // Pull fresh data as soon as the operator returns to the tab, rather than
    // showing up-to-30s-stale operations until the next interval tick.
    document.addEventListener("visibilitychange", refreshLive);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshLive);
    };
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

  // Approves every waiting item from one store in one go, so a trusted store does not need one
  // confirmation per item. Each item still goes through the normal review endpoint.
  async function approveStoreProducts(vendor: { id: string; name: string }, productIds: string[]) {
    if (productIds.length === 0) return;
    if (
      !window.confirm(
        `Approve all ${productIds.length} waiting item${productIds.length === 1 ? "" : "s"} from ${vendor.name}?`,
      )
    )
      return;
    setSavingKey(`products:${vendor.id}`);
    setError(null);
    setNotice(null);
    let approved = 0;
    let firstError: string | null = null;
    try {
      await syncAdminAccess();
      for (const productId of productIds) {
        const response = await fetch(`/api/admin/products/${productId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "APPROVED" }),
        });
        const json = await response.json().catch(() => ({}));
        if (response.ok && json.ok) approved += 1;
        else firstError ||= json.error || "Product review failed.";
      }
      if (approved > 0) {
        setNotice(`Approved ${approved} item${approved === 1 ? "" : "s"} from ${vendor.name}.`);
      }
      if (firstError) {
        setError(
          `${productIds.length - approved} item${
            productIds.length - approved === 1 ? "" : "s"
          } could not be approved: ${firstError}`,
        );
      }
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
          vendor.township,
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
          rider.township,
          rider.suburb,
          rider.municipality,
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

  // Items grouped by store, so a store's whole menu can be reviewed (and approved) together.
  const productGroups = useMemo(() => {
    const groups = new Map<
      string,
      { vendor: ProductReview["vendor"]; products: ProductReview[] }
    >();
    for (const product of filteredProducts) {
      const group = groups.get(product.vendor.id);
      if (group) group.products.push(product);
      else groups.set(product.vendor.id, { vendor: product.vendor, products: [product] });
    }
    return Array.from(groups.values());
  }, [filteredProducts]);

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
          issue: `${reference}: ${statusText(order.status).toLowerCase()}`,
          area: order.vendorName || "Live order",
          assignedTo: order.status === "NEW" ? "Vendor / Admin" : "Operations",
          priority: failed ? "High" : "Medium",
          status: paymentText(order.paymentStatus),
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
          issue: `${vendor.name}: ${approvalStateText(vendor.status)}`,
          area:
            [vendor.township || vendor.suburb, vendor.city].filter(Boolean).join(", ") ||
            "No address yet",
          assignedTo: vendor.status === "CHANGES_REQUESTED" ? "Vendor" : "Admin",
          priority: vendor.status === "SUBMITTED" ? "Medium" : "Low",
          status: statusText(vendor.status),
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
          issue: `${product.name}${product.image ? "" : " (no photo yet)"}`,
          area: product.vendor.name,
          assignedTo: product.status === "CHANGES_REQUESTED" ? "Vendor" : "Admin",
          priority: "Low",
          status: statusText(product.status),
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
          issue: `${rider.fullName || rider.email}: ${approvalStateText(rider.status)}`,
          area:
            [rider.township || rider.suburb, rider.city].filter(Boolean).join(", ") ||
            "No area yet",
          assignedTo: rider.status === "CHANGES_REQUESTED" ? "Rider" : "Admin",
          priority: rider.status === "SUBMITTED" ? "Medium" : "Low",
          status: statusText(rider.status),
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
          status: statusText(refund.status),
          action: "Review refund",
          target: "operations",
        });
      });

    return rows;
  }, [operationsOrders, operationsRefunds, products, riders, vendors]);

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
        // "Paid" covers both words the payment provider uses for a completed payment.
        const paymentMatches =
          orderPaymentFilter === "ALL" ||
          order.paymentStatus === orderPaymentFilter ||
          (orderPaymentFilter === "PAID" && order.paymentStatus === "SUCCESS");
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

  const manageOrder = (order: OperationsOrder) => {
    setOperationsForm((current) => ({ ...current, orderRef: order.publicId }));
    navigateView("operations");
  };

  const messageRecipientLabel = (message: PlatformMessage) => {
    if (message.recipientType === "ALL") return "all vendors and riders";
    if (message.recipientType === "ALL_VENDORS") return "all vendors";
    if (message.recipientType === "ALL_RIDERS") return "all riders";
    if (message.recipientType === "VENDOR") {
      const vendor =
        recipientOptions?.vendors.find((item) => item.id === message.recipientId) ??
        vendors.find((item) => item.id === message.recipientId);
      return vendor ? vendor.name : "one vendor";
    }
    if (message.recipientType === "RIDER") {
      const rider =
        recipientOptions?.riders.find((item) => item.id === message.recipientId) ??
        riders.find((item) => item.id === message.recipientId);
      return rider ? rider.fullName : "one rider";
    }
    return statusText(message.recipientType).toLowerCase();
  };

  const openRefundCount = operationsRefunds.filter(
    (refund) => !["COMPLETED", "PAID", "REJECTED", "CANCELLED", "CLOSED"].includes(refund.status),
  ).length;

  const selectedOperationsOrder = useMemo(() => {
    const ref = operationsForm.orderRef.trim();
    if (!ref) return null;
    return (
      operationsOrders.find((order) => order.publicId === ref || order.ozowReference === ref) ??
      null
    );
  }, [operationsForm.orderRef, operationsOrders]);

  const viewCopy = VIEW_COPY[view];
  const notificationCount = attentionRows.length;
  const onNotifications = () => navigateView("operations");
  const adminNav: DashboardNavItem[] = ADMIN_NAV_GROUPS.flatMap((group) =>
    group.items.map((item) => {
      const Icon = item.icon;
      const badge =
        item.id === "vendors"
          ? (vendorCounts.submitted ?? vendorCounts.pending)
          : item.id === "riders"
            ? (riderCounts.submitted ?? riderCounts.pending)
            : item.id === "products"
              ? productCounts?.submitted
              : item.id === "operations"
                ? attentionRows.filter((row) => row.priority === "High").length
                : null;
      return {
        id: item.id,
        label: item.label,
        shortLabel: item.shortLabel,
        icon: <Icon />,
        badge: badge || null,
        group: group.title,
      };
    }),
  );

  return (
    <DashboardShell
      area="Admin"
      workspaceName="Lethela"
      workspaceDetail="Owner dashboard"
      homeHref="/admin"
      nav={adminNav}
      activeId={view}
      phoneTabs={["overview", "operations", "vendors", "riders"]}
      onNavigate={(id) => navigateView(id as DashboardView)}
      search={
        <AdminSearch
          value={globalSearch}
          onChange={setGlobalSearch}
          onSearch={handleGlobalSearch}
          groups={globalSearchGroups}
          loading={globalSearchLoading}
          onSelectResult={selectGlobalSearchResult}
        />
      }
      actions={
        <NotificationBell operationsCount={notificationCount} onOpenOperations={onNotifications} />
      }
      onSignOut={() =>
        fetch("/api/admin/access", { method: "DELETE" })
          .catch(() => undefined)
          .then(() => {
            router.push("/owner-access");
            router.refresh();
          })
      }
    >
      <PageHeader
        title={viewCopy.title}
        description={viewCopy.description}
        meta={
          <StatusBadge tone={lastRefreshedAt && !error ? "success" : "neutral"}>
            {lastRefreshedAt && !error
              ? `Up to date ${lastRefreshedAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : loading
                ? "Loading…"
                : "Not loaded yet"}
          </StatusBadge>
        }
        actions={
          <>
            <button
              type="button"
              className={dashButton.secondary}
              disabled={loading}
              onClick={load}
            >
              <RefreshCw className={loading ? "animate-spin" : undefined} aria-hidden="true" />
              {loading ? "Refreshing" : "Refresh"}
            </button>
            {pushPermission !== "granted" ? (
              <button type="button" className={dashButton.secondary} onClick={enableBrowserAlerts}>
                <Bell aria-hidden="true" />
                Turn on alerts
              </button>
            ) : null}
          </>
        }
      />

      {notice ? (
        <Notice tone="success" className="mb-4">
          {notice}
        </Notice>
      ) : null}
      {error ? (
        <Notice tone="danger" className="mb-4">
          {error}
        </Notice>
      ) : null}

      {view === "overview" ? (
        <div className="space-y-6">
          <section>
            <AdminSectionHeader
              title="Immediate operations"
              description="Tap a number to open the list behind it."
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              <PriorityCard
                label="Live orders"
                value={stats ? stats.pendingDeliveries : "—"}
                note="Waiting, preparing or on the way."
                icon={ShoppingBag}
                onClick={() => navigateView("orders")}
              />
              <PriorityCard
                label="Orders needing action"
                value={stats ? stats.delayedOrders + stats.failedDeliveries : "—"}
                note="Late or failed deliveries."
                icon={Bell}
                attention={Boolean(stats && stats.delayedOrders + stats.failedDeliveries > 0)}
                onClick={() => navigateView("operations")}
              />
              <PriorityCard
                label="Stores waiting"
                value={vendorCounts.submitted ?? vendorCounts.pending ?? 0}
                note="Waiting for your approval."
                icon={Store}
                attention={(vendorCounts.submitted ?? vendorCounts.pending ?? 0) > 0}
                onClick={() => navigateView("vendors", { status: "SUBMITTED" })}
              />
              <PriorityCard
                label="Riders waiting"
                value={riderCounts.submitted ?? riderCounts.pending}
                note="Waiting for your approval."
                icon={Bike}
                attention={(riderCounts.submitted ?? riderCounts.pending) > 0}
                onClick={() => navigateView("riders", { status: "SUBMITTED" })}
              />
            </div>
          </section>

          <section>
            <AdminSectionHeader
              title="Today"
              description="Paid orders only. Rider fees and tips are not Lethela revenue."
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              <MetricCard
                label="Orders today"
                value={stats ? stats.ordersToday : "—"}
                note={`${stats?.completedOrdersToday ?? 0} delivered`}
                icon={PackageCheck}
                onClick={() => navigateView("orders", { period: "today" })}
              />
              <MetricCard
                label="Riders online now"
                value={stats ? stats.availableRiders : "—"}
                note={`${stats?.activeRiders ?? riderCounts.approved} approved in total`}
                icon={Bike}
                onClick={() => navigateView("riders", { status: "APPROVED" })}
              />
              <MetricCard
                label="Lethela revenue today"
                value={stats ? money(stats.revenueTodayCents) : "—"}
                note="Commission only"
                icon={WalletCards}
                onClick={() => navigateView("finance", { period: "today" })}
              />
              <MetricCard
                label="Revenue this month"
                value={stats ? money(stats.revenueMonthCents) : "—"}
                note="Commission from paid orders"
                icon={LineChart}
                onClick={() => navigateView("finance", { period: "month" })}
              />
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <NeedsAttentionQueue rows={attentionRows} onNavigate={navigateView} />
            <Panel title="Service quality" description="How deliveries are going.">
              <div className="-my-2.5 divide-y divide-slate-100">
                <DetailRow
                  label="Average delivery time"
                  value={
                    !stats
                      ? "—"
                      : stats.averageDeliveryTimeMins
                        ? `${stats.averageDeliveryTimeMins} min`
                        : "No deliveries yet"
                  }
                />
                <DetailRow
                  label="Customer rating"
                  value={
                    !stats
                      ? "—"
                      : stats.reviewCount
                        ? `${stats.customerSatisfactionScore}/5 from ${stats.reviewCount}`
                        : "No reviews yet"
                  }
                />
                <DetailRow
                  label="Average order today"
                  value={stats ? money(stats.averageOrderValueTodayCents) : "—"}
                />
                <DetailRow
                  label="Cancelled orders"
                  value={
                    <button
                      type="button"
                      className="font-semibold text-lethela-primary hover:underline"
                      onClick={() => navigateView("orders", { status: "CANCELLED" })}
                    >
                      {stats ? stats.cancelledOrders : "—"}
                    </button>
                  }
                />
                <DetailRow label="Failed deliveries" value={stats ? stats.failedDeliveries : "—"} />
              </div>
            </Panel>
          </div>
        </div>
      ) : null}

      {view === "vendors" ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <FilterTabs
              label="Vendor status"
              value={vendorStatus}
              onChange={setVendorStatus}
              options={[
                { value: "SUBMITTED", label: "Waiting", count: vendorCounts.submitted ?? null },
                {
                  value: "CHANGES_REQUESTED",
                  label: "Changes asked",
                  count: vendorCounts.changesRequested ?? null,
                },
                { value: "DRAFT", label: "Setting up", count: vendorCounts.draft ?? null },
                { value: "APPROVED", label: "Approved", count: vendorCounts.approved ?? null },
                { value: "REJECTED", label: "Not approved", count: vendorCounts.rejected },
                { value: "SUSPENDED", label: "Paused", count: vendorCounts.suspended ?? null },
                { value: "ALL", label: "All", count: vendorCounts.total },
              ]}
            />
            <SearchBox
              label="Search vendors"
              value={vendorSearch}
              placeholder="Search by name, email or area"
              onChange={setVendorSearch}
            />
          </div>

          {vendorStatus === "DRAFT" && filteredVendors.length > 0 ? (
            <Notice tone="info">
              These stores have not pressed Send for approval yet. You can still approve a store you
              know once it has everything it needs.
            </Notice>
          ) : null}

          {filteredVendors.map((vendor) => {
            const saving = savingKey === `vendor:${vendor.id}`;
            const area = vendor.township || vendor.suburb;
            const location = [vendor.address, area, vendor.city].filter(Boolean).join(", ");
            const cuisines = parseCuisine(vendor.cuisine);
            const readiness = vendor.readiness;
            const approved = ["APPROVED", "ACTIVE"].includes(vendor.status);
            const blockedReason = approved
              ? "Already approved"
              : readiness && !readiness.canApprove
                ? `Still needs: ${readiness.missing.join(", ").toLowerCase()}`
                : vendor.ownerCanSignIn === false
                  ? "The owner account has no way to sign in yet"
                  : null;

            return (
              <article key={vendor.id} className="rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-5">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-slate-900">{vendor.name}</h3>
                    <p className="mt-0.5 text-sm text-slate-500">{location || "No address yet"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge tone={toneForStatus(vendor.status)}>
                      {vendor.status === "SUBMITTED"
                        ? "Waiting for approval"
                        : statusText(vendor.status)}
                    </StatusBadge>
                    {approved ? (
                      <StatusBadge tone={vendor.isActive ? "success" : "neutral"}>
                        {vendor.isActive ? "Live" : "Not live"}
                      </StatusBadge>
                    ) : readiness ? (
                      <StatusBadge tone={readiness.canApprove ? "success" : "warning"}>
                        {readiness.canApprove ? "Ready to approve" : "Not ready"}
                      </StatusBadge>
                    ) : null}
                  </div>
                </div>

                {readiness && !approved && readiness.missing.length > 0 ? (
                  <p className="mx-4 mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 sm:mx-5">
                    Still needs: {readiness.missing.join(", ").toLowerCase()}.
                  </p>
                ) : null}

                <dl className="mt-3 grid gap-x-6 px-4 text-sm sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
                  <div className="flex justify-between gap-3 border-t border-slate-100 py-2">
                    <dt className="text-slate-500">Phone</dt>
                    <dd className="truncate font-medium text-slate-900">
                      {vendor.phone ? (
                        <a href={`tel:${vendor.phone}`} className="hover:underline">
                          {vendor.phone}
                        </a>
                      ) : (
                        "Not added"
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-slate-100 py-2">
                    <dt className="text-slate-500">Email</dt>
                    <dd className="truncate font-medium text-slate-900">
                      {vendor.email || "Not added"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-slate-100 py-2">
                    <dt className="text-slate-500">Menu</dt>
                    <dd className="font-medium text-slate-900">
                      {vendor.productCount != null
                        ? `${(vendor.productCount ?? 0) + (vendor.menuItemCount ?? 0)} item${
                            (vendor.productCount ?? 0) + (vendor.menuItemCount ?? 0) === 1
                              ? ""
                              : "s"
                          }`
                        : "—"}
                      {vendor.pendingProductCount ? (
                        <button
                          type="button"
                          className="ml-2 text-lethela-primary hover:underline"
                          onClick={() => {
                            setProductSearch(vendor.name);
                            navigateView("products", { status: "SUBMITTED" });
                          }}
                        >
                          {vendor.pendingProductCount} to approve
                        </button>
                      ) : null}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-slate-100 py-2">
                    <dt className="text-slate-500">Open days</dt>
                    <dd className="font-medium text-slate-900">
                      {vendor.openDays != null ? `${vendor.openDays} of 7` : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-slate-100 py-2">
                    <dt className="text-slate-500">Sells</dt>
                    <dd className="truncate font-medium text-slate-900">
                      {cuisines.length > 0 ? cuisines.join(", ") : vendor.storeType || "Not added"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-slate-100 py-2">
                    <dt className="text-slate-500">Signed up</dt>
                    <dd className="font-medium text-slate-900">
                      {new Date(vendor.createdAt).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>

                {readiness && readiness.later.length > 0 ? (
                  <p className="px-4 pt-1 text-xs text-slate-500 sm:px-5">
                    Can add later: {readiness.later.join(", ").toLowerCase()}.
                  </p>
                ) : null}

                {vendor.kycIdUrl || vendor.kycProofUrl || vendor.liquorLicenceUrl ? (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 pt-2 text-sm sm:px-5">
                    {vendor.kycIdUrl ? (
                      <a
                        href={vendor.kycIdUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={dashButton.link}
                      >
                        ID document
                        <ExternalLink aria-hidden="true" />
                      </a>
                    ) : null}
                    {vendor.kycProofUrl ? (
                      <a
                        href={vendor.kycProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={dashButton.link}
                      >
                        Proof of address
                        <ExternalLink aria-hidden="true" />
                      </a>
                    ) : null}
                    {vendor.liquorLicenceUrl ? (
                      <a
                        href={vendor.liquorLicenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={dashButton.link}
                      >
                        Liquor licence ({statusText(vendor.liquorVerificationStatus).toLowerCase()})
                        <ExternalLink aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
                  {!approved ? (
                    <button
                      type="button"
                      className={dashButton.primary}
                      disabled={saving || Boolean(blockedReason)}
                      title={blockedReason || "Approve this store"}
                      onClick={() => updateVendorStatus(vendor.id, "approve")}
                    >
                      <CheckCircle2 aria-hidden="true" />
                      {saving ? "Saving…" : "Approve store"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={dashButton.secondary}
                    disabled={saving}
                    onClick={() => updateVendorStatus(vendor.id, "changes_requested")}
                  >
                    Ask for changes
                  </button>
                  {approved ? (
                    <button
                      type="button"
                      className={dashButton.danger}
                      disabled={saving}
                      onClick={() => updateVendorStatus(vendor.id, "suspend")}
                    >
                      Pause store
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={dashButton.danger}
                      disabled={saving}
                      onClick={() => updateVendorStatus(vendor.id, "reject")}
                    >
                      Reject
                    </button>
                  )}
                  {vendor.liquorLicenceUrl && vendor.liquorVerificationStatus !== "APPROVED" ? (
                    <>
                      <button
                        type="button"
                        className={dashButton.secondary}
                        disabled={savingKey === `liquor:${vendor.id}`}
                        onClick={() => updateLiquorStatus(vendor.id, "APPROVED")}
                      >
                        Approve liquor licence
                      </button>
                      <button
                        type="button"
                        className={dashButton.quiet}
                        disabled={savingKey === `liquor:${vendor.id}`}
                        onClick={() => updateLiquorStatus(vendor.id, "CHANGES_REQUESTED")}
                      >
                        Licence changes
                      </button>
                    </>
                  ) : null}
                  {blockedReason && !approved ? (
                    <p className="w-full text-xs text-slate-500 sm:ml-1 sm:w-auto">
                      {blockedReason}.
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
          {!loading && filteredVendors.length === 0 ? (
            <EmptyState
              title="No stores here"
              text="Stores show up here when they sign up or send their store for approval."
            />
          ) : null}
        </section>
      ) : null}

      {view === "products" ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <FilterTabs
              label="Item status"
              value={productStatus}
              onChange={setProductStatus}
              options={[
                { value: "SUBMITTED", label: "Waiting", count: productCounts?.submitted ?? null },
                {
                  value: "CHANGES_REQUESTED",
                  label: "Changes asked",
                  count: productCounts?.changesRequested ?? null,
                },
                { value: "APPROVED", label: "Approved", count: productCounts?.approved ?? null },
                {
                  value: "REJECTED",
                  label: "Not approved",
                  count: productCounts?.rejected ?? null,
                },
                { value: "ALL", label: "All", count: productCounts?.total ?? null },
              ]}
            />
            <SearchBox
              label="Search items"
              value={productSearch}
              placeholder="Search by item or store"
              onChange={setProductSearch}
            />
          </div>

          {productGroups.map((group) => {
            const waitingIds = group.products
              .filter((product) => product.status === "SUBMITTED")
              .map((product) => product.id);
            const storeApproved =
              group.vendor.isActive && ["APPROVED", "ACTIVE"].includes(group.vendor.status);
            const bulkSaving = savingKey === `products:${group.vendor.id}`;

            return (
              <div key={group.vendor.id} className="rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-slate-900">{group.vendor.name}</h3>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {group.products.length} item{group.products.length === 1 ? "" : "s"}
                      {storeApproved ? "" : " · store not approved yet"}
                    </p>
                  </div>
                  {waitingIds.length > 1 ? (
                    <button
                      type="button"
                      className={dashButton.secondary}
                      disabled={bulkSaving || !storeApproved}
                      title={storeApproved ? undefined : "Approve the store before its items"}
                      onClick={() => approveStoreProducts(group.vendor, waitingIds)}
                    >
                      <CheckCircle2 aria-hidden="true" />
                      {bulkSaving ? "Approving…" : `Approve all ${waitingIds.length}`}
                    </button>
                  ) : null}
                </div>

                <ul className="divide-y divide-slate-100">
                  {group.products.map((product) => {
                    const saving = savingKey === `product:${product.id}` || bulkSaving;
                    return (
                      <li key={product.id} className="flex gap-3 px-4 py-4 sm:px-5">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          {product.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.image}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-slate-400">
                              <ImageOff className="h-5 w-5" aria-hidden="true" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">{product.name}</p>
                              <p className="text-sm text-slate-600">
                                {money(product.priceCents)}
                                {product.inStock ? "" : " · out of stock"}
                                {product.isAlcohol
                                  ? ` · liquor 18+${product.abv ? ` (${product.abv}%)` : ""}`
                                  : ""}
                              </p>
                            </div>
                            <StatusBadge tone={toneForStatus(product.status)}>
                              {product.status === "SUBMITTED"
                                ? "Waiting"
                                : statusText(product.status)}
                            </StatusBadge>
                          </div>
                          {product.description ? (
                            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                              {product.description}
                            </p>
                          ) : null}
                          {product.reviewReason ? (
                            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                              Your note: {product.reviewReason}
                            </p>
                          ) : null}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {product.status !== "APPROVED" ? (
                              <button
                                type="button"
                                className={dashButton.primary}
                                disabled={saving || !storeApproved}
                                title={
                                  storeApproved ? undefined : "Approve the store before its items"
                                }
                                onClick={() => updateProductStatus(product.id, "APPROVED")}
                              >
                                Approve
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className={dashButton.secondary}
                              disabled={saving}
                              onClick={() => updateProductStatus(product.id, "CHANGES_REQUESTED")}
                            >
                              Ask for changes
                            </button>
                            {product.status !== "REJECTED" ? (
                              <button
                                type="button"
                                className={dashButton.quiet}
                                disabled={saving}
                                onClick={() => updateProductStatus(product.id, "REJECTED")}
                              >
                                Reject
                              </button>
                            ) : null}
                            <span className="text-xs text-slate-400">
                              Updated {formatDate(product.updatedAt)}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          {!loading && filteredProducts.length === 0 ? (
            <EmptyState
              title="No items here"
              text="Menu items show up here when a store adds them or changes them."
            />
          ) : null}
        </section>
      ) : null}

      {view === "riders" ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <FilterTabs
              label="Rider status"
              value={riderStatus}
              onChange={setRiderStatus}
              options={[
                {
                  value: "SUBMITTED" as RiderStatusFilter,
                  label: "Waiting",
                  count: riderCounts.submitted ?? riderCounts.pending,
                },
                ...(riderCounts.underReview > 0 || riderStatus === "UNDER_REVIEW"
                  ? [
                      {
                        value: "UNDER_REVIEW" as RiderStatusFilter,
                        label: "Checking",
                        count: riderCounts.underReview,
                      },
                    ]
                  : []),
                {
                  value: "CHANGES_REQUESTED",
                  label: "Changes asked",
                  count: riderCounts.changesRequested ?? null,
                },
                { value: "DRAFT", label: "Setting up", count: riderCounts.draft ?? null },
                { value: "APPROVED", label: "Approved", count: riderCounts.approved },
                { value: "REJECTED", label: "Not approved", count: riderCounts.rejected },
                { value: "SUSPENDED", label: "Paused", count: riderCounts.suspended ?? null },
                { value: "ALL", label: "All", count: riderCounts.total },
              ]}
            />
            <SearchBox
              label="Search riders"
              value={riderSearch}
              placeholder="Search by name, phone or area"
              onChange={setRiderSearch}
            />
          </div>

          {riderStatus === "DRAFT" && filteredRiders.length > 0 ? (
            <Notice tone="info">
              These riders have not pressed Send to Lethela yet. You can still approve a rider you
              know once they have everything they need.
            </Notice>
          ) : null}

          {filteredRiders.map((rider) => {
            const saving = Boolean(savingKey?.startsWith(`rider:${rider.id}:`));
            const readiness = rider.readiness;
            const approved = ["APPROVED", "AVAILABLE", "BUSY", "OFFLINE"].includes(rider.status);
            const area = [rider.township || rider.suburb, rider.municipality || rider.city]
              .filter(Boolean)
              .join(", ");
            const blockedReason = approved
              ? "Already approved"
              : readiness && !readiness.canApprove
                ? `Still needs: ${readiness.missing.join(", ").toLowerCase()}`
                : rider.accountCanSignIn === false
                  ? "This rider's account has no way to sign in yet"
                  : null;
            const documents = [
              rider.hasIdDocument ? "ID" : null,
              rider.hasPhoto ? "photo" : null,
              rider.hasLicenceDocument ? "licence" : null,
            ].filter(Boolean);

            return (
              <article key={rider.id} className="rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-5">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-slate-900">
                      {rider.fullName || "Name not added"}
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-500">{area || "No area yet"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge tone={toneForStatus(rider.status)}>
                      {rider.status === "SUBMITTED"
                        ? "Waiting for approval"
                        : statusText(rider.status)}
                    </StatusBadge>
                    {!approved && readiness ? (
                      <StatusBadge tone={readiness.canApprove ? "success" : "warning"}>
                        {readiness.canApprove ? "Ready to approve" : "Not ready"}
                      </StatusBadge>
                    ) : null}
                  </div>
                </div>

                {readiness && !approved && readiness.missing.length > 0 ? (
                  <p className="mx-4 mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 sm:mx-5">
                    Still needs: {readiness.missing.join(", ").toLowerCase()}.
                  </p>
                ) : null}

                {rider.reviewReason && !approved ? (
                  <p className="mx-4 mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 sm:mx-5">
                    Your last note: {rider.reviewReason}
                  </p>
                ) : null}

                <dl className="mt-3 grid gap-x-6 px-4 text-sm sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
                  <div className="flex justify-between gap-3 border-t border-slate-100 py-2">
                    <dt className="text-slate-500">Phone</dt>
                    <dd className="truncate font-medium text-slate-900">
                      {rider.phone ? (
                        <a href={`tel:${rider.phone}`} className="hover:underline">
                          {rider.phone}
                        </a>
                      ) : (
                        "Not added"
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-slate-100 py-2">
                    <dt className="text-slate-500">Email</dt>
                    <dd className="truncate font-medium text-slate-900">
                      {rider.email || "Not added"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-slate-100 py-2">
                    <dt className="text-slate-500">Delivers by</dt>
                    <dd className="truncate font-medium text-slate-900">
                      {rider.vehicleType || "Not added"}
                      {rider.vehicleRegistration ? ` (${rider.vehicleRegistration})` : ""}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-slate-100 py-2">
                    <dt className="text-slate-500">Documents</dt>
                    <dd className="truncate font-medium text-slate-900">
                      {documents.length > 0 ? documents.join(", ") : "None yet"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-slate-100 py-2">
                    <dt className="text-slate-500">Emergency contact</dt>
                    <dd className="truncate font-medium text-slate-900">
                      {rider.emergencyContactName
                        ? `${rider.emergencyContactName}${
                            rider.emergencyContactPhone ? ` (${rider.emergencyContactPhone})` : ""
                          }`
                        : "Not added"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-slate-100 py-2">
                    <dt className="text-slate-500">Bank account</dt>
                    <dd className="font-medium text-slate-900">
                      {rider.hasBankAccount ? "Added" : "Not added"}
                    </dd>
                  </div>
                </dl>

                {readiness && readiness.later.length > 0 ? (
                  <p className="px-4 pt-1 text-xs text-slate-500 sm:px-5">
                    Can add later: {readiness.later.join(", ").toLowerCase()}.
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
                  {!approved ? (
                    <button
                      type="button"
                      className={dashButton.primary}
                      disabled={saving || Boolean(blockedReason)}
                      title={blockedReason || "Approve this rider"}
                      onClick={() => updateRiderStatus(rider.id, "APPROVED")}
                    >
                      <CheckCircle2 aria-hidden="true" />
                      {savingKey === `rider:${rider.id}:APPROVED` ? "Saving…" : "Approve rider"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={dashButton.secondary}
                    disabled={saving}
                    onClick={() => updateRiderStatus(rider.id, "CHANGES_REQUESTED")}
                  >
                    Ask for changes
                  </button>
                  {approved ? (
                    <button
                      type="button"
                      className={dashButton.danger}
                      disabled={saving}
                      onClick={() => updateRiderStatus(rider.id, "SUSPENDED")}
                    >
                      Pause rider
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={dashButton.danger}
                      disabled={saving}
                      onClick={() => updateRiderStatus(rider.id, "REJECTED")}
                    >
                      Reject
                    </button>
                  )}
                  {blockedReason && !approved ? (
                    <p className="w-full text-xs text-slate-500 sm:ml-1 sm:w-auto">
                      {blockedReason}.
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
          {!loading && filteredRiders.length === 0 ? (
            <EmptyState
              title="No riders here"
              text="Riders show up here when they sign up or send their details to Lethela."
            />
          ) : null}
        </section>
      ) : null}

      {view === "users" ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              {customerMeta.total} registered account{customerMeta.total === 1 ? "" : "s"}
            </p>
            <SearchBox
              label="Search customers"
              value={customerSearchInput}
              placeholder="Search name, email or phone"
              onChange={setCustomerSearchInput}
            />
          </div>

          {customerState === "error" ? (
            <Notice
              tone="danger"
              title="Customers did not load"
              action={
                <button
                  type="button"
                  className={dashButton.secondary}
                  onClick={() => void loadCustomers(customerSearch, customerPage)}
                >
                  Try again
                </button>
              }
            >
              {customerError}
            </Notice>
          ) : customerState === "loading" && customers.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <EmptyState
              title={customerSearch ? "No customers match this search" : "No customer accounts yet"}
              text={
                customerSearch
                  ? "Check the spelling or clear the search."
                  : "Accounts show up here as soon as customers register."
              }
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <ul className="divide-y divide-slate-100 md:hidden">
                {customers.map((customer) => (
                  <li key={customer.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {customer.name || "No name"}
                        </p>
                        <p className="truncate text-sm text-slate-500">{customer.email}</p>
                      </div>
                      <StatusBadge tone={customerTone(customer)}>
                        {customerStatusText(customer)}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {customer.orderCount} order{customer.orderCount === 1 ? "" : "s"} ·{" "}
                      {money(customer.totalSpentCents)}
                      {customer.phone ? ` · ${customer.phone}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Customer</th>
                      <th className="px-4 py-2.5 font-medium">Phone</th>
                      <th className="px-4 py-2.5 text-right font-medium">Orders</th>
                      <th className="px-4 py-2.5 text-right font-medium">Total spent</th>
                      <th className="px-4 py-2.5 font-medium">Last order</th>
                      <th className="px-4 py-2.5 font-medium">Joined</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.map((customer) => (
                      <tr key={customer.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">
                            {customer.name || "No name"}
                          </div>
                          <div className="text-xs text-slate-500">{customer.email}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{customer.phone || "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                          {customer.orderCount}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                          {money(customer.totalSpentCents)}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {formatDate(customer.joinedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge tone={customerTone(customer)}>
                            {customerStatusText(customer)}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {customerMeta.pageCount > 1 ? (
            <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
              <span>
                Page {customerPage} of {customerMeta.pageCount}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={dashButton.secondary}
                  disabled={customerPage <= 1 || customerState === "loading"}
                  onClick={() => setCustomerPage((page) => Math.max(1, page - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className={dashButton.secondary}
                  disabled={customerPage >= customerMeta.pageCount || customerState === "loading"}
                  onClick={() =>
                    setCustomerPage((page) => Math.min(customerMeta.pageCount, page + 1))
                  }
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {view === "orders" ? (
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <StatTile
              label="Live orders"
              value={stats ? stats.pendingDeliveries : "—"}
              hint="Waiting, preparing or on the way."
              icon={<ShoppingBag />}
              onClick={() => navigateView("operations")}
            />
            <StatTile
              label="Running late"
              value={stats ? stats.delayedOrders : "—"}
              hint="Past the expected delivery time."
              icon={<Clock />}
              tone={stats && stats.delayedOrders > 0 ? "attention" : "default"}
              onClick={() => navigateView("operations")}
            />
            <StatTile
              label="Failed deliveries"
              value={stats ? stats.failedDeliveries : "—"}
              hint="Could not be delivered."
              icon={<Truck />}
              tone={stats && stats.failedDeliveries > 0 ? "attention" : "default"}
              onClick={() => setOrderStatusFilter("FAILED")}
            />
            <StatTile
              label="Cancelled"
              value={stats ? stats.cancelledOrders : "—"}
              hint="May need a refund or a call."
              icon={<Bell />}
              onClick={() => setOrderStatusFilter("CANCELLED")}
            />
          </div>

          <Panel
            title="Recent orders"
            description={`${filteredOrders.length} of the ${operationsOrders.length} most recent orders`}
            padded={false}
          >
            <div className="grid gap-2 border-b border-slate-100 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-6">
              <label className="relative block sm:col-span-2">
                <span className="sr-only">Search orders</span>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={orderSearch}
                  onChange={(event) => setOrderSearch(event.target.value)}
                  placeholder="Order, customer, store or rider"
                  className={`${dashField.input} pl-9`}
                />
              </label>
              <label>
                <span className="sr-only">Order status</span>
                <select
                  value={orderStatusFilter}
                  onChange={(event) => setOrderStatusFilter(event.target.value)}
                  className={dashField.input}
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
                      {statusText(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="sr-only">Payment status</span>
                <select
                  value={orderPaymentFilter}
                  onChange={(event) => setOrderPaymentFilter(event.target.value)}
                  className={dashField.input}
                >
                  <option value="ALL">All payments</option>
                  <option value="PENDING">Waiting for payment</option>
                  <option value="PAID">Paid</option>
                  <option value="FAILED">Failed</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </label>
              <label>
                <span className="sr-only">Order period</span>
                <select
                  value={orderPeriodFilter}
                  onChange={(event) => setOrderPeriodFilter(event.target.value)}
                  className={dashField.input}
                >
                  <option value="ALL">Any date</option>
                  <option value="TODAY">Today</option>
                  <option value="MONTH">This month</option>
                </select>
              </label>
              <label>
                <span className="sr-only">Sort orders</span>
                <select
                  value={orderSort}
                  onChange={(event) => setOrderSort(event.target.value as "newest" | "oldest")}
                  className={dashField.input}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </label>
            </div>

            {filteredOrders.length === 0 ? (
              <EmptyState
                compact
                title={operationsOrders.length ? "No orders match these filters" : "No orders yet"}
                text={
                  operationsOrders.length
                    ? "Clear or change the filters to see other recent orders."
                    : "Orders show up here as soon as customers start ordering."
                }
              />
            ) : (
              <>
                <ul className="divide-y divide-slate-100 lg:hidden">
                  {visibleOrders.map((order) => (
                    <li key={order.id} className="px-4 py-3 sm:px-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            {order.ozowReference || order.publicId}
                          </p>
                          <p className="truncate text-sm text-slate-500">
                            {order.vendorName} · {order.customerName || "Guest"}
                          </p>
                        </div>
                        <StatusBadge tone={toneForStatus(order.status)}>
                          {statusText(order.status)}
                        </StatusBadge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-slate-600">
                          <span className="font-semibold text-slate-900">
                            {money(order.totalCents)}
                          </span>{" "}
                          · {paymentText(order.paymentStatus)} · {formatDate(order.createdAt)}
                        </p>
                        <button
                          type="button"
                          className={dashButton.secondary}
                          onClick={() => manageOrder(order)}
                        >
                          Manage
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                      <tr>
                        <th className="px-5 py-2.5 font-medium">Order</th>
                        <th className="px-3 py-2.5 font-medium">Customer</th>
                        <th className="px-3 py-2.5 font-medium">Store</th>
                        <th className="px-3 py-2.5 font-medium">Rider</th>
                        <th className="px-3 py-2.5 text-right font-medium">Total</th>
                        <th className="px-3 py-2.5 font-medium">Payment</th>
                        <th className="px-3 py-2.5 font-medium">Status</th>
                        <th className="px-5 py-2.5 text-right font-medium">
                          <span className="sr-only">Action</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleOrders.map((order) => (
                        <tr key={order.id} className="align-top">
                          <td className="px-5 py-3">
                            <div className="font-semibold text-slate-900">
                              {order.ozowReference || order.publicId}
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatDate(order.createdAt)}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-slate-900">{order.customerName || "Guest"}</div>
                            <div className="text-xs text-slate-500">
                              {order.customerEmail || "—"}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-700">{order.vendorName}</td>
                          <td className="px-3 py-3 text-slate-700">
                            {order.riderName || (
                              <span className="text-slate-400">Not assigned</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums">
                            <div className="font-semibold text-slate-900">
                              {money(order.totalCents)}
                            </div>
                            <div className="text-xs text-slate-500">
                              {order.itemCount} item{order.itemCount === 1 ? "" : "s"} · delivery{" "}
                              {money(order.deliveryFeeCents)}
                              {order.riderTipCents > 0
                                ? ` · tip ${money(order.riderTipCents)}`
                                : ""}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge tone={toneForStatus(order.paymentStatus)}>
                              {paymentText(order.paymentStatus)}
                            </StatusBadge>
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge tone={toneForStatus(order.status)}>
                              {statusText(order.status)}
                            </StatusBadge>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              type="button"
                              className={dashButton.secondary}
                              onClick={() => manageOrder(order)}
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {orderPageCount > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:px-5">
                <span>
                  Page {orderPage} of {orderPageCount}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={dashButton.secondary}
                    disabled={orderPage <= 1}
                    onClick={() => setOrderPage((page) => Math.max(1, page - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className={dashButton.secondary}
                    disabled={orderPage >= orderPageCount}
                    onClick={() => setOrderPage((page) => Math.min(orderPageCount, page + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </Panel>
        </section>
      ) : null}

      {view === "messages" ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Panel
            title="Send a message"
            description="Reaches their dashboard inbox, and email or WhatsApp if you choose."
          >
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void sendOwnerMessage();
              }}
            >
              <label className="grid gap-1.5">
                <span className={dashField.label}>Send to</span>
                <select
                  className={dashField.input}
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
                  <option value="ALL_VENDORS">All approved vendors</option>
                  <option value="ALL_RIDERS">All approved riders</option>
                  <option value="VENDOR">One vendor</option>
                  <option value="RIDER">One rider</option>
                </select>
              </label>

              {messageForm.recipientType === "VENDOR" ? (
                <label className="grid gap-1.5">
                  <span className={dashField.label}>Vendor</span>
                  <select
                    className={dashField.input}
                    value={messageForm.recipientId}
                    onChange={(event) =>
                      setMessageForm((state) => ({ ...state, recipientId: event.target.value }))
                    }
                  >
                    <option value="">
                      {recipientOptions ? "Choose a vendor" : "Loading vendors…"}
                    </option>
                    {(recipientOptions?.vendors ?? []).map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name} ({statusText(vendor.status).toLowerCase()})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {messageForm.recipientType === "RIDER" ? (
                <label className="grid gap-1.5">
                  <span className={dashField.label}>Rider</span>
                  <select
                    className={dashField.input}
                    value={messageForm.recipientId}
                    onChange={(event) =>
                      setMessageForm((state) => ({ ...state, recipientId: event.target.value }))
                    }
                  >
                    <option value="">
                      {recipientOptions ? "Choose a rider" : "Loading riders…"}
                    </option>
                    {(recipientOptions?.riders ?? []).map((rider) => (
                      <option key={rider.id} value={rider.id}>
                        {rider.fullName || rider.id} ({statusText(rider.status).toLowerCase()})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="grid gap-1.5">
                <span className={dashField.label}>How to send</span>
                <select
                  className={dashField.input}
                  value={messageForm.channel}
                  onChange={(event) =>
                    setMessageForm((state) => ({
                      ...state,
                      channel: event.target.value as "DASHBOARD" | "EMAIL_WHATSAPP" | "ALL",
                    }))
                  }
                >
                  <option value="ALL">Dashboard, email and WhatsApp</option>
                  <option value="DASHBOARD">Dashboard inbox only</option>
                  <option value="EMAIL_WHATSAPP">
                    Email and WhatsApp (also saved in the inbox)
                  </option>
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className={dashField.label}>Subject</span>
                <input
                  className={dashField.input}
                  value={messageForm.subject}
                  onChange={(event) =>
                    setMessageForm((state) => ({ ...state, subject: event.target.value }))
                  }
                  placeholder="For example: Weekend opening hours"
                />
              </label>

              <label className="grid gap-1.5">
                <span className={dashField.label}>Message</span>
                <textarea
                  className={`${dashField.input} min-h-36`}
                  value={messageForm.body}
                  onChange={(event) =>
                    setMessageForm((state) => ({ ...state, body: event.target.value }))
                  }
                  placeholder="Write your message"
                />
              </label>

              <div>
                <button
                  type="submit"
                  className={dashButton.primary}
                  disabled={savingKey === "message:send"}
                >
                  <Mail aria-hidden="true" />
                  {savingKey === "message:send" ? "Sending…" : "Send message"}
                </button>
              </div>
            </form>
          </Panel>

          <Panel
            title="Sent messages"
            description="Everything sent from here, newest first."
            padded={false}
          >
            {messages.length === 0 ? (
              <EmptyState
                compact
                title="No messages yet"
                text="Messages you send to vendors and riders show here."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {messages.map((message) => (
                  <li key={message.id} className="px-4 py-4 sm:px-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{message.subject}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          To {messageRecipientLabel(message)} ·{" "}
                          {new Date(message.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <StatusBadge tone="neutral" dot={false}>
                        {message.channel === "ALL"
                          ? "Dashboard, email, WhatsApp"
                          : message.channel === "DASHBOARD"
                            ? "Dashboard"
                            : "Email and WhatsApp"}
                      </StatusBadge>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {message.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </section>
      ) : null}

      {view === "finance" ? (
        <section className="space-y-4" aria-label="Finance">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <StatTile
              label="Paid by customers"
              value={stats ? money(stats.customerPaymentsMonthCents) : "—"}
              hint="This month, paid orders only."
              icon={<WalletCards />}
              onClick={() => navigateView("orders", { period: "month", payment: "PAID" })}
            />
            <StatTile
              label="Lethela commission"
              value={stats ? money(stats.revenueMonthCents) : "—"}
              hint="Lethela's income this month."
              icon={<LineChart />}
              onClick={() => navigateView("orders", { period: "month", payment: "PAID" })}
            />
            <StatTile
              label="Owed to vendors"
              value={stats ? money(stats.vendorSalesMonthCents) : "—"}
              hint="Vendor payouts this month."
              icon={<Store />}
              onClick={() => navigateView("vendors", { status: "APPROVED" })}
            />
            <StatTile
              label="Owed to riders"
              value={stats ? money(stats.riderEarningsMonthCents) : "—"}
              hint="Delivery fees and tips this month."
              icon={<Bike />}
              onClick={() => navigateView("riders", { status: "APPROVED" })}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Panel
              title="Where the money goes"
              description="Paid orders only. Delivery fees and tips belong to the rider, so they are never counted as Lethela income."
              padded={false}
            >
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium sm:px-5">&nbsp;</th>
                    <th className="px-4 py-2.5 text-right font-medium">Today</th>
                    <th className="px-4 py-2.5 text-right font-medium sm:px-5">This month</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    {
                      label: "Food and products",
                      today: stats?.grossMerchandiseValueTodayCents,
                      month: stats?.grossMerchandiseValueMonthCents,
                    },
                    {
                      label: "Delivery fees",
                      today: stats?.deliveryFeesTodayCents,
                      month: stats?.deliveryFeesMonthCents,
                    },
                    {
                      label: "Tips",
                      today: stats?.riderTipsTodayCents,
                      month: stats?.riderTipsMonthCents,
                    },
                    {
                      label: "Paid by customers",
                      today: stats?.customerPaymentsTodayCents,
                      month: stats?.customerPaymentsMonthCents,
                      strong: true,
                    },
                    {
                      label: "Lethela commission",
                      today: stats?.revenueTodayCents,
                      month: stats?.revenueMonthCents,
                    },
                    {
                      label: "Owed to vendors",
                      today: stats?.vendorSalesTodayCents,
                      month: stats?.vendorSalesMonthCents,
                    },
                    {
                      label: "Owed to riders",
                      today: stats?.riderEarningsTodayCents,
                      month: stats?.riderEarningsMonthCents,
                    },
                  ].map((row) => (
                    <tr key={row.label} className={row.strong ? "bg-slate-50/60" : undefined}>
                      <th
                        scope="row"
                        className={`px-4 py-3 text-left sm:px-5 ${
                          row.strong ? "font-semibold text-slate-900" : "font-normal text-slate-600"
                        }`}
                      >
                        {row.label}
                      </th>
                      <td
                        className={`px-4 py-3 text-right tabular-nums ${
                          row.strong ? "font-semibold text-slate-900" : "text-slate-700"
                        }`}
                      >
                        {row.today != null ? money(row.today) : "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums sm:px-5 ${
                          row.strong ? "font-semibold text-slate-900" : "text-slate-700"
                        }`}
                      >
                        {row.month != null ? money(row.month) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            <div className="grid content-start gap-4">
              <StatTile
                label="Refunds to look at"
                value={openRefundCount}
                hint="Open refund cases. Tap to handle them."
                icon={<Bell />}
                tone={openRefundCount > 0 ? "attention" : "default"}
                onClick={() => navigateView("operations", { filter: "refunds" })}
              />
              <StatTile
                label="Average order today"
                value={stats ? money(stats.averageOrderValueTodayCents) : "—"}
                hint="Paid orders only."
                icon={<ShoppingBag />}
                onClick={() => navigateView("orders", { period: "today" })}
              />
            </div>
          </div>
        </section>
      ) : null}

      {view === "operations" ? (
        <section className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <Panel
              title="Manage an order"
              description="Pick an order, then change its status, give it to a rider, open a refund or add a note."
            >
              <div className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className={dashField.label}>Recent order</span>
                    <select
                      className={dashField.input}
                      value={selectedOperationsOrder ? selectedOperationsOrder.publicId : ""}
                      onChange={(event) =>
                        setOperationsForm((state) => ({ ...state, orderRef: event.target.value }))
                      }
                    >
                      <option value="">Choose an order</option>
                      {operationsOrders.map((order) => (
                        <option key={order.id} value={order.publicId}>
                          {order.publicId} · {order.vendorName} · {money(order.totalCents)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5">
                    <span className={dashField.label}>Or type the order reference</span>
                    <input
                      className={dashField.input}
                      value={operationsForm.orderRef}
                      onChange={(event) =>
                        setOperationsForm((state) => ({ ...state, orderRef: event.target.value }))
                      }
                      placeholder="LET-…"
                    />
                  </label>
                </div>

                {selectedOperationsOrder ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {selectedOperationsOrder.publicId}
                        </p>
                        <p className="text-sm text-slate-500">
                          {selectedOperationsOrder.vendorName} ·{" "}
                          {selectedOperationsOrder.customerName || "Guest"} ·{" "}
                          {formatDate(selectedOperationsOrder.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <StatusBadge tone={toneForStatus(selectedOperationsOrder.status)}>
                          {statusText(selectedOperationsOrder.status)}
                        </StatusBadge>
                        <StatusBadge tone={toneForStatus(selectedOperationsOrder.paymentStatus)}>
                          {paymentText(selectedOperationsOrder.paymentStatus)}
                        </StatusBadge>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-x-6 sm:grid-cols-2">
                      <DetailRow
                        label="Food"
                        value={money(selectedOperationsOrder.subtotalCents)}
                      />
                      <DetailRow
                        label="Vendor gets"
                        value={money(selectedOperationsOrder.vendorPayoutCents)}
                      />
                      <DetailRow
                        label="Delivery fee"
                        value={money(selectedOperationsOrder.deliveryFeeCents)}
                      />
                      <DetailRow
                        label="Rider gets"
                        value={money(selectedOperationsOrder.riderPayoutCents)}
                      />
                      <DetailRow label="Tip" value={money(selectedOperationsOrder.riderTipCents)} />
                      <DetailRow
                        label="Customer paid"
                        value={money(selectedOperationsOrder.totalCents)}
                      />
                      <DetailRow
                        label="Rider"
                        value={selectedOperationsOrder.riderName || "Not assigned"}
                      />
                      <DetailRow
                        label="Distance"
                        value={
                          selectedOperationsOrder.deliveryDistanceKm != null
                            ? `${selectedOperationsOrder.deliveryDistanceKm.toFixed(1)} km`
                            : "Not worked out yet"
                        }
                      />
                    </div>
                    {selectedOperationsOrder.containsAlcohol ? (
                      <p className="mt-3 text-sm font-medium text-amber-800">
                        Contains liquor: the rider must check the customer&apos;s ID.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <label className="grid gap-1.5">
                  <span className={dashField.label}>Note</span>
                  <textarea
                    className={`${dashField.input} min-h-20`}
                    value={operationsForm.note}
                    onChange={(event) =>
                      setOperationsForm((state) => ({ ...state, note: event.target.value }))
                    }
                    placeholder="What happened and what you did. Needed when you cancel an order."
                  />
                </label>

                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="grid content-start gap-2 rounded-lg border border-slate-200 p-3">
                    <label className="grid gap-1.5">
                      <span className={dashField.label}>Change status to</span>
                      <select
                        className={dashField.input}
                        value={operationsForm.status}
                        onChange={(event) =>
                          setOperationsForm((state) => ({ ...state, status: event.target.value }))
                        }
                      >
                        {ADMIN_ORDER_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {statusText(status)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className={dashButton.primary}
                      disabled={savingKey === "operation:status"}
                      onClick={() => void submitOperation("status")}
                    >
                      {savingKey === "operation:status" ? "Saving…" : "Update status"}
                    </button>
                  </div>

                  <div className="grid content-start gap-2 rounded-lg border border-slate-200 p-3">
                    <label className="grid gap-1.5">
                      <span className={dashField.label}>Give to rider</span>
                      <select
                        className={dashField.input}
                        value={operationsForm.riderApplicationId}
                        onChange={(event) =>
                          setOperationsForm((state) => ({
                            ...state,
                            riderApplicationId: event.target.value,
                          }))
                        }
                      >
                        <option value="">
                          {operationsRiders.length ? "Choose a rider" : "No approved riders yet"}
                        </option>
                        {operationsRiders.map((rider) => (
                          <option key={rider.id} value={rider.id}>
                            {rider.fullName} · {rider.suburb || rider.city} · {rider.vehicleType}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className={dashButton.secondary}
                      disabled={savingKey === "operation:dispatch"}
                      onClick={() => void submitOperation("dispatch")}
                    >
                      <Truck aria-hidden="true" />
                      {savingKey === "operation:dispatch" ? "Saving…" : "Assign rider"}
                    </button>
                  </div>
                </div>

                <details className="group rounded-lg border border-slate-200">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-semibold text-slate-800">
                    Open a refund case
                    <ChevronRight
                      className="dash-summary-chevron h-4 w-4 text-slate-400 transition-transform"
                      aria-hidden="true"
                    />
                  </summary>
                  <div className="grid gap-3 border-t border-slate-100 p-3 sm:grid-cols-2">
                    <label className="grid gap-1.5">
                      <span className={dashField.label}>Amount (R)</span>
                      <input
                        className={dashField.input}
                        inputMode="decimal"
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
                    <label className="grid gap-1.5">
                      <span className={dashField.label}>Proof link (optional)</span>
                      <input
                        className={dashField.input}
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
                    <label className="grid gap-1.5 sm:col-span-2">
                      <span className={dashField.label}>Reason</span>
                      <input
                        className={dashField.input}
                        value={operationsForm.refundReason}
                        onChange={(event) =>
                          setOperationsForm((state) => ({
                            ...state,
                            refundReason: event.target.value,
                          }))
                        }
                        placeholder="Missing item, failed delivery, wrong order…"
                      />
                    </label>
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        className={dashButton.secondary}
                        disabled={savingKey === "operation:refund"}
                        onClick={() => void submitOperation("refund")}
                      >
                        {savingKey === "operation:refund" ? "Saving…" : "Open refund case"}
                      </button>
                    </div>
                  </div>
                </details>

                <div>
                  <button
                    type="button"
                    className={dashButton.quiet}
                    disabled={savingKey === "operation:event"}
                    onClick={() => void submitOperation("event")}
                  >
                    {savingKey === "operation:event" ? "Saving…" : "Save the note only"}
                  </button>
                </div>
              </div>
            </Panel>

            <div className="grid content-start gap-4">
              <OperationsFeed
                title="Order history"
                empty="Status changes and notes show here."
                items={operationsEvents.map((event) => ({
                  id: event.id,
                  title: `${event.publicId} · ${statusText(event.type)}`,
                  body: event.note || event.actor || "No note added.",
                  meta: new Date(event.createdAt).toLocaleString(),
                }))}
              />
              <OperationsFeed
                id="refund-cases"
                title="Refund cases"
                empty="No refund cases."
                items={operationsRefunds.map((refund) => ({
                  id: refund.id,
                  title: `${refund.publicId} · ${money(refund.amountCents)} · ${statusText(refund.status)}`,
                  body: `${refund.reason}${refund.note ? ` · ${refund.note}` : ""}`,
                  meta: new Date(refund.createdAt).toLocaleString(),
                }))}
              />
              <OperationsFeed
                title="Rider assignments"
                empty="Orders you give to riders show here."
                items={operationsDispatches.map((dispatch) => ({
                  id: dispatch.id,
                  title: `${dispatch.publicId} · ${dispatch.riderName}`,
                  body: `${statusText(dispatch.status)} · ${dispatch.riderPhone}${
                    dispatch.note ? ` · ${dispatch.note}` : ""
                  }`,
                  meta: new Date(dispatch.createdAt).toLocaleString(),
                }))}
              />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel
              title="Alerts and settings"
              description="Who gets told about new orders and sign-ups."
            >
              <div className="divide-y divide-slate-100">
                <DetailRow
                  label="New order alerts by email"
                  value={
                    channels?.email.enabled
                      ? `On, ${channels.email.recipients} ${channels.email.recipients === 1 ? "person" : "people"}`
                      : "Off"
                  }
                />
                <DetailRow
                  label="New order alerts by WhatsApp"
                  value={
                    channels?.whatsapp.enabled
                      ? `On, ${channels.whatsapp.recipients} ${channels.whatsapp.recipients === 1 ? "person" : "people"}`
                      : "Off"
                  }
                />
                <DetailRow
                  label="Emails to vendors and riders"
                  value={applicantChannels?.email.enabled ? "On" : "Off"}
                />
                <DetailRow
                  label="WhatsApp to vendors and riders"
                  value={applicantChannels?.whatsapp.enabled ? "On" : "Off"}
                />
                <DetailRow
                  label="Alerts in this browser"
                  value={
                    pushPermission === "granted"
                      ? "On"
                      : pushPermission === "denied"
                        ? "Blocked in browser settings"
                        : pushPermission === "unsupported"
                          ? "Not supported here"
                          : "Off"
                  }
                />
                <DetailRow
                  label="Signed in with"
                  value={
                    authMode === "dev-bypass"
                      ? "Local test access"
                      : authMode === "key"
                        ? "Admin key"
                        : authMode === "key-cookie"
                          ? "Owner account"
                          : "Checking…"
                  }
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {pushPermission !== "granted" && pushPermission !== "unsupported" ? (
                  <button
                    type="button"
                    className={dashButton.secondary}
                    onClick={enableBrowserAlerts}
                  >
                    <Bell aria-hidden="true" />
                    Turn on alerts
                  </button>
                ) : null}
                <Link href="/admin/launch-checklist" className={dashButton.secondary}>
                  <Settings aria-hidden="true" />
                  Go-live checklist
                </Link>
              </div>
              <details className="group mt-4 rounded-lg border border-slate-200">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-semibold text-slate-800">
                  Admin access key
                  <ChevronRight
                    className="dash-summary-chevron h-4 w-4 text-slate-400 transition-transform"
                    aria-hidden="true"
                  />
                </summary>
                <div className="grid gap-2 border-t border-slate-100 p-3">
                  <p className="text-sm text-slate-500">
                    Only needed to restore owner access on this browser.
                  </p>
                  <input
                    className={`${dashField.input} max-w-md`}
                    value={adminKey}
                    onChange={(event) => setAdminKey(event.target.value)}
                    placeholder="ADMIN_APPROVAL_KEY"
                    type="password"
                    autoComplete="off"
                    aria-label="Admin access key"
                  />
                </div>
              </details>
            </Panel>

            <Panel
              title="Send a broadcast push"
              description="A phone or browser notification to customers who allowed marketing messages."
            >
              {webPushConfigured === false ? (
                <Notice tone="warning" className="mb-4">
                  Push messages are not set up yet. The web push keys need to be added in Vercel
                  first.
                </Notice>
              ) : null}
              <form
                className="grid gap-3 sm:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendPushCampaign();
                }}
              >
                <label className="grid gap-1.5 sm:col-span-2">
                  <span className={dashField.label}>Title</span>
                  <input
                    className={dashField.input}
                    value={pushForm.title}
                    maxLength={80}
                    onChange={(event) =>
                      setPushForm((state) => ({ ...state, title: event.target.value }))
                    }
                    placeholder="Fresh kotas near you"
                  />
                </label>
                <label className="grid gap-1.5 sm:col-span-2">
                  <span className={dashField.label}>Message</span>
                  <textarea
                    className={`${dashField.input} min-h-20`}
                    value={pushForm.body}
                    maxLength={200}
                    onChange={(event) =>
                      setPushForm((state) => ({ ...state, body: event.target.value }))
                    }
                    placeholder="Order now from your favourite local spot."
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className={dashField.label}>Opens</span>
                  <input
                    className={dashField.input}
                    value={pushForm.url}
                    onChange={(event) =>
                      setPushForm((state) => ({ ...state, url: event.target.value }))
                    }
                    placeholder="/"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className={dashField.label}>Send to</span>
                  <select
                    className={dashField.input}
                    value={pushForm.segment}
                    onChange={(event) =>
                      setPushForm((state) => ({
                        ...state,
                        segment: event.target.value as PushSegment,
                      }))
                    }
                  >
                    <option value="ALL">Everyone who allowed messages</option>
                    <option value="ENGAGED">People who searched or browsed</option>
                    <option value="LOYAL">People who added to cart</option>
                    <option value="NO_ORDER_YET">Signed up, no order yet</option>
                  </select>
                </label>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className={dashButton.primary}
                    disabled={savingKey === "push:send" || webPushConfigured === false}
                  >
                    <Bell aria-hidden="true" />
                    {savingKey === "push:send" ? "Sending…" : "Send push"}
                  </button>
                </div>
              </form>

              {pushCampaigns.length > 0 ? (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="text-sm font-semibold text-slate-900">Sent before</p>
                  <ul className="mt-2 divide-y divide-slate-100">
                    {pushCampaigns.map((campaign) => (
                      <li
                        key={campaign.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate font-medium text-slate-900">
                          {campaign.title}
                        </span>
                        <span className="text-xs text-slate-500">
                          {campaign.sentCount} sent
                          {campaign.failedCount ? `, ${campaign.failedCount} failed` : ""} ·{" "}
                          {new Date(campaign.createdAt).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Panel>
          </div>

          <Panel
            title="How Lethela runs"
            description="Short checklists for the team. Open one when you need it."
            padded={false}
          >
            <div className="divide-y divide-slate-100">
              <OperationsList title="Every day" items={DAILY_OPERATING_PLAYBOOK} />
              <OperationsList title="When an order goes wrong" items={ORDER_EXCEPTION_PLAYBOOK} />
              <OperationsList title="Before growing" items={SCALE_READINESS_PLAYBOOK} />
            </div>
          </Panel>
        </section>
      ) : null}

      {view === "activity" ? (
        <section className="space-y-4">
          {auditLogs.length === 0 ? (
            <EmptyState
              title="No activity yet"
              text="Approvals, rejections, status changes and other admin actions show here."
            />
          ) : (
            <Panel padded={false}>
              <ul className="divide-y divide-slate-100 md:hidden">
                {auditLogs.map((log) => (
                  <li key={log.id} className="px-4 py-3">
                    <p className="font-medium text-slate-900">{statusText(log.action)}</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {statusText(log.targetType)} · {log.actor}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">What happened</th>
                      <th className="px-3 py-2.5 font-medium">On</th>
                      <th className="px-3 py-2.5 font-medium">By</th>
                      <th className="px-5 py-2.5 font-medium">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-5 py-3 font-medium text-slate-900">
                          {statusText(log.action)}
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {statusText(log.targetType)}
                          <span className="block max-w-[16rem] truncate text-xs text-slate-400">
                            {log.targetId}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{log.actor}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </section>
      ) : null}
    </DashboardShell>
  );
}

function OperationsList({ title, items }: { title: string; items: string[] }) {
  return (
    <details className="group">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-slate-800 sm:px-5">
        {title}
        <ChevronRight
          className="dash-summary-chevron h-4 w-4 text-slate-400 transition-transform"
          aria-hidden="true"
        />
      </summary>
      <ul className="grid gap-2 px-4 pb-4 sm:px-5">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600">
            <CheckCircle2
              className="mt-1 h-4 w-4 shrink-0 text-lethela-primary"
              aria-hidden="true"
            />
            {item}
          </li>
        ))}
      </ul>
    </details>
  );
}

function OperationsFeed({
  id,
  title,
  empty,
  items,
}: {
  id?: string;
  title: string;
  empty: string;
  items: Array<{ id: string; title: string; body: string; meta: string }>;
}) {
  return (
    <Panel id={id} title={title} padded={false} className="scroll-mt-24">
      {items.length === 0 ? (
        <p className="px-4 py-4 text-sm text-slate-500 sm:px-5">{empty}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.slice(0, 5).map((item) => (
            <li key={item.id} className="px-4 py-3 sm:px-5">
              <p className="text-sm font-medium text-slate-900">{item.title}</p>
              <p className="mt-0.5 text-sm leading-5 text-slate-600">{item.body}</p>
              <p className="mt-1 text-xs text-slate-400">{item.meta}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function approvalStateText(status: string) {
  if (status === "SUBMITTED") return "waiting for approval";
  if (status === "UNDER_REVIEW") return "being checked";
  if (status === "CHANGES_REQUESTED") return "changes asked";
  return statusText(status).toLowerCase();
}

function paymentText(status: string) {
  const value = status.toUpperCase();
  if (value === "PAID" || value === "SUCCESS") return "Paid";
  if (value === "PENDING") return "Waiting for payment";
  return statusText(status);
}

function customerTone(customer: AdminCustomer) {
  return customer.status === "LOCKED"
    ? "danger"
    : customer.status === "UNVERIFIED"
      ? "warning"
      : "success";
}

function customerStatusText(customer: AdminCustomer) {
  return customer.status === "LOCKED"
    ? "Locked"
    : customer.status === "UNVERIFIED"
      ? "Unverified"
      : customer.status === "VERIFIED"
        ? "Verified"
        : "Active";
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
    <label className="relative block w-full sm:max-w-sm">
      <span className="sr-only">{label}</span>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <input
        type="search"
        className={`${dashField.input} pl-9`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
