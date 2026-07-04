"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminPortalKeyForm() {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const normalized = adminKey.trim();
    if (!normalized) return;

    setSubmitting(true);
    setError(null);
    const response = await fetch("/api/admin/access", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ adminKey: normalized }),
    });
    const json = await response.json().catch(() => ({}));
    setSubmitting(false);

    if (!response.ok || !json.ok) {
      setError(json.error || "Failed to enable admin access.");
      return;
    }

    router.push("/admin");
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/15 bg-white/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
        Owner approval
      </p>
      <p className="mt-2 text-sm leading-6 text-white/70">
        Enter the private admin key to unlock vendor approvals, rider approvals, refunds and support
        operations.
      </p>
      <div className="mt-4 grid gap-3">
        <Input
          type="password"
          placeholder="Enter admin approval key"
          value={adminKey}
          onChange={(event) => setAdminKey(event.target.value)}
          className="bg-white text-black"
        />
        <Button
          className="bg-lethela-primary text-white hover:opacity-90"
          onClick={submit}
          disabled={!adminKey.trim() || submitting}
        >
          <ShieldCheck className="mr-2 h-4 w-4" />
          {submitting ? "Continuing..." : "Continue with key"}
        </Button>
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
