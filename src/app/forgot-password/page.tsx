import AuthShell from "@/components/auth/AuthShell";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata = buildNoIndexMetadata({
  title: "Reset your password",
  description: "Request a secure password reset link for your Lethela account.",
  path: "/forgot-password",
});

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      supportingText="Enter the email you signed up with and we will send you a link to choose a new password."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
