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

  const headers = useMemo(
    () => (adminKey.trim() ? { "x-admin-key": adminKey.trim() } : undefined),
    [adminKey]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/vendors?status=${status}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Failed to load applications.");
      setItems(json.items ?? []);
      setPendingCount(Number(json.pendingCount ?? 0));
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load applications."));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [headers, status]);

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
