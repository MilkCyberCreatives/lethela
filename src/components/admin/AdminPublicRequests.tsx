"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, Phone, RefreshCw } from "lucide-react";
import { dashButton, EmptyState, Notice, Panel, StatusBadge } from "@/components/dashboard/kit/ui";
import { KASI_REQUEST_ROLE_LABELS, type KasiRequestRole } from "@/lib/kasi-requests";

type PublicMessage = {
  id: string;
  recipientType: string;
  subject: string;
  body: string;
  createdAt: string;
};

type Details = Record<string, string | undefined>;

function parseDetails(body: string): Details {
  try {
    const value = JSON.parse(body);
    return value && typeof value === "object" ? (value as Details) : {};
  } catch {
    return { description: body };
  }
}

function whatsAppLink(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `27${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

function ContactLinks({ phone }: { phone?: string }) {
  if (!phone) return null;
  return (
    <span className="flex flex-wrap gap-3">
      <a href={`tel:${phone.replace(/\s+/g, "")}`} className={dashButton.link}>
        <Phone aria-hidden="true" /> {phone}
      </a>
      <a href={whatsAppLink(phone)} target="_blank" rel="noreferrer" className={dashButton.link}>
        <MessageCircle aria-hidden="true" /> WhatsApp
      </a>
    </span>
  );
}

// Support cases and "Bring Lethela to my kasi" requests from the public site, so admins see
// them even when no admin email address is set up.
export default function AdminPublicRequests() {
  const [items, setItems] = useState<PublicMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/messages?kind=public&take=100", {
        cache: "no-store",
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok) throw new Error(json.error || "Could not load requests.");
      setItems(json.items ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const support = useMemo(
    () => (items ?? []).filter((item) => item.recipientType === "SUPPORT_CASE"),
    [items],
  );
  const kasi = useMemo(
    () => (items ?? []).filter((item) => item.recipientType === "KASI_REQUEST"),
    [items],
  );
  const townships = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const item of kasi) {
      const name = parseDetails(item.body).township?.trim() || "Unknown";
      const key = name.toLowerCase();
      const current = counts.get(key);
      counts.set(key, { name: current?.name ?? name, count: (current?.count ?? 0) + 1 });
    }
    return [...counts.values()].sort((a, b) => b.count - a.count);
  }, [kasi]);

  const refresh = (
    <button
      type="button"
      className={dashButton.quiet}
      onClick={() => void load()}
      disabled={loading}
    >
      <RefreshCw aria-hidden="true" /> {loading ? "Loading…" : "Refresh"}
    </button>
  );

  return (
    <section className="mb-4 grid gap-4 xl:grid-cols-2" aria-label="Requests from the public">
      {error ? (
        <div className="xl:col-span-2">
          <Notice tone="danger">{error}</Notice>
        </div>
      ) : null}

      <Panel
        title="Support requests"
        description="Sent from the Contact page. Newest first."
        action={refresh}
        padded={false}
      >
        {support.length === 0 ? (
          <EmptyState
            compact
            title={items ? "No support requests" : "Loading…"}
            text="Requests from the Contact page show here."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {support.map((item) => {
              const details = parseDetails(item.body);
              return (
                <li key={item.id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {details.name || "Unknown"} ·{" "}
                        {details.issueType
                          ? details.issueType.replaceAll("_", " ").toLowerCase()
                          : item.subject}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {details.caseId ? `${details.caseId} · ` : ""}
                        {new Date(item.createdAt).toLocaleString()}
                        {details.orderRef ? ` · Order ${details.orderRef}` : ""}
                        {details.preferredContact
                          ? ` · Prefers ${details.preferredContact.toLowerCase()}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  {details.description ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {details.description}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    <ContactLinks phone={details.phone} />
                    {details.email ? (
                      <a href={`mailto:${details.email}`} className={dashButton.link}>
                        {details.email}
                      </a>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel
        title="Where people want Lethela"
        description="From the “Want Lethela in your kasi?” form on the website."
        padded={false}
      >
        {kasi.length === 0 ? (
          <EmptyState
            compact
            title={items ? "No requests yet" : "Loading…"}
            text="When people ask for Lethela in their township, they show here."
          />
        ) : (
          <>
            <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
              {townships.map((township) => (
                <StatusBadge key={township.name} tone="info" dot={false}>
                  {township.name}: {township.count}
                </StatusBadge>
              ))}
            </div>
            <ul className="divide-y divide-slate-100">
              {kasi.map((item) => {
                const details = parseDetails(item.body);
                const role =
                  KASI_REQUEST_ROLE_LABELS[details.role as KasiRequestRole] || details.role;
                return (
                  <li key={item.id} className="px-4 py-3.5 sm:px-5">
                    <p className="font-semibold text-slate-900">
                      {details.name || "Unknown"} · {details.township || "Unknown"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Wants to {String(role || "order").toLowerCase()} ·{" "}
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                    <div className="mt-1.5 text-sm">
                      <ContactLinks phone={details.phone} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Panel>
    </section>
  );
}
