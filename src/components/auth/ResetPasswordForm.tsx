"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import {
  AuthAlert,
  AuthField,
  PasswordInput,
  authLinkClass,
  authPrimaryButtonClass,
} from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { REGISTRATION_PASSWORD_MIN_LENGTH } from "@/lib/registration-policy";

export default function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = useMemo(() => params?.get("token")?.trim() || "", [params]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
    <div className="text-slate-950">
      {!token ? (
        <AuthAlert tone="error" className="mb-5">
          This reset link is missing or invalid.{" "}
          <Link href="/forgot-password" className="font-semibold underline">
            Request a new link
          </Link>
          .
        </AuthAlert>
      ) : null}
      <form className="grid gap-4" onSubmit={submit}>
        <AuthField label="New password" htmlFor="new-password">
          <PasswordInput
            id="new-password"
            placeholder={`At least ${REGISTRATION_PASSWORD_MIN_LENGTH} characters`}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={REGISTRATION_PASSWORD_MIN_LENGTH}
            required
          />
        </AuthField>
        <AuthField label="Confirm new password" htmlFor="confirm-new-password">
          <PasswordInput
            id="confirm-new-password"
            placeholder="Enter the same password again"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            minLength={REGISTRATION_PASSWORD_MIN_LENGTH}
            required
          />
        </AuthField>
        {message ? <AuthAlert tone="success">{message}</AuthAlert> : null}
        {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}
        <Button
          type="submit"
          disabled={submitting || !password.trim() || !confirmPassword.trim() || !token}
          className={`mt-1 ${authPrimaryButtonClass}`}
        >
          {submitting ? "Updating..." : "Update password"}
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
