// /src/server/supabase.ts
import { createClient } from "@supabase/supabase-js";

export function hasStorageConfig() {
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE?.trim() &&
      process.env.SUPABASE_BUCKET?.trim()
  );
}

export function createAdminClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE!;
  if (!url || !key) throw new Error("Supabase server env not set");
  return createClient(url, key, { auth: { persistSession: false } });
}

export function publicUrl(path: string) {
  // Option 1: ask Supabase for public URL (recommended in prod)
  // But to avoid extra calls, we can use STORAGE_BUCKET_URL if you configured it.
  const base = process.env.STORAGE_BUCKET_URL;
  if (base) return `${base}/${path}`;
  // Fallback: return path only; client can still show a link (not ideal).
  return path;
}
