import { Suspense } from "react";
import SignInForm from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <Suspense fallback={<main className="container max-w-md py-10">Loading...</main>}>
      <SignInForm />
    </Suspense>
  );
}
