// src/app/vendor/apply/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function VendorApplyPage() {
  const [email, setEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const next = useSearchParams().get("next") || "/vendor/dashboard";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const r = await fetch("/api/vendor/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, passcode }),
    });
    const j = await r.json();
    if (!j.ok) return setErr(j.error || "Login failed");
    router.push(next);
  }

  return (
    <main className="container max-w-lg py-10">
      <h1 className="text-2xl font-bold">Vendor Access</h1>
      <p className="text-sm text-white/70 mt-1">
        Enter your email and passcode to access the vendor dashboard.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm">Email</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-white text-black" />
        </div>
        <div>
          <label className="text-sm">Passcode</label>
          <Input value={passcode} onChange={(e) => setPasscode(e.target.value)} required type="password" className="bg-white text-black" />
        </div>
        {err && <p className="text-sm text-red-300">{err}</p>}
        <Button type="submit" className="bg-lethela-primary">Continue</Button>
      </form>
    </main>
  );
}
