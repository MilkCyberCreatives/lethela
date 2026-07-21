import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import SignInForm from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in securely to your Lethela account.",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <AuthShell title="Sign in to Lethela" supportingText="Use your account email and password.">
      <SignInForm />
    </AuthShell>
  );
}
