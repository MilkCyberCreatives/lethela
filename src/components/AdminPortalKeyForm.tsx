"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
    <div className="mt-4 space-y-3">
      <Input
        type="password"
        placeholder="Enter admin approval key"
        value={adminKey}
        onChange={(event) => setAdminKey(event.target.value)}
        className="bg-white text-black"
      />
      <Button
        variant="outline"
        className="border-white/30 bg-transparent text-white hover:border-lethela-primary hover:text-lethela-primary"
        onClick={submit}
        disabled={!adminKey.trim() || submitting}
      >
        {submitting ? "Continuing..." : "Continue with key"}
      </Button>
      {error ? <p className="text-sm text-red-200">{error}</p> : null}
    </div>
  );
}
