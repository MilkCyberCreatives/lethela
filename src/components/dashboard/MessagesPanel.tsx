"use client";

import { useEffect, useState } from "react";
import DashCard from "@/components/dashboard/DashCard";

type PlatformMessage = {
  id: string;
  subject: string;
  body: string;
  channel: string;
  createdAt: string;
};

export default function MessagesPanel() {
  const [items, setItems] = useState<PlatformMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/vendors/messages", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Failed to load messages.");
      setItems(json.items || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load messages.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <DashCard title="Messages from Lethela">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Owner updates, operational notices, and service instructions appear here.
        </p>
        <button
          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:border-lethela-primary hover:text-lethela-primary"
          type="button"
          onClick={load}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="grid animate-pulse gap-3">
          <div className="h-16 rounded-lg bg-slate-100" />
          <div className="h-16 rounded-lg bg-slate-100" />
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          No owner messages yet.
        </div>
      ) : null}

      <div className="grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{item.subject}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(item.createdAt).toLocaleString()} · {item.channel.replaceAll("_", " ")}
                </p>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {item.body}
            </p>
          </article>
        ))}
      </div>
    </DashCard>
  );
}
