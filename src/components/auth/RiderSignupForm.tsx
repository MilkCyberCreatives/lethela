"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RiderSignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/riders/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok)
        throw new Error(data.error || "Could not create rider account.");
      const login = await signIn("credentials", {
        redirect: false,
        email: form.email,
        password: form.password,
      });
      if (!login?.ok) throw new Error("Account created. Please sign in to continue.");
      setSuccess("Rider account created. Opening your dashboard...");
      window.setTimeout(() => {
        router.replace("/rider/dashboard");
        router.refresh();
      }, 500);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not create rider account.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Full name">
          <Input
            placeholder="Full name"
            autoComplete="name"
            required
            value={form.fullName}
            onChange={(event) => setForm((value) => ({ ...value, fullName: event.target.value }))}
          />
        </Field>
        <Field label="Email address">
          <Input
            type="email"
            placeholder="Email address"
            autoComplete="email"
            required
            value={form.email}
            onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
          />
        </Field>
        <Field label="Mobile number">
          <Input
            type="tel"
            placeholder="Mobile number"
            autoComplete="tel"
            required
            value={form.phone}
            onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))}
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            placeholder="Password"
            autoComplete="new-password"
            minLength={8}
            required
            value={form.password}
            onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))}
          />
        </Field>
        <Field label="Confirm password">
          <Input
            type="password"
            placeholder="Confirm password"
            autoComplete="new-password"
            minLength={8}
            required
            value={form.confirmPassword}
            onChange={(event) =>
              setForm((value) => ({ ...value, confirmPassword: event.target.value }))
            }
          />
        </Field>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-1"
            required
            checked={form.acceptTerms}
            onChange={(event) =>
              setForm((value) => ({ ...value, acceptTerms: event.target.checked }))
            }
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
        <Button type="submit" className="h-11 bg-lethela-primary text-white" disabled={loading}>
          {loading ? "Creating rider account..." : "Create rider account"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        Already registered?{" "}
        <Link href="/signin" className="font-semibold underline">
          Sign in
        </Link>
      </p>
    </div>
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
