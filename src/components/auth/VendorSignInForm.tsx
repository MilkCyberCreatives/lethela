"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, LifeBuoy, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOrderWhatsAppPhone } from "@/lib/whatsapp-order";
import { Input } from "@/components/ui/input";

export default function VendorSignInForm() {
  const whatsappHref = `https://wa.me/${getOrderWhatsAppPhone()}`;
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [slug, setSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/vendor/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          slug: slug.trim() || undefined,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Vendor sign-in failed.");
      }

      router.push("/vendors/dashboard");
      router.refresh();
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Vendor sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="container grid min-h-screen max-w-5xl items-center gap-8 py-10 md:grid-cols-[0.9fr,1.1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lethela-primary">
            Vendor access
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            Manage your township store online.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Sign in with your vendor email and password. New vendors complete their profile from the
            dashboard, then submit for owner approval when everything is ready.
          </p>
          <div className="mt-6 grid gap-3 text-sm text-slate-600">
            {["Complete your profile", "Add products or menu items", "Submit for approval"].map(
              (item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-lethela-primary" />
                  {item}
                </div>
              ),
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lethela-primary">
            Store dashboard
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Vendor sign in</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use the same details you created on vendor registration.
          </p>

          <form className="mt-6 space-y-3" onSubmit={submit}>
            <Input
              type="email"
              placeholder="vendor@example.co.za"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="border-slate-300 bg-white text-black"
              autoComplete="email"
              required
            />
            <Input
              type="password"
              placeholder="Your vendor password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="border-slate-300 bg-white text-black"
              autoComplete="current-password"
              required
            />
            <Input
              placeholder="Store slug (optional if you manage multiple stores)"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className="border-slate-300 bg-white text-black"
            />
            <Button
              type="submit"
              disabled={submitting || !email.trim() || !password.trim()}
              className="w-full bg-lethela-primary text-white hover:opacity-90"
            >
              <Store className="mr-2 h-4 w-4" />
              {submitting ? "Signing in..." : "Open vendor dashboard"}
            </Button>
          </form>

          {error ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mt-5 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
            <Link
              href="/vendors/register"
              className="inline-flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 hover:border-lethela-primary"
            >
              Apply to become a vendor
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
      </section>
    </main>
  );
}
