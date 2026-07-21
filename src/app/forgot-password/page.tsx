import AuthShell from "@/components/auth/AuthShell";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      supportingText="Enter your account email and we will send a secure reset link if it matches our records."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
