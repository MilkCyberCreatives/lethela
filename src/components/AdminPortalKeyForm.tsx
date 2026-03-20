"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ADMIN_KEY_STORAGE_KEY } from "@/lib/admin-portal";

export default function AdminPortalKeyForm() {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");

  function submit() {
    const normalized = adminKey.trim();
    if (!normalized) return;
    window.localStorage.setItem(ADMIN_KEY_STORAGE_KEY, normalized);
    router.push("/admin");
  }

  return (
    <div className="mt-4 space-y-3">
      <Input
        type="password"
        placeholder="Enter admin approval key"
        value={adminKey}
        onChange={(event) => setAdminKey(event.target.value)}
        className="bg-white text-black"
      />
      <Button
        variant="outline"
        className="border-white/30 bg-transparent text-white hover:border-lethela-primary hover:text-lethela-primary"
        onClick={submit}
        disabled={!adminKey.trim()}
      >
        Continue with key
      </Button>
    </div>
  );
}
