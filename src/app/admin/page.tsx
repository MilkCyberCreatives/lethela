"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MainHeader from "@/components/MainHeader";
import { Button } from "@/components/ui/button";

type StatusFilter = "PENDING" | "ACTIVE" | "REJECTED" | "ALL";
type ActionType = "approve" | "reject";

type VendorApplication = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  suburb: string | null;
  city: string | null;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const STATUS_OPTIONS: StatusFilter[] = ["PENDING", "ACTIVE", "REJECTED", "ALL"];

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function AdminVendorsPage() {
  const [adminKey, setAdminKey] = useState("");
  const [status, setStatus] = useState<StatusFilter>("PENDING");
  const [items, setItems] = useState<VendorApplication[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [channels, setChannels] = useState<{
    email: { enabled: boolean; recipients: number };
    whatsapp: { enabled: boolean; recipients: number };
    push: { enabled: boolean };
  } | null>(null);
  const [pushPermission, setPushPermission] = useState<string>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );

  const headers = useMemo(
    () => (adminKey.trim() ? { "x-admin-key": adminKey.trim() } : undefined),
    [adminKey]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [vendorsResponse, notificationsResponse] = await Promise.all([
        fetch(`/api/admin/vendors?status=${status}`, {
          method: "GET",
          headers,
          cache: "no-store",
        }),
        fetch("/api/admin/notifications", {
          method: "GET",
          headers,
          cache: "no-store",
        }),
      ]);
      const [vendorsJson, notificationsJson] = await Promise.all([vendorsResponse.json(), notificationsResponse.json()]);
      if (!vendorsResponse.ok || !vendorsJson.ok) throw new Error(vendorsJson.error || "Failed to load applications.");
      if (!notificationsResponse.ok || !notificationsJson.ok) {
        throw new Error(notificationsJson.error || "Failed to load notification settings.");
      }
      setItems(vendorsJson.items ?? []);
      setPendingCount(Number(notificationsJson.pendingCount ?? vendorsJson.pendingCount ?? 0));
      setChannels(notificationsJson.channels ?? null);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load applications."));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [headers, status]);

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

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(vendorId: string, action: ActionType) {
    setSavingId(vendorId);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...(headers ?? {}),
        },
        body: JSON.stringify({ action }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Failed to update application.");
      setNotice(json.message || "Application updated.");
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to update application."));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />

      <section className="container max-w-5xl py-10">
        <h1 className="text-2xl font-bold text-white">Vendor Applications</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          Approve or reject incoming vendor applications. Approved vendors immediately gain dashboard and public
          profile access.
        </p>

        <div className="mt-6 grid gap-4 rounded-2xl border border-white/15 bg-white/5 p-5">
          <div className="grid gap-3 rounded-xl border border-white/10 bg-black/10 p-4 md:grid-cols-[1.3fr,0.7fr]">
            <div>
              <div className="text-sm font-semibold text-white">Where admin notifications go</div>
              <p className="mt-1 text-xs text-white/70">
                New vendor applications now raise an in-app admin alert, optional browser push, optional email, and
                optional WhatsApp notification when those channels are configured.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/75">
                <span className="rounded-full border border-white/15 px-3 py-1">
                  In-app alert: always on
                </span>
                <span className="rounded-full border border-white/15 px-3 py-1">
                  Browser push: {pushPermission}
                </span>
                <span className="rounded-full border border-white/15 px-3 py-1">
                  Email: {channels?.email.enabled ? `${channels.email.recipients} recipient(s)` : "not configured"}
                </span>
                <span className="rounded-full border border-white/15 px-3 py-1">
                  WhatsApp: {channels?.whatsapp.enabled ? `${channels.whatsapp.recipients} recipient(s)` : "not configured"}
                </span>
              </div>
            </div>
            <div className="flex flex-col justify-between gap-3">
              <div className="rounded-lg border border-white/10 px-3 py-3 text-xs text-white/70">
                Header alert badge links back here and updates in real time when Pusher is configured.
              </div>
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

          <div className="grid gap-3 md:grid-cols-[1fr,180px,auto] md:items-end">
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
              <label className="mb-1 block text-xs text-white/70">Filter</label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as StatusFilter)}
                className="w-full rounded bg-white px-3 py-2 text-sm text-black"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <Button
              className="bg-lethela-primary text-sm font-semibold text-white hover:opacity-90"
              disabled={loading}
              onClick={load}
            >
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </div>

          <div className="text-xs text-white/70">
            Pending applications: <span className="font-semibold text-white">{pendingCount}</span>
          </div>

          {notice ? (
            <div className="rounded border border-emerald-300/40 bg-emerald-300/10 px-3 py-2 text-xs text-emerald-100">
              {notice}
            </div>
          ) : null}
          {error ? (
            <div className="rounded border border-red-300/40 bg-red-300/10 px-3 py-2 text-xs text-red-100">{error}</div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4">
          {items.map((vendor) => (
            <article key={vendor.id} className="rounded-2xl border border-white/15 bg-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">{vendor.name}</h2>
                  <p className="text-xs text-white/70">/{vendor.slug}</p>
                  <p className="text-sm text-white/80">
                    {[vendor.suburb, vendor.city].filter(Boolean).join(", ") || "Location not set"}
                  </p>
                  <p className="text-xs text-white/70">
                    {vendor.email || "No email provided"}
                    {vendor.phone ? ` | ${vendor.phone}` : ""}
                  </p>
                </div>
                <div className="text-right text-xs text-white/70">
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

              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  className="bg-lethela-primary text-white hover:opacity-90"
                  disabled={savingId === vendor.id}
                  onClick={() => updateStatus(vendor.id, "approve")}
                >
                  {savingId === vendor.id ? "Saving..." : "Approve"}
                </Button>
                <Button
                  variant="outline"
                  className="border-red-300/50 bg-transparent text-red-100 hover:bg-red-200/10"
                  disabled={savingId === vendor.id}
                  onClick={() => updateStatus(vendor.id, "reject")}
                >
                  Reject
                </Button>
              </div>
            </article>
          ))}

          {!loading && items.length === 0 ? (
            <div className="rounded-2xl border border-white/15 bg-white/5 p-5 text-sm text-white/75">
              No applications for the selected filter.
            </div>
          ) : null}
        </div>

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
