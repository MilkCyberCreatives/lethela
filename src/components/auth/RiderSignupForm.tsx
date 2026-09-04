import MinimalSignupForm from "@/components/auth/MinimalSignupForm";

export default function RiderSignupForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  return <MinimalSignupForm accountType="rider" googleEnabled={googleEnabled} />;
}
