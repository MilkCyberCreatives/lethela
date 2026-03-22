import { prisma, prismaRuntimeInfo } from "@/lib/db";
import { getFallbackSearchSources } from "@/lib/catalog-fallback";
import { shouldPreferCatalogFallback } from "@/lib/catalog-runtime";
import { getPublicVendorImage } from "@/lib/public-catalog";
import { runBoundedDbQuery } from "@/lib/query-timeout";

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
const searchIndexState = globalThis as typeof globalThis & {
  __lethelaSearchIndexesReady?: Promise<void>;
};

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

function searchWhereClauses(query: string, tokens: string[]) {
  const terms = Array.from(new Set([query, ...tokens].map((value) => value.trim()).filter(Boolean)));
  return terms;
}

function scoreAndLimitRows(rows: Array<Omit<SearchHit, "score"> & { searchText: string; dbScore?: number }>, tokens: string[], limit: number) {
  return rows
    .map((row) => {
      const lexical = lexicalScore(tokens, row.searchText);
      const dbScore = Number(row.dbScore || 0);
      return {
        id: row.id,
        kind: row.kind,
        title: row.title,
        image: row.image,
        slug: row.slug,
        vendorName: row.vendorName,
        subtitle: row.subtitle,
        priceCents: row.priceCents,
        isAlcohol: row.isAlcohol,
        score: dbScore > 0 ? dbScore * 0.7 + lexical * 0.3 : lexical,
      } satisfies SearchHit;
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

async function ensurePostgresSearchIndexes() {
  if (prismaRuntimeInfo.provider !== "postgresql") return;
  if (!searchIndexState.__lethelaSearchIndexesReady) {
    searchIndexState.__lethelaSearchIndexesReady = Promise.all([
      prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS vendor_search_tsv_idx
        ON "Vendor"
        USING GIN (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(suburb, '') || ' ' || coalesce(city, '') || ' ' || coalesce(cuisine, '')))
      `),
      prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS product_search_tsv_idx
        ON "Product"
        USING GIN (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, '')))
      `),
    ]).then(() => undefined);
  }

  return searchIndexState.__lethelaSearchIndexesReady;
}

async function searchPostgres(query: string, tokens: string[], limit: number): Promise<SearchHit[]> {
  await ensurePostgresSearchIndexes();
  const candidateLimit = Math.max(24, Math.min(120, limit * 6));

  type VendorRow = {
    id: string;
    slug: string;
    name: string;
    suburb: string | null;
    city: string | null;
    image: string | null;
    score: number;
  };

  type ProductRow = {
    id: string;
    name: string;
    description: string | null;
    image: string | null;
    priceCents: number;
    isAlcohol: boolean;
    vendorName: string;
    vendorSlug: string;
    score: number;
  };

  const [vendors, products] = await runBoundedDbQuery(async (db) => {
    const [vendorRows, productRows] = await Promise.all([
      db.$queryRaw<Array<VendorRow>>`
        SELECT
          v.id,
          v.slug,
          v.name,
          v.suburb,
          v.city,
          v.image,
          ts_rank(
            to_tsvector('simple', coalesce(v.name, '') || ' ' || coalesce(v.suburb, '') || ' ' || coalesce(v.city, '') || ' ' || coalesce(v.cuisine, '')),
            websearch_to_tsquery('simple', ${query})
          ) AS score
        FROM "Vendor" AS v
        WHERE v."isActive" = true
          AND v.status = 'ACTIVE'
          AND to_tsvector('simple', coalesce(v.name, '') || ' ' || coalesce(v.suburb, '') || ' ' || coalesce(v.city, '') || ' ' || coalesce(v.cuisine, ''))
              @@ websearch_to_tsquery('simple', ${query})
        ORDER BY score DESC, v."updatedAt" DESC
        LIMIT ${candidateLimit}
      `,
      db.$queryRaw<Array<ProductRow>>`
        SELECT
          p.id,
          p.name,
          p.description,
          p.image,
          p."priceCents" AS "priceCents",
          p."isAlcohol" AS "isAlcohol",
          v.name AS "vendorName",
          v.slug AS "vendorSlug",
          ts_rank(
            to_tsvector('simple', coalesce(p.name, '') || ' ' || coalesce(p.description, '') || ' ' || coalesce(v.name, '')),
            websearch_to_tsquery('simple', ${query})
          ) AS score
        FROM "Product" AS p
        INNER JOIN "Vendor" AS v ON v.id = p."vendorId"
        WHERE v."isActive" = true
          AND v.status = 'ACTIVE'
          AND to_tsvector('simple', coalesce(p.name, '') || ' ' || coalesce(p.description, '') || ' ' || coalesce(v.name, ''))
              @@ websearch_to_tsquery('simple', ${query})
        ORDER BY score DESC, p."updatedAt" DESC
        LIMIT ${candidateLimit}
      `,
    ]);

    return [vendorRows, productRows] as const;
  });

  const rows = [
    ...vendors.map((vendor) => ({
      id: vendor.id,
      kind: "vendor" as const,
      title: vendor.name,
      searchText: [vendor.name, vendor.suburb ?? "", vendor.city ?? ""].join(" "),
      image: getPublicVendorImage(vendor.image ?? null, false),
      slug: vendor.slug,
      vendorName: vendor.name,
      subtitle: [vendor.suburb, vendor.city].filter(Boolean).join(", ") || "Vendor",
      priceCents: null,
      isAlcohol: false,
      dbScore: vendor.score,
    })),
    ...products.map((product) => ({
      id: product.id,
      kind: "product" as const,
      title: product.name,
      searchText: [product.name, product.description ?? "", product.vendorName].join(" "),
      image: product.image ?? null,
      slug: product.vendorSlug,
      vendorName: product.vendorName,
      subtitle: product.vendorName,
      priceCents: product.priceCents,
      isAlcohol: Boolean(product.isAlcohol),
      dbScore: product.score,
    })),
  ];

  return scoreAndLimitRows(rows, tokens, limit);
}

async function searchFallback(query: string, tokens: string[], limit: number): Promise<SearchHit[]> {
  const fallbackSources = getFallbackSearchSources();
  const fallbackVendorRows = fallbackSources.vendors as any;
  const fallbackProductRows = fallbackSources.products as any;
  const allowFallback = shouldPreferCatalogFallback();

  if (allowFallback) {
    const rows = [
      ...fallbackVendorRows.map((vendor: any) => ({
        id: vendor.id,
        kind: "vendor" as const,
        title: vendor.name,
        searchText: [vendor.name, vendor.suburb ?? "", vendor.city ?? ""].join(" "),
        image: getPublicVendorImage(vendor.image ?? null, false),
        slug: vendor.slug,
        vendorName: vendor.name,
        subtitle: [vendor.suburb, vendor.city].filter(Boolean).join(", ") || "Vendor",
        priceCents: null,
        isAlcohol: false,
      })),
      ...fallbackProductRows.map((product: any) => ({
        id: product.id,
        kind: "product" as const,
        title: product.name,
        searchText: [product.name, product.description ?? "", product.vendor?.name ?? product.vendorName ?? ""].join(" "),
        image: product.image ?? null,
        slug: product.vendor?.slug ?? product.vendorSlug ?? null,
        vendorName: product.vendor?.name ?? product.vendorName ?? null,
        subtitle: product.vendor?.name ?? product.vendorName ?? "Product",
        priceCents: product.priceCents ?? null,
        isAlcohol: Boolean(product.isAlcohol),
      })),
    ];
    return scoreAndLimitRows(rows, tokens, limit);
  }

  const candidateLimit = Math.max(24, Math.min(160, limit * 8));
  const terms = searchWhereClauses(query, tokens);
  const vendorOr = terms.flatMap((term) => [
    { name: { contains: term } },
    { suburb: { contains: term } },
    { city: { contains: term } },
    { cuisine: { contains: term } },
  ]);
  const productOr = terms.flatMap((term) => [
    { name: { contains: term } },
    { description: { contains: term } },
    { vendor: { is: { name: { contains: term } } } },
  ]);

  const [vendors, products] = await Promise.all([
    prisma.vendor.findMany({
      where: {
        isActive: true,
        status: "ACTIVE",
        OR: vendorOr,
      },
      take: candidateLimit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        suburb: true,
        city: true,
        image: true,
      },
    }),
    prisma.product.findMany({
      where: {
        vendor: {
          isActive: true,
          status: "ACTIVE",
        },
        OR: productOr,
      },
      take: candidateLimit,
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

  const rows = [
    ...vendors.map((vendor: any) => ({
      id: vendor.id,
      kind: "vendor" as const,
      title: vendor.name,
      searchText: [vendor.name, vendor.suburb ?? "", vendor.city ?? ""].join(" "),
      image: getPublicVendorImage(vendor.image ?? null, false),
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

  return scoreAndLimitRows(rows, tokens, limit);
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
  const hits =
    prismaRuntimeInfo.provider === "postgresql"
      ? await searchPostgres(query, tokens, limit)
      : await searchFallback(query, tokens, limit);

  searchCache.set(cacheKey, { ts: Date.now(), hits });
  return hits;
}
