"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/store/cart";
import { useUIStore } from "@/store/ui";
import { buildWhatsAppOrderLink } from "@/lib/whatsapp-order";

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

export default function CartDrawer() {
  const open = useUIStore((state) => state.cartOpen);
  const closeCart = useUIStore((state) => state.closeCart);
  const items = useCart((state) => state.items);
  const inc = useCart((state) => state.inc);
  const dec = useCart((state) => state.dec);
  const remove = useCart((state) => state.remove);
  const clear = useCart((state) => state.clear);
  const subtotal = useCart((state) => state.subtotal());
  const delivery = items.length > 0 ? Math.max(0, Number(items[0]?.deliveryFeeCents ?? 1500)) : 0;
  const total = subtotal + delivery;
  const whatsappLink = buildWhatsAppOrderLink({
    items: items.map((item) => ({
      name: item.name,
      qty: item.qty,
      priceCents: item.priceCents,
    })),
    subtotalCents: subtotal,
    deliveryCents: delivery,
    totalCents: total,
    destinationSuburb: readCookie("lethela_suburb"),
    vendorSlug: items[0]?.vendorSlug || null,
  });

  return (
    <>
      {open ? <div className="fixed inset-0 z-[98] bg-black/60" aria-hidden onClick={closeCart} /> : null}

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
          <button aria-label="Close cart" className="rounded-md p-2 hover:bg-white/10" onClick={closeCart}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="h-[calc(100%-208px)] space-y-3 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="text-white/80">Your cart is empty.</p>
          ) : (
            items.map((item) => (
              <div key={item.itemId} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.name} className="h-16 w-16 rounded object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded bg-white/10" />
                )}

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-white/70">R {(item.priceCents / 100).toFixed(2)}</div>
                    </div>
                    <button className="text-xs underline" onClick={() => remove(item.itemId)}>
                      Remove
                    </button>
                  </div>

                  <div className="mt-2 inline-flex items-center gap-2">
                    <button
                      className="h-7 w-7 rounded border border-white/20"
                      onClick={() => dec(item.itemId)}
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="text-sm">{item.qty}</span>
                    <button className="h-7 w-7 rounded border border-white/20" onClick={() => inc(item.itemId)} aria-label="Increase quantity">
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
            <div className="flex items-center justify-between text-white/80">
              <span>Delivery</span>
              <span>R {(delivery / 100).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between font-semibold">
              <span>Total</span>
              <span>R {(total / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild className="flex-1 bg-lethela-primary" disabled={items.length === 0}>
              <Link href="/checkout" onClick={closeCart}>
                Checkout
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-white/20 text-white" disabled={items.length === 0}>
              <a href={whatsappLink} target="_blank" rel="noreferrer" onClick={closeCart}>
                WhatsApp order
              </a>
            </Button>
            <Button variant="outline" className="border-white/20 text-white" onClick={clear} disabled={items.length === 0}>
              Clear
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
