"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!form.acceptTerms) {
      setError("Accept the Terms and Privacy Policy to continue.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        const fieldErrors = data?.error?.fieldErrors;
        throw new Error(
          fieldErrors?.email?.[0] ||
            fieldErrors?.phone?.[0] ||
            fieldErrors?.password?.[0] ||
            fieldErrors?.confirmPassword?.[0] ||
            (typeof data?.error === "string" ? data.error : "We could not create your account."),
        );
      }

      const login = await signIn("credentials", {
        redirect: false,
        email: form.email,
        password: form.password,
      });
      if (!login?.ok) throw new Error("Account created. Please sign in to continue.");

      const params = new URLSearchParams(window.location.search);
      const requested = params.get("next") || params.get("callbackUrl") || "/";
      const destination =
        requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
      setSuccess("Account created. You are signed in.");
      window.setTimeout(() => {
        router.replace(destination);
        router.refresh();
      }, 500);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "We could not create your account.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create your customer account"
      supportingText="Save your orders and checkout faster. You can add delivery details later."
    >
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Full name">
          <Input
            value={form.name}
            onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
            autoComplete="name"
            required
          />
        </Field>
        <Field label="Email address">
          <Input
            type="email"
            value={form.email}
            onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Mobile number">
          <Input
            type="tel"
            value={form.phone}
            onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))}
            autoComplete="tel"
            required
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            minLength={8}
            value={form.password}
            onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))}
            autoComplete="new-password"
            required
          />
        </Field>
        <Field label="Confirm password">
          <Input
            type="password"
            minLength={8}
            value={form.confirmPassword}
            onChange={(event) =>
              setForm((value) => ({ ...value, confirmPassword: event.target.value }))
            }
            autoComplete="new-password"
            required
          />
        </Field>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-1"
            checked={form.acceptTerms}
            onChange={(event) =>
              setForm((value) => ({ ...value, acceptTerms: event.target.checked }))
            }
            required
          />
          <span>
            I accept the{" "}
            <Link href="/terms" className="underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy-policy" className="underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {success ? (
          <p role="status" className="text-sm text-emerald-700">
            {success}
          </p>
        ) : null}
        <Button type="submit" className="h-11 bg-lethela-primary text-white" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        Already registered?{" "}
        <Link href="/signin" className="font-semibold underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-800">
      <span>{label}</span>
      {children}
    </label>
  );
}
