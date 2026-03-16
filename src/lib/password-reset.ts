import crypto from "crypto";

type PasswordResetPayload = {
  sub: string;
  email: string;
  exp: number;
  pw: string;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function passwordResetSecret() {
  return (
    process.env.PASSWORD_RESET_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    ""
  );
}

function signValue(value: string) {
  return crypto
    .createHmac("sha256", passwordResetSecret())
    .update(value, "utf8")
    .digest("base64url");
}

export function passwordResetFingerprint(passwordHash: string) {
  return crypto
    .createHash("sha256")
    .update(passwordHash, "utf8")
    .digest("hex")
    .slice(0, 16);
}

export function createPasswordResetToken(input: {
  userId: string;
  email: string;
  passwordHash: string;
  expiresInMinutes?: number;
}) {
  if (!passwordResetSecret()) {
    throw new Error("PASSWORD_RESET_SECRET or NEXTAUTH_SECRET is required.");
  }

  const payload: PasswordResetPayload = {
    sub: input.userId,
    email: input.email.toLowerCase().trim(),
    exp: Date.now() + (input.expiresInMinutes ?? 30) * 60 * 1000,
    pw: passwordResetFingerprint(input.passwordHash),
  };

  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(encoded);
  return `${encoded}.${signature}`;
}

export function readPasswordResetToken(token: string): PasswordResetPayload | null {
  if (!passwordResetSecret()) return null;

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
    const parsed = JSON.parse(base64UrlDecode(encoded)) as PasswordResetPayload;
    if (
      !parsed ||
      typeof parsed.sub !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.exp !== "number" ||
      typeof parsed.pw !== "string"
    ) {
      return null;
    }
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function resetEmailFrom() {
  return (
    process.env.PASSWORD_RESET_EMAIL_FROM?.trim() ||
    process.env.ADMIN_NOTIFICATION_EMAIL_FROM?.trim() ||
    ""
  );
}

export function passwordResetEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && resetEmailFrom());
}

export async function sendPasswordResetEmail(input: {
  to: string;
  resetUrl: string;
  name?: string | null;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = resetEmailFrom();
  if (!apiKey || !from) {
    throw new Error("Password reset email is not configured.");
  }

  const label = input.name?.trim() || input.to;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <p>Hello ${label},</p>
      <p>We received a request to reset your Lethela password.</p>
      <p><a href="${input.resetUrl}">Reset your password</a></p>
      <p>This link will expire in 30 minutes. If you did not request this, you can ignore this email.</p>
    </div>
  `;

  const text = [
    `Hello ${label},`,
    "",
    "We received a request to reset your Lethela password.",
    `Reset your password: ${input.resetUrl}`,
    "",
    "This link will expire in 30 minutes. If you did not request this, you can ignore this email.",
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: "Reset your Lethela password",
      html,
      text,
    }),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => "");
    throw new Error(error || "Failed to send password reset email.");
  }
}

export function resolveAppBaseUrl(origin?: string) {
  return (
    origin ||
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}
