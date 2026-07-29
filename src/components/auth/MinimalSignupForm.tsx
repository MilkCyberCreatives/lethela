"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
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
    dashboard: "/profile?welcome=1",
    label: "Create account",
    loadingLabel: "Creating account...",
    signInHref: "/signin",
  },
  vendor: {
    endpoint: "/api/vendors/register",
    dashboard: "/vendors/dashboard?tab=profile&welcome=1",
    label: "Create vendor account",
    loadingLabel: "Creating vendor account...",
    signInHref: "/vendors/signin",
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

export default function MinimalSignupForm({ accountType }: { accountType: AccountType }) {
  const router = useRouter();
  const config = ACCOUNT_CONFIG[accountType];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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

      const login = await signIn("credentials", {
        redirect: false,
        email: email.trim(),
        password,
      });
      if (!login?.ok) {
        throw new Error("Your account was created. Sign in to continue your setup.");
      }

      router.replace(data.redirectTo || config.dashboard);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "We could not create your account.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        Only 2 fields. Complete your profile inside the dashboard.
      </div>

      <form className="grid gap-3.5" onSubmit={submit}>
        <div className="grid gap-1.5">
          <label className="text-sm font-medium text-slate-800" htmlFor="signup-email">
            Email address
          </label>
          <Input
            id="signup-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-slate-800" htmlFor="new-password">
              Create password
            </label>
            <span
              id="signup-password-guidance"
              className={`text-xs ${password && passwordReady ? "text-emerald-700" : "text-slate-500"}`}
            >
              {password && !passwordFits
                ? "Use a shorter password"
                : password && passwordReady
                  ? "Ready"
                  : `${passwordLength}/${REGISTRATION_PASSWORD_MIN_LENGTH} minimum`}
            </span>
          </div>
          <div className="relative">
            <Input
              id="new-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={REGISTRATION_PASSWORD_MIN_LENGTH}
              maxLength={REGISTRATION_PASSWORD_MAX_LENGTH}
              aria-describedby="signup-password-guidance"
              className="!pr-12"
              placeholder="Use a long, unique password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-slate-500 transition-colors hover:text-slate-900"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          className="h-11 bg-lethela-primary text-white hover:opacity-90"
          disabled={loading}
        >
          {loading ? config.loadingLabel : config.label}
          {!loading ? <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /> : null}
        </Button>

        <p className="text-xs leading-5 text-slate-500">
          By selecting {config.label}, you agree to Lethela&apos;s{" "}
          <Link href="/terms" className="font-medium underline underline-offset-2">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy-policy" className="font-medium underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <p className="mt-3 text-sm text-slate-600">
        Already registered?{" "}
        <Link href={config.signInHref} className="font-semibold text-lethela-primary underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
