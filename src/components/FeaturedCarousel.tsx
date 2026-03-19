"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Item = { name: string; img: string; cta?: string; sub?: string };

type Props = {
  title?: string;
  items: Item[];
  className?: string;
  autoMs?: number;
};

export default function FeaturedCarousel({ title, items, className, autoMs = 4000 }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const cardWidth = useMemo(() => {
    if (typeof window === "undefined") return 0;
    const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    return viewportWidth < 768 ? Math.round(viewportWidth * 0.75) : Math.round(viewportWidth * 0.3);
  }, []);

  useEffect(() => {
    const element = trackRef.current;
    if (!element) return;
    const onScroll = () => {
      const first = element.firstElementChild as HTMLElement | null;
      if (!first) return;
      const index = Math.round(element.scrollLeft / first.clientWidth);
      setActive(Math.max(0, Math.min(items.length - 1, index)));
    };
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => element.removeEventListener("scroll", onScroll);
  }, [items.length]);

  const scrollToIndex = (index: number) => {
    const element = trackRef.current;
    if (!element) return;
    const first = element.firstElementChild as HTMLElement | null;
    if (!first) return;
    element.scrollTo({ left: index * first.clientWidth, behavior: "smooth" });
    setActive(index);
  };

  const prev = () => scrollToIndex(Math.max(0, active - 1));
  const next = () => scrollToIndex(Math.min(items.length - 1, active + 1));

  useEffect(() => {
    if (paused || items.length <= 1) return;
    const timer = setInterval(() => {
      setActive((current) => {
        const nextIndex = current + 1 >= items.length ? 0 : current + 1;
        scrollToIndex(nextIndex);
        return nextIndex;
      });
    }, autoMs);
    return () => clearInterval(timer);
  }, [paused, items.length, autoMs]);

  return (
    <section className={["relative", className].filter(Boolean).join(" ")}>
      {title ? <h2 className="mb-6 text-2xl font-semibold">{title}</h2> : null}

      <div
        ref={trackRef}
        className="no-scrollbar grid grid-flow-col auto-cols-[75%] gap-5 overflow-x-auto snap-x snap-mandatory pb-3 md:auto-cols-[30%]"
        style={{ scrollBehavior: "smooth" }}
        role="listbox"
        aria-label={title || "Featured restaurants"}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") prev();
          if (event.key === "ArrowRight") next();
        }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        {items.map((item, index) => (
          <article
            key={item.name}
            className="snap-start overflow-hidden rounded-2xl border border-white/10 bg-lethela-secondary outline-none focus-visible:ring-2 focus-visible:ring-lethela-primary"
            role="option"
            aria-selected={index === active}
          >
            <div className="relative">
              <Image
                src={item.img}
                alt={item.name}
                width={Math.max(cardWidth, 480)}
                height={240}
                className="h-44 w-full object-cover"
                sizes="(min-width:1024px) 30vw, 75vw"
                priority={index === 0}
              />
            </div>
            <div className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <h3 className="truncate font-semibold">{item.name}</h3>
                <p className="truncate text-xs text-white/70">{item.sub || "Open now • Delivery available"}</p>
              </div>
              {item.cta ? (
                <a
                  href={item.cta}
                  className="inline-flex shrink-0 items-center rounded-lg bg-lethela-primary px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                >
                  Order now
                </a>
              ) : (
                <span className="inline-flex shrink-0 items-center rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/68">
                  Featured
                </span>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-y-1/2 left-1 right-1 flex -translate-y-1/2 justify-between">
        <div className="pointer-events-auto">
          <Button
            variant="outline"
            className="border-white/20 bg-lethela-secondary/90 hover:bg-lethela-secondary"
            onClick={prev}
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>
        <div className="pointer-events-auto">
          <Button
            variant="outline"
            className="border-white/20 bg-lethela-secondary/90 hover:bg-lethela-secondary"
            onClick={next}
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-2" role="tablist" aria-label="Carousel pagination">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToIndex(index)}
            className={[
              "h-2.5 w-2.5 rounded-full transition",
              index === active ? "bg-white" : "bg-white/30 hover:bg-white/60",
            ].join(" ")}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === active}
          />
        ))}
      </div>
    </section>
  );
}
