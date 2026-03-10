// src/components/CartButton.tsx
"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "@/store/cart";
import { useUIStore } from "@/store/ui";
import { Button } from "@/components/ui/button";

/**
 * On-brand cart button:
 * - Solid NAVY (#080B27)
 * - White icon (never changes on hover)
 * - Subtle focus ring in brand primary
 */
export default function CartButton() {
  const count = useCart((state) => state.count());
  const openCart = useUIStore((state) => state.openCart);

  return (
    <Button
      onClick={openCart}
      aria-label="Open cart"
      className="relative bg-lethela-secondary text-white border-transparent
                 hover:bg-lethela-secondary focus-visible:ring-2 focus-visible:ring-lethela-primary"
    >
      {/* Icon stays white; no hover color changes */}
      <ShoppingCart className="h-5 w-5 text-white" />

      {count > 0 && (
        <span
          className="absolute -top-2 -right-2 rounded-full bg-lethela-primary text-white
                     text-[10px] leading-none px-1.5 py-1"
          aria-label={`${count} items in cart`}
        >
          {count}
        </span>
      )}
    </Button>
  );
}
