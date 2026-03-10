"use client";

import { useEffect, useRef, useState } from "react";
import DashCard from "./DashCard";

type VendorProfile = {
  id: string;
  slug: string;
  name: string;
  phone: string | null;
  address: string | null;
  suburb: string | null;
  city: string | null;
  province: string | null;
  cuisine: string | string[];
  deliveryFee: number;
  etaMins: number;
  halaal: boolean;
  image: string | null;
  kycIdUrl: string | null;
  kycProofUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  isActive: boolean;
  _count?: {
    products: number;
    orders: number;
    specials: number;
    hours: number;
  };
};

type ProfileFormState = {
  name: string;
  phone: string;
  address: string;
  suburb: string;
  city: string;
  province: string;
  cuisineInput: string;
  deliveryFee: string;
  etaMins: string;
  halaal: boolean;
  image: string;
  kycIdUrl: string;
  kycProofUrl: string;
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
    phone: vendor.phone || "",
    address: vendor.address || "",
    suburb: vendor.suburb || "",
    city: vendor.city || "",
    province: vendor.province || "",
    cuisineInput: parseCuisine(vendor.cuisine).join(", "),
    deliveryFee: String(Math.round(vendor.deliveryFee / 100)),
    etaMins: String(vendor.etaMins),
    halaal: vendor.halaal,
    image: vendor.image || "",
    kycIdUrl: vendor.kycIdUrl || "",
    kycProofUrl: vendor.kycProofUrl || "",
    latitude: vendor.latitude == null ? "" : String(vendor.latitude),
    longitude: vendor.longitude == null ? "" : String(vendor.longitude),
  };
}

function profileHealth(vendor: VendorProfile | null) {
  if (!vendor) {
    return { completed: 0, total: 0 };
  }

  const checks = [
    Boolean(vendor.phone && vendor.address && vendor.city && vendor.suburb && vendor.province),
    Boolean(vendor.image),
    Boolean(vendor.latitude != null && vendor.longitude != null),
    Boolean(vendor.kycIdUrl && vendor.kycProofUrl),
    Boolean(vendor._count?.hours),
  ];

  return {
    completed: checks.filter(Boolean).length,
    total: checks.length,
  };
}

