"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Archive,
  CalendarClock,
  EyeOff,
  Pencil,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  Zap,
} from "lucide-react";
import DashCard from "./DashCard";
import FormField from "./FormField";
import {
  EmptyState,
  Notice,
  StatTile,
  StatusBadge,
  dashButton,
  dashField,
} from "@/components/dashboard/kit/ui";
import { cn } from "@/lib/utils";

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

const QUICK_TIMES_MESSAGE = "Start and end times are filled in for you.";

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

function formatWhen(value: string) {
  return new Date(value).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}

// How a status message reads: finished actions in green, hints in grey, problems in red.
function statusTone(message: string) {
  if (["Special updated.", "Special created.", "Special deleted."].includes(message)) {
    return "success";
  }
  if (message === QUICK_TIMES_MESSAGE || message.startsWith("Editing ")) return "neutral";
  return "danger";
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
      })),
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
    setStatus(QUICK_TIMES_MESSAGE);
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

  const quickButton = cn(dashButton.secondary, "px-3");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Live now" value={summary.live} icon={<Zap />} />
        <StatTile label="Upcoming" value={summary.upcoming} icon={<CalendarClock />} />
        <StatTile label="Ended" value={summary.expired} icon={<Archive />} />
        <StatTile label="Drafts" value={summary.drafts} icon={<EyeOff />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:items-start">
        <DashCard title={editingId ? "Edit special" : "Create a special"}>
          <div className="space-y-4">
            <div>
              <p className={dashField.label}>Quick start</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    const quickWindow = makeQuickWindow(1, 3);
                    setForm((current) => ({ ...current, ...quickWindow }));
                  }}
                  className={quickButton}
                >
                  In 1 hour
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const quickWindow = makeQuickWindow(24, 6);
                    setForm((current) => ({ ...current, ...quickWindow }));
                  }}
                  className={quickButton}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const quickWindow = makeQuickWindow(2, 2);
                    setForm((current) => ({
                      ...current,
                      title: current.title || "Lunch rush special",
                      description:
                        current.description || "Boost midday orders with a limited-time deal.",
                      discountPct: current.discountPct || 10,
                      ...quickWindow,
                    }));
                  }}
                  className={quickButton}
                >
                  Lunch rush
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const quickWindow = makeQuickWindow(48, 8);
                    setForm((current) => ({
                      ...current,
                      title: current.title || "Weekend feature",
                      description:
                        current.description || "Highlight one strong seller over the weekend.",
                      discountPct: current.discountPct || 15,
                      ...quickWindow,
                    }));
                  }}
                  className={quickButton}
                >
                  Weekend
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Title">
                <input
                  className={dashField.input}
                  placeholder="e.g. Friday kota deal"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </FormField>
              <FormField label="Discount (%)">
                <input
                  className={dashField.input}
                  type="number"
                  min={1}
                  max={90}
                  value={form.discountPct}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, discountPct: Number(event.target.value) }))
                  }
                />
              </FormField>
              <FormField label="Applies to" className="sm:col-span-2">
                <select
                  className={dashField.input}
                  value={form.productId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, productId: event.target.value }))
                  }
                >
                  <option value="">All products</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Starts" className="xl:col-span-2">
                <input
                  className={cn(dashField.input, "min-w-0")}
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, startsAt: event.target.value }))
                  }
                />
              </FormField>
              <FormField label="Ends" className="xl:col-span-2">
                <input
                  className={cn(dashField.input, "min-w-0")}
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, endsAt: event.target.value }))
                  }
                />
              </FormField>
              <FormField label="Description (optional)" className="sm:col-span-2">
                <textarea
                  className={dashField.input}
                  rows={2}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </FormField>
              <label className="flex items-start gap-3 text-sm text-slate-700 sm:col-span-2">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-lethela-primary"
                  checked={form.draft}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, draft: event.target.checked }))
                  }
                />
                <span>Save as draft (customers will not see it yet)</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className={cn(dashButton.primary, "flex-1 sm:flex-none")}
              >
                {editingId ? null : <Plus aria-hidden="true" />}
                {busy ? "Saving..." : editingId ? "Save special" : "Create special"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                  className={dashButton.secondary}
                >
                  Cancel edit
                </button>
              ) : null}
            </div>

            {status ? <Notice tone={statusTone(status)}>{status}</Notice> : null}
          </div>
        </DashCard>

        <DashCard
          title="Your specials"
          description={`${specials.length} special${specials.length === 1 ? "" : "s"}`}
          actions={
            <button type="button" onClick={() => void load()} className={dashButton.quiet}>
              <RefreshCw aria-hidden="true" />
              Refresh
            </button>
          }
        >
          {specials.length === 0 ? (
            <EmptyState
              compact
              icon={<Tag />}
              title="No specials yet"
              text="Create a special to bring in more orders on quiet days."
            />
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {specials.map((special) => {
                const phase = getSpecialPhase(special);
                return (
                  <li key={special.id} className="px-3 py-3 sm:px-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-slate-900">{special.title}</p>
                        <p className="mt-0.5 text-sm text-slate-600">
                          {special.discountPct}% off ·{" "}
                          {special.product ? special.product.name : "All products"}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <StatusBadge
                          tone={
                            phase === "Live" ? "success" : phase === "Upcoming" ? "info" : "neutral"
                          }
                        >
                          {phase === "Expired" ? "Ended" : phase}
                        </StatusBadge>
                        {special.draft ? <StatusBadge tone="warning">Draft</StatusBadge> : null}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatWhen(special.startsAt)} to {formatWhen(special.endsAt)}
                    </p>
                    {special.description ? (
                      <p className="mt-1 text-sm text-slate-600">{special.description}</p>
                    ) : null}
                    <div className="-ml-3 mt-1 flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(special.id);
                          setForm(specialToForm(special));
                          setStatus(`Editing "${special.title}".`);
                        }}
                        className={dashButton.quiet}
                      >
                        <Pencil aria-hidden="true" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(special.id)}
                        className={cn(dashButton.quiet, "text-red-700 hover:bg-red-50")}
                      >
                        <Trash2 aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </DashCard>
      </div>
    </div>
  );
}
