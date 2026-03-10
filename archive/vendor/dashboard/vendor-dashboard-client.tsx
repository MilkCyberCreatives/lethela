// /src/app/vendor/dashboard/vendor-dashboard-client.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Papa from "papaparse";

type Vendor = {
  id: string;
  slug: string;
  name: string;
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
  suburb: string;
  kycIdUrl?: string | null;
  kycProofUrl?: string | null;
};

export default function VendorDashboardClient({ vendor }: { vendor: Vendor }) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);

  async function uploadKyc(kind: "id" | "proof") {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("path", `vendors/${vendor.id}/kyc/${Date.now()}-${kind}-${file.name}`);
        const res = await fetch("/api/storage/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json?.error || "Upload failed");
        alert(`Uploaded ${kind.toUpperCase()}: ${json.url}`);
      } catch (e: any) {
        alert(e.message || "Upload error");
      } finally {
        setUploading(false);
      }
    };
    input.click();
  }

  function parseCsv(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => resolve(res.data as any[]),
        error: reject
      });
    });
  }

  async function importCsv() {
    if (!csvFile) { alert("Choose a CSV first"); return; }
    setImporting(true);
    try {
      const rows = await parseCsv(csvFile);
      // expected columns: section, name, description, price, tags (comma), image(optional)
      const payload = rows.map((r) => ({
        section: String(r.section || "Menu").trim(),
        name: String(r.name || "").trim(),
        description: r.description ? String(r.description) : null,
        price: Number(String(r.price || "0").replace(/[^0-9.]/g, "")),
        tags: String(r.tags || "").split(",").map((s)=>s.trim()).filter(Boolean),
        image: r.image ? String(r.image) : null
      })).filter((r) => r.name && Number.isFinite(r.price) && r.price > 0);

      const res = await fetch("/api/vendor/menu/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vendorId: vendor.id, rows: payload })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || "Import failed");
      alert(`Imported ${json.count} items as drafts`);
    } catch (e: any) {
      alert(e.message || "Failed to import");
    } finally {
      setImporting(false);
    }
  }

  return (
    <main className="container py-10">
      <h1 className="text-2xl font-bold">Vendor dashboard</h1>
      <p className="mt-1 text-white/70">{vendor.name} • <span className="uppercase">{vendor.status}</span> • {vendor.suburb}</p>

      <section className="mt-6 rounded-lg border border-white/10 p-4">
        <h2 className="text-lg font-semibold">KYC documents</h2>
        <div className="mt-3 flex gap-3">
          <Button className="bg-lethela-primary" disabled={uploading} onClick={()=>uploadKyc("id")}>
            {uploading ? "Uploading..." : "Upload ID"}
          </Button>
          <Button variant="outline" className="border-white/20" disabled={uploading} onClick={()=>uploadKyc("proof")}>
            Upload Proof of Address
          </Button>
        </div>
        <p className="mt-2 text-xs text-white/60">We’ll verify and activate your account.</p>
      </section>

      <section className="mt-6 rounded-lg border border-white/10 p-4">
        <h2 className="text-lg font-semibold">Menu import (CSV → draft)</h2>
        <p className="mt-1 text-sm text-white/70">Columns: <code>section,name,description,price,tags,image</code></p>
        <input
          type="file"
          accept=".csv"
          className="mt-3 block text-sm"
          onChange={(e)=>setCsvFile(e.target.files?.[0] || null)}
        />
        <div className="mt-3 flex gap-3">
          <Button className="bg-lethela-primary" disabled={importing} onClick={importCsv}>
            {importing ? "Importing..." : "Import CSV as Draft"}
          </Button>
        </div>
      </section>
    </main>
  );
}
