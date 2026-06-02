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

type DashboardView = "overview" | "vendors" | "riders" | "users" | "orders" | "operations";
type VendorStatusFilter = "PENDING" | "ACTIVE" | "REJECTED" | "ALL";
type RiderStatusFilter = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "ALL";
type VendorActionType = "approve" | "reject";
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
  pending: number;
  active: number;
  rejected: number;
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

const VENDOR_STATUS_OPTIONS: VendorStatusFilter[] = ["PENDING", "ACTIVE", "REJECTED", "ALL"];
const RIDER_STATUS_OPTIONS: RiderStatusFilter[] = ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "ALL"];

const WORKSPACES: Array<{ id: DashboardView; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Owner overview", icon: LayoutDashboard },
  { id: "vendors", label: "Vendors", icon: Store },
  { id: "riders", label: "Riders", icon: Bike },
  { id: "users", label: "Users", icon: Users },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "operations", label: "Operations", icon: Activity },
];

const ORDER_PIPELINE = [
  { label: "Accepted", value: 24, color: "bg-emerald-300" },
  { label: "Preparing", value: 17, color: "bg-amber-300" },
  { label: "Dispatch", value: 12, color: "bg-sky-300" },
  { label: "Issue queue", value: 3, color: "bg-lethela-primary" },
];

