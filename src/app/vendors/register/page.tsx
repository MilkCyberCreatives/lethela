import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import OnboardingPreview from "@/components/auth/OnboardingPreview";
import SignupFaq from "@/components/auth/SignupFaq";
import VendorSignupForm from "@/components/VendorSignupForm";
import { isGoogleAuthEnabled } from "@/lib/google-auth";

export const metadata: Metadata = {
  title: "Sell food and groceries online",
  description:
    "Take your spaza shop, kota takeaway or grocery store online with Lethela, the South African township delivery app. Lethela runs the delivery. Sign-up is free.",
  alternates: { canonical: "/vendors/register" },
  openGraph: {
    title: "Sell food and groceries online | Lethela",
    description:
      "Take your spaza shop, kota takeaway or grocery store online with Lethela, the South African township delivery app. Lethela runs the delivery. Sign-up is free.",
    url: "/vendors/register",
  },
  twitter: {
    title: "Sell food and groceries online | Lethela",
    description:
      "Take your spaza shop, kota takeaway or grocery store online with Lethela, the South African township delivery app. Lethela runs the delivery. Sign-up is free.",
  },
};

export default function VendorRegisterPage() {
  return (
    <AuthShell
      title="Create your vendor account"
      supportingText="Just your email and a password for now. Build your store profile in your dashboard."
      audience="vendor"
      showRoleTabs
      after={
        <>
          <OnboardingPreview accountType="vendor" />
          <SignupFaq accountType="vendor" />
        </>
      }
    >
      <VendorSignupForm googleEnabled={isGoogleAuthEnabled()} />
    </AuthShell>
  );
}
