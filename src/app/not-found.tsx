import Link from "next/link";
import MainHeader from "@/components/MainHeader";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />
      <section className="container flex min-h-[65vh] max-w-2xl flex-col items-start justify-center py-16">
        <p className="text-xs uppercase tracking-[0.18em] text-white/50">404</p>
        <h1 className="mt-3 text-4xl font-bold">We could not find that page</h1>
        <p className="mt-4 text-sm leading-7 text-white/70">
          The link may be old, or the store or product may no longer be available.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/" className="rounded-lg bg-lethela-primary px-5 py-3 text-sm font-semibold">
            Go to marketplace
          </Link>
          <Link href="/search" className="rounded-lg border border-white/20 px-5 py-3 text-sm">
            Search Lethela
          </Link>
        </div>
      </section>
    </main>
  );
}
