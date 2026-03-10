"use client";

import { Button } from "@/components/ui/button";
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
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.image} alt={p.name} className="h-40 w-full object-cover" loading="lazy" decoding="async" />
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
