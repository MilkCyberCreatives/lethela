import crypto from "node:crypto";

const TRACKING_TOKEN_VERSION = "v1";
const TRACKING_TOKEN_TTL_SEC = 14 * 24 * 60 * 60;

function base64UrlEncode(value: Buffer | string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function trackingSecret() {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for order tracking access.");
  }
  return secret;
}

function sign(payload: string) {
  return base64UrlEncode(crypto.createHmac("sha256", trackingSecret()).update(payload).digest());
}

export function createOrderTrackingToken(ref: string, ttlSec = TRACKING_TOKEN_TTL_SEC) {
  const cleanRef = String(ref || "").trim().toUpperCase();
  const exp = Math.floor(Date.now() / 1000) + Math.max(60, ttlSec);
  const payload = `${TRACKING_TOKEN_VERSION}.${cleanRef}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyOrderTrackingToken(token: string | null | undefined, ref: string) {
  const raw = String(token || "").trim();
  if (!raw) return false;

  const parts = raw.split(".");
  if (parts.length !== 4) return false;

  const [version, tokenRef, expRaw, signature] = parts;
  if (version !== TRACKING_TOKEN_VERSION) return false;

  const cleanRef = String(ref || "").trim().toUpperCase();
  if (tokenRef !== cleanRef) return false;

  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;

  const payload = `${version}.${tokenRef}.${exp}`;
  const expected = sign(payload);
  const providedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return (
    providedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

export function getOrderRealtimeChannel(ref: string) {
  const cleanRef = String(ref || "").trim().toUpperCase();
  const digest = base64UrlEncode(
    crypto.createHmac("sha256", trackingSecret()).update(`order-channel:${cleanRef}`).digest()
  ).slice(0, 24);
  return `order-${digest}`;
}

export function encodeTrackingTokenForUrl(token: string) {
  return encodeURIComponent(token);
}

export function decodeTrackingTokenFromUrl(token: string | null | undefined) {
  const raw = String(token || "").trim();
  if (!raw) return "";

  try {
    const decoded = decodeURIComponent(raw);
    // Validate it is still valid base64url-ish token content after decoding.
    base64UrlDecode(base64UrlEncode(decoded));
    return decoded;
  } catch {
    return raw;
  }
}
