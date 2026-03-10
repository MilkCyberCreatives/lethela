"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Card = {
  title: string;
  subtitle?: string;
  image?: string;
  vendor?: string | null;
  slug?: string | null;
  isAlcohol?: boolean;
};

export default function RecommendationsGrid({
  suburb,
  initialCards,
}: {
  suburb: string | null;
  initialCards?: Card[];
}) {
  const hasInitial = (initialCards?.length ?? 0) > 0;
  const [cards, setCards] = useState<Card[]>(initialCards ?? []);
  const [loading, setLoading] = useState(!hasInitial);
  const initialSuburbRef = useRef(suburb);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/ai/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ suburb }),
      });
      const json = await response.json();
      setCards(json.results || []);
    } finally {
      setLoading(false);
    }
  }, [suburb]);

  useEffect(() => {
    if (hasInitial && suburb === initialSuburbRef.current) return;
    void load();
  }, [hasInitial, load, suburb]);

  return (
    <section className="container py-10">
      <h2 className="mb-6 text-2xl font-semibold">Recommended for you</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 animate-pulse rounded-2xl border border-white/10 bg-lethela-secondary" />
            ))
          : cards.map((card, i) => {
              const href = card.slug ? `/vendors/${card.slug}` : "#";
              return (
                <Link key={`${card.title}-${i}`} href={href} className="overflow-hidden rounded-2xl border border-white/10 bg-lethela-secondary">
                  {card.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={card.image} alt={card.title} className="h-40 w-full object-cover" />
                  ) : (
                    <div className="h-40 w-full bg-white/10" />
                  )}
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{card.title}</h3>
                        <p className="truncate text-xs text-white/70">{card.subtitle}</p>
                      </div>
                      {card.isAlcohol ? <span className="rounded bg-white/10 px-2 py-1 text-[10px]">18+</span> : null}
                    </div>
                  </div>
                </Link>
              );
            })}
      </div>
    </section>
  );
}
