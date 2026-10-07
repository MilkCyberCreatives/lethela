"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, MailCheck } from "lucide-react";
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
import {
  REGISTRATION_PASSWORD_MAX_LENGTH,
  REGISTRATION_PASSWORD_MIN_LENGTH,
  registrationPasswordFitsHashLimit,
  registrationPasswordIsValid,
  registrationPasswordLength,
} from "@/lib/registration-policy";
import { pushDataLayerEvent, trackVisitorEvent } from "@/lib/visitor";
import { safePostLoginPath } from "@/lib/auth-roles";
import { rememberOAuthIntent } from "@/lib/google-auth";

type AccountType = "customer" | "vendor" | "rider";

const ACCOUNT_CONFIG: Record<
  AccountType,
  {
    endpoint: string;
    dashboard: string;
    label: string;
    loadingLabel: string;
    signInHref: string;
  }
> = {
  customer: {
    endpoint: "/api/auth/register",
    dashboard: "/",
    label: "Create account",
    loadingLabel: "Creating account...",
    signInHref: "/signin",
  },
  vendor: {
    endpoint: "/api/vendors/register",
    dashboard: "/vendors/dashboard?tab=profile&welcome=1",
    label: "Create vendor account",
    loadingLabel: "Creating vendor account...",
    signInHref: "/signin?callbackUrl=/vendors/dashboard",
  },
  rider: {
    endpoint: "/api/riders/register",
    dashboard: "/rider/dashboard/profile?welcome=1",
    label: "Create rider account",
    loadingLabel: "Creating rider account...",
    signInHref: "/signin?tab=rider",
  },
};

type RegistrationResponse = {
  ok?: boolean;
  error?: string | { fieldErrors?: Record<string, string[]> };
  fieldErrors?: Record<string, string[]>;
  redirectTo?: string;
  verificationRequired?: boolean;
  vendor?: { slug?: string };
};

function responseError(data: RegistrationResponse) {
  const nestedErrors = typeof data.error === "object" ? data.error.fieldErrors : undefined;
  const fieldErrors = data.fieldErrors || nestedErrors;
  return (
    fieldErrors?.email?.[0] ||
    fieldErrors?.password?.[0] ||
    (typeof data.error === "string" ? data.error : "We could not create your account.")
  );
}

export default function MinimalSignupForm({
  accountType,
  googleEnabled = false,
}: {
  accountType: AccountType;
  googleEnabled?: boolean;
}) {
  const router = useRouter();
  const config = ACCOUNT_CONFIG[accountType];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const passwordLength = registrationPasswordLength(password);
  const passwordFits = registrationPasswordFitsHashLimit(password);
  const passwordReady = registrationPasswordIsValid(password);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!registrationPasswordIsValid(password)) {
      setError(
        `Use ${REGISTRATION_PASSWORD_MIN_LENGTH} to ${REGISTRATION_PASSWORD_MAX_LENGTH} characters for your password.`,
      );
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, acceptTerms: true }),
      });
      const data = (await response.json().catch(() => ({}))) as RegistrationResponse;
      if (!response.ok || !data.ok) throw new Error(responseError(data));

      if (accountType === "vendor") {
        void trackVisitorEvent({
          type: "vendor_application_submit",
          vendorSlug: data.vendor?.slug,
          meta: { signupStage: "account_created" },
        });
        pushDataLayerEvent("generate_lead", { lead_type: "vendor_account_created" });
      }

      if (data.verificationRequired) {
        setPassword("");
        setVerificationSent(true);
        return;
      }

      const login = await signIn("credentials", {
        redirect: false,
        email: email.trim(),
        password,
      });
      if (!login?.ok) {
        throw new Error("Your account was created. Sign in to continue your setup.");
      }

      const params = new URLSearchParams(window.location.search);
      const requestedPath = params.get("callbackUrl") || params.get("next");
      const destination =
        accountType === "customer"
          ? safePostLoginPath("CUSTOMER", requestedPath || data.redirectTo || config.dashboard)
          : data.redirectTo || config.dashboard;
      router.replace(destination);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "We could not create your account.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/auth/verify-email/resend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Could not resend verification email.");
      setNotice(data?.message || "A new verification email has been sent.");
    } catch (resendError) {
      setError(
        resendError instanceof Error ? resendError.message : "Could not resend verification email.",
      );
    } finally {
      setResending(false);
    }
  }

  if (verificationSent) {
    return (
      <div className="rounded-2xl border border-slate-200 p-5 text-slate-800">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
          <MailCheck className="h-5 w-5 text-emerald-700" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-slate-950">Check your email</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          We sent a verification link to <span className="font-semibold">{email}</span>. Open it
          within 24 hours, then sign in to continue your setup.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button asChild className={authPrimaryButtonClass}>
            <Link href={config.signInHref}>Go to sign in</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className={authSecondaryButtonClass}
            disabled={resending}
            onClick={() => void resendVerification()}
          >
            {resending ? "Sending..." : "Resend email"}
          </Button>
        </div>
        {notice ? (
          <AuthAlert tone="success" className="mt-4">
            {notice}
          </AuthAlert>
        ) : null}
        {error ? (
          <AuthAlert tone="error" className="mt-4">
            {error}
          </AuthAlert>
        ) : null}
      </div>
    );
  }

  const passwordHint =
    password && !passwordFits
      ? { text: "That password is too long. Use a shorter one.", tone: "text-red-700" }
      : passwordReady
        ? { text: "Good to go", tone: "text-emerald-700" }
        : {
            text: `At least ${REGISTRATION_PASSWORD_MIN_LENGTH} characters${
              password ? ` (${passwordLength} so far)` : ""
            }. No special rules.`,
            tone: "text-slate-500",
          };

  return (
    <div>
      {googleEnabled ? (
        <>
          <Button
            type="button"
            variant="outline"
            className={authSecondaryButtonClass}
            onClick={() => {
              rememberOAuthIntent(accountType);
              void signIn("google", { callbackUrl: config.dashboard });
            }}
          >
            <GoogleMark />
            Sign up with Google
          </Button>
          <AuthDivider label="or use your email" />
        </>
      ) : null}

      <form className="grid gap-4" onSubmit={submit}>
        <AuthField label="Email address" htmlFor="signup-email">
          <Input
            id="signup-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.co.za"
            className={authInputClass}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </AuthField>

        <AuthField
          label="Create password"
          htmlFor="new-password"
          hint={
            <p
              id="signup-password-guidance"
              aria-live="polite"
              className={`flex items-center gap-1.5 text-xs ${passwordHint.tone}`}
            >
              {passwordReady ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              {passwordHint.text}
            </p>
          }
        >
          <PasswordInput
            id="new-password"
            name="password"
            autoComplete="new-password"
            minLength={REGISTRATION_PASSWORD_MIN_LENGTH}
            maxLength={REGISTRATION_PASSWORD_MAX_LENGTH}
            aria-describedby="signup-password-guidance"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </AuthField>

        {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}

        <Button type="submit" className={`mt-1 ${authPrimaryButtonClass}`} disabled={loading}>
          {loading ? config.loadingLabel : config.label}
          {!loading ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
        </Button>

        <p className="text-center text-xs leading-5 text-slate-500">
          By continuing you agree to Lethela&apos;s{" "}
          <Link href="/terms" className="font-medium text-slate-700 underline underline-offset-2">
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy-policy"
            className="font-medium text-slate-700 underline underline-offset-2"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <p className="mt-6 border-t border-slate-200 pt-5 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href={config.signInHref} className={authLinkClass}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
