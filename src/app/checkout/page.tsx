// /src/app/checkout/page.tsx
"use client";

import { useCart } from "@/store/cart";
import { formatZAR } from "@/lib/format";
import { DEFAULT_DELIVERY_FEE_CENTS, EXTRA_DELIVERY_FEE_PER_KM_CENTS, INCLUDED_DELIVERY_RADIUS_KM } from "@/lib/pricing";
import { buildWhatsAppOrderLink } from "@/lib/whatsapp-order";
import Link from "next/link";
import Footer from "@/components/Footer";
import MainHeader from "@/components/MainHeader";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useRef, useState } from "react";
import { persistPreferredLocation, readPreferredLocation } from "@/lib/location-preference";
import { pushEcommerceEvent, trackWhatsAppClick } from "@/lib/visitor";

const isOzowSandbox = process.env.NEXT_PUBLIC_OZOW_IS_TEST === "true";

export default function CheckoutPage() {
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const checkoutTrackedRef = useRef("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [destinationSuburb, setDestinationSuburb] = useState(() => readPreferredLocation()?.label || "Klipfontein View, Midrand");
  const [destinationPoint, setDestinationPoint] = useState<{ lat: number; lng: number } | null>(() => {
    const saved = readPreferredLocation();
    return saved?.lat != null && saved?.lng != null ? { lat: saved.lat, lng: saved.lng } : null;
  });
  const [deliveryQuote, setDeliveryQuote] = useState({
    baseFeeCents: DEFAULT_DELIVERY_FEE_CENTS,
    deliveryCents: DEFAULT_DELIVERY_FEE_CENTS,
    distanceKm: null as number | null,
    includedRadiusKm: INCLUDED_DELIVERY_RADIUS_KM,
    extraPerKmCents: EXTRA_DELIVERY_FEE_PER_KM_CENTS,
  });
  const [quoteLoading, setQuoteLoading] = useState(false);

  useEffect(() => {
    const vendorId = items[0]?.vendorId;
    if (!vendorId) {
      setDeliveryQuote({
        baseFeeCents: DEFAULT_DELIVERY_FEE_CENTS,
        deliveryCents: DEFAULT_DELIVERY_FEE_CENTS,
        distanceKm: null,
        includedRadiusKm: INCLUDED_DELIVERY_RADIUS_KM,
        extraPerKmCents: EXTRA_DELIVERY_FEE_PER_KM_CENTS,
      });
      return;
    }

    const controller = new AbortController();
    const destination = destinationSuburb.trim() || "Klipfontein View, Midrand";
    const timeoutId = window.setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const params = new URLSearchParams({
          vendorId,
          destinationSuburb: destination,
        });
        if (destinationPoint) {
          params.set("destinationLat", String(destinationPoint.lat));
          params.set("destinationLng", String(destinationPoint.lng));
        }
        const response = await fetch(
          `/api/checkout/delivery-quote?${params.toString()}`,
          { cache: "no-store", signal: controller.signal }
        );
        const json = await response.json();
        if (!response.ok || !json.ok) {
          return;
        }
        setDeliveryQuote({
          baseFeeCents: Number(json.baseFeeCents ?? DEFAULT_DELIVERY_FEE_CENTS),
          deliveryCents: Number(json.deliveryCents ?? DEFAULT_DELIVERY_FEE_CENTS),
          distanceKm: typeof json.distanceKm === "number" ? json.distanceKm : null,
          includedRadiusKm: Number(json.includedRadiusKm ?? INCLUDED_DELIVERY_RADIUS_KM),
          extraPerKmCents: Number(json.extraPerKmCents ?? EXTRA_DELIVERY_FEE_PER_KM_CENTS),
        });
      } catch (quoteError: unknown) {
        if (quoteError instanceof Error && quoteError.name === "AbortError") {
          return;
        }
      } finally {
        setQuoteLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [destinationPoint, destinationSuburb, items]);

  const deliveryFee = deliveryQuote.deliveryCents;
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

  useEffect(() => {
    if (items.length === 0) return;
    const signature = JSON.stringify(
      items.map((item) => ({
        id: item.itemId,
        qty: item.qty,
        price: item.priceCents,
      }))
    );
    if (checkoutTrackedRef.current === signature) return;
    checkoutTrackedRef.current = signature;

    pushEcommerceEvent("begin_checkout", {
      currency: "ZAR",
      value: total / 100,
      items: items.map((item) => ({
        item_id: item.itemId,
        item_name: item.name,
        item_brand: item.vendorSlug,
        item_variant: item.vendorSlug,
        price: item.priceCents / 100,
        quantity: item.qty,
      })),
    });
  }, [items, total]);

  async function payOzow() {
    if (items.length === 0) return;
    const destination = destinationSuburb.trim() || "Klipfontein View, Midrand";
    setLoading(true);
    setError(null);
    try {
      persistPreferredLocation({
        label: destination,
        suburb: destination,
        lat: destinationPoint?.lat,
        lng: destinationPoint?.lng,
        source: destinationPoint ? "device" : "manual",
      });
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
          destinationLat: destinationPoint?.lat,
          destinationLng: destinationPoint?.lng,
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
    <div className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />
      <main className="container py-10 md:py-14">
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
                  onChange={(event) => {
                    setDestinationSuburb(event.target.value);
                    setDestinationPoint(null);
                  }}
                  placeholder="Klipfontein View, Midrand"
                  autoComplete="address-level2"
                />
              </div>

              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatZAR(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>
                  Delivery
                  {deliveryQuote.distanceKm != null ? ` (${deliveryQuote.distanceKm.toFixed(2)} km from store)` : ""}
                </span>
                <span>{formatZAR(deliveryFee)}</span>
              </div>
              <p className="text-xs text-white/60">
                {quoteLoading
                  ? "Refreshing delivery quote..."
                  : `${formatZAR(deliveryQuote.baseFeeCents)} within ${deliveryQuote.includedRadiusKm} km, then ${formatZAR(deliveryQuote.extraPerKmCents)} for each extra km.`}
              </p>
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatZAR(total)}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button className="bg-lethela-primary" disabled={loading} onClick={payOzow}>
                {loading ? "Redirecting..." : isOzowSandbox ? "Pay with Ozow (sandbox)" : "Pay with Ozow"}
              </Button>
              <Button asChild variant="outline" className="border-white/30 text-white hover:border-white/60">
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackWhatsAppClick("checkout", { item_count: items.length, total_cents: total })}
                >
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
      <Footer />
    </div>
  );
}
