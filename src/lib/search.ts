import { prisma } from "@/lib/db";
import { cosine, embed } from "@/lib/embeddings";
import { getFallbackSearchSources } from "@/lib/catalog-fallback";
import { shouldPreferCatalogFallback } from "@/lib/catalog-runtime";
import { withQueryTimeout, withTimeoutOrThrow } from "@/lib/query-timeout";

export type SearchHit = {
  id: string;
  kind: "vendor" | "product";
  title: string;
  image: string | null;
  slug: string | null;
  vendorName: string | null;
  score: number;
  subtitle: string | null;
  priceCents: number | null;
  isAlcohol: boolean;
};

type SearchOptions = {
  limit?: number;
};

const CACHE_TTL_MS = 60_000;
const searchCache = new Map<string, { ts: number; hits: SearchHit[] }>();

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 12);
}

function lexicalScore(tokens: string[], text: string) {
  if (!tokens.length) return 0;
  const lower = text.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (lower === token) score += 1.2;
    else if (lower.startsWith(token)) score += 1;
    else if (lower.includes(` ${token}`)) score += 0.7;
    else if (lower.includes(token)) score += 0.5;
  }
  return score / tokens.length;
}

export async function searchCatalog(q: string, opts: SearchOptions = {}) {
  const query = q.trim().slice(0, 180);
  if (!query) return [] as SearchHit[];

  const limit = Math.min(24, Math.max(1, opts.limit ?? 12));
  const cacheKey = `${query.toLowerCase()}::${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.hits;
  }

  const tokens = tokenize(query);
  const fallbackSources = getFallbackSearchSources();
  const fallbackVendorRows = fallbackSources.vendors as any;
  const fallbackProductRows = fallbackSources.products as any;

  const searchSourcesQuery = shouldPreferCatalogFallback()
    ? Promise.resolve([fallbackVendorRows, fallbackProductRows] as const)
    : Promise.all([
        prisma.vendor.findMany({
          where: { isActive: true, status: "ACTIVE" },
          take: 60,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            slug: true,
            name: true,
            suburb: true,
            city: true,
          },
        }),
        prisma.product.findMany({
          take: 240,
          orderBy: { updatedAt: "desc" },
          include: {
            vendor: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        }),
      ]);

  type SearchSources = Awaited<typeof searchSourcesQuery>;

  const [vendors, products] = await withQueryTimeout(searchSourcesQuery, [
    fallbackVendorRows as SearchSources[0],
    fallbackProductRows as SearchSources[1],
  ]);

  type Row = {
    id: string;
    kind: "vendor" | "product";
    title: string;
    searchText: string;
    image: string | null;
    slug: string | null;
    vendorName: string | null;
    subtitle: string | null;
    priceCents: number | null;
    isAlcohol: boolean;
  };

  const rows: Row[] = [
    ...vendors.map((vendor: any) => ({
      id: vendor.id,
      kind: "vendor" as const,
      title: vendor.name,
      searchText: [vendor.name, vendor.suburb ?? "", vendor.city ?? ""].join(" "),
      image: "/vendors/grill.jpg",
      slug: vendor.slug,
      vendorName: vendor.name,
      subtitle: [vendor.suburb, vendor.city].filter(Boolean).join(", ") || "Vendor",
      priceCents: null,
      isAlcohol: false,
    })),
    ...products.map((product: any) => ({
      id: product.id,
      kind: "product" as const,
      title: product.name,
      searchText: [product.name, product.description ?? "", product.vendor?.name ?? ""].join(" "),
      image: product.image ?? null,
      slug: product.vendor?.slug ?? null,
      vendorName: product.vendor?.name ?? null,
      subtitle: product.vendor?.name ?? "Product",
      priceCents: product.priceCents,
      isAlcohol: Boolean(product.isAlcohol),
    })),
  ];

  if (rows.length === 0) return [] as SearchHit[];

  const semanticFallback = rows.slice(0, limit * 3).map((row) => ({
    ...row,
    score: lexicalScore(tokens, row.searchText),
  }));

  try {
    const [qv, ...vectors] = await withTimeoutOrThrow(
      embed([query, ...rows.map((row) => row.searchText)]),
      1500,
      "Embedding request timed out"
    );
    const scored = rows.map((row, index) => {
      const semantic = cosine(qv, vectors[index]);
      const lexical = lexicalScore(tokens, row.searchText);
      const score = semantic * 0.62 + lexical * 0.38;
      return { ...row, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const hits = scored.slice(0, limit) satisfies SearchHit[];
    searchCache.set(cacheKey, { ts: Date.now(), hits });
    return hits;
  } catch {
    semanticFallback.sort((a, b) => b.score - a.score);
    const hits = semanticFallback.slice(0, limit) satisfies SearchHit[];
    searchCache.set(cacheKey, { ts: Date.now(), hits });
    return hits;
  }
}
