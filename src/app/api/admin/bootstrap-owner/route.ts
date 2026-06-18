import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

const BootstrapOwnerSchema = z.object({
  adminKey: z.string().trim().optional(),
  email: z
    .string()
    .email()
    .transform((value) => value.trim().toLowerCase()),
  password: z.string().min(12).max(200),
  name: z.string().trim().min(2).max(120).default("Lethela Owner"),
});

function keysMatch(provided: string, expected: string) {
  const providedBuffer = Buffer.from(provided, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return (
    providedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

export async function POST(req: NextRequest) {
  const rateLimit = await checkRateLimit({
    key: "admin-bootstrap-owner",
    limit: 3,
    windowMs: 60 * 60 * 1000,
    headers: req.headers,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many owner setup attempts. Please try again later." },
      { status: 429, headers: { "retry-after": String(rateLimit.retryAfterSec) } },
    );
  }

  const configuredKey = process.env.ADMIN_APPROVAL_KEY?.trim();
  if (!configuredKey) {
    return NextResponse.json(
      { ok: false, error: "Admin approval key is not configured." },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = BootstrapOwnerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid owner bootstrap payload.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const providedKey = parsed.data.adminKey || req.headers.get("x-admin-key")?.trim() || "";
  if (!keysMatch(providedKey, configuredKey)) {
    return NextResponse.json({ ok: false, error: "Invalid admin approval key." }, { status: 401 });
  }

  const passwordHash = await hash(parsed.data.password, 10);
  const user = await prisma.user.upsert({
    where: { email: parsed.data.email },
    update: {
      name: parsed.data.name,
      passwordHash,
      role: "ADMIN",
    },
    create: {
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
      role: "ADMIN",
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    user,
    message: "Owner admin account is ready.",
  });
}
