"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import VendorCard from "./VendorCard";
import type { Vendor } from "@/types";
import { Button } from "@/components/ui/button";
import { getVendorClicks } from "@/lib/tracking";

type ApiResponse = { ok: boolean; total: number; items: (Vendor & { baseEtaMin?: number; distanceKm?: number })[] };

export default function VendorGrid({
  suburb,
  initialVendors,
}: {
  suburb: string | null;
  initialVendors?: Vendor[];
}) {
  const hasInitial = (initialVendors?.length ?? 0) > 0;
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors ?? []);
  const [loading, setLoading] = useState(!hasInitial);
  const [error, setError] = useState<string | null>(null);
  const initialSuburbRef = useRef(suburb);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ suburb: suburb || "", take: "18" });
      const vendorResponse = await fetch(`/api/vendors?${params.toString()}`);
      if (!vendorResponse.ok) throw new Error(`Failed: ${vendorResponse.status}`);
      const vendorJson: ApiResponse = await vendorResponse.json();

      const clicks = getVendorClicks();
      const hour = new Date().getHours();
      const rerankJson = await fetch("/api/ai/rerank", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          vendors: vendorJson.items.map((vendor) => ({
            id: vendor.id,
            name: vendor.name,
            slug: vendor.slug,
            rating: vendor.rating,
            cuisines: vendor.cuisines,
            distanceKm: vendor.distanceKm ?? 3,
            baseEtaMin: vendor.baseEtaMin ?? 15,
          })),
          clicks,
          hour,
          suburb,
        }),
      }).then((response) => response.json());

      const predictedById = new Map<string, number>();
      const orderById = new Map<string, number>();
      for (const [index, row] of (rerankJson.vendors || []).entries()) {
        predictedById.set(row.id, row.predictedEtaMin);
        orderById.set(row.id, index);
      }

      const merged = vendorJson.items.map((vendor) => {
        const etaStart = predictedById.get(vendor.id) ?? 20;
        return { ...vendor, eta: `${etaStart}-${etaStart + 5} min` };
      });

      merged.sort((a, b) => (orderById.get(a.id) ?? 999) - (orderById.get(b.id) ?? 999));
      setVendors(merged);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }, [suburb]);

  useEffect(() => {
    if (hasInitial && suburb === initialSuburbRef.current) return;
    void load();
  }, [hasInitial, load, suburb]);

  return (
    <section className="container py-8">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold">Popular near {suburb ?? "you"}</h2>
          {!suburb ? <p className="text-xs text-white/60">Tip: set your suburb to improve results.</p> : null}
        </div>
        {error ? (
          <Button variant="outline" className="border-white/20" onClick={() => void load()}>
            Retry
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-200">{error}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((vendor) => (
            <VendorCard key={vendor.id} v={vendor} />
          ))}
        </div>
      )}
    </section>
  );
}
