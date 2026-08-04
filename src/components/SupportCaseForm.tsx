"use client";

import { useState } from "react";

const issueTypes = [
  ["ACTIVE_ORDER", "Active delivery"],
  ["PAYMENT", "Payment problem"],
  ["REFUND", "Refund or cancellation"],
  ["ACCOUNT", "Customer account"],
  ["VENDOR", "Vendor onboarding"],
  ["RIDER", "Rider onboarding"],
  ["OTHER", "Other enquiry"],
] as const;

export default function SupportCaseForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setCaseId(null);

    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      const response = await fetch("/api/support/cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok) {
        setError(json?.error || "We could not submit the support request.");
        return;
      }
      setCaseId(String(json.caseId));
      event.currentTarget.reset();
    } catch {
      setError("Support is temporarily unavailable. Please use WhatsApp or email instead.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-8 grid gap-4 rounded-2xl border border-white/12 bg-white/[0.04] p-5"
    >
      <div>
        <h2 className="text-lg font-semibold">Open a support case</h2>
        <p className="mt-1 text-xs leading-5 text-white/58">
          Active delivery issues are prioritised. Do not include passwords, PINs, OTPs or full ID
          numbers.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input name="name" required minLength={2} maxLength={120} className={inputClass} />
        </Field>
        <Field label="Phone number">
          <input
            name="phone"
            required
            minLength={8}
            maxLength={40}
            inputMode="tel"
            autoComplete="tel"
            className={inputClass}
          />
        </Field>
        <Field label="Email address (optional)">
          <input name="email" type="email" maxLength={200} autoComplete="email" className={inputClass} />
        </Field>
        <Field label="Issue type">
          <select name="issueType" required defaultValue="ACTIVE_ORDER" className={inputClass}>
            {issueTypes.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Order reference (when applicable)">
          <input name="orderRef" maxLength={80} placeholder="LET-12345" className={inputClass} />
        </Field>
        <Field label="Preferred contact">
          <select name="preferredContact" required defaultValue="WHATSAPP" className={inputClass}>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="PHONE">Phone call</option>
            <option value="EMAIL">Email</option>
          </select>
        </Field>
      </div>
      <Field label="What happened?">
        <textarea
          name="description"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          placeholder="Describe what happened, when it happened and what outcome you need."
          className={inputClass}
        />
      </Field>
      <Field label="Evidence link (optional)">
        <input
          name="evidenceUrl"
          type="url"
          maxLength={1000}
          placeholder="Private photo or document link"
          className={inputClass}
        />
      </Field>
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-lethela-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit support case"}
      </button>
      {caseId ? (
        <div className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm text-emerald-50">
          Support case created. Reference: <span className="font-mono font-semibold">{caseId}</span>
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/15 bg-white px-3 py-2 text-sm text-black outline-none focus:border-lethela-primary focus:ring-2 focus:ring-lethela-primary/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white/65">
      {label}
      {children}
    </label>
  );
}
