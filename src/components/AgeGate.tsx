// src/components/AgeGate.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function AgeGate({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(!document.cookie.split("; ").some((cookie) => cookie === "age_verified=1"));
  }, []);

  function accept() {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `age_verified=1; path=/; max-age=2592000; SameSite=Lax${secure}`;
    setOpen(false);
    onClose?.();
  }

  function decline() {
    setOpen(false);
    onClose?.();
    router.replace("/categories/groceries");
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      aria-describedby="age-gate-description"
    >
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-white/10 bg-[#0E1236] p-5 shadow-2xl sm:p-6">
        <h2 id="age-gate-title" className="text-xl font-bold">
          You must be 18 years or older to view liquor products.
        </h2>
        <p id="age-gate-description" className="mt-2 text-sm leading-6 text-white/70">
          Liquor may only be sold to adults by approved licensed vendors. Valid ID is required on
          delivery and the rider must refuse delivery when acceptable ID is not presented.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Button onClick={accept} className="min-h-11 w-full bg-lethela-primary" autoFocus>
            Yes, I am 18+
          </Button>
          <button
            type="button"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-white/20 px-4 py-2 text-center text-sm"
            onClick={decline}
          >
            No, leave liquor section
          </button>
        </div>
      </div>
    </div>
  );
}
