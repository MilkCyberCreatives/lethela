import AuthShell from "@/components/auth/AuthShell";
import MinimalSignupForm from "@/components/auth/MinimalSignupForm";

export default function SignUpPage() {
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
  return (
    <AuthShell
      title="Create your account"
      supportingText="Start in seconds. Add delivery details only when you check out."
      compact
    >
      <MinimalSignupForm accountType="customer" googleEnabled={googleEnabled} />
    </AuthShell>
  );
}
