import Link from "next/link";

type SearchParams = Promise<{ ref?: string }> | { ref?: string };

export default async function CancelPage({ searchParams }: { searchParams: SearchParams }) {
  const { ref } = await Promise.resolve(searchParams);

  return (
    <main className="container py-10">
      <h1 className="text-2xl font-bold text-yellow-400">Payment cancelled</h1>
      <p className="mt-2 text-white/80">
        Your order was not completed. Reference: <span className="font-semibold">{ref ?? "N/A"}</span>
      </p>
      <div className="mt-6">
        <Link href="/checkout" className="underline">
          Return to checkout
        </Link>
      </div>
    </main>
  );
}
