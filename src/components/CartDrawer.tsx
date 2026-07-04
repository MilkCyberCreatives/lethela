"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/store/cart";
import { readPreferredLocation } from "@/lib/location-preference";
import {
  DEFAULT_DELIVERY_FEE_CENTS,
  DELIVERY_PRICING_WORDING,
  EXTRA_DELIVERY_FEE_PER_KM_CENTS,
  INCLUDED_DELIVERY_RADIUS_KM,
} from "@/lib/pricing";
import { useUIStore } from "@/store/ui";
import { trackWhatsAppClick } from "@/lib/visitor";
import { buildWhatsAppOrderLink } from "@/lib/whatsapp-order";

export default function CartDrawer() {
  const open = useUIStore((state) => state.cartOpen);
  const openCart = useUIStore((state) => state.openCart);
  const closeCart = useUIStore((state) => state.closeCart);
  const items = useCart((state) => state.items);
  const inc = useCart((state) => state.inc);
  const dec = useCart((state) => state.dec);
  const remove = useCart((state) => state.remove);
  const clear = useCart((state) => state.clear);
  const cartSubtotal = useCart((state) => state.subtotal());
  const [mounted, setMounted] = useState(false);
  const [deliveryQuote, setDeliveryQuote] = useState({
    baseFeeCents: DEFAULT_DELIVERY_FEE_CENTS,
    deliveryCents: DEFAULT_DELIVERY_FEE_CENTS,
    distanceKm: null as number | null,
    manualQuoteRequired: false,
    includedRadiusKm: INCLUDED_DELIVERY_RADIUS_KM,
    extraPerKmCents: EXTRA_DELIVERY_FEE_PER_KM_CENTS,
  });
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [preferredLocation, setPreferredLocation] =
    useState<ReturnType<typeof readPreferredLocation>>(null);
  const visibleItems = useMemo(() => (mounted ? items : []), [items, mounted]);
  const subtotal = mounted ? cartSubtotal : 0;
  const destinationSuburb = preferredLocation?.label || "Klipfontein View, Midrand";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const syncLocation = () => {
      setPreferredLocation(readPreferredLocation());
    };

    syncLocation();
    window.addEventListener("lethela:location-changed", syncLocation);
    window.addEventListener("storage", syncLocation);
    window.addEventListener("focus", syncLocation);
    document.addEventListener("visibilitychange", syncLocation);

    return () => {
      window.removeEventListener("lethela:location-changed", syncLocation);
      window.removeEventListener("storage", syncLocation);
      window.removeEventListener("focus", syncLocation);
      document.removeEventListener("visibilitychange", syncLocation);
    };
  }, [mounted, open]);

  useEffect(() => {
    if (!mounted) return;

    const vendorId = visibleItems[0]?.vendorId;
    if (!vendorId) {
      setDeliveryQuote({
        baseFeeCents: DEFAULT_DELIVERY_FEE_CENTS,
        deliveryCents: DEFAULT_DELIVERY_FEE_CENTS,
        distanceKm: null,
        manualQuoteRequired: false,
        includedRadiusKm: INCLUDED_DELIVERY_RADIUS_KM,
        extraPerKmCents: EXTRA_DELIVERY_FEE_PER_KM_CENTS,
      });
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const params = new URLSearchParams({
          vendorId,
          destinationSuburb,
        });
        if (preferredLocation?.lat != null && preferredLocation?.lng != null) {
          params.set("destinationLat", String(preferredLocation.lat));
          params.set("destinationLng", String(preferredLocation.lng));
        }
        const response = await fetch(`/api/checkout/delivery-quote?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = await response.json();
        if (!response.ok || !json.ok) {
          return;
        }
        setDeliveryQuote({
          baseFeeCents: Number(json.baseFeeCents ?? DEFAULT_DELIVERY_FEE_CENTS),
          deliveryCents: Number(json.deliveryCents ?? DEFAULT_DELIVERY_FEE_CENTS),
          distanceKm: typeof json.distanceKm === "number" ? json.distanceKm : null,
          manualQuoteRequired: Boolean(json.manualQuoteRequired),
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
  }, [destinationSuburb, mounted, preferredLocation, visibleItems]);

  const hasItems = visibleItems.length > 0;
  const delivery = hasItems ? deliveryQuote.deliveryCents : 0;
  const total = subtotal + delivery;
  const whatsappLink = hasItems
    ? buildWhatsAppOrderLink({
        items: visibleItems.map((item) => ({
          name: item.name,
          qty: item.qty,
          priceCents: item.priceCents,
        })),
        subtotalCents: subtotal,
        deliveryCents: delivery,
        totalCents: total,
        destinationSuburb,
        deliveryAddress: destinationSuburb,
        vendorSlug: visibleItems[0]?.vendorSlug || null,
      })
    : "#";

  return (
    <>
      {mounted && hasItems && !open ? (
        <div className="fixed inset-x-3 bottom-3 z-[70] rounded-2xl border border-white/10 bg-slate-950/95 p-3 text-white shadow-2xl backdrop-blur md:left-auto md:right-5 md:w-[420px]">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={openCart}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-lethela-primary text-white">
                <ShoppingBag className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">
                  {visibleItems.length} item{visibleItems.length === 1 ? "" : "s"} in cart
                </span>
                <span className="block text-xs text-white/65">
                  Total R {(total / 100).toFixed(2)}
                </span>
              </span>
            </button>
            <Link
              href="/checkout"
              className="rounded-full bg-lethela-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Checkout
            </Link>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[98] bg-black/60" aria-hidden onClick={closeCart} />
      ) : null}

      <aside
        className={`fixed right-0 top-0 z-[99] h-full w-full max-w-md transform border-l border-white/10 bg-lethela-secondary text-white transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Shopping cart"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h2 className="text-lg font-semibold">Your cart</h2>
          <button
            type="button"
            aria-label="Close cart"
            className="rounded-md p-2 hover:bg-white/10"
            onClick={closeCart}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="h-[calc(100%-208px)] space-y-3 overflow-y-auto p-4">
          {!hasItems ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/75">
              Your cart is empty. Add an item from an approved vendor to start an order.
            </div>
          ) : (
            visibleItems.map((item) => (
              <div
                key={item.itemId}
                className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
              >
                {item.image ? (
                  <div className="relative h-16 w-16 overflow-hidden rounded">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded bg-white/10" />
                )}

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-white/70">
                        R {(item.priceCents / 100).toFixed(2)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-xs underline"
                      onClick={() => remove(item.itemId)}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-2 inline-flex items-center gap-2">
                    <button
                      type="button"
                      className="h-7 w-7 rounded border border-white/20"
                      onClick={() => dec(item.itemId)}
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="text-sm">{item.qty}</span>
                    <button
                      type="button"
                      className="h-7 w-7 rounded border border-white/20"
                      onClick={() => inc(item.itemId)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-white/10 bg-lethela-secondary p-4">
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between text-white/80">
              <span>Subtotal</span>
              <span>R {(subtotal / 100).toFixed(2)}</span>
            </div>
            {hasItems ? (
              <>
                <div className="flex items-center justify-between text-white/80">
                  <span>
                    Delivery
                    {deliveryQuote.distanceKm != null
                      ? ` (${deliveryQuote.distanceKm.toFixed(2)} km)`
                      : ""}
                  </span>
                  <span>R {(delivery / 100).toFixed(2)}</span>
                </div>
                <div className="text-xs text-white/55">
                  {quoteLoading
                    ? "Refreshing delivery quote..."
                    : deliveryQuote.manualQuoteRequired
                      ? "This address is outside the launch delivery zone. Use WhatsApp for a manual quote."
                      : DELIVERY_PRICING_WORDING}
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/65">
                Delivery will be calculated once you add items and enter your address.
              </div>
            )}
            <div className="flex items-center justify-between font-semibold">
              <span>Total</span>
              <span>R {(total / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {hasItems ? (
              <Button asChild className="flex-1 bg-lethela-primary">
                <Link href="/checkout" onClick={closeCart}>
                  Checkout
                </Link>
              </Button>
            ) : (
              <Button className="flex-1 bg-white/15 text-white" disabled>
                Checkout
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              className="border-white/20 text-white"
              disabled={visibleItems.length === 0}
            >
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  trackWhatsAppClick("cart_drawer", { item_count: visibleItems.length });
                  closeCart();
                }}
              >
                WhatsApp order
              </a>
            </Button>
            <Button
              variant="outline"
              className="border-white/20 text-white"
              onClick={clear}
              disabled={visibleItems.length === 0}
            >
              Clear
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
