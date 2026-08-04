"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OrderLookupForm() {
  const router = useRouter();
  const [ref, setRef] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ref, phone }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok || !json?.redirectUrl) {
        setError(json?.error || "We could not verify that order.");
        return;
      }
      router.push(String(json.redirectUrl));
    } catch {
      setError("Order tracking is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-6 grid gap-3" onSubmit={submit}>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-white/65">
          Order reference
        </label>
        <input
          required
          value={ref}
          onChange={(event) => setRef(event.target.value)}
          placeholder="LET-12345"
          className="w-full rounded border border-white/20 bg-white px-3 py-2 text-black"
          autoComplete="off"
          maxLength={80}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-white/65">
          Phone number used for the order
        </label>
        <input
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="072..."
          className="w-full rounded border border-white/20 bg-white px-3 py-2 text-black"
          inputMode="tel"
          autoComplete="tel"
          maxLength={40}
        />
      </div>
      <button
        type="submit"
        disabled={loading || ref.trim().length < 4 || phone.replace(/\D/g, "").length < 8}
        className="rounded bg-lethela-primary px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Verifying..." : "Open secure tracking"}
      </button>
      {error ? (
        <p className="rounded-lg border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}
      <p className="text-xs leading-5 text-white/55">
        This check protects your order details, delivery location and rider information.
      </p>
    </form>
  );
}
