"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";

type UserProfile = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
  createdAt: string;
};

export default function UserProfileForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

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
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, image: image || null }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to save profile.");
      }
      setProfile(json.user);
      setName(json.user.name || "");
      setImage(json.user.image || "");
      setStatus("User profile updated.");
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      {loading ? (
        <div className="text-sm text-white/70">Loading profile...</div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-[280px,1fr]">
            <div>
              <div className="aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black/15">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt={name || "User profile"} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-white/45">
                    No profile photo yet
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-white/15 px-3 py-1">{profile?.role || "USER"}</span>
                {profile?.createdAt ? (
                  <span className="rounded-full border border-white/15 px-3 py-1">
                    Joined {new Date(profile.createdAt).toLocaleDateString()}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/60">
                  Full name
                </label>
                <input
                  className="w-full rounded bg-white px-3 py-2 text-black"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/60">
                  Email
                </label>
                <input
                  className="w-full rounded bg-white/90 px-3 py-2 text-black"
                  value={profile?.email || ""}
                  readOnly
                />
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/60">
                  Profile photo URL
                </label>
                <input
                  className="w-full rounded bg-white px-3 py-2 text-black"
                  value={image}
                  onChange={(event) => setImage(event.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
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
                      setImage(url);
                      setStatus("Profile photo uploaded.");
                    } catch (error: unknown) {
                      setStatus(error instanceof Error ? error.message : "Upload failed.");
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded border border-white/20 px-4 py-2 text-sm transition-colors hover:border-lethela-primary hover:text-lethela-primary"
                >
                  Upload profile photo
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
                  onClick={() => void signOut({ callbackUrl: "/" })}
                  className="rounded border border-white/20 px-4 py-2 text-sm transition-colors hover:border-lethela-primary hover:text-lethela-primary"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>

          {status ? <p className="mt-4 text-sm text-white/75">{status}</p> : null}
        </>
      )}
    </div>
  );
}
