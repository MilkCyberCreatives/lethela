"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bike,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock,
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
  Users,
  WalletCards,
} from "lucide-react";
import MainHeader from "@/components/MainHeader";
import { Button } from "@/components/ui/button";

type DashboardView =
  | "overview"
  | "vendors"
  | "riders"
  | "users"
  | "orders"
  | "messages"
  | "operations";
type VendorStatusOption =
  | "DRAFT_PROFILE"
  | "SUBMITTED_FOR_APPROVAL"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "ALL";
type RiderStatusFilter = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "ALL";
type VendorActionType = "approve" | "reject" | "changes_requested" | "suspend";
type RiderApplicationStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

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
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
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
  revenueTodayCents: number;
  revenueMonthCents: number;
  activeVendors: number;
  activeRiders: number;
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
  totalCents: number;
  createdAt: string;
  vendorName: string;
  vendorPhone: string | null;
  customerName: string | null;
  customerEmail: string | null;
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

const VENDOR_STATUS_OPTIONS: VendorStatusOption[] = [
  "SUBMITTED_FOR_APPROVAL",
  "CHANGES_REQUESTED",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "DRAFT_PROFILE",
  "ALL",
];
const RIDER_STATUS_OPTIONS: RiderStatusFilter[] = [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "ALL",
];

const WORKSPACES: Array<{ id: DashboardView; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Owner overview", icon: LayoutDashboard },
  { id: "vendors", label: "Vendors", icon: Store },
  { id: "riders", label: "Riders", icon: Bike },
  { id: "users", label: "Users", icon: Users },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "operations", label: "Operations", icon: Activity },
];

