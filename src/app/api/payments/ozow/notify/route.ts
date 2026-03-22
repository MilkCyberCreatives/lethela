import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { buildOzowResponseHash } from "@/lib/ozow";

export const dynamic = "force-dynamic";

type NotifyPayload = {
  SiteCode?: string;
  siteCode?: string;
  TransactionId?: string;
  transactionReference?: string;
  TransactionReference?: string;
  ozowReference?: string;
  ref?: string;
  transactionId?: string;
  id?: string;
  Amount?: string;
  amount?: string;
  Status?: string;
  status?: string;
  Optional1?: string;
  Optional2?: string;
  Optional3?: string;
  Optional4?: string;
  Optional5?: string;
  CurrencyCode?: string;
  currencyCode?: string;
  IsTest?: string;
  isTest?: string;
  StatusMessage?: string;
  statusMessage?: string;
  Hash?: string;
  hash?: string;
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
  const ref = String(
    payload.TransactionReference ||
      payload.transactionReference ||
      payload.ozowReference ||
      payload.ref ||
      ""
  ).trim();
  const txnId = String(payload.TransactionId || payload.transactionId || payload.id || "").trim();
  const amount = String(payload.Amount || payload.amount || "").trim();
  const siteCode = String(payload.SiteCode || payload.siteCode || "").trim();
  const status = String(payload.Status || payload.status || "").toUpperCase().trim();
  const currencyCode = String(payload.CurrencyCode || payload.currencyCode || "ZAR").trim();
  const isTest = String(payload.IsTest || payload.isTest || "false").trim().toLowerCase();
  const statusMessage = String(payload.StatusMessage || payload.statusMessage || "").trim();
  const receivedHash = String(payload.Hash || payload.hash || "").trim().toUpperCase();
  const privateKey = process.env.OZOW_PRIVATE_KEY?.trim() || "";
  const expectedSiteCode = process.env.OZOW_SITE_CODE?.trim() || "";
  const expectedIsTest = process.env.OZOW_IS_TEST === "true" ? "true" : "false";

  if (!ref) {
    return NextResponse.json({ ok: false, error: "Missing reference." }, { status: 400 });
  }
  if (!txnId) {
    return NextResponse.json({ ok: false, error: "Missing transaction id." }, { status: 400 });
  }
  if (!amount) {
    return NextResponse.json({ ok: false, error: "Missing amount." }, { status: 400 });
  }
  if (!status) {
    return NextResponse.json({ ok: false, error: "Missing status." }, { status: 400 });
  }
  if (!receivedHash || !privateKey || !expectedSiteCode) {
    return NextResponse.json({ ok: false, error: "Ozow callback verification is not configured." }, { status: 500 });
  }
  if (siteCode !== expectedSiteCode) {
    return NextResponse.json({ ok: false, error: "Unexpected site code." }, { status: 400 });
  }
  if (currencyCode !== "ZAR") {
    return NextResponse.json({ ok: false, error: "Unexpected currency code." }, { status: 400 });
  }
  if (isTest !== expectedIsTest) {
    return NextResponse.json({ ok: false, error: "Unexpected Ozow test mode value." }, { status: 400 });
  }

  const expectedHash = buildOzowResponseHash({
    siteCode,
    transactionId: txnId,
    transactionReference: ref,
    amount,
    status,
    optional1: payload.Optional1,
    optional2: payload.Optional2,
    optional3: payload.Optional3,
    optional4: payload.Optional4,
    optional5: payload.Optional5,
    currencyCode,
    isTest,
    statusMessage,
    privateKey,
  });

  const expectedHashBuffer = Buffer.from(expectedHash);
  const receivedHashBuffer = Buffer.from(receivedHash);

  if (
    expectedHashBuffer.length !== receivedHashBuffer.length ||
    !crypto.timingSafeEqual(expectedHashBuffer, receivedHashBuffer)
  ) {
    return NextResponse.json({ ok: false, error: "Invalid Ozow callback signature." }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { OR: [{ ozowReference: ref }, { publicId: ref }, { publicId: ref.toUpperCase() }] },
    select: { id: true, totalCents: true },
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  if ((order.totalCents / 100).toFixed(2) !== amount) {
    return NextResponse.json({ ok: false, error: "Amount mismatch." }, { status: 409 });
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

  await prisma.order.update({
    where: { id: order.id },
    data,
  });

  return NextResponse.json({ ok: true });
}
