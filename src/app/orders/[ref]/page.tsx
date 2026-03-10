"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import OrderMap from "@/components/OrderMap";
import { getPusherClient } from "@/lib/pusher-client";

type Props = { params: { ref: string } };
type OrderStatus = "PLACED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELED";

const STAGES: OrderStatus[] = ["PLACED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELED"];

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[2]) : null;
}

function normalizeStatus(input: string): OrderStatus {
  const upper = input.toUpperCase();
  if (upper === "PLACED" || upper === "PREPARING" || upper === "OUT_FOR_DELIVERY" || upper === "DELIVERED" || upper === "CANCELED") {
    return upper;
  }
  return "PLACED";
}

export default function OrderTrackingPage({ params }: Props) {
  const [ref] = useState(params.ref);
  const [status, setStatus] = useState<OrderStatus>("PLACED");
  const [vendor, setVendor] = useState<{ lat: number; lng: number } | null>(null);
  const [dest, setDest] = useState<{ lat: number; lng: number } | null>(null);
  const [rider, setRider] = useState<{ lat: number; lng: number } | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const statusRef = useRef<OrderStatus>("PLACED");

  const stepIndex = STAGES.indexOf(status);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    const run = async () => {
      const response = await fetch(`/api/orders/${encodeURIComponent(ref)}`, { cache: "no-store" });
      const json = await response.json();
      if (json?.ok && json.order) {
        setStatus(normalizeStatus(json.order.status));
        if (json.order.vendor?.latitude != null && json.order.vendor?.longitude != null) {
          setVendor({ lat: Number(json.order.vendor.latitude), lng: Number(json.order.vendor.longitude) });
        }
        if (json.order.destination) {
          setDest({ lat: Number(json.order.destination.lat), lng: Number(json.order.destination.lng) });
        }
      }

      if (!json?.order?.destination) {
        const suburb = readCookie("lethela_suburb");
        if (suburb) {
          const geocode = await fetch(`/api/maps/geocode?q=${encodeURIComponent(suburb)}`, { cache: "no-store" });
          const geocodeJson = await geocode.json();
          if (geocodeJson?.ok) {
            setDest(geocodeJson.point);
          }
        }
      }
    };

    void run();
  }, [ref]);

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;
    const channelName = `order-${ref}`;
    const channel = pusher.subscribe(channelName);

    const onStatus = (payload: { status?: string }) => {
      if (!payload?.status) return;
      setStatus(normalizeStatus(payload.status));
    };

    const onLocation = (payload: { lat?: number; lng?: number }) => {
      if (payload?.lat == null || payload?.lng == null) return;
      setRider({ lat: Number(payload.lat), lng: Number(payload.lng) });
    };

    channel.bind("status", onStatus);
    channel.bind("location", onLocation);

    return () => {
      channel.unbind("status", onStatus);
      channel.unbind("location", onLocation);
      pusher.unsubscribe(channelName);
    };
  }, [ref]);

  useEffect(() => {
    const run = async () => {
      if (!rider || !dest || statusRef.current === "DELIVERED" || statusRef.current === "CANCELED") {
        setEta(null);
        return;
      }

      const response = await fetch(
        `/api/maps/eta?origin=${rider.lat},${rider.lng}&dest=${encodeURIComponent(`${dest.lat},${dest.lng}`)}`,
        { cache: "no-store" }
      );
      const json = await response.json();
      if (json?.ok) {
        setEta(json.eta.durationText ?? null);
      } else {
        setEta(null);
      }
    };

    void run();
  }, [dest, rider]);

  const centerInfo = useMemo(() => {
    const stage = STAGES[Math.max(0, stepIndex)] || "PLACED";
    return stage.replaceAll("_", " ");
  }, [stepIndex]);

  return (
    <main className="container py-10">
      <h1 className="text-2xl font-bold">Order tracking</h1>
      <p className="mt-1 text-white/70">
        Reference: <span className="font-mono">{ref}</span>
      </p>

      <div className="mt-6">
        <ol className="relative border-l border-white/20 pl-6">
          {STAGES.map((stage, index) => {
            const reached = index <= stepIndex;
            return (
              <li key={stage} className="mb-6">
                <span className={`absolute -left-[9px] top-[2px] h-4 w-4 rounded-full ${reached ? "bg-lethela-primary" : "bg-white/30"}`} />
                <div className={`font-medium ${reached ? "" : "text-white/60"}`}>{stage.replaceAll("_", " ")}</div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <div className="font-semibold">Live map</div>
          <div className="text-sm text-white/80">{eta ? `ETA: ${eta}` : "ETA: calculating..."}</div>
        </div>
        <OrderMap rider={rider} vendor={vendor} dest={dest} />
        <p className="mt-2 text-xs text-white/60">Current stage: {centerInfo}</p>
      </div>

      <div className="mt-6">
        <Link href="/" className="underline">
          Back to home
        </Link>
      </div>
    </main>
  );
}
