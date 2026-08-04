import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { createOrderTrackingToken } from "@/lib/order-tracking-access";

const BodySchema = z.object({
  ref: z.string().trim().min(4).max(80),
  phone: z.string().trim().min(8).max(40),
});

function normalizeRef(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "-").replace(/-+/g, "-");
}

function comparablePhone(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.slice(-9);
}

function deliveryContact(itemsJson: string | null) {
  try {
    const parsed = JSON.parse(itemsJson || "{}");
    const details = !Array.isArray(parsed) && parsed?.deliveryDetails;
    return {
      customerPhone: comparablePhone(details?.customerPhone),
      whatsappNumber: comparablePhone(details?.whatsappNumber),
    };
  } catch {
    return { customerPhone: "", whatsappNumber: "" };
  }
}

const genericLookupError = "We could not verify that order. Check the reference and phone number.";

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit({
    key: "order-tracking-lookup",
    limit: 12,
    windowMs: 15 * 60 * 1000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many tracking attempts. Please try again later." },
      { status: 429, headers: { "retry-after": String(limited.retryAfterSec) } },
    );
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: genericLookupError }, { status: 400 });
  }

  const ref = normalizeRef(parsed.data.ref);
  const suppliedPhone = comparablePhone(parsed.data.phone);
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { publicId: ref },
        { ozowReference: ref },
        { publicId: parsed.data.ref.trim() },
        { ozowReference: parsed.data.ref.trim() },
      ],
    },
    select: {
      publicId: true,
      ozowReference: true,
      itemsJson: true,
    },
  });

  if (!order || !suppliedPhone) {
    return NextResponse.json({ ok: false, error: genericLookupError }, { status: 404 });
  }

  const contacts = deliveryContact(order.itemsJson);
  const matches =
    suppliedPhone === contacts.customerPhone || suppliedPhone === contacts.whatsappNumber;
  if (!matches) {
    return NextResponse.json({ ok: false, error: genericLookupError }, { status: 404 });
  }

  const resolvedRef = order.ozowReference || order.publicId;
  const token = createOrderTrackingToken(resolvedRef);
  return NextResponse.json({
    ok: true,
    redirectUrl: `/orders/${encodeURIComponent(resolvedRef)}?t=${encodeURIComponent(token)}`,
  });
}
