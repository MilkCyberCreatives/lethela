"use client";

import { useMemo, useState } from "react";
import { ChevronRight, FileSpreadsheet, Upload } from "lucide-react";
import { dashButton, dashField } from "@/components/dashboard/kit/ui";
import { cn } from "@/lib/utils";

type Row = {
  name: string;
  slug: string;
  description?: string;
  price?: number;
  image?: string;
  isAlcohol?: boolean;
};

// Starts with the column names only. The example rows are a placeholder, so pressing Import
// straight away never adds sample products to a real store.
const headerRow = "name,slug,description,price,image,isAlcohol\n";
const exampleCsv = `name,slug,description,price,image,isAlcohol
Beef kota,beef-kota,Quarter loaf with chips and polony,45,,false
Chicken wings (6),chicken-wings-6,,60,,false`;

function parse(text: string): Row[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    const get = (name: string) => values[headers.indexOf(name)] || "";
    return {
      name: get("name"),
      slug: get("slug"),
      description: get("description") || "",
      price: Number(get("price") || 0),
      image: get("image") || "",
      isAlcohol: get("isAlcohol").toLowerCase() === "true",
    };
  });
}

export default function BulkImportProducts() {
  const [csv, setCsv] = useState(headerRow);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string>("");

  const previewCount = useMemo(
    () => parse(csv).filter((row) => row.name && row.slug).length,
    [csv],
  );

  async function importRows() {
    setBusy(true);
    setLog("Starting import...\n");

    try {
      const rows = parse(csv).filter((row) => row.name && row.slug);
      if (rows.length === 0) {
        throw new Error("No valid rows found. Ensure name and slug are present.");
      }

      for (const row of rows) {
        let description = String(row.description || "").trim();
        if (!description) {
          const describeResponse = await fetch("/api/ai/vendor/describe", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: row.name }),
          });
          const describeJson = await describeResponse.json();
          description = describeJson?.description || "";
        }

        // Keep the vendor's own price. Only ask for a suggestion when the row has none.
        let priceCents = Math.round(Number(row.price || 0) * 100);
        if (priceCents < 100) {
          const priceResponse = await fetch("/api/ai/vendor/price", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: row.name, description, currentPriceCents: 0 }),
          });
          const priceJson = await priceResponse.json().catch(() => ({}));
          priceCents = Number(priceJson?.suggestedPriceCents || 0);
        }
        if (priceCents < 100) {
          setLog((current) => `${current}Skipped ${row.name}: add a price of at least R1.\n`);
          continue;
        }

        const createResponse = await fetch("/api/vendor/products", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: String(row.name).trim(),
            slug: String(row.slug).trim().toLowerCase(),
            description,
            priceCents,
            image: row.image || null,
            isAlcohol: Boolean(row.isAlcohol),
            inStock: true,
          }),
        });
        const createJson = await createResponse.json();
        setLog(
          (current) =>
            `${current}Imported ${row.name}: ${createJson.ok ? "ok" : createJson.error}\n`,
        );
      }
      setLog((current) => `${current}Import completed.`);
    } catch (error: any) {
      setLog((current) => `${current}Error: ${error.message}\n`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="min-w-0 rounded-xl border border-slate-200 bg-white">
      <summary className="flex min-h-14 items-center gap-3 px-4 py-3.5 sm:px-5">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"
          aria-hidden="true"
        >
          <FileSpreadsheet className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-slate-900">
            Import items from a spreadsheet
          </span>
          <span className="mt-0.5 block text-sm leading-5 text-slate-500">
            Add many products at once from a CSV file.
          </span>
        </span>
        <ChevronRight
          className="dash-summary-chevron h-5 w-5 shrink-0 text-slate-400"
          aria-hidden="true"
        />
      </summary>

      <div className="space-y-3 border-t border-slate-100 p-4 sm:p-5">
        <div className="grid gap-1.5">
          <label htmlFor="bulk-import-csv" className={dashField.label}>
            Rows to import
          </label>
          <p className={dashField.hint}>
            Paste rows from your spreadsheet. The first row must list these columns: name, slug,
            description, price, image, isAlcohol
          </p>
          <textarea
            id="bulk-import-csv"
            className={cn(dashField.input, "h-40 font-mono text-xs leading-5")}
            value={csv}
            placeholder={exampleCsv}
            onChange={(event) => setCsv(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={importRows}
            disabled={busy}
            className={cn(dashButton.primary, "flex-1 sm:flex-none")}
          >
            <Upload aria-hidden="true" />
            {busy ? "Importing..." : "Import"}
          </button>
          <span className="text-sm text-slate-500">
            {previewCount} row{previewCount === 1 ? "" : "s"} ready
          </span>
        </div>
        {log ? (
          <pre
            className="max-h-44 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-mono text-xs leading-5 text-slate-700"
            aria-live="polite"
          >
            {log}
          </pre>
        ) : null}
      </div>
    </details>
  );
}
