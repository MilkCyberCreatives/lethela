"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  ImagePlus,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import DashCard from "./DashCard";
import FormField from "./FormField";
import {
  EmptyState,
  FilterTabs,
  Notice,
  StatusBadge,
  dashButton,
  dashField,
  statusText,
  toneForStatus,
} from "@/components/dashboard/kit/ui";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  priceCents: number;
  isAlcohol: boolean;
  inStock: boolean;
  image?: string | null;
  status: string;
  reviewReason?: string | null;
};

type ProductFormState = {
  name: string;
  slug: string;
  description: string;
  /** Rand amount as typed, for example "54.99". Kept as text so cents are never rounded away. */
  price: string;
  isAlcohol: boolean;
  inStock: boolean;
  image: string;
};

const emptyForm: ProductFormState = {
  name: "",
  slug: "",
  description: "",
  price: "",
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
    price: (product.priceCents / 100).toFixed(2),
    isAlcohol: product.isAlcohol,
    inStock: product.inStock,
    image: product.image || "",
  };
}

// How a status message reads: finished actions in green, hints in grey, problems in red.
function statusTone(message: string) {
  if (/^(Added|Updated) "/.test(message) || message === "Product deleted.") return "success";
  if (message === "Image uploaded." || message.startsWith("AI suggested ")) return "success";
  if (message.startsWith("Editing ")) return "neutral";
  return "danger";
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
    const priceCents = Math.round(Number(form.price.replace(",", ".") || "0") * 100);

    if (name.length < 2 || !slug || !Number.isFinite(priceCents) || priceCents < 100) {
      setStatus(
        "Enter a product name (at least 2 letters), a product link and a price of at least R1.",
      );
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
          name,
          slug,
          priceCents,
          description: form.description || null,
          image: form.image || null,
          isAlcohol: form.isAlcohol,
          inStock: form.inStock,
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
        currentPriceCents: Math.round(Number(form.price.replace(",", ".") || "0") * 100),
      }),
    });
    const json = await response.json();
    if (json?.suggestedPriceCents) {
      setForm((current) => ({
        ...current,
        price: (json.suggestedPriceCents / 100).toFixed(2),
      }));
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
    const liquor = items.filter((item) => item.isAlcohol).length;
    return {
      total: items.length,
      inStock,
      outOfStock: items.length - inStock,
      liquor,
    };
  }, [items]);

  const checkboxClass = "h-4 w-4 shrink-0 accent-lethela-primary";

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:items-start">
      <DashCard
        title={editingId ? "Edit product" : "Add a product"}
        description={
          editingId
            ? undefined
            : "For packaged goods with a photo and stock. Lethela checks each new product before customers see it."
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Product name">
              <input
                className={dashField.input}
                placeholder="e.g. White bread 700g"
                value={form.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setForm((current) => ({ ...current, name }));
                  if (!slugEdited) {
                    setForm((current) => ({ ...current, slug: slugify(name) }));
                  }
                }}
              />
            </FormField>
            <FormField label="Product link">
              <input
                className={dashField.input}
                placeholder="e.g. white-bread-700g"
                value={form.slug}
                onChange={(event) => {
                  setSlugEdited(true);
                  setForm((current) => ({ ...current, slug: slugify(event.target.value) }));
                }}
              />
              <span className={dashField.hint}>Fills in from the name.</span>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid min-w-0 content-start gap-1">
              <FormField label="Price (R)">
                <input
                  className={dashField.input}
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 45.00"
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      price: event.target.value.replace(/[^0-9.,]/g, ""),
                    }))
                  }
                />
              </FormField>
              <button
                type="button"
                onClick={suggestPrice}
                className={cn(dashButton.link, "justify-self-start")}
              >
                <Sparkles aria-hidden="true" />
                Suggest a price
              </button>
            </div>
            <label className="mt-6 flex min-h-11 items-center gap-3 self-start text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                className={checkboxClass}
                checked={form.inStock}
                onChange={(event) =>
                  setForm((current) => ({ ...current, inStock: event.target.checked }))
                }
              />
              In stock
            </label>
          </div>

          <details
            className="rounded-lg border border-slate-200"
            open={editingId ? true : undefined}
          >
            <summary className="flex min-h-11 items-center gap-2 px-3 py-2.5 text-sm font-semibold text-slate-900">
              <ChevronRight
                className="dash-summary-chevron h-4 w-4 shrink-0 text-slate-400"
                aria-hidden="true"
              />
              More details
              <span className="font-normal text-slate-500">(optional)</span>
            </summary>
            <div className="grid gap-4 border-t border-slate-100 p-3">
              <div className="grid gap-2">
                <span className={dashField.label}>Photo</span>
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
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className={dashButton.secondary}
                  >
                    <ImagePlus aria-hidden="true" />
                    {form.image ? "Change photo" : "Upload photo"}
                  </button>
                  {form.image ? (
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-500">
                      {form.image}
                    </span>
                  ) : null}
                </div>
                {form.image ? (
                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:max-w-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.image}
                      alt={form.name || "Product preview"}
                      className="h-36 w-full object-cover"
                    />
                  </div>
                ) : null}
              </div>

              <div className="grid gap-1">
                <FormField label="Description">
                  <textarea
                    className={dashField.input}
                    rows={3}
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, description: event.target.value }))
                    }
                  />
                </FormField>
                <button
                  type="button"
                  onClick={generateDescription}
                  className={cn(dashButton.link, "justify-self-start")}
                >
                  <Sparkles aria-hidden="true" />
                  Write a description for me
                </button>
              </div>

              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className={cn(checkboxClass, "mt-0.5")}
                  checked={form.isAlcohol}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, isAlcohol: event.target.checked }))
                  }
                />
                <span>Liquor (18+). Needs a verified liquor licence.</span>
              </label>
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className={cn(dashButton.primary, "flex-1 sm:flex-none")}
            >
              {editingId ? null : <Plus aria-hidden="true" />}
              {saving ? "Saving..." : editingId ? "Save changes" : "Add product"}
            </button>
            {editingId ? (
              <button type="button" onClick={resetForm} className={dashButton.secondary}>
                Cancel edit
              </button>
            ) : null}
          </div>

          {status ? <Notice tone={statusTone(status)}>{status}</Notice> : null}
        </div>
      </DashCard>

      <DashCard
        title="Your products"
        description={
          loading
            ? undefined
            : `${summary.total} product${summary.total === 1 ? "" : "s"}${
                summary.liquor > 0 ? ` · ${summary.liquor} liquor (18+)` : ""
              }`
        }
        actions={
          <button type="button" onClick={() => void load()} className={dashButton.quiet}>
            <RefreshCw aria-hidden="true" />
            Refresh
          </button>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <FilterTabs
                label="Stock filter"
                options={[
                  { value: "ALL", label: "All", count: summary.total },
                  { value: "IN", label: "In stock", count: summary.inStock },
                  { value: "OUT", label: "Out of stock", count: summary.outOfStock },
                ]}
                value={stockFilter}
                onChange={setStockFilter}
              />
            </div>
            <div className="relative min-w-0 lg:w-56">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products"
                aria-label="Search products"
                className={cn(dashField.input, "pl-9")}
              />
            </div>
          </div>

          {loading ? (
            <div className="grid gap-3" aria-hidden="true">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState
              compact
              icon={<Package />}
              title={items.length === 0 ? "No products yet" : "No products match"}
              text={
                items.length === 0
                  ? "Products you add show here."
                  : "Try another filter or clear the search."
              }
            />
          ) : (
            <>
              <p className="text-xs text-slate-500">
                Showing {filteredItems.length} of {items.length}
              </p>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {filteredItems.map((product) => (
                  <li key={product.id} className="flex gap-3 p-3">
                    {product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-lg bg-slate-100 object-cover"
                      />
                    ) : (
                      <span
                        className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400"
                        aria-hidden="true"
                      >
                        <Package className="h-5 w-5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 break-words font-medium text-slate-900">
                          {product.name}
                        </p>
                        <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                          R{(product.priceCents / 100).toFixed(2)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-slate-500">{product.slug}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <StatusBadge tone={product.inStock ? "success" : "warning"}>
                          {product.inStock ? "In stock" : "Out of stock"}
                        </StatusBadge>
                        <StatusBadge tone={toneForStatus(product.status)}>
                          Review: {statusText(product.status).toLowerCase()}
                        </StatusBadge>
                        {product.isAlcohol ? (
                          <StatusBadge tone="neutral" dot={false}>
                            Liquor 18+
                          </StatusBadge>
                        ) : null}
                      </div>
                      {product.description ? (
                        <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">
                          {product.description}
                        </p>
                      ) : null}
                      {product.reviewReason ? (
                        <p className="mt-1 text-xs text-amber-800">{product.reviewReason}</p>
                      ) : null}
                      <div className="-ml-3 mt-1 flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(product.id);
                            setForm(productToForm(product));
                            setSlugEdited(true);
                            setStatus(`Editing "${product.name}".`);
                          }}
                          className={dashButton.quiet}
                        >
                          <Pencil aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(product.id)}
                          className={cn(dashButton.quiet, "text-red-700 hover:bg-red-50")}
                        >
                          <Trash2 aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </DashCard>
    </div>
  );
}
