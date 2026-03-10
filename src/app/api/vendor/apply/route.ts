// /src/app/api/vendor/apply/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { auth } from "@/auth";
import { withSentryRoute } from "@/server/withSentryRoute";

const BodySchema = z.object({
  name: z.string().min(2),
  suburb: z.string().min(2),
  halaal: z.boolean().optional(),
  kycIdUrl: z.string().url().optional(),
  kycProofUrl: z.string().url().optional()
});

export const POST = withSentryRoute(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false, error: "Auth required" }, { status: 401 });

  const body = await req.json().catch(()=> ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });

  const { name, suburb, halaal, kycIdUrl, kycProofUrl } = parsed.data;

  // Generate a basic slug
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  let slug = base;
  let i = 1;
  while (await prisma.vendor.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }

  const vendor = await prisma.vendor.create({
    data: {
      name,
      slug,
      suburb,
      cuisine: "[]",
      halaal: Boolean(halaal),
      status: "PENDING",
      ownerId: session.user.id,
      kycIdUrl,
      kycProofUrl
    },
    select: { id: true, slug: true, status: true }
  });

  // Optionally elevate the user role to VENDOR (admin approval later).
  // For MVP we won’t auto-elevate; admin will activate and set role later.

  return NextResponse.json({ ok: true, vendor });
});
