"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminPortalKeyForm() {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    const normalized = adminKey.trim();
    if (!normalized) return;

    setSubmitting(true);
    setError(null);
    setNotice(null);
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

    // First-time bootstrap promotes this account to owner and rotates its
    // session, which signs the current token out. Sending the user straight to
    // /admin would just bounce them back here, so ask them to re-authenticate
    // once; the admin-access cookie that was just set stays valid afterwards.
    if (json.promoted) {
      setAdminKey("");
      setNotice(
        json.message ||
          "Owner access enabled. Sign out and sign back in once to refresh your owner session, then open the admin dashboard.",
      );
      return;
    }

    router.push("/admin");
    router.refresh();
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
        {notice ? (
          <div className="grid gap-2 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-50">
            <span>{notice}</span>
            <Button
              type="button"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:border-lethela-primary hover:text-lethela-primary"
              onClick={() => signOut({ callbackUrl: "/signin?callbackUrl=/admin" })}
            >
              Sign out and sign back in
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
