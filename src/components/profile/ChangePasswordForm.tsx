"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { REGISTRATION_PASSWORD_MIN_LENGTH } from "@/lib/registration-policy";

const inputClass =
  "h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-lethela-primary focus:bg-white focus:ring-2 focus:ring-lethela-primary/15";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/me/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, password, confirmPassword }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok) {
        setError(typeof json?.error === "string" ? json.error : "Password could not be changed.");
        return;
      }
      setDone(json.message || "Password changed. Please sign in again.");
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      window.setTimeout(() => {
        void signOut({ callbackUrl: "/signin?callbackUrl=/profile" });
      }, 1800);
    } catch {
      setError("Password could not be changed. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lethela-primary">
          Password
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">Change your password</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Use at least {REGISTRATION_PASSWORD_MIN_LENGTH} characters. You will be signed out on all
          devices and can sign in again straight away.
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-5 p-5 sm:p-6">
        <label className="grid gap-2 text-sm font-medium text-slate-800" htmlFor="current-password">
          Current password
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            className={inputClass}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </label>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-800" htmlFor="new-password">
            New password
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={REGISTRATION_PASSWORD_MIN_LENGTH}
              className={inputClass}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <label
            className="grid gap-2 text-sm font-medium text-slate-800"
            htmlFor="confirm-new-password"
          >
            Confirm new password
            <input
              id="confirm-new-password"
              type="password"
              autoComplete="new-password"
              minLength={REGISTRATION_PASSWORD_MIN_LENGTH}
              className={inputClass}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </label>
        </div>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        {done ? (
          <p
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            role="status"
          >
            {done}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={saving || Boolean(done)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-lethela-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Change password"}
          </button>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-slate-600 underline underline-offset-4"
          >
            Forgot your current password?
          </Link>
        </div>
      </form>
    </div>
  );
}
