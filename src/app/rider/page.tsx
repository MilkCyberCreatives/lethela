import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import OnboardingPreview from "@/components/auth/OnboardingPreview";
import SignupFaq from "@/components/auth/SignupFaq";
import RiderSignupForm from "@/components/auth/RiderSignupForm";
import { isGoogleAuthEnabled } from "@/lib/google-auth";

export const metadata: Metadata = {
  title: "Delivery rider jobs",
  description:
    "Become a delivery rider with Lethela, the South African township delivery app. Riders keep the full delivery fee and every tip. Registration is free.",
  alternates: { canonical: "/rider" },
  openGraph: {
    title: "Delivery rider jobs | Lethela",
    description:
      "Become a delivery rider with Lethela, the South African township delivery app. Riders keep the full delivery fee and every tip. Registration is free.",
    url: "/rider",
  },
  twitter: {
    title: "Delivery rider jobs | Lethela",
    description:
      "Become a delivery rider with Lethela, the South African township delivery app. Riders keep the full delivery fee and every tip. Registration is free.",
  },
};

export default function RiderPage() {
  return (
    <AuthShell
      title="Create your rider account"
      supportingText="Just your email and a password for now. Finish your rider details in your dashboard."
      audience="rider"
      showRoleTabs
      after={
        <>
          <OnboardingPreview accountType="rider" />
          <SignupFaq accountType="rider" />
        </>
      }
    >
      <RiderSignupForm googleEnabled={isGoogleAuthEnabled()} />
    </AuthShell>
  );
}
