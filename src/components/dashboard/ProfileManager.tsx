"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DashCard from "./DashCard";
import FormField from "./FormField";
import { STORE_TYPES } from "@/lib/vendor-readiness";

type VendorProfile = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  phone: string | null;
  address: string | null;
  suburb: string | null;
  city: string | null;
  province: string | null;
  municipality: string | null;
  township: string | null;
  sectionArea: string | null;
  pickupInstructions: string | null;
  storeType: string | null;
  cuisine: string | string[];
  deliveryFee: number;
  etaMins: number;
  preparationMinutes: number;
  orderCapacity: number;
  halaal: boolean;
  image: string | null;
  kycIdUrl: string | null;
  kycProofUrl: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankAccountLast4?: string | null;
  bankBranchCode: string | null;
  bankAccountType: string | null;
  bankVerificationStatus: string;
  liquorLicenceUrl: string | null;
  liquorLicenceNumber: string | null;
  liquorLicenceHolder: string | null;
  liquorLicencePremises: string | null;
  liquorLicenceProvince: string | null;
  liquorLicenceType: string | null;
  liquorLicenceExpiry: string | null;
  liquorVerificationStatus: string;
  liquorReviewReason: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  isActive: boolean;
  temporaryClosed: boolean;
  _count?: {
    products: number;
    orders: number;
    specials: number;
    hours: number;
  };
};

type ProfileFormState = {
  name: string;
  description: string;
  coverImage: string;
  phone: string;
  address: string;
  suburb: string;
  city: string;
  province: string;
  municipality: string;
  township: string;
  sectionArea: string;
  pickupInstructions: string;
  storeType: string;
  cuisineInput: string;
  etaMins: string;
  preparationMinutes: string;
  orderCapacity: string;
  halaal: boolean;
  temporaryClosed: boolean;
  image: string;
  kycIdUrl: string;
  kycProofUrl: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankBranchCode: string;
  bankAccountType: string;
  liquorLicenceUrl: string;
  liquorLicenceNumber: string;
  liquorLicenceHolder: string;
  liquorLicencePremises: string;
  liquorLicenceProvince: string;
  liquorLicenceType: string;
  liquorLicenceExpiry: string;
  latitude: string;
  longitude: string;
};

