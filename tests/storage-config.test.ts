import assert from "node:assert/strict";
import test from "node:test";
import {
  hasPrivateStorageConfig,
  hasSupabaseStorageConfig,
  storageConfigSummary,
  storageProvider,
} from "../src/server/supabase";

const KEYS = [
  "NODE_ENV",
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_URL",
  "UPLOAD_STORAGE",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_BUCKET",
  "SUPABASE_STORAGE_BUCKET",
  "SUPABASE_PRIVATE_BUCKET",
  "SUPABASE_PRIVATE_STORAGE_BUCKET",
  "STORAGE_LOCAL_DIR",
  "STORAGE_PUBLIC_PATH",
  "STORAGE_PRIVATE_DIR",
] as const;

function withCleanStorageEnv(run: () => void) {
  const previous = new Map<string, string | undefined>();
  for (const key of KEYS) {
    previous.set(key, process.env[key]);
    delete process.env[key];
  }

  try {
    process.env.NODE_ENV = "production";
    run();
  } finally {
    for (const key of KEYS) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("Supabase storage accepts the legacy Lethela environment names", () => {
  withCleanStorageEnv(() => {
    process.env.UPLOAD_STORAGE = "supabase";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE = "service-role";
    process.env.SUPABASE_BUCKET = "public-uploads";
    process.env.SUPABASE_PRIVATE_BUCKET = "private-uploads";

    assert.equal(hasSupabaseStorageConfig(), true);
    assert.equal(hasPrivateStorageConfig(), true);
    assert.equal(storageProvider(), "supabase");
    assert.deepEqual(storageConfigSummary(), {
      mode: "supabase",
      provider: "supabase",
      hasSupabaseUrl: true,
      hasSupabaseServiceRole: true,
      hasPublicBucket: true,
      hasPrivateBucket: true,
      hasLocalStorage: false,
    });
  });
});

test("Supabase storage also accepts standard Supabase environment aliases", () => {
  withCleanStorageEnv(() => {
    process.env.UPLOAD_STORAGE = "supabase";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.SUPABASE_STORAGE_BUCKET = "public-uploads";
    process.env.SUPABASE_PRIVATE_STORAGE_BUCKET = "private-uploads";

    assert.equal(hasSupabaseStorageConfig(), true);
    assert.equal(hasPrivateStorageConfig(), true);
    assert.equal(storageProvider(), "supabase");
    const summary = storageConfigSummary();
    assert.equal(summary.hasSupabaseUrl, true);
    assert.equal(summary.hasSupabaseServiceRole, true);
    assert.equal(summary.hasPublicBucket, true);
    assert.equal(summary.hasPrivateBucket, true);
  });
});

test("Production reports no upload provider when durable storage is incomplete", () => {
  withCleanStorageEnv(() => {
    process.env.UPLOAD_STORAGE = "supabase";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

    assert.equal(hasSupabaseStorageConfig(), false);
    assert.equal(hasPrivateStorageConfig(), false);
    assert.equal(storageProvider(), "none");
    const summary = storageConfigSummary();
    assert.equal(summary.provider, "none");
    assert.equal(summary.hasSupabaseUrl, true);
    assert.equal(summary.hasSupabaseServiceRole, false);
    assert.equal(summary.hasPublicBucket, false);
  });
});

test("Vercel production never treats local disk as durable upload storage", () => {
  withCleanStorageEnv(() => {
    process.env.VERCEL = "1";
    process.env.UPLOAD_STORAGE = "local";
    process.env.STORAGE_LOCAL_DIR = "/tmp/lethela-public";
    process.env.STORAGE_PRIVATE_DIR = "/tmp/lethela-private";
    process.env.STORAGE_PUBLIC_PATH = "/uploads";

    assert.equal(storageProvider(), "none");
    assert.equal(storageConfigSummary().hasLocalStorage, false);
  });
});

test("Supabase remains the durable provider on Vercel", () => {
  withCleanStorageEnv(() => {
    process.env.VERCEL = "1";
    process.env.UPLOAD_STORAGE = "supabase";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.SUPABASE_STORAGE_BUCKET = "public-uploads";
    process.env.SUPABASE_PRIVATE_STORAGE_BUCKET = "private-uploads";

    assert.equal(storageProvider(), "supabase");
    assert.equal(hasPrivateStorageConfig(), true);
  });
});
