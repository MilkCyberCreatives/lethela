"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > 520);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Scroll to the top"
      title="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      // On small screens the mobile cart bar occupies the bottom edge, so sit
      // above it; on md+ there is no cart bar and the normal offset applies.
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-[70] grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-lethela-primary text-white shadow-2xl shadow-black/30 transition hover:-translate-y-0.5 hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:bottom-[calc(1rem+env(safe-area-inset-bottom))]"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
