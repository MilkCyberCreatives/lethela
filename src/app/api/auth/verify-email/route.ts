import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { verifyEmailVerificationToken } from "@/lib/email-verification";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const verified = verifyEmailVerificationToken(token);
  if (!verified) {
    return NextResponse.redirect(`${SITE_URL}/signin?verification=invalid`);
  }

  const user = await prisma.user.findUnique({
    where: { id: verified.userId },
    select: { id: true, email: true, emailVerifiedAt: true },
  });
  if (!user || user.email.trim().toLowerCase() !== verified.email) {
    return NextResponse.redirect(`${SITE_URL}/signin?verification=invalid`);
  }

  if (!user.emailVerifiedAt) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });
  }

  return NextResponse.redirect(`${SITE_URL}/signin?verification=success`);
}
