import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import SignInForm from "@/components/auth/SignInForm";
import { isGoogleAuthEnabled } from "@/lib/google-auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in securely to your Lethela account.",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  const googleEnabled = isGoogleAuthEnabled();
  return (
    <AuthShell
      title="Welcome back"
      supportingText="Sign in to order, run your store or manage your deliveries."
    >
      <SignInForm googleEnabled={googleEnabled} />
    </AuthShell>
  );
}
