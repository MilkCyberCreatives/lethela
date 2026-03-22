"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MainHeader from "@/components/MainHeader";
import { Button } from "@/components/ui/button";

type DashboardView = "vendors" | "riders";
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

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [view, setView] = useState<DashboardView>("vendors");
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
  const [pushPermission, setPushPermission] = useState<string>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );
  const adminKeyRef = useRef("");

  useEffect(() => {
    adminKeyRef.current = adminKey.trim();
  }, [adminKey]);

  const syncAdminAccess = useCallback(async () => {
    const normalizedKey = adminKeyRef.current;
    if (!normalizedKey) return;

    const response = await fetch("/api/admin/access", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ adminKey: normalizedKey }),
    });
    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error || "Failed to validate admin approval key.");
    }
    if (json.promoted && json.message) {
      setNotice(json.message);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await syncAdminAccess();

      const [vendorsResponse, ridersResponse, notificationsResponse] = await Promise.all([
        fetch(`/api/admin/vendors?status=${vendorStatus}`, {
          method: "GET",
          cache: "no-store",
        }),
        fetch(`/api/admin/riders?status=${riderStatus}`, {
          method: "GET",
          cache: "no-store",
        }),
        fetch("/api/admin/notifications", {
          method: "GET",
          cache: "no-store",
        }),
      ]);

      const [vendorsJson, ridersJson, notificationsJson] = await Promise.all([
        vendorsResponse.json(),
        ridersResponse.json(),
        notificationsResponse.json(),
      ]);

      if (!vendorsResponse.ok || !vendorsJson.ok) {
        throw new Error(vendorsJson.error || "Failed to load vendor approvals.");
      }
      if (!ridersResponse.ok || !ridersJson.ok) {
        throw new Error(ridersJson.error || "Failed to load rider approvals.");
      }
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
        headers: {
          "content-type": "application/json",
        },
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
        headers: {
          "content-type": "application/json",
        },
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

  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />

      <section className="container max-w-5xl py-10">
        <h1 className="text-2xl font-bold text-white">Approvals</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          Review vendor and rider applications, approve or reject them, and monitor where admin alerts are going.
        </p>

        <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-5">
          <div className="space-y-2 text-xs text-white/70">
            <p>
              Pending approvals: <span className="font-semibold text-white">{totalPendingApprovals}</span>
            </p>
            <p>
              Vendors pending: <span className="font-semibold text-white">{vendorCounts.pending}</span>
            </p>
            <p>
              Riders pending:{" "}
              <span className="font-semibold text-white">{riderCounts.pending + riderCounts.underReview}</span>
            </p>
            <p>
              Auth mode: <span className="font-semibold text-white">{authMode || "unknown"}</span>
            </p>
            <p>
              Browser push: <span className="font-semibold text-white">{pushPermission}</span>
            </p>
            <p>
              Email:{" "}
              <span className="font-semibold text-white">
                {channels?.email.enabled ? `${channels.email.recipients} recipient(s)` : "not configured"}
              </span>
            </p>
            <p>
              WhatsApp:{" "}
              <span className="font-semibold text-white">
                {channels?.whatsapp.enabled ? `${channels.whatsapp.recipients} recipient(s)` : "not configured"}
              </span>
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr,180px,180px,auto] md:items-end">
            <div>
              <label className="mb-1 block text-xs text-white/70">Admin key (optional)</label>
              <input
                className="w-full rounded bg-white px-3 py-2 text-sm text-black"
                value={adminKey}
                onChange={(event) => setAdminKey(event.target.value)}
                placeholder="Use if ADMIN_APPROVAL_KEY is set"
                type="password"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/70">View</label>
              <select
                value={view}
                onChange={(event) => setView(event.target.value as DashboardView)}
                className="w-full rounded bg-white px-3 py-2 text-sm text-black"
              >
                <option value="vendors">Vendors</option>
                <option value="riders">Riders</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/70">Filter</label>
              {view === "vendors" ? (
                <select
                  value={vendorStatus}
                  onChange={(event) => setVendorStatus(event.target.value as VendorStatusFilter)}
                  className="w-full rounded bg-white px-3 py-2 text-sm text-black"
                >
                  {VENDOR_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={riderStatus}
                  onChange={(event) => setRiderStatus(event.target.value as RiderStatusFilter)}
                  className="w-full rounded bg-white px-3 py-2 text-sm text-black"
                >
                  {RIDER_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button className="bg-lethela-primary text-white hover:opacity-90" disabled={loading} onClick={load}>
                {loading ? "Loading..." : "Refresh"}
              </Button>
              <Button
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:border-lethela-primary hover:text-lethela-primary"
                onClick={enableBrowserAlerts}
                disabled={pushPermission === "granted"}
              >
                {pushPermission === "granted" ? "Browser alerts enabled" : "Enable browser alerts"}
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-xs text-white/70">Search</label>
            <input
              className="w-full rounded bg-white px-3 py-2 text-sm text-black"
              value={view === "vendors" ? vendorSearch : riderSearch}
              onChange={(event) =>
                view === "vendors" ? setVendorSearch(event.target.value) : setRiderSearch(event.target.value)
              }
              placeholder={
                view === "vendors"
                  ? "Search vendors by name, slug, email, or area"
                  : "Search riders by name, phone, vehicle, or area"
              }
            />
          </div>

          {notice ? (
            <div className="mt-4 rounded border border-emerald-300/40 bg-emerald-300/10 px-3 py-2 text-xs text-emerald-100">
              {notice}
            </div>
          ) : null}
          {error ? (
            <div className="mt-4 rounded border border-red-300/40 bg-red-300/10 px-3 py-2 text-xs text-red-100">
              {error}
            </div>
          ) : null}
        </div>

        {view === "vendors" ? (
          <div className="mt-6 grid gap-4">
            {filteredVendors.map((vendor) => {
              const saving = savingKey === `vendor:${vendor.id}`;
              const location = [vendor.address, vendor.suburb, vendor.city, vendor.province].filter(Boolean).join(", ");
              const cuisines = parseCuisine(vendor.cuisine);

              return (
                <article key={vendor.id} className="rounded-2xl border border-white/15 bg-white/5 p-5">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold">{vendor.name}</h2>
                        <p className="text-xs text-white/70">/{vendor.slug}</p>
                      </div>
                      <div className="text-left text-xs text-white/70 md:text-right">
                        <div>
                          Status:{" "}
                          <span className="font-semibold text-white">
                            {vendor.status} {vendor.isActive ? "(Live)" : "(Not live)"}
                          </span>
                        </div>
                        <div className="mt-1">Applied: {formatDate(vendor.createdAt)}</div>
                        <div>Updated: {formatDate(vendor.updatedAt)}</div>
                      </div>
                    </div>
                    <p className="text-sm text-white/80">{location || "Location not set"}</p>
                    <p className="text-xs text-white/70">
                      {vendor.email || "No email provided"}
                      {vendor.phone ? ` | ${vendor.phone}` : ""}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-2 text-xs text-white/70 md:grid-cols-2">
                    <div>Delivery fee: R {(vendor.deliveryFee / 100).toFixed(2)}</div>
                    <div>Owner linked: {vendor.ownerId ? "Yes" : "No"}</div>
                    <div>KYC ID: {vendor.kycIdUrl ? "Provided" : "Missing"}</div>
                    <div>Proof of address: {vendor.kycProofUrl ? "Provided" : "Missing"}</div>
                    <div>Halaal: {vendor.halaal ? "Yes" : "No"}</div>
                    <div>{cuisines.length > 0 ? `Cuisine: ${cuisines.join(", ")}` : "Cuisine: Not set"}</div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      className="bg-lethela-primary text-white hover:opacity-90"
                      disabled={saving}
                      onClick={() => updateVendorStatus(vendor.id, "approve")}
                    >
                      {saving ? "Saving..." : "Approve"}
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
                        Open ID document
                      </a>
                    ) : null}
                    {vendor.kycProofUrl ? (
                      <a href={vendor.kycProofUrl} target="_blank" rel="noreferrer" className="text-sm underline">
                        Open proof of address
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}

            {!loading && filteredVendors.length === 0 ? (
              <div className="rounded-2xl border border-white/15 bg-white/5 p-5 text-sm text-white/75">
                No vendor applications for the selected filter.
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {filteredRiders.map((rider) => (
              <article key={rider.id} className="rounded-2xl border border-white/15 bg-white/5 p-5">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">{rider.fullName}</h2>
                      <p className="text-sm text-white/80">
                        {[rider.suburb, rider.city].filter(Boolean).join(", ") || "Location not set"}
                      </p>
                      <p className="text-xs text-white/70">
                        {rider.email} | {rider.phone}
                      </p>
                    </div>
                    <div className="text-left text-xs text-white/70 md:text-right">
                      <div>
                        Status: <span className="font-semibold text-white">{rider.status.replaceAll("_", " ")}</span>
                      </div>
                      <div className="mt-1">Applied: {formatDate(rider.createdAt)}</div>
                      <div>Updated: {formatDate(rider.updatedAt)}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-xs text-white/70 md:grid-cols-2">
                  <div>Vehicle: {rider.vehicleType}{rider.vehicleRegistration ? ` (${rider.vehicleRegistration})` : ""}</div>
                  <div>Licence: {rider.licenseCode}</div>
                  <div>Available hours: {rider.availableHours}</div>
                  <div>ID ending: {rider.idNumberLast4}</div>
                  <div>Emergency contact: {rider.emergencyContactName} ({rider.emergencyContactPhone})</div>
                  <div>
                    Smartphone: {rider.hasSmartphone ? "Yes" : "No"} | Bank account: {rider.hasBankAccount ? "Yes" : "No"}
                  </div>
                </div>

                {rider.experience ? (
                  <p className="mt-4 text-sm text-white/75">Experience: {rider.experience}</p>
                ) : null}
                {rider.aiSummary ? (
                  <div className="mt-4 rounded-lg border border-white/10 px-3 py-3 text-sm text-white/75">
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
              <div className="rounded-2xl border border-white/15 bg-white/5 p-5 text-sm text-white/75">
                No rider applications for the selected filter.
              </div>
            ) : null}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-4 text-xs text-white/70">
          <p>
            If you need API-level protection in production, set <code>ADMIN_APPROVAL_KEY</code> in your environment
            and use it in the field above.
          </p>
          <p className="mt-2">
            In development without an admin key, this page allows local approval to speed up testing.
          </p>
        </div>
      </section>
    </main>
  );
}
