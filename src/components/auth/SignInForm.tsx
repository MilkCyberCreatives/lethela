"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Building2, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getOrderWhatsAppPhone } from "@/lib/whatsapp-order";

type Tab = "customer" | "vendor" | "rider" | "admin";

const TABS: Array<{ id: Tab; label: string; href?: string; icon: typeof ShoppingBag }> = [
  { id: "customer", label: "Customer", icon: ShoppingBag },
  { id: "vendor", label: "Vendor", href: "/vendors/signin", icon: Building2 },
  { id: "rider", label: "Rider", href: "/rider/dashboard", icon: Truck },
  { id: "admin", label: "Admin", icon: ShieldCheck },
];

function friendlyError(value: string | undefined) {
  if (!value) return "We could not sign you in. Please check your email and password.";
  if (value === "CredentialsSignin") return "Those login details do not match our records.";
  return value;
}

export default function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const whatsappHref = `https://wa.me/${getOrderWhatsAppPhone()}`;
  const requestedTab = params?.get("tab") as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(
    requestedTab && TABS.some((tab) => tab.id === requestedTab) ? requestedTab : "customer",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rawCallbackUrl = params?.get("callbackUrl") ?? (activeTab === "admin" ? "/admin" : "/");
  const callbackUrl =
    rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//") ? rawCallbackUrl : "/";
  const message = params?.get("message");
  const tabConfig = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];
  const ActiveIcon = tabConfig.icon;

  async function submit() {
    setError(null);
    setSubmitting(true);
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });
    setSubmitting(false);
    if (res?.ok) {
      router.push(callbackUrl);
      return;
    }
    setError(friendlyError(res?.error ?? undefined));
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm md:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lethela-primary">
        Secure access
      </p>
      <h1 className="mt-2 text-3xl font-semibold">Sign in to Lethela</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Customers, vendors, riders and admin users can access the right workspace from here.
      </p>
      {message ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {message}
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.href) {
                  router.push(tab.href);
                  return;
                }
                setActiveTab(tab.id);
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                active
                  ? "border-lethela-primary bg-lethela-primary text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-lethela-primary/50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <ActiveIcon className="h-4 w-4 text-lethela-primary" />
          {tabConfig.label} sign in
        </div>
        <div className="grid gap-3">
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
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-slate-300 bg-white text-black"
            autoComplete="current-password"
          />
          <Button onClick={submit} disabled={submitting} className="bg-lethela-primary text-white">
            {submitting ? "Signing in..." : `Sign in as ${tabConfig.label}`}
          </Button>
        </div>
        {error ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
        <Link
          href="/forgot-password"
          className="rounded-lg border border-slate-200 px-3 py-2 hover:border-lethela-primary"
        >
          Forgot password
        </Link>
        <Link
          href="/signup"
          className="rounded-lg border border-slate-200 px-3 py-2 hover:border-lethela-primary"
        >
          Create customer account
        </Link>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-slate-200 px-3 py-2 hover:border-lethela-primary"
        >
          WhatsApp support
        </a>
      </div>
    </div>
  );
}
