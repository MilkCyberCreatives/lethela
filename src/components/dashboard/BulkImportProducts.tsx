"use client";

import { useMemo, useState } from "react";
import DashCard from "./DashCard";

type Row = {
  name: string;
  slug: string;
  description?: string;
  price?: number;
  image?: string;
  isAlcohol?: boolean;
};

const seedCsv = `name,slug,description,price,image,isAlcohol
Burger Deluxe,burger-deluxe,Beef burger with cheese,89,,false
Cape Dry Cider 6-pack,cape-dry-cider,,129,,true
`;

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
  const [csv, setCsv] = useState(seedCsv);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string>("");

  const previewCount = useMemo(() => parse(csv).filter((row) => row.name && row.slug).length, [csv]);

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

        let priceCents = Math.round(Number(row.price || 99) * 100);
        const priceResponse = await fetch("/api/ai/vendor/price", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: row.name,
            description,
            currentPriceCents: priceCents,
          }),
        });
        const priceJson = await priceResponse.json();
        priceCents = Number(priceJson?.suggestedPriceCents || priceCents);

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
        setLog((current) => `${current}Imported ${row.name}: ${createJson.ok ? "ok" : createJson.error}\n`);
      }
      setLog((current) => `${current}Import completed.`);
    } catch (error: any) {
      setLog((current) => `${current}Error: ${error.message}\n`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashCard title="Bulk Import (CSV)">
      <p className="mb-2 text-xs text-white/70">Columns: name, slug, description, price, image, isAlcohol</p>
      <textarea
        className="h-40 w-full rounded bg-white p-2 text-sm text-black"
        value={csv}
        onChange={(event) => setCsv(event.target.value)}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={importRows}
          disabled={busy}
          className="rounded bg-lethela-primary px-3 py-2 text-sm disabled:opacity-60"
        >
          {busy ? "Importing..." : "Import"}
        </button>
        <span className="text-xs text-white/70">{previewCount} row(s) ready</span>
      </div>
      {log ? (
        <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded border border-white/10 bg-white/5 p-2 text-xs">
          {log}
        </pre>
      ) : null}
    </DashCard>
  );
}
