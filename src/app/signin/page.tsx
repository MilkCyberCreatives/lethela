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
      <div className="h-7 w-44 rounded bg-slate-100" />
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
