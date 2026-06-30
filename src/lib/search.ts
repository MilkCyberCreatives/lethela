import { prisma, prismaRuntimeInfo } from "@/lib/db";
import { getFallbackSearchSources } from "@/lib/catalog-fallback";
import { shouldUseCatalogFallbackBeforeQuery } from "@/lib/catalog-runtime";
import {
  getPublicVendorImage,
  isPublicCatalogProduct,
  isPublicCatalogVendor,
} from "@/lib/public-catalog";
import { runBoundedDbQuery, withQueryTimeout } from "@/lib/query-timeout";

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

const SEARCH_SYNONYMS: Record<string, string[]> = {
  alcohol: ["beer", "cider", "wine", "whisky", "whiskey", "vodka", "gin", "brandy", "booze"],
  booze: ["alcohol", "beer", "cider", "whisky", "vodka", "gin"],
  burger: ["burgers", "cheeseburger"],
  burgers: ["burger", "cheeseburger"],
  chips: ["fries", "slap", "masala"],
  fries: ["chips"],
  chicken: ["wings", "strips", "peri", "bucket"],
  groceries: ["grocery", "bread", "milk", "eggs", "essentials"],
  grocery: ["groceries", "bread", "milk", "eggs", "essentials"],
  kota: ["sphatlo", "bunny", "quarter"],
  sphatlo: ["kota", "bunny", "quarter"],
  braai: ["chisa", "nyama", "wors", "boerewors"],
  breakfast: ["vetkoek", "coffee", "egg"],
  mogodu: ["tripe", "pap"],
};

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 12);
}

function expandToken(token: string) {
  const terms = new Set([token]);
  for (const synonym of SEARCH_SYNONYMS[token] ?? []) terms.add(synonym);
  if (token.endsWith("ies") && token.length > 4) terms.add(`${token.slice(0, -3)}y`);
  if (token.endsWith("es") && token.length > 3) terms.add(token.slice(0, -2));
  if (token.endsWith("s") && token.length > 3) terms.add(token.slice(0, -1));
  if (token === "grocery") terms.add("groceries");
  if (token === "groceries") terms.add("grocery");
  return Array.from(terms);
}

function lexicalScore(tokens: string[], text: string) {
  if (!tokens.length) return 0;
  const lower = text.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    const tokenScore = expandToken(token).reduce((best, term) => {
      if (lower === term) return Math.max(best, 1.2);
      if (lower.startsWith(term)) return Math.max(best, 1);
      if (lower.includes(` ${term}`)) return Math.max(best, 0.7);
      if (lower.includes(term)) return Math.max(best, 0.5);
      return best;
    }, 0);
    score += tokenScore;
  }
  return score / tokens.length;
}

function searchWhereClauses(query: string, tokens: string[]) {
  const terms = Array.from(
    new Set([query, ...tokens.flatMap(expandToken)].map((value) => value.trim()).filter(Boolean)),
  );
  return terms;
}

function expandedQuery(tokens: string[]) {
  const terms = Array.from(new Set(tokens.flatMap(expandToken)));
  return terms.length > 0 ? terms.join(" OR ") : "";
}

function scoreAndLimitRows(
  rows: Array<Omit<SearchHit, "score"> & { searchText: string; dbScore?: number }>,
  tokens: string[],
  limit: number,
) {
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
        score:
          (dbScore > 0 ? dbScore * 0.7 + lexical * 0.3 : lexical) +
          (row.kind === "product" && lexical > 0 ? 0.05 : 0),
      } satisfies SearchHit;
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

