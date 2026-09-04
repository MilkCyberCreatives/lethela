"use client";

import Link from "next/link";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { safePostLoginPath, type AppRole } from "@/lib/auth-roles";
import { REGISTRATION_PASSWORD_MIN_LENGTH } from "@/lib/registration-policy";
import { rememberOAuthIntent } from "@/lib/google-auth";

type VerificationState = "sent" | "success" | "invalid" | "";

const verificationMessages: Record<Exclude<VerificationState, "">, string> = {
  sent: "Check your email and open the verification link before signing in.",
  success: "Your email has been verified. You can sign in now.",
  invalid:
    "That verification link is invalid or expired. Enter your email below and request a new one.",
};

export default function SignInForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [requestedPath, setRequestedPath] = useState("");
  const [message, setMessage] = useState("");
  const [verification, setVerification] = useState<VerificationState>("");
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRequestedPath(params.get("callbackUrl") || params.get("next") || "");
    setMessage(params.get("message") || "");
    const state = params.get("verification");
    setVerification(state === "sent" || state === "success" || state === "invalid" ? state : "");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn("credentials", { redirect: false, email, password });
      if (!result?.ok) {
        throw new Error(
          "We could not sign you in. Check your details, verify your email, or try again later.",
        );
      }
      const session = await getSession();
      const role = (session?.user?.role || "CUSTOMER") as AppRole;
      router.replace(safePostLoginPath(role, requestedPath));
      router.refresh();
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : "We could not sign you in. Check your details or try again later.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function resendVerification() {
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    setResending(true);
    setError(null);
    setResendNotice(null);
    try {
      const response = await fetch("/api/auth/verify-email/resend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Could not resend verification email.");
      setResendNotice(data?.message || "A verification email has been sent.");
    } catch (resendError) {
      setError(
        resendError instanceof Error ? resendError.message : "Could not resend verification email.",
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <div>
      {googleEnabled ? (
        <>
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
            onClick={() => {
              rememberOAuthIntent("customer");
              void signIn("google", {
                callbackUrl: safePostLoginPath("CUSTOMER", requestedPath),
              });
            }}
          >
            <GoogleMark />
            Continue with Google
          </Button>
          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or use email
            <span className="h-px flex-1 bg-slate-200" />
          </div>
        </>
      ) : null}
      {verification ? (
        <div
          role="status"
          className={`mb-4 rounded-lg border p-3 text-sm ${
            verification === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          <p>{verificationMessages[verification]}</p>
          {verification !== "success" ? (
            <button
              type="button"
              onClick={() => void resendVerification()}
              disabled={resending}
              className="mt-2 font-semibold underline underline-offset-2 disabled:opacity-50"
            >
              {resending ? "Sending..." : "Resend verification email"}
            </button>
          ) : null}
        </div>
      ) : null}
      {message ? (
        <p
          role="status"
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {message}
        </p>
      ) : null}
      {resendNotice ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {resendNotice}
        </p>
      ) : null}
      <form className="grid gap-4" onSubmit={submit}>
        <label className="grid gap-1.5 text-sm font-medium text-slate-800">
          <span>Email</span>
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-800">
          <span>Password</span>
          <Input
            type="password"
            autoComplete="current-password"
            minLength={REGISTRATION_PASSWORD_MIN_LENGTH}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="h-11 bg-lethela-primary text-white" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <div className="mt-5 grid gap-2 text-sm text-slate-600">
        <Link href="/forgot-password" className="underline">
          Forgot password?
        </Link>
        <Link href="/signup" className="underline">
          Create customer account
        </Link>
        <Link href="/vendors/register" className="underline">
          Create vendor account
        </Link>
        <Link href="/rider" className="underline">
          Create rider account
        </Link>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="mr-2 h-5 w-5">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.72-.06-1.25-.2-1.8H12v3.48h5.52a4.75 4.75 0 0 1-2.05 3.03l-.02.12 2.98 2.31.2.02c1.83-1.7 2.97-4.18 2.97-7.16Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.69 0 4.94-.88 6.59-2.61l-3.12-2.45c-.84.57-1.97.97-3.47.97a6.03 6.03 0 0 1-5.7-4.17l-.11.01-3.1 2.4-.04.1A9.95 9.95 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.3 13.74A6.2 6.2 0 0 1 5.97 12c0-.61.11-1.2.32-1.74v-.12L3.15 7.7l-.1.05A10 10 0 0 0 2 12c0 1.53.35 2.98 1.05 4.25l3.25-2.51Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.09c1.87 0 3.13.81 3.85 1.48l2.8-2.74A9.42 9.42 0 0 0 12 2a9.95 9.95 0 0 0-8.95 5.75l3.24 2.51A6.05 6.05 0 0 1 12 6.09Z"
      />
    </svg>
  );
}
