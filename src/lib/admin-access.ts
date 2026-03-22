import crypto from "crypto";

export const ADMIN_ACCESS_COOKIE_NAME = "lethela_admin_access";

type AdminAccessPayload = {
  exp: number;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function adminAccessSecret() {
  const adminKey = process.env.ADMIN_APPROVAL_KEY?.trim();
  if (!adminKey) return "";

  return `${process.env.NEXTAUTH_SECRET?.trim() || "lethela-admin-access"}:${adminKey}`;
}

function signValue(value: string) {
  return crypto.createHmac("sha256", adminAccessSecret()).update(value, "utf8").digest("base64url");
}

export function createAdminAccessToken(input?: { expiresInDays?: number }) {
  if (!adminAccessSecret()) {
    throw new Error("ADMIN_APPROVAL_KEY is required.");
  }

  const payload: AdminAccessPayload = {
    exp: Date.now() + (input?.expiresInDays ?? 30) * 24 * 60 * 60 * 1000,
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
    if (!parsed || typeof parsed.exp !== "number") return null;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

