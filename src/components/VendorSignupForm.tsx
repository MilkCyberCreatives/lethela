import MinimalSignupForm from "@/components/auth/MinimalSignupForm";

export default function VendorSignupForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  return <MinimalSignupForm accountType="vendor" googleEnabled={googleEnabled} />;
}
