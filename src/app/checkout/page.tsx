// /src/app/checkout/page.tsx
"use client";

import { useCart } from "@/store/cart";
import { formatZAR } from "@/lib/format";
import {
  DEFAULT_DELIVERY_FEE_CENTS,
  DELIVERY_PRICING_WORDING,
  EXTRA_DELIVERY_FEE_PER_KM_CENTS,
  INCLUDED_DELIVERY_RADIUS_KM,
} from "@/lib/pricing";
import { buildWhatsAppOrderLink } from "@/lib/whatsapp-order";
import { buildWhatsAppSupportLink } from "@/lib/support";
import Link from "next/link";
import Footer from "@/components/Footer";
import MainHeader from "@/components/MainHeader";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useRef, useState } from "react";
import { persistPreferredLocation, readPreferredLocation } from "@/lib/location-preference";
import { pushEcommerceEvent, trackWhatsAppClick } from "@/lib/visitor";

const isOzowSandbox = process.env.NEXT_PUBLIC_OZOW_IS_TEST === "true";

type DistanceSource = "ROAD" | "ESTIMATED" | null;

export default function CheckoutPage() {
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const checkoutTrackedRef = useRef("");
  const checkoutKeyRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [destinationSuburb, setDestinationSuburb] = useState(
    () => readPreferredLocation()?.label || "Klipfontein View, Midrand",
  );
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [standNumber, setStandNumber] = useState("");
  const [streetSection, setStreetSection] = useState("");
  const [landmark, setLandmark] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [riderTipCents, setRiderTipCents] = useState(0);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [destinationPoint, setDestinationPoint] = useState<{ lat: number; lng: number } | null>(
    () => {
      const saved = readPreferredLocation();
      return saved?.lat != null && saved?.lng != null ? { lat: saved.lat, lng: saved.lng } : null;
    },
  );
  const [deliveryQuote, setDeliveryQuote] = useState({
    baseFeeCents: DEFAULT_DELIVERY_FEE_CENTS,
    deliveryCents: DEFAULT_DELIVERY_FEE_CENTS,
    distanceKm: null as number | null,
    distanceSource: null as DistanceSource,
    manualQuoteRequired: false,
    includedRadiusKm: INCLUDED_DELIVERY_RADIUS_KM,
    extraPerKmCents: EXTRA_DELIVERY_FEE_PER_KM_CENTS,
  });
  const [quoteLoading, setQuoteLoading] = useState(false);

  useEffect(() => {
    const vendorId = items[0]?.vendorId;
    if (!vendorId) {
      setQuoteError(null);
      setDeliveryQuote({
        baseFeeCents: DEFAULT_DELIVERY_FEE_CENTS,
        deliveryCents: DEFAULT_DELIVERY_FEE_CENTS,
        distanceKm: null,
        distanceSource: null,
        manualQuoteRequired: false,
        includedRadiusKm: INCLUDED_DELIVERY_RADIUS_KM,
        extraPerKmCents: EXTRA_DELIVERY_FEE_PER_KM_CENTS,
      });
      return;
    }

    const controller = new AbortController();
    const destination = destinationSuburb.trim() || "Klipfontein View, Midrand";
    const timeoutId = window.setTimeout(async () => {
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const params = new URLSearchParams({
          vendorId,
          destinationSuburb: destination,
        });
        if (destinationPoint) {
          params.set("destinationLat", String(destinationPoint.lat));
          params.set("destinationLng", String(destinationPoint.lng));
        }
        const response = await fetch(`/api/checkout/delivery-quote?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = await response.json();
        if (!response.ok || !json.ok) {
          setQuoteError(
            typeof json?.error === "string"
              ? json.error
              : "We could not confirm the delivery quote. Review the address and try again.",
          );
          return;
        }
        setDeliveryQuote({
          baseFeeCents: Number(json.baseFeeCents ?? DEFAULT_DELIVERY_FEE_CENTS),
          deliveryCents: Number(json.deliveryCents ?? DEFAULT_DELIVERY_FEE_CENTS),
          distanceKm: typeof json.distanceKm === "number" ? json.distanceKm : null,
          distanceSource: json.distanceSource === "ROAD" ? "ROAD" : "ESTIMATED",
          manualQuoteRequired: Boolean(json.manualQuoteRequired),
          includedRadiusKm: Number(json.includedRadiusKm ?? INCLUDED_DELIVERY_RADIUS_KM),
          extraPerKmCents: Number(json.extraPerKmCents ?? EXTRA_DELIVERY_FEE_PER_KM_CENTS),
        });
      } catch (quoteFailure: unknown) {
        if (quoteFailure instanceof Error && quoteFailure.name === "AbortError") {
          return;
        }
        setQuoteError("We could not refresh the delivery quote. Check your connection and try again.");
      } finally {
        setQuoteLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [destinationPoint, destinationSuburb, items]);

  const hasItems = items.length > 0;
  const hasAlcohol = items.some((item) => item.isAlcohol);
  const onlineCheckoutAvailable = true;
  const deliveryFee = hasItems ? deliveryQuote.deliveryCents : 0;
  const tipCents = hasItems ? Math.max(0, Math.round(riderTipCents)) : 0;
  const total = subtotal + deliveryFee + tipCents;
  const contactDetailsComplete = customerName.trim().length >= 2 && customerPhone.trim().length >= 8;
  const supportLink = useMemo(
    () =>
      buildWhatsAppSupportLink(
        "Hello Lethela, I need help with ordering or with availability in my area.",
      ),
    [],
  );
  const whatsappLink = useMemo(() => {
    const deliveryAddress = [
      standNumber ? `Stand/house: ${standNumber}` : null,
      streetSection ? `Street/section: ${streetSection}` : null,
      destinationSuburb ? `Area: ${destinationSuburb}` : null,
      landmark ? `Landmark: ${landmark}` : null,
      deliveryNotes ? `Notes: ${deliveryNotes}` : null,
    ]
      .filter(Boolean)
      .join("; ");

    return buildWhatsAppOrderLink({
      items: items.map((item) => ({
        name: item.name,
        qty: item.qty,
        priceCents: item.priceCents,
      })),
      subtotalCents: subtotal,
      deliveryCents: deliveryFee,
      riderTipCents: tipCents,
      totalCents: total,
      destinationSuburb,
      deliveryAddress,
      customerName,
      customerPhone: whatsappNumber || customerPhone,
      vendorSlug: items[0]?.vendorSlug || null,
    });
  }, [
    customerName,
    customerPhone,
    deliveryFee,
    deliveryNotes,
    destinationSuburb,
    items,
    landmark,
    standNumber,
    streetSection,
    subtotal,
    tipCents,
    total,
    whatsappNumber,
  ]);

  useEffect(() => {
    if (items.length === 0 || deliveryQuote.manualQuoteRequired) return;
    const signature = JSON.stringify(
      items.map((item) => ({
        id: item.itemId,
        qty: item.qty,
        price: item.priceCents,
      })),
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
  }, [deliveryQuote.manualQuoteRequired, items, total]);

  async function payOzow() {
    if (items.length === 0) return;
    if (!onlineCheckoutAvailable) {
      setError("Online checkout is not available for this cart yet. Please use WhatsApp ordering.");
      return;
    }
    if (hasAlcohol && !ageConfirmed) {
      setError("Confirm that you are 18 or older before paying for liquor.");
      return;
    }
    if (quoteError) {
      setError("Confirm the delivery quote before paying.");
      return;
    }
    const destination = destinationSuburb.trim() || "Klipfontein View, Midrand";
    setLoading(true);
    setError(null);
    try {
      checkoutKeyRef.current ||= crypto.randomUUID();
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
          customerName,
          customerPhone,
          whatsappNumber,
          standNumber,
          streetSection,
          landmark,
          deliveryNotes,
          ageConfirmed,
          checkoutKey: checkoutKeyRef.current,
          items: items.map((i) => ({
            itemId: i.itemId,
            name: i.name,
            priceCents: i.priceCents,
            qty: i.qty,
            image: i.image ?? null,
            isAlcohol: Boolean(i.isAlcohol),
          })),
          subtotalCents: subtotal,
          deliveryCents: deliveryFee,
          riderTipCents: tipCents,
          totalCents: total,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (res.status >= 500) checkoutKeyRef.current = null;
        setError(json?.error ?? "Payment init failed");
        return;
      }
      window.location.href = json.redirectUrl;
    } catch {
      setError("Online checkout is not ready right now. Please use the WhatsApp order option.");
    } finally {
      setLoading(false);
    }
  }

  function updateTipFromRand(value: string) {
    const number = Number(value.replace(",", "."));
    setRiderTipCents(Number.isFinite(number) ? Math.max(0, Math.round(number * 100)) : 0);
  }

  return (
    <div className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />
      <main className="container py-10 md:py-14">
        <h1 className="text-2xl font-bold">Checkout</h1>
        {items.length === 0 ? (
          <div className="mt-5 max-w-xl rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">No items in your cart yet.</h2>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Add a product from an approved vendor before creating an order. WhatsApp support can
              help with availability, but it will not create an empty R0.00 order.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild className="bg-lethela-primary text-white">
                <Link href="/">Browse approved vendors</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/30 text-white hover:border-white/60"
              >
                <a href={supportLink} target="_blank" rel="noreferrer">
                  Get ordering help
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 rounded-2xl border border-emerald-200/20 bg-emerald-300/10 p-4 text-sm text-emerald-50">
              You can order as a guest. We only need your name, phone number and delivery details.
              You can create an account after the order is placed.
            </div>
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

            <div className="mt-4 space-y-3 text-sm">
              <div className="grid gap-3 rounded-lg border border-white/15 p-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-white/70">
                    Customer name
                  </label>
                  <input
                    className="w-full rounded bg-white px-3 py-2 text-sm text-black"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-white/70">
                    Phone number
                  </label>
                  <input
                    className="w-full rounded bg-white px-3 py-2 text-sm text-black"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    placeholder="072..."
                    autoComplete="tel"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-white/70">
                    WhatsApp number
                  </label>
                  <input
                    className="w-full rounded bg-white px-3 py-2 text-sm text-black"
                    value={whatsappNumber}
                    onChange={(event) => setWhatsappNumber(event.target.value)}
                    placeholder="Same as phone if applicable"
                    autoComplete="tel"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-white/70">
                    Stand / house number
                  </label>
                  <input
                    className="w-full rounded bg-white px-3 py-2 text-sm text-black"
                    value={standNumber}
                    onChange={(event) => setStandNumber(event.target.value)}
                    placeholder="Stand 1234"
                    autoComplete="address-line1"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-white/70">
                    Street / extension / section
                  </label>
                  <input
                    className="w-full rounded bg-white px-3 py-2 text-sm text-black"
                    value={streetSection}
                    onChange={(event) => setStreetSection(event.target.value)}
                    placeholder="Extension 3"
                    autoComplete="address-line2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.1em] text-white/70">
                    Landmark
                  </label>
                  <input
                    className="w-full rounded bg-white px-3 py-2 text-sm text-black"
                    value={landmark}
                    onChange={(event) => setLandmark(event.target.value)}
                    placeholder="Opposite Park X3"
                  />
                </div>
              </div>

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
                <label className="mb-1 mt-3 block text-xs uppercase tracking-[0.1em] text-white/70">
                  Delivery notes
                </label>
                <textarea
                  className="w-full rounded bg-white px-3 py-2 text-sm text-black"
                  value={deliveryNotes}
                  onChange={(event) => setDeliveryNotes(event.target.value)}
                  placeholder="Blue gate, opposite Park X3, call on arrival."
                  rows={3}
                />
              </div>

              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatZAR(subtotal)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>
                  Delivery
                  {deliveryQuote.distanceKm != null
                    ? ` (${deliveryQuote.distanceKm.toFixed(2)} ${deliveryQuote.distanceSource === "ROAD" ? "road km" : "estimated km"} from store)`
                    : ""}
                </span>
                <span>{formatZAR(deliveryFee)}</span>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/[0.04] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Rider tip</div>
                    <p className="mt-1 text-xs text-white/60">
                      100% of the tip goes to the assigned rider.
                    </p>
                  </div>
                  <input
                    className="w-24 rounded bg-white px-3 py-2 text-right text-sm text-black"
                    inputMode="decimal"
                    aria-label="Rider tip amount in rand"
                    value={(tipCents / 100).toFixed(2)}
                    onChange={(event) => updateTipFromRand(event.target.value)}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[0, 500, 1000, 1500, 2000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setRiderTipCents(amount)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        tipCents === amount
                          ? "border-lethela-primary bg-lethela-primary text-white"
                          : "border-white/20 text-white/75 hover:border-lethela-primary"
                      }`}
                    >
                      {amount === 0 ? "No tip" : formatZAR(amount)}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-white/60">
                {quoteLoading
                  ? "Refreshing delivery quote..."
                  : quoteError
                    ? quoteError
                    : deliveryQuote.manualQuoteRequired
                      ? "This address is outside the current delivery zone. Use WhatsApp for a manual quote."
                      : DELIVERY_PRICING_WORDING}
              </p>
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatZAR(total)}</span>
              </div>
            </div>

            {hasAlcohol ? (
              <div className="mt-4 rounded-lg border border-amber-200/25 bg-amber-300/10 p-4 text-sm text-amber-50">
                <p>
                  Liquor is sold by licensed vendors only. Lethela provides marketplace and delivery
                  support. Valid ID may be required on delivery.
                </p>
                <label className="mt-3 flex items-start gap-2 font-medium">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={ageConfirmed}
                    onChange={(event) => setAgeConfirmed(event.target.checked)}
                  />
                  I confirm that I am 18 or older and will present valid ID on delivery.
                </label>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                className="bg-lethela-primary"
                disabled={
                  loading ||
                  Boolean(quoteError) ||
                  deliveryQuote.manualQuoteRequired ||
                  !onlineCheckoutAvailable ||
                  (hasAlcohol && !ageConfirmed) ||
                  !contactDetailsComplete
                }
                onClick={payOzow}
              >
                {loading
                  ? "Redirecting..."
                  : !onlineCheckoutAvailable
                    ? "Online checkout unavailable"
                    : deliveryQuote.manualQuoteRequired
                      ? "Manual quote required"
                      : isOzowSandbox
                        ? "Pay with Ozow (sandbox)"
                        : "Pay with Ozow"}
              </Button>
              {contactDetailsComplete ? (
                <Button
                  asChild
                  variant="outline"
                  className="border-white/30 text-white hover:border-white/60"
                >
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() =>
                      trackWhatsAppClick("checkout", { item_count: items.length, total_cents: total })
                    }
                  >
                    Order via WhatsApp
                  </a>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="border-white/20 text-white/55"
                  disabled
                  title="Enter your name and phone number first"
                >
                  Complete contact details first
                </Button>
              )}
              <Button variant="outline" asChild>
                <Link href="/">Continue shopping</Link>
              </Button>
            </div>

            {error ? <p className="mt-3 text-sm text-red-200">{error}</p> : null}
            <p className="mt-2 text-xs text-white/70">
              Prefer not to pay online? Complete your contact details, then use{" "}
              <span className="font-semibold">Order via WhatsApp</span> for manual confirmation.
            </p>

            {isOzowSandbox ? (
              <p className="mt-3 text-xs text-white/60">Sandbox checkout is active for testing.</p>
            ) : null}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
