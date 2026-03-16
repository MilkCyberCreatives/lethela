"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { getPusherClient } from "@/lib/pusher-client";

type ChannelStatus = {
  email: { enabled: boolean; recipients: number };
  whatsapp: { enabled: boolean; recipients: number };
  push: { enabled: boolean };
};

type AdminNotificationEvent = {
  title?: string;
  body?: string;
  pendingCount?: number;
};

export default function AdminAlertsLink() {
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<ChannelStatus | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/admin/notifications", { cache: "no-store" });
        const json = await response.json();
        if (!response.ok || !json.ok || !active) return;
        setPendingCount(Number(json.pendingCount ?? 0));
        setChannels(json.channels ?? null);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    const pusher = getPusherClient();
    if (!pusher) {
      return () => {
        active = false;
      };
    }

    const channel = pusher.subscribe("admin-notifications");
    const onVendorApplication = (event: AdminNotificationEvent) => {
      if (!active) return;
      setPendingCount(Number(event.pendingCount ?? 0));
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification(event.title || "New vendor application", {
          body: event.body || "An application is waiting for admin approval.",
        });
      }
    };

    channel.bind("vendor-application", onVendorApplication);

    return () => {
      active = false;
      channel.unbind("vendor-application", onVendorApplication);
      pusher.unsubscribe("admin-notifications");
    };
  }, []);

  const title = loading
    ? "Admin alerts"
    : pendingCount > 0
      ? `${pendingCount} vendor application${pendingCount === 1 ? "" : "s"} pending`
      : "No pending vendor applications";

  const pushHint =
    channels?.push.enabled && typeof window !== "undefined" && "Notification" in window
      ? Notification.permission === "granted"
        ? "Browser push on"
        : "Enable push in /admin"
      : null;

  return (
    <Link
      href="/admin"
      className="relative inline-flex items-center gap-2 rounded-full border border-black/10 px-3 py-2 font-medium hover:border-lethela-primary hover:text-lethela-primary"
      title={title}
    >
      <Bell className="h-4 w-4" />
      <span>Admin</span>
      {pendingCount > 0 ? (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-lethela-primary px-1.5 py-0.5 text-[10px] leading-none text-white">
          {pendingCount}
        </span>
      ) : null}
      {pushHint ? <span className="hidden text-[10px] text-black/60 lg:inline">{pushHint}</span> : null}
    </Link>
  );
}
