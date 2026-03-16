// /src/app/signup/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MainHeader from "@/components/MainHeader";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"USER" | "VENDOR" | "RIDER">("USER");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password, role })
    });
    setSubmitting(false);
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setError(data?.error ?? "Registration failed");
      return;
    }
    router.push("/signin");
  };

  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />
      <section className="container max-w-md py-10">
        <h1 className="text-2xl font-bold">Create account</h1>
        <div className="mt-6 space-y-3">
          <Input
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-white text-black"
          />
          <Input
            type="email"
            placeholder="you@example.co.za"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white text-black"
          />
          <Input
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white text-black"
          />

          <div className="text-sm">
            <label className="mr-2">Role:</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="rounded bg-white/90 px-2 py-1 text-black"
            >
              <option value="USER">User</option>
              <option value="VENDOR">Vendor</option>
              <option value="RIDER">Rider</option>
            </select>
          </div>

          <Button onClick={submit} disabled={submitting} className="bg-lethela-primary">
            {submitting ? "Creating..." : "Create account"}
          </Button>
          {error ? <p className="text-sm text-red-200">{error}</p> : null}

          <p className="text-sm text-white/70">
            Have an account?{" "}
            <Link href="/signin" className="underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
