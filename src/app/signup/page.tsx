import AuthShell from "@/components/auth/AuthShell";
import MinimalSignupForm from "@/components/auth/MinimalSignupForm";
import { isGoogleAuthEnabled } from "@/lib/google-auth";

export default function SignUpPage() {
  const googleEnabled = isGoogleAuthEnabled();
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
