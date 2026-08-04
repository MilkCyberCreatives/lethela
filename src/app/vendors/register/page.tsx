import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import OnboardingPreview from "@/components/auth/OnboardingPreview";
import VendorSignupForm from "@/components/VendorSignupForm";

export const metadata: Metadata = {
  title: "Create your vendor account",
  description: "Create a Lethela vendor account and complete your store profile after signing in.",
  alternates: { canonical: "/vendors/register" },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Create your vendor account | Lethela",
    description: "Join Lethela as a local vendor and complete your private store profile after signup.",
    url: "/vendors/register",
  },
  twitter: {
    title: "Create your vendor account | Lethela",
    description: "Join Lethela as a local vendor and complete your private store profile after signup.",
  },
};

export default function VendorRegisterPage() {
  return (
    <AuthShell
      title="Create your vendor account"
      supportingText="Use your email and a secure password now. Build your store profile in the dashboard."
      compact
    >
      <VendorSignupForm />
      <OnboardingPreview accountType="vendor" />
    </AuthShell>
  );
}
