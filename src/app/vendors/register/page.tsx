import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import VendorSignupForm from "@/components/VendorSignupForm";

export const metadata: Metadata = {
  title: "Create your vendor account",
  description: "Create a Lethela vendor account and complete your store profile after signing in.",
  alternates: { canonical: "/vendors/register" },
  robots: { index: false, follow: false },
};

export default function VendorRegisterPage() {
  return (
    <AuthShell
      title="Create your vendor account"
      supportingText="Start with your basic details. Complete your store profile after signing in."
    >
      <VendorSignupForm />
    </AuthShell>
  );
}
