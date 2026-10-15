import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import OnboardingPreview from "@/components/auth/OnboardingPreview";
import VendorSignupForm from "@/components/VendorSignupForm";
import { isGoogleAuthEnabled } from "@/lib/google-auth";

export const metadata: Metadata = {
  title: "Register your store",
  description:
    "List your spaza shop, takeaway or grocery store on Lethela in Klipfontein View, Midrand. Lethela handles delivery. Sign up with your email and a password.",
  alternates: { canonical: "/vendors/register" },
  openGraph: {
    title: "Sell on Lethela: register your store | Lethela",
    description:
      "List your spaza shop, takeaway or grocery store on Lethela in Klipfontein View, Midrand. Lethela handles delivery. Sign up with your email and a password.",
    url: "/vendors/register",
  },
  twitter: {
    title: "Sell on Lethela: register your store | Lethela",
    description:
      "List your spaza shop, takeaway or grocery store on Lethela in Klipfontein View, Midrand. Lethela handles delivery. Sign up with your email and a password.",
  },
};

export default function VendorRegisterPage() {
  return (
    <AuthShell
      title="Create your vendor account"
      supportingText="Just your email and a password for now. Build your store profile in your dashboard."
      audience="vendor"
      showRoleTabs
      after={<OnboardingPreview accountType="vendor" />}
    >
      <VendorSignupForm googleEnabled={isGoogleAuthEnabled()} />
    </AuthShell>
  );
}
