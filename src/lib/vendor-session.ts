import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const VENDOR_SESSION_COOKIE = "vendor_session";
const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;

type VendorSessionInput = {
  userId: string;
  vendorId: string;
  vendorSlug: string;
  role: string;
  email: string;
};

export type VendorSessionPayload = VendorSessionInput & {
  exp: number;
};

type CookieTarget = Awaited<ReturnType<typeof cookies>>;

function getVendorSessionSecret() {
  const configuredSecret = process.env.VENDOR_SESSION_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (configuredSecret) {
    return configuredSecret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("VENDOR_SESSION_SECRET or NEXTAUTH_SECRET must be set in production.");
  }
  return "lethela-dev-vendor-session-secret";
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(encodedPayload: string) {
  return crypto.createHmac("sha256", getVendorSessionSecret()).update(encodedPayload).digest("base64url");
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function createVendorSessionToken(input: VendorSessionInput, maxAge = THIRTY_DAYS_IN_SECONDS) {
  const payload: VendorSessionPayload = {
    ...input,
    email: input.email.toLowerCase().trim(),
    exp: Math.floor(Date.now() / 1000) + maxAge,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function parseVendorSessionToken(token?: string | null): VendorSessionPayload | null {
  if (!token) return null;

  const [encodedPayload, suppliedSignature] = token.split(".");
  if (!encodedPayload || !suppliedSignature) return null;

  const expectedSignature = sign(encodedPayload);
  const suppliedBuffer = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (suppliedBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;

  try {
    const parsed = JSON.parse(decodeBase64Url(encodedPayload)) as Partial<VendorSessionPayload>;
    if (
      !parsed ||
      typeof parsed.userId !== "string" ||
      typeof parsed.vendorId !== "string" ||
      typeof parsed.vendorSlug !== "string" ||
      typeof parsed.role !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }

    if (parsed.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      userId: parsed.userId,
      vendorId: parsed.vendorId,
      vendorSlug: parsed.vendorSlug,
      role: parsed.role,
      email: parsed.email.toLowerCase().trim(),
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

export function attachVendorSession(
  response: NextResponse,
  input: VendorSessionInput,
  maxAge = THIRTY_DAYS_IN_SECONDS
) {
  response.cookies.set(VENDOR_SESSION_COOKIE, createVendorSessionToken(input, maxAge), cookieOptions(maxAge));
  response.cookies.set("vendor_email", input.email.toLowerCase().trim(), cookieOptions(maxAge));
  response.cookies.set("vendor_slug", input.vendorSlug, cookieOptions(maxAge));
}

export function clearVendorSession(response: NextResponse) {
  const expiredCookie = { ...cookieOptions(0), maxAge: 0 };
  response.cookies.set(VENDOR_SESSION_COOKIE, "", expiredCookie);
  response.cookies.set("vendor_email", "", expiredCookie);
  response.cookies.set("vendor_slug", "", expiredCookie);
  response.cookies.set("vendor_token", "", expiredCookie);
  response.cookies.set("vendor_user_id", "", expiredCookie);
}

export async function setVendorTrackingCookies(cookieStore: CookieTarget, email: string, vendorSlug: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const options = cookieOptions(THIRTY_DAYS_IN_SECONDS);
  cookieStore.set("vendor_email", normalizedEmail, options);
  cookieStore.set("vendor_slug", vendorSlug, options);
}
