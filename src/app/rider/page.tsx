import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import OnboardingPreview from "@/components/auth/OnboardingPreview";
import RiderSignupForm from "@/components/auth/RiderSignupForm";
import { isGoogleAuthEnabled } from "@/lib/google-auth";

export const metadata: Metadata = {
  title: "Become a delivery rider",
  description:
    "Deliver for Lethela in Klipfontein View, Midrand. Riders keep the full delivery fee and every tip. Sign up with your email and a password.",
  alternates: { canonical: "/rider" },
  openGraph: {
    title: "Become a Lethela delivery rider | Lethela",
    description:
      "Deliver for Lethela in Klipfontein View, Midrand. Riders keep the full delivery fee and every tip. Sign up with your email and a password.",
    url: "/rider",
  },
  twitter: {
    title: "Become a Lethela delivery rider | Lethela",
    description:
      "Deliver for Lethela in Klipfontein View, Midrand. Riders keep the full delivery fee and every tip. Sign up with your email and a password.",
  },
};

export default function RiderPage() {
  return (
    <AuthShell
      title="Create your rider account"
      supportingText="Just your email and a password for now. Finish your rider details in your dashboard."
      audience="rider"
      showRoleTabs
      after={<OnboardingPreview accountType="rider" />}
    >
      <RiderSignupForm googleEnabled={isGoogleAuthEnabled()} />
    </AuthShell>
  );
}
