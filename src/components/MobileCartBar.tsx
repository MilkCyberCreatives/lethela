"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/store/cart";

export default function MobileCartBar() {
  const count = useCart((state) => state.count());
  const subtotal = useCart((state) => state.subtotal());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || count === 0) return null;
  return (
    <Link
      href="/checkout"
      className="fixed inset-x-4 bottom-4 z-40 flex min-h-12 items-center justify-between rounded-xl bg-lethela-primary px-4 text-sm font-semibold text-white shadow-xl md:hidden"
      aria-label={`Open cart with ${count} items`}
    >
      <span>
        {count} item{count === 1 ? "" : "s"}
      </span>
      <span>View cart · R {(subtotal / 100).toFixed(2)}</span>
    </Link>
  );
}
