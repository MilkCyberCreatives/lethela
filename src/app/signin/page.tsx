import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import SignInForm from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in securely to your Lethela account.",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
  return (
    <AuthShell
      title="Welcome back"
      supportingText="One sign-in for shopping, selling, deliveries and owner access."
    >
      <SignInForm googleEnabled={googleEnabled} />
    </AuthShell>
  );
}