export default function ProfileManager() {
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

  async function uploadImage(file: File) {
    const fd = new FormData();
    fd.append("file", file);

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
          phone: form.phone,
          address: form.address,
          suburb: form.suburb,
          city: form.city,
          province: form.province,
          cuisine: form.cuisineInput
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          deliveryFee: Math.max(0, Number(form.deliveryFee || "0")) * 100,
          etaMins: Number(form.etaMins),
          halaal: form.halaal,
          image: form.image || null,
          kycIdUrl: form.kycIdUrl || null,
          kycProofUrl: form.kycProofUrl || null,
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
  const progressPct =
    health.total > 0 ? Math.round((health.completed / health.total) * 100) : 0;

  return (
    <DashCard title="Store Profile">
      {loading || !form ? (
        <div className="text-sm text-white/70">Loading profile...</div>
      ) : (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-[0.95fr,1.05fr]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="aspect-[16/10] overflow-hidden rounded-xl border border-white/10 bg-black/20">
                {form.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.image}
                    alt={form.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-white/45">
                    No store image yet
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-white/15 px-3 py-1">
                  {vendor?.isActive ? "Active" : "Pending"}
                </span>
                <span className="rounded-full border border-white/15 px-3 py-1">
                  Status: {vendor?.status || "UNKNOWN"}
                </span>
                {vendor?.halaal ? (
                  <span className="rounded-full border border-white/15 px-3 py-1">
                    Halaal
                  </span>
                ) : null}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-white/65">
                  <span>Profile completeness</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="mt-2 h-2 rounded bg-white/10">
                  <div
                    className="h-2 rounded bg-lethela-primary"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="rounded bg-white px-3 py-2 text-black"
                placeholder="Business name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, name: event.target.value } : current
                  )
                }
              />
              <input
                className="rounded bg-white px-3 py-2 text-black"
                placeholder="Phone / WhatsApp"
                value={form.phone}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, phone: event.target.value } : current
                  )
                }
              />
              <input
                className="rounded bg-white px-3 py-2 text-black md:col-span-2"
                placeholder="Street address"
                value={form.address}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, address: event.target.value } : current
                  )
                }
              />
              <input
                className="rounded bg-white px-3 py-2 text-black"
                placeholder="Suburb"
                value={form.suburb}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, suburb: event.target.value } : current
                  )
                }
              />
              <input
                className="rounded bg-white px-3 py-2 text-black"
                placeholder="City"
                value={form.city}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, city: event.target.value } : current
                  )
                }
              />
              <input
                className="rounded bg-white px-3 py-2 text-black"
                placeholder="Province"
                value={form.province}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, province: event.target.value } : current
                  )
                }
              />
              <input
                className="rounded bg-white px-3 py-2 text-black"
                placeholder="Cuisine tags (comma separated)"
                value={form.cuisineInput}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, cuisineInput: event.target.value } : current
                  )
                }
              />
              <input
                className="rounded bg-white px-3 py-2 text-black"
                type="number"
                min={0}
                placeholder="Delivery fee (R)"
                value={form.deliveryFee}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, deliveryFee: event.target.value } : current
                  )
                }
              />
              <input
                className="rounded bg-white px-3 py-2 text-black"
                type="number"
                min={10}
                max={120}
                placeholder="Average ETA (minutes)"
                value={form.etaMins}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, etaMins: event.target.value } : current
                  )
                }
              />
              <input
                className="rounded bg-white px-3 py-2 text-black"
                type="number"
                step="0.000001"
                placeholder="Latitude"
                value={form.latitude}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, latitude: event.target.value } : current
                  )
                }
              />
              <input
                className="rounded bg-white px-3 py-2 text-black"
                type="number"
                step="0.000001"
                placeholder="Longitude"
                value={form.longitude}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, longitude: event.target.value } : current
                  )
                }
              />
              <input
                className="rounded bg-white px-3 py-2 text-black"
                placeholder="Image URL"
                value={form.image}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, image: event.target.value } : current
                  )
                }
              />
              <input
                className="rounded bg-white px-3 py-2 text-black"
                placeholder="KYC ID document URL"
                value={form.kycIdUrl}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, kycIdUrl: event.target.value } : current
                  )
                }
              />
              <input
                className="rounded bg-white px-3 py-2 text-black md:col-span-2"
                placeholder="KYC proof of address URL"
                value={form.kycProofUrl}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, kycProofUrl: event.target.value } : current
                  )
                }
              />
              <label className="inline-flex items-center gap-2 text-sm text-white/85">
                <input
                  type="checkbox"
                  checked={form.halaal}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, halaal: event.target.checked } : current
                    )
                  }
                />
                Halaal friendly menu
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
                  const url = await uploadImage(file);
                  setForm((current) =>
                    current ? { ...current, image: url } : current
                  );
                  setStatus("Store image uploaded.");
                } catch (error: unknown) {
                  setStatus(
                    error instanceof Error ? error.message : "Image upload failed."
                  );
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded border border-white/20 px-3 py-2 text-sm transition-colors hover:border-lethela-primary hover:text-lethela-primary"
            >
              Upload store image
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
              className="rounded border border-white/20 px-3 py-2 text-sm transition-colors hover:border-lethela-primary hover:text-lethela-primary"
            >
              Refresh
            </button>
            {vendor ? (
              <a
                href={`/vendors/${vendor.slug}`}
                className="rounded border border-white/20 px-3 py-2 text-sm transition-colors hover:border-lethela-primary hover:text-lethela-primary"
              >
                View public profile
              </a>
            ) : null}
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/vendor/logout", { method: "POST" });
                window.location.href = "/vendors/signin";
              }}
              className="rounded border border-white/20 px-3 py-2 text-sm transition-colors hover:border-lethela-primary hover:text-lethela-primary"
            >
              Sign out
            </button>
          </div>
        </>
      )}

      {status ? <p className="mt-3 text-xs text-white/75">{status}</p> : null}
    </DashCard>
  );
}
