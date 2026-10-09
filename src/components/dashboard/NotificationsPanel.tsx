"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Info,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { EmptyState, Notice, Panel, dashButton } from "@/components/dashboard/kit/ui";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  tone: "warning" | "info" | "danger";
  title: string;
  body: string;
  href: string;
};

const toneStyles: Record<NotificationItem["tone"], { icon: ReactNode; className: string }> = {
  danger: { icon: <CircleAlert />, className: "bg-red-50 text-red-600" },
  warning: { icon: <TriangleAlert />, className: "bg-amber-50 text-amber-600" },
  info: { icon: <Info />, className: "bg-sky-50 text-sky-700" },
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

  const firstLoad = loading && items.length === 0;
  const summary = firstLoad
    ? "Checking your store…"
    : items.length === 0
      ? error
        ? ""
        : "Nothing to check"
      : `${items.length} ${items.length === 1 ? "thing" : "things"} to check`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{summary}</p>
        <button type="button" onClick={load} disabled={loading} className={dashButton.secondary}>
          <RefreshCw aria-hidden="true" className={loading ? "animate-spin" : undefined} />
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      {firstLoad ? (
        <Panel padded={false}>
          <div className="divide-y divide-slate-100" aria-hidden="true">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex animate-pulse items-start gap-3 px-4 py-4 sm:px-5">
                <div className="h-8 w-8 shrink-0 rounded-lg bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 rounded bg-slate-100" />
                  <div className="h-3 w-3/4 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <Panel>
          <EmptyState
            compact
            icon={<CheckCircle2 />}
            title="All caught up"
            text="Nothing needs your attention right now."
          />
        </Panel>
      ) : null}

      {items.length > 0 ? (
        <Panel
          padded={false}
          className={cn("overflow-hidden transition-opacity", loading ? "opacity-60" : "")}
        >
          <ul className="divide-y divide-slate-100">
            {items.map((item) => {
              const tone = toneStyles[item.tone] ?? toneStyles.info;
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 sm:px-5"
                  >
                    <span
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-lg [&_svg]:h-4 [&_svg]:w-4",
                        tone.className,
                      )}
                      aria-hidden="true"
                    >
                      {tone.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-sm leading-5 text-slate-500">
                        {item.body}
                      </span>
                    </span>
                    <span className="mt-1.5 flex shrink-0 items-center gap-1 text-sm font-semibold text-slate-500">
                      <span className="hidden sm:inline">Open</span>
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
