"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import DashCard from "./DashCard";

type ProductOption = { id: string; name: string };

type Special = {
  id: string;
  title: string;
  description: string | null;
  discountPct: number;
  startsAt: string;
  endsAt: string;
  draft: boolean;
  product: ProductOption | null;
};

type SpecialFormState = {
  title: string;
  description: string;
  discountPct: number;
  productId: string;
  startsAt: string;
  endsAt: string;
  draft: boolean;
};

const emptyForm: SpecialFormState = {
  title: "",
  description: "",
  discountPct: 10,
  productId: "",
  startsAt: "",
  endsAt: "",
  draft: false,
};

function specialToForm(special: Special): SpecialFormState {
  return {
    title: special.title,
    description: special.description || "",
    discountPct: special.discountPct,
    productId: special.product?.id || "",
    startsAt: special.startsAt.slice(0, 16),
    endsAt: special.endsAt.slice(0, 16),
    draft: special.draft,
  };
}

function getSpecialPhase(special: Special) {
  const now = Date.now();
  const startsAt = new Date(special.startsAt).getTime();
  const endsAt = new Date(special.endsAt).getTime();

  if (startsAt > now) return "Upcoming";
  if (endsAt < now) return "Expired";
  return "Live";
}

function makeQuickWindow(hoursFromNow: number, durationHours: number) {
  const start = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
  return {
    startsAt: start.toISOString().slice(0, 16),
    endsAt: end.toISOString().slice(0, 16),
  };
}

