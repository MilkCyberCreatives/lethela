// /src/server/supabase.ts
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

type UploadInput = {
  path: string;
  buffer: Buffer;
  contentType: string;
  visibility?: "public" | "private";
};

const SAFE_PATH = /^[a-zA-Z0-9][a-zA-Z0-9/_\-.]{1,220}$/;

function normalizedStorageMode() {
  return (process.env.UPLOAD_STORAGE || "").trim().toLowerCase();
}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

export function hasSupabaseStorageConfig() {
  if (normalizedStorageMode() === "local") return false;
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE?.trim() &&
      process.env.SUPABASE_BUCKET?.trim(),
  );
}

export function hasLocalStorageConfig() {
  const mode = normalizedStorageMode();
  if (mode && mode !== "local") return false;
  if (isProductionRuntime()) {
    return Boolean(
      process.env.STORAGE_LOCAL_DIR?.trim() && process.env.STORAGE_PUBLIC_PATH?.trim(),
    );
  }
  return Boolean(
    process.env.STORAGE_LOCAL_DIR?.trim() ||
      process.env.STORAGE_PUBLIC_PATH?.trim() ||
      process.env.NODE_ENV !== "production",
  );
}

export function hasStorageConfig() {
  return hasSupabaseStorageConfig() || hasLocalStorageConfig();
}

export function storageProvider() {
  if (hasSupabaseStorageConfig()) return "supabase";
  if (hasLocalStorageConfig()) return "local";
  return "none";
}

function publicPathPrefix() {
  return (process.env.STORAGE_PUBLIC_PATH || "/uploads").trim().replace(/\/+$/, "") || "/uploads";
}

function localStorageRoot() {
  return path.resolve(
    process.env.STORAGE_LOCAL_DIR || path.join(process.cwd(), "public", "uploads"),
  );
}

function localPrivateStorageRoot() {
  return path.resolve(
    process.env.STORAGE_PRIVATE_DIR || path.join(process.cwd(), ".data", "private-uploads"),
  );
}

function assertSafeStoragePath(filename: string) {
  const normalized = filename.replace(/^\/+/, "").replace(/\/{2,}/g, "/");
  if (normalized.includes("..") || !SAFE_PATH.test(normalized)) {
    throw new Error("Unsafe upload path.");
  }
  return normalized;
}

export function createAdminClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE!;
  if (!url || !key) throw new Error("Supabase server env not set");
  return createClient(url, key, { auth: { persistSession: false } });
}

export function publicUrl(path: string) {
  const base = process.env.STORAGE_BUCKET_URL;
  if (base) return `${base}/${path}`;
  if (storageProvider() === "local") {
    return `${publicPathPrefix()}/${path.replace(/^\/+/, "")}`;
  }
  return path;
}

export async function uploadStoredFile(input: UploadInput) {
  const filename = assertSafeStoragePath(input.path);
  const visibility = input.visibility || "public";

  if (storageProvider() === "supabase") {
    const supa = createAdminClient();
    const bucket =
      visibility === "private"
        ? process.env.SUPABASE_PRIVATE_BUCKET?.trim()
        : process.env.SUPABASE_BUCKET?.trim();
    if (!bucket) {
      throw new Error(
        visibility === "private"
          ? "Private document storage is not configured."
          : "Public storage bucket is not configured.",
      );
    }
    const { data, error } = await supa.storage.from(bucket).upload(filename, input.buffer, {
      contentType: input.contentType,
      upsert: false,
    });

    if (error) throw new Error(error.message);

    const publicData =
      visibility === "public" ? supa.storage.from(bucket).getPublicUrl(filename).data : null;
    return {
      path: data?.path || filename,
      url: publicData?.publicUrl || (visibility === "public" ? publicUrl(filename) : null),
      provider: "supabase" as const,
      visibility,
    };
  }

  if (!hasLocalStorageConfig()) {
    throw new Error("Durable storage is not configured for uploads.");
  }

  const root = visibility === "private" ? localPrivateStorageRoot() : localStorageRoot();
  const target = path.resolve(root, filename);
  if (!target.startsWith(root + path.sep) && target !== root) {
    throw new Error("Unsafe upload path.");
  }

  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, input.buffer);

  return {
    path: filename,
    url: visibility === "public" ? publicUrl(filename) : null,
    provider: "local" as const,
    visibility,
  };
}

export async function readPrivateStoredFile(filename: string) {
  const safeFilename = assertSafeStoragePath(filename);
  if (!safeFilename.startsWith("private/")) throw new Error("Private file path required.");

  if (storageProvider() === "supabase") {
    const bucket = process.env.SUPABASE_PRIVATE_BUCKET?.trim();
    if (!bucket) throw new Error("Private document storage is not configured.");
    const supa = createAdminClient();
    const { data, error } = await supa.storage.from(bucket).download(safeFilename);
    if (error || !data) throw new Error(error?.message || "Document not found.");
    return Buffer.from(await data.arrayBuffer());
  }

  const root = localPrivateStorageRoot();
  const target = path.resolve(root, safeFilename);
  if (!target.startsWith(root + path.sep)) throw new Error("Unsafe private file path.");
  return fs.readFile(target);
}
