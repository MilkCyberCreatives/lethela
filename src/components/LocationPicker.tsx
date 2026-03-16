// /components/LocationPicker.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { persistPreferredSuburb, readPreferredSuburb } from "@/lib/location-preference";

type LocationPickerProps = {
  className?: string;
  onSaved?: (suburb: string) => void;
};

export default function LocationPicker({ className, onSaved }: LocationPickerProps) {
  const [suburb, setSuburb] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const saved = readPreferredSuburb();
    if (saved) setSuburb(saved);
  }, []);

  const save = () => {
    const savedSuburb = persistPreferredSuburb(suburb);
    if (!savedSuburb) return;
    setMessage(`Showing options for ${savedSuburb}.`);
    onSaved?.(savedSuburb);
    router.refresh();
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
        <Button onClick={save} className="bg-lethela-primary hover:opacity-90" disabled={!suburb.trim()}>
          Save
        </Button>
      </div>
      {message ? <p className="mt-2 text-xs text-white/70">{message}</p> : null}
    </div>
  );
}
