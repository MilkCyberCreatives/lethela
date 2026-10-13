"use client";

import { useEffect, useState } from "react";
import { Copy, RefreshCw, RotateCcw } from "lucide-react";
import DashCard from "./DashCard";
import { Notice, dashButton, dashField } from "@/components/dashboard/kit/ui";
import { cn } from "@/lib/utils";

type Hour = { day: number; openMin: number; closeMin: number; closed: boolean };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Shown Monday first; the saved list keeps its Sunday-first order.
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const defaultHour = { openMin: 540, closeMin: 1260, closed: false };

const SAVED_MESSAGE = "Trading hours saved.";
const COPIED_MESSAGE = "Monday's hours copied to Tuesday to Friday. Tap Save hours to keep them.";
const RESET_MESSAGE = "All days set to 09:00–21:00. Tap Save hours to keep them.";

function toTime(min: number) {
  const hours = String(Math.floor(min / 60)).padStart(2, "0");
  const minutes = String(min % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function parseTime(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 0;

  const hours = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const minutes = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  return hours * 60 + minutes;
}

function buildHoursList(source: Hour[]) {
  const map = new Map<number, Hour>(source.map((hour) => [hour.day, hour]));
  const list: Hour[] = [];
  for (let day = 0; day < 7; day += 1) {
    list.push(map.get(day) || { day, ...defaultHour });
  }
  return list;
}

export default function OperatingHours() {
  const [hours, setHours] = useState<Hour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/vendors/hours", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to load hours.");
      }

      setHours(buildHoursList(json.hours || []));
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Failed to load hours.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    const invalid = hours.find((hour) => !hour.closed && hour.closeMin <= hour.openMin);
    if (invalid) {
      setStatus(`Closing time must be later than opening time for ${DAYS[invalid.day]}.`);
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/vendors/hours", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hours }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to save hours.");
      }

      setStatus(SAVED_MESSAGE);
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Failed to save hours.");
    } finally {
      setSaving(false);
    }
  }

  function applyWeekdayTemplate() {
    setHours((current) => {
      const monday = current.find((hour) => hour.day === 1) || { day: 1, ...defaultHour };
      return current.map((hour) =>
        hour.day >= 1 && hour.day <= 5
          ? { ...hour, openMin: monday.openMin, closeMin: monday.closeMin, closed: monday.closed }
          : hour,
      );
    });
    setStatus(COPIED_MESSAGE);
  }

  function applyEverydayTemplate() {
    setHours((current) => current.map((hour) => ({ ...hour, ...defaultHour })));
    setStatus(RESET_MESSAGE);
  }

  if (loading) {
    return (
      <DashCard title="Weekly hours" className="max-w-3xl">
        <div className="grid gap-3" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </DashCard>
    );
  }

  const statusTone =
    status === SAVED_MESSAGE
      ? "success"
      : status === COPIED_MESSAGE || status === RESET_MESSAGE
        ? "info"
        : "danger";

  const openDays = hours.filter((hour) => !hour.closed).length;
  const openSummary =
    openDays === 7
      ? "Open every day"
      : openDays === 0
        ? "Closed every day"
        : `Open ${openDays} day${openDays === 1 ? "" : "s"} a week`;

  return (
    <DashCard
      title="Weekly hours"
      description={openSummary}
      className="max-w-3xl"
      actions={
        <button type="button" onClick={() => void load()} className={dashButton.quiet}>
          <RefreshCw aria-hidden="true" />
          Refresh
        </button>
      }
    >
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={applyWeekdayTemplate} className={dashButton.secondary}>
          <Copy aria-hidden="true" />
          Copy Monday to weekdays
        </button>
        <button type="button" onClick={applyEverydayTemplate} className={dashButton.quiet}>
          <RotateCcw aria-hidden="true" />
          Reset all days to 09:00–21:00
        </button>
      </div>

      <ul className="mt-4 divide-y divide-slate-100 border-y border-slate-100">
        {DISPLAY_ORDER.map((day) => {
          const index = hours.findIndex((item) => item.day === day);
          const hour = hours[index];
          if (!hour) return null;

          return (
            <li
              key={hour.day}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3 sm:grid-cols-[7rem_7rem_minmax(0,1fr)]"
            >
              <span className="text-sm font-semibold text-slate-900">{DAY_NAMES[hour.day]}</span>
              <label className="inline-flex min-h-10 items-center gap-2 justify-self-end text-sm text-slate-700 sm:justify-self-start">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-lethela-primary"
                  checked={hour.closed}
                  onChange={(event) =>
                    setHours((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, closed: event.target.checked } : item,
                      ),
                    )
                  }
                />
                Closed
              </label>
              <div className="col-span-2 sm:col-span-1">
                {!hour.closed ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      aria-label={`${DAY_NAMES[hour.day]} opening time`}
                      className={cn(dashField.input, "min-w-0 flex-1 tabular-nums sm:max-w-36")}
                      value={toTime(hour.openMin)}
                      onChange={(event) =>
                        setHours((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, openMin: parseTime(event.target.value) }
                              : item,
                          ),
                        )
                      }
                    />
                    <span className="shrink-0 text-sm text-slate-500">to</span>
                    <input
                      type="time"
                      aria-label={`${DAY_NAMES[hour.day]} closing time`}
                      className={cn(dashField.input, "min-w-0 flex-1 tabular-nums sm:max-w-36")}
                      value={toTime(hour.closeMin)}
                      onChange={(event) =>
                        setHours((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, closeMin: parseTime(event.target.value) }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Closed all day</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 space-y-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className={cn(dashButton.primary, "w-full sm:w-auto")}
        >
          {saving ? "Saving..." : "Save hours"}
        </button>
        {status ? <Notice tone={statusTone}>{status}</Notice> : null}
      </div>
    </DashCard>
  );
}
