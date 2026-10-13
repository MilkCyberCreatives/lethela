"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import DashCard from "./DashCard";
import { Notice, dashButton } from "@/components/dashboard/kit/ui";

// Plain names for the parts of the answer that come back from the tips service.
const TIP_LABELS: Record<string, string> = {
  "Price optimiser": "Prices",
  "Low-stock": "Low stock",
  "SEO vendor": "Store description",
  "Promo timing": "Best time for specials",
  "Daily summary": "Summary",
  "Alt text": "Photo descriptions",
};

function splitLine(line: string) {
  const text = line.replace(/^-\s*/, "");
  const colon = text.indexOf(":");
  const key = colon > 0 ? text.slice(0, colon).trim() : "";
  return TIP_LABELS[key]
    ? { label: TIP_LABELS[key], text: text.slice(colon + 1).trim() }
    : { label: null, text };
}

export default function AutomationsPanel() {
  const [out, setOut] = useState<string>("");

  const run = async () => {
    setOut("Running...");
    try {
      const response = await fetch("/api/vendors/automations/run", { method: "POST" });
      const json = await response.json().catch(() => ({}));
      if (response.ok && json.ok) {
        setOut((json.actions as string[]).map((action) => `- ${action}`).join("\n"));
      } else {
        setOut(`Error: ${json.error || `Request failed with status ${response.status}`}`);
      }
    } catch (error) {
      setOut(`Error: ${error instanceof Error ? error.message : "Unable to run automations"}`);
    }
  };

  const running = out === "Running...";

  return (
    <DashCard
      title="Selling tips"
      description="Ideas for your prices, specials and store description."
    >
      <button type="button" onClick={run} className={dashButton.primary}>
        <Lightbulb aria-hidden="true" />
        {running ? "Getting tips…" : "Get tips"}
      </button>
      <div aria-live="polite">
        {!out ? null : running ? (
          <p className="mt-4 text-sm text-slate-500">Working on it. This can take a minute.</p>
        ) : out.startsWith("Error:") ? (
          <Notice tone="danger" className="mt-4">
            {out.replace(/^Error:\s*/, "")}
          </Notice>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200/70 rounded-lg bg-slate-50 px-3">
            {out
              .split("\n")
              .filter((line) => line.trim())
              .map((line, index) => {
                const tip = splitLine(line);
                return (
                  <li key={index} className="py-2.5 text-sm leading-6 text-slate-700">
                    {tip.label ? (
                      <span className="font-semibold text-slate-900">{tip.label}: </span>
                    ) : null}
                    {tip.text}
                  </li>
                );
              })}
          </ul>
        )}
      </div>
    </DashCard>
  );
}
