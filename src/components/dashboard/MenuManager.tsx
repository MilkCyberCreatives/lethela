"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  UtensilsCrossed,
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

type MenuItem = {
  id: string;
  vendorId: string;
  sectionId: string;
  name: string;
  description: string | null;
  priceCents: number;
  tags: string[];
  image: string | null;
  isAlcohol: boolean;
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
  isAlcohol: boolean;
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
  isAlcohol: false,
  draft: false,
};

// Status messages that report a finished action; anything else is shown as a problem.
const SUCCESS_MESSAGES = new Set([
  "Menu section updated.",
  "Menu section created.",
  "Menu item updated.",
  "Menu item created.",
  "Menu section deleted.",
  "Menu item deleted.",
  "Item published to your public menu.",
  "Item moved back to draft.",
]);

function itemToForm(item: MenuItem): ItemFormState {
  return {
    sectionId: item.sectionId,
    name: item.name,
    description: item.description || "",
    price: (item.priceCents / 100).toFixed(2),
    tags: item.tags.join(", "),
    image: item.image || "",
    isAlcohol: item.isAlcohol,
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
          : { ...current, sectionId: nextSections[0].id },
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
    const priceCents = Math.round(Number(itemForm.price.replace(",", ".") || "0") * 100);
    if (
      !itemForm.sectionId ||
      itemForm.name.trim().length < 2 ||
      !Number.isFinite(priceCents) ||
      priceCents < 100
    ) {
      setStatus(
        "Choose a section, enter an item name (at least 2 letters), and use a price of at least R1.",
      );
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
          isAlcohol: itemForm.isAlcohol,
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
          isAlcohol: item.isAlcohol,
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

  const noSections = !loading && sections.length === 0;
  const deleteButton = cn(dashButton.quiet, "text-red-700 hover:bg-red-50");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Menu items"
          value={loading ? "–" : summary.items}
          hint={
            loading
              ? undefined
              : `In ${summary.sections} section${summary.sections === 1 ? "" : "s"}`
          }
          icon={<UtensilsCrossed />}
        />
        <StatTile
          label="Published"
          value={loading ? "–" : summary.live}
          hint="Shown to customers"
          icon={<Eye />}
        />
        <StatTile
          label="Drafts"
          value={loading ? "–" : summary.drafts}
          hint="Hidden from customers"
          icon={<EyeOff />}
        />
        <StatTile
          label="Average price"
          value={loading ? "–" : summary.averagePrice ? formatMoney(summary.averagePrice) : "R0.00"}
          icon={<Tag />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:items-start">
        <DashCard title={editingItemId ? "Edit menu item" : "Add a menu item"}>
          <div className="space-y-4">
            <details
              className="rounded-lg bg-slate-50"
              open={noSections || editingSectionId !== null ? true : undefined}
            >
              <summary className="flex min-h-11 items-center gap-2 px-3 py-2.5 text-sm font-semibold text-slate-900">
                <ChevronRight
                  className="dash-summary-chevron h-4 w-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                {editingSectionId
                  ? "Rename section"
                  : noSections
                    ? "Add your first section"
                    : "Add a section"}
              </summary>
              <div className="px-3 pb-3">
                <p className="mb-2 text-xs text-slate-500">
                  Sections group your menu, for example Kota, Breakfast or Drinks.
                </p>
                <div className="flex gap-2">
                  <input
                    className={cn(dashField.input, "min-w-0 flex-1")}
                    aria-label="Section name"
                    placeholder="e.g. Breakfast, Kota, Drinks"
                    value={sectionForm.title}
                    onChange={(event) => setSectionForm({ title: event.target.value })}
                  />
                  <button
                    type="button"
                    onClick={saveSection}
                    disabled={busy}
                    className={cn(
                      noSections ? dashButton.primary : dashButton.secondary,
                      "shrink-0",
                    )}
                  >
                    {editingSectionId ? "Update" : "Add"}
                  </button>
                </div>
                {editingSectionId ? (
                  <button
                    type="button"
                    onClick={resetSectionForm}
                    className={cn(dashButton.quiet, "-ml-3 mt-1")}
                  >
                    Cancel section edit
                  </button>
                ) : null}
              </div>
            </details>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Section">
                <select
                  className={dashField.input}
                  value={itemForm.sectionId}
                  onChange={(event) =>
                    setItemForm((current) => ({ ...current, sectionId: event.target.value }))
                  }
                >
                  <option value="">Choose a section</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.title}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Item name">
                <input
                  className={dashField.input}
                  placeholder="e.g. Beef kota"
                  value={itemForm.name}
                  onChange={(event) =>
                    setItemForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </FormField>
              <FormField label="Price (R)">
                <input
                  className={dashField.input}
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 45.00"
                  value={itemForm.price}
                  onChange={(event) =>
                    setItemForm((current) => ({
                      ...current,
                      price: event.target.value.replace(/[^0-9.,]/g, ""),
                    }))
                  }
                />
              </FormField>
            </div>

            <details
              className="rounded-lg border border-slate-200"
              open={editingItemId ? true : undefined}
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
                <FormField label="Photo link">
                  <input
                    className={dashField.input}
                    placeholder="https://"
                    value={itemForm.image}
                    onChange={(event) =>
                      setItemForm((current) => ({ ...current, image: event.target.value }))
                    }
                  />
                </FormField>
                <FormField label="Description">
                  <textarea
                    className={dashField.input}
                    rows={3}
                    value={itemForm.description}
                    onChange={(event) =>
                      setItemForm((current) => ({ ...current, description: event.target.value }))
                    }
                  />
                </FormField>
                <FormField label="Tags">
                  <input
                    className={dashField.input}
                    placeholder="Comma separated, e.g. spicy, halaal"
                    value={itemForm.tags}
                    onChange={(event) =>
                      setItemForm((current) => ({ ...current, tags: event.target.value }))
                    }
                  />
                </FormField>
                <label className="flex items-start gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 accent-lethela-primary"
                    checked={itemForm.isAlcohol}
                    onChange={(event) =>
                      setItemForm((current) => ({ ...current, isAlcohol: event.target.checked }))
                    }
                  />
                  <span>
                    Liquor item (18+). Needs a verified liquor licence and a customer age check.
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 accent-lethela-primary"
                    checked={itemForm.draft}
                    onChange={(event) =>
                      setItemForm((current) => ({ ...current, draft: event.target.checked }))
                    }
                  />
                  <span>Save as draft (hidden from customers)</span>
                </label>
              </div>
            </details>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={saveItem}
                disabled={busy || sections.length === 0}
                className={cn(dashButton.primary, "flex-1 sm:flex-none")}
              >
                <Plus aria-hidden="true" />
                {editingItemId ? "Update item" : "Add item"}
              </button>
              <button type="button" onClick={() => resetItemForm()} className={dashButton.quiet}>
                {editingItemId ? "Cancel edit" : "Clear"}
              </button>
              {noSections ? (
                <span className="w-full text-sm text-amber-800">Add a section first.</span>
              ) : null}
            </div>

            {status ? (
              <Notice tone={SUCCESS_MESSAGES.has(status) ? "success" : "danger"}>{status}</Notice>
            ) : null}
          </div>
        </DashCard>

        <DashCard
          title="Your menu"
          description={
            loading
              ? undefined
              : `${summary.sections} section${summary.sections === 1 ? "" : "s"} · ${summary.items} item${summary.items === 1 ? "" : "s"}`
          }
          actions={
            <button type="button" onClick={() => void load()} className={dashButton.quiet}>
              <RefreshCw aria-hidden="true" />
              Refresh
            </button>
          }
        >
          {loading ? (
            <div className="grid animate-pulse gap-3" aria-hidden="true">
              <div className="h-20 rounded-lg bg-slate-100" />
              <div className="h-20 rounded-lg bg-slate-100" />
            </div>
          ) : sections.length === 0 ? (
            <EmptyState
              compact
              icon={<UtensilsCrossed />}
              title="No sections yet"
              text="Start with a section like Breakfast, Kota, Mogodu or Drinks, then add your items to it."
            />
          ) : (
            <div className="space-y-6">
              {sections.map((section) => (
                <section key={section.id}>
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <div className="min-w-0">
                      <h3 className="truncate text-[15px] font-semibold text-slate-900">
                        {section.title}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {section.items.length} item{section.items.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="-mr-2 flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSectionId(section.id);
                          setSectionForm({ title: section.title });
                        }}
                        className={dashButton.quiet}
                      >
                        <Pencil aria-hidden="true" />
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeSection(section.id)}
                        className={deleteButton}
                      >
                        <Trash2 aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </div>

                  {section.items.length === 0 ? (
                    <p className="mt-2 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-500">
                      No items in this section yet.
                    </p>
                  ) : (
                    <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                      {section.items.map((item) => (
                        <li key={item.id} className="px-3 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="break-words font-medium text-slate-900">{item.name}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <StatusBadge tone={item.draft ? "warning" : "success"}>
                                  {item.draft ? "Draft" : "Published"}
                                </StatusBadge>
                                {item.isAlcohol ? (
                                  <StatusBadge tone="neutral" dot={false}>
                                    18+
                                  </StatusBadge>
                                ) : null}
                              </div>
                            </div>
                            <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                              {formatMoney(item.priceCents)}
                            </span>
                          </div>
                          {item.description ? (
                            <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">
                              {item.description}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-slate-500">
                            {item.tags.length > 0 ? `${item.tags.join(", ")} · ` : ""}
                            Updated{" "}
                            {new Date(item.updatedAt).toLocaleString("en-ZA", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                          <div className="-ml-3 mt-1 flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItemId(item.id);
                                setItemForm(itemToForm(item));
                              }}
                              className={dashButton.quiet}
                            >
                              <Pencil aria-hidden="true" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void toggleDraft(item)}
                              className={dashButton.quiet}
                            >
                              {item.draft ? (
                                <Eye aria-hidden="true" />
                              ) : (
                                <EyeOff aria-hidden="true" />
                              )}
                              {item.draft ? "Publish" : "Move to draft"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void removeItem(item.id)}
                              className={deleteButton}
                            >
                              <Trash2 aria-hidden="true" />
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          )}
        </DashCard>
      </div>
    </div>
  );
}