const USER_SIGNALS = [
  { label: "Repeat customers", value: "68%", note: "Target cohorts for loyalty drops" },
  { label: "Support SLA", value: "12m", note: "Median first response" },
  { label: "Saved addresses", value: "1.9k", note: "Ready for checkout speedups" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function parseCuisine(value: string) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function matchesSearch(query: string, values: Array<string | null | undefined>) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return values.some((value) => String(value || "").toLowerCase().includes(normalized));
}

function statusClass(status: string) {
  if (["ACTIVE", "APPROVED"].includes(status)) return "border-emerald-300/30 bg-emerald-300/10 text-emerald-100";
  if (["REJECTED"].includes(status)) return "border-red-300/30 bg-red-300/10 text-red-100";
  if (["UNDER_REVIEW"].includes(status)) return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  return "border-white/15 bg-white/5 text-white/80";
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: typeof LayoutDashboard;
}) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-white/55">{label}</p>
          <p className="mt-2 text-2xl font-bold text-white">{value}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-lethela-primary/15 text-lethela-primary">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-xs text-white/60">{note}</p>
    </article>
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
  const [vendorStatus, setVendorStatus] = useState<VendorStatusFilter>("PENDING");
  const [riderStatus, setRiderStatus] = useState<RiderStatusFilter>("PENDING");
  const [vendorSearch, setVendorSearch] = useState("");
  const [riderSearch, setRiderSearch] = useState("");
  const [vendors, setVendors] = useState<VendorApplication[]>([]);
  const [vendorCounts, setVendorCounts] = useState<VendorCounts>({ pending: 0, active: 0, rejected: 0, total: 0 });
  const [riders, setRiders] = useState<RiderApplication[]>([]);
  const [riderCounts, setRiderCounts] = useState<RiderCounts>({
    pending: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });
  const [channels, setChannels] = useState<NotificationChannels | null>(null);
  const [totalPendingApprovals, setTotalPendingApprovals] = useState(0);
  const [authMode, setAuthMode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pushPermission, setPushPermission] = useState<string>("unsupported");
  const adminKeyRef = useRef("");

  useEffect(() => {
    setPushPermission(typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported");
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
    if (!response.ok || !json.ok) throw new Error(json.error || "Failed to validate admin approval key.");
    if (json.promoted && json.message) setNotice(json.message);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await syncAdminAccess();

      const [vendorsResponse, ridersResponse, notificationsResponse] = await Promise.all([
        fetch(`/api/admin/vendors?status=${vendorStatus}`, { method: "GET", cache: "no-store" }),
        fetch(`/api/admin/riders?status=${riderStatus}`, { method: "GET", cache: "no-store" }),
        fetch("/api/admin/notifications", { method: "GET", cache: "no-store" }),
      ]);

      const [vendorsJson, ridersJson, notificationsJson] = await Promise.all([
        vendorsResponse.json(),
        ridersResponse.json(),
        notificationsResponse.json(),
      ]);

      if (!vendorsResponse.ok || !vendorsJson.ok) throw new Error(vendorsJson.error || "Failed to load vendor approvals.");
      if (!ridersResponse.ok || !ridersJson.ok) throw new Error(ridersJson.error || "Failed to load rider approvals.");
      if (!notificationsResponse.ok || !notificationsJson.ok) {
        throw new Error(notificationsJson.error || "Failed to load notification settings.");
      }

      setVendors(vendorsJson.items ?? []);
      setVendorCounts(
        vendorsJson.counts ?? {
          pending: Number(vendorsJson.pendingCount ?? 0),
          active: 0,
          rejected: 0,
          total: Number((vendorsJson.items ?? []).length),
        }
      );
      setRiders(ridersJson.items ?? []);
      setRiderCounts(
        ridersJson.counts ?? {
          pending: 0,
          underReview: 0,
          approved: 0,
          rejected: 0,
          total: Number((ridersJson.items ?? []).length),
        }
      );
      setChannels(notificationsJson.channels ?? null);
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
        : "Browser push notifications were not enabled."
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
      if (!response.ok || !json.ok) throw new Error(json.error || "Failed to update vendor application.");
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
      if (!response.ok || !json.ok) throw new Error(json.error || "Failed to update rider application.");
      setNotice(`Rider moved to ${status.replaceAll("_", " ").toLowerCase()}.`);
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to update rider application."));
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
        ])
      ),
    [vendorSearch, vendors]
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
        ])
      ),
    [riderSearch, riders]
  );

  const activeRiders = riderCounts.approved;
  const totalRiderQueue = riderCounts.pending + riderCounts.underReview;
  const activeVendorRatio = vendorCounts.total ? Math.round((vendorCounts.active / vendorCounts.total) * 100) : 0;

  const metrics = [
    {
      label: "Pending approvals",
      value: totalPendingApprovals,
      note: "Vendor and rider onboarding work waiting for the owner.",
      icon: Clock,
    },
    {
      label: "Live vendors",
      value: vendorCounts.active,
      note: `${activeVendorRatio}% of vendor applications are live.`,
      icon: Store,
    },
    {
      label: "Rider bench",
      value: activeRiders,
      note: `${totalRiderQueue} rider application(s) still need review.`,
      icon: Bike,
    },
    {
      label: "Alert health",
      value: channels?.email.enabled || channels?.whatsapp.enabled || channels?.push.enabled ? "On" : "Setup",
      note: "Email, WhatsApp and browser alert coverage for admin events.",
      icon: Bell,
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
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">Quick links</p>
              <div className="mt-3 grid gap-2 text-sm">
                <Link className="text-white/75 hover:text-white" href="/vendors/dashboard">
                  Vendor dashboard
                </Link>
                <Link className="text-white/75 hover:text-white" href="/rider/dashboard">
                  Rider dashboard
                </Link>
                <Link className="text-white/75 hover:text-white" href="/orders/LET-12345">
                  Example order
                </Link>
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-5">
            <section className="rounded-lg border border-white/10 bg-[#0C1132] p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-lethela-primary">Operations command</p>
                  <h2 className="mt-2 text-2xl font-bold md:text-3xl">Owner dashboard</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/68">
                    Sego gave us the food-admin structure: KPIs, order queues, profile modules, calendar, messages and
                    product controls. This version keeps Lethela styling and connects those ideas to admin, vendors,
                    customers and riders.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button className="bg-lethela-primary text-white hover:opacity-90" disabled={loading} onClick={load}>
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

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => (
                  <MetricCard key={metric.label} {...metric} />
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
                    onChange={(event) => setVendorStatus(event.target.value as VendorStatusFilter)}
                    className="h-10 w-full rounded-lg border border-white/10 bg-white px-3 text-sm text-black"
                  >
                    {VENDOR_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
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
              <section className="grid gap-5 xl:grid-cols-[1.15fr,0.85fr]">
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-white/50">Order pulse</p>
                      <h3 className="mt-1 text-lg font-semibold">Live queue overview</h3>
                    </div>
                    <LineChart className="h-5 w-5 text-lethela-primary" />
                  </div>
                  <div className="mt-5 space-y-4">
                    {ORDER_PIPELINE.map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/70">{item.label}</span>
                          <span className="font-semibold">{item.value}</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-white/10">
                          <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${Math.min(item.value * 3, 100)}%` }} />
                        </div>
                      </div>
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
                      "Clear pending vendor KYC approvals",
                      "Move rider applications from pending to review",
                      "Check delayed order exceptions",
                      "Confirm Laravel dashboard migration milestones",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                        <CheckCircle2 className="h-4 w-4 text-lethela-primary" />
                        <span className="text-sm text-white/75">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
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
                  const location = [vendor.address, vendor.suburb, vendor.city, vendor.province].filter(Boolean).join(", ");
                  const cuisines = parseCuisine(vendor.cuisine);

                  return (
                    <article key={vendor.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold">{vendor.name}</h3>
                          <p className="text-xs text-white/60">/{vendor.slug}</p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs ${statusClass(vendor.status)}`}>
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
                        <div>KYC: {vendor.kycIdUrl && vendor.kycProofUrl ? "Complete" : "Needs documents"}</div>
                        <div>Halaal: {vendor.halaal ? "Yes" : "No"}</div>
                        <div>{cuisines.length > 0 ? `Cuisine: ${cuisines.join(", ")}` : "Cuisine: Not set"}</div>
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
                          className="border-red-300/50 bg-transparent text-red-100 hover:bg-red-200/10"
                          disabled={saving}
                          onClick={() => updateVendorStatus(vendor.id, "reject")}
                        >
                          Reject
                        </Button>
                        {vendor.kycIdUrl ? (
                          <a href={vendor.kycIdUrl} target="_blank" rel="noreferrer" className="text-sm underline">
                            ID document
                          </a>
                        ) : null}
                        {vendor.kycProofUrl ? (
                          <a href={vendor.kycProofUrl} target="_blank" rel="noreferrer" className="text-sm underline">
                            Proof of address
                          </a>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
                {!loading && filteredVendors.length === 0 ? (
                  <EmptyState title="No vendors found" text="There are no vendor applications for this filter yet." />
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
                  <MetricCard label="Pending" value={riderCounts.pending} note="New rider applications." icon={Clock} />
                  <MetricCard label="Review" value={riderCounts.underReview} note="Documents being checked." icon={PackageCheck} />
                  <MetricCard label="Approved" value={riderCounts.approved} note="Riders ready for shifts." icon={Bike} />
                </div>
                {filteredRiders.map((rider) => (
                  <article key={rider.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">{rider.fullName}</h3>
                        <p className="text-sm text-white/78">
                          {[rider.suburb, rider.city].filter(Boolean).join(", ") || "Location not set"}
                        </p>
                        <p className="text-xs text-white/60">
                          {rider.email} | {rider.phone}
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs ${statusClass(rider.status)}`}>
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
                        Smartphone: {rider.hasSmartphone ? "Yes" : "No"} | Bank: {rider.hasBankAccount ? "Yes" : "No"}
                      </div>
                    </div>
                    {rider.aiSummary ? (
                      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white/75">
                        {rider.aiSummary}
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-3">
                      {(["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"] as RiderApplicationStatus[]).map((status) => (
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
                          {savingKey === `rider:${rider.id}:${status}` ? "Saving..." : status.replaceAll("_", " ")}
                        </Button>
                      ))}
                    </div>
                  </article>
                ))}
                {!loading && filteredRiders.length === 0 ? (
                  <EmptyState title="No riders found" text="There are no rider applications for this filter yet." />
                ) : null}
              </section>
            ) : null}

            {view === "users" ? (
              <section className="grid gap-4 md:grid-cols-3">
                {USER_SIGNALS.map((signal) => (
                  <MetricCard key={signal.label} label={signal.label} value={signal.value} note={signal.note} icon={Users} />
                ))}
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5 md:col-span-3">
                  <h3 className="text-lg font-semibold">Customer workspace</h3>
                  <p className="mt-2 text-sm text-white/65">
                    This area is ready for customer profiles, loyalty segments, support inboxes, refund decisions and saved
                    delivery addresses once those APIs are connected.
                  </p>
                </div>
              </section>
            ) : null}

            {view === "orders" ? (
              <section className="grid gap-4 lg:grid-cols-[1fr,0.8fr]">
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                  <h3 className="text-lg font-semibold">Order control room</h3>
                  <div className="mt-4 grid gap-3">
                    {ORDER_PIPELINE.map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] p-3">
                        <span className="text-sm text-white/75">{item.label}</span>
                        <span className="text-lg font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                  <h3 className="text-lg font-semibold">Dispatch features</h3>
                  <div className="mt-4 grid gap-3 text-sm text-white/70">
                    <p className="rounded-lg border border-white/10 p-3">Assign orders to approved riders by area.</p>
                    <p className="rounded-lg border border-white/10 p-3">Flag delayed vendor preparation times.</p>
                    <p className="rounded-lg border border-white/10 p-3">Escalate refunds and customer support items.</p>
                  </div>
                </div>
              </section>
            ) : null}

            {view === "operations" ? (
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Email" value={channels?.email.enabled ? channels.email.recipients : "Off"} note="Admin recipient coverage." icon={Mail} />
                <MetricCard label="WhatsApp" value={channels?.whatsapp.enabled ? channels.whatsapp.recipients : "Off"} note="Operations escalation channel." icon={Bell} />
                <MetricCard label="Payouts" value="Ready" note="Vendor and rider payout review lane." icon={WalletCards} />
                <MetricCard label="Settings" value={authMode || "Local"} note={`Browser push: ${pushPermission}`} icon={Settings} />
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5 md:col-span-2 xl:col-span-4">
                  <h3 className="text-lg font-semibold">Laravel backend dashboard direction</h3>
                  <p className="mt-2 text-sm text-white/65">
                    The Laravel starter files added with this work map this dashboard into Blade layouts, routes and
                    role-based controllers so future backend dashboard projects can move to Laravel cleanly.
                  </p>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </section>
    </main>
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
      <label className="mb-2 block text-xs uppercase tracking-[0.14em] text-white/50">{label}</label>
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
