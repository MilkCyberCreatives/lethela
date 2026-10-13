"use client";

import { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";
import DashCard from "./DashCard";

const LOADING_TEXT = "Generating insights...";
const EMPTY_TEXT = "No insights yet.";

export default function InsightsCard() {
  const [text, setText] = useState<string>(LOADING_TEXT);

  useEffect(() => {
    let ignore = false;

    async function run() {
      try {
        const response = await fetch("/api/ai/vendor/insights", { cache: "no-store" });
        const json = await response.json();
        if (!ignore) {
          setText(json?.summary || EMPTY_TEXT);
        }
      } catch {
        if (!ignore) {
          setText(EMPTY_TEXT);
        }
      }
    }

    void run();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <DashCard title="Insights">
      {text === LOADING_TEXT ? (
        <div className="grid animate-pulse gap-2" aria-hidden="true">
          <div className="h-4 w-2/3 rounded bg-slate-100" />
          <div className="h-4 w-1/2 rounded bg-slate-100" />
        </div>
      ) : text === EMPTY_TEXT ? (
        <p className="flex items-center gap-3 text-sm text-slate-500">
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"
            aria-hidden="true"
          >
            <Lightbulb className="h-4 w-4" />
          </span>
          No insights yet. For ideas now, use Get tips above.
        </p>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{text}</p>
      )}
    </DashCard>
  );
}
