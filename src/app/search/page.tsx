import Link from "next/link";
import type { Metadata } from "next";
import MainHeader from "@/components/MainHeader";
import Footer from "@/components/Footer";
import StructuredData from "@/components/StructuredData";
import VoiceSearchButton from "@/components/VoiceSearchButton";
import { formatZAR } from "@/lib/format";
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
      openGraph: {
        title: `Search township delivery on ${SITE_NAME}`,
        description: `Find approved township vendors, spaza shops, groceries, kota, meals and restaurants on ${SITE_NAME}.`,
        url: absoluteUrl("/search"),
      },
    };
  }

  return {
    title: `Search: ${query}`,
    description: `Search results for "${query}" on ${SITE_NAME}.`,
    alternates: { canonical: `/search?q=${encodeURIComponent(query)}` },
    robots: { index: false, follow: true },
    openGraph: {
      title: `Search ${query} on ${SITE_NAME}`,
      description: `Find ${query}, approved vendors, groceries and local food delivery options on ${SITE_NAME}.`,
      url: absoluteUrl(`/search?q=${encodeURIComponent(query)}`),
    },
  };
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await Promise.resolve(searchParams);
  const query = parseQuery(params.q).slice(0, 180);
  const liveResults = query.length >= 2 ? await searchCatalog(query, { limit: 30 }) : [];
  const results = liveResults;
  const suggestions = ["kota", "chips", "chicken", "groceries", "braai", "breakfast", "mogodu"];
  const categoryChips = [{ label: "Liquor 18+", href: "/categories/liquor" }];
  const discoverySuggestions = [
    "spaza shop delivery",
    "grocery delivery township",
    "kota delivery near me",
    "local food delivery",
    "restaurant delivery",
    "bread milk eggs",
  ];

  const itemListSchema =
    query.length >= 2
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Search results for ${query}`,
          itemListElement: results.slice(0, 10).map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: absoluteUrl(item.href || (item.slug ? `/vendors/${item.slug}` : "/")),
            name: item.title,
          })),
        }
      : null;

  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />

      <section className="container py-8 md:py-10">
        {itemListSchema ? <StructuredData data={itemListSchema} /> : null}

        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-lethela-primary">
            Fast local discovery
          </p>
          <h1 className="mt-2 text-3xl font-bold md:text-5xl">Find food and groceries nearby</h1>
          <p className="mt-3 text-sm leading-6 text-white/75 md:text-base">
            Search approved Lethela vendors, menu items, specials and township favourites ready for
            delivery.
          </p>
        </div>

        <form
          action="/search"
          method="get"
          className="mt-6 grid max-w-3xl gap-3 rounded-lg border border-white/15 bg-white/8 p-3 shadow-2xl shadow-black/20 sm:grid-cols-[1fr_auto_auto]"
        >
          <input
            type="search"
            name="q"
            defaultValue={query}
            required
            minLength={2}
            placeholder="Search kota, chips, chicken, groceries, spaza shops..."
            className="min-h-12 w-full rounded-md border border-white/20 bg-white px-4 text-base text-black outline-none ring-lethela-primary/40 transition focus:ring-4"
          />
          <button
            type="submit"
            className="min-h-12 rounded-md bg-lethela-primary px-6 font-semibold text-white transition hover:bg-lethela-primary/90"
          >
            Search
          </button>
          <VoiceSearchButton />
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {categoryChips.map((chip) => (
            <Link
              key={chip.label}
              href={chip.href}
              className="rounded-full border border-lethela-primary/40 px-3 py-1.5 text-sm font-semibold text-lethela-primary transition hover:border-lethela-primary hover:text-white"
            >
              {chip.label}
            </Link>
          ))}
          {[...suggestions, ...discoverySuggestions].map((term) => (
            <Link
              key={term}
              href={`/search?q=${encodeURIComponent(term)}`}
              className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/75 transition hover:border-lethela-primary hover:text-white"
            >
              {term}
            </Link>
          ))}
        </div>

        {query.length < 2 ? (
          <div className="mt-8 rounded-lg border border-white/15 bg-white/5 p-5 text-sm text-white/75">
            Type at least 2 characters or choose a popular search above.
          </div>
        ) : (
          <>
            {results.length === 0 ? (
              <div className="mt-8 rounded-lg border border-white/15 bg-white/5 p-5 text-sm leading-6 text-white/75">
                <p className="font-semibold text-white">No results found.</p>
                <p className="mt-1">
                  Try searching for groceries, kota, chicken, bread, drinks or vendors near you.
                </p>
              </div>
            ) : null}
            <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {results.map((item, index) => (
                <Link
                  key={`${item.kind}-${item.slug ?? "result"}-${index}`}
                  href={item.href || (item.slug ? `/vendors/${item.slug}` : "/")}
                  className="group overflow-hidden rounded-lg border border-white/15 bg-white/7 transition hover:border-lethela-primary/80 hover:bg-white/10"
                >
                  <div className="aspect-[16/9] bg-white/10">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt=""
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-white/45">
                        Lethela
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-lethela-primary">
                        {item.kind}
                      </span>
                      {item.priceCents != null ? (
                        <span className="text-sm font-semibold text-white">
                          {formatZAR(item.priceCents)}
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-2 line-clamp-2 text-base font-semibold">{item.title}</h2>
                    <p className="mt-1 line-clamp-1 text-sm text-white/70">
                      {item.subtitle || item.vendorName || "Local listing"}
                    </p>
                    <p className="mt-4 text-sm font-semibold text-white group-hover:text-lethela-primary">
                      View and order
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      <Footer />
    </main>
  );
}
