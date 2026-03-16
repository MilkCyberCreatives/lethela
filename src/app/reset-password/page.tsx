import { Suspense } from "react";
import PageShell from "@/components/PageShell";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <PageShell contentClassName="max-w-md">
      <Suspense fallback={<div>Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </PageShell>
  );
}
