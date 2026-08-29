import AuthShell from "@/components/auth/AuthShell";
import MinimalSignupForm from "@/components/auth/MinimalSignupForm";

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your account"
      supportingText="Start in seconds. Add delivery details only when you check out."
      compact
    >
      <MinimalSignupForm accountType="customer" />
    </AuthShell>
  );
}
