import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { notifyVendorOfPaidOrder } from "@/lib/order-notifications";
import { buildOzowResponseHash } from "@/lib/ozow";
import { settleWithin } from "@/lib/notification-channels";
import { recordOrderEvent } from "@/lib/order-operations";

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
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
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
      "",
  ).trim();
  const txnId = String(payload.TransactionId || payload.transactionId || payload.id || "").trim();
  const amount = String(payload.Amount || payload.amount || "").trim();
  const siteCode = String(payload.SiteCode || payload.siteCode || "").trim();
  const status = String(payload.Status || payload.status || "")
    .toUpperCase()
    .trim();
  const currencyCode = String(payload.CurrencyCode || payload.currencyCode || "ZAR").trim();
  const isTest = String(payload.IsTest || payload.isTest || "false")
    .trim()
    .toLowerCase();
  const statusMessage = String(payload.StatusMessage || payload.statusMessage || "").trim();
  const receivedHash = String(payload.Hash || payload.hash || "")
    .trim()
    .toUpperCase();
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
    return NextResponse.json(
      { ok: false, error: "Ozow callback verification is not configured." },
      { status: 500 },
    );
  }
  if (siteCode !== expectedSiteCode) {
    return NextResponse.json({ ok: false, error: "Unexpected site code." }, { status: 400 });
  }
  if (currencyCode !== "ZAR") {
    return NextResponse.json({ ok: false, error: "Unexpected currency code." }, { status: 400 });
  }
  if (isTest !== expectedIsTest) {
    return NextResponse.json(
      { ok: false, error: "Unexpected Ozow test mode value." },
      { status: 400 },
    );
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
    return NextResponse.json(
      { ok: false, error: "Invalid Ozow callback signature." },
      { status: 400 },
    );
  }

  const order = await prisma.order.findFirst({
    where: { OR: [{ ozowReference: ref }, { publicId: ref }, { publicId: ref.toUpperCase() }] },
    select: { id: true, totalCents: true, paymentStatus: true, ozowTxnId: true, status: true },
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  if ((order.totalCents / 100).toFixed(2) !== amount) {
    return NextResponse.json({ ok: false, error: "Amount mismatch." }, { status: 409 });
  }

  const transactionOwner = await prisma.order.findUnique({
    where: { ozowTxnId: txnId },
    select: { id: true },
  });
  if (transactionOwner && transactionOwner.id !== order.id) {
    return NextResponse.json(
      { ok: false, error: "Transaction reference is already reconciled." },
      { status: 409 },
    );
  }

  const paymentStatus =
    status.includes("SUCCESS") || status === "PAID" || status === "COMPLETE"
      ? "PAID"
      : status.includes("FAIL") || status.includes("CANCEL") || status.includes("ERROR")
        ? "FAILED"
        : "PENDING";

  if (order.paymentStatus === "PAID") {
    if (order.ozowTxnId && order.ozowTxnId !== txnId) {
      return NextResponse.json(
        { ok: false, error: "Order is already linked to another payment." },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const data: {
    paymentStatus: "PAID" | "FAILED" | "PENDING";
    status?: "NEW" | "FAILED";
    ozowTxnId?: string;
    paymentCallbackAt?: Date;
  } = {
    paymentStatus,
    ozowTxnId: txnId || undefined,
    paymentCallbackAt: new Date(),
  };

  if (paymentStatus === "PAID") data.status = "NEW";
  if (paymentStatus === "FAILED") data.status = "FAILED";

  let updated: { count: number };
  try {
    updated = await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: { not: "PAID" } },
      data,
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { ok: false, error: "Transaction reference is already reconciled." },
        { status: 409 },
      );
    }
    throw error;
  }

  if (updated.count === 1) {
    await recordOrderEvent({
      orderId: order.id,
      publicId: ref,
      type: `PAYMENT_${paymentStatus}`,
      actor: "ozow-callback",
      note: statusMessage || status,
      meta: { transactionId: txnId, providerStatus: status },
    });
  }

  if (paymentStatus === "PAID" && updated.count === 1) {
    await settleWithin(notifyVendorOfPaidOrder(order.id), 4_000);
  }

  return NextResponse.json({ ok: true, duplicate: updated.count === 0 });
}
