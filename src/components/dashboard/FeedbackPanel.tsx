"use client";

import { useEffect, useState } from "react";
import DashCard from "./DashCard";

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
      setError(loadError instanceof Error ? loadError.message : "Failed to load customer experience.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="grid gap-4">
      <DashCard title="Customer Experience">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-white/70">
            Ratings and feedback signals based on live store performance and customer-facing readiness.
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
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Store rating" value={loading ? "..." : `${experience?.rating.toFixed(1) ?? "0.0"} / 5`} />
          <StatCard label="Orders (30d)" value={loading ? "..." : String(experience?.orderCount30 ?? 0)} />
          <StatCard label="On-time signal" value={loading ? "..." : `${experience?.onTimeRate ?? 0}%`} />
          <StatCard label="Payment success" value={loading ? "..." : `${experience?.paymentSuccessRate ?? 0}%`} />
          <StatCard label="Menu readiness" value={loading ? "..." : `${experience?.menuReadinessPct ?? 0}%`} />
        </div>
      </DashCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <DashCard title="What is going well">
          <div className="space-y-3">
            {(experience?.highlights || []).map((item) => (
              <div key={item} className="rounded-xl border border-emerald-200/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-50">
                {item}
              </div>
            ))}
            {!loading && experience && experience.highlights.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/70">
                Customer positives will appear here as the store builds operating history.
              </div>
            ) : null}
          </div>
        </DashCard>

        <DashCard title="Needs attention">
          <div className="space-y-3">
            {(experience?.concerns || []).map((item) => (
              <div key={item} className="rounded-xl border border-amber-200/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">
                {item}
              </div>
            ))}
            {!loading && experience && experience.concerns.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/70">
                No customer-experience concerns are being flagged right now.
              </div>
            ) : null}
          </div>
        </DashCard>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
      <div className="text-xs uppercase tracking-[0.12em] text-white/55">{label}</div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}
