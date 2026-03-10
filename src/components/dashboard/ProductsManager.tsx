"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DashCard from "./DashCard";

type Product = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  priceCents: number;
  isAlcohol: boolean;
  inStock: boolean;
  image?: string | null;
};

type ProductFormState = {
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  isAlcohol: boolean;
  inStock: boolean;
  image: string;
};

const emptyForm: ProductFormState = {
  name: "",
  slug: "",
  description: "",
  priceCents: 9900,
  isAlcohol: false,
  inStock: true,
  image: "",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function productToForm(product: Product): ProductFormState {
  return {
    name: product.name,
    slug: product.slug,
    description: product.description || "",
    priceCents: product.priceCents,
    isAlcohol: product.isAlcohol,
    inStock: product.inStock,
    image: product.image || "",
  };
}

export default function ProductsManager() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [slugEdited, setSlugEdited] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"ALL" | "IN" | "OUT">("ALL");
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/vendor/products", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to load products");
      }
      setItems(json.items || []);
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function uploadImage(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const response = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error || "Upload failed");
    }
    return json.url as string;
  }

  function resetForm() {
    setForm(emptyForm);
    setSlugEdited(false);
    setEditingId(null);
  }

  async function save() {
    const name = form.name.trim();
    const slug = form.slug.trim();
    const priceCents = Number(form.priceCents ?? 0);

    if (!name || !slug || !Number.isFinite(priceCents) || priceCents < 100) {
      setStatus("Please enter name, slug and a valid price of at least R1.");
      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      const endpoint = editingId ? `/api/vendor/products/${editingId}` : "/api/vendor/products";
      const method = editingId ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          name,
          slug,
          priceCents,
          description: form.description || null,
          image: form.image || null,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to save product");
      }

      resetForm();
      setStatus(editingId ? `Updated "${json.product.name}".` : `Added "${json.product.name}".`);
      await load();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;

    setStatus(null);
    try {
      const response = await fetch(`/api/vendor/products/${id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Delete failed");

      if (editingId === id) {
        resetForm();
      }

      setStatus("Product deleted.");
      await load();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Delete failed");
    }
  }

  async function generateDescription() {
    if (!form.name.trim()) {
      setStatus("Enter a product name first.");
      return;
    }

    setStatus(null);
    const response = await fetch("/api/ai/vendor/describe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: form.name, keyNotes: form.description }),
    });
    const json = await response.json();
    setForm((current) => ({ ...current, description: json?.description || current.description }));
  }

  async function suggestPrice() {
    if (!form.name.trim()) {
      setStatus("Enter a product name first.");
      return;
    }

    setStatus(null);
    const response = await fetch("/api/ai/vendor/price", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        currentPriceCents: form.priceCents,
      }),
    });
    const json = await response.json();
    if (json?.suggestedPriceCents) {
      setForm((current) => ({ ...current, priceCents: json.suggestedPriceCents }));
      setStatus(`AI suggested R${(json.suggestedPriceCents / 100).toFixed(2)}.`);
    }
  }

  const filteredItems = useMemo(() => {
    const text = query.trim().toLowerCase();
    return items.filter((product) => {
      if (stockFilter === "IN" && !product.inStock) return false;
      if (stockFilter === "OUT" && product.inStock) return false;

      if (!text) return true;
      return [product.name, product.slug, product.description || ""]
        .join(" ")
        .toLowerCase()
        .includes(text);
    });
  }, [items, query, stockFilter]);

  const summary = useMemo(() => {
    const inStock = items.filter((item) => item.inStock).length;
    const alcohol = items.filter((item) => item.isAlcohol).length;
    return {
      total: items.length,
      inStock,
      outOfStock: items.length - inStock,
      alcohol,
    };
  }, [items]);

  return (
    <div className="grid gap-5">
      <DashCard title={editingId ? "Edit Product" : "Add Product"}>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
            <div className="text-xs uppercase tracking-[0.12em] text-white/60">Total</div>
            <div className="mt-2 text-xl font-semibold">{summary.total}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
            <div className="text-xs uppercase tracking-[0.12em] text-white/60">In stock</div>
            <div className="mt-2 text-xl font-semibold">{summary.inStock}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
            <div className="text-xs uppercase tracking-[0.12em] text-white/60">Out of stock</div>
            <div className="mt-2 text-xl font-semibold">{summary.outOfStock}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
            <div className="text-xs uppercase tracking-[0.12em] text-white/60">18+ items</div>
            <div className="mt-2 text-xl font-semibold">{summary.alcohol}</div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded bg-white px-3 py-2 text-black"
            placeholder="Name*"
            value={form.name}
            onChange={(event) => {
              const name = event.target.value;
              setForm((current) => ({ ...current, name }));
              if (!slugEdited) {
                setForm((current) => ({ ...current, slug: slugify(name) }));
              }
            }}
          />
          <input
            className="rounded bg-white px-3 py-2 text-black"
            placeholder="slug* (kebab-case)"
            value={form.slug}
            onChange={(event) => {
              setSlugEdited(true);
              setForm((current) => ({ ...current, slug: slugify(event.target.value) }));
            }}
          />

          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <input
              ref={fileRef}
              className="hidden"
              type="file"
              accept="image/*"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  const url = await uploadImage(file);
                  setForm((current) => ({ ...current, image: url }));
                  setStatus("Image uploaded.");
                } catch (error: unknown) {
                  setStatus(error instanceof Error ? error.message : "Image upload failed");
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded border border-white/20 px-3 py-2 text-sm transition-colors hover:border-lethela-primary hover:text-lethela-primary"
            >
              Upload image
            </button>
            {form.image ? <span className="text-xs text-white/70">Image: {form.image}</span> : null}
          </div>

          {form.image ? (
            <div className="md:col-span-2">
              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image} alt={form.name || "Product preview"} className="h-44 w-full object-cover" />
              </div>
            </div>
          ) : null}

          <textarea
            className="rounded bg-white px-3 py-2 text-black md:col-span-2"
            placeholder="Description"
            rows={3}
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />

          <div className="flex items-center gap-2">
            <input
              className="w-40 rounded bg-white px-3 py-2 text-black"
              type="number"
              min={1}
              step={1}
              value={Math.round(form.priceCents / 100)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  priceCents: Math.max(0, parseInt(event.target.value || "0", 10)) * 100,
                }))
              }
            />
            <span className="text-sm">ZAR</span>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isAlcohol}
              onChange={(event) => setForm((current) => ({ ...current, isAlcohol: event.target.checked }))}
            />
            Alcohol (18+)
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.inStock}
              onChange={(event) => setForm((current) => ({ ...current, inStock: event.target.checked }))}
            />
            In stock
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={generateDescription}
            className="rounded border border-white/20 px-3 py-2 text-sm transition-colors hover:border-lethela-primary hover:text-lethela-primary"
          >
            AI: Generate description
          </button>
          <button
            type="button"
            onClick={suggestPrice}
            className="rounded border border-white/20 px-3 py-2 text-sm transition-colors hover:border-lethela-primary hover:text-lethela-primary"
          >
            AI: Suggest price
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded bg-lethela-primary px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Save changes" : "Add product"}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded border border-white/20 px-3 py-2 text-sm transition-colors hover:border-lethela-primary hover:text-lethela-primary"
          >
            Refresh list
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded border border-white/20 px-3 py-2 text-sm transition-colors hover:border-lethela-primary hover:text-lethela-primary"
            >
              Cancel edit
            </button>
          ) : null}
        </div>

        {status ? <p className="mt-3 text-xs text-white/75">{status}</p> : null}
      </DashCard>

      <DashCard title="Your Products">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products"
              className="rounded border border-white/15 bg-white px-3 py-2 text-sm text-black"
            />
            <select
              value={stockFilter}
              onChange={(event) => setStockFilter(event.target.value as "ALL" | "IN" | "OUT")}
              className="rounded border border-white/15 bg-white px-3 py-2 text-sm text-black"
            >
              <option value="ALL">All stock states</option>
              <option value="IN">In stock</option>
              <option value="OUT">Out of stock</option>
            </select>
          </div>
          <div className="text-xs text-white/60">{filteredItems.length} visible product(s)</div>
        </div>

        {loading ? (
          <div className="text-sm text-white/70">Loading...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-sm text-white/70">No products match the current filter.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((product) => (
              <div key={product.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="truncate font-semibold">{product.name}</div>
                  <span className="rounded border border-white/20 px-2 py-1 text-xs">
                    R{(product.priceCents / 100).toFixed(2)}
                  </span>
                </div>
                <div className="mt-1 truncate text-xs text-white/70">{product.slug}</div>
                {product.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.image} alt="" className="mt-2 h-28 w-full rounded object-cover" />
                ) : null}
                <div className="mt-2 line-clamp-3 text-sm">{product.description}</div>
                <div className="mt-3 flex items-center justify-between text-xs text-white/70">
                  <span>{product.isAlcohol ? "18+ Alcohol" : "Food/Drink"}</span>
                  <span>{product.inStock ? "In stock" : "Out of stock"}</span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(product.id);
                      setForm(productToForm(product));
                      setSlugEdited(true);
                      setStatus(`Editing "${product.name}".`);
                    }}
                    className="underline-offset-2 hover:text-lethela-primary hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(product.id)}
                    className="underline-offset-2 hover:text-red-200 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashCard>
    </div>
  );
}
