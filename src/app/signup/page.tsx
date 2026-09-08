import AuthShell from "@/components/auth/AuthShell";
import MinimalSignupForm from "@/components/auth/MinimalSignupForm";
import { isGoogleAuthEnabled } from "@/lib/google-auth";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata = buildNoIndexMetadata({
  title: "Create your account",
  description: "Create a Lethela account to order from local township vendors.",
  path: "/signup",
});

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
