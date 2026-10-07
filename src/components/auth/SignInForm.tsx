"use client";

import Link from "next/link";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Bike, ShoppingBag, Store } from "lucide-react";
import {
  AuthAlert,
  AuthDivider,
  AuthField,
  GoogleMark,
  PasswordInput,
  authInputClass,
  authLinkClass,
  authPrimaryButtonClass,
  authSecondaryButtonClass,
} from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { safePostLoginPath, type AppRole } from "@/lib/auth-roles";
import { REGISTRATION_PASSWORD_MIN_LENGTH } from "@/lib/registration-policy";
import { rememberOAuthIntent } from "@/lib/google-auth";

const NEW_ACCOUNT_LINKS = [
  { href: "/signup", label: "Customer", detail: "Order", Icon: ShoppingBag },
  { href: "/vendors/register", label: "Vendor", detail: "Sell", Icon: Store },
  { href: "/rider", label: "Rider", detail: "Deliver", Icon: Bike },
] as const;

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
      {verification ? (
        <AuthAlert tone={verification === "success" ? "success" : "info"} className="mb-5">
          <p>{verificationMessages[verification]}</p>
          {verification !== "success" ? (
            <button
              type="button"
              onClick={() => void resendVerification()}
              disabled={resending}
              className="mt-1.5 font-semibold underline underline-offset-2 disabled:opacity-50"
            >
              {resending ? "Sending..." : "Resend verification email"}
            </button>
          ) : null}
        </AuthAlert>
      ) : null}
      {message ? (
        <AuthAlert tone="info" className="mb-5">
          {message}
        </AuthAlert>
      ) : null}
      {resendNotice ? (
        <AuthAlert tone="success" className="mb-5">
          {resendNotice}
        </AuthAlert>
      ) : null}

      {googleEnabled ? (
        <>
          <Button
            type="button"
            variant="outline"
            className={authSecondaryButtonClass}
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
          <AuthDivider label="or sign in with email" />
        </>
      ) : null}

      <form className="grid gap-4" onSubmit={submit}>
        <AuthField label="Email address" htmlFor="signin-email">
          <Input
            id="signin-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.co.za"
            className={authInputClass}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </AuthField>
        <AuthField
          label="Password"
          htmlFor="signin-password"
          aside={
            <Link href="/forgot-password" className={`text-sm ${authLinkClass}`}>
              Forgot password?
            </Link>
          }
        >
          <PasswordInput
            id="signin-password"
            autoComplete="current-password"
            minLength={REGISTRATION_PASSWORD_MIN_LENGTH}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </AuthField>
        {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
        <Button type="submit" className={`mt-1 ${authPrimaryButtonClass}`} disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <p className="text-sm font-semibold text-slate-900">New to Lethela?</p>
        <p className="mt-1 text-sm text-slate-600">Create a free account in under a minute.</p>
        <ul className="mt-4 grid grid-cols-3 gap-2">
          {NEW_ACCOUNT_LINKS.map(({ href, label, detail, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex h-full flex-col items-center gap-1 rounded-xl border border-slate-200 px-2 py-3 text-center transition-colors hover:border-lethela-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lethela-primary/30"
              >
                <Icon className="h-5 w-5 text-lethela-primary" aria-hidden="true" />
                <span className="text-sm font-semibold text-slate-900">{label}</span>
                <span className="text-xs text-slate-500">{detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
