"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LifeBuoy, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOrderWhatsAppPhone } from "@/lib/whatsapp-order";

type OrderHistoryItem = {
  publicId: string;
  trackingRef: string;
  status: string;
  paymentStatus: string;
  totalCents: number;
  createdAt: string;
  vendor: { name: string; slug: string } | null;
  items: Array<{ id: string; qty: number; priceCents: number; name: string }>;
};

function money(cents: number) {
  return `R${(Number(cents || 0) / 100).toFixed(2)}`;
}

export default function OrderHistoryPanel() {
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const whatsappHref = `https://wa.me/${getOrderWhatsAppPhone()}`;

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/me/orders", { cache: "no-store" });
        const json = await response.json();
        if (!response.ok || !json.ok) throw new Error(json.error || "Failed to load orders.");
        if (alive) setOrders(json.orders || []);
      } catch (err: unknown) {
        if (alive) setError(err instanceof Error ? err.message : "Failed to load orders.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-white/55">Orders</p>
          <h2 className="mt-1 text-xl font-semibold">Order history</h2>
          <p className="mt-2 text-sm text-white/65">
            Track recent orders, recover references, and ask support for help with an issue.
          </p>
        </div>
        <Link
          href="/search"
          className="inline-flex items-center rounded border border-white/20 px-3 py-2 text-sm hover:border-lethela-primary hover:text-lethela-primary"
        >
          <Search className="mr-2 h-4 w-4" />
          Browse again
        </Link>
      </div>

      {loading ? (
        <div className="mt-5 grid animate-pulse gap-3">
          <div className="h-20 rounded-lg bg-white/10" />
          <div className="h-20 rounded-lg bg-white/10" />
        </div>
      ) : error ? (
        <div className="mt-5 rounded-lg border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-100">
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-5 rounded-lg border border-white/10 bg-black/10 p-4 text-sm text-white/65">
          No account orders yet. Guest and WhatsApp-assisted orders can still be tracked with their
          order reference.
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {orders.map((order) => (
            <article
              key={order.publicId}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{order.publicId}</div>
                  <div className="mt-1 text-xs text-white/55">
                    {order.vendor?.name || "Vendor"} - {new Date(order.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold">{money(order.totalCents)}</div>
                  <div className="text-xs text-white/55">
                    {order.status.replaceAll("_", " ")} / {order.paymentStatus}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm text-white/70">
                {order.items.map((item) => `${item.name} x ${item.qty}`).join(", ")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild className="bg-lethela-primary text-white">
                  <Link href={`/track?ref=${encodeURIComponent(order.trackingRef)}`}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Track order
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/30 bg-transparent text-white"
                >
                  <a href={whatsappHref} target="_blank" rel="noreferrer">
                    <LifeBuoy className="mr-2 h-4 w-4" />
                    Support
                  </a>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
