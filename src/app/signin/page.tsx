import { Suspense } from "react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import SignInForm from "@/components/auth/SignInForm";
import { getOrderWhatsAppPhone } from "@/lib/whatsapp-order";

export default function SignInPage() {
  return (
    <PageShell contentClassName="max-w-3xl">
      <Suspense fallback={<SignInSkeleton />}>
        <SignInForm />
      </Suspense>
    </PageShell>
  );
}

function SignInSkeleton() {
  const whatsappHref = `https://wa.me/${getOrderWhatsAppPhone()}`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm md:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lethela-primary">
        Secure access
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-950">Sign in to Lethela</h1>
      <p className="mt-2 text-sm text-slate-600">
        Loading the secure form. If it takes too long, refresh or use WhatsApp support.
      </p>
      <div className="mt-5 grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-10 rounded-lg bg-slate-100" />
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-3">
          <input
            type="email"
            placeholder="you@example.co.za"
            className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-black"
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Your password"
            className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-black"
            autoComplete="current-password"
          />
          <button
            type="button"
            className="h-11 rounded-md bg-lethela-primary text-sm font-semibold text-white"
          >
            Sign in
          </button>
        </div>
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
        <Link
          href="/vendors/signin"
          className="rounded-lg border border-slate-200 px-3 py-2 hover:border-lethela-primary"
        >
          Vendor sign-in
        </Link>
        <Link
          href="/rider/dashboard"
          className="rounded-lg border border-slate-200 px-3 py-2 hover:border-lethela-primary"
        >
          Rider sign-in
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
