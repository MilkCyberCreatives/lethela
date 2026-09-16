import crypto from "crypto";

export const ADMIN_ACCESS_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-lethela.admin-access" : "lethela.admin-access";

type AdminAccessPayload = {
  sub: string;
  exp: number;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function adminAccessSecret() {
  const authSecret = process.env.NEXTAUTH_SECRET?.trim();
  if (process.env.NODE_ENV === "production" && !authSecret) return "";

  return `${authSecret || "lethela-admin-access-development"}:admin-access-cookie-v1`;
}

function signValue(value: string) {
  const secret = adminAccessSecret();
  if (!secret) throw new Error("Secure admin access secret is not configured.");
  return crypto.createHmac("sha256", secret).update(value, "utf8").digest("base64url");
}

export function createAdminAccessToken(input: { userId: string; expiresInHours?: number }) {
  if (!adminAccessSecret()) {
    throw new Error("NEXTAUTH_SECRET is required for secure admin access in production.");
  }

  const payload: AdminAccessPayload = {
    sub: input.userId,
    exp: Date.now() + (input.expiresInHours ?? 8) * 60 * 60 * 1000,
  };

  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(encoded);
  return `${encoded}.${signature}`;
}

export function readAdminAccessToken(token: string) {
  if (!adminAccessSecret()) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = signValue(encoded);
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(encoded)) as AdminAccessPayload;
    if (!parsed || typeof parsed.sub !== "string" || typeof parsed.exp !== "number") return null;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
