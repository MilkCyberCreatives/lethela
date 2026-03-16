"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim()) return;

    setSubmitting(true);
    setError(null);
    setMessage(null);
    setResetUrl(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok) {
        setError(json?.error ?? "Could not start password reset.");
        return;
      }

      setMessage(json?.message ?? "If an account exists for that email, a reset link has been sent.");
      setResetUrl(typeof json?.resetUrl === "string" ? json.resetUrl : null);
    } catch {
      setError("Could not start password reset.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold">Forgot password</h1>
      <p className="mt-2 text-sm text-white/70">Enter your email and we will send you a reset link.</p>

      <div className="mt-6 space-y-3">
        <Input
          type="email"
          placeholder="you@example.co.za"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="bg-white text-black"
        />
        <Button onClick={submit} disabled={submitting || !email.trim()} className="bg-lethela-primary">
          {submitting ? "Sending..." : "Send reset link"}
        </Button>
        {message ? <p className="text-sm text-white/80">{message}</p> : null}
        {error ? <p className="text-sm text-red-200">{error}</p> : null}
        {resetUrl ? (
          <p className="text-sm text-white/70">
            Local reset link:{" "}
            <a href={resetUrl} className="underline">
              Open reset page
            </a>
          </p>
        ) : null}
        <p className="text-sm text-white/70">
          Remembered it?{" "}
          <Link href="/signin" className="underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </>
  );
}
