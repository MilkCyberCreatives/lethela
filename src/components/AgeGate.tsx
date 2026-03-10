// src/components/AgeGate.tsx
"use client";

import { Button } from "@/components/ui/button";

export default function AgeGate({ onClose }: { onClose?: () => void }) {
  function accept() {
    document.cookie = "age_verified=1; path=/; max-age=2592000"; // 30 days
    onClose?.();
  }
  return (
    <div className="fixed inset-0 bg-black/70 z-[999] flex items-center justify-center p-4">
      <div className="rounded-xl bg-[#0E1236] border border-white/10 p-6 max-w-md w-full">
        <h2 className="text-xl font-bold">Are you 18 or older?</h2>
        <p className="text-sm text-white/70 mt-2">
          Alcohol may only be sold to persons 18 years or older. By continuing, you confirm you are of legal drinking age.
        </p>
        <div className="mt-4 flex gap-3">
          <Button onClick={accept} className="bg-lethela-primary">Yes, I am 18+</Button>
          <button
            className="inline-flex items-center rounded-md px-4 py-2 border border-white/20 text-sm"
            onClick={onClose}
          >
            No, close
          </button>
        </div>
      </div>
    </div>
  );
}
