"use client";

import Image from "next/image";
import MealPreferenceControls from "@/components/MealPreferenceControls";
import { Button } from "@/components/ui/button";
import { pushEcommerceEvent, trackVisitorEvent } from "@/lib/visitor";
import { useCart } from "@/store/cart";
import { useUIStore } from "@/store/ui";

export type ProductLite = {
  id: string;
  name: string;
  priceCents: number;
  image?: string | null;
  isAlcohol?: boolean;
  vendor?: { id: string; name: string | null; slug?: string | null; deliveryFee?: number | null } | null;
  description?: string | null;
  category?: string | null;
};

export default function ProductCard({ p }: { p: ProductLite }) {
  const add = useCart((state) => state.add);
  const openCart = useUIStore((state) => state.openCart);

  const vendorId = p.vendor?.id || "unknown-vendor";
  const vendorSlug = p.vendor?.slug || "unknown-vendor";

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-lethela-secondary transition">
      {p.image ? (
        <div className="relative h-40 w-full">
          <Image
            src={p.image}
            alt={p.name}
            fill
            sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="h-40 w-full bg-white/10" />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{p.name}</h3>
            <p className="truncate text-xs text-white/70">
              {p.vendor?.name ? `${p.vendor.name} • ` : ""}
              R {(p.priceCents / 100).toFixed(2)}
            </p>
          </div>
          {p.isAlcohol ? <span className="rounded bg-white/10 px-2 py-1 text-[10px]">18+</span> : null}
        </div>

        {p.description ? <p className="mt-2 line-clamp-2 text-xs text-white/70">{p.description}</p> : null}

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[11px] text-white/55">Save or rate this meal</span>
          <MealPreferenceControls itemId={p.id} compact />
        </div>

        <div className="mt-3">
          <Button
            className="w-full bg-lethela-primary hover:opacity-95"
            onClick={() => {
              add(
                {
                  itemId: p.id,
                  vendorId,
                  vendorSlug,
                  deliveryFeeCents: p.vendor?.deliveryFee ?? null,
                  name: p.name,
                  priceCents: p.priceCents,
                  image: p.image || undefined,
                },
                1
              );
              void trackVisitorEvent({
                type: "product_add",
                productId: p.id,
                vendorId,
                vendorSlug,
                meta: {
                  name: p.name,
                  category: p.category || null,
                  vendorName: p.vendor?.name || null,
                },
              });
              pushEcommerceEvent("add_to_cart", {
                currency: "ZAR",
                value: p.priceCents / 100,
                items: [
                  {
                    item_id: p.id,
                    item_name: p.name,
                    item_brand: p.vendor?.name || undefined,
                    item_category: p.category || undefined,
                    item_variant: p.vendor?.slug || undefined,
                    price: p.priceCents / 100,
                    quantity: 1,
                  },
                ],
              });
              openCart();
            }}
          >
            Add to cart
          </Button>
        </div>
      </div>
    </div>
  );
}
