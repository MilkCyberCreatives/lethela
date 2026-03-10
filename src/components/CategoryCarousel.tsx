"use client";

import Link from "next/link";
import { useRef } from "react";
import { ChevronLeft, ChevronRight, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categoryToSlug } from "@/lib/categories";

const CATEGORIES = ["Kota", "Chips", "Burger", "Mogodu", "Alcohol", "Groceries", "Braai", "Pizza", "Chicken"];

export default function CategoryCarousel() {
  const scroller = useRef<HTMLDivElement>(null);

  const scrollBy = (dx: number) => {
    scroller.current?.scrollBy({ left: dx, behavior: "smooth" });
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xl font-semibold">Popular categories</h3>
        <div className="hidden gap-2 md:flex">
          <Button variant="outline" className="border-white/20" onClick={() => scrollBy(-240)} aria-label="Scroll categories left">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="outline" className="border-white/20" onClick={() => scrollBy(240)} aria-label="Scroll categories right">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div
        ref={scroller}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1"
        style={{ scrollBehavior: "smooth" }}
        role="listbox"
        aria-label="Category list"
      >
        {CATEGORIES.map((category) => (
          <Link
            key={category}
            href={`/categories/${categoryToSlug(category)}`}
            className="snap-start shrink-0 rounded-xl border border-white/15 bg-lethela-secondary px-4 py-2 text-sm transition hover:bg-white/5"
            aria-label={category}
          >
            <span className="inline-flex items-center gap-2">
              <Utensils className="h-4 w-4" />
              {category}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
