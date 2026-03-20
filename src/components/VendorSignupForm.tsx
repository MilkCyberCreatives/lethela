"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { pushDataLayerEvent, trackVisitorEvent } from "@/lib/visitor";

type VendorState = {
  slug: string;
  name: string;
  status: string;
  isActive: boolean;
};

const PROVINCES = [
  "Gauteng",
  "Western Cape",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Free State",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
];

function toCuisineList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function isApprovedVendor(status: string, isActive: boolean) {
  const normalizedStatus = String(status || "").toUpperCase();
  return isActive && (normalizedStatus === "ACTIVE" || normalizedStatus === "APPROVED" || normalizedStatus === "");
}

export default function VendorSignupForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    address: "",
    suburb: "Klipfontein View",
    city: "Midrand",
    province: "Gauteng",
    cuisineInput: "Burgers, Grill",
    deliveryFeeCents: "10",
    etaMins: "30",
    halaal: false,
    latitude: "",
    longitude: "",
    agreeToReview: false,
  });

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendor, setVendor] = useState<VendorState | null>(null);

  const approvalState = useMemo(() => {
    if (!vendor) return null;
    if (isApprovedVendor(vendor.status, vendor.isActive)) return "approved";
    if (String(vendor.status || "").toUpperCase() === "REJECTED") return "rejected";
    return "pending";
  }, [vendor]);

  async function refreshStatus() {
    setChecking(true);
    try {
      const response = await fetch("/api/vendors/register", { method: "GET", cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.ok) return;
      setVendor({
        slug: json.vendor.slug,
        name: json.vendor.name,
        status: json.vendor.status,
        isActive: Boolean(json.vendor.isActive),
      });
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    void refreshStatus();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!form.agreeToReview) {
      setError("Please confirm the information is accurate before submitting.");
      return;
    }

    setLoading(true);
    setError(null);
    setVendor(null);
    try {
      const response = await fetch("/api/vendors/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          address: form.address,
          suburb: form.suburb,
          city: form.city,
          province: form.province,
          cuisine: toCuisineList(form.cuisineInput),
          deliveryFeeCents: Math.max(0, Number(form.deliveryFeeCents || "0")) * 100,
          etaMins: Number(form.etaMins),
          halaal: form.halaal,
          latitude: form.latitude ? Number(form.latitude) : undefined,
          longitude: form.longitude ? Number(form.longitude) : undefined,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Failed");
      setVendor({
        slug: json.vendor.slug,
        name: json.vendor.name,
        status: json.vendor.status,
        isActive: Boolean(json.vendor.isActive),
      });
      void trackVisitorEvent({
        type: "vendor_application_submit",
        vendorSlug: json.vendor.slug,
        meta: {
          cuisine: toCuisineList(form.cuisineInput),
          suburb: form.suburb,
          city: form.city,
        },
      });
      pushDataLayerEvent("generate_lead", {
        lead_type: "vendor_application",
        vendor_slug: json.vendor.slug,
        suburb: form.suburb,
        city: form.city,
      });
    } catch (e: unknown) {
      setError(e instanceof Error && e.message ? e.message : "Failed to register vendor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/15 bg-lethela-secondary p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Vendor Application</h2>
          <p className="mt-1 text-sm text-white/70">
            Fill in your profile and operations details once. Admin approval unlocks your dashboard.
          </p>
          <p className="mt-2 text-xs text-white/60">
            Already applied or already approved?{" "}
            <Link href="/vendors/signin" className="underline underline-offset-4">
              Sign in to your vendor account
            </Link>
            .
          </p>
        </div>
        <span className="rounded-full border border-white/25 px-3 py-1 text-xs text-white/80">~2 minute setup</span>
      </div>

      <form className="mt-5 space-y-6" onSubmit={submit}>
        <section className="rounded-xl border border-white/10 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">Business Details</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              className="rounded bg-white px-3 py-2 text-black"
              placeholder="Business name*"
              required
              value={form.name}
              onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
            />
            <input
              className="rounded bg-white px-3 py-2 text-black"
              placeholder="Business email*"
              type="email"
              required
              value={form.email}
              onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))}
            />
            <input
              className="rounded bg-white px-3 py-2 text-black"
              type="password"
              placeholder="Create password*"
              required
              minLength={8}
              value={form.password}
              onChange={(event) => setForm((state) => ({ ...state, password: event.target.value }))}
            />
            <input
              className="rounded bg-white px-3 py-2 text-black"
              type="password"
              placeholder="Confirm password*"
              required
              minLength={8}
              value={form.confirmPassword}
              onChange={(event) => setForm((state) => ({ ...state, confirmPassword: event.target.value }))}
            />
            <input
              className="rounded bg-white px-3 py-2 text-black"
              placeholder="Phone / WhatsApp*"
              required
              value={form.phone}
              onChange={(event) => setForm((state) => ({ ...state, phone: event.target.value }))}
            />
            <select
              className="rounded bg-white px-3 py-2 text-black"
              value={form.province}
              onChange={(event) => setForm((state) => ({ ...state, province: event.target.value }))}
            >
              {PROVINCES.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
            <input
              className="rounded bg-white px-3 py-2 text-black md:col-span-2"
              placeholder="Street address*"
              required
              value={form.address}
              onChange={(event) => setForm((state) => ({ ...state, address: event.target.value }))}
            />
            <input
              className="rounded bg-white px-3 py-2 text-black"
              placeholder="Suburb*"
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
          </div>
        </section>

        <section className="rounded-xl border border-white/10 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">Operations Setup</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              className="rounded bg-white px-3 py-2 text-black md:col-span-2"
              placeholder="Cuisines* (comma separated)"
              required
              value={form.cuisineInput}
              onChange={(event) => setForm((state) => ({ ...state, cuisineInput: event.target.value }))}
            />
            <input
              className="rounded bg-white px-3 py-2 text-black"
              type="number"
              min={0}
              max={200}
              step={1}
              placeholder="Default delivery fee (R)*"
              required
              value={form.deliveryFeeCents}
              onChange={(event) => setForm((state) => ({ ...state, deliveryFeeCents: event.target.value }))}
            />
            <input
              className="rounded bg-white px-3 py-2 text-black"
              type="number"
              min={10}
              max={120}
              placeholder="Average ETA minutes*"
              required
              value={form.etaMins}
              onChange={(event) => setForm((state) => ({ ...state, etaMins: event.target.value }))}
            />
            <input
              className="rounded bg-white px-3 py-2 text-black"
              placeholder="Latitude (optional)"
              value={form.latitude}
              onChange={(event) => setForm((state) => ({ ...state, latitude: event.target.value }))}
            />
            <input
              className="rounded bg-white px-3 py-2 text-black"
              placeholder="Longitude (optional)"
              value={form.longitude}
              onChange={(event) => setForm((state) => ({ ...state, longitude: event.target.value }))}
            />
            <label className="md:col-span-2 inline-flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={form.halaal}
                onChange={(event) => setForm((state) => ({ ...state, halaal: event.target.checked }))}
              />
              Halaal friendly menu available
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">Compliance</h3>
          <div className="mt-3 grid gap-3">
            <p className="text-sm text-white/75">
              Owner ID and proof of address will be requested manually on WhatsApp after registration.
            </p>
            <label className="md:col-span-2 inline-flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={form.agreeToReview}
                onChange={(event) => setForm((state) => ({ ...state, agreeToReview: event.target.checked }))}
              />
              I confirm the details are accurate and understand that admin approval is required before going live.
            </label>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" className="bg-lethela-primary transition-opacity hover:opacity-90" disabled={loading}>
            {loading ? "Submitting..." : "Submit vendor application"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-white/30 bg-transparent text-white hover:border-lethela-primary hover:text-lethela-primary"
            onClick={refreshStatus}
            disabled={checking}
          >
            {checking ? "Checking..." : "Refresh status"}
          </Button>
        </div>
      </form>

      {vendor ? (
        <div className="mt-4 rounded-xl border border-white/20 bg-white/5 p-4 text-sm text-white/90">
          <p className="font-medium">{vendor.name}</p>
          {approvalState === "approved" ? (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="text-white/85">Approved. You can now manage your store.</span>
              <Link
                href={`/vendors/${vendor.slug}`}
                className="rounded-full border border-white/30 px-3 py-1 text-xs transition-colors hover:border-lethela-primary hover:text-lethela-primary"
              >
                View profile
              </Link>
              <Link
                href="/vendors/dashboard"
                className="rounded-full border border-white/30 px-3 py-1 text-xs transition-colors hover:border-lethela-primary hover:text-lethela-primary"
              >
                Open dashboard
              </Link>
            </div>
          ) : null}
          {approvalState === "pending" ? (
            <p className="mt-2 text-white/80">
              Application received and pending admin approval. Dashboard access unlocks immediately after approval.
            </p>
          ) : null}
          {approvalState === "rejected" ? (
            <p className="mt-2 text-red-200">
              This application was rejected. Update your details and submit again, or contact support.
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mt-2 text-sm text-red-200">{error}</p> : null}
    </div>
  );
}
