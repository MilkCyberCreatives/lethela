import crypto from "node:crypto";
import { absoluteUrl } from "@/lib/site";
import { escapeHtml, hasEmailChannel, sendResendEmail } from "@/lib/notification-channels";

const TOKEN_VERSION = "v1";
const TOKEN_TTL_SEC = 24 * 60 * 60;

function base64Url(value: Buffer | string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function verificationSecret() {
  const secret =
    process.env.EMAIL_VERIFICATION_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim() || "";
  if (!secret) throw new Error("Email verification secret is not configured.");
  return secret;
}

function sign(payload: string) {
  return base64Url(crypto.createHmac("sha256", verificationSecret()).update(payload).digest());
}

export function isEmailVerificationRequired() {
  return process.env.EMAIL_VERIFICATION_REQUIRED?.trim().toLowerCase() === "true";
}

export function createEmailVerificationToken(user: { id: string; email: string }) {
  const encodedEmail = base64Url(user.email.trim().toLowerCase());
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
  const payload = `${TOKEN_VERSION}.${user.id}.${encodedEmail}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyEmailVerificationToken(token: string) {
  const parts = String(token || "")
    .trim()
    .split(".");
  if (parts.length !== 5) return null;
  const [version, userId, encodedEmail, expiresRaw, signature] = parts;
  if (version !== TOKEN_VERSION || !userId || !encodedEmail || !signature) return null;

  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return null;

  const payload = `${version}.${userId}.${encodedEmail}.${expiresRaw}`;
  const expected = sign(payload);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const suppliedBuffer = Buffer.from(signature, "utf8");
  if (
    expectedBuffer.length !== suppliedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)
  ) {
    return null;
  }

  try {
    const email = decodeBase64Url(encodedEmail).trim().toLowerCase();
    return email ? { userId, email, expiresAt } : null;
  } catch {
    return null;
  }
}

export async function sendEmailVerification(user: { id: string; email: string }) {
  const required = isEmailVerificationRequired();
  if (!hasEmailChannel()) {
    return { required: false, delivered: false } as const;
  }

  const token = createEmailVerificationToken(user);
  const verificationUrl = absoluteUrl(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
  const safeEmail = escapeHtml(user.email);
  const result = await sendResendEmail({
    to: user.email,
    subject: "Verify your Lethela email address",
    text: `Verify your Lethela email address by opening this link within 24 hours: ${verificationUrl}`,
    html: `<h2>Verify your Lethela email</h2><p>Confirm that ${safeEmail} belongs to you before continuing with sensitive account setup.</p><p><a href="${escapeHtml(verificationUrl)}">Verify email address</a></p><p>This link expires in 24 hours. If you did not create this account, ignore this email.</p>`,
  });

  return { required, delivered: result.delivered } as const;
}
