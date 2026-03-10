"use client";

import { useState } from "react";
import DashCard from "./DashCard";

export default function AutomationsPanel() {
  const [out, setOut] = useState<string>("");

  const run = async () => {
    setOut("Running...");
    const response = await fetch("/api/vendors/automations/run", { method: "POST" });
    const json = await response.json();
    if (json.ok) {
      setOut((json.actions as string[]).map((action) => `- ${action}`).join("\n"));
    } else {
      setOut(`Error: ${json.error}`);
    }
  };

  return (
    <DashCard title="Automations">
      <p className="text-sm text-white/80">Run AI-powered business automations on demand.</p>
      <button onClick={run} className="mt-2 rounded bg-lethela-primary px-3 py-2 text-sm">
        Run automations now
      </button>
      {out ? (
        <pre className="mt-2 whitespace-pre-wrap rounded border border-white/10 bg-white/5 p-2 text-xs">{out}</pre>
      ) : null}
    </DashCard>
  );
}
