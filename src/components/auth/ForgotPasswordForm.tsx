"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
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
      <form className="grid gap-3" onSubmit={submit}>
        <label htmlFor="recovery-email" className="grid gap-1.5 text-sm font-medium text-slate-800">
          <span>Email address</span>
          <Input
            id="recovery-email"
            type="email"
            placeholder="you@example.co.za"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="border-slate-300 bg-white text-black"
            autoComplete="email"
            required
          />
        </label>
        <Button
          type="submit"
          disabled={submitting || !email.trim()}
          className="h-11 bg-lethela-primary text-white"
        >
          <Mail className="mr-2 h-4 w-4" />
          {submitting ? "Sending..." : "Send reset link"}
        </Button>
        {message ? (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
          >
            {message}
          </div>
        ) : null}
        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
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
      </form>
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
