import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import OnboardingPreview from "@/components/auth/OnboardingPreview";
import RiderSignupForm from "@/components/auth/RiderSignupForm";

export const metadata: Metadata = {
  title: "Create your rider account",
  description: "Create a Lethela rider account and complete your rider details after signing in.",
  alternates: { canonical: "/rider" },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Create your rider account | Lethela",
    description:
      "Join Lethela as a community rider and complete your private profile after signup.",
    url: "/rider",
  },
  twitter: {
    title: "Create your rider account | Lethela",
    description:
      "Join Lethela as a community rider and complete your private profile after signup.",
  },
};

export default function RiderPage() {
  return (
    <AuthShell
      title="Create your rider account"
      supportingText="Use your email and a secure password now. Complete rider setup in your dashboard."
      compact
    >
      <RiderSignupForm />
      <OnboardingPreview accountType="rider" />
    </AuthShell>
  );
}
