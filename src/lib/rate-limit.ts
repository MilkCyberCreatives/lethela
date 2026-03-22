import crypto from "node:crypto";
import { prisma, prismaRuntimeInfo } from "@/lib/db";
import { logError } from "@/lib/logger";

type RateLimitConfig = {
  key: string;
  limit: number;
  windowMs: number;
  headers: Headers;
};

type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

type Bucket = {
  count: number;
  resetAt: number;
};

const rateLimitBuckets = globalThis as typeof globalThis & {
  __lethelaRateLimitBuckets?: Map<string, Bucket>;
  __lethelaRateLimitTableReady?: Promise<void>;
};

function getBuckets() {
  if (!rateLimitBuckets.__lethelaRateLimitBuckets) {
    rateLimitBuckets.__lethelaRateLimitBuckets = new Map<string, Bucket>();
  }
  return rateLimitBuckets.__lethelaRateLimitBuckets;
}

function ensureRateLimitTable() {
  if (!rateLimitBuckets.__lethelaRateLimitTableReady) {
    rateLimitBuckets.__lethelaRateLimitTableReady = prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS app_rate_limits (
        bucket_id TEXT PRIMARY KEY,
        scope_key TEXT NOT NULL,
        identifier TEXT NOT NULL,
        count INTEGER NOT NULL,
        reset_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      )
    `).then(async () => {
      await prisma.$executeRawUnsafe(
        "CREATE INDEX IF NOT EXISTS app_rate_limits_reset_at_idx ON app_rate_limits(reset_at)"
      );
    }).then(() => undefined);
  }

  return rateLimitBuckets.__lethelaRateLimitTableReady;
}

function clientIdentifier(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headers.get("x-real-ip")?.trim();
  const userAgent = headers.get("user-agent")?.trim() || "unknown-agent";
  return `${forwardedFor || realIp || "unknown-ip"}::${userAgent.slice(0, 120)}`;
}

function fallbackCheckRateLimit({ key, limit, windowMs, headers }: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const buckets = getBuckets();
  const bucketKey = `${key}::${clientIdentifier(headers)}`;
  const current = buckets.get(bucketKey);

  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (current.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  buckets.set(bucketKey, current);
  return { ok: true };
}

export async function checkRateLimit({ key, limit, windowMs, headers }: RateLimitConfig): Promise<RateLimitResult> {
  const now = Date.now();
  const identifier = clientIdentifier(headers);
  const bucketId = crypto.createHash("sha256").update(`${key}::${identifier}`).digest("hex");
  const nextResetAt = now + windowMs;

  try {
    await ensureRateLimitTable();

    const rows = await prisma.$queryRaw<Array<{ count: number; reset_at: number }>>`
      INSERT INTO app_rate_limits (bucket_id, scope_key, identifier, count, reset_at, updated_at)
      VALUES (${bucketId}, ${key}, ${identifier}, 1, ${nextResetAt}, ${now})
      ON CONFLICT(bucket_id) DO UPDATE SET
        count = CASE
          WHEN app_rate_limits.reset_at <= ${now} THEN 1
          ELSE app_rate_limits.count + 1
        END,
        reset_at = CASE
          WHEN app_rate_limits.reset_at <= ${now} THEN ${nextResetAt}
          ELSE app_rate_limits.reset_at
        END,
        updated_at = ${now}
      RETURNING count, reset_at
    `;

    const row = rows[0];
    if (!row) {
      return fallbackCheckRateLimit({ key, limit, windowMs, headers });
    }

    if (Number(row.count) > limit) {
      return {
        ok: false,
        retryAfterSec: Math.max(1, Math.ceil((Number(row.reset_at) - now) / 1000)),
      };
    }

    if (Math.random() < 0.02) {
      await prisma.$executeRaw`DELETE FROM app_rate_limits WHERE reset_at < ${now - windowMs}`;
    }

    return { ok: true };
  } catch (error) {
    logError("Rate limit storage unavailable; using process-local fallback.", {
      scope: key,
      error: error instanceof Error ? error.message : String(error),
    });
    if (process.env.NODE_ENV === "production" && prismaRuntimeInfo.scalable) {
      return { ok: false, retryAfterSec: Math.max(5, Math.ceil(windowMs / 1000)) };
    }
    return fallbackCheckRateLimit({ key, limit, windowMs, headers });
  }
}
