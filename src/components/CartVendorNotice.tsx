"use client";

import { useEffect, useState } from "react";

export default function CartVendorNotice() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let timeout = 0;
    const show = () => {
      setVisible(true);
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setVisible(false), 6000);
    };
    window.addEventListener("lethela:cart-vendor-conflict", show);
    return () => {
      window.removeEventListener("lethela:cart-vendor-conflict", show);
      window.clearTimeout(timeout);
    };
  }, []);
  if (!visible) return null;
  return (
    <div
      role="status"
      className="fixed right-4 top-24 z-[80] max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 shadow-xl"
    >
      Your cart contains items from another vendor. Complete or clear that order before starting a
      separate vendor order.
      <button
        type="button"
        className="ml-2 font-semibold underline"
        onClick={() => setVisible(false)}
      >
        Dismiss
      </button>
    </div>
  );
}
