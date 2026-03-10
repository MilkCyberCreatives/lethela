"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params?.get("callbackUrl") ?? "/";

  const submit = async () => {
    setSubmitting(true);
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });
    setSubmitting(false);
    if (res?.ok) {
      router.push(callbackUrl);
    } else {
      alert(res?.error ?? "Sign in failed");
    }
  };

  return (
    <main className="container max-w-md py-10">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <div className="mt-6 space-y-3">
        <Input
          type="email"
          placeholder="you@example.co.za"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-white text-black"
        />
        <Input
          type="password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-white text-black"
        />
        <Button onClick={submit} disabled={submitting} className="bg-lethela-primary">
          {submitting ? "Signing in..." : "Sign in"}
        </Button>
        <p className="text-sm text-white/70">
          No account?{" "}
          <Link href="/signup" className="underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
