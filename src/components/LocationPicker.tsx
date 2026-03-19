// /components/LocationPicker.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { persistPreferredLocation, readPreferredSuburb } from "@/lib/location-preference";

type LocationPickerProps = {
  className?: string;
  onSaved?: (suburb: string) => void;
};

export default function LocationPicker({ className, onSaved }: LocationPickerProps) {
  const [suburb, setSuburb] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const saved = readPreferredSuburb();
    if (saved) setSuburb(saved);
  }, []);

  const save = async () => {
    const query = suburb.trim();
    if (!query) return;

    setSaving(true);
    setMessage(null);

    try {
      const pointResponse = await fetch(`/api/maps/geocode?q=${encodeURIComponent(query)}`, { cache: "no-store" });

      const pointJson = await pointResponse.json().catch(() => ({}));
      let label = query;
      let suburbName = query;
      let cityName = "";

      if (pointResponse.ok && pointJson?.ok && pointJson?.point) {
        const reverseResponse = await fetch(
          `/api/maps/reverse-geocode?lat=${pointJson.point.lat}&lng=${pointJson.point.lng}`,
          { cache: "no-store" }
        );
        const reverseJson = await reverseResponse.json().catch(() => ({}));
        if (reverseResponse.ok && reverseJson?.ok) {
          suburbName = String(reverseJson.suburb || query).trim();
          cityName = String(reverseJson.city || "").trim();
          label = [suburbName, cityName].filter(Boolean).join(", ") || suburbName;
        }

        const saved = persistPreferredLocation({
          label,
          suburb: suburbName,
          city: cityName,
          lat: Number(pointJson.point.lat),
          lng: Number(pointJson.point.lng),
          source: "manual",
        });
        if (!saved) {
          setMessage("We could not save that area. Please try again.");
          return;
        }

        setSuburb(saved.label);
        setMessage(`Showing options for ${saved.label}.`);
        onSaved?.(saved.label);
        router.refresh();
        return;
      }

      const saved = persistPreferredLocation({ label: query, suburb: query, source: "manual" });
      if (!saved) return;
      setSuburb(saved.label);
      setMessage(`Showing options for ${saved.label}.`);
      onSaved?.(saved.label);
      router.refresh();
    } catch {
      setMessage("We could not verify that area right now. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn("w-full max-w-md", className)}>
      <div className="flex items-center gap-2">
        <Input
          placeholder="Enter suburb or area (e.g., Sandton)"
          value={suburb}
          onChange={(e) => setSuburb(e.target.value)}
          className="bg-white text-black"
        />
        <Button onClick={() => void save()} className="bg-lethela-primary hover:opacity-90" disabled={!suburb.trim() || saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
      {message ? <p className="mt-2 text-xs text-white/70">{message}</p> : null}
    </div>
  );
}
