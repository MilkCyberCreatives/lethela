"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

type Props = {
  operationsCount?: number;
  onOpenOperations?: () => void;
};

function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell({ operationsCount = 0, onOpenOperations }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const json = await response.json();
      if (json?.ok) {
        setItems(Array.isArray(json.notifications) ? json.notifications : []);
        setUnread(Number(json.unreadCount) || 0);
      }
    } catch {
      // Non-blocking: the bell simply stays as-is on a failed poll.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markRead = useCallback(async (body: { id?: string; all?: boolean }) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) return;
      const json = await response.json();
      if (json?.ok) {
        setUnread(Number(json.unreadCount) || 0);
        setItems((current) =>
          current.map((row) =>
            body.all || row.id === body.id
              ? { ...row, readAt: row.readAt ?? new Date().toISOString() }
              : row,
          ),
        );
      }
    } catch {
      // Ignore — the next poll reconciles state.
    }
  }, []);

  const badge = unread + operationsCount;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="relative grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-lethela-primary hover:text-white"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void load();
        }}
      >
        <Bell className="h-4 w-4" />
        {badge > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full border border-[#05071D] bg-lethela-primary px-1 text-[10px] font-bold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-[calc(100%+8px)] z-[140] w-[min(92vw,22rem)] overflow-hidden rounded-xl border border-white/12 bg-[#0B0F2A] text-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 ? (
              <button
                type="button"
                className="text-xs text-white/60 underline-offset-2 hover:text-white hover:underline"
                onClick={() => void markRead({ all: true })}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {operationsCount > 0 && onOpenOperations ? (
            <button
              type="button"
              className="flex w-full items-center justify-between border-b border-white/10 bg-lethela-primary/10 px-4 py-3 text-left text-sm hover:bg-lethela-primary/15"
              onClick={() => {
                setOpen(false);
                onOpenOperations();
              }}
            >
              <span>Operational issues need attention</span>
              <span className="rounded-full bg-lethela-primary px-2 py-0.5 text-[11px] font-bold">
                {operationsCount}
              </span>
            </button>
          ) : null}

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-white/50">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-white/50">You are all caught up.</p>
            ) : (
              <ul>
                {items.map((row) => {
                  const isUnread = !row.readAt;
                  const inner = (
                    <>
                      <span className="flex items-start gap-2">
                        {isUnread ? (
                          <span
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-lethela-primary"
                            aria-hidden="true"
                          />
                        ) : (
                          <span className="mt-1.5 h-2 w-2 shrink-0" aria-hidden="true" />
                        )}
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{row.title}</span>
                          {row.body ? (
                            <span className="mt-0.5 block text-xs text-white/60">{row.body}</span>
                          ) : null}
                          <span className="mt-1 block text-[11px] text-white/40">
                            {relativeTime(row.createdAt)}
                            {isUnread ? " · unread" : ""}
                          </span>
                        </span>
                      </span>
                    </>
                  );
                  const className = `block w-full px-4 py-3 text-left transition hover:bg-white/[0.04] ${
                    isUnread ? "bg-white/[0.02]" : ""
                  }`;
                  return (
                    <li key={row.id} className="border-b border-white/6 last:border-b-0">
                      {row.href ? (
                        <Link
                          href={row.href}
                          className={className}
                          onClick={() => {
                            void markRead({ id: row.id });
                            setOpen(false);
                          }}
                        >
                          {inner}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className={className}
                          onClick={() => void markRead({ id: row.id })}
                        >
                          {inner}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
