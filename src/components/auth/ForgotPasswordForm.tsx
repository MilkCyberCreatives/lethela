"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, LifeBuoy, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getOrderWhatsAppPhone } from "@/lib/whatsapp-order";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const whatsappHref = `https://wa.me/${getOrderWhatsAppPhone()}`;

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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm md:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lethela-primary">
        Account recovery
      </p>
      <h1 className="mt-2 text-3xl font-semibold">Reset your password</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Enter your account email. If it matches our records, we will send a secure reset link.
      </p>

      <div className="mt-6 grid gap-3">
        <Input
          type="email"
          placeholder="you@example.co.za"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="border-slate-300 bg-white text-black"
          autoComplete="email"
        />
        <Button
          onClick={submit}
          disabled={submitting || !email.trim()}
          className="bg-lethela-primary text-white"
        >
          <Mail className="mr-2 h-4 w-4" />
          {submitting ? "Sending..." : "Send reset link"}
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
        {resetUrl ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Local reset link:{" "}
            <a href={resetUrl} className="underline">
              Open reset page
            </a>
          </p>
        ) : null}
      </div>
      <div className="mt-5 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
        <Link
          href="/signin"
          className="inline-flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 hover:border-lethela-primary"
        >
          Back to sign in
          <ArrowRight className="h-4 w-4" />
        </Link>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 hover:border-lethela-primary"
        >
          WhatsApp support
          <LifeBuoy className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
