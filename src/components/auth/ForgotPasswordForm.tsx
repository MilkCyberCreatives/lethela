"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import {
  AuthAlert,
  AuthField,
  authInputClass,
  authLinkClass,
  authPrimaryButtonClass,
} from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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

      setMessage(
        json?.message ?? "If an account exists for that email, a reset link has been sent.",
      );
      setResetUrl(typeof json?.resetUrl === "string" ? json.resetUrl : null);
    } catch {
      setError("Could not start password reset.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="text-slate-950">
      <form className="grid gap-4" onSubmit={submit}>
        <AuthField label="Email address" htmlFor="recovery-email">
          <Input
            id="recovery-email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.co.za"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={authInputClass}
            autoComplete="email"
            required
          />
        </AuthField>
        {message ? <AuthAlert tone="success">{message}</AuthAlert> : null}
        {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
        {resetUrl ? (
          <AuthAlert tone="info">
            Local reset link:{" "}
            <a href={resetUrl} className="font-semibold underline">
              Open reset page
            </a>
          </AuthAlert>
        ) : null}
        <Button
          type="submit"
          disabled={submitting || !email.trim()}
          className={`mt-1 ${authPrimaryButtonClass}`}
        >
          {submitting ? "Sending..." : "Send reset link"}
        </Button>
      </form>
      <p className="mt-6 border-t border-slate-200 pt-5 text-center text-sm text-slate-600">
        <Link href="/signin" className={`inline-flex items-center gap-1.5 ${authLinkClass}`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
