// /src/app/signup/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, LifeBuoy, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MainHeader from "@/components/MainHeader";
import { useRouter } from "next/navigation";
import { getOrderWhatsAppPhone } from "@/lib/whatsapp-order";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const whatsappHref = `https://wa.me/${getOrderWhatsAppPhone()}`;

  const submit = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please add your full name, email address and password.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password, role: "USER" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const fieldError =
          data?.error?.fieldErrors?.email?.[0] ||
          data?.error?.fieldErrors?.password?.[0] ||
          data?.error?.fieldErrors?.name?.[0];
        setError(fieldError || data?.error || "We could not create your account.");
        return;
      }
      router.push("/signin?message=Account created. Please sign in to continue.");
    } catch {
      setError("We could not create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <MainHeader />
      <section className="container grid max-w-5xl items-center gap-8 py-10 md:grid-cols-[0.9fr,1.1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lethela-primary">
            Customer account
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            Create your Lethela account.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Keep it quick: full name, email and password. You can still browse and use WhatsApp
            checkout without creating an account first.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-2xl font-semibold">Sign up</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This creates a customer account for ordering and tracking.
          </p>
          <div className="mt-6 space-y-3">
            <Input
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-slate-300 bg-white text-black"
              autoComplete="name"
            />
            <Input
              type="email"
              placeholder="you@example.co.za"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-slate-300 bg-white text-black"
              autoComplete="email"
            />
            <Input
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-slate-300 bg-white text-black"
              autoComplete="new-password"
            />

            <Button
              onClick={submit}
              disabled={submitting || !name.trim() || !email.trim() || !password.trim()}
              className="w-full bg-lethela-primary text-white"
            >
              <UserRound className="mr-2 h-4 w-4" />
              {submitting ? "Creating..." : "Create account"}
            </Button>
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="grid gap-2 pt-2 text-sm text-slate-600 md:grid-cols-2">
              <Link
                href="/signin"
                className="inline-flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 hover:border-lethela-primary"
              >
                Sign in instead
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 hover:border-lethela-primary"
              >
                WhatsApp help
                <LifeBuoy className="h-4 w-4" />
              </a>
            </div>

            <div className="grid gap-2 pt-2 text-sm text-slate-600">
              <Link href="/vendors/register" className="underline underline-offset-4">
                Register a vendor store
              </Link>
              <Link href="/riders/apply" className="underline underline-offset-4">
                Apply to become a rider
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
