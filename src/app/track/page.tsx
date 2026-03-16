import Link from "next/link";
import type { Metadata } from "next";
import MainHeader from "@/components/MainHeader";
import Footer from "@/components/Footer";
import { prisma } from "@/lib/db";
import { isDemoOrderRef } from "@/lib/demo-order";
import { withQueryTimeout } from "@/lib/query-timeout";

type SearchParams = Promise<{ ref?: string | string[] }> | { ref?: string | string[] };

export const metadata: Metadata = {
  title: "Track Order",
  description: "Enter your Lethela order reference to open live order tracking.",
  alternates: {
    canonical: "/track",
  },
};

function parseRef(value: string | string[] | undefined) {
  if (Array.isArray(value)) return String(value[0] || "").trim();
  return String(value || "").trim();
}

function normalizeRef(value: string | string[] | undefined) {
  return parseRef(value).toUpperCase().replace(/\s+/g, "-").replace(/-+/g, "-");
}

export default async function TrackOrderPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await Promise.resolve(searchParams);
  const clean = normalizeRef(params.ref);
  const isDemo = clean ? isDemoOrderRef(clean) : false;
  const order = clean
    ? await withQueryTimeout(
        prisma.order.findFirst({
          where: {
            OR: [{ publicId: clean }, { ozowReference: clean }],
          },
          select: {
            publicId: true,
            ozowReference: true,
          },
        }),
        null
      )
    : null;
  const resolvedRef = order ? order.ozowReference || order.publicId : isDemo ? clean : null;
  const resolvedHref = resolvedRef ? `/orders/${encodeURIComponent(resolvedRef)}` : "/track";
  const hasLookup = Boolean(clean);
  const found = Boolean(resolvedRef);

  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />

      <section className="container max-w-2xl py-10 md:py-14">
        <h1 className="text-3xl font-bold md:text-4xl">Track your order</h1>
        <p className="mt-3 text-sm text-white/75 md:text-base">
          Enter your order reference (example: <span className="font-semibold">LET-12345</span>) to view live status.
        </p>

        <form action="/track" method="get" className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            name="ref"
            defaultValue={clean}
            required
            placeholder="LET-12345"
            className="w-full rounded border border-white/20 bg-white px-3 py-2 text-black"
            autoComplete="off"
          />
          <button type="submit" className="rounded bg-lethela-primary px-4 py-2 font-medium text-white">
            Find order
          </button>
        </form>

        {hasLookup && found ? (
          <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-4">
            <p className="text-sm text-white/80">
              Reference found: <span className="font-mono">{resolvedRef}</span>
            </p>
            <div className="mt-3">
              <Link href={resolvedHref} className="underline">
                Open live tracking
              </Link>
            </div>
          </div>
        ) : null}

        {hasLookup && !found ? (
          <div className="mt-6 rounded-xl border border-red-300/30 bg-red-300/10 p-4">
            <p className="text-sm text-red-100">
              We could not find an order for <span className="font-mono">{clean}</span>.
            </p>
            <p className="mt-2 text-xs text-red-50/80">
              Check the reference and try again. It should look like <span className="font-semibold">LET-12345</span>.
            </p>
          </div>
        ) : null}
      </section>

      <Footer />
    </main>
  );
}
