"use client";

import { useEffect, useRef, useState } from "react";
import Footer from "@/components/Footer";
import MainHeader from "@/components/MainHeader";
import { Button } from "@/components/ui/button";

const STAGES = ["PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELED"] as const;

export default function RiderOrderPage({ params }: { params: { ref: string } }) {
  const ref = params.ref;
  const [sending, setSending] = useState(false);
  const watchId = useRef<number | null>(null);

  async function updateStatus(status: (typeof STAGES)[number]) {
    setSending(true);
    try {
      const response = await fetch(`/api/orders/${ref}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Failed to update status.");
      alert(`Status updated: ${status.replaceAll("_", " ")}`);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Failed to update status.");
    } finally {
      setSending(false);
    }
  }

  function startShare() {
    if (!("geolocation" in navigator)) {
      alert("Geolocation not available");
      return;
    }
    if (watchId.current !== null) return;

    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, speed } = pos.coords;
        await fetch(`/api/orders/${ref}/location`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lat, lng, speed: speed ?? undefined }),
        });
      },
      (err) => {
        alert(`Location error: ${err.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  }

  function stopShare() {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      alert("Stopped sharing location.");
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

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STAGES.map((stage) => (
            <Button key={stage} className="bg-lethela-primary" disabled={sending} onClick={() => updateStatus(stage)}>
              {stage.replaceAll("_", " ")}
            </Button>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <Button className="bg-lethela-primary" onClick={startShare}>
            Start sharing location
          </Button>
          <Button variant="outline" className="border-white/20" onClick={stopShare}>
            Stop
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
