import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

const UserProfileSchema = z.object({
  name: z.string().trim().min(1).max(120),
  image: z.string().trim().max(1000).nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, user });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = UserProfileSchema.safeParse({
    name: body?.name,
    image: body?.image ? String(body.image).trim() : null,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid profile payload.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      image: parsed.data.image || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, user });
}
