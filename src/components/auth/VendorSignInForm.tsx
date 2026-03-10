"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function VendorSignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [slug, setSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/vendor/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          slug: slug.trim() || undefined,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Vendor sign-in failed.");
      }

      router.push("/vendors/dashboard");
      router.refresh();
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Vendor sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <section className="container max-w-lg py-12">
        <div className="rounded-3xl border border-white/15 bg-white/5 p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.16em] text-white/65">Vendor access</p>
          <h1 className="mt-2 text-3xl font-semibold">Sign in to manage your store</h1>
          <p className="mt-3 text-sm text-white/75">
            Use the email and password from your vendor application. Admin approval is still required before the store
            goes live.
          </p>

          <form className="mt-6 space-y-3" onSubmit={submit}>
            <Input
              type="email"
              placeholder="vendor@example.co.za"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="bg-white text-black"
            />
            <Input
              type="password"
              placeholder="Your vendor password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="bg-white text-black"
            />
            <Input
              placeholder="Store slug (optional if you manage multiple stores)"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className="bg-white text-black"
            />
            <Button type="submit" disabled={submitting} className="w-full bg-lethela-primary text-white hover:opacity-90">
              {submitting ? "Signing in..." : "Open vendor dashboard"}
            </Button>
          </form>

          {error ? <p className="mt-3 text-sm text-red-200">{error}</p> : null}

          <div className="mt-6 space-y-2 text-sm text-white/70">
            <p>
              Need an account?{" "}
              <Link href="/vendors/register" className="underline underline-offset-4">
                Apply to become a vendor
              </Link>
            </p>
            <p>
              Need help with approval?{" "}
              <a href="https://wa.me/27723908919" target="_blank" rel="noreferrer" className="underline underline-offset-4">
                WhatsApp support
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
