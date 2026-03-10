"use client";

import { useState } from "react";
import DashCard from "./DashCard";

export default function AdvancedAutomationsPanel() {
  const [log, setLog] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function runAll() {
    setBusy(true);
    setLog("Running advanced automations...");
    try {
      const response = await fetch("/api/vendors/automations/run-advanced", { method: "POST" });
      const json = await response.json();
      if (json.ok) {
        setLog((json.results as string[]).map((line) => `- ${line}`).join("\n"));
      } else {
        setLog(`Error: ${json.error}`);
      }
    } catch (err: any) {
      setLog(`Error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashCard title="Advanced Automations">
      <p className="text-sm text-white/80">
        Run deep automations: stock safety, alcohol compliance, smart hours, promo drafting, upsell combos, late-order
        alerts, fraud signals, and daily health summaries.
      </p>

      <button
        onClick={runAll}
        disabled={busy}
        className="mt-3 rounded bg-lethela-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
      >
        {busy ? "Working..." : "Run advanced automations"}
      </button>

      {log ? (
        <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded border border-white/20 bg-white/5 p-3 text-xs text-white/80">
          {log}
        </pre>
      ) : null}

      <p className="mt-4 text-[11px] leading-relaxed text-white/50">
        Next step: optional auto-apply mode for suggested hours and customer outreach drafts.
      </p>
    </DashCard>
  );
}
