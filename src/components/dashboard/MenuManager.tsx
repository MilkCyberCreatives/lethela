"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashCard from "./DashCard";

type MenuItem = {
  id: string;
  vendorId: string;
  sectionId: string;
  name: string;
  description: string | null;
  priceCents: number;
  tags: string[];
  image: string | null;
  draft: boolean;
  updatedAt: string;
};

type MenuSection = {
  id: string;
  title: string;
  sortOrder: number;
  items: MenuItem[];
};

type SectionFormState = {
  title: string;
};

type ItemFormState = {
  sectionId: string;
  name: string;
  description: string;
  price: string;
  tags: string;
  image: string;
  draft: boolean;
};

const emptySection: SectionFormState = {
  title: "",
};

const emptyItem: ItemFormState = {
  sectionId: "",
  name: "",
  description: "",
  price: "",
  tags: "",
  image: "",
  draft: false,
};

function itemToForm(item: MenuItem): ItemFormState {
  return {
    sectionId: item.sectionId,
    name: item.name,
    description: item.description || "",
    price: (item.priceCents / 100).toFixed(2),
    tags: item.tags.join(", "),
    image: item.image || "",
    draft: item.draft,
  };
}

function formatMoney(cents: number) {
  return `R${(cents / 100).toFixed(2)}`;
}

