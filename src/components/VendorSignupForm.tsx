"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pushDataLayerEvent, trackVisitorEvent } from "@/lib/visitor";

export default function VendorSignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    storeName: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: keyof typeof form, value: string) {
    setForm((state) => ({ ...state, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.password.length < 8) {
      setError("Use a password with at least 8 characters.");
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lethela-primary">
            Start selling
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Create your vendor profile</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            This first step is short. After this, you will complete store details, township, trading
            hours, products, banking and documents in your dashboard before approval.
          </p>
        </div>
        <div className="hidden rounded-full bg-emerald-50 p-3 text-emerald-700 sm:block">
          <ShieldCheck className="h-5 w-5" />
        </div>
      </div>

      <form className="mt-6 grid gap-4" onSubmit={submit}>
        <Input
          placeholder="Full name"
          value={form.fullName}
          onChange={(event) => update("fullName", event.target.value)}
          required
          className="border-slate-300 bg-white text-slate-950"
          autoComplete="name"
        />
        <Input
          type="email"
          placeholder="Email address"
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
          required
          className="border-slate-300 bg-white text-slate-950"
          autoComplete="email"
        />
        <Input
          placeholder="Store name"
          value={form.storeName}
          onChange={(event) => update("storeName", event.target.value)}
          required
          className="border-slate-300 bg-white text-slate-950"
        />
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

        <Button
          type="submit"
          className="h-11 bg-lethela-primary text-white hover:opacity-90"
          disabled={loading}
        >
          {loading ? "Creating profile..." : "Create profile and open dashboard"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <p className="mt-4 text-sm text-slate-600">
        Already started?{" "}
        <Link href="/vendors/signin" className="font-semibold text-lethela-primary underline">
          Sign in to continue
        </Link>
        .
      </p>
    </div>
  );
}
