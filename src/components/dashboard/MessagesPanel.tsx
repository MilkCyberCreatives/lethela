"use client";

import { useEffect, useState } from "react";
import { MessageSquare, RefreshCw } from "lucide-react";
import { EmptyState, Notice, Panel, dashButton, statusText } from "@/components/dashboard/kit/ui";
import { cn } from "@/lib/utils";

type PlatformMessage = {
  id: string;
  subject: string;
  body: string;
  channel: string;
  createdAt: string;
};

const CHANNEL_NAMES: Record<string, string> = {
  DASHBOARD: "Dashboard",
  EMAIL_WHATSAPP: "Email and WhatsApp",
  ALL: "Dashboard, email and WhatsApp",
};

function channelName(channel: string) {
  return CHANNEL_NAMES[channel] ?? statusText(channel.replaceAll("_", " "));
}

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

  const firstLoad = loading && items.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {firstLoad
            ? "Loading messages…"
            : items.length > 0
              ? `${items.length} ${items.length === 1 ? "message" : "messages"}`
              : "From the Lethela team"}
        </p>
        <button className={dashButton.secondary} type="button" onClick={load}>
          <RefreshCw aria-hidden="true" className={loading ? "animate-spin" : undefined} />
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      {firstLoad ? (
        <Panel>
          <div className="grid animate-pulse gap-3" aria-hidden="true">
            <div className="h-16 rounded-lg bg-slate-100" />
            <div className="h-16 rounded-lg bg-slate-100" />
          </div>
        </Panel>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <Panel>
          <EmptyState
            compact
            icon={<MessageSquare />}
            title="No messages yet"
            text="Messages from the Lethela team show here."
          />
        </Panel>
      ) : null}

      {items.length > 0 ? (
        <Panel padded={false} className={cn("transition-opacity", loading ? "opacity-60" : "")}>
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <article key={item.id} className="px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <h3 className="min-w-0 text-sm font-semibold text-slate-900">{item.subject}</h3>
                  <p className="shrink-0 text-xs text-slate-500">
                    {new Date(item.createdAt).toLocaleString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {channelName(item.channel)}
                  </p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
