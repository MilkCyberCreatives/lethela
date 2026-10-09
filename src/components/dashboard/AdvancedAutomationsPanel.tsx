"use client";

import { useState } from "react";
import { Wrench } from "lucide-react";
import DashCard from "./DashCard";
import { Notice, dashButton } from "@/components/dashboard/kit/ui";

// Plain names for the parts of the answer that come back from the store checks.
const CHECK_LABELS: Record<string, string> = {
  "Auto-stock monitor": "Stock",
  "Alcohol compliance": "Alcohol items",
  "Hours suggestion (review before applying)": "Suggested hours (check first)",
  "Promo heatmap": "Specials",
  "Upsell recommender": "Add-on ideas",
  "Late order alert": "Late orders",
  "Fraud monitor": "Cancelled orders",
  "Daily health": "Today",
};

function splitLine(line: string) {
  const text = line.replace(/^-\s*/, "");
  const colon = text.indexOf(":");
  const key = colon > 0 ? text.slice(0, colon).trim() : "";
  return CHECK_LABELS[key]
    ? { label: CHECK_LABELS[key], text: text.slice(colon + 1).trim() }
    : { label: null, text };
}

export default function AdvancedAutomationsPanel() {
  const [log, setLog] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function runAll() {
    setBusy(true);
    setLog("Running advanced automations...");
    try {
      const response = await fetch("/api/vendors/automations/run-advanced", { method: "POST" });
      const json = await response.json().catch(() => ({}));
      if (response.ok && json.ok) {
        setLog((json.results as string[]).map((line) => `- ${line}`).join("\n"));
      } else {
        setLog(`Error: ${json.error || `Request failed with status ${response.status}`}`);
      }
    } catch (err: any) {
      setLog(`Error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashCard
      title="More tools"
      description="Check your stock, trading hours and late orders, and draft a special for your quietest day."
    >
      <button type="button" onClick={runAll} disabled={busy} className={dashButton.secondary}>
        <Wrench aria-hidden="true" />
        {busy ? "Checking…" : "Run checks"}
      </button>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Items with no price may be marked out of stock. New specials stay as drafts until you
        publish them.
      </p>
      <div aria-live="polite">
        {!log ? null : busy ? (
          <p className="mt-4 text-sm text-slate-500">Working on it. This can take a minute.</p>
        ) : log.startsWith("Error:") ? (
          <Notice tone="danger" className="mt-4">
            {log.replace(/^Error:\s*/, "")}
          </Notice>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200/70 rounded-lg bg-slate-50 px-3 sm:max-h-80 sm:overflow-y-auto">
            {log
              .split("\n")
              .filter((line) => line.trim())
              .map((line, index) => {
                const check = splitLine(line);
                return (
                  <li key={index} className="py-2.5 text-sm leading-6 text-slate-700">
                    {check.label ? (
                      <span className="font-semibold text-slate-900">{check.label}: </span>
                    ) : null}
                    {check.text}
                  </li>
                );
              })}
          </ul>
        )}
      </div>
    </DashCard>
  );
}
