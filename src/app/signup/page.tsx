import AuthShell from "@/components/auth/AuthShell";
import MinimalSignupForm from "@/components/auth/MinimalSignupForm";

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your account"
      supportingText="Start in seconds. Add your name, mobile number and delivery details after sign-in."
      compact
    >
      <MinimalSignupForm accountType="customer" />
    </AuthShell>
  );
}
