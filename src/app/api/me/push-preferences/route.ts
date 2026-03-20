import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { upsertPushPreference } from "@/lib/customer-experience";
import { prisma } from "@/server/db";
import { VISITOR_COOKIE_NAME } from "@/lib/visitor";

const PushPreferenceSchema = z.object({
  marketingEnabled: z.boolean().optional(),
  orderUpdatesEnabled: z.boolean().optional(),
  recommendationsEnabled: z.boolean().optional(),
  adminAlertsEnabled: z.boolean().optional(),
});

async function resolvePreferenceContext() {
  const visitorId = (await cookies()).get(VISITOR_COOKIE_NAME)?.value?.trim() || "";
  const session = await auth().catch(() => null);
  const userId = session?.user?.id || "";
  return { visitorId, userId };
}

export async function GET() {
  const { visitorId, userId } = await resolvePreferenceContext();
  if (!visitorId && !userId) {
    return NextResponse.json({ ok: false, error: "No active visitor or user session." }, { status: 401 });
  }

  const preference = visitorId
    ? await prisma.pushPreference.findUnique({
        where: { visitorId },
        select: {
          marketingEnabled: true,
          orderUpdatesEnabled: true,
          recommendationsEnabled: true,
          adminAlertsEnabled: true,
        },
      })
    : null;

  return NextResponse.json({
    ok: true,
    preferences: {
      marketingEnabled: preference?.marketingEnabled ?? false,
      orderUpdatesEnabled: preference?.orderUpdatesEnabled ?? true,
      recommendationsEnabled: preference?.recommendationsEnabled ?? true,
      adminAlertsEnabled: preference?.adminAlertsEnabled ?? false,
    },
  });
}

export async function PATCH(req: Request) {
  const { visitorId, userId } = await resolvePreferenceContext();
  if (!visitorId && !userId) {
    return NextResponse.json({ ok: false, error: "No active visitor or user session." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = PushPreferenceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid push preferences payload.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const preferences = await upsertPushPreference(visitorId || userId, userId || null, parsed.data);
  return NextResponse.json({ ok: true, preferences });
}
