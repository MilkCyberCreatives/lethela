import Link from "next/link";
import ClearCartOnMount from "@/components/ClearCartOnMount";

type SearchParams = Promise<{ ref?: string }> | { ref?: string };

export default async function SuccessPage({ searchParams }: { searchParams: SearchParams }) {
  const { ref } = await Promise.resolve(searchParams);

  return (
    <main className="container py-10">
      <ClearCartOnMount />
      <h1 className="text-2xl font-bold text-green-400">Payment success (sandbox)</h1>
      <p className="mt-2 text-white/80">
        Thanks! Your order reference: <span className="font-semibold">{ref ?? "N/A"}</span>
      </p>
      <div className="mt-4 flex gap-4">
        {ref ? (
          <Link href={`/orders/${ref}`} className="underline">
            Track your order {"->"}
          </Link>
        ) : null}
        <Link href="/" className="underline">
          Back to home
        </Link>
      </div>
      <p className="mt-4 text-sm text-white/60">
        In dev, the webhook stub marks orders as paid. We will finalize signature verification later.
      </p>
    </main>
  );
}