async function searchPostgres(
  query: string,
  tokens: string[],
  limit: number,
): Promise<SearchHit[]> {
  const candidateLimit = Math.max(24, Math.min(120, limit * 6));
  const tsQuery = expandedQuery(tokens) || query;

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
            websearch_to_tsquery('simple', ${tsQuery})
          ) AS score
        FROM "Vendor" AS v
        WHERE v."isActive" = true
          AND v.status = 'ACTIVE'
          AND to_tsvector('simple', coalesce(v.name, '') || ' ' || coalesce(v.suburb, '') || ' ' || coalesce(v.city, '') || ' ' || coalesce(v.cuisine, ''))
              @@ websearch_to_tsquery('simple', ${tsQuery})
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
            websearch_to_tsquery('simple', ${tsQuery})
          ) AS score
        FROM "Product" AS p
        INNER JOIN "Vendor" AS v ON v.id = p."vendorId"
        WHERE v."isActive" = true
          AND v.status = 'ACTIVE'
          AND to_tsvector('simple', coalesce(p.name, '') || ' ' || coalesce(p.description, '') || ' ' || coalesce(v.name, ''))
              @@ websearch_to_tsquery('simple', ${tsQuery})
        ORDER BY score DESC, p."updatedAt" DESC
        LIMIT ${candidateLimit}
      `,
    ]);

    return [vendorRows, productRows] as const;
  }).catch(() => [[], []] as const);

  const rows = [
    ...vendors
      .filter((vendor) => isPublicCatalogVendor(vendor))
      .map((vendor) => ({
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
    ...products
      .filter((product) =>
        isPublicCatalogProduct({
          id: product.id,
          name: product.name,
          vendorName: product.vendorName,
          vendorSlug: product.vendorSlug,
        }),
      )
      .map((product) => ({
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

  const ranked = scoreAndLimitRows(rows, tokens, limit);
  if (ranked.length > 0) return ranked;

  const loose = await searchPostgresLoose(query, tokens, limit);
  return loose.length > 0 ? loose : searchStaticFallback(tokens, limit);
}

async function searchPostgresLoose(query: string, tokens: string[], limit: number) {
  const candidateLimit = Math.max(24, Math.min(120, limit * 6));
  const terms = searchWhereClauses(query, tokens)
    .filter((term) => term.length >= 2)
    .slice(0, 16);
  if (terms.length === 0) return [] as SearchHit[];

  const patterns = terms.map((term) => `%${term.replaceAll("%", "").replaceAll("_", "")}%`);

  type LooseVendorRow = {
    id: string;
    slug: string;
    name: string;
    suburb: string | null;
    city: string | null;
    image: string | null;
  };

  type LooseProductRow = {
    id: string;
    name: string;
    description: string | null;
    image: string | null;
    priceCents: number;
    isAlcohol: boolean;
    vendorName: string;
    vendorSlug: string;
  };

  const [vendors, products] = await runBoundedDbQuery(async (db) => {
    const [vendorRows, productRows] = await Promise.all([
      db.$queryRaw<Array<LooseVendorRow>>`
        SELECT v.id, v.slug, v.name, v.suburb, v.city, v.image
        FROM "Vendor" AS v
        WHERE v."isActive" = true
          AND v.status = 'ACTIVE'
          AND (
            v.name ILIKE ANY(${patterns})
            OR coalesce(v.suburb, '') ILIKE ANY(${patterns})
            OR coalesce(v.city, '') ILIKE ANY(${patterns})
            OR coalesce(v.cuisine, '') ILIKE ANY(${patterns})
          )
        ORDER BY v."updatedAt" DESC
        LIMIT ${candidateLimit}
      `,
      db.$queryRaw<Array<LooseProductRow>>`
        SELECT
          p.id,
          p.name,
          p.description,
          p.image,
          p."priceCents" AS "priceCents",
          p."isAlcohol" AS "isAlcohol",
          v.name AS "vendorName",
          v.slug AS "vendorSlug"
        FROM "Product" AS p
        INNER JOIN "Vendor" AS v ON v.id = p."vendorId"
        WHERE v."isActive" = true
          AND v.status = 'ACTIVE'
          AND (
            p.name ILIKE ANY(${patterns})
            OR coalesce(p.description, '') ILIKE ANY(${patterns})
            OR v.name ILIKE ANY(${patterns})
          )
        ORDER BY p."updatedAt" DESC
        LIMIT ${candidateLimit}
      `,
    ]);
    return [vendorRows, productRows] as const;
  }).catch(() => [[], []] as const);

  const rows = [
    ...vendors
      .filter((vendor) => isPublicCatalogVendor(vendor))
      .map((vendor) => ({
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
    ...products
      .filter((product) =>
        isPublicCatalogProduct({
          id: product.id,
          name: product.name,
          vendorName: product.vendorName,
          vendorSlug: product.vendorSlug,
        }),
      )
      .map((product) => ({
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
      })),
  ];

  return scoreAndLimitRows(rows, tokens, limit);
}

async function searchFallback(
  query: string,
  tokens: string[],
  limit: number,
): Promise<SearchHit[]> {
  const allowFallback = shouldUseCatalogFallbackBeforeQuery();

  if (allowFallback) {
    return searchStaticFallback(tokens, limit);
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

  const [vendors, products] = await withQueryTimeout(
    Promise.all([
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
    ]),
    [[], []],
  );

  const rows = [
    ...vendors
      .filter((vendor: any) => isPublicCatalogVendor(vendor))
      .map((vendor: any) => ({
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
    ...products
      .filter((product: any) => isPublicCatalogProduct(product))
      .map((product: any) => ({
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

function searchStaticFallback(tokens: string[], limit: number) {
  const fallbackSources = getFallbackSearchSources();
  const fallbackVendorRows = fallbackSources.vendors as any;
  const fallbackProductRows = fallbackSources.products as any;
  const rows = [
    ...fallbackVendorRows
      .filter((vendor: any) => isPublicCatalogVendor(vendor))
      .map((vendor: any) => ({
        id: vendor.id,
        kind: "vendor" as const,
        title: vendor.name,
        searchText: [
          vendor.name,
          vendor.suburb ?? "",
          vendor.city ?? "",
          ...(vendor.cuisine ?? []),
        ].join(" "),
        image: getPublicVendorImage(vendor.image ?? null, false),
        slug: vendor.slug,
        vendorName: vendor.name,
        subtitle: [vendor.suburb, vendor.city].filter(Boolean).join(", ") || "Vendor",
        priceCents: null,
        isAlcohol: false,
      })),
    ...fallbackProductRows
      .filter((product: any) =>
        isPublicCatalogProduct({
          id: product.id,
          name: product.name,
          vendorName: product.vendor?.name ?? product.vendorName ?? "",
          vendorSlug: product.vendor?.slug ?? product.vendorSlug ?? "",
        }),
      )
      .map((product: any) => ({
        id: product.id,
        kind: "product" as const,
        title: product.name,
        searchText: [
          product.name,
          product.description ?? "",
          product.vendor?.name ?? product.vendorName ?? "",
        ].join(" "),
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
