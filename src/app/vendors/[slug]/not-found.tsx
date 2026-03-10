import Link from "next/link";
import MainHeader from "@/components/MainHeader";

export default function VendorNotFound() {
  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />
      <section className="container py-16">
        <h1 className="text-3xl font-semibold">Vendor not found</h1>
        <p className="mt-3 text-sm text-white/75">This profile does not exist or is no longer active.</p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full border border-white/30 px-4 py-2 text-xs font-medium transition-colors hover:border-lethela-primary hover:text-lethela-primary"
        >
          Go back home
        </Link>
      </section>
    </main>
  );
}
