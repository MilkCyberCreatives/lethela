import Link from "next/link";
import type { Metadata } from "next";
import MainHeader from "@/components/MainHeader";
import Footer from "@/components/Footer";

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

export default async function TrackOrderPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await Promise.resolve(searchParams);
  const ref = parseRef(params.ref);
  const clean = ref.toUpperCase();

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

        {clean ? (
          <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-4">
            <p className="text-sm text-white/80">
              Reference found: <span className="font-mono">{clean}</span>
            </p>
            <div className="mt-3">
              <Link href={`/orders/${encodeURIComponent(clean)}`} className="underline">
                Open live tracking
              </Link>
            </div>
          </div>
        ) : null}
      </section>

      <Footer />
    </main>
  );
}