export default function MenuManager() {
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [sectionForm, setSectionForm] = useState<SectionFormState>(emptySection);
  const [itemForm, setItemForm] = useState<ItemFormState>(emptyItem);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/vendors/menu", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to load menu.");
      }

      const nextSections: MenuSection[] = json.sections || [];
      setSections(nextSections);
      setItemForm((current) =>
        current.sectionId || nextSections.length === 0
          ? current
          : { ...current, sectionId: nextSections[0].id }
      );
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Failed to load menu.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function resetSectionForm() {
    setSectionForm(emptySection);
    setEditingSectionId(null);
  }

  function resetItemForm(defaultSectionId?: string) {
    setItemForm({
      ...emptyItem,
      sectionId: defaultSectionId || sections[0]?.id || "",
    });
    setEditingItemId(null);
  }

  async function saveSection() {
    if (!sectionForm.title.trim()) {
      setStatus("Enter a section name.");
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const endpoint = editingSectionId
        ? `/api/vendors/menu/sections/${editingSectionId}`
        : "/api/vendors/menu";
      const method = editingSectionId ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: sectionForm.title.trim() }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to save section.");
      }

      const preferredSectionId = editingSectionId || json.section?.id;
      resetSectionForm();
      await load();
      setItemForm((current) => ({
        ...current,
        sectionId: preferredSectionId || current.sectionId,
      }));
      setStatus(editingSectionId ? "Menu section updated." : "Menu section created.");
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Failed to save section.");
    } finally {
      setBusy(false);
    }
  }

  async function saveItem() {
    const priceCents = Math.round(Number(itemForm.price || "0") * 100);
    if (!itemForm.sectionId || !itemForm.name.trim() || !Number.isFinite(priceCents) || priceCents < 100) {
      setStatus("Choose a section, enter an item name, and use a price of at least R1.");
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const endpoint = editingItemId
        ? `/api/vendors/menu/items/${editingItemId}`
        : "/api/vendors/menu/items";
      const method = editingItemId ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sectionId: itemForm.sectionId,
          name: itemForm.name.trim(),
          description: itemForm.description.trim() || null,
          priceCents,
          tags: itemForm.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          image: itemForm.image.trim() || null,
          draft: itemForm.draft,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to save menu item.");
      }

      const currentSectionId = itemForm.sectionId;
      resetItemForm(currentSectionId);
      await load();
      setStatus(editingItemId ? "Menu item updated." : "Menu item created.");
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Failed to save menu item.");
    } finally {
      setBusy(false);
    }
  }

  async function removeSection(id: string) {
    if (!confirm("Delete this section and all of its items?")) {
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/vendors/menu/sections/${id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to delete section.");
      }

      if (editingSectionId === id) {
        resetSectionForm();
      }
      await load();
      resetItemForm();
      setStatus("Menu section deleted.");
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Failed to delete section.");
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(id: string) {
    if (!confirm("Delete this menu item?")) {
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/vendors/menu/items/${id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to delete menu item.");
      }

      if (editingItemId === id) {
        resetItemForm();
      }
      await load();
      setStatus("Menu item deleted.");
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Failed to delete menu item.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleDraft(item: MenuItem) {
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/vendors/menu/items/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sectionId: item.sectionId,
          name: item.name,
          description: item.description,
          priceCents: item.priceCents,
          tags: item.tags,
          image: item.image,
          draft: !item.draft,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to update publish state.");
      }

      await load();
      setStatus(item.draft ? "Item published to your public menu." : "Item moved back to draft.");
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Failed to update publish state.");
    } finally {
      setBusy(false);
    }
  }

  const summary = useMemo(() => {
    const items = sections.flatMap((section) => section.items);
    const live = items.filter((item) => !item.draft).length;
    const drafts = items.filter((item) => item.draft).length;
    const averagePrice = items.length
      ? Math.round(items.reduce((sum, item) => sum + item.priceCents, 0) / items.length)
      : 0;

    return {
      sections: sections.length,
      items: items.length,
      live,
      drafts,
      averagePrice,
    };
  }, [sections]);

  return (
    <DashCard title="Public Menu Manager">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-lethela-primary/15 bg-[linear-gradient(135deg,rgba(181,0,27,0.14),rgba(255,255,255,0.04))] px-4 py-4">
        <div>
          <div className="text-sm font-semibold text-white">This controls the customer-facing menu.</div>
          <p className="mt-1 text-xs text-white/70">
            Published items appear on your restaurant page. Draft items stay hidden until you are ready.
          </p>
        </div>
        <Link
          href="/vendors/dashboard?tab=overview"
          className="rounded-full border border-white/20 px-4 py-2 text-xs font-medium hover:border-lethela-primary hover:text-lethela-primary"
        >
          Back to overview
        </Link>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Sections" value={String(summary.sections)} />
        <SummaryCard label="Menu items" value={String(summary.items)} />
        <SummaryCard label="Published" value={String(summary.live)} />
        <SummaryCard label="Drafts" value={String(summary.drafts)} />
        <SummaryCard label="Avg price" value={summary.averagePrice ? formatMoney(summary.averagePrice) : "R0.00"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.92fr,1.08fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 text-sm font-semibold text-white">
              {editingSectionId ? "Edit section" : "Add section"}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded bg-white px-3 py-2 text-sm text-black"
                placeholder="Section name"
                value={sectionForm.title}
                onChange={(event) => setSectionForm({ title: event.target.value })}
              />
              <button
                type="button"
                onClick={saveSection}
                disabled={busy}
                className="rounded bg-lethela-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {editingSectionId ? "Update" : "Add"}
              </button>
            </div>
            {editingSectionId ? (
              <button
                type="button"
                onClick={resetSectionForm}
                className="mt-2 text-xs text-white/65 hover:text-white"
              >
                Cancel section edit
              </button>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-white">
                {editingItemId ? "Edit menu item" : "Add menu item"}
              </div>
              <button
                type="button"
                onClick={() => resetItemForm()}
                className="text-xs text-white/65 hover:text-white"
              >
                Reset
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="rounded bg-white px-3 py-2 text-sm text-black"
                value={itemForm.sectionId}
                onChange={(event) =>
                  setItemForm((current) => ({ ...current, sectionId: event.target.value }))
                }
              >
                <option value="">Select section</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                  </option>
                ))}
              </select>
              <input
                className="rounded bg-white px-3 py-2 text-sm text-black"
                placeholder="Item name"
                value={itemForm.name}
                onChange={(event) =>
                  setItemForm((current) => ({ ...current, name: event.target.value }))
                }
              />
              <input
                className="rounded bg-white px-3 py-2 text-sm text-black"
                placeholder="Price in rand"
                type="number"
                min="1"
                step="0.01"
                value={itemForm.price}
                onChange={(event) =>
                  setItemForm((current) => ({ ...current, price: event.target.value }))
                }
              />
              <input
                className="rounded bg-white px-3 py-2 text-sm text-black"
                placeholder="Tags (comma separated)"
                value={itemForm.tags}
                onChange={(event) =>
                  setItemForm((current) => ({ ...current, tags: event.target.value }))
                }
              />
              <input
                className="rounded bg-white px-3 py-2 text-sm text-black md:col-span-2"
                placeholder="Image URL"
                value={itemForm.image}
                onChange={(event) =>
                  setItemForm((current) => ({ ...current, image: event.target.value }))
                }
              />
              <textarea
                className="rounded bg-white px-3 py-2 text-sm text-black md:col-span-2"
                placeholder="Description"
                rows={3}
                value={itemForm.description}
                onChange={(event) =>
                  setItemForm((current) => ({ ...current, description: event.target.value }))
                }
              />
              <label className="flex items-center gap-2 text-sm text-white/80 md:col-span-2">
                <input
                  type="checkbox"
                  checked={itemForm.draft}
                  onChange={(event) =>
                    setItemForm((current) => ({ ...current, draft: event.target.checked }))
                  }
                />
                Save as draft
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={saveItem}
                disabled={busy || sections.length === 0}
                className="rounded bg-lethela-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {editingItemId ? "Update item" : "Add item"}
              </button>
              {sections.length === 0 ? (
                <span className="text-xs text-amber-100/80">Create a section first.</span>
              ) : null}
            </div>
          </div>

          {status ? (
            <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3 text-sm text-white/80">
              {status}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-white">Sections and items</div>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded border border-white/20 px-3 py-2 text-xs transition-colors hover:border-lethela-primary hover:text-lethela-primary"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-sm text-white/70">Loading menu...</div>
          ) : sections.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-black/10 px-4 py-6 text-sm text-white/70">
              No menu sections yet. Start with a section like Breakfast, Kota, Mogodu, Drinks, or Specials.
            </div>
          ) : (
            <div className="space-y-4">
              {sections.map((section) => (
                <div key={section.id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-white">{section.title}</div>
                      <div className="mt-1 text-xs text-white/60">
                        {section.items.length} item(s) in this section
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSectionId(section.id);
                          setSectionForm({ title: section.title });
                        }}
                        className="rounded border border-white/20 px-3 py-2 text-xs hover:border-lethela-primary hover:text-lethela-primary"
                      >
                        Edit section
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeSection(section.id)}
                        className="rounded border border-white/20 px-3 py-2 text-xs hover:border-red-300 hover:text-red-200"
                      >
                        Delete section
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-3">
                    {section.items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/15 px-3 py-4 text-sm text-white/60">
                        No items in this section yet.
                      </div>
                    ) : (
                      section.items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-white">{item.name}</span>
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                    item.draft
                                      ? "border-amber-200/20 bg-amber-300/10 text-amber-100"
                                      : "border-emerald-200/20 bg-emerald-300/10 text-emerald-100"
                                  }`}
                                >
                                  {item.draft ? "Draft" : "Published"}
                                </span>
                              </div>
                              {item.description ? (
                                <p className="mt-1 text-sm text-white/72">{item.description}</p>
                              ) : null}
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/60">
                                <span>{formatMoney(item.priceCents)}</span>
                                {item.tags.length > 0 ? <span>| {item.tags.join(", ")}</span> : null}
                                <span>| Updated {new Date(item.updatedAt).toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemId(item.id);
                                  setItemForm(itemToForm(item));
                                }}
                                className="rounded border border-white/20 px-3 py-2 text-xs hover:border-lethela-primary hover:text-lethela-primary"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void toggleDraft(item)}
                                className="rounded border border-white/20 px-3 py-2 text-xs hover:border-lethela-primary hover:text-lethela-primary"
                              >
                                {item.draft ? "Publish" : "Move to draft"}
                              </button>
                              <button
                                type="button"
                                onClick={() => void removeItem(item.id)}
                                className="rounded border border-white/20 px-3 py-2 text-xs hover:border-red-300 hover:text-red-200"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashCard>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
      <div className="text-xs uppercase tracking-[0.12em] text-white/60">{label}</div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}