export default function SpecialsManager() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [specials, setSpecials] = useState<Special[]>([]);
  const [form, setForm] = useState<SpecialFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function load() {
    const [productsResponse, specialsResponse] = await Promise.all([
      fetch("/api/vendor/products", { cache: "no-store" }),
      fetch("/api/vendors/specials", { cache: "no-store" }),
    ]);
    const productsJson = await productsResponse.json();
    const specialsJson = await specialsResponse.json();

    if (!productsResponse.ok || !productsJson.ok) {
      throw new Error(productsJson.error || "Failed to load products.");
    }
    if (!specialsResponse.ok || !specialsJson.ok) {
      throw new Error(specialsJson.error || "Failed to load specials.");
    }

    setProducts(
      (productsJson.items || []).map((item: { id: string; name: string }) => ({
        id: item.id,
        name: item.name,
      }))
    );
    setSpecials(specialsJson.specials || []);
  }

  useEffect(() => {
    load().catch((error: unknown) => {
      setStatus(error instanceof Error ? error.message : "Failed to load specials.");
    });
  }, []);

  useEffect(() => {
    const action = searchParams?.get("action");
    if (action !== "create" || editingId) return;

    const quickWindow = makeQuickWindow(1, 4);
    setForm((current) => ({
      ...current,
      startsAt: current.startsAt || quickWindow.startsAt,
      endsAt: current.endsAt || quickWindow.endsAt,
    }));
    setStatus("Create a special below. Quick start times have been filled in for you.");
  }, [editingId, searchParams]);

  async function save() {
    setBusy(true);
    setStatus(null);
    try {
      const payload = {
        ...form,
        discountPct: Number(form.discountPct),
        draft: Boolean(form.draft),
      };
      const endpoint = editingId ? `/api/vendors/specials/${editingId}` : "/api/vendors/specials";
      const method = editingId ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Failed");

      setForm(emptyForm);
      setEditingId(null);
      setStatus(editingId ? "Special updated." : "Special created.");
      await load();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Failed to save special.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this special?")) return;

    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/vendors/specials/${id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Failed to delete.");

      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm);
      }

      setStatus("Special deleted.");
      await load();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Failed to delete special.");
    } finally {
      setBusy(false);
    }
  }

  const summary = useMemo(() => {
    return {
      live: specials.filter((special) => getSpecialPhase(special) === "Live").length,
      upcoming: specials.filter((special) => getSpecialPhase(special) === "Upcoming").length,
      expired: specials.filter((special) => getSpecialPhase(special) === "Expired").length,
      drafts: specials.filter((special) => special.draft).length,
    };
  }, [specials]);

  return (
    <DashCard title={editingId ? "Edit Special" : "Specials / Promotions"}>
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
          <div className="text-xs uppercase tracking-[0.12em] text-white/60">Live</div>
          <div className="mt-2 text-xl font-semibold">{summary.live}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
          <div className="text-xs uppercase tracking-[0.12em] text-white/60">Upcoming</div>
          <div className="mt-2 text-xl font-semibold">{summary.upcoming}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
          <div className="text-xs uppercase tracking-[0.12em] text-white/60">Expired</div>
          <div className="mt-2 text-xl font-semibold">{summary.expired}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
          <div className="text-xs uppercase tracking-[0.12em] text-white/60">Drafts</div>
          <div className="mt-2 text-xl font-semibold">{summary.drafts}</div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            const quickWindow = makeQuickWindow(1, 3);
            setForm((current) => ({ ...current, ...quickWindow }));
          }}
          className="rounded border border-white/20 px-3 py-2 text-xs transition-colors hover:border-lethela-primary hover:text-lethela-primary"
        >
          Quick: start in 1 hour
        </button>
        <button
          type="button"
          onClick={() => {
            const quickWindow = makeQuickWindow(24, 6);
            setForm((current) => ({ ...current, ...quickWindow }));
          }}
          className="rounded border border-white/20 px-3 py-2 text-xs transition-colors hover:border-lethela-primary hover:text-lethela-primary"
        >
          Quick: tomorrow promo
        </button>
        <button
          type="button"
          onClick={() => {
            const quickWindow = makeQuickWindow(2, 2);
            setForm((current) => ({
              ...current,
              title: current.title || "Lunch rush special",
              description: current.description || "Boost midday orders with a limited-time deal.",
              discountPct: current.discountPct || 10,
              ...quickWindow,
            }));
          }}
          className="rounded border border-white/20 px-3 py-2 text-xs transition-colors hover:border-lethela-primary hover:text-lethela-primary"
        >
          Quick: lunch rush
        </button>
        <button
          type="button"
          onClick={() => {
            const quickWindow = makeQuickWindow(48, 8);
            setForm((current) => ({
              ...current,
              title: current.title || "Weekend feature",
              description: current.description || "Highlight one strong seller over the weekend.",
              discountPct: current.discountPct || 15,
              ...quickWindow,
            }));
          }}
          className="rounded border border-white/20 px-3 py-2 text-xs transition-colors hover:border-lethela-primary hover:text-lethela-primary"
        >
          Quick: weekend feature
        </button>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded border border-white/20 px-3 py-2 text-xs transition-colors hover:border-lethela-primary hover:text-lethela-primary"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <input
          className="rounded bg-white px-3 py-2 text-black"
          placeholder="Title*"
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
        />
        <input
          className="rounded bg-white px-3 py-2 text-black"
          placeholder="Discount %*"
          type="number"
          min={1}
          max={90}
          value={form.discountPct}
          onChange={(event) => setForm((current) => ({ ...current, discountPct: Number(event.target.value) }))}
        />
        <select
          className="rounded bg-white px-3 py-2 text-black"
          value={form.productId}
          onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))}
        >
          <option value="">Applies to all products</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
        <input
          className="rounded bg-white px-3 py-2 text-black"
          placeholder="Starts at"
          type="datetime-local"
          value={form.startsAt}
          onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))}
        />
        <input
          className="rounded bg-white px-3 py-2 text-black"
          placeholder="Ends at"
          type="datetime-local"
          value={form.endsAt}
          onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))}
        />
        <textarea
          className="rounded bg-white px-3 py-2 text-black md:col-span-2"
          placeholder="Description"
          rows={2}
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
        />
        <label className="inline-flex items-center gap-2 text-sm text-white/85 md:col-span-2">
          <input
            type="checkbox"
            checked={form.draft}
            onChange={(event) => setForm((current) => ({ ...current, draft: event.target.checked }))}
          />
          Save as draft until I am ready to publish it
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded bg-lethela-primary px-3 py-2 text-sm text-white disabled:opacity-60"
        >
          {busy ? "Saving..." : editingId ? "Save special" : "Create special"}
        </button>
        {editingId ? (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm);
            }}
            className="rounded border border-white/20 px-3 py-2 text-sm transition-colors hover:border-lethela-primary hover:text-lethela-primary"
          >
            Cancel edit
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2">
        {specials.length === 0 ? <div className="text-sm text-white/70">No specials scheduled yet.</div> : null}
        {specials.map((special) => {
          const phase = getSpecialPhase(special);
          return (
            <div key={special.id} className="rounded border border-white/10 bg-white/5 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="font-semibold">
                  {special.title} <span className="text-white/70">({special.discountPct}% off)</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="rounded-full border border-white/20 px-2 py-1">
                    {special.draft ? "Draft" : "Published"}
                  </span>
                  <span className="rounded-full border border-white/20 px-2 py-1">{phase}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(special.id);
                      setForm(specialToForm(special));
                      setStatus(`Editing "${special.title}".`);
                    }}
                    className="underline-offset-2 hover:text-lethela-primary hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(special.id)}
                    className="underline-offset-2 hover:text-red-200 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-1 text-xs text-white/70">
                {new Date(special.startsAt).toLocaleString()} to {new Date(special.endsAt).toLocaleString()}
              </div>
              {special.product ? <div className="mt-1 text-xs">Product: {special.product.name}</div> : null}
              {special.description ? <div className="mt-1 text-xs">{special.description}</div> : null}
            </div>
          );
        })}
      </div>

      {status ? <p className="mt-3 text-xs text-white/75">{status}</p> : null}
    </DashCard>
  );
}
