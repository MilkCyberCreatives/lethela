"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

type RiderResponse = {
  ok: boolean;
  summary?: string;
  message?: string;
  error?: string;
  application?: { id: string; status: string };
};

export default function RiderApplyForm() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    idNumberLast4: "",
    licenseCode: "",
    suburb: "Klipfontein View",
    city: "Midrand",
    vehicleType: "BIKE",
    vehicleRegistration: "",
    availableHours: "Weekdays 17:00-22:00",
    emergencyContactName: "",
    emergencyContactPhone: "",
    hasSmartphone: true,
    hasBankAccount: true,
    experience: "",
    acceptTerms: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [applicationId, setApplicationId] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.acceptTerms) {
      setError("Please accept the rider terms before submitting.");
      return;
    }

    setLoading(true);
    setError(null);
    setSummary("");
    setApplicationId("");
    setStatus("");

    try {
      const response = await fetch("/api/riders/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          idNumberLast4: form.idNumberLast4,
          licenseCode: form.licenseCode,
          suburb: form.suburb,
          city: form.city,
          vehicleType: form.vehicleType,
          vehicleRegistration: form.vehicleRegistration || undefined,
          availableHours: form.availableHours,
          emergencyContactName: form.emergencyContactName,
          emergencyContactPhone: form.emergencyContactPhone,
          hasSmartphone: form.hasSmartphone,
          hasBankAccount: form.hasBankAccount,
          experience: form.experience || undefined,
        }),
      });

      const json: RiderResponse = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Unable to submit rider application.");
      }

      setSummary(json.summary || "");
      setApplicationId(json.application?.id || "");
      setStatus(json.application?.status || "PENDING");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to submit rider application.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/15 bg-lethela-secondary p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Rider Application</h2>
          <p className="mt-1 text-sm text-white/70">
            Complete your details once. Operations reviews your application and contacts you on WhatsApp.
          </p>
        </div>
        <span className="rounded-full border border-white/25 px-3 py-1 text-xs text-white/80">~3 minute setup</span>
      </div>

      <form className="mt-5 space-y-6" onSubmit={handleSubmit}>
        <section className="rounded-xl border border-white/10 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">Identity</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              className="rounded bg-white px-3 py-2 text-black"
              placeholder="Full name*"
              required
              value={form.fullName}
              onChange={(event) => setForm((state) => ({ ...state, fullName: event.target.value }))}
            />
            <input
              className="rounded bg-white px-3 py-2 text-black"
              type="email"
              placeholder="Email*"
              required
              value={form.email}
              onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))}
            />
            <input
              className="rounded bg-white px-3 py-2 text-black"
              placeholder="Phone / WhatsApp*"
              required
              value={form.phone}
              onChange={(event) => setForm((state) => ({ ...state, phone: event.target.value }))}
            />
            <input
              className="rounded bg-white px-3 py-2 text-black"
              placeholder="ID number last 4 digits*"
              pattern="\d{4}"
              maxLength={4}
              required
              value={form.idNumberLast4}
              onChange={(event) =>
                setForm((state) => ({
                  ...state,
                  idNumberLast4: event.target.value.replace(/\D/g, "").slice(0, 4),
                }))
              }
            />
            <input
              className="rounded bg-white px-3 py-2 text-black"
              placeholder="License code* (e.g. A1, B, C1)"
              required
              value={form.licenseCode}
              onChange={(event) => setForm((state) => ({ ...state, licenseCode: event.target.value }))}
            />
          </div>
        </section>

        <section className="rounded-xl border border-white/10 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">Delivery Details</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              className="rounded bg-white px-3 py-2 text-black"
              placeholder="Primary suburb*"
              required
              value={form.suburb}
              onChange={(event) => setForm((state) => ({ ...state, suburb: event.target.value }))}
            />
            <input
              className="rounded bg-white px-3 py-2 text-black"
              placeholder="City*"
              required
              value={form.city}
              onChange={(event) => setForm((state) => ({ ...state, city: event.target.value }))}
            />

            <select
              className="rounded bg-white px-3 py-2 text-black"
              value={form.vehicleType}
              onChange={(event) => setForm((state) => ({ ...state, vehicleType: event.target.value }))}
            >
              <option value="BIKE">Bike</option>
              <option value="SCOOTER">Scooter</option>
              <option value="CAR">Car</option>
            </select>
            <input
              className="rounded bg-white px-3 py-2 text-black"
              placeholder="Vehicle registration (optional)"
              value={form.vehicleRegistration}
              onChange={(event) => setForm((state) => ({ ...state, vehicleRegistration: event.target.value }))}
            />
            <input
              className="rounded bg-white px-3 py-2 text-black md:col-span-2"
              placeholder="Availability* (e.g. weekdays 17:00-22:00)"
              required
              value={form.availableHours}
              onChange={(event) => setForm((state) => ({ ...state, availableHours: event.target.value }))}
            />
            <textarea
              className="rounded bg-white px-3 py-2 text-black md:col-span-2"
              placeholder="Delivery experience (optional)"
              rows={3}
              value={form.experience}
              onChange={(event) => setForm((state) => ({ ...state, experience: event.target.value }))}
            />
          </div>
        </section>

        <section className="rounded-xl border border-white/10 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">Safety And Contact</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              className="rounded bg-white px-3 py-2 text-black"
              placeholder="Emergency contact name*"
              required
              value={form.emergencyContactName}
              onChange={(event) => setForm((state) => ({ ...state, emergencyContactName: event.target.value }))}
            />
            <input
              className="rounded bg-white px-3 py-2 text-black"
              placeholder="Emergency contact phone*"
              required
              value={form.emergencyContactPhone}
              onChange={(event) => setForm((state) => ({ ...state, emergencyContactPhone: event.target.value }))}
            />
            <label className="inline-flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={form.hasSmartphone}
                onChange={(event) => setForm((state) => ({ ...state, hasSmartphone: event.target.checked }))}
              />
              I have a smartphone with mobile data
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={form.hasBankAccount}
                onChange={(event) => setForm((state) => ({ ...state, hasBankAccount: event.target.checked }))}
              />
              I have a valid bank account for payouts
            </label>
            <label className="md:col-span-2 inline-flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={form.acceptTerms}
                onChange={(event) => setForm((state) => ({ ...state, acceptTerms: event.target.checked }))}
              />
              I confirm my details are correct and I can legally work and deliver in South Africa.
            </label>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button className="bg-lethela-primary hover:opacity-90" disabled={loading} type="submit">
            {loading ? "Submitting..." : "Submit rider application"}
          </Button>
        </div>
      </form>

      {applicationId ? (
        <div className="mt-4 rounded-xl border border-white/20 bg-white/5 p-4 text-sm text-white/90">
          <p className="font-medium">Application submitted</p>
          <p className="mt-1 text-xs text-white/75">
            Ref: <span className="font-mono">{applicationId}</span> | Status: {status || "PENDING"}
          </p>
          {summary ? (
            <div className="mt-3 rounded-lg border border-white/15 bg-white/5 p-3 text-xs text-white/80 whitespace-pre-wrap">
              <p className="mb-1 text-white/90">AI pre-screen summary</p>
              {summary}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-200">{error}</p> : null}
    </div>
  );
}
