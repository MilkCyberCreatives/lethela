import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Drumstick, ShoppingBasket, Sparkles, Store } from "lucide-react";
import Footer from "@/components/Footer";
import MainHeader from "@/components/MainHeader";
import { CATEGORY_CONTENT, TOWNSHIP_CATEGORIES, categoryToSlug } from "@/lib/categories";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Township Marketplace Categories",
  description:
    "Browse kota, chicken, groceries, fashion, beauty, electronics, hardware and everyday township marketplace categories on Lethela.",
  path: "/categories",
});

export default function CategoriesPage() {
  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />
      <section className="container py-10 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lethela-primary">
          Everything local
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
          Food first. Everything else close behind.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 md:text-base">
          Find township favourites and everyday essentials from nearby independent businesses.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOWNSHIP_CATEGORIES.map((category, index) => {
            const Icon =
              category === "Kota"
                ? Store
                : category === "Chicken"
                  ? Drumstick
                  : index < 13
                    ? ShoppingBasket
                    : Sparkles;
            return (
              <Link
                key={category}
                href={`/categories/${categoryToSlug(category)}`}
                className={`group flex min-h-32 items-start gap-4 rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:border-lethela-primary ${
                  category === "Kota" || category === "Chicken"
                    ? "border-lethela-primary/40 bg-lethela-primary/10"
                    : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lethela-primary text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3 font-semibold">
                    {category}
                    <ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-1" />
                  </span>
                  <span className="mt-2 line-clamp-2 block text-sm leading-6 text-white/60">
                    {CATEGORY_CONTENT[category].intro}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
      <Footer />
    </main>
  );
}
