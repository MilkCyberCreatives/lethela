// src/components/ProductsGrid.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard, { ProductLite } from "./ProductCard";
import { Button } from "@/components/ui/button";
import { TOWNSHIP_CATEGORIES } from "@/lib/categories";

type ApiResp = { ok: boolean; items: ProductLite[] };

export default function ProductsGrid({
  showAlcoholToggle = true,
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
  const [onlyAlcohol, setOnlyAlcohol] = useState(false);
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const skippedInitialLoad = useRef(false);

  useEffect(() => {
    const picked = String(searchParams?.get("category") || "").trim();
    setCategory(picked);
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (onlyAlcohol) query.set("alcohol", "true");
      if (category) query.set("category", category);
      if (suburb) query.set("suburb", suburb);
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
  }, [onlyAlcohol, category, suburb]);

  useEffect(() => {
    const isDefaultFilter = !onlyAlcohol && !category;
    if (!skippedInitialLoad.current && hasInitial && isDefaultFilter) {
      skippedInitialLoad.current = true;
      return;
    }
    skippedInitialLoad.current = true;
    void load();
  }, [category, hasInitial, load, onlyAlcohol]);

  return (
    <section className="container py-10" id="products">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-semibold">Popular picks near you</h2>
        {showAlcoholToggle ? (
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyAlcohol}
              onChange={(event) => setOnlyAlcohol(event.target.checked)}
              className="h-4 w-4 rounded accent-lethela-primary"
            />
            Show alcohol only
          </label>
        ) : null}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          className={`rounded-full border px-3 py-1.5 text-xs transition ${!category ? "border-white/40 bg-white/10" : "border-white/15"}`}
          onClick={() => setCategory("")}
        >
          All
        </button>
        {TOWNSHIP_CATEGORIES.map((item) => (
          <button
            key={item}
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
          <button className="ml-2 underline" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 animate-pulse rounded-2xl border border-white/10 bg-white/[0.06]" />
            ))
          : items.length === 0
            ? <p className="text-white/70">No products found.</p>
            : items.map((product) => <ProductCard key={product.id} p={product} />)}
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
