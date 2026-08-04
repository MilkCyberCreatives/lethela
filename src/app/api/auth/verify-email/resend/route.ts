import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmailVerification } from "@/lib/email-verification";
import { NormalizedEmailSchema } from "@/lib/identity";

const BodySchema = z.object({ email: NormalizedEmailSchema });
const genericMessage = "If that account needs verification, a new email has been sent.";

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit({
    key: "email-verification-resend",
    limit: 4,
    windowMs: 60 * 60 * 1000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: { "retry-after": String(limited.retryAfterSec) } },
    );
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: true, message: genericMessage });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, emailVerifiedAt: true },
  });
  if (user && !user.emailVerifiedAt) {
    await sendEmailVerification(user).catch(() => undefined);
  }

  return NextResponse.json({ ok: true, message: genericMessage });
}
