import Link from "next/link";
import CheckoutSuccessContent from "@/components/CheckoutSuccessContent";

type SearchParams = Promise<{ ref?: string }> | { ref?: string };

export default async function SuccessPage({ searchParams }: { searchParams: SearchParams }) {
  const { ref } = await Promise.resolve(searchParams);
  const cleanRef = typeof ref === "string" ? ref.trim() : "";

  if (!cleanRef) {
    return (
      <main className="container py-10">
        <h1 className="text-2xl font-bold text-yellow-400">Order reference unavailable</h1>
        <p className="mt-2 text-white/80">We could not verify this payment return.</p>
        <div className="mt-4 flex gap-4">
          <Link href="/checkout" className="underline">
            Return to checkout
          </Link>
          <Link href="/" className="underline">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  return <CheckoutSuccessContent refId={cleanRef} isSandbox={process.env.OZOW_IS_TEST !== "false"} />;
}
