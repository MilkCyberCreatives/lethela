"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { pushEcommerceEvent } from "@/lib/visitor";
import { useCart } from "@/store/cart";

type OrderState = "loading" | "paid" | "pending" | "failed" | "missing";

type Props = {
  refId?: string;
  isSandbox: boolean;
};

type OrderResponse = {
  ok?: boolean;
  order?: {
    id?: string;
    status?: string;
    paymentStatus?: string;
    totalCents?: number;
    vendor?: { name?: string | null } | null;
    items?: Array<{
      itemId?: string;
      productId?: string | null;
      name?: string;
      priceCents?: number;
      qty?: number;
    }>;
  };
};

function normalizeOrderState(payload: OrderResponse): OrderState {
  if (!payload?.ok || !payload.order) return "missing";

  const paymentStatus = String(payload.order.paymentStatus || "").toUpperCase();
  const orderStatus = String(payload.order.status || "").toUpperCase();

  if (paymentStatus === "PAID") return "paid";
  if (paymentStatus === "FAILED" || orderStatus === "CANCELED") return "failed";
  return "pending";
}

export default function CheckoutSuccessContent({ refId, isSandbox }: Props) {
  const clear = useCart((state) => state.clear);
  const clearedRef = useRef(false);
  const purchaseTrackedRef = useRef(false);
  const [state, setState] = useState<OrderState>(refId ? "loading" : "missing");
  const [orderData, setOrderData] = useState<OrderResponse["order"] | null>(null);

  useEffect(() => {
    if (!refId) return;

    let cancelled = false;
    const timeouts: number[] = [];

    const fetchOrderState = async (attempt = 0) => {
      try {
        const response = await fetch(`/api/orders/${encodeURIComponent(refId)}`, { cache: "no-store" });
        const json = (await response.json().catch(() => ({}))) as OrderResponse;
        if (cancelled) return;

        const nextState = normalizeOrderState(json);
        setOrderData(json.order ?? null);
        setState(nextState);

        if (nextState === "pending" && attempt < 4) {
          const timeoutId = window.setTimeout(() => {
            void fetchOrderState(attempt + 1);
          }, 2000);
          timeouts.push(timeoutId);
        }
      } catch {
        if (!cancelled) {
          setState("pending");
        }
      }
    };

    void fetchOrderState();

    return () => {
      cancelled = true;
      for (const timeoutId of timeouts) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [refId]);

  useEffect(() => {
    if (state === "paid" && !clearedRef.current) {
      clear();
      clearedRef.current = true;
    }
  }, [clear, state]);

  useEffect(() => {
    if (state !== "paid" || !orderData || purchaseTrackedRef.current) return;
    purchaseTrackedRef.current = true;
    pushEcommerceEvent("purchase", {
      transaction_id: orderData.id || refId,
      currency: "ZAR",
      value: Number(orderData.totalCents || 0) / 100,
      items: Array.isArray(orderData.items)
        ? orderData.items.map((item) => ({
            item_id: item.productId || item.itemId || undefined,
            item_name: item.name || undefined,
            item_brand: orderData.vendor?.name || undefined,
            price: Number(item.priceCents || 0) / 100,
            quantity: item.qty || 1,
          }))
        : [],
    });
  }, [orderData, refId, state]);

  const title =
    state === "paid"
      ? `Payment received${isSandbox ? " (sandbox)" : ""}`
      : state === "failed"
        ? "Payment not completed"
        : state === "loading"
          ? "Confirming payment"
          : state === "pending"
            ? "Payment submitted"
            : "Order reference unavailable";

  const titleClass =
    state === "paid"
      ? "text-green-400"
      : state === "failed"
        ? "text-yellow-400"
        : "text-white";

  const message =
    state === "paid"
      ? "Thanks! Your order is confirmed and ready for live tracking."
      : state === "failed"
        ? "We could not confirm payment for this order. You can return to checkout and try again."
        : state === "loading"
          ? "We are checking your payment with Ozow now."
          : state === "pending"
            ? "We received your return from Ozow and are waiting for final payment confirmation."
            : "We could not load this order reference.";

  return (
    <>
      <h1 className={`text-2xl font-bold ${titleClass}`}>{title}</h1>
      <p className="mt-2 text-white/80">
        {message} Reference: <span className="font-semibold">{refId ?? "N/A"}</span>
      </p>

      <div className="mt-4 flex gap-4">
        {refId ? (
          <Link href={`/orders/${refId}`} className="underline">
            Track your order {"->"}
          </Link>
        ) : null}
        {state === "failed" ? (
          <Link href="/checkout" className="underline">
            Return to checkout
          </Link>
        ) : null}
        <Link href="/" className="underline">
          Back to home
        </Link>
      </div>

      <p className="mt-4 text-sm text-white/60">
        {state === "pending"
          ? "If confirmation takes longer than expected, tracking will update automatically once payment is received."
          : isSandbox
            ? "Sandbox mode is enabled for this Ozow payment flow."
            : "You can follow live order updates from the tracking page."}
      </p>
    </>
  );
}
