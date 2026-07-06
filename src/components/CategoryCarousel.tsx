"use client";

import Link from "next/link";
import { ArrowRight, ShoppingBasket, Utensils } from "lucide-react";
import { categoryToSlug } from "@/lib/categories";

const CATEGORIES = [
  { label: "Spaza & Groceries", category: "Spaza & Groceries" },
  { label: "Kota", category: "Kota" },
  { label: "Chicken", category: "Chicken" },
  { label: "Burgers", category: "Burger" },
  { label: "Braai", category: "Braai" },
  { label: "Breakfast", category: "Breakfast" },
];

export default function CategoryCarousel() {
  return (
    <section id="popular-categories">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Popular categories</h2>
          <p className="mt-2 text-sm text-white/62">
            Start with the township favourites customers ask for most.
          </p>
        </div>
        <Link
          href="/search"
          className="inline-flex items-center text-sm font-semibold text-white/75 transition hover:text-lethela-primary"
        >
          View all categories
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((item) => (
          <Link
            key={item.label}
            href={`/categories/${categoryToSlug(item.category)}`}
            className="group rounded-xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-lethela-primary/60 hover:bg-white/[0.07]"
            aria-label={item.label}
          >
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-lethela-primary/12 text-lethela-primary">
              {item.category === "Spaza & Groceries" ? (
                <ShoppingBasket className="h-5 w-5" />
              ) : (
                <Utensils className="h-5 w-5" />
              )}
            </span>
            <span className="mt-4 block text-lg font-semibold">{item.label}</span>
            <span className="mt-1 block text-sm text-white/58">Browse approved listings</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
