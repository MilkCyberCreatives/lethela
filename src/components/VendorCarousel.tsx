"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type FeaturedVendor = {
  id: string;
  name: string;
  tagline: string;
  img: string;
  cta?: string;
};

const FEATURED_VENDORS: FeaturedVendor[] = [
  {
    id: "hello-tomato",
    name: "Hello Tomato",
    tagline: "Open now | Delivery available",
    img: "/vendors/grill.jpg",
    cta: "Order now",
  },
  {
    id: "bento",
    name: "Bento",
    tagline: "Open now | Delivery available",
    img: "/vendors/sushi.jpg",
    cta: "Order now",
  },
  {
    id: "afrikaa",
    name: "Afrikoa",
    tagline: "Open now | Delivery available",
    img: "/vendors/curry.jpg",
    cta: "Order now",
  },
  {
    id: "cinnabon",
    name: "Cinnabon",
    tagline: "Open now | Delivery available",
    img: "/vendors/vegan.jpg",
    cta: "Order now",
  },
];

export default function VendorCarousel() {
  const trackRef = useRef<HTMLDivElement | null>(null);

  const scrollByAmount = (dx: number) => {
    if (!trackRef.current) return;
    trackRef.current.scrollBy({ left: dx, behavior: "smooth" });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!trackRef.current) return;
      scrollByAmount(360);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scrollByAmount(-360)}
        className="absolute -left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 md:flex"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scrollByAmount(360)}
        className="absolute -right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 md:flex"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div ref={trackRef} className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pr-4 md:pr-8">
        {FEATURED_VENDORS.map((vendor) => (
          <div
            key={vendor.id}
            className="w-[320px] shrink-0 snap-start overflow-hidden rounded-xl border border-white/10 bg-[#0E1236] text-white transition-transform duration-200 hover:-translate-y-1 hover:border-lethela-primary/60 md:w-[360px]"
          >
            <div className="h-[160px] w-full overflow-hidden bg-black/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={vendor.img} alt={vendor.name} className="h-full w-full object-cover" />
            </div>

            <div className="flex flex-col gap-3 p-4">
              <div className="text-base font-semibold leading-tight">{vendor.name}</div>
              <div className="text-xs text-white/70">{vendor.tagline}</div>

              <div className="flex justify-end">
                <button className="rounded-md bg-lethela-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                  {vendor.cta ?? "Order now"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex w-full justify-end gap-2 md:hidden">
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollByAmount(-320)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollByAmount(320)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
