// src/components/CartButton.tsx
"use client";

import { useEffect, useState } from "react";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Button
      onClick={openCart}
      aria-label="Open cart"
      className="relative h-11 w-11 border-transparent bg-lethela-secondary px-0 text-white hover:bg-lethela-secondary focus-visible:ring-2 focus-visible:ring-lethela-primary sm:h-10 sm:w-auto sm:px-4"
    >
      <ShoppingCart className="h-5 w-5 text-white" />

      {mounted && count > 0 && (
        <span
          className="absolute -right-2 -top-2 rounded-full bg-lethela-primary px-1.5 py-1 text-[10px] leading-none text-white"
          aria-label={`${count} items in cart`}
        >
          {count}
        </span>
      )}
    </Button>
  );
}