const DAILY_OPERATING_PLAYBOOK = [
  "Check new vendor submissions and approve only complete profiles with products, hours, address, banking and documents.",
  "Check rider applications and approve only riders with valid contact, vehicle, banking and emergency details.",
  "Keep WhatsApp support open during operating hours and log every complaint, refund request or failed delivery.",
  "Before accepting public traffic, run at least one low-value paid Ozow order from cart to vendor alert, rider handover and completion.",
  "Keep alcohol hidden until licence checks, age verification, rider handover, refusal and refund rules are fully operational.",
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
      <p className="mt-2 text-xs leading-5 text-white/60">{note}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        className="rounded-lg border border-white/10 bg-white/[0.045] p-3 text-left transition hover:border-lethela-primary/50 hover:bg-white/[0.07]"
        type="button"
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.045] p-3">{content}</article>
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

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [view, setView] = useState<DashboardView>("overview");
  const [vendorStatus, setVendorStatus] = useState<VendorStatusOption>("SUBMITTED_FOR_APPROVAL");
  const [riderStatus, setRiderStatus] = useState<RiderStatusFilter>("PENDING");
  const [vendorSearch, setVendorSearch] = useState("");
  const [riderSearch, setRiderSearch] = useState("");
  const [vendors, setVendors] = useState<VendorApplication[]>([]);
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
  const [totalPendingApprovals, setTotalPendingApprovals] = useState(0);
  const [authMode, setAuthMode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pushPermission, setPushPermission] = useState<string>("unsupported");
  const adminKeyRef = useRef("");

  useEffect(() => {
    setPushPermission(
      typeof window !== "undefined" && "Notification" in window
        ? Notification.permission
        : "unsupported",
    );
  }, []);

  useEffect(() => {
    adminKeyRef.current = adminKey.trim();
  }, [adminKey]);

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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await syncAdminAccess();

      const [
        vendorsResponse,
        ridersResponse,
        notificationsResponse,
        messagesResponse,
        statsResponse,
        operationsResponse,
      ] = await Promise.all([
        fetch(`/api/admin/vendors?status=${vendorStatus}`, { method: "GET", cache: "no-store" }),
        fetch(`/api/admin/riders?status=${riderStatus}`, { method: "GET", cache: "no-store" }),
        fetch("/api/admin/notifications", { method: "GET", cache: "no-store" }),
        fetch("/api/admin/messages", { method: "GET", cache: "no-store" }),
        fetch("/api/admin/stats", { method: "GET", cache: "no-store" }),
        fetch("/api/admin/operations", { method: "GET", cache: "no-store" }),
      ]);

      const [vendorsJson, ridersJson, notificationsJson, messagesJson, statsJson, operationsJson] =
        await Promise.all([
          vendorsResponse.json(),
          ridersResponse.json(),
          notificationsResponse.json(),
          messagesResponse.json(),
          statsResponse.json(),
          operationsResponse.json(),
        ]);

      if (!vendorsResponse.ok || !vendorsJson.ok)
        throw new Error(vendorsJson.error || "Failed to load vendor approvals.");
      if (!ridersResponse.ok || !ridersJson.ok)
        throw new Error(ridersJson.error || "Failed to load rider approvals.");
      if (!notificationsResponse.ok || !notificationsJson.ok) {
        throw new Error(notificationsJson.error || "Failed to load notification settings.");
      }
      if (!messagesResponse.ok || !messagesJson.ok) {
        throw new Error(messagesJson.error || "Failed to load messages.");
      }
      if (!statsResponse.ok || !statsJson.ok) {
        throw new Error(statsJson.error || "Failed to load owner statistics.");
      }
      if (!operationsResponse.ok || !operationsJson.ok) {
        throw new Error(operationsJson.error || "Failed to load operations center.");
      }

      setVendors(vendorsJson.items ?? []);
      setVendorCounts(
        vendorsJson.counts ?? {
          pending: Number(vendorsJson.pendingCount ?? 0),
          active: 0,
          rejected: 0,
          total: Number((vendorsJson.items ?? []).length),
        },
      );
      setRiders(ridersJson.items ?? []);
      setRiderCounts(
        ridersJson.counts ?? {
          pending: 0,
          underReview: 0,
          approved: 0,
          rejected: 0,
          total: Number((ridersJson.items ?? []).length),
        },
      );
      setChannels(notificationsJson.channels ?? null);
      setApplicantChannels(notificationsJson.applicantChannels ?? null);
      setMessages(messagesJson.items ?? []);
      setStats(statsJson.stats ?? null);
      setOperationsOrders(operationsJson.orders ?? []);
      setOperationsRiders(operationsJson.riders ?? []);
      setOperationsEvents(operationsJson.events ?? []);
      setOperationsRefunds(operationsJson.refunds ?? []);
      setOperationsDispatches(operationsJson.dispatches ?? []);
      setTotalPendingApprovals(Number(notificationsJson.totalPendingApprovals ?? 0));
      setAuthMode(vendorsJson.authMode ?? ridersJson.authMode ?? null);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load approvals."));
      setVendors([]);
      setRiders([]);
    } finally {
      setLoading(false);
    }
  }, [riderStatus, syncAdminAccess, vendorStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void load();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [load]);

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
    setSavingKey(`vendor:${vendorId}`);
    setError(null);
    setNotice(null);
    try {
      await syncAdminAccess();

      const response = await fetch(`/api/admin/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
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
    setSavingKey(`rider:${id}:${status}`);
    setError(null);
    setNotice(null);
    try {
      await syncAdminAccess();

      const response = await fetch(`/api/admin/riders/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
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

  const activeRiders = riderCounts.approved;
  const totalRiderQueue = riderCounts.pending + riderCounts.underReview;
  const activeVendorRatio = vendorCounts.total
    ? Math.round((vendorCounts.active / vendorCounts.total) * 100)
    : 0;

  const metrics = [
    {
      label: "Orders today",
      value: stats?.ordersToday ?? 0,
      note: "Orders created since midnight.",
      icon: ShoppingBag,
      target: "orders" as DashboardView,
    },
    {
      label: "Revenue today",
      value: money(stats?.revenueTodayCents ?? 0),
      note: "Paid and successful orders today.",
      icon: WalletCards,
      target: "orders" as DashboardView,
    },
    {
      label: "Revenue month",
      value: money(stats?.revenueMonthCents ?? 0),
      note: "Paid and successful orders this month.",
      icon: LineChart,
      target: "orders" as DashboardView,
    },
    {
      label: "Pending approvals",
      value: totalPendingApprovals,
      note: "Vendor and rider onboarding work waiting for the owner.",
      icon: Clock,
      target: "vendors" as DashboardView,
    },
    {
      label: "Live vendors",
      value: stats?.activeVendors ?? vendorCounts.active,
      note: `${activeVendorRatio}% of vendor applications are live.`,
      icon: Store,
      target: "vendors" as DashboardView,
    },
    {
      label: "Rider bench",
      value: stats?.activeRiders ?? activeRiders,
      note: `${totalRiderQueue} rider application(s) still need review.`,
      icon: Bike,
      target: "riders" as DashboardView,
    },
    {
      label: "Pending deliveries",
      value: stats?.pendingDeliveries ?? 0,
      note: "Orders waiting, preparing, or out for delivery.",
      icon: PackageCheck,
      target: "orders" as DashboardView,
    },
    {
      label: "Average delivery",
      value: stats?.averageDeliveryTimeMins ? `${stats.averageDeliveryTimeMins}m` : "N/A",
      note: "Starts after completed deliveries.",
      icon: Clock,
      target: "orders" as DashboardView,
    },
    {
      label: "Satisfaction",
      value: stats?.reviewCount ? `${stats.customerSatisfactionScore}/5` : "N/A",
      note: "Starts after customer reviews.",
      icon: CheckCircle2,
      target: "users" as DashboardView,
    },
    {
      label: "Alert health",
      value:
        channels?.email.enabled ||
        channels?.whatsapp.enabled ||
        channels?.push.enabled ||
        applicantChannels?.email.enabled ||
        applicantChannels?.whatsapp.enabled
          ? "On"
          : "Setup",
      note: "Email, WhatsApp and browser alert coverage for admin and applicant events.",
      icon: Bell,
      target: "operations" as DashboardView,
    },
  ];

  const orderMonitoring = [
    {
      label: "Pending deliveries",
      value: stats?.pendingDeliveries ?? 0,
      color: "bg-sky-300",
    },
    {
      label: "Delayed orders",
      value: stats?.delayedOrders ?? 0,
      color: "bg-amber-300",
    },
    {
      label: "Failed deliveries",
      value: stats?.failedDeliveries ?? 0,
      color: "bg-red-300",
    },
    {
      label: "Cancelled orders",
      value: stats?.cancelledOrders ?? 0,
      color: "bg-lethela-primary",
    },
  ];

  const customerSignals = [
    {
      label: "Customers",
      value: stats?.customerCount ?? 0,
      note: "Registered customer accounts.",
    },
    {
      label: "Product reviews",
      value: stats?.reviewCount ?? 0,
      note: "Customer ratings submitted.",
    },
    {
      label: "Satisfaction",
      value: stats?.reviewCount ? `${stats.customerSatisfactionScore}/5` : "N/A",
      note: "Starts when customers submit ratings.",
    },
  ];

  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />

      <section className="container py-8">
        <div className="grid gap-5 lg:grid-cols-[250px,1fr]">
          <aside className="rounded-lg border border-white/10 bg-[#090D2C] p-4 lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)]">
            <div className="border-b border-white/10 pb-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/50">Lethela owner</p>
              <h1 className="mt-2 text-xl font-bold">Dashboard</h1>
              <p className="mt-2 text-xs leading-relaxed text-white/60">
                Admin, vendor, user and rider operations in one workspace.
              </p>
            </div>

            <nav className="mt-4 grid gap-2">
              {WORKSPACES.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                      active
                        ? "bg-lethela-primary text-white"
                        : "bg-white/[0.035] text-white/70 hover:bg-white/[0.07] hover:text-white"
                    }`}
                    type="button"
                    onClick={() => setView(item.id)}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                Quick links
              </p>
              <div className="mt-3 grid gap-2 text-sm">
                <Link className="text-white/75 hover:text-white" href="/vendors/dashboard">
                  Vendor dashboard
                </Link>
                <Link className="text-white/75 hover:text-white" href="/rider/dashboard">
                  Rider dashboard
                </Link>
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-5">
            <section className="rounded-lg border border-white/10 bg-[#0C1132] p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-lethela-primary">
                    Operations command
                  </p>
                  <h2 className="mt-2 text-2xl font-bold md:text-3xl">Owner dashboard</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/68">
                    Sego gave us the food-admin structure: KPIs, order queues, profile modules,
                    calendar, messages and product controls. This version keeps Lethela styling and
                    connects those ideas to admin, vendors, customers and riders.
                  </p>
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

              <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                {metrics.map((metric) => (
                  <MetricCard
                    key={metric.label}
                    {...metric}
                    onClick={() => setView(metric.target)}
                  />
                ))}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-[1fr,180px,180px]">
                <div>
                  <label className="mb-1 block text-xs text-white/60">Admin key</label>
                  <input
                    className="h-10 w-full rounded-lg border border-white/10 bg-white px-3 text-sm text-black outline-none focus:ring-2 focus:ring-lethela-primary"
                    value={adminKey}
                    onChange={(event) => setAdminKey(event.target.value)}
                    placeholder="Use if ADMIN_APPROVAL_KEY is set"
                    type="password"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/60">Vendor filter</label>
                  <select
                    value={vendorStatus}
                    onChange={(event) => setVendorStatus(event.target.value as VendorStatusOption)}
                    className="h-10 w-full rounded-lg border border-white/10 bg-white px-3 text-sm text-black"
                  >
                    {VENDOR_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/60">Rider filter</label>
                  <select
                    value={riderStatus}
                    onChange={(event) => setRiderStatus(event.target.value as RiderStatusFilter)}
                    className="h-10 w-full rounded-lg border border-white/10 bg-white px-3 text-sm text-black"
                  >
                    {RIDER_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
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
                <section className="grid gap-5 xl:grid-cols-[1.15fr,0.85fr]">
                  <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-white/50">
                          Order monitoring
                        </p>
                        <h3 className="mt-1 text-lg font-semibold">Live queue overview</h3>
                      </div>
                      <LineChart className="h-5 w-5 text-lethela-primary" />
                    </div>
                    <div className="mt-5 space-y-4">
                      {orderMonitoring.map((item) => (
                        <button
                          key={item.label}
                          className="block w-full text-left"
                          type="button"
                          onClick={() => setView("orders")}
                        >
                          <div className="flex justify-between text-sm">
                            <span className="text-white/70">{item.label}</span>
                            <span className="font-semibold">{item.value}</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-white/10">
                            <div
                              className={`h-2 rounded-full ${item.color}`}
                              style={{ width: `${Math.min(item.value * 10, 100)}%` }}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-white/50">Today</p>
                        <h3 className="mt-1 text-lg font-semibold">Owner checklist</h3>
                      </div>
                      <CalendarDays className="h-5 w-5 text-lethela-primary" />
                    </div>
                    <div className="mt-4 grid gap-3">
                      {[
                        { label: "Clear pending vendor KYC approvals", target: "vendors" },
                        {
                          label: "Move rider applications from pending to review",
                          target: "riders",
                        },
                        { label: "Check delayed order exceptions", target: "orders" },
                        {
                          label: "Send operating updates to vendors and riders",
                          target: "messages",
                        },
                      ].map((item) => (
                        <button
                          key={item.label}
                          className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-lethela-primary/50 hover:bg-white/[0.07]"
                          type="button"
                          onClick={() => setView(item.target as DashboardView)}
                        >
                          <CheckCircle2 className="h-4 w-4 text-lethela-primary" />
                          <span className="text-sm text-white/75">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      title: "AI insights",
                      body: stats?.topProducts[0]
                        ? `Most ordered: ${stats.topProducts[0].name}. Peak trends and customer habits will deepen as orders grow.`
                        : "No customer order trends yet. This will start once the first paid orders are placed.",
                      target: "orders",
                    },
                    {
                      title: "Vendor performance",
                      body: stats?.topVendors[0]
                        ? `Top vendor: ${stats.topVendors[0].name}. View vendor sales, ratings, and stock coaching.`
                        : "No vendor sales yet. Performance insights start after vendors receive paid orders.",
                      target: "vendors",
                    },
                    {
                      title: "Township commerce",
                      body: "Kota, shisanyama, spaza, groceries, airtime, electricity, and township specials will be activated from real vendor categories.",
                      target: "users",
                    },
                    {
                      title: "Marketing control",
                      body: "Promotions, coupons, free delivery campaigns, push, SMS, and WhatsApp broadcasts will use real customer and vendor segments.",
                      target: "operations",
                    },
                  ].map((item) => (
                    <button
                      key={item.title}
                      className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-left transition hover:border-lethela-primary/50 hover:bg-white/[0.07]"
                      type="button"
                      onClick={() => setView(item.target as DashboardView)}
                    >
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-white/65">{item.body}</p>
                    </button>
                  ))}
                </section>
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
                        <div>Delivery: R {(vendor.deliveryFee / 100).toFixed(2)}</div>
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

            {view === "riders" ? (
              <section className="space-y-4">
                <SearchBox
                  label="Rider approvals and fleet"
                  value={riderSearch}
                  placeholder="Search riders by name, phone, vehicle, or area"
                  onChange={setRiderSearch}
                />
                <div className="grid gap-3 md:grid-cols-3">
                  <MetricCard
                    label="Pending"
                    value={riderCounts.pending}
                    note="New rider applications."
                    icon={Clock}
                  />
                  <MetricCard
                    label="Review"
                    value={riderCounts.underReview}
                    note="Documents being checked."
                    icon={PackageCheck}
                  />
                  <MetricCard
                    label="Approved"
                    value={riderCounts.approved}
                    note="Riders ready for shifts."
                    icon={Bike}
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
                          "PENDING",
                          "UNDER_REVIEW",
                          "APPROVED",
                          "REJECTED",
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
                <div className="grid gap-3 md:grid-cols-3">
                  {customerSignals.map((signal) => (
                    <MetricCard
                      key={signal.label}
                      label={signal.label}
                      value={signal.value}
                      note={signal.note}
                      icon={Users}
                    />
                  ))}
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                  <h3 className="text-lg font-semibold">Customer growth</h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                      <p className="text-sm font-semibold">Order history</p>
                      <p className="mt-1 text-sm text-white/62">
                        Customer history, reorder buttons, favourites, and saved delivery addresses
                        will populate from real customer activity.
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                      <p className="text-sm font-semibold">Rewards programme</p>
                      <p className="mt-1 text-sm text-white/62">
                        Points and discount redemption stay at zero until paid orders create real
                        reward balances.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {view === "orders" ? (
              <section className="grid gap-4 lg:grid-cols-[1fr,0.8fr]">
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                  <h3 className="text-lg font-semibold">Order control room</h3>
                  <div className="mt-4 grid gap-3">
                    {orderMonitoring.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] p-3"
                      >
                        <span className="text-sm text-white/75">{item.label}</span>
                        <span className="text-lg font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                  <h3 className="text-lg font-semibold">Realtime delivery readiness</h3>
                  <div className="mt-4 grid gap-3 text-sm text-white/70">
                    <p className="rounded-lg border border-white/10 p-3">
                      Live delivery maps and rider locations activate once paid orders enter
                      dispatch.
                    </p>
                    <p className="rounded-lg border border-white/10 p-3">
                      Delayed, failed, and cancelled order counters are real database counts.
                    </p>
                    <p className="rounded-lg border border-white/10 p-3">
                      AI delivery optimisation will assign riders from actual distance, workload,
                      and availability data.
                    </p>
                  </div>
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
                  label="Payouts"
                  value="Ready"
                  note="Vendor and rider payout review lane."
                  icon={WalletCards}
                />
                <MetricCard
                  label="Settings"
                  value={authMode || "Local"}
                  note={`Browser push: ${pushPermission}`}
                  icon={Settings}
                />
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
                          {["PLACED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELED"].map(
                            (status) => (
                              <option key={status} value={status}>
                                {status.replaceAll("_", " ")}
                              </option>
                            ),
                          )}
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
