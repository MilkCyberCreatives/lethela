// /components/LocationPicker.tsx
"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LocationPicker() {
  const [suburb, setSuburb] = useState("");

  useEffect(() => {
    const cookie = Cookies.get("lethela_suburb");
    if (cookie) {
      setSuburb(cookie);
      return;
    }
    const saved = typeof window !== "undefined" ? localStorage.getItem("lethela_suburb") : null;
    if (saved) setSuburb(saved);
  }, []);

  const save = () => {
    if (!suburb) return;
    Cookies.set("lethela_suburb", suburb, { expires: 90, sameSite: "lax" });
    try {
      localStorage.setItem("lethela_suburb", suburb);
    } catch {}
    alert(`Saved location: ${suburb}`);
    // Optional: trigger a reload so server components read the new cookie
    window.location.reload();
  };

  return (
    <div className="flex w-full max-w-md items-center gap-2">
      <Input
        placeholder="Enter suburb or area (e.g., Sandton)"
        value={suburb}
        onChange={(e) => setSuburb(e.target.value)}
        className="bg-white text-black"
      />
      <Button onClick={save} className="bg-lethela-primary hover:opacity-90">
        Save
      </Button>
    </div>
  );
}
