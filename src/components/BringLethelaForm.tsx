"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

const roles = [
  ["CUSTOMER", "Order from Lethela"],
  ["STORE", "Sell on Lethela (I have a store)"],
  ["RIDER", "Deliver for Lethela"],
] as const;

export default function BringLethelaForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentFor, setSentFor] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Keep the form element: React clears event.currentTarget once the handler awaits.
    const formElement = event.currentTarget;
    const payload = Object.fromEntries(new FormData(formElement).entries());
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/kasi-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok) {
        setError(json?.error || "We could not send that. Please try again.");
        return;
      }
      setSentFor(String(payload.township || "your kasi"));
      formElement.reset();
    } catch {
      setError("We could not send that. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="bring-lethela" className="container pb-12">
      <div className="grid gap-6 rounded-xl border border-white/10 bg-white/[0.035] p-5 sm:p-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
        <div>
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-lethela-primary/12 text-lethela-primary">
            <MapPin className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-2xl font-semibold">Want Lethela in your kasi?</h2>
          <p className="mt-2 text-sm leading-6 text-white/64">
            Lethela is open in Klipfontein View and opens one township at a time. Tell us where you
            are and we will let you know when we open there.
          </p>
        </div>

        {sentFor ? (
          <div
            role="status"
            className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-4 text-sm leading-6 text-emerald-50"
          >
            Thank you. We have noted that you want Lethela in {sentFor}. We will contact you when we
            open there.
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <Field label="Your name">
              <input
                name="name"
                required
                minLength={2}
                maxLength={120}
                autoComplete="name"
                className={inputClass}
              />
            </Field>
            <Field label="Phone number">
              <input
                name="phone"
                required
                minLength={8}
                maxLength={40}
                inputMode="tel"
                autoComplete="tel"
                pattern="[+0-9][0-9 ()\-]+"
                className={inputClass}
              />
            </Field>
            <Field label="Your township">
              <input
                name="township"
                required
                minLength={2}
                maxLength={80}
                placeholder="For example: Rabie Ridge"
                className={inputClass}
              />
            </Field>
            <Field label="I want to">
              <select name="role" required defaultValue="CUSTOMER" className={inputClass}>
                {roles.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-lethela-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-lethela-primary/90 disabled:opacity-60 sm:w-auto"
              >
                {loading ? "Sending…" : "Bring Lethela to my kasi"}
              </button>
              {error ? (
                <p role="alert" className="mt-3 text-sm text-red-200">
                  {error}
                </p>
              ) : null}
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

const inputClass =
  "min-h-11 w-full rounded-md border border-white/15 bg-white px-3 py-2 text-sm text-black outline-none focus:border-lethela-primary focus:ring-2 focus:ring-lethela-primary/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-white/78">
      {label}
      {children}
    </label>
  );
}
