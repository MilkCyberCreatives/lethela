"use client";

import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, ExternalLink, ImagePlus, LocateFixed } from "lucide-react";
import FormField from "./FormField";
import { NEW_VENDOR_PLACEHOLDER_NAME, STORE_TYPES } from "@/lib/vendor-readiness";
import { DEFAULT_PROVINCE, SA_PROVINCES } from "@/lib/provinces";
import { dashButton, dashField, Panel, StatusBadge } from "./kit/ui";

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

type TextField = {
  [K in keyof ProfileFormState]: ProfileFormState[K] extends string ? K : never;
}[keyof ProfileFormState];

type StatusMessage = { tone: "success" | "error"; text: string } | null;

const DOCUMENT_TYPES = "image/jpeg,image/png,image/webp,image/avif,application/pdf";

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
  const isPlaceholderName =
    vendor.name.trim().toLowerCase() === NEW_VENDOR_PLACEHOLDER_NAME.toLowerCase();
  return {
    name: isPlaceholderName ? "" : vendor.name,
    description: vendor.description || "",
    coverImage: vendor.coverImage || "",
    phone: vendor.phone || "",
    address: vendor.address || "",
    suburb: vendor.suburb || "",
    city: vendor.city || "",
    province: vendor.province || DEFAULT_PROVINCE,
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

function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

const STORE_STATUS: Record<
  string,
  { label: string; tone: "success" | "warning" | "danger" | "neutral" }
> = {
  APPROVED: { label: "Approved", tone: "success" },
  ACTIVE: { label: "Approved", tone: "success" },
  SUBMITTED: { label: "Waiting for approval", tone: "warning" },
  UNDER_REVIEW: { label: "Waiting for approval", tone: "warning" },
  CHANGES_REQUESTED: { label: "Changes needed", tone: "warning" },
  REJECTED: { label: "Not approved", tone: "danger" },
  SUSPENDED: { label: "Paused by Lethela", tone: "danger" },
};

/** A collapsible part of the profile for details that can be added later. */
function LaterSection({
  id,
  title,
  description,
  done,
  children,
}: {
  id: string;
  title: string;
  description: string;
  done: boolean;
  children: ReactNode;
}) {
  return (
    <details id={id} className="scroll-mt-24 rounded-xl border border-slate-200 bg-white">
      <summary className="flex items-center gap-3 rounded-xl px-4 py-3.5 transition-colors hover:bg-slate-50 sm:px-5">
        <ChevronRight
          className="dash-summary-chevron h-4 w-4 shrink-0 text-slate-400"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-slate-900">{title}</span>
          <span className="mt-0.5 block text-sm leading-5 text-slate-500">{description}</span>
        </span>
        {done ? (
          <StatusBadge tone="success">Added</StatusBadge>
        ) : (
          <StatusBadge tone="neutral" dot={false}>
            Optional
          </StatusBadge>
        )}
      </summary>
      <div className="border-t border-slate-100 p-4 sm:p-5">{children}</div>
    </details>
  );
}

function UploadBox({
  label,
  uploaded,
  uploadedText,
  onFile,
}: {
  label: string;
  uploaded: boolean;
  uploadedText: string;
  onFile: (file: File) => void;
}) {
  return (
    <label className="grid content-start gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm">
      <span className="flex items-center justify-between gap-2 font-medium text-slate-800">
        {label}
        {uploaded ? <StatusBadge tone="success">{uploadedText}</StatusBadge> : null}
      </span>
      <input
        type="file"
        accept={DOCUMENT_TYPES}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

export default function ProfileManager() {
  const logoInput = useRef<HTMLInputElement>(null);
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<StatusMessage>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Failed to load profile.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // Links such as ?tab=profile#store-banking open the matching section.
  useEffect(() => {
    if (loading) return;
    function openFromHash() {
      const id = window.location.hash.slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (target instanceof HTMLDetailsElement) target.open = true;
      target?.scrollIntoView({ block: "start" });
    }
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [loading]);

  function update<K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

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

  async function uploadInto(field: TextField, file: File, kind: "profile" | "document") {
    setMessage(null);
    try {
      const url = await uploadFile(file, kind);
      update(field, url);
      setMessage({ tone: "success", text: "Uploaded. Save your changes to keep it." });
    } catch (error: unknown) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Upload failed.",
      });
    }
  }

  function fillCurrentLocation() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setMessage({ tone: "error", text: "This device cannot share its location." });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        update("latitude", position.coords.latitude.toFixed(6));
        update("longitude", position.coords.longitude.toFixed(6));
        setLocating(false);
        setMessage({ tone: "success", text: "Location added. Save your changes to keep it." });
      },
      () => {
        setLocating(false);
        setMessage({
          tone: "error",
          text: "We could not get your location. Allow location access and try again.",
        });
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function save() {
    if (!form) return;

    setSaving(true);
    setMessage(null);
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
        const errors: Record<string, string> = {};
        for (const [key, value] of Object.entries(json.fieldErrors || {})) {
          if (Array.isArray(value) && value[0]) errors[key] = String(value[0]);
        }
        setFieldErrors(errors);
        throw new Error(json.error || "Failed to save profile.");
      }

      setVendor(json.vendor);
      setForm(buildFormState(json.vendor));
      setFieldErrors({});
      setMessage({ tone: "success", text: "Your store details are saved." });
    } catch (error: unknown) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Failed to save profile.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) {
    return (
      <div className="space-y-4" aria-busy="true">
        {[0, 1].map((key) => (
          <div key={key} className="animate-pulse rounded-xl border border-slate-200 bg-white p-5">
            <div className="h-4 w-48 rounded bg-slate-100" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="h-11 rounded-lg bg-slate-100" />
              <div className="h-11 rounded-lg bg-slate-100" />
            </div>
          </div>
        ))}
        {message ? <p className="text-sm text-red-700">{message.text}</p> : null}
      </div>
    );
  }

  const text = (key: TextField, props: InputHTMLAttributes<HTMLInputElement> = {}): ReactNode => (
    <input
      className={dashField.input}
      value={form[key]}
      aria-invalid={fieldErrors[key] ? true : undefined}
      onChange={(event) => update(key, event.target.value)}
      {...props}
    />
  );
  const approved = ["APPROVED", "ACTIVE"].includes(vendor?.status || "");
  const storeStatus = STORE_STATUS[vendor?.status || ""] || {
    label: "Setting up",
    tone: "neutral" as const,
  };
  const hasPin = form.latitude !== "" && form.longitude !== "";
  const bankingDone = Boolean(
    form.bankName && form.bankAccountName && (form.bankAccountNumber || vendor?.bankAccountLast4),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <StatusBadge tone={storeStatus.tone}>{storeStatus.label}</StatusBadge>
        {form.temporaryClosed ? <StatusBadge tone="warning">Paused</StatusBadge> : null}
        <span>
          <span className="font-semibold text-lethela-primary">*</span> needed before Lethela can
          approve your store. Everything else can wait.
        </span>
        {approved && vendor ? (
          <Link href={`/vendors/${vendor.slug}`} className={`${dashButton.link} ml-auto`}>
            View store page
            <ExternalLink aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      <Panel
        id="store-basics"
        title="Store name and contact"
        description="Customers see your store name. Lethela and riders call this number about orders."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Store name" required error={fieldErrors.name}>
            {text("name", {
              placeholder: "For example Mama's Kota Corner",
              autoComplete: "organization",
            })}
          </FormField>
          <FormField
            label="Phone or WhatsApp number"
            required
            error={fieldErrors.phone}
            hint="At least 8 digits."
          >
            {text("phone", { type: "tel", inputMode: "tel", autoComplete: "tel" })}
          </FormField>
        </div>
      </Panel>

      <Panel
        id="store-address"
        title="Store address"
        description="Where riders collect orders. Delivery fees are worked out from here."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Street address"
            required
            className="sm:col-span-2"
            error={fieldErrors.address}
          >
            {text("address", {
              placeholder: "Stand number and street name",
              autoComplete: "street-address",
            })}
          </FormField>
          <FormField label="Township or suburb" required error={fieldErrors.suburb}>
            <input
              className={dashField.input}
              value={form.township}
              placeholder="For example Klipfontein View"
              aria-invalid={fieldErrors.suburb ? true : undefined}
              onChange={(event) => {
                update("township", event.target.value);
                update("suburb", event.target.value);
              }}
            />
          </FormField>
          <FormField label="City or town" required error={fieldErrors.city}>
            {text("city", { placeholder: "For example Midrand" })}
          </FormField>
          <FormField label="Province" required error={fieldErrors.province}>
            <select
              className={dashField.input}
              value={form.province}
              onChange={(event) => update("province", event.target.value)}
            >
              {SA_PROVINCES.includes(form.province as (typeof SA_PROVINCES)[number]) ||
              !form.province ? null : (
                <option value={form.province}>{form.province}</option>
              )}
              {SA_PROVINCES.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Section or extension" hint="Optional.">
            {text("sectionArea")}
          </FormField>
          <FormField
            label="Pickup notes for riders"
            className="sm:col-span-2"
            hint="Optional. For example: side gate next to the tuck shop."
          >
            <textarea
              className={dashField.input}
              rows={2}
              value={form.pickupInstructions}
              onChange={(event) => update("pickupInstructions", event.target.value)}
            />
          </FormField>
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-sm">
              <p className="font-medium text-slate-800">
                {hasPin ? "Your store is pinned on the map" : "Pin your store on the map"}
              </p>
              <p className="mt-0.5 text-slate-500">
                {hasPin
                  ? `${Number(form.latitude).toFixed(5)}, ${Number(form.longitude).toFixed(5)}`
                  : "Optional. Tap the button while you are at your store for more accurate delivery fees."}
              </p>
            </div>
            <button
              type="button"
              onClick={fillCurrentLocation}
              disabled={locating}
              className={`${dashButton.secondary} shrink-0`}
            >
              <LocateFixed aria-hidden="true" />
              {locating ? "Finding you…" : hasPin ? "Update to where I am" : "Use where I am now"}
            </button>
          </div>
        </div>
      </Panel>

      <div className="space-y-3">
        <div className="px-1">
          <h2 className="text-[15px] font-semibold text-slate-900">Add later</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            None of these are needed for approval. Open a section when you are ready.
          </p>
        </div>

        <LaterSection
          id="store-look"
          title="Logo and description"
          description="Helps customers recognise your store."
          done={Boolean(form.image)}
        >
          <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
            <div className="grid content-start gap-2">
              <div className="aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {form.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center px-3 text-center text-xs text-slate-500">
                    No logo yet
                  </div>
                )}
              </div>
              <input
                ref={logoInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadInto("image", file, "profile");
                }}
              />
              <button
                type="button"
                onClick={() => logoInput.current?.click()}
                className={dashButton.secondary}
              >
                <ImagePlus aria-hidden="true" />
                {form.image ? "Change logo" : "Upload logo"}
              </button>
            </div>
            <div className="grid content-start gap-4">
              <FormField label="About your store" hint="One or two sentences customers will read.">
                <textarea
                  className={dashField.input}
                  rows={3}
                  value={form.description}
                  onChange={(event) => update("description", event.target.value)}
                />
              </FormField>
              <FormField label="Cover picture link" hint="Optional web link to a wide photo.">
                {text("coverImage", { inputMode: "url" })}
              </FormField>
            </div>
          </div>
        </LaterSection>

        <LaterSection
          id="store-extras"
          title="Store type, categories and timing"
          description="Helps customers find you and know how long orders take."
          done={Boolean(form.storeType && form.cuisineInput.trim())}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Store type" error={fieldErrors.storeType}>
              <select
                className={dashField.input}
                value={form.storeType}
                onChange={(event) => update("storeType", event.target.value)}
              >
                <option value="">Choose a store type</option>
                {STORE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              label="What you sell"
              hint="Separate with commas, for example: kota, chips, cold drinks."
              error={fieldErrors.cuisine}
            >
              {text("cuisineInput", { placeholder: "Kota, groceries, bread" })}
            </FormField>
            <FormField
              label="Preparation time (minutes)"
              hint="How long an order usually takes to get ready."
              error={fieldErrors.preparationMinutes}
            >
              {text("preparationMinutes", {
                type: "number",
                min: 5,
                max: 180,
                inputMode: "numeric",
              })}
            </FormField>
            <FormField
              label="Delivery time shown to customers (minutes)"
              error={fieldErrors.etaMins}
            >
              {text("etaMins", { type: "number", min: 10, max: 120, inputMode: "numeric" })}
            </FormField>
            <FormField label="Most orders you can handle at once" error={fieldErrors.orderCapacity}>
              {text("orderCapacity", { type: "number", min: 1, max: 500, inputMode: "numeric" })}
            </FormField>
            <label className="flex items-center gap-3 self-end rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800">
              <input
                type="checkbox"
                className="h-4 w-4 accent-lethela-primary"
                checked={form.halaal}
                onChange={(event) => update("halaal", event.target.checked)}
              />
              Halaal friendly menu
            </label>
            <p className="text-xs leading-5 text-slate-500 sm:col-span-2">
              Lethela works out the delivery fee from the distance to each customer.
            </p>
          </div>
        </LaterSection>

        <LaterSection
          id="store-banking"
          title="Banking details"
          description="Needed before your first payout."
          done={bankingDone}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Bank name">{text("bankName", { autoComplete: "off" })}</FormField>
            <FormField label="Account holder name">
              {text("bankAccountName", { autoComplete: "off" })}
            </FormField>
            <FormField
              label="Account number"
              error={fieldErrors.bankAccountNumber}
              hint={
                vendor?.bankAccountLast4
                  ? `Saved account ends in ${vendor.bankAccountLast4}. Type a new number only to change it.`
                  : undefined
              }
            >
              {text("bankAccountNumber", {
                inputMode: "numeric",
                autoComplete: "off",
                placeholder: vendor?.bankAccountLast4 ? "Leave empty to keep it" : "Account number",
              })}
            </FormField>
            <FormField label="Branch code">
              {text("bankBranchCode", { inputMode: "numeric", autoComplete: "off" })}
            </FormField>
            <FormField label="Account type">
              <select
                className={dashField.input}
                value={form.bankAccountType}
                onChange={(event) => update("bankAccountType", event.target.value)}
              >
                <option value="">Choose account type</option>
                <option value="CHEQUE">Cheque or current</option>
                <option value="SAVINGS">Savings</option>
                <option value="TRANSMISSION">Transmission</option>
              </select>
            </FormField>
            <div className="self-end text-sm text-slate-600">
              Checked by Lethela:{" "}
              <StatusBadge
                tone={vendor?.bankVerificationStatus === "VERIFIED" ? "success" : "neutral"}
              >
                {vendor?.bankVerificationStatus === "VERIFIED" ? "Yes" : "Not yet"}
              </StatusBadge>
            </div>
          </div>
        </LaterSection>

        <LaterSection
          id="store-documents"
          title="Owner documents"
          description="ID and proof of address. Lethela may ask for these later."
          done={Boolean(form.kycIdUrl && form.kycProofUrl)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <UploadBox
              label="ID document"
              uploaded={Boolean(form.kycIdUrl)}
              uploadedText="Uploaded"
              onFile={(file) => void uploadInto("kycIdUrl", file, "document")}
            />
            <UploadBox
              label="Proof of address"
              uploaded={Boolean(form.kycProofUrl)}
              uploadedText="Uploaded"
              onFile={(file) => void uploadInto("kycProofUrl", file, "document")}
            />
            <p className="text-xs leading-5 text-slate-500 sm:col-span-2">
              Documents are stored privately. Only Lethela can open them.
            </p>
          </div>
        </LaterSection>

        <LaterSection
          id="store-liquor"
          title="Liquor licence"
          description="Only if you sell alcohol. Liquor stays hidden until Lethela checks the licence."
          done={Boolean(form.liquorLicenceUrl)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <UploadBox
              label="Liquor licence"
              uploaded={Boolean(form.liquorLicenceUrl)}
              uploadedText="Uploaded"
              onFile={(file) => void uploadInto("liquorLicenceUrl", file, "document")}
            />
            <div className="self-center text-sm text-slate-600">
              Licence check:{" "}
              <StatusBadge
                tone={vendor?.liquorVerificationStatus === "APPROVED" ? "success" : "neutral"}
              >
                {statusLabel(vendor?.liquorVerificationStatus || "NOT_APPLICABLE")}
              </StatusBadge>
              {vendor?.liquorReviewReason ? (
                <span className="mt-1 block text-amber-800">{vendor.liquorReviewReason}</span>
              ) : null}
            </div>
            <FormField label="Licence number">{text("liquorLicenceNumber")}</FormField>
            <FormField label="Licence holder">{text("liquorLicenceHolder")}</FormField>
            <FormField label="Licensed premises">{text("liquorLicencePremises")}</FormField>
            <FormField label="Licence province">{text("liquorLicenceProvince")}</FormField>
            <FormField label="Licence type">{text("liquorLicenceType")}</FormField>
            <FormField label="Expiry or renewal date">
              {text("liquorLicenceExpiry", { type: "date" })}
            </FormField>
          </div>
        </LaterSection>
      </div>

      <Panel
        title="Pause your store"
        description="Stop new orders for a while, for example when you run out of stock."
      >
        <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
          <input
            type="checkbox"
            className="h-4 w-4 accent-lethela-primary"
            checked={form.temporaryClosed}
            onChange={(event) => update("temporaryClosed", event.target.checked)}
          />
          Temporarily close my store
        </label>
      </Panel>

      <div className="sticky bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom))] z-10 lg:bottom-4">
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            className={`min-h-5 text-sm ${
              message?.tone === "error"
                ? "font-medium text-red-700"
                : message
                  ? "text-emerald-700"
                  : "text-slate-500"
            }`}
            role={message?.tone === "error" ? "alert" : "status"}
          >
            {message?.text || "Save after making changes."}
          </p>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className={`${dashButton.primary} sm:min-w-40`}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
