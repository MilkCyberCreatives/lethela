"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
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
          json?.error?.fieldErrors?.confirmPassword?.[0] ||
          json?.error?.fieldErrors?.password?.[0];
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
    <>
      <h1 className="text-2xl font-bold">Reset password</h1>
      <p className="mt-2 text-sm text-white/70">Choose a new password for your Lethela account.</p>

      <div className="mt-6 space-y-3">
        <Input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="bg-white text-black"
        />
        <Input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="bg-white text-black"
        />
        <Button
          onClick={submit}
          disabled={submitting || !password.trim() || !confirmPassword.trim() || !token}
          className="bg-lethela-primary"
        >
          {submitting ? "Updating..." : "Update password"}
        </Button>
        {message ? <p className="text-sm text-white/80">{message}</p> : null}
        {error ? <p className="text-sm text-red-200">{error}</p> : null}
        {!token ? (
          <p className="text-sm text-red-200">This reset link is missing or invalid.</p>
        ) : null}
        <p className="text-sm text-white/70">
          <Link href="/signin" className="underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </>
  );
}
