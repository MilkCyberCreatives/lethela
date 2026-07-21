import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import RiderSignupForm from "@/components/auth/RiderSignupForm";

export const metadata: Metadata = {
  title: "Create your rider account",
  description: "Create a Lethela rider account and complete your rider details after signing in.",
  alternates: { canonical: "/rider" },
  robots: { index: false, follow: false },
};

export default function RiderPage() {
  return (
    <AuthShell
      title="Create your rider account"
      supportingText="Create your account first. Complete your rider details after signing in."
    >
      <RiderSignupForm />
    </AuthShell>
  );
}
