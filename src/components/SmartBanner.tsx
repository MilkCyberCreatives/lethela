"use client";

import { useEffect, useState } from "react";

export default function SmartBanner() {
  const [title, setTitle] = useState<string>("Siyashesha - Delivered Fast");

  useEffect(() => {
    let ignore = false;

    async function run() {
      try {
        const messages = [
          {
            role: "system",
            content:
              "You write short, punchy, family-friendly headlines for a South African food and delivery site. Max 7 words. No emojis.",
          },
          {
            role: "user",
            content: "Write a headline for Lethela (Klipfontein View, Midrand). Keep it short and energetic.",
          },
        ];
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages }),
        });
        const json = await response.json();
        if (!ignore && json?.reply) {
          setTitle(String(json.reply).replace(/\n/g, " ").slice(0, 64));
        }
      } catch {
        // Keep fallback.
      }
    }

    void run();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="container mt-6">
      <div className="rounded-2xl border border-white/10 bg-lethela-secondary p-4 text-center">
        <span className="text-lg font-semibold">{title}</span>
      </div>
    </div>
  );
}
