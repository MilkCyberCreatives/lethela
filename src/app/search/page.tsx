import Link from "next/link";
import type { Metadata } from "next";
import MainHeader from "@/components/MainHeader";
import Footer from "@/components/Footer";
import StructuredData from "@/components/StructuredData";
import { searchCatalog } from "@/lib/search";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

type SearchParamValue = string | string[] | undefined;
type SearchParams = { q?: SearchParamValue } | Promise<{ q?: SearchParamValue }>;

function parseQuery(value: SearchParamValue) {
  if (Array.isArray(value)) return String(value[0] || "").trim();
  return String(value || "").trim();
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await Promise.resolve(searchParams);
  const query = parseQuery(params.q).slice(0, 80);

  if (!query) {
    return {
      title: "Search",
      description: `Search vendors, products, groceries and township favourites on ${SITE_NAME}.`,
      alternates: { canonical: "/search" },
    };
  }

  return {
    title: `Search: ${query}`,
    description: `Search results for "${query}" on ${SITE_NAME}.`,
    alternates: { canonical: `/search?q=${encodeURIComponent(query)}` },
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await Promise.resolve(searchParams);
  const query = parseQuery(params.q).slice(0, 180);
  const results = query.length >= 2 ? await searchCatalog(query, { limit: 30 }) : [];

  const itemListSchema =
    query.length >= 2
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Search results for ${query}`,
          itemListElement: results.slice(0, 10).map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: item.slug ? absoluteUrl(`/vendors/${item.slug}`) : absoluteUrl("/"),
            name: item.title,
          })),
        }
      : null;

  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />

      <section className="container py-10">
        {itemListSchema ? <StructuredData data={itemListSchema} /> : null}

        <h1 className="text-3xl font-bold">Search</h1>
        <p className="mt-2 text-sm text-white/75">
          Find vendors, groceries, kota, chips, burgers, alcohol and more near your area.
        </p>

        <form action="/search" method="get" className="mt-6 flex max-w-2xl gap-2">
          <input
            type="search"
            name="q"
            defaultValue={query}
            required
            placeholder="Search township food, groceries, vendors..."
            className="w-full rounded border border-white/20 bg-white px-3 py-2 text-black"
          />
          <button type="submit" className="rounded bg-lethela-primary px-4 py-2 font-medium text-white">
            Search
          </button>
        </form>

        {query.length < 2 ? (
          <p className="mt-6 text-sm text-white/70">Type at least 2 characters to see results.</p>
        ) : results.length === 0 ? (
          <p className="mt-6 text-sm text-white/70">
            No results found for <span className="font-semibold">{query}</span>.
          </p>
        ) : (
          <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {results.map((item) => (
              <Link
                key={`${item.kind}-${item.id}`}
                href={item.slug ? `/vendors/${item.slug}` : "/"}
                className="rounded-xl border border-white/15 bg-white/5 p-4 transition-colors hover:border-lethela-primary/70"
              >
                <div className="text-xs uppercase tracking-[0.1em] text-white/60">{item.kind}</div>
                <h2 className="mt-1 text-base font-semibold">{item.title}</h2>
                <p className="mt-1 text-sm text-white/70">{item.subtitle || item.vendorName || "Local listing"}</p>
                {item.priceCents != null ? (
                  <p className="mt-2 text-sm text-white/85">R {(item.priceCents / 100).toFixed(2)}</p>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
