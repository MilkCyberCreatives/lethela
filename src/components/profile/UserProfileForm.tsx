"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import {
  Camera,
  CheckCircle2,
  LoaderCircle,
  LogOut,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";

type UserProfile = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  image: string | null;
  createdAt: string;
};

type StatusState = {
  message: string;
  tone: "success" | "error" | "info";
};

function roleLabel(role: string | null | undefined) {
  const normalized = String(role || "USER")
    .replaceAll("_", " ")
    .toLowerCase();
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function UserProfileForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<StatusState | null>(null);
  const [privacyDetails, setPrivacyDetails] = useState("");
  const [privacyBusy, setPrivacyBusy] = useState<string | null>(null);
  const [closureConfirm, setClosureConfirm] = useState(false);

  async function load() {
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch("/api/me", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to load profile.");
      }
      setProfile(json.user);
      setName(json.user.name || "");
      setImage(json.user.image || "");
      setPhone(json.user.phone || "");
    } catch (error: unknown) {
      setStatus({
        message: error instanceof Error ? error.message : "Failed to load profile.",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Choose a valid image file.");
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Profile photos must be smaller than 5 MB.");
    }

    const fd = new FormData();
    fd.append("file", file);

    const response = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error || "Upload failed.");
    }

    return json.url as string;
  }

  async function save(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), image: image || null }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to save profile.");
      }
      setProfile(json.user);
      setName(json.user.name || "");
      setImage(json.user.image || "");
      setPhone(json.user.phone || "");
      setStatus({ message: "Account details updated.", tone: "success" });
    } catch (error: unknown) {
      setStatus({
        message: error instanceof Error ? error.message : "Failed to save profile.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function requestPrivacy(type: "ACCESS" | "CORRECTION" | "CLOSURE") {
    if (type === "CLOSURE" && !closureConfirm) {
      setClosureConfirm(true);
      return;
    }

    setPrivacyBusy(type);
    setStatus(null);
    try {
      const details =
        type === "CLOSURE"
          ? "Please close my account, subject to required operational and legal retention."
          : privacyDetails.trim();
      const response = await fetch("/api/me/privacy-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, details }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Could not submit the request.");
      }
      setPrivacyDetails("");
      setClosureConfirm(false);
      setStatus({
        message:
          type === "CLOSURE"
            ? "Account-closure request submitted."
            : `${roleLabel(type)} request submitted.`,
        tone: "success",
      });
    } catch (error: unknown) {
      setStatus({
        message: error instanceof Error ? error.message : "Could not submit the request.",
        tone: "error",
      });
    } finally {
      setPrivacyBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid animate-pulse gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <div className="h-52 rounded-2xl bg-slate-100" />
          <div className="grid gap-4">
            <div className="h-8 w-48 rounded bg-slate-100" />
            <div className="h-12 rounded-xl bg-slate-100" />
            <div className="h-12 rounded-xl bg-slate-100" />
            <div className="h-12 rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Profile details could not be loaded</h2>
        <p className="mt-2 text-sm text-red-700">{status?.message || "Please try again."}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-lethela-primary px-4 py-2.5 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  const completedFields = [Boolean(name.trim()), Boolean(phone.trim()), Boolean(image)].filter(
    Boolean,
  ).length;
  const completion = Math.round((completedFields / 3) * 100);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lethela-primary">
            Profile details
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Personal and delivery information</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Keep these details current so vendors, riders and support can contact you about an order.
          </p>
        </div>
        <div className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
          Profile {completion}% complete
        </div>
      </div>

      <div className="grid min-w-0 gap-6 p-5 sm:p-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="min-w-0">
          <div className="mx-auto flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-[0_0_0_1px_rgba(148,163,184,0.35)] lg:mx-0">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={name || "User profile"} className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-16 w-16 text-slate-300" aria-hidden="true" />
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setUploading(true);
              setStatus(null);
              try {
                const url = await uploadImage(file);
                setImage(url);
                setStatus({
                  message: "Photo uploaded. Select Save changes to keep it on your profile.",
                  tone: "info",
                });
              } catch (error: unknown) {
                setStatus({
                  message: error instanceof Error ? error.message : "Upload failed.",
                  tone: "error",
                });
              } finally {
                setUploading(false);
              }
            }}
          />

          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-lethela-primary hover:text-lethela-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {uploading ? "Uploading..." : "Change photo"}
            </button>
            {image ? (
              <button
                type="button"
                onClick={() => setImage("")}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Remove photo
              </button>
            ) : null}
          </div>

          <div className="mt-5 space-y-2 text-xs text-slate-500">
            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
              <span className="font-semibold text-slate-700">Account:</span> {roleLabel(profile.role)}
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
              <span className="font-semibold text-slate-700">Joined:</span>{" "}
              {new Date(profile.createdAt).toLocaleDateString("en-ZA", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <form onSubmit={save} className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-800" htmlFor="profile-name">
                <span className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-slate-400" />
                  Full name
                </span>
                <input
                  id="profile-name"
                  name="name"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-lethela-primary focus:bg-white focus:ring-2 focus:ring-lethela-primary/15"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-800" htmlFor="profile-phone">
                <span className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  Mobile number
                </span>
                <input
                  id="profile-phone"
                  name="phone"
                  type="tel"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-lethela-primary focus:bg-white focus:ring-2 focus:ring-lethela-primary/15"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="e.g. 072 123 4567"
                  autoComplete="tel"
                  inputMode="tel"
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-medium text-slate-800" htmlFor="profile-email">
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                Account email
              </span>
              <input
                id="profile-email"
                name="email"
                type="email"
                className="h-12 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 text-base text-slate-600"
                value={profile.email}
                readOnly
                aria-describedby="profile-email-help"
              />
              <span id="profile-email-help" className="text-xs font-normal text-slate-500">
                Contact support when you need to change your account email.
              </span>
            </label>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={saving || uploading}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-lethela-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: "/" })}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </form>

          {status ? (
            <div
              role="status"
              className={`mt-5 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
                status.tone === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : status.tone === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-blue-200 bg-blue-50 text-blue-800"
              }`}
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              {status.message}
            </div>
          ) : null}
        </div>
      </div>

      <section id="privacy-requests" className="border-t border-slate-200 bg-slate-50/70 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lethela-primary shadow-sm ring-1 ring-slate-200">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-slate-950">Privacy and account requests</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Request a copy of your information, ask for a correction review or request account
              closure. Transaction and compliance records may still be retained where legally required.
            </p>

            <label className="mt-4 grid gap-2 text-sm font-medium text-slate-800" htmlFor="privacy-details">
              Optional details
              <textarea
                id="privacy-details"
                value={privacyDetails}
                onChange={(event) => setPrivacyDetails(event.target.value)}
                rows={3}
                className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-normal text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-lethela-primary focus:ring-2 focus:ring-lethela-primary/15"
                placeholder="Add information that will help the privacy team understand your request."
              />
            </label>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => void requestPrivacy("ACCESS")}
                disabled={privacyBusy !== null}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-lethela-primary hover:text-lethela-primary disabled:opacity-60"
              >
                {privacyBusy === "ACCESS" ? "Submitting..." : "Request my data"}
              </button>
              <button
                type="button"
                onClick={() => void requestPrivacy("CORRECTION")}
                disabled={privacyBusy !== null}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-lethela-primary hover:text-lethela-primary disabled:opacity-60"
              >
                {privacyBusy === "CORRECTION" ? "Submitting..." : "Request correction"}
              </button>
              <button
                type="button"
                onClick={() => void requestPrivacy("CLOSURE")}
                disabled={privacyBusy !== null}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
              >
                {privacyBusy === "CLOSURE"
                  ? "Submitting..."
                  : closureConfirm
                    ? "Confirm account closure request"
                    : "Request account closure"}
              </button>
              {closureConfirm ? (
                <button
                  type="button"
                  onClick={() => setClosureConfirm(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
              ) : null}
            </div>

            {closureConfirm ? (
              <p className="mt-3 text-xs leading-5 text-red-700">
                Select the red button again to submit the closure request. This sends a request for
                review and does not immediately erase legally retained order records.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
