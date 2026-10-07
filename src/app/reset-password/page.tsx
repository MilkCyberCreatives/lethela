import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { REGISTRATION_PASSWORD_MIN_LENGTH } from "@/lib/registration-policy";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata = buildNoIndexMetadata({
  title: "Choose a new password",
  description: "Set a new password for your Lethela account.",
  path: "/reset-password",
});

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      supportingText={`Use at least ${REGISTRATION_PASSWORD_MIN_LENGTH} characters, ideally one you do not use anywhere else.`}
    >
      <Suspense
        fallback={
          <div className="space-y-3">
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-200" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
