"use client";

import { useEffect, useState } from "react";
import DashCard from "./DashCard";

type Hour = { day: number; openMin: number; closeMin: number; closed: boolean };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const defaultHour = { openMin: 540, closeMin: 1260, closed: false };

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

      setStatus("Operating hours saved.");
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
          : hour
      );
    });
    setStatus("Applied Monday settings to weekdays.");
  }

  function applyEverydayTemplate() {
    setHours((current) => current.map((hour) => ({ ...hour, ...defaultHour })));
    setStatus("Reset all days to the default 09:00 - 21:00 schedule.");
  }

  if (loading) {
    return <DashCard title="Operating Hours">Loading...</DashCard>;
  }

  return (
    <DashCard title="Operating Hours">
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={applyWeekdayTemplate}
          className="rounded border border-white/20 px-3 py-2 text-xs transition-colors hover:border-lethela-primary hover:text-lethela-primary"
        >
          Copy Monday to weekdays
        </button>
        <button
          type="button"
          onClick={applyEverydayTemplate}
          className="rounded border border-white/20 px-3 py-2 text-xs transition-colors hover:border-lethela-primary hover:text-lethela-primary"
        >
          Reset default hours
        </button>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded border border-white/20 px-3 py-2 text-xs transition-colors hover:border-lethela-primary hover:text-lethela-primary"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-2">
        {hours.map((hour, index) => (
          <div key={hour.day} className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-3">
            <div className="w-10 text-sm font-medium">{DAYS[hour.day]}</div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hour.closed}
                onChange={(event) =>
                  setHours((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, closed: event.target.checked } : item
                    )
                  )
                }
              />
              <span className="text-sm">Closed</span>
            </label>
            {!hour.closed ? (
              <>
                <input
                  className="rounded bg-white px-2 py-1 text-sm text-black"
                  value={toTime(hour.openMin)}
                  onChange={(event) =>
                    setHours((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, openMin: parseTime(event.target.value) } : item
                      )
                    )
                  }
                />
                <span className="text-sm">to</span>
                <input
                  className="rounded bg-white px-2 py-1 text-sm text-black"
                  value={toTime(hour.closeMin)}
                  onChange={(event) =>
                    setHours((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, closeMin: parseTime(event.target.value) } : item
                      )
                    )
                  }
                />
              </>
            ) : (
              <span className="text-xs text-white/60">No trading hours set for this day.</span>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-3 rounded bg-lethela-primary px-3 py-2 text-sm text-white disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save hours"}
      </button>

      {status ? <p className="mt-3 text-xs text-white/75">{status}</p> : null}
    </DashCard>
  );
}
