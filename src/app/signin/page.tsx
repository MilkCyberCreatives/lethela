import { Suspense } from "react";
import PageShell from "@/components/PageShell";
import SignInForm from "@/components/auth/SignInForm";

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
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
      <div className="mt-5 space-y-3">
        <div className="h-11 rounded-lg bg-slate-100" />
        <div className="h-11 rounded-lg bg-slate-100" />
        <div className="h-11 rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}
