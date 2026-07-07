"use client";

import Link from "next/link";
import {
  ArrowRight,
  Coffee,
  Drumstick,
  Flame,
  Martini,
  ShoppingBasket,
  Sandwich,
  Utensils,
} from "lucide-react";
import { categoryToSlug } from "@/lib/categories";

const CATEGORIES = [
  { label: "Groceries", category: "Groceries", icon: ShoppingBasket },
  { label: "Liquor", category: "Liquor", icon: Martini, badge: "18+" },
  { label: "Kota", category: "Kota", icon: Utensils },
  { label: "Chicken", category: "Chicken", icon: Drumstick },
  { label: "Burgers", category: "Burger", icon: Sandwich },
  { label: "Braai", category: "Braai", icon: Flame },
  { label: "Breakfast", category: "Breakfast", icon: Coffee },
  { label: "Drinks", category: "Drinks", icon: Coffee },
  { label: "Snacks", category: "Snacks", icon: ShoppingBasket },
];

export default function CategoryCarousel() {
  return (
    <section id="popular-categories">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Featured categories</h2>
        </div>
        <Link
          href="/search"
          className="inline-flex items-center text-sm font-semibold text-white/75 transition hover:text-lethela-primary"
        >
          View all categories
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
        {CATEGORIES.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={`/categories/${categoryToSlug(item.category)}`}
              className="group min-h-[78px] rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 transition duration-150 hover:-translate-y-0.5 hover:border-lethela-primary/60 hover:bg-white/[0.07]"
              aria-label={item.badge ? `${item.label} ${item.badge}` : item.label}
            >
              <span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-lethela-primary text-white">
                <Icon className="h-5 w-5" aria-hidden strokeWidth={2} />
              </span>
              <span className="mt-2 flex items-center justify-center gap-1 text-center text-xs font-semibold">
                {item.label}
                {item.badge ? (
                  <span className="rounded-full border border-lethela-primary/40 px-1.5 py-0.5 text-[10px] text-lethela-primary">
                    {item.badge}
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
