"use client";

import Image from "next/image";
import Link from "next/link";
import type { Vendor } from "@/types";
import { formatZAR } from "@/lib/format";
import { DEFAULT_DELIVERY_FEE_CENTS } from "@/lib/pricing";
import { recordVendorClick } from "@/lib/tracking";

export default function VendorCard({ v }: { v: Vendor }) {
  const hasRating = v.rating != null && (v.reviewCount ?? 0) > 0;

  return (
    <Link
      href={`/vendors/${v.slug}`}
      onClick={() =>
        recordVendorClick(v.id, v.slug, {
          name: v.name,
          rating: v.rating ?? undefined,
          cuisines: v.cuisines,
        })
      }
      className="group overflow-hidden rounded-2xl border border-white/10 bg-lethela-secondary transition"
    >
      <div className="relative aspect-[16/10]">
        <Image
          src={v.cover}
          alt={v.name}
          fill
          sizes="(min-width:1024px) 33vw, 50vw"
          className="object-cover"
          priority={false}
        />
        {v.badge ? (
          <div className="absolute right-3 top-3 rounded-full bg-lethela-primary px-3 py-1 text-xs font-semibold">
            {v.badge}
          </div>
        ) : null}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="truncate text-lg font-semibold">{v.name}</h3>
          {hasRating ? (
            <div className="flex shrink-0 items-center gap-1 text-sm">
              <Star className="h-4 w-4" />
              <span>{v.rating!.toFixed(1)}</span>
            </div>
          ) : (
            <span className="shrink-0 rounded-full border border-white/15 px-2 py-1 text-xs text-white/75">
              New vendor
            </span>
          )}
        </div>

        <p className="mt-1 truncate text-sm text-white/70">
          {[v.storeType || v.cuisines[0] || "Local vendor", v.area].filter(Boolean).join(" · ")}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/80">
          <span className="rounded-md bg-emerald-400/15 px-2 py-1 text-emerald-100">
            {v.isOpen === false ? "Closed" : "Open"}
          </span>
          <span className="rounded-md bg-white/10 px-2 py-1">{v.eta}</span>
          <span className="rounded-md bg-white/10 px-2 py-1">
            Delivery from {formatZAR(v.deliveryFeeCents ?? DEFAULT_DELIVERY_FEE_CENTS)}
          </span>
          {!hasRating ? (
            <span className="rounded-md bg-white/10 px-2 py-1">No ratings yet</span>
          ) : null}
        </div>
        <div className="mt-3 text-sm text-white/80">View menu {"->"}</div>
      </div>
    </Link>
  );
}

function Star(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}
