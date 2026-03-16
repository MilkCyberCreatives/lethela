"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashCard from "./DashCard";

type NotificationItem = {
  id: string;
  tone: "warning" | "info" | "danger";
  title: string;
  body: string;
  href: string;
};

const toneClasses: Record<NotificationItem["tone"], string> = {
  info: "border-sky-200/20 bg-sky-300/10 text-sky-50",
  warning: "border-amber-200/20 bg-amber-300/10 text-amber-50",
  danger: "border-red-200/20 bg-red-300/10 text-red-50",
};

export default function NotificationsPanel() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/vendors/operations", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to load notifications.");
      }
      setItems(json.notifications || []);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <DashCard title="Notifications and Issues">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/70">
          This is the operational inbox for store blockers, missed settings, and urgent order signals.
        </p>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded border border-white/20 px-3 py-2 text-xs transition-colors hover:border-lethela-primary hover:text-lethela-primary disabled:opacity-60"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error ? <p className="mt-3 text-xs text-red-200">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {!loading && items.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/70">
            No active dashboard notifications right now.
          </div>
        ) : null}

        {items.map((item) => (
          <div key={item.id} className={`rounded-xl border px-4 py-4 ${toneClasses[item.tone]}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-3xl">
                <div className="text-sm font-semibold">{item.title}</div>
                <p className="mt-1 text-sm opacity-85">{item.body}</p>
              </div>
              <Link
                href={item.href}
                className="rounded-full border border-current/30 px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
              >
                Open
              </Link>
            </div>
          </div>
        ))}
      </div>
    </DashCard>
  );
}
