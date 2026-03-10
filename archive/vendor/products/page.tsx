// src/app/vendor/products/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Product = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  priceCents: number;
  image?: string;
  isAlcohol: boolean;
  abv?: number | null;
  inStock: boolean;
};

export default function VendorProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Partial<Product>>({
    name: "",
    slug: "",
    priceCents: 0,
    isAlcohol: false,
    inStock: true,
  });

  async function load() {
    setLoading(true);
    const r = await fetch("/api/vendor/products");
    const j = await r.json();
    setItems(j.items || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/vendor/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      setForm({ name: "", slug: "", priceCents: 0, isAlcohol: false, inStock: true });
      load();
    } else {
      alert("Failed to save");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete product?")) return;
    const r = await fetch(`/api/vendor/products/${id}`, { method: "DELETE" });
    if (r.ok) load();
  }

  return (
    <main className="container py-8">
      <h1 className="text-2xl font-bold">Products</h1>
      <p className="text-white/70 mt-1">Create and manage your items. Toggle “Alcohol” for age-restricted products.</p>

      {/* Create form */}
      <form onSubmit={save} className="card-glass rounded-xl p-5 mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-1">
          <label className="text-sm">Name</label>
          <Input value={form.name || ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="bg-white text-black" />
        </div>
        <div className="sm:col-span-1">
          <label className="text-sm">Slug</label>
          <Input value={form.slug || ""} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} required className="bg-white text-black" />
        </div>
        <div className="sm:col-span-1">
          <label className="text-sm">Price (R cents)</label>
          <Input type="number" value={form.priceCents || 0} onChange={(e) => setForm((f) => ({ ...f, priceCents: Number(e.target.value) }))} className="bg-white text-black" />
        </div>
        <div className="sm:col-span-1">
          <label className="text-sm">Image URL (optional)</label>
          <Input value={form.image || ""} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} className="bg-white text-black" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm">Description</label>
          <Textarea value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="bg-white text-black" />
        </div>
        <div className="sm:col-span-1">
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={!!form.isAlcohol} onChange={(e) => setForm((f) => ({ ...f, isAlcohol: e.target.checked }))} />
            Alcohol
          </label>
        </div>
        <div className="sm:col-span-1">
          <label className="text-sm">ABV % (if alcohol)</label>
          <Input type="number" step="0.1" value={form.abv ?? ""} onChange={(e) => setForm((f) => ({ ...f, abv: e.target.value ? Number(e.target.value) : null }))} className="bg-white text-black" />
        </div>
        <div className="sm:col-span-1">
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={!!form.inStock} onChange={(e) => setForm((f) => ({ ...f, inStock: e.target.checked }))} />
            In stock
          </label>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" className="bg-lethela-primary">Save product</Button>
        </div>
      </form>

      {/* List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 h-40 animate-pulse" />
          ))
        ) : items.length === 0 ? (
          <p className="text-white/70">No products yet.</p>
        ) : (
          items.map((p) => (
            <div key={p.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-xs text-white/60">{p.isAlcohol ? "Alcohol • " : ""}R {(p.priceCents/100).toFixed(2)}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => remove(p.id)}>Delete</Button>
              </div>
              {p.description && <p className="text-sm text-white/70 mt-2 line-clamp-2">{p.description}</p>}
            </div>
          ))
        )}
      </div>
    </main>
  );
}
