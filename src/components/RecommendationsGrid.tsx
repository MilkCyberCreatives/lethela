"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { readPreferredLocation } from "@/lib/location-preference";
import { pushDataLayerEvent, trackVisitorEvent } from "@/lib/visitor";

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
  const [activeSuburb, setActiveSuburb] = useState<string | null>(suburb);
  const initialSuburbRef = useRef(suburb);
  const refreshedOnceRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/ai/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ suburb: activeSuburb }),
      });
      const json = await response.json();
      setCards(json.results || []);
    } finally {
      setLoading(false);
    }
  }, [activeSuburb]);

  useEffect(() => {
    if (hasInitial && activeSuburb === initialSuburbRef.current && !refreshedOnceRef.current) {
      refreshedOnceRef.current = true;
      void load();
      return;
    }
    void load();
  }, [activeSuburb, hasInitial, load]);

  useEffect(() => {
    const syncLocation = () => {
      const next = readPreferredLocation()?.label || suburb || null;
      setActiveSuburb((current) => (current === next ? current : next));
    };

    syncLocation();
    window.addEventListener("lethela:location-changed", syncLocation);
    window.addEventListener("storage", syncLocation);
    window.addEventListener("focus", syncLocation);
    document.addEventListener("visibilitychange", syncLocation);
    return () => {
      window.removeEventListener("lethela:location-changed", syncLocation);
      window.removeEventListener("storage", syncLocation);
      window.removeEventListener("focus", syncLocation);
      document.removeEventListener("visibilitychange", syncLocation);
    };
  }, [suburb]);

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
              const body = (
                <>
                  {card.image ? (
                    <div className="relative h-40 w-full">
                      <Image
                        src={card.image}
                        alt={card.title}
                        fill
                        sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                        className="object-cover"
                      />
                    </div>
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
                </>
              );

              return (
                <Link
                  key={`${card.title}-${i}`}
                  href={href}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-lethela-secondary"
                  onClick={() =>
                    {
                      void trackVisitorEvent({
                        type: "recommendation_click",
                        vendorSlug: card.slug || undefined,
                        meta: {
                          title: card.title,
                          subtitle: card.subtitle || null,
                        },
                      });
                      pushDataLayerEvent("select_promotion", {
                        promotion_name: "recommendations",
                        item_name: card.title,
                        vendor_slug: card.slug || null,
                      });
                    }
                  }
                >
                  {body}
                </Link>
              );
            })}
      </div>
    </section>
  );
}
