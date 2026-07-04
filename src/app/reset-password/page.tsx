import { Suspense } from "react";
import PageShell from "@/components/PageShell";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <PageShell contentClassName="max-w-md">
      <Suspense
        fallback={
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="h-6 w-40 animate-pulse rounded bg-white/10" />
            <div className="mt-4 h-11 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-11 animate-pulse rounded bg-white/10" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </PageShell>
  );
}
