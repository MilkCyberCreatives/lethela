import PageShell from "@/components/PageShell";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <PageShell contentClassName="max-w-md">
      <ForgotPasswordForm />
    </PageShell>
  );
}
