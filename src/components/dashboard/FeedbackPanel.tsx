"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  RefreshCw,
  Star,
  TriangleAlert,
  UtensilsCrossed,
} from "lucide-react";
import { EmptyState, Notice, Panel, StatTile, dashButton } from "@/components/dashboard/kit/ui";
import { cn } from "@/lib/utils";

type ExperiencePayload = {
  rating: number;
  orderCount30: number;
  onTimeRate: number;
  paymentSuccessRate: number;
  menuReadinessPct: number;
  publicReadiness: boolean;
  highlights: string[];
  concerns: string[];
};

export default function FeedbackPanel() {
  const [experience, setExperience] = useState<ExperiencePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/vendors/operations", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to load customer experience.");
      }
      setExperience(json.experience);
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load customer experience.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // The first load shows placeholders; a refresh keeps the last numbers on screen.
  const firstLoad = loading && !experience;
  const show = (value: string) => (firstLoad ? "…" : value);
  const orders = experience?.orderCount30 ?? 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Last 30 days</p>
        <button type="button" onClick={load} disabled={loading} className={dashButton.secondary}>
          <RefreshCw aria-hidden="true" className={loading ? "animate-spin" : undefined} />
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      {experience || loading ? (
        <>
          <div
            className={cn(
              "grid grid-cols-2 gap-3 transition-opacity lg:grid-cols-4 lg:gap-4",
              loading && !firstLoad ? "opacity-60" : "",
            )}
            aria-busy={loading}
          >
            <StatTile
              label="Rating"
              value={show(experience?.rating.toFixed(1) ?? "0.0")}
              hint="Out of 5 stars"
              icon={<Star />}
            />
            <StatTile
              label="On time"
              value={show(`${experience?.onTimeRate ?? 0}%`)}
              hint={
                orders === 0 ? "No orders yet" : `Of ${orders} ${orders === 1 ? "order" : "orders"}`
              }
              icon={<Clock />}
            />
            <StatTile
              label="Payments"
              value={show(`${experience?.paymentSuccessRate ?? 0}%`)}
              hint="Went through"
              icon={<CreditCard />}
            />
            <StatTile
              label="Store set-up"
              value={show(`${experience?.menuReadinessPct ?? 0}%`)}
              hint="Menu, hours and address"
              icon={<UtensilsCrossed />}
            />
          </div>
        </>
      ) : null}

      {experience || loading ? (
        <div
          className={cn(
            "grid items-start gap-4 transition-opacity lg:grid-cols-2",
            loading && !firstLoad ? "opacity-60" : "",
          )}
        >
          <FeedbackList
            title="Needs attention"
            items={experience?.concerns ?? []}
            loading={firstLoad}
            tone="warning"
            emptyTitle="Nothing to fix"
            emptyText="No problems are showing right now."
          />
          <FeedbackList
            title="Going well"
            items={experience?.highlights ?? []}
            loading={firstLoad}
            tone="success"
            emptyTitle="Nothing yet"
            emptyText="Good news shows here as you get more orders."
          />
        </div>
      ) : null}
    </div>
  );
}

function FeedbackList({
  title,
  items,
  loading,
  tone,
  emptyTitle,
  emptyText,
}: {
  title: string;
  items: string[];
  loading: boolean;
  tone: "success" | "warning";
  emptyTitle: string;
  emptyText: string;
}) {
  return (
    <Panel title={title} padded={loading || items.length === 0}>
      {loading ? (
        <div className="grid animate-pulse gap-2" aria-hidden="true">
          <div className="h-5 rounded bg-slate-100" />
          <div className="h-5 rounded bg-slate-100" />
        </div>
      ) : items.length > 0 ? (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 px-4 py-3 text-sm leading-6 text-slate-700 sm:px-5"
            >
              {tone === "success" ? (
                <CheckCircle2
                  className="mt-1 h-4 w-4 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
              ) : (
                <TriangleAlert
                  className="mt-1 h-4 w-4 shrink-0 text-amber-600"
                  aria-hidden="true"
                />
              )}
              <span className="min-w-0">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState compact title={emptyTitle} text={emptyText} />
      )}
    </Panel>
  );
}