function parseCuisine(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function buildFormState(vendor: VendorProfile): ProfileFormState {
  return {
    name: vendor.name,
    description: vendor.description || "",
    coverImage: vendor.coverImage || "",
    phone: vendor.phone || "",
    address: vendor.address || "",
    suburb: vendor.suburb || "",
    city: vendor.city || "",
    province: vendor.province || "",
    municipality: vendor.municipality || "",
    township: vendor.township || vendor.suburb || "",
    sectionArea: vendor.sectionArea || "",
    pickupInstructions: vendor.pickupInstructions || "",
    storeType: vendor.storeType || "",
    cuisineInput: parseCuisine(vendor.cuisine).join(", "),
    etaMins: String(vendor.etaMins),
    preparationMinutes: String(vendor.preparationMinutes || vendor.etaMins || 30),
    orderCapacity: String(vendor.orderCapacity || 20),
    halaal: vendor.halaal,
    temporaryClosed: vendor.temporaryClosed,
    image: vendor.image || "",
    kycIdUrl: vendor.kycIdUrl || "",
    kycProofUrl: vendor.kycProofUrl || "",
    bankName: vendor.bankName || "",
    bankAccountName: vendor.bankAccountName || "",
    bankAccountNumber: "",
    bankBranchCode: vendor.bankBranchCode || "",
    bankAccountType: vendor.bankAccountType || "",
    liquorLicenceUrl: vendor.liquorLicenceUrl || "",
    liquorLicenceNumber: vendor.liquorLicenceNumber || "",
    liquorLicenceHolder: vendor.liquorLicenceHolder || "",
    liquorLicencePremises: vendor.liquorLicencePremises || "",
    liquorLicenceProvince: vendor.liquorLicenceProvince || "",
    liquorLicenceType: vendor.liquorLicenceType || "",
    liquorLicenceExpiry: vendor.liquorLicenceExpiry
      ? new Date(vendor.liquorLicenceExpiry).toISOString().slice(0, 10)
      : "",
    latitude: vendor.latitude == null ? "" : String(vendor.latitude),
    longitude: vendor.longitude == null ? "" : String(vendor.longitude),
  };
}

function profileHealth(vendor: VendorProfile | null) {
  if (!vendor) {
    return { completed: 0, total: 0 };
  }

  const checks = [
    Boolean(
      vendor.phone &&
        vendor.address &&
        vendor.city &&
        (vendor.township || vendor.suburb) &&
        vendor.province &&
        vendor.storeType,
    ),
    Boolean(vendor.image),
    Boolean(vendor.latitude != null && vendor.longitude != null),
    Boolean(vendor.kycIdUrl && vendor.kycProofUrl),
    Boolean(vendor.bankName && vendor.bankAccountName && vendor.bankAccountNumber),
    Boolean(vendor._count?.hours),
  ];

  return {
    completed: checks.filter(Boolean).length,
    total: checks.length,
  };
}

export default function ProfileManager() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/vendors/me", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to load profile.");
      }
      setVendor(json.vendor);
      setForm(buildFormState(json.vendor));
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function uploadFile(file: File, kind: "profile" | "document") {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);

    const response = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error || "Upload failed.");
    }

    return json.url as string;
  }

  async function save() {
    if (!form) return;

    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/vendors/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          coverImage: form.coverImage || null,
          phone: form.phone,
          address: form.address,
          suburb: form.suburb,
          city: form.city,
          province: form.province,
          municipality: form.municipality,
          township: form.township,
          sectionArea: form.sectionArea,
          pickupInstructions: form.pickupInstructions || null,
          storeType: form.storeType,
          cuisine: form.cuisineInput
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          etaMins: Number(form.etaMins),
          preparationMinutes: Number(form.preparationMinutes),
          orderCapacity: Number(form.orderCapacity),
          halaal: form.halaal,
          temporaryClosed: form.temporaryClosed,
          image: form.image || null,
          kycIdUrl: form.kycIdUrl || null,
          kycProofUrl: form.kycProofUrl || null,
          bankName: form.bankName,
          bankAccountName: form.bankAccountName,
          bankAccountNumber: form.bankAccountNumber,
          bankBranchCode: form.bankBranchCode || null,
          bankAccountType: form.bankAccountType || null,
          liquorLicenceUrl: form.liquorLicenceUrl || null,
          liquorLicenceNumber: form.liquorLicenceNumber || null,
          liquorLicenceHolder: form.liquorLicenceHolder || null,
          liquorLicencePremises: form.liquorLicencePremises || null,
          liquorLicenceProvince: form.liquorLicenceProvince || null,
          liquorLicenceType: form.liquorLicenceType || null,
          liquorLicenceExpiry: form.liquorLicenceExpiry
            ? new Date(`${form.liquorLicenceExpiry}T00:00:00.000Z`).toISOString()
            : null,
          latitude: form.latitude === "" ? null : Number(form.latitude),
          longitude: form.longitude === "" ? null : Number(form.longitude),
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to save profile.");
      }

      setVendor(json.vendor);
      setForm(buildFormState(json.vendor));
      setStatus("Vendor profile updated.");
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  const health = profileHealth(vendor);
  const progressPct = health.total > 0 ? Math.round((health.completed / health.total) * 100) : 0;

  return (
    <DashCard title="Store Profile">
      {loading || !form ? (
        <div className="grid animate-pulse gap-4 md:grid-cols-[0.95fr,1.05fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="aspect-[16/10] rounded-xl bg-slate-100" />
            <div className="mt-4 flex gap-2">
              <div className="h-7 w-20 rounded-full bg-slate-100" />
              <div className="h-7 w-28 rounded-full bg-slate-100" />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="h-4 w-40 rounded bg-slate-100" />
            <div className="mt-4 h-3 rounded bg-slate-100" />
            <div className="mt-3 h-3 w-2/3 rounded bg-slate-100" />
            <div className="mt-5 h-10 rounded bg-slate-100" />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-[0.95fr,1.05fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="aspect-[16/10] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {form.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image} alt={form.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    No store logo yet
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-slate-300 bg-white px-3 py-1">
                  {vendor?.isActive ? "Active" : "Pending"}
                </span>
                <span className="rounded-full border border-slate-300 bg-white px-3 py-1">
                  Status: {vendor?.status || "UNKNOWN"}
                </span>
                {vendor?.halaal ? (
                  <span className="rounded-full border border-slate-300 bg-white px-3 py-1">
                    Halaal
                  </span>
                ) : null}
                <span className="rounded-full border border-slate-300 bg-white px-3 py-1">
                  {form.temporaryClosed ? "Temporarily closed" : "Accepting orders when approved"}
                </span>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Profile completeness</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="mt-2 h-2 rounded bg-slate-100">
                  <div
                    className="h-2 rounded bg-lethela-primary"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <h3 className="md:col-span-2 text-sm font-semibold text-slate-900">Store details</h3>
              <FormField label="Business name">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, name: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <FormField label="Phone or WhatsApp number">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, phone: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <FormField label="Store description" className="md:col-span-2">
                <textarea
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, description: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <FormField label="Cover image URL" className="md:col-span-2">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  value={form.coverImage}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, coverImage: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <h3 className="md:col-span-2 mt-2 border-t border-slate-200 pt-4 text-sm font-semibold text-slate-900">
                Trading address
              </h3>
              <FormField label="Street address" className="md:col-span-2">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  value={form.address}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, address: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <FormField label="Suburb">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  value={form.suburb}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, suburb: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <FormField label="City">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  value={form.city}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, city: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <FormField label="Province">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  value={form.province}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, province: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <FormField label="Municipality">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  value={form.municipality}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, municipality: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <FormField label="Township">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  value={form.township}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, township: event.target.value, suburb: event.target.value }
                        : current,
                    )
                  }
                />
              </FormField>
              <FormField label="Section or area">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  value={form.sectionArea}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, sectionArea: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <FormField label="Pickup instructions for riders" className="md:col-span-2">
                <textarea
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  placeholder="Where riders should collect orders"
                  rows={2}
                  value={form.pickupInstructions}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, pickupInstructions: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <h3 className="md:col-span-2 mt-2 border-t border-slate-200 pt-4 text-sm font-semibold text-slate-900">
                Category and preparation
              </h3>
              <FormField label="Store type">
                <select
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  value={form.storeType}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, storeType: event.target.value } : current,
                    )
                  }
                >
                  <option value="">Store type</option>
                  {STORE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Product categories">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  placeholder="Kota, groceries, bread..."
                  value={form.cuisineInput}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, cuisineInput: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <div className="self-end rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
                Delivery is calculated by Lethela at R10/km with a R10 minimum.
              </div>
              <FormField label="Average ETA (minutes)">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  type="number"
                  min={10}
                  max={120}
                  value={form.etaMins}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, etaMins: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <FormField label="Preparation time (minutes)">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  type="number"
                  min={5}
                  max={180}
                  value={form.preparationMinutes}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, preparationMinutes: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <FormField label="Maximum active orders">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  type="number"
                  min={1}
                  max={500}
                  value={form.orderCapacity}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, orderCapacity: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <h3 className="md:col-span-2 mt-2 border-t border-slate-200 pt-4 text-sm font-semibold text-slate-900">
                Map location
              </h3>
              <FormField label="Latitude">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  type="number"
                  step="0.000001"
                  value={form.latitude}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, latitude: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <FormField label="Longitude">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  type="number"
                  step="0.000001"
                  value={form.longitude}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, longitude: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <h3 className="md:col-span-2 mt-2 border-t border-slate-200 pt-4 text-sm font-semibold text-slate-900">
                Logo and owner documents
              </h3>
              <FormField label="Store logo URL">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  value={form.image}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, image: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <label className="grid gap-2 rounded border border-slate-300 bg-white p-3 text-sm text-slate-700">
                <span>
                  {form.kycIdUrl ? "Identity document uploaded" : "Upload identity document"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      const url = await uploadFile(file, "document");
                      setForm((current) => (current ? { ...current, kycIdUrl: url } : current));
                      setStatus("Identity document uploaded privately.");
                    } catch (error: unknown) {
                      setStatus(error instanceof Error ? error.message : "Document upload failed.");
                    }
                  }}
                />
              </label>
              <label className="grid gap-2 rounded border border-slate-300 bg-white p-3 text-sm text-slate-700">
                <span>
                  {form.kycProofUrl ? "Address document uploaded" : "Upload proof of address"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      const url = await uploadFile(file, "document");
                      setForm((current) => (current ? { ...current, kycProofUrl: url } : current));
                      setStatus("Proof of address uploaded privately.");
                    } catch (error: unknown) {
                      setStatus(error instanceof Error ? error.message : "Document upload failed.");
                    }
                  }}
                />
              </label>
              <h3 className="md:col-span-2 mt-2 border-t border-slate-200 pt-4 text-sm font-semibold text-slate-900">
                Banking details
              </h3>
              <FormField label="Bank name">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  value={form.bankName}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, bankName: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <FormField label="Account holder name">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  value={form.bankAccountName}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, bankAccountName: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <FormField label="Account number">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  placeholder={
                    vendor?.bankAccountLast4
                      ? `New account number (current ends ${vendor.bankAccountLast4})`
                      : "Account number"
                  }
                  value={form.bankAccountNumber}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, bankAccountNumber: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <FormField label="Branch code">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  value={form.bankBranchCode}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, bankBranchCode: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <FormField label="Account type">
                <select
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  value={form.bankAccountType}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, bankAccountType: event.target.value } : current,
                    )
                  }
                >
                  <option value="">Account type</option>
                  <option value="CHEQUE">Cheque/current</option>
                  <option value="SAVINGS">Savings</option>
                  <option value="TRANSMISSION">Transmission</option>
                </select>
              </FormField>
              <div className="self-end rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
                Bank verification: {vendor?.bankVerificationStatus || "UNVERIFIED"}
              </div>
              <div className="md:col-span-2 mt-2 border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  Liquor permission (only if applicable)
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Liquor products remain hidden until Lethela verifies a current licence.
                </p>
              </div>
              <label className="grid gap-2 rounded border border-slate-300 bg-white p-3 text-sm text-slate-700">
                <span>
                  {form.liquorLicenceUrl ? "Liquor licence uploaded" : "Upload liquor licence"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      const url = await uploadFile(file, "document");
                      setForm((current) =>
                        current ? { ...current, liquorLicenceUrl: url } : current,
                      );
                      setStatus("Liquor licence uploaded privately.");
                    } catch (error: unknown) {
                      setStatus(error instanceof Error ? error.message : "Document upload failed.");
                    }
                  }}
                />
              </label>
              <div className="self-end rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
                Licence verification: {vendor?.liquorVerificationStatus || "NOT_APPLICABLE"}
                {vendor?.liquorReviewReason ? (
                  <span className="mt-1 block text-amber-800">{vendor.liquorReviewReason}</span>
                ) : null}
              </div>
              <FormField label="Licence number">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  value={form.liquorLicenceNumber}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, liquorLicenceNumber: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <FormField label="Licence holder">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  value={form.liquorLicenceHolder}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, liquorLicenceHolder: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <FormField label="Licensed premises">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  value={form.liquorLicencePremises}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, liquorLicencePremises: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <FormField label="Licence province">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  value={form.liquorLicenceProvince}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, liquorLicenceProvince: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <FormField label="Licence type">
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  value={form.liquorLicenceType}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, liquorLicenceType: event.target.value } : current,
                    )
                  }
                />
              </FormField>
              <label className="grid gap-1 text-sm text-slate-600">
                <span>Licence expiry or renewal date</span>
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-black"
                  type="date"
                  value={form.liquorLicenceExpiry}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, liquorLicenceExpiry: event.target.value } : current,
                    )
                  }
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.halaal}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, halaal: event.target.checked } : current,
                    )
                  }
                />
                Halaal friendly menu
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.temporaryClosed}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, temporaryClosed: event.target.checked } : current,
                    )
                  }
                />
                Temporarily close this store
              </label>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;

                try {
                  const url = await uploadFile(file, "profile");
                  setForm((current) => (current ? { ...current, image: url } : current));
                  setStatus("Store logo uploaded.");
                } catch (error: unknown) {
                  setStatus(error instanceof Error ? error.message : "Image upload failed.");
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm transition-colors hover:border-lethela-primary hover:text-lethela-primary"
            >
              Upload store logo
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded bg-lethela-primary px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save profile"}
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm transition-colors hover:border-lethela-primary hover:text-lethela-primary"
            >
              Refresh
            </button>
            {vendor ? (
              <a
                href={`/vendors/${vendor.slug}`}
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm transition-colors hover:border-lethela-primary hover:text-lethela-primary"
              >
                View public profile
              </a>
            ) : null}
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/vendor/logout", { method: "POST" });
                router.push("/signin");
                router.refresh();
              }}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm transition-colors hover:border-lethela-primary hover:text-lethela-primary"
            >
              Sign out
            </button>
          </div>
        </>
      )}

      {status ? <p className="mt-3 text-xs text-slate-600">{status}</p> : null}
    </DashCard>
  );
}
