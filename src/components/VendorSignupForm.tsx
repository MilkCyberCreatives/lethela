"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pushDataLayerEvent, trackVisitorEvent } from "@/lib/visitor";
import { signIn } from "next-auth/react";

export default function VendorSignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    storeName: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: keyof typeof form, value: string | boolean) {
    setForm((state) => ({ ...state, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
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
      const response = await fetch("/api/vendors/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Could not create your vendor profile.");
      }

      void trackVisitorEvent({
        type: "vendor_application_submit",
        vendorSlug: json.vendor?.slug,
        meta: { storeName: form.storeName },
      });
      pushDataLayerEvent("generate_lead", {
        lead_type: "vendor_profile_started",
        vendor_slug: json.vendor?.slug,
      });

      const login = await signIn("credentials", {
        redirect: false,
        email: form.email,
        password: form.password,
      });
      if (!login?.ok) throw new Error("Account created. Please sign in to continue.");

      router.push(json.redirectTo || "/vendors/dashboard");
      router.refresh();
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not create your vendor profile.",
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
            value={form.fullName}
            onChange={(event) => update("fullName", event.target.value)}
            required
            className="border-slate-300 bg-white text-slate-950"
            autoComplete="name"
          />
        </Field>
        <Field label="Email address">
          <Input
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            required
            className="border-slate-300 bg-white text-slate-950"
            autoComplete="email"
          />
        </Field>
        <Field label="Store name">
          <Input
            placeholder="Store name"
            value={form.storeName}
            onChange={(event) => update("storeName", event.target.value)}
            required
            className="border-slate-300 bg-white text-slate-950"
            autoComplete="organization"
          />
        </Field>
        <Field label="Create password">
          <Input
            type="password"
            placeholder="Create password"
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
            required
            minLength={8}
            className="border-slate-300 bg-white text-slate-950"
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm password">
          <Input
            type="password"
            placeholder="Confirm password"
            value={form.confirmPassword}
            onChange={(event) => update("confirmPassword", event.target.value)}
            required
            minLength={8}
            className="border-slate-300 bg-white text-slate-950"
            autoComplete="new-password"
          />
        </Field>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.acceptTerms}
            onChange={(event) => update("acceptTerms", event.target.checked)}
            className="mt-1"
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

        <Button
          type="submit"
          className="h-11 bg-lethela-primary text-white hover:opacity-90"
          disabled={loading}
        >
          {loading ? "Creating vendor account..." : "Create vendor account"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>

      {error ? (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}

      <p className="mt-4 text-sm text-slate-600">
        Already registered?{" "}
        <Link href="/vendors/signin" className="font-semibold text-lethela-primary underline">
          Sign in to continue
        </Link>
        .
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
