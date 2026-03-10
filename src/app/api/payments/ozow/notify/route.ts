import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

type NotifyPayload = {
  transactionReference?: string;
  ozowReference?: string;
  ref?: string;
  transactionId?: string;
  id?: string;
  status?: string;
};

async function readPayload(req: NextRequest): Promise<NotifyPayload> {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    return Object.fromEntries(form.entries()) as NotifyPayload;
  }
  return (await req.json().catch(() => ({}))) as NotifyPayload;
}

export async function POST(req: NextRequest) {
  const payload = await readPayload(req);
  const ref = String(payload.transactionReference || payload.ozowReference || payload.ref || "").trim();
  const txnId = payload.transactionId || payload.id || null;
  const status = String(payload.status || "").toUpperCase();

  if (!ref) {
    return NextResponse.json({ ok: false, error: "Missing reference." }, { status: 400 });
  }

  const paymentStatus =
    status.includes("SUCCESS") || status === "PAID" || status === "COMPLETE"
      ? "PAID"
      : status.includes("FAIL") || status.includes("CANCEL") || status.includes("ERROR")
        ? "FAILED"
        : "PENDING";

  const data: {
    paymentStatus: "PAID" | "FAILED" | "PENDING";
    status?: "PLACED" | "CANCELED";
    ozowTxnId?: string;
  } = {
    paymentStatus,
    ozowTxnId: txnId || undefined,
  };

  if (paymentStatus === "PAID") data.status = "PLACED";
  if (paymentStatus === "FAILED") data.status = "CANCELED";

  await prisma.order.updateMany({
    where: { OR: [{ ozowReference: ref }, { publicId: ref }, { publicId: ref.toUpperCase() }] },
    data,
  });

  return NextResponse.json({ ok: true });
}
