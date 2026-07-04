"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = useMemo(() => params?.get("token")?.trim() || "", [params]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!token) {
      setError("Reset link is missing or invalid.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok) {
        const fieldError =
          json?.error?.fieldErrors?.confirmPassword?.[0] || json?.error?.fieldErrors?.password?.[0];
        setError(fieldError || json?.error || "Could not reset password.");
        return;
      }

      setMessage(json?.message ?? "Password updated. You can now sign in.");
      setPassword("");
      setConfirmPassword("");
      window.setTimeout(() => router.push("/signin"), 1200);
    } catch {
      setError("Could not reset password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm md:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lethela-primary">
        Secure reset
      </p>
      <h1 className="mt-2 text-3xl font-semibold">Choose a new password</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Use at least 8 characters. Keep it different from passwords you use elsewhere.
      </p>

      <div className="mt-6 grid gap-3">
        <Input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="border-slate-300 bg-white text-black"
          autoComplete="new-password"
        />
        <Input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="border-slate-300 bg-white text-black"
          autoComplete="new-password"
        />
        <Button
          onClick={submit}
          disabled={submitting || !password.trim() || !confirmPassword.trim() || !token}
          className="bg-lethela-primary text-white"
        >
          <LockKeyhole className="mr-2 h-4 w-4" />
          {submitting ? "Updating..." : "Update password"}
        </Button>
        {message ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {!token ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            This reset link is missing or invalid.
          </p>
        ) : null}
      </div>
      <Link
        href="/signin"
        className="mt-5 inline-flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-lethela-primary"
      >
        Back to sign in
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
