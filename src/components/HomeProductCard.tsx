"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { ProductLite } from "@/components/ProductCard";
import { formatZAR } from "@/lib/format";
import { pushEcommerceEvent, trackVisitorEvent } from "@/lib/visitor";
import { useCart } from "@/store/cart";
import { useUIStore } from "@/store/ui";

type ProductVendor = ProductLite["vendor"] & {
  suburb?: string | null;
  township?: string | null;
  city?: string | null;
};

export default function HomeProductCard({ product }: { product: ProductLite }) {
  const add = useCart((state) => state.add);
  const openCart = useUIStore((state) => state.openCart);
  const vendor = product.vendor as ProductVendor;
  const vendorId = vendor?.id || "unknown-vendor";
  const vendorSlug = vendor?.slug || "unknown-vendor";
  const area = vendor?.township || vendor?.suburb || vendor?.city || "Nearby";

  return (
    <article className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.045] transition hover:border-lethela-primary/50">
      <div className="relative aspect-[4/3] w-full bg-white/10">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="p-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{product.name}</h3>
          <p className="mt-1 text-sm font-semibold text-white">{formatZAR(product.priceCents)}</p>
          <p className="mt-2 truncate text-xs text-white/65">{vendor?.name || "Lethela vendor"}</p>
          <p className="mt-1 truncate text-xs text-white/50">{area}</p>
        </div>

        <Button
          className="mt-4 h-10 w-full rounded-md bg-lethela-primary text-sm font-semibold text-white hover:opacity-95"
          onClick={() => {
            add(
              {
                itemId: product.id,
                vendorId,
                vendorSlug,
                deliveryFeeCents: vendor?.deliveryFee ?? null,
                name: product.name,
                priceCents: product.priceCents,
                image: product.image || undefined,
                isAlcohol: Boolean(product.isAlcohol),
              },
              1,
            );
            void trackVisitorEvent({
              type: "product_add",
              productId: product.id,
              vendorId,
              vendorSlug,
              meta: {
                name: product.name,
                category: product.category || null,
                vendorName: vendor?.name || null,
              },
            });
            pushEcommerceEvent("add_to_cart", {
              currency: "ZAR",
              value: product.priceCents / 100,
              items: [
                {
                  item_id: product.id,
                  item_name: product.name,
                  item_brand: vendor?.name || undefined,
                  item_category: product.category || undefined,
                  item_variant: vendor?.slug || undefined,
                  price: product.priceCents / 100,
                  quantity: 1,
                },
              ],
            });
            openCart();
          }}
        >
          Add
        </Button>
      </div>
    </article>
  );
}
