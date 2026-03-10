// /src/app/checkout/page.tsx
"use client";

import { useCart } from "@/store/cart";
import { formatZAR } from "@/lib/format";
import { buildWhatsAppOrderLink } from "@/lib/whatsapp-order";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[2]) : null;
}

export default function CheckoutPage() {
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [destinationSuburb, setDestinationSuburb] = useState(
    () => readCookie("lethela_suburb") || "Klipfontein View, Midrand"
  );

  const deliveryFee = items.length > 0 ? Math.max(0, Number(items[0]?.deliveryFeeCents ?? 1500)) : 0;
  const total = subtotal + deliveryFee;
  const whatsappLink = useMemo(
    () =>
      buildWhatsAppOrderLink({
        items: items.map((item) => ({
          name: item.name,
          qty: item.qty,
          priceCents: item.priceCents,
        })),
        subtotalCents: subtotal,
        deliveryCents: deliveryFee,
        totalCents: total,
        destinationSuburb,
        vendorSlug: items[0]?.vendorSlug || null,
      }),
    [deliveryFee, destinationSuburb, items, subtotal, total]
  );

  async function payOzow() {
    if (items.length === 0) return;
    const destination = destinationSuburb.trim() || "Klipfontein View, Midrand";
    document.cookie = `lethela_suburb=${encodeURIComponent(destination)}; path=/; max-age=7776000; samesite=lax`;
    try {
      localStorage.setItem("lethela_suburb", destination);
    } catch {
      // ignore storage errors in restricted browsers
    }

    setLoading(true);
    setError(null);
    try {
      const vendorId = items[0].vendorId;
      const vendorSlug = items[0].vendorSlug;
      if (!vendorId || vendorId === "unknown-vendor") {
        setError("Cart has invalid vendor info. Please remove and add items again.");
        return;
      }
      const res = await fetch("/api/payments/ozow/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          vendorId,
          vendorSlug,
          destinationSuburb: destination,
          items: items.map((i) => ({
            itemId: i.itemId,
            name: i.name,
            priceCents: i.priceCents,
            qty: i.qty,
            image: i.image ?? null
          })),
          subtotalCents: subtotal,
          deliveryCents: deliveryFee,
          totalCents: total
        })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error ?? "Payment init failed");
        return;
      }
      window.location.href = json.redirectUrl;
    } catch {
      setError("Could not start payment. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container py-10">
      <h1 className="text-2xl font-bold">Checkout</h1>
      {items.length === 0 ? (
        <p className="mt-4 text-white/70">
          Your cart is empty. <Link href="/" className="underline">Browse restaurants</Link>.
        </p>
      ) : (
        <>
          <div className="mt-6 space-y-2 rounded-lg border border-white/10 p-4">
            {items.map((i) => (
              <div key={i.itemId} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{i.name}</div>
                  <div className="text-white/60">Qty {i.qty}</div>
                </div>
                <div>{formatZAR(i.priceCents * i.qty)}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div className="rounded-lg border border-white/15 p-3">
              <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-white/70">
                Delivery suburb / area
              </label>
              <input
                className="w-full rounded bg-white px-3 py-2 text-sm text-black"
                value={destinationSuburb}
                onChange={(event) => setDestinationSuburb(event.target.value)}
                placeholder="Klipfontein View, Midrand"
                autoComplete="address-level2"
              />
            </div>

            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatZAR(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>{formatZAR(deliveryFee)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatZAR(total)}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button className="bg-lethela-primary" disabled={loading} onClick={payOzow}>
              {loading ? "Redirecting..." : "Pay with Ozow (sandbox)"}
            </Button>
            <Button asChild variant="outline" className="border-white/30 text-white hover:border-white/60">
              <a href={whatsappLink} target="_blank" rel="noreferrer">
                Order via WhatsApp
              </a>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Continue shopping</Link>
            </Button>
          </div>

          {error ? <p className="mt-3 text-sm text-red-200">{error}</p> : null}
          <p className="mt-2 text-xs text-white/70">
            Prefer not to pay online? Use <span className="font-semibold">Order via WhatsApp</span> and we will confirm manually.
          </p>

          <p className="mt-3 text-xs text-white/60">
            For local dev, set <code>OZOW_SITE_CODE</code> and <code>OZOW_PRIVATE_KEY</code> in <code>.env.local</code>.
          </p>
        </>
      )}
    </main>
  );
}
