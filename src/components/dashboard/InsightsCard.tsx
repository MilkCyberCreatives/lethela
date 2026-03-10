"use client";

import { useEffect, useState } from "react";
import DashCard from "./DashCard";

export default function InsightsCard() {
  const [text, setText] = useState<string>("Generating insights...");

  useEffect(() => {
    let ignore = false;

    async function run() {
      try {
        const response = await fetch("/api/ai/vendor/insights", { cache: "no-store" });
        const json = await response.json();
        if (!ignore) {
          setText(json?.summary || "No insights yet.");
        }
      } catch {
        if (!ignore) {
          setText("No insights yet.");
        }
      }
    }

    void run();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <DashCard title="AI Insights">
      <div className="whitespace-pre-wrap text-sm text-white/90">{text}</div>
    </DashCard>
  );
}
