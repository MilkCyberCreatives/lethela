// src/components/AgeGate.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function AgeGate({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(!document.cookie.split("; ").some((cookie) => cookie === "age_verified=1"));
  }, []);

  function accept() {
    document.cookie = "age_verified=1; path=/; max-age=2592000"; // 30 days
    setOpen(false);
    onClose?.();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[999] flex items-center justify-center p-4">
      <div className="rounded-xl bg-[#0E1236] border border-white/10 p-6 max-w-md w-full">
        <h2 className="text-xl font-bold">
          You must be 18 years or older to view liquor products.
        </h2>
        <p className="text-sm text-white/70 mt-2">
          Liquor may only be sold to adults by approved licensed vendors. Valid ID may be required
          on delivery.
        </p>
        <div className="mt-4 flex gap-3">
          <Button onClick={accept} className="bg-lethela-primary">
            Yes, I am 18+
          </Button>
          <button
            type="button"
            className="inline-flex items-center rounded-md px-4 py-2 border border-white/20 text-sm"
            onClick={() => {
              setOpen(false);
              onClose?.();
            }}
          >
            No, close
          </button>
        </div>
      </div>
    </div>
  );
}
