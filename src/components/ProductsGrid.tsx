// src/components/ProductsGrid.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard, { ProductLite } from "./ProductCard";
import { Button } from "@/components/ui/button";
import { TOWNSHIP_CATEGORIES } from "@/lib/categories";
import { readPreferredLocation } from "@/lib/location-preference";
import { pushEcommerceEvent } from "@/lib/visitor";

type ApiResp = { ok: boolean; items: ProductLite[] };

export default function ProductsGrid({
  suburb,
  initialItems,
}: {
  showAlcoholToggle?: boolean;
  suburb?: string | null;
  initialItems?: ProductLite[];
}) {
  const hasInitial = (initialItems?.length ?? 0) > 0;
  const [items, setItems] = useState<ProductLite[]>(initialItems ?? []);
  const [loading, setLoading] = useState(!hasInitial);
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeSuburb, setActiveSuburb] = useState<string | null>(suburb ?? null);
  const searchParams = useSearchParams();
  const skippedInitialLoad = useRef(false);
  const listTrackedRef = useRef("");

  useEffect(() => {
    const picked = String(searchParams?.get("category") || "").trim();
    setCategory(picked);
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (category) query.set("category", category);
      if (activeSuburb) query.set("suburb", activeSuburb);
      query.set("take", "24");
      const response = await fetch(`/api/products?${query.toString()}`);
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      const json: ApiResp = await response.json();
      setItems(json.items || []);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [activeSuburb, category]);

  useEffect(() => {
    const syncLocation = () => {
      const next = readPreferredLocation()?.label || suburb || null;
      setActiveSuburb((current) => (current === next ? current : next));
    };

    syncLocation();
    window.addEventListener("lethela:location-changed", syncLocation);
    window.addEventListener("storage", syncLocation);
    window.addEventListener("focus", syncLocation);
    document.addEventListener("visibilitychange", syncLocation);
    return () => {
      window.removeEventListener("lethela:location-changed", syncLocation);
      window.removeEventListener("storage", syncLocation);
      window.removeEventListener("focus", syncLocation);
      document.removeEventListener("visibilitychange", syncLocation);
    };
  }, [suburb]);

  useEffect(() => {
    const isDefaultFilter = !category;
    if (!skippedInitialLoad.current && hasInitial && isDefaultFilter) {
      skippedInitialLoad.current = true;
      return;
    }
    skippedInitialLoad.current = true;
    void load();
  }, [category, hasInitial, load]);

  useEffect(() => {
    if (loading || items.length === 0) return;
    const signature = JSON.stringify(items.map((item) => item.id));
    if (listTrackedRef.current === signature) return;
    listTrackedRef.current = signature;

    pushEcommerceEvent("view_item_list", {
      item_list_name: category || "Popular picks near you",
      items: items.slice(0, 12).map((item) => ({
        item_id: item.id,
        item_name: item.name,
        item_brand: item.vendor?.name || undefined,
        item_category: item.category || undefined,
        item_variant: item.vendor?.slug || undefined,
        price: item.priceCents / 100,
      })),
    });
  }, [category, items, loading]);

  return (
    <section className="container py-10" id="products">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-semibold">Popular picks near you</h2>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-full border px-3 py-1.5 text-xs transition ${!category ? "border-white/40 bg-white/10" : "border-white/15"}`}
          onClick={() => setCategory("")}
        >
          All
        </button>
        {TOWNSHIP_CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            className={`rounded-full border px-3 py-1.5 text-xs transition ${category === item ? "border-white/40 bg-white/10" : "border-white/15"}`}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mb-4 rounded border border-white/15 bg-white/5 p-3 text-sm text-red-200">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-2xl border border-white/10 bg-white/[0.06]"
            />
          ))
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-white/15 bg-white/5 p-5 text-sm leading-6 text-white/72 sm:col-span-2 lg:col-span-3">
            No approved live products are available yet. Lethela only shows products from approved
            vendors with complete profiles, trading hours and stock ready for ordering.
          </div>
        ) : (
          items.map((product) => <ProductCard key={product.id} p={product} />)
        )}
      </div>

      {!loading && items.length >= 6 ? (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" className="border-white/20" onClick={load}>
            Refresh
          </Button>
        </div>
      ) : null}
    </section>
  );
}
