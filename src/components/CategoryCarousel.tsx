"use client";

import Link from "next/link";
import {
  ArrowRight,
  Coffee,
  Drumstick,
  Flame,
  ShoppingBasket,
  Sandwich,
  Utensils,
} from "lucide-react";
import { categoryToSlug } from "@/lib/categories";

const CATEGORIES = [
  { label: "Groceries", category: "Groceries", icon: ShoppingBasket },
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={`/categories/${categoryToSlug(item.category)}`}
              className="group rounded-xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-lethela-primary/60 hover:bg-white/[0.07]"
              aria-label={item.label}
            >
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-lethela-primary/12 text-lethela-primary">
                <Icon className="h-5 w-5" />
              </span>
              <span className="mt-4 block text-lg font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
