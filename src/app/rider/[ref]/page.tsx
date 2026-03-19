"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Footer from "@/components/Footer";
import MainHeader from "@/components/MainHeader";
import { Button } from "@/components/ui/button";

const STAGES = ["PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELED"] as const;

export default function RiderOrderPage({ params }: { params: { ref: string } }) {
  const ref = params.ref;
  const searchParams = useSearchParams();
  const [sending, setSending] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const riderToken = searchParams?.get("token")?.trim() || "";

  function authHeaders(): HeadersInit {
    const headers: Record<string, string> = {};
    if (riderToken) {
      headers["x-rider-token"] = riderToken;
    }
    return headers;
  }

  async function updateStatus(status: (typeof STAGES)[number]) {
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/orders/${ref}/status`, {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Failed to update status.");
      setNotice(`Status updated to ${status.replaceAll("_", " ").toLowerCase()}.`);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to update status.");
    } finally {
      setSending(false);
    }
  }

  function startShare() {
    setError(null);
    setNotice(null);
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not available on this device.");
      return;
    }
    if (watchId.current !== null) {
      setNotice("Location sharing is already active.");
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, speed } = pos.coords;
        try {
          const response = await fetch(`/api/orders/${ref}/location`, {
            method: "POST",
            headers: { "content-type": "application/json", ...authHeaders() },
            body: JSON.stringify({ lat, lng, speed: speed ?? undefined }),
          });
          const json = await response.json().catch(() => ({}));
          if (!response.ok || !json.ok) {
            throw new Error(json.error || "Failed to share location.");
          }
          setSharingLocation(true);
          setNotice("Live location sharing is active.");
        } catch (shareError: unknown) {
          setError(shareError instanceof Error ? shareError.message : "Failed to share location.");
        }
      },
      (err) => {
        setSharingLocation(false);
        setError(`Location error: ${err.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  }

  function stopShare() {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      setSharingLocation(false);
      setNotice("Stopped sharing live location.");
    }
  }

  useEffect(() => {
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />
      <main className="container py-10 md:py-14">
        <h1 className="text-2xl font-bold">Rider console</h1>
        <p className="mt-1 text-white/70">
          Order ref: <span className="font-mono">{ref}</span>
        </p>
        <p className="mt-2 text-sm text-white/60">
          {riderToken ? "Secure rider link active." : "Missing rider token. Updates will be rejected until a valid link is used."}
        </p>

        {notice ? (
          <div className="mt-6 rounded border border-emerald-300/40 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
            {notice}
          </div>
        ) : null}
        {error ? (
          <div className="mt-6 rounded border border-red-300/40 bg-red-300/10 px-3 py-2 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STAGES.map((stage) => (
            <Button key={stage} className="bg-lethela-primary" disabled={sending || !riderToken} onClick={() => updateStatus(stage)}>
              {stage.replaceAll("_", " ")}
            </Button>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button className="bg-lethela-primary" onClick={startShare} disabled={!riderToken}>
            {sharingLocation ? "Sharing location" : "Start sharing location"}
          </Button>
          <Button variant="outline" className="border-white/20" onClick={stopShare} disabled={!sharingLocation}>
            Stop
          </Button>
          <div className="flex items-center text-sm text-white/70">
            {sharingLocation ? "Live location sharing active." : "Location sharing paused."}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
