"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { safePostLoginPath, type AppRole } from "@/lib/auth-roles";

export default function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [requestedPath, setRequestedPath] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRequestedPath(params.get("callbackUrl") || params.get("next") || "");
    setMessage(params.get("message") || "");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn("credentials", { redirect: false, email, password });
      if (!result?.ok) {
        throw new Error("We could not sign you in. Check your details or try again later.");
      }
      const profileResponse = await fetch("/api/me", { cache: "no-store" });
      const profile = await profileResponse.json().catch(() => ({}));
      const role = (profile?.user?.role || "CUSTOMER") as AppRole;
      router.replace(safePostLoginPath(role, requestedPath));
      router.refresh();
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : "We could not sign you in. Check your details or try again later.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {message ? (
        <p
          role="status"
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {message}
        </p>
      ) : null}
      <form className="grid gap-4" onSubmit={submit}>
        <label className="grid gap-1.5 text-sm font-medium text-slate-800">
          <span>Email</span>
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-800">
          <span>Password</span>
          <Input
            type="password"
            autoComplete="current-password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="h-11 bg-lethela-primary text-white" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <div className="mt-5 grid gap-2 text-sm text-slate-600">
        <Link href="/forgot-password" className="underline">
          Forgot password?
        </Link>
        <Link href="/signup" className="underline">
          Create customer account
        </Link>
        <Link href="/vendors/register" className="underline">
          Create vendor account
        </Link>
        <Link href="/rider" className="underline">
          Create rider account
        </Link>
      </div>
    </div>
  );
}
