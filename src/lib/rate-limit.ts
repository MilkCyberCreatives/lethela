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
};

function getBuckets() {
  if (!rateLimitBuckets.__lethelaRateLimitBuckets) {
    rateLimitBuckets.__lethelaRateLimitBuckets = new Map<string, Bucket>();
  }
  return rateLimitBuckets.__lethelaRateLimitBuckets;
}

function clientIdentifier(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headers.get("x-real-ip")?.trim();
  const userAgent = headers.get("user-agent")?.trim() || "unknown-agent";
  return `${forwardedFor || realIp || "unknown-ip"}::${userAgent.slice(0, 120)}`;
}

export function checkRateLimit({ key, limit, windowMs, headers }: RateLimitConfig): RateLimitResult {
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
